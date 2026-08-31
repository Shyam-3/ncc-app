#!/usr/bin/env node
// =============================================================================
// sync-verifications.mjs — Sync email verification status from Auth to Firestore
//
// Reads all documents from `pendingCadets` where emailVerified is false.
// Queries Firebase Auth for each user. If Auth reports their email as verified,
// updates the Firestore document so admins can approve them.
//
// Usage:
//   node scripts/sync-verifications.mjs
//
// Env:
//   FIREBASE_SERVICE_ACCOUNT  — JSON string of the Firebase service account key
// =============================================================================

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

// ---------------------------------------------------------------------------
// Firebase initialisation
// ---------------------------------------------------------------------------

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!serviceAccountJson) {
  console.error("❌ FIREBASE_SERVICE_ACCOUNT environment variable is not set.");
  process.exit(1);
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(serviceAccountJson);
} catch (err) {
  console.error(
    "❌ Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:",
    err.message,
  );
  process.exit(1);
}

const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);
const auth = getAuth(app);

// ---------------------------------------------------------------------------
// Main sync logic
// ---------------------------------------------------------------------------

async function syncVerifications() {
  console.log("🔄 Starting email verification sync...");

  try {
    // We fetch all pending cadets. We could query for emailVerified == false,
    // but fetching all is safer in case the field is missing.
    const snapshot = await db.collection("pendingCadets").get();

    if (snapshot.empty) {
      console.log("✨ No pending cadets found. Nothing to sync.");
      process.exit(0);
    }

    let checkCount = 0;
    let syncCount = 0;

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();

      // Skip users who are already verified in Firestore
      if (data.emailVerified === true) {
        continue;
      }

      // Skip users without a uid (edge case)
      if (!data.uid) {
        continue;
      }

      checkCount++;
      const uid = data.uid;
      const email = data.email || "unknown";

      try {
        const userRecord = await auth.getUser(uid);

        if (userRecord.emailVerified) {
          console.log(
            `✅ User ${email} (${uid}) is verified in Auth. Updating Firestore...`,
          );
          await docSnap.ref.update({
            emailVerified: true,
            updatedAt: new Date().toISOString(),
          });
          syncCount++;
        } else {
          console.log(`⏳ User ${email} is still unverified.`);
        }
      } catch (authError) {
        if (authError.code === "auth/user-not-found") {
          console.log(
            `⚠️ User ${email} not found in Auth. They may have been deleted.`,
          );
        } else {
          console.error(
            `❌ Failed to fetch auth record for ${email}:`,
            authError.message,
          );
        }
      }
    }

    console.log(`\n🎉 Sync complete!`);
    console.log(`   Checked: ${checkCount} unverified users`);
    console.log(`   Synced:  ${syncCount} users newly verified`);
  } catch (error) {
    console.error("❌ Error during sync:", error);
    process.exit(1);
  }
}

// Run the script
syncVerifications()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("❌ Unhandled error:", e);
    process.exit(1);
  });
