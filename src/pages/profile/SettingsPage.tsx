import { useHistory } from 'react-router';
import {
  Bell,
  ChevronRight,
  Globe2,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { AppCard, PageHeader } from '../../components/ui';

const SettingsPage = () => {
  const history = useHistory();

  return (
    <div className="app-scroll-screen app-bottom-nav-safe bg-gray-50">
      <PageHeader title="Settings" subtitle="App preferences" variant="gradient" />

      <div className="px-4 -mt-4 pb-8">
        <AppCard className="p-2">
          <button
            type="button"
            onClick={() => history.push('/profile')}
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left hover:bg-slate-50"
          >
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-blue-100 text-blue-700">
              <UserRound size={18} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-800">Profile</p>
              <p className="text-xs text-slate-500">Personal and vehicle details</p>
            </div>
            <ChevronRight size={20} className="text-slate-400" />
          </button>

          <button
            type="button"
            onClick={() => history.push('/privacy-policy')}
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left hover:bg-slate-50"
          >
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-orange-100 text-orange-700">
              <ShieldCheck size={18} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-800">Privacy</p>
              <p className="text-xs text-slate-500">Legal and data terms</p>
            </div>
            <ChevronRight size={20} className="text-slate-400" />
          </button>

          <div className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left opacity-60">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
              <Bell size={18} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-800">Notifications</p>
              <p className="text-xs text-slate-500">Managed from your profile</p>
            </div>
          </div>

          <div className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left opacity-60">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-indigo-100 text-indigo-700">
              <Globe2 size={18} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-800">Language</p>
              <p className="text-xs text-slate-500">Managed from your profile</p>
            </div>
          </div>
        </AppCard>
      </div>
    </div>
  );
};

export default SettingsPage;
