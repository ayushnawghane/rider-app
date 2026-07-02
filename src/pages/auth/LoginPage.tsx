import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useHistory } from 'react-router';
import Aurora from '../../components/ui/Aurora';
import { useAuth } from '../../context/AuthContext';
import { phoneOtpAuthService } from '../../services/phoneOtpAuth';
import {
  socialAuthService,
  isAppleSignInAvailable,
  isGoogleSignInAvailable,
  type SocialProvider,
} from '../../services/socialAuth';

const SHOW_PHONE_OTP = true;

const INDIA_DIAL_CODE = '+91';
const getPhoneDigits = (value: string) => value.replace(/\D/g, '');
const toIndianPhoneNumber = (value: string) => `${INDIA_DIAL_CODE}${getPhoneDigits(value)}`;
const isValidPhone = (value: string) => getPhoneDigits(value).length === 10;
const normalizePhone = (value: string) => {
  const compact = value.trim().replace(/[\s()-]/g, '');
  if (getPhoneDigits(compact).length === 10) return toIndianPhoneNumber(compact);
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
      setError('Enter a valid 10-digit mobile number.');
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
      setError('Enter a valid 10-digit mobile number.');
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

  /* ── Aurora Mist variant — soft grainy orange aura on white + centered card ── */
  return (
    <Aurora variant="sunrise" grain="strong" className="min-h-screen">
      <div className="flex min-h-screen w-full items-center justify-center px-5 py-10 app-top-safe">
        <div className="w-full max-w-sm animate-rise rounded-[20px] border border-white/60 bg-white/35 p-4 shadow-strong backdrop-blur-sm sm:p-5">
          {/* Brand — centered */}
          <div className="mb-6 flex flex-col items-center text-center">
            <img
              src="/logo-mark.png"
              alt="Blinkcar"
              className="mb-3 h-14 w-14 rounded-[20px] object-cover shadow-glow"
            />
            <span className="font-display text-sm font-extrabold lowercase tracking-tight text-fire-orange">
              blinkcar
            </span>
            <h1 className="mt-3 font-display text-[3.15rem] font-extrabold uppercase leading-[0.86] tracking-tight text-ink">
              Welcome<br /><span className="text-fire">back.</span>
            </h1>
            <p className="mt-2 text-sm font-medium leading-relaxed text-ink/55">
              {SHOW_PHONE_OTP
                ? 'Sign in with your mobile number or a social account.'
                : 'Sign in with your Google or Apple account.'}
            </p>
          </div>

          {SHOW_PHONE_OTP && (
            <>
              <form onSubmit={isOtpSent ? handleVerifyOtp : handleSendOtp} className="space-y-4">
                <label className="block">
                  <span className="mb-1.5 block font-display text-[11px] font-bold uppercase tracking-wide text-ink/45">
                    Mobile number
                  </span>
                  <div className="flex overflow-hidden rounded-2xl border border-black/10 bg-paper transition focus-within:border-fire-orange focus-within:ring-2 focus-within:ring-[rgba(255,107,0,0.22)]">
                    <span className="flex items-center border-r border-black/10 px-4 font-display text-sm font-bold text-ink">
                      {INDIA_DIAL_CODE}
                    </span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(event) => {
                        setPhone(getPhoneDigits(event.target.value).slice(0, 10));
                        setIsOtpSent(false);
                        setOtp('');
                      }}
                      placeholder="9999999999"
                      autoComplete="tel-national"
                      inputMode="numeric"
                      maxLength={10}
                      disabled={isSubmitting}
                      className="block min-w-0 flex-1 border-0 bg-transparent px-4 py-3.5 text-ink placeholder:text-ink/30 focus:outline-none focus:ring-0"
                    />
                  </div>
                </label>

                {isOtpSent && (
                  <label className="block">
                    <span className="mb-1.5 block font-display text-[11px] font-bold uppercase tracking-wide text-ink/45">
                      Verification code
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={otp}
                      onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 8))}
                      placeholder="123456"
                      autoComplete="one-time-code"
                      disabled={isSubmitting}
                      className="block w-full rounded-2xl border border-black/10 bg-paper px-4 py-3.5 text-center font-display text-lg font-bold tracking-[0.3em] text-ink placeholder:tracking-normal placeholder:font-sans placeholder:text-ink/30 focus:border-fire-orange focus:outline-none focus:ring-2 focus:ring-[rgba(255,107,0,0.22)]"
                    />
                  </label>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-2xl py-4 font-display text-base font-bold tracking-tight text-white shadow-glow transition-all duration-200 hover:shadow-glow-lg active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                  style={{ background: 'linear-gradient(100deg, var(--fire-red), var(--fire-amber))' }}
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
                    className="w-full rounded-2xl border-2 border-primary-200 bg-white py-3.5 font-display text-sm font-bold text-primary-700 transition hover:bg-primary-50 disabled:cursor-not-allowed disabled:opacity-60"
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
                    className="w-full py-2 font-display text-sm font-bold text-ink/40 transition hover:text-ink/70 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Change mobile number
                  </button>
                )}
              </form>

              <div className="my-6 flex items-center gap-3">
                <span className="h-px flex-1 bg-black/10" />
                <span className="font-display text-[11px] font-bold uppercase tracking-wider text-ink/35">or continue with</span>
                <span className="h-px flex-1 bg-black/10" />
              </div>
            </>
          )}

          <div className="space-y-3">
            {isGoogleSignInAvailable && (
              <button
                type="button"
                onClick={() => handleSocialLogin('google')}
                disabled={isSubmitting || socialProvider !== null}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border border-black/10 bg-white py-3.5 font-display text-sm font-bold text-ink transition hover:bg-paper active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
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
                className="flex w-full items-center justify-center gap-3 rounded-2xl border border-black/10 bg-white py-3.5 font-display text-sm font-bold text-ink transition hover:bg-paper active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M16.36 12.78c.02 2.4 2.1 3.2 2.12 3.21-.02.06-.33 1.14-1.1 2.25-.66.96-1.35 1.92-2.43 1.94-1.06.02-1.4-.63-2.62-.63-1.21 0-1.59.61-2.6.65-1.04.04-1.84-1.04-2.51-2-1.36-1.97-2.4-5.56-1-7.99.69-1.2 1.93-1.96 3.28-1.98 1.02-.02 1.99.69 2.62.69.63 0 1.8-.85 3.04-.73.52.02 1.98.21 2.91 1.58-.07.05-1.74 1.02-1.72 3.04M14.4 5.4c.56-.68.94-1.62.84-2.56-.81.03-1.79.54-2.37 1.22-.52.6-.98 1.56-.86 2.48.9.07 1.83-.46 2.39-1.14" />
                </svg>
                {socialProvider === 'apple' ? 'Connecting…' : 'Continue with Apple'}
              </button>
            )}
          </div>

          {info && (
            <div className="mt-4 rounded-2xl border border-success-200 bg-success-50 px-4 py-3 text-sm font-medium text-success-700">
              {info}
            </div>
          )}
          {error && (
            <div className="mt-4 rounded-2xl border border-danger-200 bg-danger-50 px-4 py-3 text-sm font-medium text-danger-700">
              {error}
            </div>
          )}

          <p className="mt-6 text-center text-sm font-medium text-ink/55">
            New to Blinkcar?{' '}
            <button
              type="button"
              onClick={() => history.push('/register')}
              className="font-display font-bold text-fire-orange transition hover:brightness-110"
            >
              Create account
            </button>
          </p>
        </div>
      </div>
    </Aurora>
  );
};

export default LoginPage;
