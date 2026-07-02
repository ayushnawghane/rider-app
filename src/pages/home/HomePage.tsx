import { useEffect, useState } from 'react';
import { useIonViewWillEnter } from '@ionic/react';
import { useHistory, useLocation } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { Phone, MessageCircle, Map, Star, Bell, ChevronRight } from 'lucide-react';
import AppIcon, { type AppIconName } from '../../components/icons/AppIcon';
import type { PublishedRide, Ride } from '../../types';
import { locationService, mapsService, notificationService, rideService } from '../../services';
import { isProfileIncomplete, isProfileNameIncomplete } from '../../utils/profileCompletion';

interface Location {
  address: string;
  lat: number;
  lng: number;
}

interface PopularRoute {
  city: string;
  image: string;
  startingPrice: number;
  location: Location;
}

const FIRE = 'linear-gradient(100deg, var(--fire-red), var(--fire-amber))';

const profilePromptDismissKey = (userId: string) => `profile-prompt-dismissed:${userId}`;
const currentLocationLabel = (address: string) => address.split(',')[0]?.trim() || address;
const toGreetingName = (firstName?: string | null, fullName?: string | null) => {
  const candidate = firstName || fullName;
  return isProfileNameIncomplete(candidate) ? 'Rider' : candidate || 'Rider';
};
const toLocalDateValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const nextRideMeta = (ride: Ride) => {
  const when = new Date(ride.date).toLocaleString('en-US', {
    weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
  if (ride.userRole === 'driver') {
    const left = Math.max(0, (ride.availableSeats ?? 0) - (ride.bookedSeats ?? 0));
    return `${when} · ${ride.bookedSeats ?? 0} joined · ${left} seat${left === 1 ? '' : 's'} left`;
  }
  return `${when} · You're riding`;
};

const HomePage = () => {
  const { user, isAuthLoaded } = useAuth();
  const history = useHistory();
  const location = useLocation<{ pickup?: Location; dropoff?: Location }>();

  const refreshUnread = async () => {
    if (!user?.id) {
      setUnreadCount(0);
      return;
    }
    const result = await notificationService.getUnreadCount(user.id);
    if (result.success) setUnreadCount(result.count || 0);
  };

  // The single ride the user is most likely opening the app to check: their
  // nearest upcoming or currently-active ride (as driver or passenger).
  const refreshNextRide = async () => {
    if (!user?.id) {
      setNextRide(null);
      return;
    }
    const result = await rideService.getRides(user.id);
    if (!result.success || !result.rides) {
      setNextRide(null);
      return;
    }
    const upcoming = result.rides
      .filter((ride) => ride.status === 'active' || ride.status === 'pending')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    // Prefer an active ride; otherwise the soonest upcoming one.
    setNextRide(upcoming.find((r) => r.status === 'active') || upcoming[0] || null);
  };

  useEffect(() => {
    void refreshUnread();
    void refreshNextRide();
    if (!user?.id) return;
    const unsubscribe = notificationService.subscribeToNotifications(user.id, () => {
      void refreshUnread();
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Recompute when returning to Home (e.g. after reading notifications or booking).
  useIonViewWillEnter(() => {
    void refreshUnread();
    void refreshNextRide();
  });

  const [pickup, setPickup] = useState<Location | null>(null);
  const [dropoff, setDropoff] = useState<Location | null>(null);
  const [passengerCount, setPassengerCount] = useState<number>(1);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [nextRide, setNextRide] = useState<Ride | null>(null);
  const [departureDate, setDepartureDate] = useState(() => toLocalDateValue(new Date()));
  const [dismissedProfilePrompt, setDismissedProfilePrompt] = useState(false);
  const [showProfilePrompt, setShowProfilePrompt] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<Location | null>(null);
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [activeRide] = useState<PublishedRide | null>(null);
  const [userStats] = useState({
    level: user?.level ?? 1,
    points: user?.totalPoints ?? 0,
    ridesTaken: user?.ridesTaken ?? 0,
    ridesPublished: user?.ridesPublished ?? 0,
    rating: user?.ratingAsDriver ?? 0,
  });

  useEffect(() => {
    const state = location.state;
    if (!state) return;
    if (state.pickup) setPickup(state.pickup);
    if (state.dropoff) setDropoff(state.dropoff);
  }, [location.state]);

  // Clear the "add a pick-up/drop-off" hint once the user has chosen both.
  useEffect(() => {
    if (pickup && dropoff) setSearchError(null);
  }, [pickup, dropoff]);

  useEffect(() => {
    if (!user?.id) {
      setDismissedProfilePrompt(false);
      return;
    }

    const hasDismissedPrompt = window.sessionStorage.getItem(profilePromptDismissKey(user.id)) === '1';
    setDismissedProfilePrompt(hasDismissedPrompt);
  }, [user?.id]);

  useEffect(() => {
    if (!isAuthLoaded || !user) {
      setShowProfilePrompt(false);
      return;
    }

    if (dismissedProfilePrompt) {
      setShowProfilePrompt(false);
      return;
    }

    setShowProfilePrompt(isProfileIncomplete(user));
  }, [dismissedProfilePrompt, isAuthLoaded, user]);

  const handleSwapLocations = () => {
    const temp = pickup;
    setPickup(dropoff);
    setDropoff(temp);
  };

  const handleFindDrivers = () => {
    // Find Ride can't search without both endpoints — guard here so the user
    // gets a clear prompt instead of a blank results page.
    if (!pickup || !dropoff) {
      setSearchError(
        !pickup && !dropoff
          ? 'Add a pick-up and drop-off to search.'
          : !pickup
            ? 'Add a pick-up location to search.'
            : 'Add a drop-off location to search.',
      );
      return;
    }
    setSearchError(null);
    const departureTime = departureDate ? new Date(`${departureDate}T00:00:00`).toISOString() : undefined;
    history.push('/find-ride', { pickup, dropoff, passengerCount, departureTime });
  };

  const handleDetectCurrentLocation = async () => {
    if (isDetectingLocation) return;

    setIsDetectingLocation(true);
    setLocationError(null);

    try {
      const coords = await locationService.getCurrentPosition();
      if (!coords) {
        setLocationError('Location unavailable');
        return;
      }

      // reverseGeocode/initialize can throw (maps not ready / network); fall back
      // to raw coordinates instead of leaving the user with a silent failure.
      let nextLocation = {
        address: locationService.formatCoordinates(coords.lat, coords.lng),
        lat: coords.lat,
        lng: coords.lng,
      };
      try {
        await mapsService.initialize();
        const resolved = await mapsService.reverseGeocode(coords.lat, coords.lng);
        if (resolved) {
          nextLocation = { address: resolved.address, lat: resolved.lat, lng: resolved.lng };
        }
      } catch (geocodeError) {
        console.warn('Reverse geocode failed, using raw coordinates:', geocodeError);
      }

      setCurrentLocation(nextLocation);
      setPickup(nextLocation);
    } catch (locationErr) {
      console.error('Location detection failed:', locationErr);
      setLocationError('Location unavailable');
    } finally {
      setIsDetectingLocation(false);
    }
  };

  const handlePopularRouteSelect = (route: PopularRoute) => {
    const defaultPickup = pickup || currentLocation || {
      address: 'Mumbai, Maharashtra, India',
      lat: 19.076,
      lng: 72.8777,
    };

    history.push('/find-ride', {
      pickup: defaultPickup,
      dropoff: route.location,
      passengerCount,
    });
  };

  const handleCompleteProfile = () => {
    setShowProfilePrompt(false);
    history.push('/profile', { openEditor: true, fromProfilePrompt: true });
  };

  const handleDismissProfilePrompt = () => {
    setShowProfilePrompt(false);
    setDismissedProfilePrompt(true);
    if (user?.id) {
      window.sessionStorage.setItem(profilePromptDismissKey(user.id), '1');
    }
  };

  const popularRoutes: PopularRoute[] = [
    {
      city: 'Mumbai',
      image: 'https://images.unsplash.com/photo-1567157577867-05ccb1388e66?w=400&h=300&fit=crop',
      startingPrice: 150,
      location: { address: 'Mumbai, Maharashtra, India', lat: 19.076, lng: 72.8777 },
    },
    {
      city: 'Pune',
      image: 'https://images.unsplash.com/photo-1595658658481-d53d3f999875?w=400&h=300&fit=crop',
      startingPrice: 120,
      location: { address: 'Pune, Maharashtra, India', lat: 18.5204, lng: 73.8567 },
    },
    {
      city: 'Delhi',
      image: 'https://images.unsplash.com/photo-1587474260584-136574528ed5?w=400&h=300&fit=crop',
      startingPrice: 200,
      location: { address: 'Delhi, India', lat: 28.6139, lng: 77.209 },
    },
  ];

  const greetingName = toGreetingName(user?.firstName, user?.fullName);

  if (!isAuthLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <img src="/logo-mark.png" alt="Blinkcar" className="h-16 w-16 animate-pulse rounded-[20px] object-cover shadow-glow" />
      </div>
    );
  }

  return (
    <div className="app-scroll-screen app-bottom-nav-safe relative overflow-hidden bg-white">
      {/* Grainy orange aura — weighted to the right (behind the car), light on
          the left so the dark greeting reads cleanly. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[460px]">
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(115% 72% at 84% -8%, rgba(255,107,0,0.5) 0%, rgba(255,160,30,0.2) 44%, rgba(255,255,255,0) 72%)' }}
        />
        <div className="absolute -right-16 -top-12 h-72 w-72 rounded-full animate-aurora-1" style={{ background: 'radial-gradient(circle, rgba(255,200,50,0.78) 0%, transparent 62%)', filter: 'blur(48px)' }} />
        <div className="absolute right-1/4 top-2 h-52 w-52 rounded-full animate-aurora-3" style={{ background: 'radial-gradient(circle, rgba(255,120,0,0.42) 0%, transparent 62%)', filter: 'blur(46px)' }} />
        <div className="absolute -left-24 top-16 h-56 w-56 rounded-full animate-aurora-2" style={{ background: 'radial-gradient(circle, rgba(255,185,70,0.28) 0%, transparent 62%)', filter: 'blur(52px)' }} />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="px-5 pb-2 pt-[calc(env(safe-area-inset-top)+12px)]">
          {/* Top row: brand + profile */}
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <img src="/logo-mark.png" alt="Blinkcar" className="h-10 w-10 rounded-[14px] object-cover shadow-glow" />
              <span className="font-display text-lg font-extrabold lowercase tracking-tight text-ink">blinkcar</span>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => history.push('/notifications')}
                className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-white/70 bg-white/50 text-ink shadow-soft backdrop-blur-sm transition active:scale-95"
                aria-label="Notifications"
                type="button"
              >
                <Bell size={20} strokeWidth={2.4} />
                {unreadCount > 0 && (
                  <span
                    className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 font-display text-[10px] font-extrabold text-white shadow-glow"
                    style={{ background: FIRE }}
                  >
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              <button
                onClick={() => history.push('/profile')}
                className="h-11 w-11 overflow-hidden rounded-2xl border border-white/70 bg-white/50 shadow-soft backdrop-blur-sm transition active:scale-95"
                aria-label="Open profile"
                type="button"
              >
                {user?.avatarUrl ? (
                  <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center font-display text-base font-extrabold text-fire-orange">
                    {greetingName.slice(0, 1).toUpperCase()}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Greeting + illustration */}
          <div className="flex items-end justify-between">
            <div className="pb-2">
              <p className="mb-0.5 font-display text-xs font-bold uppercase tracking-[0.2em] text-fire-orange">Welcome back</p>
              <h1 className="font-display text-[2rem] font-extrabold leading-[0.95] tracking-tight text-ink">
                Hi, {greetingName}
              </h1>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <button
                  onClick={handleDetectCurrentLocation}
                  className="flex items-center gap-1.5 rounded-full border border-white/70 bg-white/55 px-3 py-1.5 shadow-soft backdrop-blur-sm transition active:scale-95 disabled:opacity-75"
                  type="button"
                  disabled={isDetectingLocation}
                  aria-label="Use current location"
                  title={locationError || currentLocation?.address || 'Use current location'}
                >
                  <AppIcon name="map-pin" className="h-4 w-4" />
                  <span className="max-w-[160px] overflow-hidden text-ellipsis whitespace-nowrap font-display text-sm font-bold text-ink">
                    {isDetectingLocation
                      ? 'Detecting...'
                      : currentLocation
                        ? currentLocationLabel(currentLocation.address)
                        : 'Use location'}
                  </span>
                </button>
                <div className="flex items-center gap-1.5 rounded-full bg-fire-gold px-3 py-1.5 shadow-gold-glow">
                  <Star className="h-4 w-4 fill-ink text-ink" />
                  <span className="font-display text-sm font-extrabold text-ink">Lvl {userStats.level}</span>
                </div>
              </div>
            </div>

            <div className="-mb-1 -mr-1 flex-shrink-0">
              <img src="/home.png" alt="Car illustration" className="h-28 w-40 object-contain object-bottom drop-shadow-xl" />
            </div>
          </div>
        </div>

        {/* Main content */}
        <div className="mt-2 px-4">
          {/* Contextual: the ride you're most likely here to check — shown only
              when the user actually has an upcoming or active ride. */}
          {nextRide && (
            <button
              type="button"
              onClick={() => history.push(nextRide.status === 'active' ? `/rides/active/${nextRide.id}` : `/rides/detail/${nextRide.id}`)}
              className="mb-3 flex w-full items-center gap-3 rounded-2xl border border-primary-100 bg-white/90 p-3 text-left shadow-soft backdrop-blur-md transition active:scale-[0.99]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-glow" style={{ background: FIRE }}>
                <AppIcon name="car" className="h-5 w-5 text-white" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-[10px] font-bold uppercase tracking-[0.14em] text-fire-orange">
                  {nextRide.status === 'active' ? 'Ride in progress' : 'Your next trip'}
                </span>
                <span className="block truncate font-display text-sm font-bold text-ink">
                  {nextRide.startLocation.split(',')[0]} → {nextRide.endLocation.split(',')[0]}
                </span>
                <span className="block truncate text-xs font-medium text-ink/50">{nextRideMeta(nextRide)}</span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-ink/30" />
            </button>
          )}

          {/* Search & Route Card */}
          <div className="mb-4 rounded-[16px] border border-black/5 bg-white/80 p-4 shadow-strong backdrop-blur-md">
            {/* From/To Selection */}
            <div className="mb-3 grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-end gap-3">
              <div className="min-w-0">
                <label className="mb-1 block font-display text-[11px] font-bold uppercase tracking-wide text-ink/45">From</label>
                <button
                  onClick={() => history.push('/select-location', {
                    type: 'pickup',
                    returnTo: '/home',
                    pickup: pickup || undefined,
                    dropoff: dropoff || undefined,
                  })}
                  className="h-11 w-full min-w-0 rounded-xl border-2 border-primary-100 bg-primary-50/40 px-3 text-left transition-colors hover:border-primary-300"
                  title={pickup?.address || 'Pick Up'}
                >
                  <span className="block w-full overflow-hidden text-ellipsis whitespace-nowrap font-display font-bold text-primary-700">
                    {pickup?.address || 'Pick Up'}
                  </span>
                </button>
              </div>

              <button
                onClick={handleSwapLocations}
                className="mt-2.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary-100 bg-white shadow-soft transition-transform active:scale-90"
                aria-label="Swap locations"
              >
                <AppIcon name="swap" className="h-5 w-5" />
              </button>

              <div className="min-w-0">
                <label className="mb-1 block font-display text-[11px] font-bold uppercase tracking-wide text-ink/45">To</label>
                <button
                  onClick={() => history.push('/select-location', {
                    type: 'dropoff',
                    returnTo: '/home',
                    pickup: pickup || undefined,
                    dropoff: dropoff || undefined,
                  })}
                  className="h-11 w-full min-w-0 rounded-xl border-2 border-primary-100 bg-primary-50/40 px-3 text-left transition-colors hover:border-primary-300"
                  title={dropoff?.address || 'Drop Off'}
                >
                  <span className="block w-full overflow-hidden text-ellipsis whitespace-nowrap font-display font-bold text-primary-700">
                    {dropoff?.address || 'Drop Off'}
                  </span>
                </button>
              </div>
            </div>

            {/* Passengers + Date */}
            <div className="mb-3 space-y-2">
              <div className="flex items-center gap-2.5 rounded-xl border border-black/5 bg-paper p-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary-100 bg-white">
                  <AppIcon name="users" className="h-5 w-5" />
                </div>
                <span className="font-display text-[11px] font-bold uppercase tracking-wide text-ink/45">Seats</span>
                <div className="flex flex-1 items-center justify-end gap-3">
                  <button
                    onClick={() => setPassengerCount(Math.max(1, passengerCount - 1))}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 bg-white font-bold text-ink transition hover:bg-paper active:scale-90"
                  >
                    -
                  </button>
                  <span className="w-7 text-center font-display text-lg font-bold text-ink">{passengerCount.toString().padStart(2, '0')}</span>
                  <button
                    onClick={() => setPassengerCount(Math.min(6, passengerCount + 1))}
                    className="flex h-9 w-9 items-center justify-center rounded-xl border border-black/10 bg-white font-bold text-ink transition hover:bg-paper active:scale-90"
                  >
                    +
                  </button>
                </div>
              </div>
              <label className="flex items-center gap-2.5 rounded-xl border border-black/5 bg-paper p-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-primary-100 bg-white">
                  <AppIcon name="clock" className="h-5 w-5" />
                </div>
                <span className="font-display text-[11px] font-bold uppercase tracking-wide text-ink/45">Date</span>
                <input
                  type="date"
                  value={departureDate}
                  min={toLocalDateValue(new Date())}
                  onChange={(event) => setDepartureDate(event.target.value)}
                  className="ml-auto min-w-0 bg-transparent text-right font-display text-sm font-bold text-ink outline-none [color-scheme:light]"
                />
              </label>
            </div>

            {/* Find Drivers Button */}
            {searchError && (
              <p className="mb-2 text-center text-sm font-semibold text-fire-red">{searchError}</p>
            )}
            <button
              onClick={handleFindDrivers}
              className="grain grain-strong relative w-full overflow-hidden rounded-xl py-3 font-display text-base font-bold tracking-tight text-white shadow-glow transition-all hover:shadow-glow-lg active:scale-[0.98]"
              style={{ background: FIRE }}
            >
              Find Drivers
            </button>
            <button
              onClick={() => history.push('/rides')}
              className="mt-2 w-full rounded-xl border-2 border-primary-200 py-2.5 font-display font-bold text-primary-700 transition-colors hover:border-primary-300 hover:bg-primary-50"
            >
              View Your Rides
            </button>
          </div>

          {/* Active Ride Card */}
          {activeRide && (
            <div className="mb-4 rounded-[18px] border border-black/5 bg-white p-4 shadow-soft">
              <div className="mb-4 flex items-start gap-3">
                <div className="relative">
                  <div className="h-16 w-16 overflow-hidden rounded-2xl bg-paper-dim">
                    <img src={activeRide.driver?.avatar || 'https://via.placeholder.com/64'} alt="Driver" className="h-full w-full object-cover" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-fire-gold">
                    <Star className="h-3 w-3 fill-ink text-ink" />
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-display font-bold text-ink">{activeRide.driver?.name || 'Rahul S'}</h3>
                  <div className="flex items-center gap-1 text-fire-gold">
                    <Star className="h-4 w-4 fill-current" />
                    <span className="text-sm font-bold">{activeRide.driver?.rating || '4.9'}</span>
                  </div>
                  <p className="mt-1 font-medium text-primary-600">
                    Driver arriving in <span className="font-bold">3 mins</span>
                  </p>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-paper-dim">
                    <div className="h-full w-2/3 rounded-full" style={{ background: FIRE }} />
                  </div>
                </div>
              </div>

              <div className="mb-4 flex items-center gap-3 text-sm text-ink/60">
                <span>Pickup : {activeRide.startLocation}</span>
                <span className="text-ink/30">|</span>
                <span>Drop Off : {activeRide.endLocation}</span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button className="flex items-center justify-center gap-2 rounded-2xl py-2.5 font-display font-bold text-white" style={{ background: FIRE }}>
                  <Phone className="h-4 w-4" />
                  Call
                </button>
                <button className="flex items-center justify-center gap-2 rounded-2xl border-2 border-primary-300 py-2.5 font-display font-bold text-primary-600">
                  <MessageCircle className="h-4 w-4" />
                  Message
                </button>
                <button className="flex items-center justify-center gap-2 rounded-2xl bg-paper-dim py-2.5 font-display font-bold text-ink">
                  <Map className="h-4 w-4" />
                  Map
                </button>
              </div>
            </div>
          )}

          {/* Quick Actions Grid */}
          <div className="mb-7">
            <h2 className="mb-3 font-display text-lg font-extrabold tracking-tight text-ink">Quick actions</h2>
            <div className="grid grid-cols-4 gap-3">
              {([
                { onClick: () => history.push('/publish-ride'), label: 'Publish Ride', name: 'car' },
                { onClick: handleFindDrivers, label: 'Find Ride', name: 'search' },
                { onClick: () => history.push('/rewards'), label: 'Rewards', name: 'award' },
                { onClick: () => history.push('/rides'), label: 'Your Rides', name: 'route' },
              ] as { onClick: () => void; label: string; name: AppIconName }[]).map((action) => (
                <button key={action.label} onClick={action.onClick} className="flex flex-col items-center gap-2 transition active:scale-95">
                  <div className="flex h-16 w-16 items-center justify-center rounded-[14px] border border-primary-100/80 bg-gradient-to-br from-primary-50 to-white shadow-soft">
                    <AppIcon name={action.name} className="h-9 w-9" />
                  </div>
                  <span className="text-center font-display text-[11px] font-bold leading-tight text-ink/70">{action.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Popular Routes Section */}
          <div className="mb-7">
            <h2 className="mb-1 font-display text-2xl font-extrabold tracking-tight text-ink">Popular routes</h2>
            <p className="mb-4 text-sm font-medium text-ink/50">Top picks for your next trip</p>

            <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
              {popularRoutes.map((route) => (
                <button
                  key={route.city}
                  type="button"
                  className="w-44 flex-shrink-0 overflow-hidden rounded-[16px] border border-black/5 bg-white text-left shadow-soft transition active:scale-95"
                  onClick={() => handlePopularRouteSelect(route)}
                  aria-label={`Find rides to ${route.city}`}
                >
                  <div className="relative h-32 w-full overflow-hidden">
                    <img src={route.image} alt={route.city} className="h-full w-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-ink/65 via-transparent to-transparent" />
                    <div className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-full bg-white/85 py-1 pl-1.5 pr-2.5 backdrop-blur-sm">
                      <AppIcon name="map-pin" className="h-3.5 w-3.5" />
                      <span className="font-display text-[11px] font-bold text-ink">{route.city}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between px-3.5 py-3">
                    <div>
                      <p className="font-display text-[10px] font-bold uppercase tracking-wide text-ink/40">Starting at</p>
                      <p className="font-display text-xl font-extrabold leading-none text-ink">₹{route.startingPrice}</p>
                    </div>
                    <span className="font-display text-xl font-extrabold text-primary-500">→</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Promotional Banner */}
          <div className="relative mb-4 overflow-hidden rounded-[18px] border border-black/5 bg-white p-4 shadow-soft">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <h3 className="mb-1.5 font-display text-2xl font-extrabold leading-[0.95] tracking-tight text-ink">Earn while<br />you travel</h3>
                <p className="mb-4 text-sm font-medium text-ink/55">Get 2x points on your first 3 rides this month</p>
                <button
                  onClick={() => history.push('/rewards')}
                  className="rounded-2xl px-5 py-2.5 font-display text-sm font-bold text-white shadow-glow transition hover:brightness-105 active:scale-95"
                  style={{ background: FIRE }}
                >
                  See Rewards
                </button>
              </div>
              <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl border border-primary-100 bg-gradient-to-br from-primary-50 to-white shadow-soft">
                <img src="/icons/award.png" alt="" aria-hidden className="h-12 w-12" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {showProfilePrompt && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/40 px-4 pb-8 backdrop-blur-sm sm:items-center sm:pb-0">
          <div className="w-full max-w-md rounded-[18px] border border-black/5 bg-white p-4 shadow-strong" aria-modal="true" role="dialog">
            <h2 className="font-display text-2xl font-extrabold tracking-tight text-ink">Complete your profile</h2>
            <p className="mt-2 text-sm text-ink/60">
              Add your name, email, and mobile number to finish setup and make your account easier to identify.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <button
                onClick={handleDismissProfilePrompt}
                className="flex-1 rounded-2xl border border-black/10 px-4 py-3 font-display text-sm font-bold text-ink/70 transition hover:bg-paper"
                type="button"
              >
                Later
              </button>
              <button
                onClick={handleCompleteProfile}
                className="flex-1 rounded-2xl px-4 py-3 font-display text-sm font-bold text-white shadow-glow transition hover:brightness-105"
                style={{ background: FIRE }}
                type="button"
              >
                Complete now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
