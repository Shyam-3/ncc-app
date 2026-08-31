#!/usr/bin/env node
// =============================================================================
// auth-cleanup.mjs — Process the pending Firebase Auth deletion queue
//
// Reads all documents from the `pendingAuthDeletions` collection and deletes
// the corresponding Firebase Auth accounts. Each processed queue entry is
// removed after the auth account is deleted (or confirmed already gone).
//
// Usage:
//   node scripts/auth-cleanup.mjs
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
// Main cleanup logic
// ---------------------------------------------------------------------------

async function cleanupFirestoreTraces(db, uid) {
  console.log(`     -> Sweeping Firestore traces for user ${uid}...`);

  // 1. Delete cadetAttendanceStats
  try {
    await db.collection("cadetAttendanceStats").doc(uid).delete();
  } catch (e) {
    console.error(`     -> Error deleting stats:`, e);
  }

  // 2. Delete reads from all announcements
  try {
    const announcements = await db.collection("announcements").get();
    for (const ann of announcements.docs) {
      await ann.ref
        .collection("reads")
        .doc(uid)
        .delete()
        .catch(() => {});
    }
  } catch (e) {
    console.error(`     -> Error deleting announcement reads:`, e);
  }

  // 3. Delete marks from all attendance sessions
  try {
    const sessions = await db.collection("attendanceSessions").get();
    for (const session of sessions.docs) {
      await session.ref
        .collection("marks")
        .doc(uid)
        .delete()
        .catch(() => {});
    }
  } catch (e) {
    console.error(`     -> Error deleting attendance marks:`, e);
  }

  // 4. Delete orphaned readAnnouncements subcollection under users/{uid}
  try {
    const readAnns = await db
      .collection("users")
      .doc(uid)
      .collection("readAnnouncements")
      .get();
    for (const doc of readAnns.docs) {
      await doc.ref.delete().catch(() => {});
    }
  } catch (e) {
    console.error(`     -> Error deleting orphaned user subcollections:`, e);
  }

  // 5. Delete the user doc itself just in case the frontend failed to do so
  try {
    await db
      .collection("users")
      .doc(uid)
      .delete()
      .catch(() => {});
    await db
      .collection("cadets")
      .doc(uid)
      .delete()
      .catch(() => {});
  } catch (e) {}

  console.log(`     -> Sweep complete for ${uid}.`);
}

async function main() {
  console.log("=".repeat(60));
  console.log("  Firebase Auth Account Cleanup");
  console.log(`  Time: ${new Date().toISOString()}`);
  console.log("=".repeat(60));
  console.log();

  // -----------------------------------------------------------------------
  // 1. Read all pending auth deletions
  // -----------------------------------------------------------------------
  console.log("📋 Reading pendingAuthDeletions collection …");
  const pendingSnap = await db.collection("pendingAuthDeletions").get();

  if (pendingSnap.empty) {
    console.log("   ✅ No pending auth deletions found — nothing to do.");
    process.exit(0);
  }

  console.log(`   Found ${pendingSnap.size} pending deletion(s).`);
  console.log();

  // -----------------------------------------------------------------------
  // 2. Process each deletion
  // -----------------------------------------------------------------------
  console.log("🔐 Processing deletions …");

  let successCount = 0;
  let alreadyDeletedCount = 0;
  let errorCount = 0;

  for (const doc of pendingSnap.docs) {
    const uid = doc.id;
    const data = doc.data();
    const label = data.name ?? data.email ?? uid;

    try {
      // Attempt to delete the Firebase Auth account
      await auth.deleteUser(uid);
      console.log(`   ✓ Deleted auth account: ${label} (${uid})`);

      // Perform deep Firestore cleanup
      await cleanupFirestoreTraces(db, uid);

      successCount++;
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        // User was already deleted — that's fine, still clean up the queue entry
        console.log(
          `   ⚠ Auth account not found (already deleted): ${label} (${uid})`,
        );
        // We still run the firestore sweep in case auth was deleted but traces remain
        await cleanupFirestoreTraces(db, uid);
        alreadyDeletedCount++;
      } else {
        // Unexpected error — log it but continue processing others
        console.error(
          `   ❌ Failed to delete ${label} (${uid}): ${err.message}`,
        );
        errorCount++;
        // Don't delete the queue entry so it can be retried next run
        continue;
      }
    }

    // Remove the processed entry from the queue
    try {
      await db.doc(`pendingAuthDeletions/${uid}`).delete();
    } catch (err) {
      console.error(
        `   ❌ Failed to remove queue entry for ${uid}: ${err.message}`,
      );
      errorCount++;
    }
  }

  console.log();

  // -----------------------------------------------------------------------
  // 3. Write audit log
  // -----------------------------------------------------------------------
  console.log("📜 Writing audit log …");
  await db.collection("auditLogs").add({
    type: "auth_cleanup",
    performedAt: new Date().toISOString(),
    summary: {
      total: pendingSnap.size,
      deleted: successCount,
      alreadyDeleted: alreadyDeletedCount,
      errors: errorCount,
    },
  });
  console.log("   ✓ Audit log written.");
  console.log();

  // -----------------------------------------------------------------------
  // 4. Final summary
  // -----------------------------------------------------------------------
  console.log("=".repeat(60));
  console.log("  ✅ AUTH CLEANUP COMPLETE");
  console.log("=".repeat(60));
  console.log(`   Total queued       : ${pendingSnap.size}`);
  console.log(`   Deleted            : ${successCount}`);
  console.log(`   Already deleted    : ${alreadyDeletedCount}`);
  console.log(`   Errors (will retry): ${errorCount}`);
  console.log("=".repeat(60));

  // Exit with non-zero if there were errors
  if (errorCount > 0) {
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

main().catch((err) => {
  console.error("❌ Auth cleanup failed with an unhandled error:");
  console.error(err);
  process.exit(1);
});
