#!/usr/bin/env node
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function checkSchedule() {
  console.log('⏰ Checking dynamic schedule...');
  const configSnap = await db.doc('settings/appConfig').get();
  
  if (!configSnap.exists) {
    console.log('   ⏭️ No appConfig found in settings. Exiting.');
    process.exit(0);
  }

  const config = configSnap.data();

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

  console.log('   ✅ Time arrived! Triggering actual rollover workflow...');
  
  // Exit with code 200 to signal to bash that it should trigger the workflow
  process.exit(200);
}

checkSchedule().catch(err => {
    console.error(err);
    process.exit(1);
});
