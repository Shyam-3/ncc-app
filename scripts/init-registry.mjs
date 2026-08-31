import admin from "firebase-admin";

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    admin.initializeApp({
      credential: admin.credential.cert(
        JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT),
      ),
    });
  } else {
    // Fallback to default if running locally with GOOGLE_APPLICATION_CREDENTIALS
    admin.initializeApp();
  }
}

const db = admin.firestore();

async function initRegistry() {
  console.log("Starting registry initialization...");

  const usersSnapshot = await db.collection("users").get();
  const pendingSnapshot = await db.collection("pendingCadets").get();

  const allDocs = [...usersSnapshot.docs, ...pendingSnapshot.docs];

  console.log(
    `Found ${usersSnapshot.docs.length} users and ${pendingSnapshot.docs.length} pending cadets.`,
  );

  let batch = db.batch();
  let operationCount = 0;
  let totalAdded = 0;

  const commitBatch = async () => {
    if (operationCount > 0) {
      await batch.commit();
      console.log(`Committed batch of ${operationCount} writes.`);
      batch = db.batch();
      operationCount = 0;
    }
  };

  const addTakenNumber = async (number, type, uid) => {
    if (!number) return;
    const cleanNumber = number.toString().trim();
    if (!cleanNumber) return;

    // Use a safe document ID with type prefix
    const safeId = cleanNumber.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    if (!safeId) return;

    const docId = `${type}_${safeId}`;

    const ref = db.collection("takenNumbers").doc(docId);
    batch.set(ref, {
      type,
      uid,
      originalValue: cleanNumber,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    operationCount++;
    totalAdded++;
    if (operationCount >= 500) {
      await commitBatch();
    }
  };

  for (const doc of allDocs) {
    const data = doc.data();
    // Skip superadmins from uniqueness registry
    if (data.role === "superadmin") continue;

    // Some docs use 'uid' (pendingCadets), others might use doc.id (users)
    const uid = data.uid || doc.id;

    await addTakenNumber(data.regimentalNumber, "regimentalNumber", uid);
    await addTakenNumber(data.registerNumber, "registerNumber", uid);
    await addTakenNumber(data.rollNo, "rollNo", uid);
  }

  await commitBatch();
  console.log(
    `Initialization complete. Added ${totalAdded} numbers to the registry.`,
  );
}

initRegistry().catch(console.error);
