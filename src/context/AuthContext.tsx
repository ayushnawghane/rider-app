import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useClerk, useUser } from '@clerk/clerk-react';
import { supabase } from '../lib/supabase';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: () => Promise<void>;
  register: () => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isClerkLoaded: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { signOut: clerkSignOut, openSignIn, openSignUp } = useClerk();
  const { user: clerkUser, isLoaded: isClerkLoaded } = useUser();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const mapClerkUserToUser = useCallback((clerkUser: any): User => {
    return {
      id: clerkUser.id,
      email: clerkUser.primaryEmailAddress?.emailAddress || '',
      fullName: clerkUser.fullName || clerkUser.firstName || 'User',
      phone: clerkUser.phoneNumbers?.[0]?.phoneNumber || '',
      kycStatus: clerkUser.publicMetadata?.kyc_status || 'pending',
      kycDocumentUrl: clerkUser.publicMetadata?.kyc_document_url,
      language: clerkUser.publicMetadata?.language || 'en',
      notificationPreferences: clerkUser.publicMetadata?.notification_preferences ?? true,
      isBlocked: clerkUser.publicMetadata?.is_blocked ?? false,
      role: (clerkUser.publicMetadata?.role as 'rider' | 'driver' | 'admin') || 'rider',
      createdAt: clerkUser.createdAt || new Date().toISOString(),
      updatedAt: clerkUser.updatedAt || new Date().toISOString(),
    };
  }, []);

  const refreshUser = useCallback(async () => {
    if (!clerkUser) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const mappedUser = mapClerkUserToUser(clerkUser);

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', clerkUser.id)
        .single();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching profile:', profileError);
      }

      if (profile) {
        setUser({
          ...mappedUser,
          kycStatus: profile.kyc_status || mappedUser.kycStatus,
          kycDocumentUrl: profile.kyc_document_url || mappedUser.kycDocumentUrl,
          language: profile.language || mappedUser.language,
          notificationPreferences: profile.notification_preferences ?? mappedUser.notificationPreferences,
          isBlocked: profile.is_blocked ?? mappedUser.isBlocked,
          role: profile.role || mappedUser.role,
        });
      } else {
        setUser(mappedUser);
      }
    } catch (err) {
      console.error('Error refreshing user:', err);
      setError('Failed to load user');
    } finally {
      setLoading(false);
    }
  }, [clerkUser, mapClerkUserToUser]);

  useEffect(() => {
    if (isClerkLoaded) {
      refreshUser();
    }
  }, [isClerkLoaded, clerkUser, refreshUser]);

  const login = async () => {
    try {
      setLoading(true);
      setError(null);
      openSignIn();
    } catch (err: any) {
      setError(err.message || 'Login failed');
      setLoading(false);
    }
  };

  const register = async () => {
    try {
      setLoading(true);
      setError(null);
      openSignUp();
    } catch (err: any) {
      setError(err.message || 'Registration failed');
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await clerkSignOut();
      setUser(null);
    } catch (err: any) {
      setError(err.message || 'Logout failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, register, logout, refreshUser, isClerkLoaded }}>
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
