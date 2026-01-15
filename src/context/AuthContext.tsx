import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { authService } from '../services';
import type { User, AuthState } from '../types';

interface AuthContextType extends AuthState {
  login: (phone: string) => Promise<{ success: boolean; error?: string }>;
  verifyOtp: (phone: string, otp: string) => Promise<{ success: boolean; error?: string }>;
  register: (phone: string, fullName: string, email: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  const refreshUser = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }));
    try {
      const user = await authService.getCurrentUser();
      setState({ user, loading: false, error: null });
    } catch (error) {
      setState({ user: null, loading: false, error: 'Failed to load user' });
    }
  }, []);

  useEffect(() => {
    refreshUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        await refreshUser();
      } else if (event === 'SIGNED_OUT') {
        setState({ user: null, loading: false, error: null });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refreshUser]);

  const login = async (phone: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    const result = await authService.login({ phone });
    if (!result.success) {
      setState(prev => ({ ...prev, loading: false, error: result.error || 'Login failed' }));
    } else {
      setState(prev => ({ ...prev, loading: false }));
    }
    return result;
  };

  const verifyOtp = async (phone: string, otp: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    const result = await authService.verifyOtp({ phone, otp });
    if (result.success) {
      await refreshUser();
    } else {
      setState(prev => ({ ...prev, loading: false, error: result.error || 'OTP verification failed' }));
    }
    return result;
  };

  const register = async (phone: string, fullName: string, email: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    const result = await authService.register({ phone, fullName, email });
    if (!result.success) {
      setState(prev => ({ ...prev, loading: false, error: result.error || 'Registration failed' }));
    } else {
      setState(prev => ({ ...prev, loading: false }));
    }
    return result;
  };

  const logout = async () => {
    setState(prev => ({ ...prev, loading: true }));
    await authService.logout();
    setState({ user: null, loading: false, error: null });
  };

  return (
    <AuthContext.Provider value={{ ...state, login, verifyOtp, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
