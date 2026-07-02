import { useHistory } from 'react-router';
import {
  Bell,
  ChevronRight,
  ChevronLeft,
  Globe2,
  ShieldCheck,
  UserRound,
  Trash2,
} from 'lucide-react';

const SettingsPage = () => {
  const history = useHistory();

  return (
    <div className="app-scroll-screen app-bottom-nav-safe relative overflow-hidden bg-white">
      {/* Grainy orange aura, right-weighted */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[320px]">
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(120% 72% at 82% -10%, rgba(255,107,0,0.4) 0%, rgba(255,160,30,0.15) 46%, rgba(255,255,255,0) 74%)' }}
        />
        <div className="absolute -right-16 -top-12 h-72 w-72 rounded-full animate-aurora-1" style={{ background: 'radial-gradient(circle, rgba(255,200,50,0.62) 0%, transparent 62%)', filter: 'blur(48px)' }} />
        <div className="absolute -left-20 top-8 h-52 w-52 rounded-full animate-aurora-2" style={{ background: 'radial-gradient(circle, rgba(255,140,0,0.24) 0%, transparent 62%)', filter: 'blur(50px)' }} />
      </div>

      <div className="relative z-10 px-4 pb-8 pt-[calc(env(safe-area-inset-top)+12px)]">
        <div className="mx-auto max-w-2xl">
          {/* Header */}
          <header className="mb-3 flex items-center gap-3">
            <button
              onClick={() => history.length > 1 ? history.goBack() : history.push('/profile')}
              aria-label="Back"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-black/10 bg-white/70 text-ink shadow-soft backdrop-blur-sm transition active:scale-95"
            >
              <ChevronLeft size={22} strokeWidth={2.5} />
            </button>
            <div>
              <p className="mb-0.5 font-display text-xs font-bold uppercase tracking-[0.2em] text-fire-orange">Preferences</p>
              <h1 className="font-display text-[1.7rem] font-extrabold leading-[0.95] tracking-tight text-ink">Settings</h1>
            </div>
          </header>

          <section className="rounded-[18px] border border-black/5 bg-white p-2 shadow-soft">
            <button
              type="button"
              onClick={() => history.push('/profile')}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-paper"
            >
              <div className="grid h-11 w-11 place-items-center rounded-xl border border-primary-100 bg-gradient-to-br from-primary-50 to-white text-fire-orange">
                <UserRound size={18} />
              </div>
              <div className="flex-1">
                <p className="font-display text-sm font-bold text-ink">Profile</p>
                <p className="text-xs font-medium text-ink/45">Personal and vehicle details</p>
              </div>
              <ChevronRight size={20} className="text-ink/25" />
            </button>

            <button
              type="button"
              onClick={() => history.push('/privacy-policy')}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-paper"
            >
              <div className="grid h-11 w-11 place-items-center rounded-xl border border-primary-100 bg-gradient-to-br from-primary-50 to-white text-fire-orange">
                <ShieldCheck size={18} />
              </div>
              <div className="flex-1">
                <p className="font-display text-sm font-bold text-ink">Privacy</p>
                <p className="text-xs font-medium text-ink/45">Legal and data terms</p>
              </div>
              <ChevronRight size={20} className="text-ink/25" />
            </button>

            <div className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left opacity-50">
              <div className="grid h-11 w-11 place-items-center rounded-xl border border-black/5 bg-paper text-ink/40">
                <Bell size={18} />
              </div>
              <div className="flex-1">
                <p className="font-display text-sm font-bold text-ink">Notifications</p>
                <p className="text-xs font-medium text-ink/45">Managed from your profile</p>
              </div>
            </div>

            <div className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left opacity-50">
              <div className="grid h-11 w-11 place-items-center rounded-xl border border-black/5 bg-paper text-ink/40">
                <Globe2 size={18} />
              </div>
              <div className="flex-1">
                <p className="font-display text-sm font-bold text-ink">Language</p>
                <p className="text-xs font-medium text-ink/45">Managed from your profile</p>
              </div>
            </div>
          </section>

          {/* Account */}
          <section className="mt-4 rounded-[18px] border border-black/5 bg-white p-2 shadow-soft">
            <button
              type="button"
              onClick={() => history.push('/delete-account')}
              className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-fire-red/5"
            >
              <div className="grid h-11 w-11 place-items-center rounded-xl border border-fire-red/15 bg-fire-red/5 text-fire-red">
                <Trash2 size={18} />
              </div>
              <div className="flex-1">
                <p className="font-display text-sm font-bold text-fire-red">Delete account</p>
                <p className="text-xs font-medium text-ink/45">Permanently remove your account and data</p>
              </div>
              <ChevronRight size={20} className="text-ink/25" />
            </button>
          </section>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
