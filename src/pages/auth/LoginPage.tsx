import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useHistory } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { phoneOtpAuthService } from '../../services/phoneOtpAuth';
import {
  socialAuthService,
  isAppleSignInAvailable,
  isGoogleSignInAvailable,
  type SocialProvider,
} from '../../services/socialAuth';

// Phone OTP is temporarily hidden — flip to `true` to bring it back.
const SHOW_PHONE_OTP = false;

const isValidPhone = (value: string) => /^\+?[1-9]\d{7,14}$/.test(value.trim().replace(/[\s-]/g, ''));
const normalizePhone = (value: string) => {
  const compact = value.trim().replace(/[\s()-]/g, '');
  return compact.startsWith('+') ? compact : `+${compact}`;
};

const LoginPage = () => {
  const history = useHistory();
  const { user, isAuthLoaded } = useAuth();
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [socialProvider, setSocialProvider] = useState<SocialProvider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const handleSocialLogin = async (provider: SocialProvider) => {
    if (isSubmitting || socialProvider) return;

    setError(null);
    setInfo(null);

    try {
      setSocialProvider(provider);
      const result =
        provider === 'google'
          ? await socialAuthService.signInWithGoogle()
          : await socialAuthService.signInWithApple();

      if (result.cancelled) {
        return;
      }

      if (!result.success) {
        setError(result.error || 'Sign-in failed. Please try again.');
        return;
      }

      // On native the session is set synchronously; the auth listener will redirect.
      // On web the browser has already navigated to the provider.
      history.replace('/home');
    } catch (socialError: unknown) {
      setError(socialError instanceof Error ? socialError.message : 'Sign-in failed.');
    } finally {
      setSocialProvider(null);
    }
  };

  useEffect(() => {
    if (isAuthLoaded && user) {
      history.replace('/home');
    }
  }, [isAuthLoaded, user, history]);

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
              {SHOW_PHONE_OTP
                ? 'Sign in with your mobile number or a social account.'
                : 'Sign in with your Google or Apple account.'}
            </p>

            {SHOW_PHONE_OTP && (
              <>
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

                <div className="my-6 flex items-center gap-3">
                  <span className="h-px flex-1 bg-gray-200" />
                  <span className="text-xs font-medium uppercase tracking-wide text-gray-400">or continue with</span>
                  <span className="h-px flex-1 bg-gray-200" />
                </div>
              </>
            )}

            <div className="space-y-3">
              {isGoogleSignInAvailable && (
                <button
                  type="button"
                  onClick={() => handleSocialLogin('google')}
                  disabled={isSubmitting || socialProvider !== null}
                  className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z" />
                  </svg>
                  {socialProvider === 'google' ? 'Connecting…' : 'Continue with Google'}
                </button>
              )}

              {isAppleSignInAvailable && (
                <button
                  type="button"
                  onClick={() => handleSocialLogin('apple')}
                  disabled={isSubmitting || socialProvider !== null}
                  className="flex w-full items-center justify-center gap-3 rounded-xl border border-gray-900 bg-gray-900 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M16.36 12.78c.02 2.4 2.1 3.2 2.12 3.21-.02.06-.33 1.14-1.1 2.25-.66.96-1.35 1.92-2.43 1.94-1.06.02-1.4-.63-2.62-.63-1.21 0-1.59.61-2.6.65-1.04.04-1.84-1.04-2.51-2-1.36-1.97-2.4-5.56-1-7.99.69-1.2 1.93-1.96 3.28-1.98 1.02-.02 1.99.69 2.62.69.63 0 1.8-.85 3.04-.73.52.02 1.98.21 2.91 1.58-.07.05-1.74 1.02-1.72 3.04M14.4 5.4c.56-.68.94-1.62.84-2.56-.81.03-1.79.54-2.37 1.22-.52.6-.98 1.56-.86 2.48.9.07 1.83-.46 2.39-1.14" />
                  </svg>
                  {socialProvider === 'apple' ? 'Connecting…' : 'Continue with Apple'}
                </button>
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
          </div>
        </div>
    </div>
  );
};

export default LoginPage;
