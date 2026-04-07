import { useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { authService, vehicleService } from '../../services';
import type { VehicleDetails } from '../../types';
import {
  ArrowLeft,
  Bell,
  Camera,
  Car,
  ChevronRight,
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
  AlertCircle,
} from 'lucide-react';
import { isProfileIncomplete } from '../../utils/profileCompletion';

interface ProfilePageLocationState {
  openEditor?: boolean;
  requireCompletion?: boolean;
}

const PLACEHOLDER_PROFILE_EMAIL_REGEX = /^phone-[^@]+@riderapp\.local$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?[1-9]\d{7,14}$/;

const isSystemGeneratedEmail = (value?: string | null) => {
  const email = value?.trim().toLowerCase() || '';
  if (!email) return true;
  if (email.endsWith('@otp.riderapp.local')) return true;
  if (PLACEHOLDER_PROFILE_EMAIL_REGEX.test(email)) return true;
  return false;
};

const ProfilePage = () => {
  const { user, refreshUser, logout, isAuthLoaded } = useAuth();
  const [loading, setLoading] = useState(false);
  const location = useLocation<ProfilePageLocationState>();
  const requiresProfileCompletion = Boolean(location.state?.requireCompletion) || isProfileIncomplete(user);
  const [editing, setEditing] = useState(Boolean(location.state?.openEditor) || requiresProfileCompletion);
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone?.startsWith('temp_') || user?.phone?.startsWith('phone-') ? '' : user?.phone || '');
  const [language, setLanguage] = useState(user?.language || 'en');
  const [notifications, setNotifications] = useState<boolean>(user?.notificationPreferences || true);
  const [saveError, setSaveError] = useState('');
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
      setFullName(user.fullName);
      setEmail(isSystemGeneratedEmail(user.email) ? '' : user.email);
      setPhone(user.phone?.startsWith('temp_') || user.phone?.startsWith('phone-') ? '' : user.phone || '');
      setLanguage(user.language);
      setNotifications(user.notificationPreferences);
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

  const handleSave = async () => {
    if (!user) return;

    try {
      setSaveError('');
      setLoading(true);
      const normalizedFullName = fullName.trim();
      const normalizedEmail = email.trim();

      if (!normalizedFullName) {
        setSaveError('Full name is required.');
        return;
      }
      if (!EMAIL_REGEX.test(normalizedEmail)) {
        setSaveError('Enter a valid email address.');
        return;
      }
      if (!PHONE_REGEX.test(phone.trim().replace(/[\s-]/g, ''))) {
        setSaveError('Enter a valid mobile number.');
        return;
      }

      const updateResult = await authService.updateProfile(
        {
          email: normalizedEmail,
          fullName: normalizedFullName,
          phone: phone.trim(),
          language,
          notificationPreferences: notifications,
        },
        user.id,
      );

      if (!updateResult.success) {
        setSaveError(updateResult.error || 'Failed to update profile.');
        return;
      }

      await refreshUser();
      setEditing(false);
    } catch (saveProfileError) {
      console.error('Failed to save profile:', saveProfileError);
      setSaveError('Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
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
        className: 'bg-amber-50 text-amber-700 border border-amber-100',
      },
      rejected: {
        label: 'Rejected',
        icon: <span>!</span>,
        className: 'bg-rose-50 text-rose-700 border border-rose-100',
      },
    };

    return statusMap[user?.kycStatus || 'pending'] || statusMap.pending;
  }, [user?.kycStatus]);

  if (!isAuthLoaded) {
    return (
      <div className="min-h-screen bg-slate-100 px-4 pt-12 pb-20">
        <div className="mx-auto max-w-2xl animate-pulse space-y-4">
          <div className="h-36 rounded-3xl bg-slate-200" />
          <div className="h-48 rounded-3xl bg-slate-200" />
          <div className="h-40 rounded-3xl bg-slate-200" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-100 text-slate-500">
        Loading profile...
      </div>
    );
  }

  const initials = user.fullName?.charAt(0)?.toUpperCase() || 'R';
  const displayEmail = isSystemGeneratedEmail(user.email) ? 'Email not added yet' : user.email;

  return (
    <div className="app-scroll-screen app-bottom-nav-safe bg-slate-100">
      <div className="bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 px-4 pb-20 pt-12">
        <div className="mx-auto max-w-2xl">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBack}
                disabled={requiresProfileCompletion}
                className="grid h-12 w-12 place-items-center rounded-2xl border border-white/35 bg-white/20 text-white backdrop-blur"
                aria-label="Go back"
              >
                <ArrowLeft size={24} />
              </button>
              <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
                Profile
              </h1>
            </div>

            <button
              onClick={() => setEditing((prev) => (requiresProfileCompletion ? true : !prev))}
              className="grid h-12 w-12 place-items-center rounded-2xl border border-white/35 bg-white/20 text-white backdrop-blur"
              aria-label={editing ? 'Cancel editing profile' : 'Edit profile'}
            >
              <Pencil size={20} />
            </button>
          </div>

          <p className="text-base text-white/90 sm:text-lg">
            Manage your account details and ride preferences
          </p>
        </div>
      </div>

      <div className="mx-auto -mt-12 max-w-2xl space-y-4 px-4">
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          {requiresProfileCompletion && (
            <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
              <div className="flex items-start gap-3">
                <AlertCircle size={18} className="mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold">Complete your profile to continue</p>
                  <p className="mt-1 text-sm text-amber-800">
                    Your Google account is signed in, but we still need your missing contact details like mobile number.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-start gap-4">
            <div className="relative">
              <div className="grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-4xl font-bold text-white overflow-hidden">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.fullName} className="h-full w-full object-cover" />
                ) : (
                  initials
                )}
              </div>
              {editing && (
                <button
                  type="button"
                  className="absolute -bottom-1 -right-1 grid h-8 w-8 place-items-center rounded-xl bg-indigo-600 text-white shadow"
                  aria-label="Change profile picture"
                >
                  <Camera size={14} />
                </button>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="truncate text-4xl font-bold text-slate-800 sm:text-5xl">
                {user.fullName}
              </h2>
              <p className="mt-1 max-w-full break-words text-lg text-slate-500 sm:text-xl">{displayEmail}</p>
              <span className={`mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ${kycStatus.className}`}>
                {kycStatus.icon}
                KYC: {kycStatus.label}
              </span>
            </div>
          </div>

          <div className="mt-5 divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-slate-50">
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-slate-200 text-slate-700">
                <Phone size={16} />
              </div>
              <span className="text-sm font-medium text-slate-700">{user.phone || 'Not provided'}</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-slate-200 text-slate-700">
                <Globe2 size={16} />
              </div>
              <span className="text-sm font-medium text-slate-700">{language === 'en' ? 'English' : language}</span>
            </div>
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-slate-200 text-slate-700">
                <Bell size={16} />
              </div>
              <span className="text-sm font-medium text-slate-700">
                {notifications ? 'Notifications enabled' : 'Notifications disabled'}
              </span>
            </div>
            {user.vehicleDetails?.vehicleNumber && (
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="grid h-9 w-9 place-items-center rounded-xl bg-orange-100 text-orange-700">
                  <Car size={16} />
                </div>
                <div>
                  <span className="text-sm font-medium text-slate-700">
                    {[user.vehicleDetails.make, user.vehicleDetails.model].filter(Boolean).join(' ') || user.vehicleDetails.vehicleType || 'Vehicle'}
                  </span>
                  <p className="text-xs text-slate-500">{user.vehicleDetails.vehicleNumber}</p>
                </div>
              </div>
            )}
          </div>
        </section>

        {editing && (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-4 text-base font-semibold text-slate-800">Edit profile</h3>
            <div className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-slate-600">Full name</span>
                <input
                  type="text"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Rider name"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-600">Email address</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-600">Mobile number</span>
                <input
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="+91 9876543210"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                />
              </label>

              <label className="block">
                <span className="text-sm font-medium text-slate-600">Language</span>
                <select
                  value={language}
                  onChange={(event) => setLanguage(event.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                >
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                </select>
              </label>

              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                <span className="text-sm font-medium text-slate-700">Push notifications</span>
                <button
                  type="button"
                  onClick={() => setNotifications((prev) => !prev)}
                  className={`relative h-7 w-12 rounded-full transition ${notifications ? 'bg-orange-500' : 'bg-slate-300'}`}
                  aria-label="Toggle notifications"
                >
                  <span
                    className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${notifications ? 'left-[22px]' : 'left-0.5'}`}
                  />
                </button>
              </div>

              {saveError && (
                <p className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  {saveError}
                </p>
              )}

              <button
                onClick={handleSave}
                disabled={loading}
                className="w-full rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </section>
        )}

        {/* Vehicle Details Section (always shown when editing) */}
        {editing && (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Car size={18} className="text-orange-500" />
              <h3 className="text-base font-semibold text-slate-800">Vehicle Details</h3>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-medium text-slate-600">Make</span>
                  <input
                    type="text"
                    value={vehicleMake}
                    onChange={(e) => setVehicleMake(e.target.value)}
                    placeholder="e.g. Toyota"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800 text-sm outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                  />
                </label>
                <label className="block">
                  <span className="text-xs font-medium text-slate-600">Model</span>
                  <input
                    type="text"
                    value={vehicleModel}
                    onChange={(e) => setVehicleModel(e.target.value)}
                    placeholder="e.g. Camry"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800 text-sm outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                  />
                </label>
              </div>
              <label className="block">
                <span className="text-xs font-medium text-slate-600">Vehicle Number</span>
                <input
                  type="text"
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. MH01AB1234"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800 outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100 font-mono"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs font-medium text-slate-600">Type</span>
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800 text-sm outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
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
                  <span className="text-xs font-medium text-slate-600">Color</span>
                  <input
                    type="text"
                    value={vehicleColor}
                    onChange={(e) => setVehicleColor(e.target.value)}
                    placeholder="e.g. White"
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-800 text-sm outline-none focus:border-orange-300 focus:ring-2 focus:ring-orange-100"
                  />
                </label>
              </div>
              <button
                onClick={handleSaveVehicle}
                disabled={savingVehicle}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-orange-300 bg-orange-50 px-4 py-3 text-sm font-semibold text-orange-700 transition hover:bg-orange-100 disabled:opacity-60"
              >
                {vehicleSaved ? (
                  <><CheckCircle2 size={16} className="text-green-600" /><span className="text-green-700">Vehicle saved!</span></>
                ) : (
                  <><Bookmark size={16} />{savingVehicle ? 'Saving...' : 'Save for Later'}</>
                )}
              </button>
            </div>
          </section>
        )}

        <section className="rounded-3xl border border-slate-200 bg-white p-2 shadow-sm">
          <button
            onClick={() => history.push('/profile/kyc')}
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left hover:bg-slate-50"
          >
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-indigo-100 text-indigo-700">
              <FileText size={18} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-800">KYC verification</p>
              <p className="text-xs text-slate-500">{kycStatus.label}</p>
            </div>
            <ChevronRight size={20} className="text-slate-400" />
          </button>

          <button
            onClick={() => history.push('/safety')}
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left hover:bg-slate-50"
          >
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
              <Shield size={18} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-800">Safety center</p>
              <p className="text-xs text-slate-500">SOS and emergency tools</p>
            </div>
            <ChevronRight size={20} className="text-slate-400" />
          </button>

          <button
            type="button"
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left hover:bg-slate-50"
          >
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-slate-200 text-slate-700">
              <Settings size={18} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-800">Settings</p>
              <p className="text-xs text-slate-500">App preferences</p>
            </div>
            <ChevronRight size={20} className="text-slate-400" />
          </button>
        </section>

        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600 transition hover:bg-rose-100"
        >
          <LogOut size={18} />
          Sign out
        </button>
      </div>
    </div>
  );
};

export default ProfilePage;
