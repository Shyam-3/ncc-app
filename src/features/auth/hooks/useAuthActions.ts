// Custom hook for auth actions
import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/authApi';
import type { RegisterData } from '../model/auth.types';

export function useAuthActions() {
  const auth = useAuth();

  const login = useCallback(async (email: string, password: string) => {
    return authApi.loginWithEmail(email, password);
  }, []);

  const register = useCallback(async (data: RegisterData) => {
    const { email, password, name } = data;
    return authApi.registerWithEmail(email, password, name);
  }, []);

  const logout = useCallback(async () => {
    return authApi.logout();
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    return authApi.resetPassword(email);
  }, []);

  return {
    ...auth,
    login,
    register,
    logout,
    resetPassword,
  };
}
