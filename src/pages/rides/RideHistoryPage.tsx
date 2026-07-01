import { useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import { MessageCircle, Phone, Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { rideService } from '../../services';
import { SkeletonList } from '../../components/Skeleton';
import AppIcon from '../../components/icons/AppIcon';
import type { Ride } from '../../types';

const FIRE = 'linear-gradient(100deg, var(--fire-red), var(--fire-amber))';

const RideHistoryPage = () => {
  const { user } = useAuth();
  const history = useHistory();
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRides = async () => {
      if (!user) return;

      const result = await rideService.getRides(user.id);
      if (result.success && result.rides) {
        setRides(result.rides);
      }
      setLoading(false);
    };

    void fetchRides();
  }, [user]);

  // A ride counts as "current" (and therefore chat-enabled) whenever it is still
  // upcoming (pending) or active. Completed/cancelled rides fall into the
  // archived section. Chat must work for both upcoming and active rides, so we
  // deliberately do not gate this on a narrow date window.
  const isCurrentRide = (ride: Ride) => ride.status === 'pending' || ride.status === 'active';

  const getStatusLabel = (status: Ride['status']) => {
    if (status === 'active') return 'Ride Confirmed';
    if (status === 'pending') return 'Awaiting Departure';
    if (status === 'completed') return 'Completed';
    return 'Cancelled';
  };

  const getStatusClass = (status: Ride['status']) => {
    if (status === 'active') return 'bg-fire-orange text-white shadow-glow';
    if (status === 'pending') return 'bg-fire-gold/25 text-[#9a5b00]';
    if (status === 'completed') return 'bg-ink/8 text-ink/55';
    return 'bg-fire-red/12 text-fire-red';
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const currentRides = rides.filter(isCurrentRide);
  const archivedRides = rides.filter((ride) => !isCurrentRide(ride));

  const renderRideCard = (ride: Ride, current: boolean) => (
    // A card (not a <button>) so the inner Call/Message controls are valid —
    // nesting interactive elements inside a <button> is invalid HTML.
    <div
      key={ride.id}
      role="button"
      tabIndex={0}
      onClick={() => history.push(`/rides/detail/${ride.id}`)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          history.push(`/rides/detail/${ride.id}`);
        }
      }}
      className="w-full cursor-pointer rounded-[26px] border border-black/5 bg-white p-4 text-left shadow-soft transition active:scale-[0.99]"
    >
      <div className="flex gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary-100 bg-gradient-to-br from-primary-50 to-white">
          <AppIcon name="car" className="h-7 w-7" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2 font-display text-sm font-bold text-ink">
            <span className="truncate">{ride.startLocation}</span>
            <span className="shrink-0 font-extrabold text-fire-orange">→</span>
            <span className="truncate">{ride.endLocation}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={`rounded-lg px-2.5 py-1 font-display text-[11px] font-bold ${getStatusClass(ride.status)}`}>
              {getStatusLabel(ride.status)}
            </span>
            <span className="rounded-lg border border-black/5 bg-paper px-2.5 py-1 font-display text-[11px] font-bold text-ink/55">
              {ride.userRole === 'passenger' ? 'Passenger' : 'Driver'}
            </span>
            <span className="text-xs font-medium text-ink/45">{formatDate(ride.date)}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-md border border-black/5 bg-paper px-2 py-1 font-medium text-ink/55">{ride.vehicleType}</span>
            <span className="rounded-md border border-black/5 bg-paper px-2 py-1 font-medium text-ink/55">{ride.vehicleNumber}</span>
            {ride.pricePerSeat > 0 && (
              <span className="rounded-md border border-primary-100 bg-primary-50 px-2 py-1 font-display font-bold text-primary-600">
                ₹{ride.pricePerSeat}/seat
              </span>
            )}
            <span className="rounded-md border border-black/5 bg-paper px-2 py-1 font-display font-bold text-ink/60">
              {Math.max(0, ride.availableSeats - ride.bookedSeats)}/{ride.availableSeats} seats
            </span>
          </div>

          {current && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <a
                href={ride.driver?.phone ? `tel:${ride.driver.phone}` : undefined}
                onClick={(event) => event.stopPropagation()}
                className={`inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-2.5 font-display text-sm font-bold text-white transition active:scale-95 ${
                  ride.driver?.phone ? 'shadow-glow' : 'pointer-events-none opacity-50'
                }`}
                style={{ background: ride.driver?.phone ? FIRE : 'var(--ink)' }}
              >
                <Phone size={16} strokeWidth={2.5} />
                Call
              </a>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  history.push('/inbox', { rideId: ride.id });
                }}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border-2 border-primary-200 px-3 py-2.5 font-display text-sm font-bold text-primary-600 transition active:scale-95 hover:bg-primary-50"
              >
                <MessageCircle size={16} strokeWidth={2.5} />
                Message
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderSection = (title: string, items: Ride[], current = false) => (
    <section className="space-y-3">
      <h2 className="font-display text-lg font-extrabold tracking-tight text-ink">{title}</h2>
      {items.length === 0 ? (
        <div className="rounded-[22px] border border-black/5 bg-white p-4 text-sm font-medium text-ink/50 shadow-soft">
          No {title.toLowerCase()}.
        </div>
      ) : (
        items.map((ride) => renderRideCard(ride, current))
      )}
    </section>
  );

  return (
    <div className="app-scroll-screen app-bottom-nav-safe relative overflow-hidden bg-white">
      {/* Grainy orange aura, right-weighted */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[360px]">
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(120% 72% at 82% -10%, rgba(255,107,0,0.42) 0%, rgba(255,160,30,0.16) 46%, rgba(255,255,255,0) 74%)' }}
        />
        <div className="absolute -right-16 -top-12 h-72 w-72 rounded-full animate-aurora-1" style={{ background: 'radial-gradient(circle, rgba(255,200,50,0.66) 0%, transparent 62%)', filter: 'blur(48px)' }} />
        <div className="absolute -left-20 top-8 h-52 w-52 rounded-full animate-aurora-2" style={{ background: 'radial-gradient(circle, rgba(255,140,0,0.26) 0%, transparent 62%)', filter: 'blur(50px)' }} />
      </div>

      <div className="relative z-10 px-4 pb-4 pt-[calc(env(safe-area-inset-top)+20px)]">
        <div className="mx-auto max-w-2xl">
          <header className="mb-6 flex items-end justify-between">
            <div>
              <p className="mb-1 font-display text-xs font-bold uppercase tracking-[0.2em] text-fire-orange">Your trips</p>
              <h1 className="font-display text-[2.6rem] font-extrabold leading-[0.9] tracking-tight text-ink">Rides</h1>
              <p className="mt-2 text-sm font-medium text-ink/50">
                {rides.length} ride{rides.length === 1 ? '' : 's'} found
              </p>
            </div>
            <button
              type="button"
              onClick={() => history.push('/publish-ride')}
              className="grain grain-strong relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl text-white shadow-glow transition active:scale-90"
              style={{ background: FIRE }}
              aria-label="Publish ride"
            >
              <Plus size={22} strokeWidth={2.75} />
            </button>
          </header>

          {loading ? (
            <SkeletonList count={3} lines={3} />
          ) : rides.length === 0 ? (
            <div className="rounded-[28px] border border-black/5 bg-white p-8 text-center shadow-soft">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-primary-100 bg-gradient-to-br from-primary-50 to-white shadow-soft">
                <AppIcon name="car" className="h-12 w-12" />
              </div>
              <h2 className="mt-5 font-display text-2xl font-extrabold tracking-tight text-ink">No rides yet</h2>
              <p className="mt-2 text-sm font-medium text-ink/50">Publish a ride or search from Home to get started.</p>
              <button
                type="button"
                onClick={() => history.push('/publish-ride')}
                className="grain grain-strong relative mt-6 w-full overflow-hidden rounded-2xl px-4 py-3.5 font-display font-bold text-white shadow-glow transition active:scale-[0.98]"
                style={{ background: FIRE }}
              >
                Publish Ride
              </button>
            </div>
          ) : (
            <div className="space-y-7">
              {renderSection('Current rides', currentRides, true)}
              {renderSection('Archived rides', archivedRides)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RideHistoryPage;
