import { useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import { MessageCircle, Phone, Plus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { rideService } from '../../services';
import { SkeletonList } from '../../components/Skeleton';
import type { Ride } from '../../types';

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

  const isCurrentRide = (ride: Ride) => {
    if (ride.status !== 'pending' && ride.status !== 'active') return false;

    const rideDate = new Date(ride.date);
    if (Number.isNaN(rideDate.getTime())) return true;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const afterTomorrow = new Date(today);
    afterTomorrow.setDate(today.getDate() + 2);
    return rideDate >= today && rideDate < afterTomorrow;
  };

  const getStatusLabel = (status: Ride['status']) => {
    if (status === 'active') return 'Ride Confirmed';
    if (status === 'pending') return 'Awaiting Departure';
    if (status === 'completed') return 'Completed';
    return 'Cancelled';
  };

  const getStatusClass = (status: Ride['status']) => {
    if (status === 'active') return 'bg-green-100 text-green-700';
    if (status === 'pending') return 'bg-orange-100 text-orange-700';
    if (status === 'completed') return 'bg-blue-100 text-blue-700';
    return 'bg-red-100 text-red-700';
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
    <button
      key={ride.id}
      type="button"
      onClick={() => history.push(`/rides/detail/${ride.id}`)}
      className="w-full rounded-2xl bg-white p-4 text-left shadow-sm transition active:scale-[0.99]"
    >
      <div className="flex gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-xl">
          🚗
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-900">
            <span className="truncate">{ride.startLocation}</span>
            <span className="shrink-0 text-slate-400">→</span>
            <span className="truncate">{ride.endLocation}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${getStatusClass(ride.status)}`}>
              {getStatusLabel(ride.status)}
            </span>
            <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {ride.userRole === 'passenger' ? 'Passenger' : 'Driver'}
            </span>
            <span className="text-xs text-slate-500">{formatDate(ride.date)}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-600">{ride.vehicleType}</span>
            <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-600">{ride.vehicleNumber}</span>
            {ride.pricePerSeat > 0 && (
              <span className="rounded-md bg-orange-50 px-2 py-1 font-semibold text-orange-600">
                ₹{ride.pricePerSeat}/seat
              </span>
            )}
            <span className="rounded-md bg-indigo-50 px-2 py-1 text-indigo-600">
              {Math.max(0, ride.availableSeats - ride.bookedSeats)}/{ride.availableSeats} seats
            </span>
          </div>

          {current && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <a
                href={ride.driver?.phone ? `tel:${ride.driver.phone}` : undefined}
                onClick={(event) => event.stopPropagation()}
                className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-white ${
                  ride.driver?.phone ? 'bg-primary-500' : 'pointer-events-none bg-slate-300'
                }`}
              >
                <Phone size={16} />
                Call
              </a>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  history.push('/inbox', { rideId: ride.id });
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-sm font-bold text-orange-700"
              >
                <MessageCircle size={16} />
                Message
              </button>
            </div>
          )}
        </div>
      </div>
    </button>
  );

  const renderSection = (title: string, items: Ride[], current = false) => (
    <section className="space-y-3">
      <h2 className="text-base font-bold text-slate-900">{title}</h2>
      {items.length === 0 ? (
        <div className="rounded-2xl bg-white p-4 text-sm text-slate-500 shadow-sm">
          No {title.toLowerCase()}.
        </div>
      ) : (
        items.map((ride) => renderRideCard(ride, current))
      )}
    </section>
  );

  return (
    <div className="app-scroll-screen app-bottom-nav-safe bg-gray-50 px-4 py-4">
      <div className="mx-auto max-w-2xl">
        <header className="mb-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Your Rides</h1>
            <p className="mt-1 text-sm text-slate-500">{rides.length} ride{rides.length === 1 ? '' : 's'} found</p>
          </div>
          <button
            type="button"
            onClick={() => history.push('/publish-ride')}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-500 text-white shadow-sm"
            aria-label="Publish ride"
          >
            <Plus size={20} />
          </button>
        </header>

        {loading ? (
          <SkeletonList count={3} lines={3} />
        ) : rides.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <div className="text-5xl">🚗</div>
            <h2 className="mt-4 text-xl font-bold text-slate-900">No Rides Yet</h2>
            <p className="mt-2 text-sm text-slate-500">Publish a ride or search from Home to get started.</p>
            <button
              type="button"
              onClick={() => history.push('/publish-ride')}
              className="mt-5 w-full rounded-xl bg-primary-500 px-4 py-3 font-bold text-white"
            >
              Publish Ride
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {renderSection('Current Rides', currentRides, true)}
            {renderSection('Archived Rides', archivedRides)}
          </div>
        )}
      </div>
    </div>
  );
};

export default RideHistoryPage;
