import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { describe, expect, it, vi } from 'vitest';
import LoginPage from './LoginPage';

const mocks = vi.hoisted(() => ({
  useAuth: vi.fn(),
  signInWithEmailPassword: vi.fn(),
  signInWithGoogleOAuth: vi.fn(),
}));

vi.mock('../../context/AuthContext', () => ({
  useAuth: mocks.useAuth,
}));

vi.mock('../../services/auth', () => ({
  authService: {
    signInWithEmailPassword: mocks.signInWithEmailPassword,
    signInWithGoogleOAuth: mocks.signInWithGoogleOAuth,
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
  it('keeps the Google button as a normal tappable button', async () => {
    mocks.useAuth.mockReturnValue({ user: null, isAuthLoaded: true });
    mocks.signInWithGoogleOAuth.mockResolvedValue({ success: true });
    renderLogin();

    const googleButton = screen.getByRole('button', { name: /continue with google/i });
    expect(googleButton).toBeEnabled();

    await userEvent.click(googleButton);

    expect(mocks.signInWithGoogleOAuth).toHaveBeenCalledTimes(1);
  });

  it('validates email and password before calling Supabase', async () => {
    mocks.useAuth.mockReturnValue({ user: null, isAuthLoaded: true });
    renderLogin();

    await userEvent.click(screen.getByRole('button', { name: /sign in with email/i }));

    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument();
    expect(mocks.signInWithEmailPassword).not.toHaveBeenCalled();
  });

  it('submits normalized credentials and redirects after successful login', async () => {
    mocks.useAuth.mockReturnValue({ user: null, isAuthLoaded: true });
    mocks.signInWithEmailPassword.mockResolvedValue({ success: true });
    const history = renderLogin();

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

    await userEvent.type(screen.getByLabelText(/email/i), 'rider@example.com');
    await userEvent.type(screen.getByLabelText(/password/i), 'wrong-password');
    await userEvent.click(screen.getByRole('button', { name: /sign in with email/i }));

    expect(await screen.findByText('Invalid login credentials')).toBeInTheDocument();
    expect(history.location.pathname).toBe('/login');
  });
});
