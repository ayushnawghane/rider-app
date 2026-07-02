import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { describe, expect, it, vi } from 'vitest';
import RegisterPage from './RegisterPage';

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  refreshUser: vi.fn(),
  sendOtp: vi.fn(),
  verifyOtp: vi.fn(),
  updateProfile: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: mocks.useAuth,
}));

vi.mock('../../services/auth', () => ({
  authService: {
    updateProfile: mocks.updateProfile,
  },
}));

vi.mock('../../services/phoneOtpAuth', () => ({
  phoneOtpAuthService: {
    sendOtp: mocks.sendOtp,
    verifyOtp: mocks.verifyOtp,
  },
}));

vi.mock('../../lib/supabase', () => ({
  supabase: { auth: { getUser: mocks.getUser } },
}));

const renderRegister = () => {
  const history = createMemoryHistory({ initialEntries: ['/register'] });
  render(
    <Router history={history}>
      <RegisterPage />
    </Router>,
  );
  return history;
};

describe('RegisterPage', () => {
  it('does not show third-party signup options', async () => {
    mocks.useAuth.mockReturnValue({ user: null, isAuthLoaded: true, refreshUser: mocks.refreshUser });
    renderRegister();

    expect(screen.queryByRole('button', { name: /google/i })).not.toBeInTheDocument();
  });

  it('validates required profile fields before sending a code', async () => {
    mocks.useAuth.mockReturnValue({ user: null, isAuthLoaded: true, refreshUser: mocks.refreshUser });
    renderRegister();

    await userEvent.click(screen.getByRole('button', { name: /^send code$/i }));

    expect(await screen.findByText('Enter your full name.')).toBeInTheDocument();
    expect(mocks.sendOtp).not.toHaveBeenCalled();
  });

  it('registers via phone OTP, saves the profile, and redirects home', async () => {
    mocks.useAuth.mockReturnValue({ user: null, isAuthLoaded: true, refreshUser: mocks.refreshUser });
    mocks.sendOtp.mockResolvedValue(undefined);
    mocks.verifyOtp.mockResolvedValue(undefined);
    mocks.getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    mocks.updateProfile.mockResolvedValue({ success: true });
    const history = renderRegister();

    await userEvent.type(screen.getByLabelText(/full name/i), 'Mann Jadwani');
    await userEvent.type(screen.getByLabelText(/email/i), 'mann@example.com');
    await userEvent.type(screen.getByLabelText(/mobile/i), '+919730156154');
    await userEvent.click(screen.getByRole('button', { name: /^send code$/i }));

    await waitFor(() => expect(mocks.sendOtp).toHaveBeenCalledWith('+919730156154'));

    await userEvent.type(await screen.findByLabelText(/verification code/i), '123456');
    await userEvent.click(screen.getByRole('button', { name: /^create account$/i }));

    await waitFor(() => expect(history.location.pathname).toBe('/home'));
    expect(mocks.verifyOtp).toHaveBeenCalledWith('+919730156154', '123456');
    expect(mocks.updateProfile).toHaveBeenCalledWith(
      { fullName: 'Mann Jadwani', email: 'mann@example.com' },
      'user-1',
    );
  });
});
