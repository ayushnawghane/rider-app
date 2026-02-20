import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useHistory } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { phoneOtpAuthService } from '../../services/phoneOtpAuth';

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

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', padding: '24px 16px' }}>
      <div style={{ maxWidth: 380, margin: '0 auto', paddingTop: 48 }}>
        <h1 style={{ fontSize: 32, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>
          Sign in with Mobile
        </h1>
        <p style={{ color: '#64748b', marginBottom: 24 }}>
          Enter your phone number to receive an OTP.
        </p>

        <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <form onSubmit={handleSendOtp}>
            <label style={{ fontSize: 14, color: '#334155', fontWeight: 600 }}>
              Mobile number
              <input
                type="tel"
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                placeholder="+91 9876543210"
                disabled={isSubmitting}
                style={{
                  width: '100%',
                  marginTop: 8,
                  padding: '12px 14px',
                  borderRadius: 10,
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  color: '#0f172a',
                }}
              />
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                width: '100%',
                marginTop: 16,
                padding: '13px 14px',
                border: 0,
                borderRadius: 12,
                background: '#f97316',
                color: '#fff',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {isSubmitting ? 'Sending OTP...' : otpSent ? 'Resend OTP' : 'Send OTP'}
            </button>
          </form>

          {otpSent && (
            <>
              <label style={{ fontSize: 14, color: '#334155', fontWeight: 600, display: 'block', marginTop: 16 }}>
                OTP code
                <input
                  type="text"
                  inputMode="numeric"
                  value={otpCode}
                  onChange={(event) => setOtpCode(event.target.value)}
                  placeholder="Enter OTP"
                  disabled={isSubmitting}
                  style={{
                    width: '100%',
                    marginTop: 8,
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: '1px solid #cbd5e1',
                    background: '#fff',
                    color: '#0f172a',
                  }}
                />
              </label>

              <button
                onClick={handleVerifyOtp}
                disabled={isSubmitting}
                type="button"
                style={{
                  width: '100%',
                  marginTop: 12,
                  padding: '13px 14px',
                  border: 0,
                  borderRadius: 12,
                  background: '#0f172a',
                  color: '#fff',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {isSubmitting ? 'Verifying...' : 'Verify OTP'}
              </button>
            </>
          )}

          {info && <p style={{ color: '#16a34a', fontSize: 13, marginTop: 12 }}>{info}</p>}
          {error && <p style={{ color: '#dc2626', fontSize: 13, marginTop: 12 }}>{error}</p>}
        </div>

        <p style={{ textAlign: 'center', marginTop: 16, color: '#64748b' }}>
          New here?{' '}
          <button
            onClick={() => history.push('/register')}
            style={{ border: 0, background: 'none', color: '#f97316', fontWeight: 700, cursor: 'pointer' }}
          >
            Create account
          </button>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
