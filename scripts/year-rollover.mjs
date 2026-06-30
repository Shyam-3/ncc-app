#!/usr/bin/env node
// =============================================================================
// year-rollover.mjs — NCC Cadet Yearly Rollover Script
//
// Promotes cadets to the next academic/NCC year, archives those who have
// completed their NCC tenure or graduated, and cleans up expired alumni.
//
// Usage:
//   node scripts/year-rollover.mjs              # Execute rollover
//   node scripts/year-rollover.mjs --dry-run    # Preview only, no writes
//
// Env:
//   FIREBASE_SERVICE_ACCOUNT  — JSON string of the Firebase service account key
// =============================================================================

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import fs from 'fs';
import path from 'path';

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
const auth = getAuth(app);

// ---------------------------------------------------------------------------
// CLI flags
// ---------------------------------------------------------------------------

const DRY_RUN = process.argv.includes('--dry-run');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACADEMIC_YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year'];
const NCC_YEARS = ['1st Year', '2nd Year', '3rd Year'];

let FIVE_YEAR_DEPARTMENTS = ['ARCH', 'AMCS'];
try {
  const constantsPath = path.join(process.cwd(), 'src/shared/config/constants.ts');
  const content = fs.readFileSync(constantsPath, 'utf8');
  const regex = /code:\s*['"]([^'"]+)['"],\s*name:\s*['"][^'"]+['"],\s*courseTenure:\s*5/g;
  const matches = [...content.matchAll(regex)].map(m => m[1]);
  if (matches.length > 0) {
    FIVE_YEAR_DEPARTMENTS = matches;
  }
} catch (err) {
  console.warn('⚠️ Could not dynamically read 5-year departments, falling back to default.');
}

const DEFAULT_CONFIG = {};

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

function getNextAcademicYear(current) {
  const idx = ACADEMIC_YEARS.indexOf(current);
  if (idx === -1 || idx === ACADEMIC_YEARS.length - 1) return null;
  return ACADEMIC_YEARS[idx + 1];
}

function getNextNccYear(current) {
  const idx = NCC_YEARS.indexOf(current);
  if (idx === -1 || idx === NCC_YEARS.length - 1) return null;
  return NCC_YEARS[idx + 1];
}

function getMaxAcademicYear(department) {
  return FIVE_YEAR_DEPARTMENTS.includes(department) ? '5th Year' : '4th Year';
}

function isAcademicComplete(year, department) {
  return year === getMaxAcademicYear(department);
}

function isNccComplete(nccYear) {
  return nccYear === '3rd Year';
}

// ---------------------------------------------------------------------------
// Main rollover logic
// ---------------------------------------------------------------------------

