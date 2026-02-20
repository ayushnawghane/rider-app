import { useEffect, useMemo, useState } from 'react';
import { useHistory } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { authService } from '../../services';
import {
  ArrowLeft,
  Bell,
  Camera,
  ChevronRight,
  Clock3,
  Globe2,
  LogOut,
  Pencil,
  Phone,
  Settings,
  Shield,
  FileText,
} from 'lucide-react';

const ProfilePage = () => {
  const { user, refreshUser, logout, isAuthLoaded } = useAuth();
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [language, setLanguage] = useState(user?.language || 'en');
  const [notifications, setNotifications] = useState<boolean>(user?.notificationPreferences || true);
  const history = useHistory();

  useEffect(() => {
    if (user) {
      setFullName(user.fullName);
      setLanguage(user.language);
      setNotifications(user.notificationPreferences);
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;

    try {
      setLoading(true);
      await authService.updateProfile(
        {
          fullName,
          language,
          notificationPreferences: notifications,
        },
        user.id,
      );
      await refreshUser();
      setEditing(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    history.replace('/login');
  };

  const handleBack = () => {
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
  const displayEmail = user.email?.includes('@otp.riderapp.local') ? 'Phone sign-in account' : user.email;

  return (
    <div className="min-h-screen bg-slate-100 pb-24">
      <div className="bg-gradient-to-br from-orange-500 via-orange-600 to-orange-700 px-4 pb-20 pt-12">
        <div className="mx-auto max-w-2xl">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={handleBack}
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
              onClick={() => setEditing(!editing)}
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
          <div className="flex items-start gap-4">
            <div className="relative">
              <div className="grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-4xl font-bold text-white">
                {initials}
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
