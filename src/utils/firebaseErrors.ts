export function mapFirebaseAuthError(code?: string): string {
  switch (code) {
    case 'auth/invalid-email':
      return 'The email address is invalid.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Contact an administrator.';
    case 'auth/user-not-found':
      return 'No account found with that email.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/email-already-in-use':
      return 'That email is already in use.';
    case 'auth/operation-not-allowed':
      return 'This sign-in method is not allowed. Enable it in Firebase Auth settings.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.';
    case 'auth/configuration-not-found':
      return 'Auth provider is not configured. Ensure Email/Password is enabled and Authorized domains include this origin.';
    // Firestore/common errors we might surface during sign up profile writes
    case 'permission-denied':
      return 'Permission denied. Check your Firestore security rules.';
    case 'unavailable':
      return 'Service unavailable. Please try again.';
    case 'deadline-exceeded':
      return 'Request timed out. Please try again.';
    case 'not-found':
      return 'Required data was not found.';
    case 'already-exists':
      return 'The record already exists.';
    default:
      return 'Authentication failed. Please try again.';
  }
}
