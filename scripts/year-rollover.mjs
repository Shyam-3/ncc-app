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

const DEFAULT_CONFIG = {
  alumniRetentionMonths: 24,
};

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

function getRetentionExpiry(months) {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
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
  const alumniRetentionMonths = config.alumniRetentionMonths ?? DEFAULT_CONFIG.alumniRetentionMonths;

  console.log(`   Alumni retention : ${alumniRetentionMonths} months`);
  console.log(`   5-year depts     : ${FIVE_YEAR_DEPARTMENTS.join(', ')}`);
  console.log();

  // 2. Read all users
  console.log('📖 Fetching all users from Firestore...');
  const usersSnap = await db.collection('users').get();
  console.log(`   Found ${usersSnap.size} total users.`);

  // 3. Build plan
  console.log('🧠 Building rollover plan...');
  const plan = [];
  const counts = { skip: 0, alumni_ncc: 0, delete_graduated: 0, increment: 0, increment_academic_only: 0 };

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

    // RULE 1: If Academic tenure is complete, they are completely deleted from the app.
    // If they finish NCC and Academic at the same time, this takes precedence.
    if (isAcademicDone) {
      plan.push({
        uid,
        name: data.name || uid,
        action: 'delete_graduated',
        reason: `Academic ${year} complete → delete from app`,
        data,
        userRole
      });
      counts.delete_graduated++;
      continue;
    }

    // RULE 2: If NCC tenure is complete (but they are still in college)
    if (isNccDone) {
      if (userRole !== 'alumni') {
        // Just finished NCC. Mark as alumni, archive their details, and increment their academic year.
        plan.push({
          uid,
          name: data.name || uid,
          action: 'alumni_ncc',
          reason: `NCC complete → change to alumni, promote to ${newYear}`,
          newYear,
          data,
          userRole
        });
        counts.alumni_ncc++;
      } else {
        // Already marked as alumni in a previous year. Just increment academic year.
        plan.push({
          uid,
          name: data.name || uid,
          action: 'increment_academic_only',
          reason: `Already alumni → promote to ${newYear}`,
          newYear,
          data,
          userRole
        });
        counts.increment_academic_only++;
      }
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

  // 4. Print plan
  console.log('\nDetailed plan:');
  plan.forEach((item, i) => {
    console.log(`    ${String(i + 1).padStart(2, ' ')}. ${item.name.padEnd(25, ' ')} | ${String(item.action).padEnd(23, ' ')} | ${item.reason}`);
  });

  console.log('\n─'.repeat(30));
  console.log(`   ⏩ Increment (promote both)  : ${counts.increment}`);
  console.log(`   🎓 Change to Alumni          : ${counts.alumni_ncc}`);
  console.log(`   ⏭️  Increment Academic Only   : ${counts.increment_academic_only}`);
  console.log(`   🗑️  Delete (graduated)        : ${counts.delete_graduated}`);
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
    snapshotUsers[d.id] = { uid: d.id, ...d.data() };
  });

  const summary = {
    incremented: counts.increment,
    alumniNcc: counts.alumni_ncc,
    deletedGraduated: counts.delete_graduated,
    skipped: counts.skip,
    expiredAlumniCleaned: 0,
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
  const MAX_BATCH_OPS = 450;
  
  for (let i = 0; i < actionItems.length; i += MAX_BATCH_OPS) {
    const chunk = actionItems.slice(i, i + MAX_BATCH_OPS);
    const batch = db.batch();

    for (const item of chunk) {
      const userRef = db.doc(`users/${item.uid}`);
      const alumniRef = db.doc(`alumni/${item.uid}`);
      const userData = snapshotUsers[item.uid] || {};

      switch (item.action) {
        case 'alumni_ncc': {
          // Copy data to alumni historical archive to start the 24 month retention
          const { uid: _uid, ...alumniData } = userData;
          batch.set(alumniRef, {
            ...alumniData,
            reasonForArchival: 'ncc_tenure_complete',
            archivedAt: new Date().toISOString(),
            retentionExpiresAt: getRetentionExpiry(alumniRetentionMonths),
          });
          
          // Update user role to alumni and increment their academic year
          batch.update(userRef, { 
            role: 'alumni',
            year: item.newYear 
          });
          break;
        }

        case 'increment_academic_only': {
          // Already an alumni, just keep their academic year moving forward
          batch.update(userRef, {
            year: item.newYear
          });
          break;
        }

        case 'delete_graduated': {
          // If they weren't already archived as alumni, archive them now (simultaneous graduation)
          if (item.userRole !== 'alumni') {
            const { uid: _uid, ...alumniData } = userData;
            batch.set(alumniRef, {
              ...alumniData,
              reasonForArchival: 'academic_complete',
              archivedAt: new Date().toISOString(),
              retentionExpiresAt: getRetentionExpiry(alumniRetentionMonths),
            });
          }
          
          // Delete completely from the app
          batch.delete(userRef);
          
          // Queue auth deletion
          batch.set(db.doc(`pendingAuthDeletions/${item.uid}`), {
            email: userData.email || '',
            deletedBy: 'rollover-script',
            deletedAt: new Date().toISOString(),
            reason: 'academic_complete_rollover',
          });
          break;
        }

        case 'increment': {
          batch.update(userRef, {
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

  // 8. Clean up expired alumni
  console.log('🧹 Cleaning up expired alumni records …');
  let expiredCount = 0;
  try {
    const alumniSnap = await db.collection('alumni').where('retentionExpiresAt', '<', new Date().toISOString()).get();
    if (!alumniSnap.empty) {
      for (let i = 0; i < alumniSnap.size; i += MAX_BATCH_OPS) {
        const chunk = alumniSnap.docs.slice(i, i + MAX_BATCH_OPS);
        const batch = db.batch();
        chunk.forEach(doc => batch.delete(doc.ref));
        await batch.commit();
        expiredCount += chunk.length;
      }
    }
  } catch (err) {
    console.error('   ⚠️ Error cleaning up alumni:', err.message);
  }
  summary.expiredAlumniCleaned = expiredCount;
  console.log(`   ✓ Cleaned ${expiredCount} expired alumni.`);

  // 9. Update settings
  console.log('⚙️  Updating settings with last rollover timestamp …');
  await db.doc('settings/appConfig').set({
    lastRolloverAt: new Date().toISOString(),
    lastRolloverSummary: summary,
  }, { merge: true });

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
