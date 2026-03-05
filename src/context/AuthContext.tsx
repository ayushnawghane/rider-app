import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
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
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  phone: string;
  kyc_status?: 'pending' | 'approved' | 'rejected';
  kyc_document_url?: string;
  language?: string;
  notification_preferences?: boolean;
  is_blocked?: boolean;
  role?: 'rider' | 'driver' | 'admin';
  total_points?: number;
  level?: number;
  rating_as_driver?: number;
  rating_as_passenger?: number;
  rides_taken?: number;
  rides_published?: number;
  referral_code?: string;
  vehicle_details?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

type AuthUserLite = {
  id: string;
  email?: string | null;
  phone?: string | null;
  user_metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const toFallbackEmail = (id: string) => `phone-${id}@riderapp.local`;
const toFallbackPhone = (id: string) => `phone-${id.slice(0, 12)}`;
const isAuthSessionMissing = (error: unknown) =>
  error instanceof Error && /auth session missing/i.test(error.message);
const isTimeoutError = (error: unknown) =>
  error instanceof Error && /timed out/i.test(error.message);
const isAbortError = (error: unknown) =>
  (error instanceof DOMException && error.name === 'AbortError') ||
  (error instanceof Error && error.name === 'AbortError') ||
  (error instanceof Error && /signal is aborted|aborted/i.test(error.message));
const AUTH_REFRESH_TIMEOUT_MS = 12000;

const withTimeout = async <T,>(operation: () => Promise<T>, timeoutMs: number, timeoutMessage: string) => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  let timedOut = false;
  const operationPromise = operation();
  const guardedOperationPromise = operationPromise.catch((operationError) => {
    if (timedOut) {
      // Prevent unhandled promise rejections from late failures after timeout wins.
      return new Promise<T>(() => undefined);
    }
    throw operationError;
  });
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      timedOut = true;
      reject(new Error(timeoutMessage));
    }, timeoutMs);
  });

  try {
    return await Promise.race([guardedOperationPromise, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

const toUserFromAuth = (authUser: AuthUserLite): User => {
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
    totalPoints: 0,
    level: 1,
    ridesTaken: 0,
    ridesPublished: 0,
    createdAt: authUser.created_at || new Date().toISOString(),
    updatedAt: authUser.updated_at || new Date().toISOString(),
  };
};

const mergeProfile = (baseUser: User, profile: ProfileRow): User => {
  const fullName = profile.full_name || baseUser.fullName;
  const firstName =
    profile.first_name ||
    fullName.split(' ')[0] ||
    baseUser.firstName ||
    'Rider';
  const lastName =
    profile.last_name ||
    fullName.split(' ').slice(1).join(' ') ||
    baseUser.lastName ||
    '';

  return {
    ...baseUser,
    id: profile.id,
    email: profile.email || baseUser.email,
    fullName,
    firstName,
    lastName,
    avatarUrl: profile.avatar_url || baseUser.avatarUrl,
    phone: profile.phone || baseUser.phone,
    kycStatus: profile.kyc_status || baseUser.kycStatus,
    kycDocumentUrl: profile.kyc_document_url || baseUser.kycDocumentUrl,
    language: profile.language || baseUser.language,
    notificationPreferences: profile.notification_preferences ?? baseUser.notificationPreferences,
    isBlocked: profile.is_blocked ?? baseUser.isBlocked,
    role: profile.role || baseUser.role,
    totalPoints: profile.total_points ?? baseUser.totalPoints,
    level: profile.level ?? baseUser.level,
    ratingAsDriver: profile.rating_as_driver ?? baseUser.ratingAsDriver,
    ratingAsPassenger: profile.rating_as_passenger ?? baseUser.ratingAsPassenger,
    ridesTaken: profile.rides_taken ?? baseUser.ridesTaken,
    ridesPublished: profile.rides_published ?? baseUser.ridesPublished,
    referralCode: profile.referral_code ?? baseUser.referralCode,
    vehicleDetails: profile.vehicle_details ?? baseUser.vehicleDetails,
    createdAt: profile.created_at || baseUser.createdAt,
    updatedAt: profile.updated_at || baseUser.updatedAt,
  };
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const refreshPromiseRef = useRef<Promise<void> | null>(null);
  const isMountedRef = useRef(true);
  const currentUserRef = useRef<User | null>(null);

  useEffect(() => {
    currentUserRef.current = user;
  }, [user]);

  const runRefreshUser = useCallback(async (showLoader: boolean, authUserHint?: AuthUserLite | null) => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    const task = (async () => {
      if (showLoader && isMountedRef.current) {
        setLoading(true);
      }

      try {
        setError(null);
        let authUser: AuthUserLite | null = authUserHint || null;

        if (!authUser) {
          try {
            const {
              data: { user },
              error: getUserError,
            } = await withTimeout(
              () => supabase.auth.getUser(),
              AUTH_REFRESH_TIMEOUT_MS,
              'Auth refresh timed out while loading user session',
            );

            if (getUserError) {
              if (isAuthSessionMissing(getUserError)) {
                setUser(null);
                return;
              }
              throw getUserError;
            }

            authUser = user;
          } catch (authLookupError) {
            if (!isTimeoutError(authLookupError)) {
              throw authLookupError;
            }

            const {
              data: { session },
              error: sessionError,
            } = await supabase.auth.getSession();

            if (sessionError) {
              throw sessionError;
            }

            authUser = session?.user || null;
          }
        }

        if (!authUser) {
          setUser(null);
          return;
        }

        const mappedUser = toUserFromAuth(authUser);
        const { data: profile, error: profileError } = await withTimeout(
          async () =>
            supabase
              .from('profiles')
              .select('*')
              .eq('id', authUser.id)
              .maybeSingle(),
          AUTH_REFRESH_TIMEOUT_MS,
          'Auth refresh timed out while loading profile',
        );

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

        const { data: createdProfile, error: createProfileError } = await withTimeout(
          async () =>
            supabase
              .from('profiles')
              .upsert(profilePayload, { onConflict: 'id' })
              .select('*')
              .maybeSingle(),
          AUTH_REFRESH_TIMEOUT_MS,
          'Auth refresh timed out while creating profile',
        );

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
        if (isAbortError(refreshError)) {
          setError(null);
          return;
        }
        if (isTimeoutError(refreshError) && currentUserRef.current) {
          console.warn('Auth refresh timed out; retaining existing user state');
          setError(null);
          return;
        }
        console.error('Error refreshing user:', refreshError);
        setError(refreshError instanceof Error ? refreshError.message : 'Failed to load user');
        setUser(null);
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
          setIsAuthReady(true);
        }
      }
    })();

    refreshPromiseRef.current = task.finally(() => {
      refreshPromiseRef.current = null;
    });

    return refreshPromiseRef.current;
  }, []);

  const refreshUser = useCallback(async () => {
    await runRefreshUser(true);
  }, [runRefreshUser]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      await runRefreshUser(true);
      if (!mounted) return;
    };

    void bootstrap().catch((bootstrapError) => {
      if (isAbortError(bootstrapError)) {
        return;
      }
      console.error('Error bootstrapping auth:', bootstrapError);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted || !isMountedRef.current) return;

      // Token refresh happens in background frequently; do not block app UI for it.
      if (event === 'TOKEN_REFRESHED') {
        return;
      }

      const hintUser = session?.user
        ? ({
          id: session.user.id,
          email: session.user.email,
          phone: session.user.phone,
          user_metadata: session.user.user_metadata,
          created_at: session.user.created_at,
          updated_at: session.user.updated_at,
        } as AuthUserLite)
        : null;

      void runRefreshUser(false, hintUser).catch((refreshError) => {
        if (isAbortError(refreshError)) {
          return;
        }
        console.error('Error handling auth state change:', refreshError);
      });
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [runRefreshUser]);

  const login = async () => Promise.resolve();
  const register = async () => Promise.resolve();

  const logout = async () => {
    try {
      if (isMountedRef.current) {
        setLoading(true);
      }
      setError(null);
      await supabase.auth.signOut();
      setUser(null);
    } catch (logoutError: unknown) {
      setError(logoutError instanceof Error ? logoutError.message : 'Logout failed');
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
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
