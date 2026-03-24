import React from 'react';
import { AuthProvider as AppAuthProvider } from '@/features/auth/context/AuthContext';

interface Props {
  children: React.ReactNode;
}

const AuthProvider: React.FC<Props> = ({ children }) => {
  return <AppAuthProvider>{children}</AppAuthProvider>;
};

export default AuthProvider;
