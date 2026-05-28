import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LoginPage from './LoginPage';

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  signInWithEmailPassword: vi.fn(),
  sendOtp: vi.fn(),
  verifyOtp: vi.fn(),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: mocks.useAuth,
}));

vi.mock('../../services/auth', () => ({
  authService: {
    signInWithEmailPassword: mocks.signInWithEmailPassword,
  },
}));

vi.mock('../../services/phoneOtpAuth', () => ({
  phoneOtpAuthService: {
    sendOtp: mocks.sendOtp,
    verifyOtp: mocks.verifyOtp,
  },
}));

const renderLogin = () => {
  const history = createMemoryHistory({ initialEntries: ['/login'] });
  render(
    <Router history={history}>
      <LoginPage />
    </Router>,
  );
  return history;
};

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not show third-party login options', async () => {
    mocks.useAuth.mockReturnValue({ user: null, isAuthLoaded: true });
    renderLogin();

    expect(screen.queryByRole('button', { name: /google/i })).not.toBeInTheDocument();
  });

  it('validates email and password before calling Supabase', async () => {
    mocks.useAuth.mockReturnValue({ user: null, isAuthLoaded: true });
    renderLogin();

    await userEvent.click(screen.getByRole('button', { name: /^email$/i }));
    await userEvent.click(screen.getByRole('button', { name: /sign in with email/i }));

    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument();
    expect(mocks.signInWithEmailPassword).not.toHaveBeenCalled();
  });

  it('submits normalized credentials and redirects after successful login', async () => {
    mocks.useAuth.mockReturnValue({ user: null, isAuthLoaded: true });
    mocks.signInWithEmailPassword.mockResolvedValue({ success: true });
    const history = renderLogin();

    await userEvent.click(screen.getByRole('button', { name: /^email$/i }));
    await userEvent.type(screen.getByLabelText(/email/i), 'Rider@Example.COM');
    await userEvent.type(screen.getByLabelText(/password/i), 'secret123');
    await userEvent.click(screen.getByRole('button', { name: /sign in with email/i }));

    await waitFor(() => expect(history.location.pathname).toBe('/home'));
    expect(mocks.signInWithEmailPassword).toHaveBeenCalledWith('Rider@Example.COM', 'secret123');
  });

  it('shows service errors without navigating', async () => {
    mocks.useAuth.mockReturnValue({ user: null, isAuthLoaded: true });
    mocks.signInWithEmailPassword.mockResolvedValue({
      success: false,
      error: 'Invalid login credentials',
    });
    const history = renderLogin();

    await userEvent.click(screen.getByRole('button', { name: /^email$/i }));
    await userEvent.type(screen.getByLabelText(/email/i), 'rider@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong-password');
    await userEvent.click(screen.getByRole('button', { name: /sign in with email/i }));

    expect(await screen.findByText('Invalid login credentials')).toBeInTheDocument();
    expect(history.location.pathname).toBe('/login');
  });

  it('sends and verifies mobile OTP before navigating home', async () => {
    mocks.useAuth.mockReturnValue({ user: null, isAuthLoaded: true });
    mocks.sendOtp.mockResolvedValue({ message: 'OTP sent' });
    mocks.verifyOtp.mockResolvedValue(undefined);
    const history = renderLogin();

    await userEvent.type(screen.getByLabelText(/mobile/i), '+91 9730156154');
    await userEvent.click(screen.getByRole('button', { name: /send code/i }));

    expect(await screen.findByText('Verification code sent.')).toBeInTheDocument();
    expect(mocks.sendOtp).toHaveBeenCalledWith('+919730156154');

    await userEvent.type(screen.getByLabelText(/verification code/i), '123456');
    await userEvent.click(screen.getByRole('button', { name: /verify code/i }));

    await waitFor(() => expect(history.location.pathname).toBe('/home'));
    expect(mocks.verifyOtp).toHaveBeenCalledWith('+919730156154', '123456');
  });

  it('resends mobile OTP without resetting the phone number', async () => {
    mocks.useAuth.mockReturnValue({ user: null, isAuthLoaded: true });
    mocks.sendOtp.mockResolvedValue({ message: 'OTP sent' });
    renderLogin();

    await userEvent.type(screen.getByLabelText(/mobile/i), '+91 9730156154');
    await userEvent.click(screen.getByRole('button', { name: /send code/i }));
    await screen.findByText('Verification code sent.');

    await userEvent.click(screen.getByRole('button', { name: /resend code/i }));

    expect(await screen.findByText('Verification code sent again.')).toBeInTheDocument();
    expect(mocks.sendOtp).toHaveBeenCalledTimes(2);
    expect(mocks.sendOtp).toHaveBeenLastCalledWith('+919730156154');
    expect(screen.getByLabelText(/mobile/i)).toHaveValue('+91 9730156154');
  });
});
