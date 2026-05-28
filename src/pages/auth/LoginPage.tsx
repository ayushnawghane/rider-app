import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useHistory } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/auth';
import { phoneOtpAuthService } from '../../services/phoneOtpAuth';

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
const isValidPhone = (value: string) => /^\+?[1-9]\d{7,14}$/.test(value.trim().replace(/[\s-]/g, ''));
const normalizePhone = (value: string) => {
  const compact = value.trim().replace(/[\s()-]/g, '');
  return compact.startsWith('+') ? compact : `+${compact}`;
};

const LoginPage = () => {
  const history = useHistory();
  const { user, isAuthLoaded } = useAuth();
  const [loginMethod, setLoginMethod] = useState<'phone' | 'email'>('phone');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthLoaded && user) {
      history.replace('/home');
    }
  }, [isAuthLoaded, user, history]);

  const handleEmailLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    setError(null);
    setInfo(null);

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

  const handleSendOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    setError(null);
    setInfo(null);

    if (!isValidPhone(phone)) {
      setError('Enter a valid mobile number with country code.');
      return;
    }

    try {
      setIsSubmitting(true);
      await phoneOtpAuthService.sendOtp(normalizePhone(phone));
      setIsOtpSent(true);
      setInfo('Verification code sent.');
    } catch (otpError: unknown) {
      setError(otpError instanceof Error ? otpError.message : 'Could not send verification code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;

    setError(null);
    setInfo(null);

    if (!isValidPhone(phone)) {
      setError('Enter a valid mobile number with country code.');
      return;
    }

    if (!/^\d{4,8}$/.test(otp.trim())) {
      setError('Enter the verification code sent to your phone.');
      return;
    }

    try {
      setIsSubmitting(true);
      await phoneOtpAuthService.verifyOtp(normalizePhone(phone), otp);
      history.replace('/home');
    } catch (otpError: unknown) {
      setError(otpError instanceof Error ? otpError.message : 'Verification failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
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
              Sign in with your mobile number or email.
            </p>

            <div className="mb-5 grid grid-cols-2 rounded-xl bg-gray-100 p-1">
              <button
                type="button"
                onClick={() => {
                  setLoginMethod('phone');
                  setError(null);
                  setInfo(null);
                }}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  loginMethod === 'phone'
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Mobile OTP
              </button>
              <button
                type="button"
                onClick={() => {
                  setLoginMethod('email');
                  setError(null);
                  setInfo(null);
                }}
                className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                  loginMethod === 'email'
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Email
              </button>
            </div>

            {loginMethod === 'phone' ? (
              <form onSubmit={isOtpSent ? handleVerifyOtp : handleSendOtp} className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">
                  Mobile
                  <input
                    type="tel"
                    value={phone}
                    onChange={(event) => {
                      setPhone(event.target.value);
                      setIsOtpSent(false);
                      setOtp('');
                    }}
                    placeholder="+91 9876543210"
                    autoComplete="tel"
                    disabled={isSubmitting}
                    className="mt-1 block w-full rounded-xl border border-gray-300 bg-white px-4 py-3 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                  />
                </label>

                {isOtpSent && (
                  <label className="block text-sm font-medium text-gray-700">
                    Verification code
                    <input
                      type="text"
                      inputMode="numeric"
                      value={otp}
                      onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 8))}
                      placeholder="123456"
                      autoComplete="one-time-code"
                      disabled={isSubmitting}
                      className="mt-1 block w-full rounded-xl border border-gray-300 bg-white px-4 py-3 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-200"
                    />
                  </label>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? 'Please wait...' : isOtpSent ? 'Verify code' : 'Send code'}
                </button>

                {isOtpSent && (
                  <button
                    type="button"
                    onClick={async () => {
                      if (isSubmitting) return;
                      setOtp('');
                      setError(null);
                      setInfo(null);
                      try {
                        setIsSubmitting(true);
                        await phoneOtpAuthService.sendOtp(normalizePhone(phone));
                        setInfo('Verification code sent again.');
                      } catch (otpError: unknown) {
                        setError(otpError instanceof Error ? otpError.message : 'Could not resend verification code.');
                      } finally {
                        setIsSubmitting(false);
                      }
                    }}
                    disabled={isSubmitting}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Resend code
                  </button>
                )}

                {isOtpSent && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOtpSent(false);
                      setOtp('');
                      setInfo(null);
                      setError(null);
                    }}
                    disabled={isSubmitting}
                    className="w-full px-4 py-2 text-sm font-semibold text-gray-500 transition hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Change mobile number
                  </button>
                )}
              </form>
            ) : (
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
            )}

            {info && (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {info}
              </div>
            )}
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
  );
};

export default LoginPage;
