import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signInWithOAuth: vi.fn(),
  exchangeCodeForSession: vi.fn(),
  setSession: vi.fn(),
  browserOpen: vi.fn(),
  browserClose: vi.fn(),
  isNativePlatform: vi.fn(),
  upsert: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      signInWithPassword: mocks.signInWithPassword,
      signUp: mocks.signUp,
      signInWithOAuth: mocks.signInWithOAuth,
      exchangeCodeForSession: mocks.exchangeCodeForSession,
      setSession: mocks.setSession,
    },
    from: vi.fn(() => ({
      upsert: mocks.upsert,
    })),
  },
}));

vi.mock('@capacitor/browser', () => ({
  Browser: {
    open: mocks.browserOpen,
    close: mocks.browserClose,
  },
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: mocks.isNativePlatform,
  },
}));

const { authService, NATIVE_AUTH_REDIRECT_URL } = await import('./auth');

describe('authService', () => {
  beforeEach(() => {
    mocks.isNativePlatform.mockReturnValue(false);
    mocks.browserOpen.mockResolvedValue(undefined);
    mocks.browserClose.mockResolvedValue(undefined);
    mocks.exchangeCodeForSession.mockResolvedValue({ error: null });
    mocks.setSession.mockResolvedValue({ error: null });
    mocks.upsert.mockResolvedValue({ error: null });
  });

  it('normalizes email before password sign in', async () => {
    mocks.signInWithPassword.mockResolvedValue({ error: null });

    const result = await authService.signInWithEmailPassword(' Rider@Example.COM ', 'secret123');

    expect(result).toEqual({ success: true });
    expect(mocks.signInWithPassword).toHaveBeenCalledWith({
      email: 'rider@example.com',
      password: 'secret123',
    });
  });

  it('surfaces Supabase password sign-in errors', async () => {
    mocks.signInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials' } });

    await expect(authService.signInWithEmailPassword('rider@example.com', 'bad')).resolves.toEqual({
      success: false,
      error: 'Invalid login credentials',
    });
  });

  it('starts native Google OAuth with the app callback URL', async () => {
    mocks.isNativePlatform.mockReturnValue(true);
    mocks.signInWithOAuth.mockResolvedValue({
      data: { url: 'https://accounts.google.com/o/oauth2/v2/auth' },
      error: null,
    });

    const result = await authService.signInWithGoogleOAuth();

    expect(result).toEqual({ success: true });
    expect(mocks.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo: NATIVE_AUTH_REDIRECT_URL,
        skipBrowserRedirect: true,
      },
    });
    expect(mocks.browserOpen).toHaveBeenCalledWith({
      url: 'https://accounts.google.com/o/oauth2/v2/auth',
      presentationStyle: 'fullscreen',
    });
  });

  it('exchanges OAuth callback codes for Supabase sessions', async () => {
    const result = await authService.handleOAuthCallback(`${NATIVE_AUTH_REDIRECT_URL}?code=abc123`);

    expect(result).toEqual({ success: true });
    expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith('abc123');
  });

  it('sets sessions from token hash callbacks', async () => {
    const result = await authService.handleOAuthCallback(
      `${NATIVE_AUTH_REDIRECT_URL}#access_token=access&refresh_token=refresh`,
    );

    expect(result).toEqual({ success: true });
    expect(mocks.setSession).toHaveBeenCalledWith({
      access_token: 'access',
      refresh_token: 'refresh',
    });
  });
});
