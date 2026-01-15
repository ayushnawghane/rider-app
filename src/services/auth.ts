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
  LoginParams,
  VerifyOtpParams,
  RegisterParams,
  KycUploadParams,
  RideCreateParams,
  DisputeCreateParams,
  MessageCreateParams,
  SosCreateParams,
  ProfileUpdateParams,
} from '../types';

class AuthService {
  async login({ phone }: LoginParams): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  async verifyOtp({ phone, otp }: VerifyOtpParams): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.verifyOtp({
        phone,
        token: otp,
        type: 'sms',
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  async register({ phone, fullName, email }: RegisterParams): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.auth.signUp({
        phone,
      } as any);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  async logout(): Promise<void> {
    await supabase.auth.signOut();
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

  async updateProfile(params: ProfileUpdateParams): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        return { success: false, error: 'User not found' };
      }

      const { error } = await supabase
        .from('profiles')
        .update(params)
        .eq('id', user.id);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
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

  private mapProfileToUser(profile: any): User {
    return {
      id: profile.id,
      email: profile.email,
      fullName: profile.full_name,
      phone: profile.phone,
      kycStatus: profile.kyc_status,
      kycDocumentUrl: profile.kyc_document_url,
      language: profile.language,
      notificationPreferences: profile.notification_preferences,
      isBlocked: profile.is_blocked,
      role: profile.role,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
    };
  }
}

export const authService = new AuthService();
