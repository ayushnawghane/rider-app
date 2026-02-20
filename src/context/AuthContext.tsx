import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
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
  isAuthLoaded: boolean;
}

interface ProfileRow {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  kyc_status?: 'pending' | 'approved' | 'rejected';
  kyc_document_url?: string;
  language?: string;
  notification_preferences?: boolean;
  is_blocked?: boolean;
  role?: 'rider' | 'driver' | 'admin';
  created_at?: string;
  updated_at?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const toFallbackEmail = (id: string) => `phone-${id}@riderapp.local`;
const toFallbackPhone = (id: string) => `phone-${id.slice(0, 12)}`;
const isAuthSessionMissing = (error: unknown) =>
  error instanceof Error && /auth session missing/i.test(error.message);

const toUserFromAuth = (authUser: {
  id: string;
  email?: string | null;
  phone?: string | null;
  user_metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}): User => {
  const meta = authUser.user_metadata || {};
  const fullName =
    (typeof meta.full_name === 'string' && meta.full_name.trim()) ||
    (typeof meta.name === 'string' && meta.name.trim()) ||
    'Rider';
  const firstName =
    (typeof meta.first_name === 'string' && meta.first_name.trim()) ||
    fullName.split(' ')[0] ||
    'Rider';
  const lastName =
    (typeof meta.last_name === 'string' && meta.last_name.trim()) ||
    fullName.split(' ').slice(1).join(' ') ||
    '';

  return {
    id: authUser.id,
    email: authUser.email || toFallbackEmail(authUser.id),
    fullName,
    firstName,
    lastName,
    phone: authUser.phone || toFallbackPhone(authUser.id),
    kycStatus: 'pending',
    language: 'en',
    notificationPreferences: true,
    isBlocked: false,
    role: 'rider',
    createdAt: authUser.created_at || new Date().toISOString(),
    updatedAt: authUser.updated_at || new Date().toISOString(),
  };
};

const mergeProfile = (baseUser: User, profile: ProfileRow): User => {
  const fullName = profile.full_name || baseUser.fullName;
  const firstName = fullName.split(' ')[0] || baseUser.firstName || 'Rider';
  const lastName = fullName.split(' ').slice(1).join(' ') || baseUser.lastName || '';

  return {
    ...baseUser,
    id: profile.id,
    email: profile.email || baseUser.email,
    fullName,
    firstName,
    lastName,
    phone: profile.phone || baseUser.phone,
    kycStatus: profile.kyc_status || baseUser.kycStatus,
    kycDocumentUrl: profile.kyc_document_url || baseUser.kycDocumentUrl,
    language: profile.language || baseUser.language,
    notificationPreferences: profile.notification_preferences ?? baseUser.notificationPreferences,
    isBlocked: profile.is_blocked ?? baseUser.isBlocked,
    role: profile.role || baseUser.role,
    createdAt: profile.created_at || baseUser.createdAt,
    updatedAt: profile.updated_at || baseUser.updatedAt,
  };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const refreshUser = useCallback(async () => {
    try {
      setError(null);
      const {
        data: { user: authUser },
        error: getUserError,
      } = await supabase.auth.getUser();

      if (getUserError) {
        if (isAuthSessionMissing(getUserError)) {
          setUser(null);
          return;
        }
        throw getUserError;
      }

      if (!authUser) {
        setUser(null);
        return;
      }

      const mappedUser = toUserFromAuth(authUser);
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (profileError && profileError.code !== 'PGRST116' && profileError.code !== 'PGRST505') {
        console.error('Error fetching profile:', profileError);
      }

      if (profile) {
        setUser(mergeProfile(mappedUser, profile as ProfileRow));
        return;
      }

      // Best effort profile upsert for phone users. If schema differs, continue with auth user only.
      const profilePayload: ProfileRow = {
        id: authUser.id,
        email: mappedUser.email,
        full_name: mappedUser.fullName,
        phone: mappedUser.phone,
        kyc_status: 'pending',
        language: 'en',
        notification_preferences: true,
        is_blocked: false,
        role: 'rider',
      };

      const { data: createdProfile, error: createProfileError } = await supabase
        .from('profiles')
        .upsert(profilePayload, { onConflict: 'id' })
        .select('*')
        .maybeSingle();

      if (createProfileError) {
        console.warn('Profile upsert failed, using auth user only:', createProfileError.message);
        setUser(mappedUser);
        return;
      }

      if (createdProfile) {
        setUser(mergeProfile(mappedUser, createdProfile as ProfileRow));
      } else {
        setUser(mappedUser);
      }
    } catch (refreshError: unknown) {
      if (isAuthSessionMissing(refreshError)) {
        setUser(null);
        setError(null);
        return;
      }
      console.error('Error refreshing user:', refreshError);
      setError(refreshError instanceof Error ? refreshError.message : 'Failed to load user');
      setUser(null);
    } finally {
      setLoading(false);
      setIsAuthReady(true);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      await refreshUser();
      if (!mounted) return;
    };

    bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async () => {
      if (!mounted) return;
      setLoading(true);
      await refreshUser();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [refreshUser]);

  const login = async () => Promise.resolve();
  const register = async () => Promise.resolve();

  const logout = async () => {
    try {
      setLoading(true);
      setError(null);
      await supabase.auth.signOut();
      setUser(null);
    } catch (logoutError: unknown) {
      setError(logoutError instanceof Error ? logoutError.message : 'Logout failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        register,
        logout,
        refreshUser,
        isAuthLoaded: isAuthReady,
      }}
    >
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