async function main() {
  console.log('='.repeat(60));
  console.log('  NCC Year Rollover');
  console.log(`  Mode: ${DRY_RUN ? '🔍 DRY RUN (no changes will be made)' : '🚀 LIVE EXECUTION'}`);
  console.log(`  Time: ${new Date().toISOString()}`);
  console.log('='.repeat(60));
  console.log();

  // 1. Load app config
  console.log('📋 Loading app config from settings/appConfig …');
  const configSnap = await db.doc('settings/appConfig').get();
  const config = configSnap.exists ? { ...DEFAULT_CONFIG, ...configSnap.data() } : { ...DEFAULT_CONFIG };

  console.log(`   5-year depts     : ${FIVE_YEAR_DEPARTMENTS.join(', ')}`);
  console.log();

  // 1.5 Check dynamic schedule if triggered automatically
  const isSchedule = process.env.GITHUB_EVENT_NAME === 'schedule';
  if (isSchedule && !DRY_RUN) {
    console.log('⏰ Triggered by hourly schedule. Checking dynamic schedule...');
    if (!config.nextRolloverDate) {
      console.log('   ⏭️ No nextRolloverDate configured in settings. Exiting.');
      process.exit(0);
    }
    const targetDate = new Date(config.nextRolloverDate);
    if (new Date() < targetDate) {
      console.log(`   ⏭️ Scheduled time (${targetDate.toISOString()}) has not arrived yet. Exiting.`);
      process.exit(0);
    }
    if (config.rolloverCompletedForTarget) {
      console.log('   ⏭️ Rollover already completed for the target date. Exiting.');
      process.exit(0);
    }
    console.log('   ✅ Time arrived! Proceeding with automated rollover...');
  } else if (!isSchedule && !DRY_RUN) {
    console.log('🧑‍💻 Triggered manually (workflow_dispatch). Bypassing schedule checks.');
  }

  // 2. Read all users & alumni
  console.log('📖 Fetching all users and alumni from Firestore...');
  const usersSnap = await db.collection('users').get();
  const alumniSnap = await db.collection('alumni').get();
  console.log(`   Found ${usersSnap.size} active users, ${alumniSnap.size} existing alumni.`);

  // 3. Build plan
  console.log('🧠 Building rollover plan...');
  const plan = [];
  const counts = { skip: 0, alumni_ncc: 0, delete_graduated_cadet: 0, delete_graduated_alumni: 0, increment: 0, increment_alumni: 0 };

  // 3a. Process active users
  for (const userDoc of usersSnap.docs) {
    const data = userDoc.data();
    const uid = userDoc.id;

    const userRole = data.role || 'member';

    // Skip superadmins
    if (userRole === 'superadmin') {
      plan.push({ uid, name: data.name || uid, action: 'skip', reason: 'Superadmin — not touched', data, userRole });
      counts.skip++;
      continue;
    }

    const year = data.year || '';
    const nccYear = data.nccYear || '';
    const dept = data.department || '';
    
    const isAcademicDone = isAcademicComplete(year, dept);
    const isNccDone = isNccComplete(nccYear);
    
    const newYear = getNextAcademicYear(year) || year;
    const newNccYear = getNextNccYear(nccYear) || nccYear;

    // RULE 1: If Academic tenure is complete, completely deleted from the app.
    if (isAcademicDone) {
      plan.push({
        uid,
        name: data.name || uid,
        action: 'delete_graduated_cadet',
        reason: `Academic ${year} complete → delete from app`,
        data,
        userRole
      });
      counts.delete_graduated_cadet++;
      continue;
    }

    // RULE 2: If NCC tenure is complete (but still in college)
    if (isNccDone) {
      // Move entirely to Alumni collection, increment academic year
      plan.push({
        uid,
        name: data.name || uid,
        action: 'alumni_ncc',
        reason: `NCC complete → move to alumni collection, promote to ${newYear}`,
        newYear,
        data,
        userRole
      });
      counts.alumni_ncc++;
      continue;
    }

    // RULE 3: Still active in both, increment both.
    plan.push({
      uid,
      name: data.name || uid,
      action: 'increment',
      reason: `${year} → ${newYear}, NCC ${nccYear} → ${newNccYear}`,
      newYear,
      newNccYear,
      data,
      userRole
    });
    counts.increment++;
  }

  // 3b. Process existing Alumni
  for (const alumniDoc of alumniSnap.docs) {
    const data = alumniDoc.data();
    const uid = alumniDoc.id;
    const year = data.year || '';
    const dept = data.department || '';
    
    const isAcademicDone = isAcademicComplete(year, dept);
    const newYear = getNextAcademicYear(year) || year;

    if (isAcademicDone) {
      plan.push({
        uid,
        name: data.name || uid,
        action: 'delete_graduated_alumni',
        reason: `Alumni Academic ${year} complete → delete from app`,
        data,
        userRole: 'alumni'
      });
      counts.delete_graduated_alumni++;
    } else {
      plan.push({
        uid,
        name: data.name || uid,
        action: 'increment_alumni',
        reason: `Alumni staying in college → promote to ${newYear}`,
        newYear,
        data,
        userRole: 'alumni'
      });
      counts.increment_alumni++;
    }
  }

  // 4. Print plan
  console.log('\nDetailed plan:');
  plan.forEach((item, i) => {
    console.log(`    ${String(i + 1).padStart(2, ' ')}. ${item.name.padEnd(25, ' ')} | ${String(item.action).padEnd(25, ' ')} | ${item.reason}`);
  });

  console.log('\n─'.repeat(30));
  console.log(`   ⏩ Increment Cadets          : ${counts.increment}`);
  console.log(`   🎓 Move to Alumni            : ${counts.alumni_ncc}`);
  console.log(`   ⏩ Increment Alumni          : ${counts.increment_alumni}`);
  console.log(`   🗑️  Delete Graduated Cadets   : ${counts.delete_graduated_cadet}`);
  console.log(`   🗑️  Delete Graduated Alumni   : ${counts.delete_graduated_alumni}`);
  console.log(`   ⏭️  Skip (superadmin)         : ${counts.skip}`);
  console.log(`   ─── Total                     : ${plan.length}`);
  console.log('─'.repeat(30));

  // 5. Execution guard
  if (DRY_RUN) {
    console.log('\n✅ Dry run complete. No changes were made.');
    process.exit(0);
  }

  console.log('\n⏳ Beginning execution phase...');

  // 6. Save Rollback Snapshot
  console.log('💾 Saving rollback snapshot...');
  const snapshotId = new Date().toISOString().replace(/[:.]/g, '-');
  
  const snapshotUsers = {};
  usersSnap.forEach(d => {
    snapshotUsers[d.id] = { uid: d.id, ...d.data(), _snapshotSource: 'users' };
  });
  alumniSnap.forEach(d => {
    snapshotUsers[d.id] = { uid: d.id, ...d.data(), _snapshotSource: 'alumni' };
  });

  const summary = {
    incremented: counts.increment,
    alumniNcc: counts.alumni_ncc,
    deletedGraduated: counts.delete_graduated_cadet + counts.delete_graduated_alumni,
    skipped: counts.skip,
    timestamp: new Date().toISOString(),
  };

  await db.doc(`rollbackSnapshots/${snapshotId}`).set({
    timestamp: new Date().toISOString(),
    summary,
    users: snapshotUsers,
  });

  console.log(`   Snapshot saved as: ${snapshotId}`);

  // 7. Apply changes using batched writes (max 500 per batch)
  console.log('🔄 Applying changes …');

  const actionItems = plan.filter(p => p.action !== 'skip');
  const MAX_BATCH_OPS = 400; // conservative batch size
  
  for (let i = 0; i < actionItems.length; i += MAX_BATCH_OPS) {
    const chunk = actionItems.slice(i, i + MAX_BATCH_OPS);
    const batch = db.batch();

    for (const item of chunk) {
      const userRef = db.doc(`users/${item.uid}`);
      const cadetRef = db.doc(`cadets/${item.uid}`);
      const alumniRef = db.doc(`alumni/${item.uid}`);
      const userData = snapshotUsers[item.uid] || {};

      switch (item.action) {
        case 'alumni_ncc': {
          // Move completely to alumni collection, delete from users/cadets
          const { uid: _uid, _snapshotSource: _src, ...alumniData } = userData;
          batch.set(alumniRef, {
            ...alumniData,
            role: 'alumni',
            year: item.newYear,
            archivedAt: new Date().toISOString(),
          });
          batch.delete(userRef);
          batch.delete(cadetRef);
          break;
        }

        case 'increment_alumni': {
          batch.update(alumniRef, {
            year: item.newYear
          });
          break;
        }

        case 'delete_graduated_cadet': {
          batch.delete(userRef);
          batch.delete(cadetRef);
          // Queue auth deletion
          batch.set(db.doc(`pendingAuthDeletions/${item.uid}`), {
            email: userData.email || '',
            deletedBy: 'rollover-script',
            deletedAt: new Date().toISOString(),
            reason: 'academic_complete_rollover',
          });
          break;
        }

        case 'delete_graduated_alumni': {
          batch.delete(alumniRef);
          // Queue auth deletion
          batch.set(db.doc(`pendingAuthDeletions/${item.uid}`), {
            email: userData.email || '',
            deletedBy: 'rollover-script',
            deletedAt: new Date().toISOString(),
            reason: 'alumni_academic_complete_rollover',
          });
          break;
        }

        case 'increment': {
          batch.update(userRef, {
            year: item.newYear,
            nccYear: item.newNccYear,
          });
          batch.update(cadetRef, {
            year: item.newYear,
            nccYear: item.newNccYear,
          });
          break;
        }
      }
    }
    
    await batch.commit();
    console.log(`   ✓ Batch ${Math.floor(i / MAX_BATCH_OPS) + 1} committed.`);
  }

  // 8. Clear Attendance Records
  console.log('🧹 Clearing attendance records for the new year …');
  try {
    const collectionsToClear = ['attendanceSessions', 'cadetAttendanceStats'];
    for (const col of collectionsToClear) {
      const snap = await db.collection(col).get();
      if (!snap.empty) {
        for (let i = 0; i < snap.size; i += MAX_BATCH_OPS) {
          const chunk = snap.docs.slice(i, i + MAX_BATCH_OPS);
          const batch = db.batch();
          chunk.forEach(doc => batch.delete(doc.ref));
          await batch.commit();
        }
        console.log(`   ✓ Cleared ${snap.size} documents from ${col}.`);
      }
    }
  } catch (err) {
    console.error('   ⚠️ Error clearing attendance:', err.message);
  }

  // 9. Update settings
  console.log('📝 Updating appConfig...');
  let nextRolloverDateStr = config.nextRolloverDate || '';
  if (nextRolloverDateStr) {
    const d = new Date(nextRolloverDateStr);
    if (!isNaN(d.getTime())) {
      d.setFullYear(d.getFullYear() + 1);
      nextRolloverDateStr = d.toISOString();
    }
  }

  await db.doc('settings/appConfig').set({
    lastRolloverAt: new Date().toISOString(),
    lastRolloverSummary: summary,
    rolloverCompletedForTarget: false, // Reset for next year!
    nextRolloverDate: nextRolloverDateStr, // Advanced by 1 year
  }, { merge: true });
  console.log(`   ✓ Next rollover date automatically set to ${nextRolloverDateStr}`);

  // 10. Audit log
  console.log('📝 Writing audit log …');
  await db.doc(`auditLogs/rollover-${snapshotId}`).set({
    type: 'year_rollover',
    performedBy: 'github-actions',
    performedAt: new Date().toISOString(),
    summary,
    snapshotId,
  });

  console.log();
  console.log('🎉 Rollover complete!');
}

main().catch(err => {
  console.error('\n❌ Fatal Error during rollover execution:');
  console.error(err);
  process.exit(1);
});
