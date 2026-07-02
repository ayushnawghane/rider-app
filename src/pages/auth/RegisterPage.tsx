import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useHistory } from 'react-router';
import Aurora from '../../components/ui/Aurora';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/auth';
import { phoneOtpAuthService } from '../../services/phoneOtpAuth';
import { supabase } from '../../lib/supabase';

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
const isValidPhone = (value: string) => /^\+?[1-9]\d{7,14}$/.test(value.trim().replace(/[\s-]/g, ''));
const normalizePhone = (value: string) => {
  const compact = value.trim().replace(/[\s()-]/g, '');
  return compact.startsWith('+') ? compact : `+91${compact}`;
};

const labelClass = 'mb-1.5 block font-display text-[11px] font-bold uppercase tracking-wide text-ink/45';
const inputClass =
  'block w-full rounded-2xl border-2 border-black/10 bg-white px-4 py-3 font-medium text-ink placeholder:text-ink/30 outline-none transition focus:border-fire-orange focus:ring-2 focus:ring-[rgba(255,107,0,0.18)] disabled:opacity-60';

const RegisterPage = () => {
  const history = useHistory();
  const { user, isAuthLoaded, refreshUser } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthLoaded && user) {
      history.replace('/home');
    }
  }, [isAuthLoaded, user, history]);

  // Step 1 — validate details and send a verification code to the phone. The
  // account is created by the phone-OTP flow (the only login the app supports),
  // so registration and login stay consistent and no one gets locked out.
  const handleSendCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    setError(null);
    setInfo(null);

    if (!fullName.trim()) {
      setError('Enter your full name.');
      return;
    }
    if (!isValidEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }
    if (!isValidPhone(phone)) {
      setError('Enter a valid mobile number.');
      return;
    }

    try {
      setIsSubmitting(true);
      await phoneOtpAuthService.sendOtp(normalizePhone(phone));
      setOtpSent(true);
      setInfo('We sent a verification code to your mobile number.');
    } catch (sendError: unknown) {
      setError(sendError instanceof Error ? sendError.message : 'Could not send the code. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2 — verify the code (this creates + signs in the account), then save
  // the name and email the user entered onto their new profile.
  const handleVerify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    setError(null);

    if (!/^\d{4,8}$/.test(otp.trim())) {
      setError('Enter the verification code sent to your phone.');
      return;
    }

    try {
      setIsSubmitting(true);
      await phoneOtpAuthService.verifyOtp(normalizePhone(phone), otp.trim());
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        await authService.updateProfile({ fullName: fullName.trim(), email: email.trim() }, data.user.id);
        await refreshUser();
      }
      history.replace('/home');
    } catch (verifyError: unknown) {
      setError(verifyError instanceof Error ? verifyError.message : 'Verification failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Aurora variant="sunrise" grain="strong" className="min-h-screen">
      <div className="app-top-safe flex min-h-screen w-full items-center justify-center px-5 py-10">
        <div className="w-full max-w-md animate-rise rounded-[20px] border border-white/60 bg-white/80 p-4 shadow-strong backdrop-blur-md sm:p-4">
          {/* Brand */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/logo-mark.png" alt="Blinkcar" className="h-11 w-11 rounded-[16px] object-cover shadow-glow" />
              <div>
                <p className="font-display text-[11px] font-extrabold lowercase tracking-tight text-fire-orange">blinkcar</p>
                <h1 className="app-section-title">Create account</h1>
              </div>
            </div>
            <span className="rounded-full bg-fire-gold/25 px-3 py-1 font-display text-xs font-bold text-[#9a5b00]">Free</span>
          </div>

          <p className="mb-4 text-sm font-medium leading-relaxed text-ink/55">
            {otpSent
              ? 'Enter the verification code we sent to your mobile number.'
              : 'Register with your name, email, and mobile number — we’ll verify with a one-time code.'}
          </p>

          <form onSubmit={otpSent ? handleVerify : handleSendCode} className="space-y-3">
            <label className="block">
              <span className={labelClass}>Full name</span>
              <input
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Ayush Sharma"
                autoComplete="name"
                disabled={isSubmitting || otpSent}
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className={labelClass}>Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                disabled={isSubmitting || otpSent}
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className={labelClass}>Mobile</span>
              <input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+91 9999999999"
                autoComplete="tel"
                disabled={isSubmitting || otpSent}
                className={inputClass}
              />
            </label>

            {otpSent && (
              <label className="block">
                <span className={labelClass}>Verification code</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={otp}
                  onChange={(event) => setOtp(event.target.value)}
                  placeholder="Enter the code"
                  autoComplete="one-time-code"
                  disabled={isSubmitting}
                  className={inputClass}
                />
              </label>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="grain grain-strong relative w-full overflow-hidden rounded-2xl py-3.5 font-display font-bold text-white shadow-glow transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
              style={{ background: 'linear-gradient(100deg, var(--fire-red), var(--fire-amber))' }}
            >
              {isSubmitting
                ? (otpSent ? 'Verifying...' : 'Sending code...')
                : (otpSent ? 'Create account' : 'Send code')}
            </button>

            {otpSent && (
              <button
                type="button"
                onClick={() => { setOtpSent(false); setOtp(''); setError(null); setInfo(null); }}
                disabled={isSubmitting}
                className="w-full text-center font-display text-sm font-bold text-ink/50 transition hover:text-ink"
              >
                Change details
              </button>
            )}
          </form>

          {info && (
            <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
              {info}
            </div>
          )}
          {error && (
            <div className="mt-4 rounded-2xl border border-fire-red/20 bg-fire-red/5 px-3 py-2 text-sm font-medium text-fire-red">
              {error}
            </div>
          )}

          <p className="mt-7 text-center text-sm font-medium text-ink/55">
            Already have an account?{' '}
            <button
              onClick={() => history.push('/login')}
              className="font-display font-bold text-fire-orange transition hover:brightness-95"
              type="button"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </Aurora>
  );
};

export default RegisterPage;
