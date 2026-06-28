import { useLocation } from 'react-router';
import AppIcon from '../../components/icons/AppIcon';

interface InboxLocationState {
  rideId?: string;
}

const InboxPage = () => {
  const location = useLocation<InboxLocationState>();
  const rideId = location.state?.rideId;

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

      <div className="relative z-10 px-4 pb-6 pt-[calc(env(safe-area-inset-top)+20px)]">
        <div className="mx-auto max-w-2xl">
          {/* Header */}
          <header className="mb-6">
            <p className="mb-1 font-display text-xs font-bold uppercase tracking-[0.2em] text-fire-orange">Messages</p>
            <h1 className="font-display text-[2.6rem] font-extrabold leading-[0.9] tracking-tight text-ink">Inbox</h1>
            <p className="mt-2 text-sm font-medium text-ink/50">Temporary ride messages</p>
          </header>

          {rideId ? (
            <div className="rounded-[28px] border border-black/5 bg-white p-5 shadow-soft">
              <div className="mb-4 inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-display text-xs font-extrabold text-white shadow-glow" style={{ background: 'linear-gradient(100deg, var(--fire-red), var(--fire-amber))' }}>
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
                Active ride chat
              </div>
              <div className="rounded-[22px] border border-dashed border-primary-200 bg-paper p-6 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl border border-primary-100 bg-gradient-to-br from-primary-50 to-white shadow-soft">
                  <AppIcon name="message" className="h-9 w-9" />
                </div>
                <h2 className="mt-4 font-display text-lg font-extrabold tracking-tight text-ink">Ride chat workspace</h2>
                <p className="mt-2 text-sm font-medium text-ink/50">
                  Messages for this ride open here only while the trip is active.
                </p>
              </div>
            </div>
          ) : (
            <div className="rounded-[28px] border border-black/5 bg-white p-8 text-center shadow-soft">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-primary-100 bg-gradient-to-br from-primary-50 to-white shadow-soft">
                <AppIcon name="inbox" className="h-11 w-11" />
              </div>
              <h2 className="mt-5 font-display text-2xl font-extrabold tracking-tight text-ink">No active messages</h2>
              <p className="mt-2 text-sm font-medium text-ink/50">
                Open a current ride from Your Rides and tap Message to start a temporary chat.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InboxPage;
