import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LoginPage from './LoginPage';

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  sendOtp: vi.fn(),
  verifyOtp: vi.fn(),
  signInWithGoogle: vi.fn(),
  signInWithApple: vi.fn(),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: mocks.useAuth,
}));

vi.mock('../../services/phoneOtpAuth', () => ({
  phoneOtpAuthService: {
    sendOtp: mocks.sendOtp,
    verifyOtp: mocks.verifyOtp,
  },
}));

vi.mock('../../services/socialAuth', () => ({
  isAppleSignInAvailable: true,
  isGoogleSignInAvailable: true,
  socialAuthService: {
    signInWithGoogle: mocks.signInWithGoogle,
    signInWithApple: mocks.signInWithApple,
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

  it('shows Google and Apple sign-in options', async () => {
    mocks.useAuth.mockReturnValue({ user: null, isAuthLoaded: true });
    renderLogin();

    expect(screen.getByRole('button', { name: /continue with google/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue with apple/i })).toBeInTheDocument();
  });

  it('shows phone login without email login', async () => {
    mocks.useAuth.mockReturnValue({ user: null, isAuthLoaded: true });
    renderLogin();

    expect(screen.queryByRole('button', { name: /sign in with email/i })).not.toBeInTheDocument();
    expect(screen.getByLabelText(/mobile/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^email$/i)).not.toBeInTheDocument();
  });

  it('sends and verifies a phone OTP', async () => {
    mocks.useAuth.mockReturnValue({ user: null, isAuthLoaded: true });
    mocks.sendOtp.mockResolvedValue({ message: 'OTP sent' });
    mocks.verifyOtp.mockResolvedValue(undefined);
    const history = renderLogin();

    await userEvent.type(screen.getByLabelText(/mobile/i), '9730156154');
    await userEvent.click(screen.getByRole('button', { name: /send code/i }));

    await waitFor(() => expect(mocks.sendOtp).toHaveBeenCalledWith('+919730156154'));
    expect(await screen.findByText('Verification code sent.')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText(/verification code/i), '123456');
    await userEvent.click(screen.getByRole('button', { name: /verify code/i }));

    await waitFor(() => expect(mocks.verifyOtp).toHaveBeenCalledWith('+919730156154', '123456'));
    await waitFor(() => expect(history.location.pathname).toBe('/home'));
  });

  it('signs in with Google and navigates home', async () => {
    mocks.useAuth.mockReturnValue({ user: null, isAuthLoaded: true });
    mocks.signInWithGoogle.mockResolvedValue({ success: true });
    const history = renderLogin();

    await userEvent.click(screen.getByRole('button', { name: /continue with google/i }));

    await waitFor(() => expect(mocks.signInWithGoogle).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(history.location.pathname).toBe('/home'));
  });

  it('signs in with Apple and navigates home', async () => {
    mocks.useAuth.mockReturnValue({ user: null, isAuthLoaded: true });
    mocks.signInWithApple.mockResolvedValue({ success: true });
    const history = renderLogin();

    await userEvent.click(screen.getByRole('button', { name: /continue with apple/i }));

    await waitFor(() => expect(mocks.signInWithApple).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(history.location.pathname).toBe('/home'));
  });

  it('surfaces social sign-in errors without navigating', async () => {
    mocks.useAuth.mockReturnValue({ user: null, isAuthLoaded: true });
    mocks.signInWithGoogle.mockResolvedValue({ success: false, error: 'Sign-in failed.' });
    const history = renderLogin();

    await userEvent.click(screen.getByRole('button', { name: /continue with google/i }));

    expect(await screen.findByText('Sign-in failed.')).toBeInTheDocument();
    expect(history.location.pathname).toBe('/login');
  });

  it('stays silent when the user cancels', async () => {
    mocks.useAuth.mockReturnValue({ user: null, isAuthLoaded: true });
    mocks.signInWithGoogle.mockResolvedValue({ success: false, cancelled: true, error: '' });
    const history = renderLogin();

    await userEvent.click(screen.getByRole('button', { name: /continue with google/i }));

    await waitFor(() => expect(mocks.signInWithGoogle).toHaveBeenCalledTimes(1));
    expect(history.location.pathname).toBe('/login');
    expect(screen.queryByText(/failed/i)).not.toBeInTheDocument();
  });
});
