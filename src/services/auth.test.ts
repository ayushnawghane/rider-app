import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  upsert: vi.fn(),
}));

vi.mock('../lib/supabase', () => ({
  isSupabaseConfigured: true,
  supabase: {
    auth: {
      signInWithPassword: mocks.signInWithPassword,
      signUp: mocks.signUp,
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

});
