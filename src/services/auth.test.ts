import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signOut: vi.fn(),
  invoke: vi.fn(),
  upsert: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      signInWithPassword: mocks.signInWithPassword,
      signUp: mocks.signUp,
      signOut: mocks.signOut,
    },
    functions: {
      invoke: mocks.invoke,
    },
    from: vi.fn(() => ({
      upsert: mocks.upsert,
    })),
  },
}));

const { authService } = await import('./auth');

describe('authService', () => {
  beforeEach(() => {
    mocks.upsert.mockResolvedValue({ error: null });
    mocks.signOut.mockResolvedValue({ error: null });
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

  it('deletes the authenticated account through the server function', async () => {
    mocks.invoke.mockResolvedValue({
      data: { success: true, userId: 'user-123' },
      error: null,
    });

    await expect(authService.deleteAccount('user-123')).resolves.toEqual({
      success: true,
    });

    expect(mocks.invoke).toHaveBeenCalledWith('delete-account');
    expect(mocks.signOut).toHaveBeenCalledTimes(1);
  });

  it('does not report success for a mismatched deleted user', async () => {
    mocks.invoke.mockResolvedValue({
      data: { success: true, userId: 'different-user' },
      error: null,
    });

    await expect(authService.deleteAccount('user-123')).resolves.toEqual({
      success: false,
      error: 'Failed to delete account',
    });
  });

});
