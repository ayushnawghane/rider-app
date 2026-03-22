import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useHistory } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { phoneOtpAuthService } from '../../services/phoneOtpAuth';
import { authService } from '../../services/auth';
import { GoogleLogin, GoogleOAuthProvider } from '@react-oauth/google';

const normalizePhone = (input: string, countryCode: string) => {
  const digits = input.replace(/\D/g, '');
  if (!digits) return '';
  if (input.trim().startsWith('+')) return `+${digits}`;
  if (digits.startsWith(countryCode) && digits.length > 10) return `+${digits}`;
  if (digits.length === 10) return `+${countryCode}${digits}`;
  return `+${digits}`;
};

const LoginPage = () => {
  const history = useHistory();
  const { user, isAuthLoaded } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [normalizedPhone, setNormalizedPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const countryCode = useMemo(
    () => String(import.meta.env.VITE_PHONE_COUNTRY_CODE || '91').replace(/\D/g, '') || '91',
    [],
  );

  useEffect(() => {
    if (isAuthLoaded && user) {
      history.replace('/home');
    }
  }, [isAuthLoaded, user, history]);

  const handleSendOtp = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setInfo(null);
    const phone = normalizePhone(phoneNumber, countryCode);
    if (!/^\+\d{10,15}$/.test(phone)) {
      setError('Enter a valid mobile number including country code.');
      return;
    }

    try {
      setIsSubmitting(true);
      const sendResult = await phoneOtpAuthService.sendOtp(phone);
      setNormalizedPhone(phone);
      setOtpSent(true);
      const requestSuffix = sendResult.requestId ? ` (request: ${sendResult.requestId})` : '';
      setInfo(`${sendResult.message || `OTP sent to ${phone}`}${requestSuffix}`);
    } catch (sendError: unknown) {
      const message =
        sendError instanceof Error
          ? sendError.message
          : 'Failed to send OTP. Check Supabase SMS provider configuration.';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (isSubmitting) {
      return;
    }
    setError(null);
    setInfo(null);

    if (isAuthLoaded && user) {
      history.replace('/home');
      return;
    }

    const phone = normalizedPhone || normalizePhone(phoneNumber, countryCode);
    if (!/^\+\d{10,15}$/.test(phone)) {
      setError('Enter a valid mobile number.');
      return;
    }
    if (!otpCode.trim()) {
      setError('Enter the OTP code.');
      return;
    }

    try {
      setIsSubmitting(true);
      await phoneOtpAuthService.verifyOtp(phone, otpCode.trim());
      history.replace('/home');
    } catch (verifyOtpError: unknown) {
      const message =
        verifyOtpError instanceof Error ? verifyOtpError.message : 'OTP verification failed';
      setError(message);
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
      await authService.signInWithGoogle(credentialResponse.credential);
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
              Continue to your account and access rides, bookings, and real-time trip updates.
            </p>

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

            <div className="hidden">
              <form onSubmit={handleSendOtp}>
                <label className="block text-sm font-medium text-gray-700">
                  Mobile number
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(event) => setPhoneNumber(event.target.value)}
                    placeholder="+91 9876543210"
                    disabled={isSubmitting}
                    className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
                  />
                </label>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-4 flex w-full justify-center rounded-md border border-transparent bg-primary-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 disabled:opacity-50"
                >
                  {isSubmitting ? 'Sending OTP...' : otpSent ? 'Resend OTP' : 'Send OTP'}
                </button>
              </form>

              {otpSent && (
                <>
                  <label className="mt-4 block text-sm font-medium text-gray-700">
                    OTP code
                    <input
                      type="text"
                      inputMode="numeric"
                      value={otpCode}
                      onChange={(event) => setOtpCode(event.target.value)}
                      placeholder="Enter OTP"
                      disabled={isSubmitting}
                      className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500 sm:text-sm"
                    />
                  </label>

                  <button
                    onClick={handleVerifyOtp}
                    disabled={isSubmitting}
                    type="button"
                    className="mt-4 flex w-full justify-center rounded-md border border-transparent bg-gray-900 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Verifying...' : 'Verify OTP'}
                  </button>
                </>
              )}
            </div>

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
