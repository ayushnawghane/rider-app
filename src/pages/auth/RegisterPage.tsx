import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useHistory } from 'react-router';
import Aurora from '../../components/ui/Aurora';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services/auth';

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
const isValidPhone = (value: string) => /^\+?[1-9]\d{7,14}$/.test(value.trim().replace(/[\s-]/g, ''));

const labelClass = 'mb-1.5 block font-display text-[11px] font-bold uppercase tracking-wide text-ink/45';
const inputClass =
  'block w-full rounded-2xl border-2 border-black/10 bg-white px-4 py-3 font-medium text-ink placeholder:text-ink/30 outline-none transition focus:border-fire-orange focus:ring-2 focus:ring-[rgba(255,107,0,0.18)] disabled:opacity-60';

const RegisterPage = () => {
  const history = useHistory();
  const { user, isAuthLoaded } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthLoaded && user) {
      history.replace('/home');
    }
  }, [isAuthLoaded, user, history]);

  const handleRegister = async (event: FormEvent<HTMLFormElement>) => {
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

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await authService.signUpWithEmailPassword({
        fullName,
        email,
        phone,
        password,
      });

      if (!result.success) {
        setError(result.error || 'Registration failed.');
        return;
      }

      if (result.requiresEmailVerification) {
        setInfo('Account created. Please verify your email, then sign in.');
        return;
      }

      history.replace('/home');
    } catch (registerError: unknown) {
      setError(registerError instanceof Error ? registerError.message : 'Registration failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Aurora variant="sunrise" grain="strong" className="min-h-screen">
      <div className="app-top-safe flex min-h-screen w-full items-center justify-center px-5 py-10">
        <div className="w-full max-w-md animate-rise rounded-[32px] border border-white/60 bg-white/80 p-6 shadow-strong backdrop-blur-md sm:p-7">
          {/* Brand */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="/logo-mark.png" alt="Blinkcar" className="h-11 w-11 rounded-[16px] object-cover shadow-glow" />
              <div>
                <p className="font-display text-[11px] font-extrabold lowercase tracking-tight text-fire-orange">blinkcar</p>
                <h1 className="font-display text-xl font-extrabold tracking-tight text-ink">Create account</h1>
              </div>
            </div>
            <span className="rounded-full bg-fire-gold/25 px-3 py-1 font-display text-xs font-bold text-[#9a5b00]">Free</span>
          </div>

          <p className="mb-6 text-sm font-medium leading-relaxed text-ink/55">
            Register with your name, email, mobile number, and password.
          </p>

          <form onSubmit={handleRegister} className="space-y-4">
            <label className="block">
              <span className={labelClass}>Full name</span>
              <input
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Ayush Sharma"
                autoComplete="name"
                disabled={isSubmitting}
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
                disabled={isSubmitting}
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className={labelClass}>Mobile</span>
              <input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="+91 9876543210"
                autoComplete="tel"
                disabled={isSubmitting}
                className={inputClass}
              />
            </label>

            <label className="block">
              <span className={labelClass}>Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Create a password"
                autoComplete="new-password"
                disabled={isSubmitting}
                className={inputClass}
              />
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="grain grain-strong relative w-full overflow-hidden rounded-2xl py-3.5 font-display font-bold text-white shadow-glow transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
              style={{ background: 'linear-gradient(100deg, var(--fire-red), var(--fire-amber))' }}
            >
              {isSubmitting ? 'Creating account...' : 'Create account'}
            </button>
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
