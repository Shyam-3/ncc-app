// Auth API wrapper functions
import { auth } from '@/shared/config/firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import { mapFirebaseAuthError } from '@/shared/utils/firebaseErrors';

export const authApi = {
  async registerWithEmail(email: string, password: string, displayName: string) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      if (userCredential.user) {
        await updateProfile(userCredential.user, { displayName });
      }
      return userCredential;
    } catch (error) {
      throw mapFirebaseAuthError(error as any);
    }
  },

  async loginWithEmail(email: string, password: string) {
    try {
      return await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      throw mapFirebaseAuthError(error as any);
    }
  },

  async logout() {
    try {
      return await signOut(auth);
    } catch (error) {
      throw mapFirebaseAuthError(error as any);
    }
  },

  async resetPassword(email: string) {
    try {
      return await sendPasswordResetEmail(auth, email);
    } catch (error) {
      throw mapFirebaseAuthError(error as any);
    }
  },

  async updateUserProfile(displayName: string, photoURL?: string) {
    const user = auth.currentUser;
    if (!user) throw new Error('No authenticated user');
    try {
      return await updateProfile(user, { displayName, photoURL });
    } catch (error) {
      throw mapFirebaseAuthError(error as any);
    }
  },
};
