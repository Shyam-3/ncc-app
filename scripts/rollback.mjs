#!/usr/bin/env node
// =============================================================================
// rollback.mjs — NCC Cadet Yearly Rollover Rollback Script
//
// Restores users from a rollback snapshot.
//
// Usage:
//   node scripts/rollback.mjs --snapshot-id=<id>
// =============================================================================

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

// ---------------------------------------------------------------------------
// Firebase initialisation
// ---------------------------------------------------------------------------

const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!serviceAccountJson) {
  console.error('❌ FIREBASE_SERVICE_ACCOUNT environment variable is not set.');
  process.exit(1);
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(serviceAccountJson);
} catch (err) {
  console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:', err.message);
  process.exit(1);
}

const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);

// ---------------------------------------------------------------------------
// CLI flags
// ---------------------------------------------------------------------------

const snapshotArg = process.argv.find(arg => arg.startsWith('--snapshot-id='));
if (!snapshotArg) {
  console.error('❌ Missing --snapshot-id argument. Usage: node rollback.mjs --snapshot-id=<id>');
  process.exit(1);
}
const snapshotId = snapshotArg.split('=')[1];

// ---------------------------------------------------------------------------
// Main rollback logic
// ---------------------------------------------------------------------------

async function main() {
  console.log('='.repeat(60));
  console.log('  NCC Year Rollover — ROLLBACK');
  console.log(`  Target Snapshot: ${snapshotId}`);
  console.log('='.repeat(60));
  console.log();

  // 1. Fetch snapshot
  console.log(`📖 Fetching snapshot rollbackSnapshots/${snapshotId} ...`);
  const snapDoc = await db.doc(`rollbackSnapshots/${snapshotId}`).get();
  
  if (!snapDoc.exists) {
    console.error(`❌ Snapshot not found.`);
    process.exit(1);
  }

  const data = snapDoc.data();
  const users = data.users || {};
  const userEntries = Object.entries(users);
  
  console.log(`   Found ${userEntries.length} users to restore.`);

  if (userEntries.length === 0) {
    console.log('✅ Nothing to restore.');
    process.exit(0);
  }

  // 2. Restore in batches
  console.log('\n🔄 Applying rollback ...');
  
  const MAX_BATCH_OPS = 450;
  for (let i = 0; i < userEntries.length; i += MAX_BATCH_OPS) {
    const chunk = userEntries.slice(i, i + MAX_BATCH_OPS);
    const batch = db.batch();

    for (const [userId, userData] of chunk) {
      const { uid: _uid, ...rest } = userData;
      
      // Restore user doc
      batch.set(db.doc(`users/${userId}`), { uid: userId, ...rest }, { merge: true });
      
      // Delete from alumni if they were moved there
      batch.delete(db.doc(`alumni/${userId}`));
      
      // Delete from alumniProfiles if they were moved there
      batch.delete(db.doc(`alumniProfiles/${userId}`));
      
      // Remove from pending auth deletions if queued
      batch.delete(db.doc(`pendingAuthDeletions/${userId}`));
    }
    
    await batch.commit();
    console.log(`   ✓ Batch ${Math.floor(i / MAX_BATCH_OPS) + 1} committed.`);
  }

  // 3. Write audit log
  console.log('\n📝 Writing audit log...');
  await db.doc(`auditLogs/rollback-${Date.now()}`).set({
    type: 'year_rollover_rollback',
    performedBy: 'github-actions',
    performedAt: new Date().toISOString(),
    snapshotId,
    restoredUsers: userEntries.length,
  });

  console.log('\n🎉 Rollback complete!');
}

main().catch(err => {
  console.error('\n❌ Fatal Error during rollback execution:');
  console.error(err);
  process.exit(1);
});
