import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { describe, expect, it, vi } from 'vitest';
import RegisterPage from './RegisterPage';

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  signUpWithEmailPassword: vi.fn(),
  signInWithGoogleOAuth: vi.fn(),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: mocks.useAuth,
}));

vi.mock('../../services/auth', () => ({
  authService: {
    signUpWithEmailPassword: mocks.signUpWithEmailPassword,
    signInWithGoogleOAuth: mocks.signInWithGoogleOAuth,
  },
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
  it('keeps Google signup as a normal tappable button', async () => {
    mocks.useAuth.mockReturnValue({ user: null, isAuthLoaded: true });
    mocks.signInWithGoogleOAuth.mockResolvedValue({ success: true });
    renderRegister();

    const googleButton = screen.getByRole('button', { name: /sign up with google/i });
    expect(googleButton).toBeEnabled();

    await userEvent.click(googleButton);

    expect(mocks.signInWithGoogleOAuth).toHaveBeenCalledTimes(1);
  });

  it('validates required profile fields before signup', async () => {
    mocks.useAuth.mockReturnValue({ user: null, isAuthLoaded: true });
    renderRegister();

    await userEvent.click(screen.getByRole('button', { name: /^create account$/i }));

    expect(await screen.findByText('Enter your full name.')).toBeInTheDocument();
    expect(mocks.signUpWithEmailPassword).not.toHaveBeenCalled();
  });

  it('submits a complete email signup and redirects when a session exists', async () => {
    mocks.useAuth.mockReturnValue({ user: null, isAuthLoaded: true });
    mocks.signUpWithEmailPassword.mockResolvedValue({ success: true, requiresEmailVerification: false });
    const history = renderRegister();

    await userEvent.type(screen.getByLabelText(/full name/i), 'Mann Jadwani');
    await userEvent.type(screen.getByLabelText(/email/i), 'mann@example.com');
    await userEvent.type(screen.getByLabelText(/mobile/i), '+919730156154');
    await userEvent.type(screen.getByLabelText(/password/i), 'secret123');
    await userEvent.click(screen.getByRole('button', { name: /^create account$/i }));

    await waitFor(() => expect(history.location.pathname).toBe('/home'));
    expect(mocks.signUpWithEmailPassword).toHaveBeenCalledWith({
      fullName: 'Mann Jadwani',
      email: 'mann@example.com',
      phone: '+919730156154',
      password: 'secret123',
    });
  });

  it('shows email verification message without navigating', async () => {
    mocks.useAuth.mockReturnValue({ user: null, isAuthLoaded: true });
    mocks.signUpWithEmailPassword.mockResolvedValue({ success: true, requiresEmailVerification: true });
    const history = renderRegister();

    await userEvent.type(screen.getByLabelText(/full name/i), 'Mann Jadwani');
    await userEvent.type(screen.getByLabelText(/email/i), 'mann@example.com');
    await userEvent.type(screen.getByLabelText(/mobile/i), '+919730156154');
    await userEvent.type(screen.getByLabelText(/password/i), 'secret123');
    await userEvent.click(screen.getByRole('button', { name: /^create account$/i }));

    expect(await screen.findByText('Account created. Please verify your email, then sign in.')).toBeInTheDocument();
    expect(history.location.pathname).toBe('/register');
  });
});
