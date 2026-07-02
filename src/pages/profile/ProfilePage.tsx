import { useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import { useHistory, useLocation } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { authService, vehicleService } from '../../services';
import type { VehicleDetails } from '../../types';
import {
  Bell,
  Camera,
  Car,
  ChevronRight,
  ChevronLeft,
  Clock3,
  Globe2,
  LogOut,
  Pencil,
  Phone,
  Settings,
  Shield,
  FileText,
  Bookmark,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { isProfileIncomplete, isProfileNameIncomplete } from '../../utils/profileCompletion';

const FIRE = 'linear-gradient(100deg, var(--fire-red), var(--fire-amber))';

interface ProfilePageLocationState {
  openEditor?: boolean;
  requireCompletion?: boolean;
}

const PLACEHOLDER_PROFILE_EMAIL_REGEX = /^phone-[^@]+@riderapp\.local$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[1-9]\d{7,14}$/;
const SETUP_STEPS = ['Contact', 'Preferences'];

const isSystemGeneratedEmail = (value?: string | null) => {
  const email = value?.trim().toLowerCase() || '';
  if (!email) return true;
  if (email.endsWith('@otp.riderapp.local')) return true;
  if (PLACEHOLDER_PROFILE_EMAIL_REGEX.test(email)) return true;
  return false;
};

const toEditableProfileName = (value?: string | null) => (isProfileNameIncomplete(value) ? '' : value || '');

// Shared input styling for the fire/white aesthetic.
const inputClass =
  'mt-1.5 w-full rounded-2xl border-2 border-black/10 bg-white px-4 py-3 font-medium text-ink outline-none transition focus:border-fire-orange focus:ring-2 focus:ring-[rgba(255,107,0,0.18)] [color-scheme:light]';
const labelClass = 'block font-display text-[11px] font-bold uppercase tracking-wide text-ink/45';

const ProfilePage = () => {
  const { user, refreshUser, logout, isAuthLoaded } = useAuth();
  const [loading, setLoading] = useState(false);
  const location = useLocation<ProfilePageLocationState>();
  const requiresProfileCompletion = Boolean(location.state?.requireCompletion) || isProfileIncomplete(user);
  const [editing, setEditing] = useState(Boolean(location.state?.openEditor) || requiresProfileCompletion);
  const [fullName, setFullName] = useState(toEditableProfileName(user?.fullName));
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone?.startsWith('temp_') || user?.phone?.startsWith('phone-') ? '' : user?.phone || '');
  const [language, setLanguage] = useState(user?.language || 'en');
  const [notifications, setNotifications] = useState<boolean>(user?.notificationPreferences ?? true);
  const [saveError, setSaveError] = useState('');
  const [setupStep, setSetupStep] = useState(0);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const history = useHistory();

  // Vehicle state
  const [vehicleMake, setVehicleMake] = useState(user?.vehicleDetails?.make || '');
  const [vehicleModel, setVehicleModel] = useState(user?.vehicleDetails?.model || '');
  const [vehicleNumber, setVehicleNumber] = useState(user?.vehicleDetails?.vehicleNumber || '');
  const [vehicleType, setVehicleType] = useState(user?.vehicleDetails?.vehicleType || '');
  const [vehicleColor, setVehicleColor] = useState(user?.vehicleDetails?.color || '');
  const [savingVehicle, setSavingVehicle] = useState(false);
  const [vehicleSaved, setVehicleSaved] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(toEditableProfileName(user.fullName));
      setEmail(isSystemGeneratedEmail(user.email) ? '' : user.email);
      setPhone(user.phone?.startsWith('temp_') || user.phone?.startsWith('phone-') ? '' : user.phone || '');
      setLanguage(user.language);
      setNotifications(user.notificationPreferences);
      setAvatarPreview(null);
      // Sync vehicle details
      if (user.vehicleDetails) {
        setVehicleMake(user.vehicleDetails.make || '');
        setVehicleModel(user.vehicleDetails.model || '');
        setVehicleNumber(user.vehicleDetails.vehicleNumber || '');
        setVehicleType(user.vehicleDetails.vehicleType || '');
        setVehicleColor(user.vehicleDetails.color || '');
      }
    }
  }, [user]);

  useEffect(() => {
    if (location.state?.openEditor) {
      setEditing(true);
    }
  }, [location.state]);

  useEffect(() => {
    if (requiresProfileCompletion) {
      setEditing(true);
    }
  }, [requiresProfileCompletion]);

  const validateRequiredProfileFields = () => {
    const normalizedFullName = fullName.trim();
    const normalizedEmail = email.trim();
    const normalizedPhone = phone.trim().replace(/[\s-]/g, '');

    if (!normalizedFullName) {
      setSaveError('Full name is required.');
      return null;
    }
    if (!EMAIL_REGEX.test(normalizedEmail)) {
      setSaveError('Enter a valid email address.');
      return null;
    }
    if (!PHONE_REGEX.test(normalizedPhone)) {
      setSaveError('Enter a valid mobile number.');
      return null;
    }

    return {
      fullName: normalizedFullName,
      email: normalizedEmail,
      phone: phone.trim(),
    };
  };

  const saveProfileDetails = async () => {
    if (!user) return false;

    const validatedProfile = validateRequiredProfileFields();
    if (!validatedProfile) return false;

    const updateResult = await authService.updateProfile(
      {
        email: validatedProfile.email,
        fullName: validatedProfile.fullName,
        phone: validatedProfile.phone,
        language,
        notificationPreferences: notifications,
      },
      user.id,
    );

    if (!updateResult.success) {
      setSaveError(updateResult.error || 'Failed to update profile.');
      return false;
    }

    await refreshUser();
    return true;
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      setSaveError('');
      setLoading(true);
      const saved = await saveProfileDetails();
      if (!saved) return;

      setEditing(false);
      if (requiresProfileCompletion) {
        history.replace('/home');
      }
    } catch (saveProfileError) {
      console.error('Failed to save profile:', saveProfileError);
      setSaveError('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSetupNext = () => {
    setSaveError('');
    if (setupStep === 0 && !validateRequiredProfileFields()) {
      return;
    }
    setSetupStep((step) => Math.min(step + 1, SETUP_STEPS.length - 1));
  };

  const handleCompleteSetup = handleSave;

  const handleAvatarButtonClick = () => {
    setSaveError('');
    avatarInputRef.current?.click();
  };

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!user) return;

    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setSaveError('Please choose an image file for your profile picture.');
      return;
    }

    const localPreviewUrl = URL.createObjectURL(file);
    setAvatarPreview(localPreviewUrl);
    setAvatarUploading(true);
    setSaveError('');

    try {
      const result = await authService.uploadProfileAvatar({ file, userId: user.id });
      if (!result.success) {
        setSaveError(result.error || 'Failed to update profile picture.');
        return;
      }
      setAvatarPreview(null);
      await refreshUser();
    } catch (avatarError) {
      console.error('Failed to update profile picture:', avatarError);
      setSaveError('Failed to update profile picture. Please try again.');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleSaveVehicle = async () => {
    if (!user) return;
    setSavingVehicle(true);
    setVehicleSaved(false);
    try {
      const vehicleDetails: VehicleDetails = {
        make: vehicleMake.trim() || undefined,
        model: vehicleModel.trim() || undefined,
        vehicleNumber: vehicleNumber.trim().toUpperCase() || undefined,
        vehicleType: vehicleType.trim() || undefined,
        color: vehicleColor.trim() || undefined,
      };
      await vehicleService.saveVehicleDetails(user.id, vehicleDetails);
      await refreshUser();
      setVehicleSaved(true);
      setTimeout(() => setVehicleSaved(false), 3000);
    } finally {
      setSavingVehicle(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    history.replace('/login');
  };

  const handleBack = () => {
    if (requiresProfileCompletion) {
      return;
    }

    if (history.length > 1) {
      history.goBack();
      return;
    }
    history.push('/home');
  };

  const kycStatus = useMemo(() => {
    const statusMap: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
      approved: {
        label: 'Verified',
        icon: <span>✓</span>,
        className: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
      },
      pending: {
        label: 'Pending',
        icon: <Clock3 size={14} />,
        className: 'bg-fire-gold/20 text-[#9a5b00] border border-fire-gold/30',
      },
      rejected: {
        label: 'Rejected',
        icon: <span>!</span>,
        className: 'bg-fire-red/10 text-fire-red border border-fire-red/20',
      },
    };

    return statusMap[user?.kycStatus || 'pending'] || statusMap.pending;
  }, [user?.kycStatus]);

  // Grainy orange aura, right-weighted — shared across page states.
  const Aura = () => (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[340px]">
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(120% 72% at 82% -10%, rgba(255,107,0,0.42) 0%, rgba(255,160,30,0.16) 46%, rgba(255,255,255,0) 74%)' }}
      />
      <div className="absolute -right-16 -top-12 h-72 w-72 rounded-full animate-aurora-1" style={{ background: 'radial-gradient(circle, rgba(255,200,50,0.66) 0%, transparent 62%)', filter: 'blur(48px)' }} />
      <div className="absolute -left-20 top-8 h-52 w-52 rounded-full animate-aurora-2" style={{ background: 'radial-gradient(circle, rgba(255,140,0,0.26) 0%, transparent 62%)', filter: 'blur(50px)' }} />
    </div>
  );

  if (!isAuthLoaded) {
    return (
      <div className="app-top-safe min-h-screen bg-white px-4 pb-20 pt-6">
        <div className="mx-auto max-w-2xl animate-pulse space-y-3">
          <div className="h-36 rounded-[18px] bg-primary-50" />
          <div className="h-48 rounded-[18px] bg-primary-50" />
          <div className="h-40 rounded-[18px] bg-primary-50" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="grid min-h-screen place-items-center bg-white font-medium text-ink/50">
        Loading profile...
      </div>
    );
  }

  const initials = user.fullName?.charAt(0)?.toUpperCase() || 'R';
  const displayEmail = isSystemGeneratedEmail(user.email) ? 'Email not added yet' : user.email;
  const avatarImageUrl = avatarPreview || user.avatarUrl;

  if (requiresProfileCompletion) {
    const currentStepLabel = SETUP_STEPS[setupStep];

    return (
      <div className="app-scroll-screen relative overflow-hidden bg-white pb-6">
        <Aura />
        <div className="relative z-10 px-4 pb-[calc(env(safe-area-inset-bottom)+112px)] pt-[calc(env(safe-area-inset-top)+24px)]">
          <div className="mx-auto max-w-2xl">
            <p className="mb-1 font-display text-xs font-bold uppercase tracking-[0.2em] text-fire-orange">Profile setup</p>
            <h1 className="app-page-title sm:text-5xl">
              Complete your profile
            </h1>
            <p className="mt-3 text-sm font-medium text-ink/55 sm:text-base">
              Finish the required details to book rides. Vehicle details are added when you publish your first ride.
            </p>
          </div>

          <div className="mx-auto mt-4 max-w-2xl space-y-3">
            <section className="app-card">
              <div className="mb-3">
                <div className="mb-3 flex items-center justify-between">
                  <p className="font-display text-sm font-bold text-ink/60">
                    Step {setupStep + 1} of {SETUP_STEPS.length}
                  </p>
                  <p className="font-display text-sm font-bold text-fire-orange">{currentStepLabel}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {SETUP_STEPS.map((step, index) => (
                    <div
                      key={step}
                      className="h-2 rounded-full"
                      style={index <= setupStep ? { background: FIRE } : { background: 'rgba(0,0,0,0.08)' }}
                    />
                  ))}
                </div>
              </div>

              {setupStep === 0 && (
                <div className="space-y-3">
                  <div className="rounded-2xl border border-fire-gold/30 bg-fire-gold/10 px-4 py-3 text-[#7a4a00]">
                    <div className="flex items-start gap-3">
                      <AlertCircle size={18} className="mt-0.5 shrink-0 text-fire-orange" />
                      <div>
                        <p className="font-display text-sm font-bold">Required to book rides</p>
                        <p className="mt-1 text-sm">
                          We need your real name, email, and mobile number before ride bookings are allowed.
                        </p>
                      </div>
                    </div>
                  </div>

                  <label className="block">
                    <span className={labelClass}>Full name</span>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      placeholder="Your full name"
                      className={inputClass}
                    />
                  </label>

                  <label className="block">
                    <span className={labelClass}>Email address</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                      className={inputClass}
                    />
                  </label>

                  <label className="block">
                    <span className={labelClass}>Mobile number</span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="+91 9999999999"
                      className={inputClass}
                    />
                  </label>
                </div>
              )}

              {setupStep === 1 && (
                <div className="space-y-3">
                  <label className="block">
                    <span className={labelClass}>Language</span>
                    <select
                      value={language}
                      onChange={(event) => setLanguage(event.target.value)}
                      className={inputClass}
                    >
                      <option value="en">English</option>
                      <option value="hi">Hindi</option>
                    </select>
                  </label>

                  <div className="flex items-center justify-between rounded-2xl border border-black/5 bg-paper px-4 py-3">
                    <div>
                      <p className="font-display text-sm font-bold text-ink">Push notifications</p>
                      <p className="text-xs font-medium text-ink/50">Ride, booking, and safety updates.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setNotifications((prev) => !prev)}
                      className="relative h-7 w-12 rounded-full transition"
                      style={notifications ? { background: FIRE } : { background: 'rgba(0,0,0,0.18)' }}
                      aria-label="Toggle notifications"
                    >
                      <span
                        className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${notifications ? 'left-[22px]' : 'left-0.5'}`}
                      />
                    </button>
                  </div>
                </div>
              )}

              {saveError && (
                <p className="mt-4 rounded-2xl border border-fire-red/20 bg-fire-red/5 px-3 py-2 text-sm font-medium text-fire-red">
                  {saveError}
                </p>
              )}

            </section>

            <div className="sticky bottom-0 z-20 -mx-4 mt-3 border-t border-black/5 bg-white/90 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 shadow-[0_-18px_40px_rgba(0,0,0,0.08)] backdrop-blur-xl">
              <div className="mx-auto flex max-w-2xl gap-3">
                {setupStep > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSaveError('');
                      setSetupStep((step) => Math.max(step - 1, 0));
                    }}
                    className="flex-1 rounded-2xl border-2 border-black/10 bg-white px-4 py-3 font-display text-sm font-bold text-ink/70 transition hover:bg-paper"
                  >
                    Back
                  </button>
                )}

                {setupStep < SETUP_STEPS.length - 1 ? (
                  <button
                    type="button"
                    onClick={handleSetupNext}
                    className="grain grain-strong relative flex-[2] overflow-hidden rounded-2xl px-4 py-3 font-display text-sm font-bold text-white shadow-glow transition active:scale-[0.98]"
                    style={{ background: FIRE }}
                  >
                    Continue
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleCompleteSetup}
                    disabled={loading}
                    className="grain grain-strong relative flex-[2] overflow-hidden rounded-2xl px-4 py-3 font-display text-sm font-bold text-white shadow-glow transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
                    style={{ background: FIRE }}
                  >
                    {loading ? 'Finishing...' : 'Finish setup'}
                  </button>
                )}
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-fire-red/15 bg-fire-red/5 px-4 py-3 font-display text-sm font-bold text-fire-red transition hover:bg-fire-red/10"
            >
              <LogOut size={18} />
              Sign out
            </button>

            <button
              onClick={() => history.push('/delete-account')}
              className="flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium text-ink/40 transition hover:text-fire-red"
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-scroll-screen app-bottom-nav-safe relative overflow-hidden bg-white">
      <Aura />
      <div className="relative z-10 px-4 pb-6 pt-[calc(env(safe-area-inset-top)+12px)]">
        <div className="mx-auto max-w-2xl">
          {/* Header */}
          <div className="mb-4 flex items-start justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBack}
                aria-label="Back"
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-black/10 bg-white/70 text-ink shadow-soft backdrop-blur-sm transition active:scale-95"
              >
                <ChevronLeft size={22} strokeWidth={2.5} />
              </button>
              <div>
                <p className="mb-0.5 font-display text-xs font-bold uppercase tracking-[0.2em] text-fire-orange">Account</p>
                <h1 className="app-page-title">Profile</h1>
              </div>
            </div>

            <button
              onClick={() => setEditing((prev) => !prev)}
              className="flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-glow transition active:scale-95"
              style={{ background: FIRE }}
              aria-label={editing ? 'Cancel editing profile' : 'Edit profile'}
            >
              <Pencil size={18} strokeWidth={2.5} />
            </button>
          </div>

          <div className="space-y-3">
            {/* Identity card */}
            <section className="app-card">
              <div className="flex items-start gap-3">
                <div className="relative">
                  <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-3xl font-display text-4xl font-extrabold text-white shadow-glow" style={{ background: FIRE }}>
                    {avatarImageUrl ? (
                      <img src={avatarImageUrl} alt={user.fullName} className="h-full w-full object-cover" />
                    ) : (
                      initials
                    )}
                  </div>
                  {editing && (
                    <>
                      <input
                        ref={avatarInputRef}
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        aria-label="Choose profile picture"
                        onChange={handleAvatarChange}
                      />
                      <button
                        type="button"
                        onClick={handleAvatarButtonClick}
                        disabled={avatarUploading}
                        className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-xl border-2 border-white bg-ink text-white shadow disabled:cursor-not-allowed disabled:opacity-70"
                        aria-label={avatarUploading ? 'Uploading profile picture' : 'Change profile picture'}
                      >
                        {avatarUploading ? (
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                        ) : (
                          <Camera size={14} />
                        )}
                      </button>
                    </>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="truncate font-display text-3xl font-extrabold tracking-tight text-ink">
                    {user.fullName}
                  </h2>
                  <p className="mt-1 max-w-full break-words text-sm font-medium text-ink/50">{displayEmail}</p>
                  <span className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 font-display text-xs font-bold ${kycStatus.className}`}>
                    {kycStatus.icon}
                    KYC: {kycStatus.label}
                  </span>
                </div>
              </div>

              <div className="mt-3 divide-y divide-black/5 overflow-hidden rounded-2xl border border-black/5 bg-paper">
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="grid h-9 w-9 place-items-center rounded-xl border border-primary-100 bg-white text-fire-orange">
                    <Phone size={16} />
                  </div>
                  <span className="font-display text-sm font-bold text-ink/70">{user.phone || 'Not provided'}</span>
                </div>
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="grid h-9 w-9 place-items-center rounded-xl border border-primary-100 bg-white text-fire-orange">
                    <Globe2 size={16} />
                  </div>
                  <span className="font-display text-sm font-bold text-ink/70">{language === 'en' ? 'English' : language}</span>
                </div>
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="grid h-9 w-9 place-items-center rounded-xl border border-primary-100 bg-white text-fire-orange">
                    <Bell size={16} />
                  </div>
                  <span className="font-display text-sm font-bold text-ink/70">
                    {notifications ? 'Notifications enabled' : 'Notifications disabled'}
                  </span>
                </div>
                {user.vehicleDetails?.vehicleNumber && (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="grid h-9 w-9 place-items-center rounded-xl border border-primary-100 bg-white text-fire-orange">
                      <Car size={16} />
                    </div>
                    <div>
                      <span className="font-display text-sm font-bold text-ink/70">
                        {[user.vehicleDetails.make, user.vehicleDetails.model].filter(Boolean).join(' ') || user.vehicleDetails.vehicleType || 'Vehicle'}
                      </span>
                      <p className="text-xs font-medium text-ink/45">{user.vehicleDetails.vehicleNumber}</p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {editing && (
              <section className="app-card">
                <h3 className="mb-4 font-display text-lg font-extrabold tracking-tight text-ink">Edit profile</h3>
                <div className="space-y-3">
                  <label className="block">
                    <span className={labelClass}>Full name</span>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      placeholder="Rider name"
                      className={inputClass}
                    />
                  </label>

                  <label className="block">
                    <span className={labelClass}>Email address</span>
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="you@example.com"
                      className={inputClass}
                    />
                  </label>

                  <label className="block">
                    <span className={labelClass}>Mobile number</span>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="+91 9999999999"
                      className={inputClass}
                    />
                  </label>

                  <label className="block">
                    <span className={labelClass}>Language</span>
                    <select
                      value={language}
                      onChange={(event) => setLanguage(event.target.value)}
                      className={inputClass}
                    >
                      <option value="en">English</option>
                      <option value="hi">Hindi</option>
                    </select>
                  </label>

                  <div className="flex items-center justify-between rounded-2xl border border-black/5 bg-paper px-4 py-3">
                    <span className="font-display text-sm font-bold text-ink/70">Push notifications</span>
                    <button
                      type="button"
                      onClick={() => setNotifications((prev) => !prev)}
                      className="relative h-7 w-12 rounded-full transition"
                      style={notifications ? { background: FIRE } : { background: 'rgba(0,0,0,0.18)' }}
                      aria-label="Toggle notifications"
                    >
                      <span
                        className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${notifications ? 'left-[22px]' : 'left-0.5'}`}
                      />
                    </button>
                  </div>

                  {saveError && (
                    <p className="rounded-2xl border border-fire-red/20 bg-fire-red/5 px-3 py-2 text-sm font-medium text-fire-red">
                      {saveError}
                    </p>
                  )}

                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="grain grain-strong relative w-full overflow-hidden rounded-2xl px-4 py-3.5 font-display font-bold text-white shadow-glow transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
                    style={{ background: FIRE }}
                  >
                    {loading ? 'Saving...' : 'Save changes'}
                  </button>
                </div>
              </section>
            )}

            {editing && !requiresProfileCompletion && (
              <section className="app-card">
                <div className="mb-4 flex items-center gap-2">
                  <Car size={18} className="text-fire-orange" />
                  <h3 className="font-display text-lg font-extrabold tracking-tight text-ink">Vehicle details</h3>
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className={labelClass}>Make</span>
                      <input
                        type="text"
                        value={vehicleMake}
                        onChange={(e) => setVehicleMake(e.target.value)}
                        placeholder="e.g. Toyota"
                        className={`${inputClass} text-sm`}
                      />
                    </label>
                    <label className="block">
                      <span className={labelClass}>Model</span>
                      <input
                        type="text"
                        value={vehicleModel}
                        onChange={(e) => setVehicleModel(e.target.value)}
                        placeholder="e.g. Camry"
                        className={`${inputClass} text-sm`}
                      />
                    </label>
                  </div>
                  <label className="block">
                    <span className={labelClass}>Vehicle number</span>
                    <input
                      type="text"
                      value={vehicleNumber}
                      onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                      placeholder="e.g. MH01AB1234"
                      className={`${inputClass} font-mono`}
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block">
                      <span className={labelClass}>Type</span>
                      <select
                        value={vehicleType}
                        onChange={(e) => setVehicleType(e.target.value)}
                        className={`${inputClass} text-sm`}
                      >
                        <option value="">Select type</option>
                        <option value="Sedan">Sedan</option>
                        <option value="SUV">SUV</option>
                        <option value="Hatchback">Hatchback</option>
                        <option value="Bike">Bike</option>
                        <option value="Auto">Auto</option>
                        <option value="Luxury">Luxury</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className={labelClass}>Color</span>
                      <input
                        type="text"
                        value={vehicleColor}
                        onChange={(e) => setVehicleColor(e.target.value)}
                        placeholder="e.g. White"
                        className={`${inputClass} text-sm`}
                      />
                    </label>
                  </div>
                  <button
                    onClick={handleSaveVehicle}
                    disabled={savingVehicle}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-primary-300 bg-primary-50 px-4 py-3 font-display text-sm font-bold text-primary-700 transition hover:bg-primary-100 disabled:opacity-60"
                  >
                    {vehicleSaved ? (
                      <><CheckCircle2 size={16} className="text-emerald-600" /><span className="text-emerald-700">Vehicle saved!</span></>
                    ) : (
                      <><Bookmark size={16} />{savingVehicle ? 'Saving...' : 'Save vehicle'}</>
                    )}
                  </button>
                </div>
              </section>
            )}

            {!requiresProfileCompletion && (
              <section className="rounded-[18px] border border-black/5 bg-white p-2 shadow-soft">
                {[
                  { onClick: () => history.push('/profile/kyc'), Icon: FileText, title: 'KYC verification', subtitle: kycStatus.label },
                  { onClick: () => history.push('/safety'), Icon: Shield, title: 'Safety center', subtitle: 'SOS and emergency tools' },
                  { onClick: () => history.push('/profile/settings'), Icon: Settings, title: 'Settings', subtitle: 'App preferences' },
                  { onClick: () => history.push('/privacy-policy'), Icon: ShieldCheck, title: 'Privacy Policy', subtitle: 'Legal and data terms' },
                ].map(({ onClick, Icon, title, subtitle }) => (
                  <button
                    key={title}
                    type="button"
                    onClick={onClick}
                    className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-paper"
                  >
                    <div className="grid h-11 w-11 place-items-center rounded-xl border border-primary-100 bg-gradient-to-br from-primary-50 to-white text-fire-orange">
                      <Icon size={18} />
                    </div>
                    <div className="flex-1">
                      <p className="font-display text-sm font-bold text-ink">{title}</p>
                      <p className="text-xs font-medium text-ink/45">{subtitle}</p>
                    </div>
                    <ChevronRight size={20} className="text-ink/25" />
                  </button>
                ))}
              </section>
            )}

            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-fire-red/15 bg-fire-red/5 px-4 py-3 font-display text-sm font-bold text-fire-red transition hover:bg-fire-red/10"
            >
              <LogOut size={18} />
              Sign out
            </button>

            <button
              onClick={() => history.push('/delete-account')}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium text-ink/35 transition hover:text-fire-red"
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
