import type { User as FirebaseUser, UserCredential } from 'firebase/auth';
import {
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
    signInWithEmailAndPassword,
    updateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { UserRole } from '../config/constants';
import { auth, db } from '../config/firebase';
import { User } from '../types';
import { mapFirebaseAuthError } from '../utils/firebaseErrors';

interface SignUpData {
  name: string;
  role: UserRole;
  email?: string;
  dateOfBirth?: string;
  registerNumber?: string;
  division?: string;
  regimentalNumber?: string;
  platoon?: string;
  dateOfEnrollment?: string;
  rank?: string;
  year?: string;
  department?: string;
  rollNo?: string;
  phone?: string;
  bloodGroup?: string;
  address?: string;
}

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: User | null;
  loading: boolean;
  signUp: (email: string, password: string, userData: SignUpData) => Promise<FirebaseUser>;
  signIn: (email: string, password: string) => Promise<UserCredential>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  hasRole: (role: UserRole | UserRole[]) => boolean;
  isAdmin: () => boolean;
  isSuperAdmin: () => boolean;
  isSubAdmin: () => boolean;
  isMember: () => boolean;
  isCadet: () => boolean; // back-compat helper
  fetchUserProfile: (uid: string) => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch user profile from Firestore
  const fetchUserProfile = async (uid: string): Promise<User | null> => {
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const data = userDoc.data() as User;
        setUserProfile(data);
        return data;
      }
      return null;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  };

  // Sign up
  const signUp = async (email: string, password: string, userData: SignUpData): Promise<FirebaseUser> => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Best-effort display name update (do not fail signup if this fails)
      if (userData.name) {
        try {
          await updateProfile(user, { displayName: userData.name });
        } catch (e) {
          console.warn('updateProfile failed (non-fatal):', e);
        }
      }

      // Best-effort profile writes; warn if they fail but do not break auth creation
      try {
        const userDoc: any = {
          uid: user.uid,
          email: user.email!,
          name: userData.name || '',
          role: userData.role || 'member',
          createdAt: new Date().toISOString(),
          status: 'active'
        };

        // Add cadet fields if present
        if (userData.role === 'member') {
          userDoc.dateOfBirth = userData.dateOfBirth || '';
          userDoc.registerNumber = userData.registerNumber || '';
          userDoc.division = userData.division || '';
          userDoc.regimentalNumber = userData.regimentalNumber || '';
          userDoc.platoon = userData.platoon || '';
          userDoc.dateOfEnrollment = userData.dateOfEnrollment || '';
          userDoc.rank = userData.rank || 'CDT';
          userDoc.year = userData.year || 1;
          userDoc.department = userData.department || '';
          userDoc.rollNo = userData.rollNo || '';
          userDoc.phone = userData.phone || '';
          userDoc.bloodGroup = userData.bloodGroup || '';
          userDoc.address = userData.address || '';
        }

        await setDoc(doc(db, 'users', user.uid), userDoc);
      } catch (e: any) {
        console.error('Profile write failed after account creation:', e);
  const msg = mapFirebaseAuthError(e?.code);
  toast(`Account created, but profile save failed. ${msg}`, { icon: '⚠️' });
      }

      toast.success('Account created successfully!');
      return user;
    } catch (error: any) {
      console.error('Sign up error:', error);
      const message = mapFirebaseAuthError(error?.code);
      toast.error(message);
      throw error;
    }
  };

  // Sign in
  const signIn = async (email: string, password: string): Promise<UserCredential> => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      toast.success('Logged in successfully!');
      return result;
    } catch (error: any) {
      console.error('Sign in error:', error);
      const message = mapFirebaseAuthError(error?.code);
      toast.error(message);
      throw error;
    }
  };

  // Sign out
  const signOut = async (): Promise<void> => {
    try {
      await firebaseSignOut(auth);
      setUserProfile(null);
      toast.success('Logged out successfully!');
    } catch (error: any) {
      console.error('Sign out error:', error);
      const message = mapFirebaseAuthError(error?.code);
      toast.error(message);
      throw error;
    }
  };

  // Reset password
  const resetPassword = async (email: string): Promise<void> => {
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('Password reset email sent!');
    } catch (error: any) {
      console.error('Reset password error:', error);
      const message = mapFirebaseAuthError(error?.code);
      toast.error(message);
      throw error;
    }
  };

  // Check if user has role
  const hasRole = (role: UserRole | UserRole[]): boolean => {
    if (!userProfile) return false;
    if (Array.isArray(role)) {
      return role.includes(userProfile.role);
    }
    return userProfile.role === role;
  };

  // Check if user is admin or superadmin
  const isAdmin = (): boolean => hasRole(['admin', 'superadmin']);
  const isSuperAdmin = (): boolean => hasRole('superadmin');
  const isSubAdmin = (): boolean => hasRole('subadmin');
  const isMember = (): boolean => hasRole('member');
  // Removed legacy 'cadet' role; retain helper returning false for compatibility
  const isCadet = (): boolean => false;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: any) => {
      setCurrentUser(user);
      if (user) {
        await fetchUserProfile(user.uid);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value: AuthContextType = {
    currentUser,
    userProfile,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    hasRole,
    isAdmin,
    isSuperAdmin,
    isSubAdmin,
    isMember,
    isCadet,
    fetchUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
