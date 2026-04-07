import { supabase } from '../lib/supabase';
import type {
  User,
  Ride,
  Dispute,
  Message,
  Notification,
  SosAlert,
  Notice,
  Faq,
  KycUploadParams,
  RideCreateParams,
  DisputeCreateParams,
  MessageCreateParams,
  SosCreateParams,
  ProfileUpdateParams,
  VehicleDetails,
} from '../types';

class AuthService {
  private normalizeEmail(email: string) {
    return email.trim().toLowerCase();
  }

  private normalizePhone(phone: string) {
    return phone.trim();
  }

  private splitFullName(fullName: string) {
    const trimmedName = fullName.trim().replace(/\s+/g, ' ');
    const [firstName = '', ...lastNameParts] = trimmedName.split(' ');

    return {
      fullName: trimmedName,
      firstName,
      lastName: lastNameParts.join(' '),
    };
  }

  private async upsertProfile(params: {
    userId: string;
    email: string;
    fullName: string;
    phone: string;
    avatarUrl?: string | null;
  }) {
    const { fullName, firstName, lastName } = this.splitFullName(params.fullName);

    const profilePayload = {
      id: params.userId,
      email: this.normalizeEmail(params.email),
      full_name: fullName,
      first_name: firstName || null,
      last_name: lastName || null,
      phone: this.normalizePhone(params.phone),
      avatar_url: params.avatarUrl ?? null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('profiles')
      .upsert(profilePayload, { onConflict: 'id' });

    if (error) {
      throw error;
    }
  }

  async logout(): Promise<void> {
    await supabase.auth.signOut();
  }

  async signInWithEmailPassword(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: this.normalizeEmail(email),
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Unexpected error during email sign-in:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  async signUpWithEmailPassword(params: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
  }): Promise<{ success: boolean; error?: string; requiresEmailVerification?: boolean }> {
    const { fullName, firstName, lastName } = this.splitFullName(params.fullName);
    const normalizedEmail = this.normalizeEmail(params.email);
    const normalizedPhone = this.normalizePhone(params.phone);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: params.password,
        options: {
          data: {
            full_name: fullName,
            first_name: firstName,
            last_name: lastName,
            phone: normalizedPhone,
          },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        try {
          await this.upsertProfile({
            userId: data.user.id,
            email: normalizedEmail,
            fullName,
            phone: normalizedPhone,
          });
        } catch (profileError) {
          console.warn('Profile sync after email sign-up failed:', profileError);
        }
      }

      return {
        success: true,
        requiresEmailVerification: !data.session,
      };
    } catch (error) {
      console.error('Unexpected error during email sign-up:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  async signInWithGoogle(idToken: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });

      if (error) {
        console.error('Error signing in with Google:', error.message);
        return { success: false, error: error.message };
      }

      const authUser = data.user;
      if (authUser) {
        const email = authUser.email?.trim();
        const fullName =
          typeof authUser.user_metadata?.full_name === 'string'
            ? authUser.user_metadata.full_name
            : typeof authUser.user_metadata?.name === 'string'
              ? authUser.user_metadata.name
              : 'Rider';
        const phone =
          typeof authUser.phone === 'string' && authUser.phone.trim()
            ? authUser.phone
            : `phone-${authUser.id.slice(0, 12)}`;

        if (email) {
          try {
            await this.upsertProfile({
              userId: authUser.id,
              email,
              fullName,
              phone,
              avatarUrl:
                typeof authUser.user_metadata?.avatar_url === 'string'
                  ? authUser.user_metadata.avatar_url
                  : typeof authUser.user_metadata?.picture === 'string'
                    ? authUser.user_metadata.picture
                    : null,
            });
          } catch (profileError) {
            console.warn('Profile sync after Google sign-in failed:', profileError);
          }
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Unexpected error during Google sign-in:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return null;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!profile) {
        return null;
      }

      return this.mapProfileToUser(profile);
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  }

  async updateProfile(params: ProfileUpdateParams, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // ── Step 1: Update Supabase Auth user metadata ─────────────────────────
      // IMPORTANT: Supabase typically has a trigger that syncs auth.users metadata
      // → profiles table. We MUST update auth metadata first so the trigger
      // doesn't overwrite our profile changes.
      const authMetaUpdate: Record<string, unknown> = {};
      let newEmail: string | undefined;

      if (typeof params.fullName === 'string' && params.fullName.trim()) {
        const trimmed = params.fullName.trim();
        const parts = trimmed.split(' ');
        authMetaUpdate.full_name = trimmed;
        authMetaUpdate.first_name = parts[0] || '';
        authMetaUpdate.last_name = parts.slice(1).join(' ') || '';
      }

      if (typeof params.email === 'string' && params.email.trim()) {
        newEmail = params.email.trim();
        // Do NOT pass email to updateUser here — it triggers a confirmation
        // email flow. We store it directly in the profiles row instead.
        // Only update auth metadata for full_name.
      }

      if (Object.keys(authMetaUpdate).length > 0) {
        const { error: authError } = await supabase.auth.updateUser({
          data: authMetaUpdate,
        });
        if (authError) {
          console.warn('[updateProfile] Auth metadata update failed:', authError.message);
          // Non-fatal: continue to update the profile row anyway
        }
      }

      // ── Step 2: Build the profiles row update payload ──────────────────────
      const profilePayload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (typeof params.fullName === 'string' && params.fullName.trim()) {
        const trimmed = params.fullName.trim();
        const parts = trimmed.split(' ');
        profilePayload.full_name = trimmed;
        profilePayload.first_name = parts[0] || '';
        profilePayload.last_name = parts.slice(1).join(' ') || null;
      }

      if (newEmail) {
        profilePayload.email = newEmail;
      }

      if (typeof params.language === 'string') {
        profilePayload.language = params.language;
      }

      if (typeof params.notificationPreferences === 'boolean') {
        profilePayload.notification_preferences = params.notificationPreferences;
      }

      if (params.vehicleDetails && typeof params.vehicleDetails === 'object') {
        profilePayload.vehicle_details = params.vehicleDetails as VehicleDetails;
      }

      if (typeof params.phone === 'string' && params.phone.trim()) {
        profilePayload.phone = params.phone.trim();
      }

      // Nothing meaningful to update
      if (Object.keys(profilePayload).length === 1) {
        return { success: true };
      }

      console.log('[updateProfile] profiles payload:', profilePayload);

      const { data, error } = await supabase
        .from('profiles')
        .update(profilePayload)
        .eq('id', userId)
        .select('id, full_name, email, first_name, last_name');

      console.log('[updateProfile] profiles result:', { data, error });

      if (error) {
        console.error('[updateProfile] Supabase error:', error);
        return { success: false, error: error.message };
      }

      if (!data || data.length === 0) {
        console.error('[updateProfile] 0 rows updated — RLS policy likely missing.');
        return {
          success: false,
          error: 'Save failed: permission denied. Run the profiles RLS migration in Supabase.',
        };
      }

      return { success: true };
    } catch (error) {
      console.error('[updateProfile] Unexpected error:', error);
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  async uploadKycDocument({ file, userId }: KycUploadParams): Promise<{ success: boolean; documentUrl?: string; error?: string }> {
    try {
      const fileName = `${userId}/kyc-${Date.now()}`;

      const { error: uploadError } = await supabase.storage
        .from('kyc-documents')
        .upload(fileName, file);

      if (uploadError) {
        return { success: false, error: uploadError.message };
      }

      const { data: { publicUrl } } = supabase.storage
        .from('kyc-documents')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ kyc_document_url: publicUrl, kyc_status: 'pending' })
        .eq('id', userId);

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      return { success: true, documentUrl: publicUrl };
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  async syncClerkUserToSupabase(clerkUser: any): Promise<void> {
    try {
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', clerkUser.id)
        .single();

      const profileData = {
        id: clerkUser.id,
        email: clerkUser.primaryEmailAddress?.emailAddress || '',
        full_name: clerkUser.fullName || clerkUser.firstName || 'User',
        phone: clerkUser.phoneNumbers?.[0]?.phoneNumber || '',
        avatar_url: clerkUser.imageUrl || null,
      };

      if (existingProfile) {
        await supabase
          .from('profiles')
          .update(profileData)
          .eq('id', clerkUser.id);
      } else {
        await supabase
          .from('profiles')
          .insert(profileData);
      }
    } catch (error) {
      console.error('Error syncing Clerk user to Supabase:', error);
    }
  }

  private mapProfileToUser(profile: any): User {
    const fullName = profile.full_name || 'Rider';
    const firstName = profile.first_name || fullName.split(' ')[0] || 'Rider';
    const lastName = profile.last_name || fullName.split(' ').slice(1).join(' ') || '';
    return {
      id: profile.id,
      email: profile.email,
      fullName,
      firstName,
      lastName,
      avatarUrl: profile.avatar_url,
      phone: profile.phone,
      kycStatus: profile.kyc_status || 'pending',
      kycDocumentUrl: profile.kyc_document_url,
      language: profile.language || 'en',
      notificationPreferences: profile.notification_preferences ?? true,
      isBlocked: profile.is_blocked ?? false,
      role: profile.role || 'rider',
      totalPoints: profile.total_points ?? 0,
      level: profile.level ?? 1,
      ratingAsDriver: profile.rating_as_driver,
      ratingAsPassenger: profile.rating_as_passenger,
      ridesTaken: profile.rides_taken ?? 0,
      ridesPublished: profile.rides_published ?? 0,
      referralCode: profile.referral_code,
      vehicleDetails: profile.vehicle_details,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
    };
  }
}

export const authService = new AuthService();
