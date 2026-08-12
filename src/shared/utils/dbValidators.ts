import { doc, getDoc, WriteBatch } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Calculates the age in years based on the given Date of Birth string.
 * @param dobString Date string (e.g., 'YYYY-MM-DD')
 * @returns Age in years
 */
export const calculateAge = (dobString: string): number => {
  if (!dobString) return 0;
  const dob = new Date(dobString);
  const today = new Date();
  
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  
  return age;
};

/**
 * Checks if a specific field value is unique across critical user collections.
 * Queries 'users', 'alumni', and 'pendingCadets' collections.
 * 
 * @param field The field name to check (e.g., 'regimentalNumber', 'registerNumber', 'rollNo')
 * @param value The value to check for uniqueness
 * @param excludeUid Optional UID to exclude from the check (used when editing an existing profile)
 * @returns `true` if the value is unique, `false` if it already exists in another document.
 */
export const checkUniqueField = async (
  field: string,
  value: string,
  excludeUid?: string
): Promise<boolean> => {
  if (!value || value.trim() === '') return true;
  
  const cleanValue = value.trim();
  const safeId = cleanValue.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (!safeId) return true;
  
  const docId = `${field}_${safeId}`;
  
  try {
    const docRef = doc(db, 'takenNumbers', docId);
    const snapshot = await getDoc(docRef);
    
    if (snapshot.exists()) {
      const data = snapshot.data();
      if (data.uid === excludeUid) {
        return true;
      }
      return false;
    }
  } catch (error) {
    console.error(`Error checking uniqueness in takenNumbers for ${field}:`, error);
    throw new Error(`Failed to validate uniqueness of ${field}.`);
  }
  
  return true;
};

/**
 * Helper to get the deterministic document ID for the takenNumbers collection.
 */
export const getTakenNumberDocId = (field: string, value: string): string | null => {
  if (!value) return null;
  const clean = value.toString().trim();
  const safeId = clean.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return safeId ? `${field}_${safeId}` : null;
};

/**
 * Helper to safely update a taken number during an edit (deletes old, sets new)
 * within a batch.
 */
export const updateTakenNumberBatch = (
  batch: WriteBatch,
  field: string,
  oldValue: string | undefined,
  newValue: string,
  uid: string
) => {
  const oldDocId = oldValue ? getTakenNumberDocId(field, oldValue) : null;
  const newDocId = getTakenNumberDocId(field, newValue);

  // If the value changed, remove the old registration
  if (oldDocId && oldDocId !== newDocId) {
    batch.delete(doc(db, 'takenNumbers', oldDocId));
  }

  // Set the new registration ONLY if it's different from the old one
  if (newDocId && oldDocId !== newDocId) {
    batch.set(doc(db, 'takenNumbers', newDocId), {
      type: field,
      uid,
      originalValue: newValue.trim(),
      createdAt: new Date().toISOString()
    });
  }
};

/**
 * Helper to delete a taken number when a user is deleted.
 */
export const deleteTakenNumberBatch = (
  batch: WriteBatch,
  field: string,
  value: string | undefined
) => {
  const docId = value ? getTakenNumberDocId(field, value) : null;
  if (docId) {
    batch.delete(doc(db, 'takenNumbers', docId));
  }
};
