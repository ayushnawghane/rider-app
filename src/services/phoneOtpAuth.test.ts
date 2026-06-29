import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  getSession: vi.fn(),
  setSession: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: mocks.invoke,
    },
    auth: {
      getSession: mocks.getSession,
      setSession: mocks.setSession,
    },
  },
}));

const { phoneOtpAuthService } = await import('./phoneOtpAuth');

describe('phoneOtpAuthService', () => {
  beforeEach(() => {
    mocks.getSession.mockResolvedValue({ data: { session: null } });
    mocks.setSession.mockResolvedValue({ error: null });
  });

  it('sends OTP through the Supabase Edge Function', async () => {
    mocks.invoke.mockResolvedValue({
      data: {
        success: true,
        message: 'OTP sent',
        request_id: 'req-123',
        provider_type: 'sms',
      },
      error: null,
    });

    await expect(phoneOtpAuthService.sendOtp('+919730156154')).resolves.toEqual({
      message: 'OTP sent',
      requestId: 'req-123',
      providerType: 'sms',
    });

    expect(mocks.invoke).toHaveBeenCalledWith('phone-otp-auth', {
      body: {
        action: 'send',
        phone: '+919730156154',
      },
    });
  });

  it('sets Supabase session after OTP verification returns tokens', async () => {
    mocks.invoke.mockResolvedValue({
      data: {
        success: true,
        access_token: 'access-token',
        refresh_token: 'refresh-token',
      },
      error: null,
    });

    await phoneOtpAuthService.verifyOtp('+919730156154', '123456');

    expect(mocks.invoke).toHaveBeenCalledWith('phone-otp-auth', {
      body: {
        action: 'verify',
        phone: '+919730156154',
        otp: '123456',
      },
    });
    expect(mocks.setSession).toHaveBeenCalledWith({
      access_token: 'access-token',
      refresh_token: 'refresh-token',
    });
  });

  it('verifies OTP even when another session already exists so phone login can switch to the correct account', async () => {
    mocks.getSession.mockResolvedValue({
      data: {
        session: {
          access_token: 'existing-access',
          refresh_token: 'existing-refresh',
        },
      },
    });
    mocks.invoke.mockResolvedValue({
      data: {
        success: true,
        access_token: 'new-access',
        refresh_token: 'new-refresh',
      },
      error: null,
    });

    await phoneOtpAuthService.verifyOtp('+919****6154', '123456');

    expect(mocks.invoke).toHaveBeenCalledWith('phone-otp-auth', {
      body: {
        action: 'verify',
        phone: '+919****6154',
        otp: '123456',
      },
    });
    expect(mocks.setSession).toHaveBeenCalledWith({
      access_token: 'new-access',
      refresh_token: 'new-refresh',
    });
  });

  it('throws clear errors when verification succeeds without tokens', async () => {
    mocks.invoke.mockResolvedValue({
      data: { success: true },
      error: null,
    });

    await expect(phoneOtpAuthService.verifyOtp('+919730156154', '123456')).rejects.toThrow(
      'OTP verified but auth session tokens are missing',
    );
  });
});
