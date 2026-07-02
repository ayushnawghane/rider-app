import { useState, useEffect, useCallback, useRef } from 'react';
import { useIonViewWillEnter } from '@ionic/react';
import { useHistory, useLocation } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { locationService, rideService } from '../../services';
import {
  Clock,
  Users,
  Star,
  Car,
  Filter,
  ChevronRight,
  ChevronLeft,
  Navigation,
} from 'lucide-react';
import type { PublishedRide } from '../../types';
import AppIcon from '../../components/icons/AppIcon';
import { PageLoader } from '../../components/ui';

const FIRE = 'linear-gradient(100deg, var(--fire-red), var(--fire-amber))';

interface SearchLocation {
  address: string;
  lat: number;
  lng: number;
}

interface FindRideLocationState {
  pickup?: SearchLocation;
  dropoff?: SearchLocation;
  passengerCount?: number;
  departureTime?: string;
}

const FindRidePage = () => {
  const { user, isAuthLoaded } = useAuth();
  const history = useHistory();
  const location = useLocation<FindRideLocationState>();

  const [pickupLocation, setPickupLocation] = useState<SearchLocation | null>(null);
  const [dropoffLocation, setDropoffLocation] = useState<SearchLocation | null>(null);
  const [passengerCount, setPassengerCount] = useState<number>(1);
  const [availableRides, setAvailableRides] = useState<PublishedRide[]>([]);
  const [joinedRideIds, setJoinedRideIds] = useState<Set<string>>(new Set());
  const [departureTime, setDepartureTime] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<'price' | 'time' | 'rating'>('time');
  const autoSearchKeyRef = useRef<string | null>(null);
  const searchRequestIdRef = useRef(0);

  // Get params from navigation state
  useEffect(() => {
    const state = location.state as FindRideLocationState | undefined;
    if (state) {
      if (state.pickup) setPickupLocation(state.pickup);
      if (state.dropoff) setDropoffLocation(state.dropoff);
      if (state.passengerCount) setPassengerCount(state.passengerCount);
      if (state.departureTime) setDepartureTime(state.departureTime);
    }
  }, [location.state]);

  const handleSearch = useCallback(async () => {
    const requestId = searchRequestIdRef.current + 1;
    searchRequestIdRef.current = requestId;
    setLoading(true);
    setHasSearched(true);
    const startQuery = pickupLocation?.address?.split(',')[0]?.trim();
    const endQuery = dropoffLocation?.address?.split(',')[0]?.trim();

    try {
      const result = await rideService.searchRides({
        startLocation: startQuery,
        endLocation: endQuery,
        departureTime: departureTime || new Date().toISOString(),
      });

      if (requestId !== searchRequestIdRef.current) {
        return;
      }

      if (!result.success || !result.rides) {
        setAvailableRides([]);
        return;
      }

      const rides = result.rides.map<PublishedRide>((ride) => ({
        id: ride.id,
        driverId: ride.driverId || ride.userId,
        driver: {
          id: ride.driverId || ride.userId,
          name: ride.userId === user?.id ? 'You (Driver)' : ride.driver?.name || 'Rider',
          avatar: ride.driver?.avatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + (ride.driverId || ride.userId),
          rating: ride.driver?.rating || 4.8,
          phone: ride.driverContact || ride.driver?.phone || 'N/A',
        },
        startLocation: ride.startLocation,
        endLocation: ride.endLocation,
        startLat: ride.startLocationCoords?.lat || 0,
        startLng: ride.startLocationCoords?.lng || 0,
        endLat: ride.endLocationCoords?.lat || 0,
        endLng: ride.endLocationCoords?.lng || 0,
        distance: ride.distance || 0,
        duration: ride.duration || 0,
        departureTime: ride.date,
        availableSeats: ride.availableSeats,
        bookedSeats: ride.bookedSeats,
        pricePerSeat: ride.pricePerSeat,
        vehicleType: ride.vehicleType,
        vehicleNumber: ride.vehicleNumber,
        status: ride.status === 'cancelled' ? 'cancelled' : ride.status === 'completed' ? 'completed' : 'active',
        notes: ride.notes,
        createdAt: ride.createdAt,
        updatedAt: ride.updatedAt,
      }));

      setAvailableRides(rides);

      if (user?.id) {
        const participation = await rideService.getJoinedRideIds(rides.map((ride) => ride.id), user.id);
        if (requestId === searchRequestIdRef.current && participation.success) {
          setJoinedRideIds(new Set(participation.rideIds || []));
        }
      } else {
        setJoinedRideIds(new Set());
      }
    } finally {
      if (requestId === searchRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, [departureTime, dropoffLocation, pickupLocation, user?.id]);

  useEffect(() => {
    if (!pickupLocation || !dropoffLocation) return;

    const searchKey = `${pickupLocation.address}|${dropoffLocation.address}|${passengerCount}`;
    if (autoSearchKeyRef.current === searchKey) return;

    autoSearchKeyRef.current = searchKey;
    void handleSearch();
  }, [dropoffLocation, handleSearch, passengerCount, pickupLocation]);

  // Re-sync which rides the user has already booked whenever we return to this
  // page (e.g. after joining a ride on the detail page). Without this the
  // "Book" button stays visible for a ride the user just booked.
  const refreshJoinedState = useCallback(async () => {
    if (!user?.id) {
      setJoinedRideIds(new Set());
      return;
    }
    const rideIds = availableRides.map((ride) => ride.id);
    if (rideIds.length === 0) return;
    const participation = await rideService.getJoinedRideIds(rideIds, user.id);
    if (participation.success) {
      setJoinedRideIds(new Set(participation.rideIds || []));
    }
  }, [availableRides, user?.id]);

  useIonViewWillEnter(() => {
    void refreshJoinedState();
  }, [refreshJoinedState]);

  const handleBookRide = (ride: PublishedRide) => {
    if (joinedRideIds.has(ride.id)) return;
    history.push(`/rides/detail/${ride.id}`, { ride, passengerCount });
  };

  const handlePublishFromSearch = () => {
    history.push('/publish-ride', {
      start: pickupLocation || undefined,
      end: dropoffLocation || undefined,
    });
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (minutes: number) => {
    if (!minutes || minutes <= 0) return 'Unknown';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getRideDistance = (ride: PublishedRide) => {
    if (ride.distance > 0) return Math.round(ride.distance * 10) / 10;
    if (!ride.startLat || !ride.startLng || !ride.endLat || !ride.endLng) return 0;
    return Math.round(locationService.calculateDistance(ride.startLat, ride.startLng, ride.endLat, ride.endLng) * 10) / 10;
  };

  const getRideDuration = (ride: PublishedRide) => {
    if (ride.duration > 0) return ride.duration;
    const distanceKm = getRideDistance(ride);
    if (!distanceKm) return 0;
    return Math.max(1, Math.round((distanceKm / 45) * 60));
  };

  if (!isAuthLoaded) {
    return <PageLoader />;
  }

  return (
    <div className="app-scroll-screen app-bottom-nav-safe relative overflow-hidden bg-white">
      {/* Grainy orange aura, right-weighted */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[340px]">
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(120% 72% at 82% -10%, rgba(255,107,0,0.42) 0%, rgba(255,160,30,0.16) 46%, rgba(255,255,255,0) 74%)' }}
        />
        <div className="absolute -right-16 -top-12 h-72 w-72 rounded-full animate-aurora-1" style={{ background: 'radial-gradient(circle, rgba(255,200,50,0.66) 0%, transparent 62%)', filter: 'blur(48px)' }} />
        <div className="absolute -left-20 top-8 h-52 w-52 rounded-full animate-aurora-2" style={{ background: 'radial-gradient(circle, rgba(255,140,0,0.26) 0%, transparent 62%)', filter: 'blur(50px)' }} />
      </div>

      <div className="relative z-10 px-4 pb-24 pt-[calc(env(safe-area-inset-top)+20px)]">
        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          <button
            onClick={() => history.length > 1 ? history.goBack() : history.push('/home')}
            aria-label="Back"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-black/10 bg-white/70 text-ink shadow-soft backdrop-blur-sm transition active:scale-95"
          >
            <ChevronLeft size={22} strokeWidth={2.5} />
          </button>
          <div>
            <p className="mb-0.5 font-display text-xs font-bold uppercase tracking-[0.2em] text-fire-orange">Find a ride</p>
            <h1 className="font-display text-[1.7rem] font-extrabold leading-[0.95] tracking-tight text-ink">Search</h1>
          </div>
        </div>

        {/* Search Form */}
        <div className="mb-5 rounded-[18px] border border-black/5 bg-white/80 p-4 shadow-strong backdrop-blur-md">
          {/* Pickup */}
          <button
            onClick={() => history.push('/select-location', {
              type: 'pickup',
              returnTo: '/find-ride',
              pickup: pickupLocation || undefined,
              dropoff: dropoffLocation || undefined,
            })}
            className="mb-3 flex w-full items-center gap-3 rounded-2xl border-2 border-primary-100 bg-primary-50/40 p-3.5 text-left transition-colors hover:border-primary-300"
          >
            <AppIcon name="map-pin" className="h-6 w-6 shrink-0" />
            <span className="min-w-0 flex-1 truncate font-display font-bold text-ink">
              {pickupLocation?.address || 'Select pickup location'}
            </span>
          </button>

          {/* Dropoff */}
          <button
            onClick={() => history.push('/select-location', {
              type: 'dropoff',
              returnTo: '/find-ride',
              pickup: pickupLocation || undefined,
              dropoff: dropoffLocation || undefined,
            })}
            className="mb-3 flex w-full items-center gap-3 rounded-2xl border-2 border-primary-100 bg-primary-50/40 p-3.5 text-left transition-colors hover:border-primary-300"
          >
            <AppIcon name="route" className="h-6 w-6 shrink-0" />
            <span className="min-w-0 flex-1 truncate font-display font-bold text-ink">
              {dropoffLocation?.address || 'Select destination'}
            </span>
          </button>

          {/* Passengers */}
          <label className="mb-4 flex items-center gap-3 rounded-2xl border border-black/5 bg-paper p-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary-100 bg-white">
              <AppIcon name="users" className="h-5 w-5" />
            </div>
            <span className="font-display text-[11px] font-bold uppercase tracking-wide text-ink/45">Seats</span>
            <select
              value={passengerCount}
              onChange={(e) => setPassengerCount(Number(e.target.value))}
              className="ml-auto bg-transparent text-right font-display text-sm font-bold text-ink focus:outline-none [color-scheme:light]"
            >
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>{n} passenger{n > 1 ? 's' : ''}</option>
              ))}
            </select>
          </label>

          <button
            onClick={handleSearch}
            disabled={loading}
            className="grain grain-strong relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl py-4 font-display text-lg font-bold tracking-tight text-white shadow-glow transition-all hover:shadow-glow-lg active:scale-[0.98] disabled:opacity-80"
            style={{ background: FIRE }}
          >
            <AppIcon name="search" className="h-5 w-5 brightness-0 invert" />
            {loading ? 'Searching...' : 'Search Rides'}
          </button>
        </div>

        {/* Results */}
        {availableRides.length > 0 && (
          <div>
            {/* Filters */}
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-extrabold tracking-tight text-ink">
                {availableRides.length} ride{availableRides.length === 1 ? '' : 's'} available
              </h2>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-1.5 rounded-full border border-primary-200 bg-white px-3 py-1.5 font-display text-sm font-bold text-primary-600 shadow-soft transition active:scale-95"
              >
                <Filter className="h-4 w-4" strokeWidth={2.5} />
                Filter
              </button>
            </div>

            {/* Sort Options */}
            {showFilters && (
              <div className="mb-4 flex gap-2 overflow-x-auto pb-2">
                {(['time', 'price', 'rating'] as const).map((sort) => {
                  const isActive = sortBy === sort;
                  return (
                    <button
                      key={sort}
                      onClick={() => setSortBy(sort)}
                      className={`${isActive ? 'grain grain-strong text-white shadow-glow' : 'border border-black/5 bg-white text-ink/55'} relative overflow-hidden whitespace-nowrap rounded-full px-4 py-2 font-display text-sm font-bold transition active:scale-95`}
                      style={isActive ? { background: FIRE } : undefined}
                    >
                      {sort.charAt(0).toUpperCase() + sort.slice(1)}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Ride Cards */}
            <div className="space-y-4">
              {availableRides.map((ride) => {
                const isBooked = joinedRideIds.has(ride.id);
                const isOwnRide = Boolean(user?.id && (ride.driverId === user.id));
                return (
                  <div key={ride.id} className="rounded-[16px] border border-black/5 bg-white p-5 shadow-soft">
                    {/* Driver Info */}
                    <div className="mb-4 flex items-start gap-4">
                      <div className="relative">
                        <div className="h-14 w-14 overflow-hidden rounded-2xl border border-black/5 bg-paper-dim">
                          <img
                            src={ride.driver?.avatar || 'https://via.placeholder.com/56'}
                            alt={ride.driver?.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        {ride.driver?.rating && ride.driver.rating >= 4.8 && (
                          <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-fire-gold shadow-gold-glow">
                            <Star className="h-3 w-3 fill-ink text-ink" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-display font-bold text-ink">{ride.driver?.name}</h3>
                        <div className="flex items-center gap-1 text-fire-gold">
                          <Star className="h-4 w-4 fill-current" />
                          <span className="text-sm font-bold">{ride.driver?.rating}</span>
                        </div>
                        <div className="mt-1 flex items-center gap-1.5 text-xs font-medium text-ink/50">
                          <Car className="h-3.5 w-3.5" />
                          <span className="truncate">{ride.vehicleType} • {ride.vehicleNumber}</span>
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <p className="font-display text-2xl font-extrabold leading-none text-fire-orange">₹{ride.pricePerSeat}</p>
                        <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-ink/40">per seat</p>
                      </div>
                    </div>

                    {/* Route Info */}
                    <div className="mb-4 flex items-center gap-3 text-sm">
                      <div className="flex-1">
                        <p className="mb-0.5 text-[11px] font-bold uppercase tracking-wide text-ink/40">Departure</p>
                        <p className="font-display font-bold text-ink">{formatTime(ride.departureTime)}</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="h-2 w-2 rounded-full bg-fire-orange" />
                        <div className="h-0.5 w-14 rounded-full bg-gradient-to-r from-fire-orange to-fire-gold" />
                        <div className="h-2 w-2 rounded-full bg-fire-gold" />
                      </div>
                      <div className="flex-1 text-right">
                        <p className="mb-0.5 text-[11px] font-bold uppercase tracking-wide text-ink/40">Arrival</p>
                        <p className="font-display font-bold text-ink">
                          {formatTime(new Date(new Date(ride.departureTime).getTime() + getRideDuration(ride) * 60000).toISOString())}
                        </p>
                      </div>
                    </div>

                    {/* Details */}
                    <div className="mb-4 flex items-center justify-between rounded-2xl border border-black/5 bg-paper px-3 py-2.5 text-xs font-medium text-ink/55">
                      <span className="flex items-center gap-1">
                        <Navigation className="h-3.5 w-3.5" />
                        {getRideDistance(ride) ? `${getRideDistance(ride)} km` : 'Distance unknown'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {formatDuration(getRideDuration(ride))}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {ride.availableSeats - ride.bookedSeats} seats left
                      </span>
                    </div>

                    {/* Notes */}
                    {ride.notes && (
                      <p className="mb-4 rounded-2xl border border-black/5 bg-paper p-3 text-xs font-medium italic text-ink/55">
                        "{ride.notes}"
                      </p>
                    )}

                    {/* Book Button — your own rides can't be booked; manage them instead */}
                    {isOwnRide ? (
                      <button
                        onClick={() => history.push(`/rides/detail/${ride.id}`)}
                        className="flex w-full items-center justify-center gap-1.5 rounded-2xl border-2 border-primary-200 bg-primary-50 py-3.5 font-display font-bold tracking-tight text-primary-600 transition-all active:scale-[0.98]"
                      >
                        Your ride · Manage
                        <ChevronRight className="h-5 w-5" strokeWidth={2.5} />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleBookRide(ride)}
                        disabled={isBooked}
                        className={`${isBooked ? 'border-2 border-black/10 bg-paper text-ink/45' : 'grain grain-strong text-white shadow-glow'} relative flex w-full items-center justify-center gap-1.5 overflow-hidden rounded-2xl py-3.5 font-display font-bold tracking-tight transition-all active:scale-[0.98]`}
                        style={isBooked ? undefined : { background: FIRE }}
                      >
                        {isBooked ? 'Booked' : `Book ${passengerCount} Seat${passengerCount > 1 ? 's' : ''}`}
                        {!isBooked && <ChevronRight className="h-5 w-5" strokeWidth={2.5} />}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && hasSearched && availableRides.length === 0 && (pickupLocation || dropoffLocation) && (
          <div className="mt-8 rounded-[18px] border border-black/5 bg-white p-5 text-center shadow-soft">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl border border-primary-100 bg-gradient-to-br from-primary-50 to-white shadow-soft">
              <AppIcon name="car" className="h-12 w-12" />
            </div>
            <h2 className="mt-5 font-display text-2xl font-extrabold tracking-tight text-ink">No rides found</h2>
            <p className="mt-2 text-sm font-medium text-ink/50">
              We couldn't find any rides for your route. Try adjusting your search or publish your own ride!
            </p>
            <button
              onClick={handlePublishFromSearch}
              className="grain grain-strong relative mt-6 w-full overflow-hidden rounded-2xl px-4 py-3.5 font-display font-bold text-white shadow-glow transition active:scale-[0.98]"
              style={{ background: FIRE }}
            >
              Publish a Ride
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FindRidePage;
