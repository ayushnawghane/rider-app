import { supabase } from '../lib/supabase';

type OtpAction = 'send' | 'verify';

interface OtpFunctionResponse {
  success?: boolean;
  message?: string;
  error?: string;
  request_id?: string;
  provider_type?: string;
  access_token?: string;
  refresh_token?: string;
}

const PHONE_OTP_FUNCTION_NAME = import.meta.env.VITE_PHONE_OTP_FUNCTION_NAME || 'phone-otp-auth';

const callOtpFunction = async (
  action: OtpAction,
  phone: string,
  otp?: string,
) => {
  const { data, error } = await supabase.functions.invoke(PHONE_OTP_FUNCTION_NAME, {
    body: {
      action,
      phone,
      ...(otp ? { otp } : {}),
    },
  });

  if (error) {
    throw new Error(error.message || 'OTP function request failed');
  }

  const payload = (data || {}) as OtpFunctionResponse;
  if (!payload.success) {
    throw new Error(payload.error || payload.message || 'OTP request failed');
  }

  return payload;
};

export const phoneOtpAuthService = {
  async sendOtp(phone: string) {
    const payload = await callOtpFunction('send', phone);
    return {
      message: payload.message,
      requestId: payload.request_id,
      providerType: payload.provider_type,
    };
  },

  async verifyOtp(phone: string, otp: string) {
    const payload = await callOtpFunction('verify', phone, otp);
    const accessToken = payload.access_token;
    const refreshToken = payload.refresh_token;

    if (!accessToken || !refreshToken) {
      throw new Error('OTP verified but auth session tokens are missing');
    }

    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) {
      throw new Error(error.message || 'Failed to set auth session');
    }
  },
};
