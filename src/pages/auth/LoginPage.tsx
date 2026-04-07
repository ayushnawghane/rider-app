import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useHistory } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/auth';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const LoginPage = () => {
  const history = useHistory();
  const { user, isAuthLoaded } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthLoaded && user) {
      history.replace('/home');
    }
  }, [isAuthLoaded, user, history]);

  const handleEmailLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    setError(null);

    if (!isValidEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }

    if (!password) {
      setError('Enter your password.');
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await authService.signInWithEmailPassword(email, password);

      if (!result.success) {
        setError(result.error || 'Login failed.');
        return;
      }

      history.replace('/home');
    } catch (loginError: unknown) {
      setError(loginError instanceof Error ? loginError.message : 'Login failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      setError(null);
      const result = await authService.signInWithGoogle(credentialResponse.credential);

      if (!result.success) {
        setError(result.error || 'Google Sign-In failed');
        return;
      }

      history.replace('/home');
    } catch (err: unknown) {
      console.error('Google Sign-In Error:', err);
      setError(err instanceof Error ? err.message : 'Google Sign-In failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <div className="relative min-h-screen overflow-hidden bg-gray-50 px-4 py-10 sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -left-20 top-16 h-72 w-72 rounded-full bg-primary-200/50 blur-3xl" />
          <div className="absolute -right-20 bottom-8 h-72 w-72 rounded-full bg-orange-100/70 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,237,213,0.55),rgba(249,250,251,0.92)_45%,rgba(249,250,251,1))]" />
        </div>

        <div className="relative mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md items-center">
          <div className="w-full rounded-3xl border border-primary-100/80 bg-white p-6 shadow-strong sm:p-8">
            <div className="mb-7 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src="/logo.png"
                  alt="Blinkcar"
                  className="h-11 w-11 rounded-xl border border-primary-100 bg-white object-contain p-1"
                />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary-600">Blinkcar</p>
                  <h1 className="text-xl font-bold tracking-tight text-gray-900">Sign in</h1>
                </div>
              </div>
              <span className="rounded-full bg-primary-100 px-3 py-1 text-xs font-semibold text-primary-700">Secure</span>
            </div>

            <p className="mb-6 text-sm leading-relaxed text-gray-600">
              Sign in with your email and password, or keep using Google if you prefer.
            </p>

            <form onSubmit={handleEmailLogin} className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">
                Email
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  disabled={isSubmitting}
                  className="mt-1 block w-full rounded-xl border border-gray-300 bg-white px-4 py-3 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                />
              </label>

              <label className="block text-sm font-medium text-gray-700">
                Password
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={isSubmitting}
                  className="mt-1 block w-full rounded-xl border border-gray-300 bg-white px-4 py-3 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                />
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Signing in...' : 'Sign in with email'}
              </button>
            </form>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">or</span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 shadow-soft sm:p-5">
              <p className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                Continue with Google
              </p>
              <div className="flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setError('Google Sign-In failed. Please try again.')}
                  useOneTap
                />
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </div>
            )}

            <p className="mt-7 text-center text-sm text-gray-600">
              New here?{' '}
              <button
                onClick={() => history.push('/register')}
                className="font-semibold text-primary-600 transition-colors hover:text-primary-500"
                type="button"
              >
                Create account
              </button>
            </p>
          </div>
        </div>
      </div>
    </GoogleOAuthProvider>
  );
};

export default LoginPage;
