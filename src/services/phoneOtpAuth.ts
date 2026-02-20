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

const parseFunctionError = async (error: unknown) => {
  const defaultMessage = 'OTP function request failed';
  if (!(error instanceof Error)) return defaultMessage;

  const errorWithContext = error as Error & { context?: Response };
  if (!errorWithContext.context) {
    return error.message || defaultMessage;
  }

  try {
    const cloned = errorWithContext.context.clone();
    const payload = await cloned.json();
    if (payload && typeof payload === 'object') {
      const typedPayload = payload as Record<string, unknown>;
      const message =
        (typeof typedPayload.error === 'string' && typedPayload.error) ||
        (typeof typedPayload.message === 'string' && typedPayload.message);
      if (message) return message;
    }
  } catch {
    // Ignore JSON parse errors and try text fallback.
  }

  try {
    const text = await errorWithContext.context.clone().text();
    if (text.trim()) return text.trim();
  } catch {
    // Ignore read failures.
  }

  return error.message || defaultMessage;
};

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
    const message = await parseFunctionError(error);
    throw new Error(message);
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
    const {
      data: { session: existingSession },
    } = await supabase.auth.getSession();

    if (existingSession?.access_token && existingSession?.refresh_token) {
      return;
    }

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
