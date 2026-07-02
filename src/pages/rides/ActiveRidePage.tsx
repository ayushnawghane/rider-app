import { IonContent, IonPage, IonToast } from '@ionic/react';
import LoadingOverlay from '../../components/LoadingOverlay';
import { useCallback, useEffect, useState } from 'react';
import { useParams, useHistory } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { rideService, locationService, mapsService, liveLocationService } from '../../services';
import { supabase } from '../../lib/supabase';
import { MapComponent } from '../../components/maps';
import {
  Phone,
  MessageSquare,
  ShieldAlert,
  MapPin,
  Navigation,
  Car,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Target,
  ChevronLeft,
  Users,
} from 'lucide-react';
import type { Ride } from '../../types';

interface PassengerBooking {
  id: string;
  passenger_id?: string;
  passenger?: {
    id?: string;
    full_name?: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
    phone?: string;
    rating_as_passenger?: number;
  } | null;
  seats_booked?: number;
  status?: string;
}

const FIRE = 'linear-gradient(100deg, var(--fire-red), var(--fire-amber))';

const getMarkerIcon = (type: 'pickup' | 'drop' | 'driver' | 'user'): google.maps.Icon | undefined => {
  if (typeof window === 'undefined' || !window.google) return undefined;

  const baseSVG = `data:image/svg+xml;charset=UTF-8,`;
  switch (type) {
    case 'pickup':
      return {
        url: baseSVG + encodeURIComponent(`<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="16" r="12" fill="#10B981" fill-opacity="0.2"/><circle cx="16" cy="16" r="6" fill="#10B981"/><circle cx="16" cy="16" r="2" fill="white"/></svg>`),
        anchor: new google.maps.Point(16, 16),
      };
    case 'drop':
      return {
        url: baseSVG + encodeURIComponent(`<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="10" width="12" height="12" fill="#EF4444"/><rect x="14" y="14" width="4" height="4" fill="white"/></svg>`),
        anchor: new google.maps.Point(16, 16),
      };
    case 'driver':
      return {
        url: '/car-sedan.png',
        scaledSize: new google.maps.Size(48, 48),
        anchor: new google.maps.Point(24, 24),
      };
    case 'user':
      return {
        url: baseSVG + encodeURIComponent(`<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" fill="#3B82F6" fill-opacity="0.2"/><circle cx="12" cy="12" r="6" fill="#3B82F6"/><circle cx="12" cy="12" r="2" fill="white"/></svg>`),
        anchor: new google.maps.Point(12, 12),
      };
  }
};

const ActiveRidePage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const history = useHistory();

  const [ride, setRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [routePath, setRoutePath] = useState<Array<{ lat: number; lng: number }>>([]);
  const [isAutoRecenter, setIsAutoRecenter] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [eta, setEta] = useState<string>('');
  const [passengerBookings, setPassengerBookings] = useState<PassengerBooking[]>([]);
  const [passengerListError, setPassengerListError] = useState<string | null>(null);

  // Driver Controls State
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const isDriver = user?.id === ride?.userId || Boolean(ride?.driverId && user?.id === ride?.driverId);

  const fetchRide = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    const result = await rideService.getRideById(id);
    if (result.success && result.ride) {
      setRide(result.ride);

      // Calculate route if coordinates are available
      if (result.ride.startLocationCoords && result.ride.endLocationCoords) {
        const route = await mapsService.calculateRoute(
          { lat: result.ride.startLocationCoords.lat, lng: result.ride.startLocationCoords.lng },
          { lat: result.ride.endLocationCoords.lat, lng: result.ride.endLocationCoords.lng }
        );

        if (route) {
          const decodedPath = mapsService.decodePolyline(route.polyline);
          setRoutePath(decodedPath);
          setEta(route.duration);
        }
      }
      if (user && (result.ride.userId === user.id || result.ride.driverId === user.id)) {
        const bookingsResult = await rideService.getRideParticipants(result.ride.id);
        if (bookingsResult.success) {
          setPassengerBookings((bookingsResult.bookings || []) as PassengerBooking[]);
          setPassengerListError(null);
        } else {
          setPassengerBookings([]);
          setPassengerListError(bookingsResult.error || 'Unable to load passengers');
        }
      } else {
        setPassengerBookings([]);
        setPassengerListError(null);
      }
    }
    setLoading(false);
  }, [id, user]);

  // Fetch ride details
  useEffect(() => {
    void fetchRide(true);
  }, [fetchRide]);

  // Keep scheduled ride status current while the ride console is open.
  useEffect(() => {
    if (!ride || ride.status === 'completed' || ride.status === 'cancelled') return;

    const interval = setInterval(() => {
      void fetchRide(false);
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchRide, ride]);

  // Start location tracking + live_locations publishing + Realtime subscription
  useEffect(() => {
    if (!ride || !user) return;
    let cancelled = false;
    let locationPublishInterval: ReturnType<typeof setInterval> | null = null;
    let latestPosition: {
      lat: number;
      lng: number;
      accuracy?: number;
        } | null = null;

    const publish = (pos: {
      lat: number;
      lng: number;
      accuracy?: number;
        }) => {
      latestPosition = pos;
      void liveLocationService.publishLocation({
        rideId: ride.id,
        userId: user.id,
        lat: pos.lat,
        lng: pos.lng,
        accuracy: pos.accuracy,
          });
    };

    const startTracking = async () => {
      // Initial fetch of the latest known location(s) for the other participant(s)
      const others = await liveLocationService.getLatestOtherLocations(ride.id, user.id);
      if (others.length > 0) {
        setDriverLocation({ lat: others[0].lat, lng: others[0].lng });
      }

      // Get initial location + publish immediately
      const position = await locationService.getCurrentPosition();
      if (position) {
        setCurrentLocation({ lat: position.lat, lng: position.lng });
        publish({
          lat: position.lat,
          lng: position.lng,
          accuracy: position.accuracy,
            });
      }

      // Watch position + publish each fresh fix
      await locationService.startWatching(
        (pos) => {
          setCurrentLocation({ lat: pos.lat, lng: pos.lng });
          publish({
            lat: pos.lat,
            lng: pos.lng,
            accuracy: pos.accuracy,
          });
        },
        (error) => {
          console.error('Location tracking error:', error);
        }
      );

      // If the component unmounted while startWatching was resolving, the
      // cleanup already ran and would have missed this watch — stop it now so
      // we don't leak a GPS watcher that setStates on an unmounted component.
      if (cancelled) locationService.stopWatching();

      // Backup: re-publish the latest known location every 10s without
      // triggering a fresh getCurrentPosition lookup.
      locationPublishInterval = setInterval(() => {
        if (latestPosition) {
          publish(latestPosition);
        }
      }, 10000);
    };

    startTracking();

    // Subscribe to live location changes (INSERT + UPDATE) for other participants
    const channel = liveLocationService.subscribeToRideLocations(ride.id, user.id, (location) => {
      setDriverLocation({ lat: location.lat, lng: location.lng });
    });

    return () => {
      cancelled = true;
      locationService.stopWatching();
      if (locationPublishInterval) clearInterval(locationPublishInterval);
      supabase.removeChannel(channel);
    };
    // Only re-run when the ride or user identity changes — not on every 30s
    // poll that replaces the `ride` object, which would churn the GPS watcher
    // and realtime channel.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ride?.id, user?.id]);

  const handleContactDriver = () => {
    if (ride?.driverContact) {
      window.location.href = `tel:${ride.driverContact}`;
    } else {
      setToastMessage('Driver contact not available');
      setShowToast(true);
    }
  };

  const handleContactPassenger = (phone?: string) => {
    if (phone) {
      window.location.href = `tel:${phone}`;
    } else {
      setToastMessage('Passenger contact not available');
      setShowToast(true);
    }
  };

  const getPassengerName = (booking: PassengerBooking) => {
    const passenger = booking.passenger;
    if (!passenger) return 'Passenger';
    const combinedName = [passenger.first_name, passenger.last_name].filter(Boolean).join(' ').trim();
    return passenger.full_name || combinedName || 'Passenger';
  };

  const handleContactSupport = () => {
    history.push('/support');
  };

  const handleSOS = () => {
    history.push(`/safety/sos?rideId=${id}`);
  };

  const handleRecenter = () => {
    setIsAutoRecenter(true);
    setToastMessage('Map recentered');
    setShowToast(true);
  };

  const handleUpdateStatus = async (status: 'active' | 'completed' | 'cancelled') => {
    if (!ride) return;
    setIsUpdatingStatus(true);
    const result = await rideService.updateRideStatus(ride.id, status);
    setIsUpdatingStatus(false);

    if (result.success) {
      setToastMessage(`Trip ${status} successfully`);
      setShowToast(true);
      setRide(prev => prev ? { ...prev, status } : null);

      if (status === 'completed' || status === 'cancelled') {
        setTimeout(() => history.push('/home'), 2000);
      }
    } else {
      setToastMessage(result.error || `Failed to ${status} trip`);
      setShowToast(true);
    }
  };

  const getStatusStep = (status: string) => {
    const steps = [
      { id: 'pending', label: 'Driver Assigned', icon: Car },
      { id: 'active', label: 'On the way', icon: Navigation },
      { id: 'arrived', label: 'Arrived', icon: MapPin },
      { id: 'completed', label: 'Completed', icon: CheckCircle2 },
    ];

    const currentIndex = steps.findIndex(s => s.id === status);
    return { steps, currentIndex };
  };

  // Prepare markers
  const markers = [
    ...(ride?.startLocationCoords ? [{
      position: { lat: ride.startLocationCoords.lat, lng: ride.startLocationCoords.lng },
      title: 'Pickup',
      icon: getMarkerIcon('pickup'),
    }] : []),
    ...(ride?.endLocationCoords ? [{
      position: { lat: ride.endLocationCoords.lat, lng: ride.endLocationCoords.lng },
      title: 'Drop',
      icon: getMarkerIcon('drop'),
    }] : []),
    ...(driverLocation ? [{
      position: driverLocation,
      title: 'Co-rider',
      icon: getMarkerIcon('driver'),
    }] : []),
    ...(currentLocation ? [{
      position: currentLocation,
      title: 'You',
      icon: getMarkerIcon('user'),
    }] : []),
  ];

  const mapCenter = isAutoRecenter && currentLocation
    ? currentLocation
    : ride?.startLocationCoords || { lat: 28.6139, lng: 77.2090 };

  if (loading) {
    return (
      <IonPage>
        <IonContent>
          <LoadingOverlay isOpen variant="fullscreen" message="Loading ride details..." />
        </IonContent>
      </IonPage>
    );
  }

  if (!ride) {
    return (
      <IonPage>
        <IonContent>
          <div className="app-top-safe mx-auto max-w-2xl px-4 pb-6 pt-6">
            <div className="rounded-[18px] border border-black/5 bg-white p-4 text-center shadow-soft">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-fire-red/10">
                <AlertTriangle className="h-10 w-10 text-fire-red" />
              </div>
              <h2 className="mt-3 app-section-title">Ride not found</h2>
              <p className="mt-2 text-sm font-medium text-ink/50">The ride you're looking for doesn't exist.</p>
              <button
                onClick={() => history.push('/home')}
                className="grain grain-strong relative mt-4 w-full overflow-hidden rounded-2xl py-3.5 font-display font-bold text-white shadow-glow transition active:scale-[0.98]"
                style={{ background: FIRE }}
              >
                Go Home
              </button>
            </div>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const { steps, currentIndex } = getStatusStep(ride.status);

  return (
    <IonPage>
      <IonContent>
        <div className="app-scroll-screen flex flex-col bg-white">
          {/* Header */}
          <div className="z-10 flex items-center gap-3 border-b border-black/5 bg-white/90 px-4 py-3 backdrop-blur-md pt-[calc(env(safe-area-inset-top)+12px)]">
            <button
              onClick={() => history.goBack()}
              aria-label="Back"
              className="flex h-10 w-10 items-center justify-center rounded-2xl border border-black/10 bg-white text-ink shadow-soft transition active:scale-95"
            >
              <ChevronLeft size={22} strokeWidth={2.5} />
            </button>
            <div className="min-w-0">
              <h1 className="font-display text-lg font-extrabold tracking-tight text-ink">Active ride</h1>
              <p className="truncate text-xs font-medium text-ink/50">{ride.vehicleType} • {ride.vehicleNumber}</p>
            </div>
          </div>

          {/* Map Section */}
          <div className="flex-1 relative">
            <MapComponent
              center={mapCenter}
              markers={markers}
              routePath={routePath}
              fitBounds={false}
              className="h-full"
            />

            {/* Recenter Button */}
            <button
              onClick={handleRecenter}
              className="absolute right-4 top-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-black/5 bg-white text-fire-orange shadow-strong transition active:scale-95"
            >
              <Target className="h-6 w-6" />
            </button>

            {/* ETA Card */}
            {eta && (
              <div className="absolute left-4 top-4 rounded-2xl border border-black/5 bg-white px-4 py-2.5 shadow-strong">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-fire-orange" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-ink/40">ETA</p>
                    <p className="font-display font-bold text-ink">{eta}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Sheet */}
          <div className="relative z-10 -mt-4 flex max-h-[60vh] flex-col rounded-t-[28px] border-t border-black/5 bg-white shadow-strong">
            {/* Handle bar */}
            <div className="flex flex-shrink-0 justify-center pb-2 pt-3">
              <div className="h-1 w-12 rounded-full bg-ink/15" />
            </div>

            <div className="app-bottom-nav-safe flex-1 overflow-y-auto px-4">

              {/* Driver & Vehicle Profile */}
              <div className="mb-4 flex items-center border-b border-black/5 pb-4">
                <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-2xl border-2 border-white bg-paper-dim shadow-soft">
                  <img src={ride.driver?.avatar || `https://ui-avatars.com/api/?name=${isDriver ? user?.fullName || 'Driver' : (ride.driver?.name || 'Driver')}&background=random`} alt="Driver" className="h-full w-full object-cover" />
                </div>
                <div className="ml-4 min-w-0 flex-1">
                  <h3 className="truncate font-display text-base font-bold text-ink">{isDriver ? 'You (Driver)' : (ride.driver?.name || 'Your Driver')}</h3>
                  <div className="mt-0.5 flex items-center text-sm text-ink/50">
                    <span className="flex flex-shrink-0 items-center gap-1 font-bold text-fire-gold">★ {ride.driver?.rating ? ride.driver.rating.toFixed(1) : '4.9'}</span>
                    <span className="mx-2 flex-shrink-0">•</span>
                    <span className="truncate font-medium">{ride.vehicleType}</span>
                  </div>
                </div>
                <div className="flex-shrink-0 text-right">
                  <div className="rounded-xl border border-black/5 bg-paper px-3 py-1.5">
                    <span className="font-display text-sm font-bold tracking-wide text-ink">{ride.vehicleNumber}</span>
                  </div>
                </div>
              </div>

              {/* Status Timeline */}
              <div className="mb-4">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-display text-xs font-bold uppercase tracking-[0.18em] text-ink/55">Ride status</h3>
                  <span className="rounded-md bg-primary-50 px-2 py-1 font-display text-xs font-bold text-primary-700">
                    {ride.status.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-start justify-between">
                  {steps.map((step, index) => {
                    const Icon = step.icon;
                    const isCompleted = index <= currentIndex;
                    const isCurrent = index === currentIndex;

                    return (
                      <div key={step.id} className="relative flex flex-1 flex-col items-center">
                        <div
                          className={`z-10 mb-2 flex h-10 w-10 items-center justify-center rounded-full transition-all ${
                            isCompleted ? 'text-white shadow-glow' : 'bg-paper-dim text-ink/35'
                          } ${isCurrent ? 'scale-110 ring-4 ring-[rgba(255,107,0,0.18)]' : ''}`}
                          style={isCompleted ? { background: FIRE } : undefined}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <span className={`text-center text-[10px] uppercase tracking-wider ${isCompleted ? 'font-bold text-ink' : 'font-semibold text-ink/35'}`}>
                          {step.label}
                        </span>
                        {index < steps.length - 1 && (
                          <div className={`absolute left-1/2 top-4 -z-0 h-1 w-full rounded-r-full transition-all ${isCompleted ? 'bg-fire-amber' : 'bg-paper-dim'}`} style={{ width: '100%' }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Passenger List */}
              {isDriver && (
                <div className="mb-4 rounded-2xl border border-black/5 bg-white p-4 shadow-soft">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-fire-orange/10 text-fire-orange">
                        <Users className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-display text-sm font-extrabold tracking-tight text-ink">Passengers</h3>
                        <p className="text-xs font-medium text-ink/45">
                          {passengerBookings.length > 0
                            ? `${passengerBookings.length} booking${passengerBookings.length > 1 ? 's' : ''} • ${passengerBookings.reduce((total, booking) => total + (booking.seats_booked || 1), 0)} seat${passengerBookings.reduce((total, booking) => total + (booking.seats_booked || 1), 0) > 1 ? 's' : ''}`
                            : 'No passengers yet'}
                        </p>
                      </div>
                    </div>
                    <span className="rounded-lg bg-paper px-2.5 py-1 font-display text-xs font-bold text-ink/55">
                      {ride.bookedSeats}/{ride.availableSeats}
                    </span>
                  </div>

                  {passengerListError && (
                    <div className="rounded-2xl border border-fire-red/20 bg-fire-red/5 px-3 py-2 text-xs font-semibold text-fire-red">
                      {passengerListError}
                    </div>
                  )}

                  {!passengerListError && passengerBookings.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-black/10 bg-paper px-4 py-5 text-center">
                      <p className="font-display text-sm font-bold text-ink/70">No passengers have joined yet.</p>
                      <p className="mt-1 text-xs font-medium text-ink/45">New passenger bookings will appear here.</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    {passengerBookings.map((booking) => {
                      const name = getPassengerName(booking);
                      const phone = booking.passenger?.phone;
                      return (
                        <div key={booking.id} className="flex items-center gap-3 rounded-2xl border border-black/5 bg-paper p-3">
                          <img
                            src={booking.passenger?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`}
                            alt={name}
                            className="h-11 w-11 shrink-0 rounded-2xl object-cover"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="truncate font-display text-sm font-bold text-ink">{name}</p>
                            <p className="text-xs font-medium text-ink/45">
                              {booking.seats_booked || 1} seat{(booking.seats_booked || 1) > 1 ? 's' : ''} • {booking.status || 'booked'}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleContactPassenger(phone)}
                            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-fire-orange shadow-soft transition active:scale-95 disabled:opacity-50"
                            disabled={!phone}
                            aria-label={`Call ${name}`}
                          >
                            <Phone className="h-5 w-5" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Location Details */}
              <div className="mb-4 rounded-2xl border border-black/5 bg-paper p-4">
                <div className="space-y-2">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-black/5 bg-white shadow-sm">
                      <div className="h-2.5 w-2.5 rounded-full bg-fire-orange" />
                    </div>
                    <div>
                      <p className="mb-0.5 text-[11px] font-bold uppercase tracking-wide text-ink/40">Pickup</p>
                      <p className="font-display font-bold leading-tight text-ink">{ride.startLocation}</p>
                    </div>
                  </div>
                  <div className="ml-4 h-5 w-0.5 bg-gradient-to-b from-fire-orange to-fire-gold" />
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-black/5 bg-white shadow-sm">
                      <div className="h-2.5 w-2.5 rounded-sm bg-fire-gold" />
                    </div>
                    <div>
                      <p className="mb-0.5 text-[11px] font-bold uppercase tracking-wide text-ink/40">Dropoff</p>
                      <p className="font-display font-bold leading-tight text-ink">{ride.endLocation}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid gap-3">
                {isDriver && !['completed', 'cancelled'].includes(ride.status) && (
                  <div className="mb-2 flex flex-col gap-3">
                    {ride.status === 'pending' ? (
                      <div className="rounded-2xl border border-fire-gold/30 bg-fire-gold/15 px-4 py-3 font-display text-sm font-bold text-[#9a5b00]">
                        Awaiting Departure
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowEndConfirm(true)}
                        disabled={isUpdatingStatus}
                        className="grain grain-strong relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl py-3.5 font-display font-bold text-white shadow-glow transition active:scale-[0.98] disabled:opacity-50"
                        style={{ background: FIRE }}
                      >
                        <CheckCircle2 className="h-5 w-5" /> Complete Trip
                      </button>
                    )}
                    <button
                      onClick={() => setShowCancelConfirm(true)}
                      disabled={isUpdatingStatus}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-fire-red/30 bg-white py-3.5 font-display font-bold text-fire-red transition hover:bg-fire-red/5 active:scale-[0.98] disabled:opacity-50"
                    >
                      <AlertTriangle className="h-5 w-5" /> Cancel Trip
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-3">
                  {!isDriver && (
                    <button
                      onClick={handleContactDriver}
                      className="flex flex-col items-center justify-center rounded-2xl border border-black/5 bg-white py-3 shadow-soft transition active:scale-95"
                    >
                      <Phone className="mb-1 h-5 w-5 text-fire-orange" />
                      <span className="font-display text-xs font-bold text-ink/70">Call Driver</span>
                    </button>
                  )}
                  <button
                    onClick={handleContactSupport}
                    className={`flex flex-col items-center justify-center rounded-2xl border border-black/5 bg-white py-3 shadow-soft transition active:scale-95 ${isDriver ? 'col-span-1' : ''}`}
                  >
                    <MessageSquare className="mb-1 h-5 w-5 text-fire-orange" />
                    <span className="font-display text-xs font-bold text-ink/70">Support</span>
                  </button>
                  <button
                    onClick={handleSOS}
                    className={`flex flex-col items-center justify-center rounded-2xl border border-fire-red/15 bg-fire-red/5 py-3 transition active:scale-95 ${isDriver ? 'col-span-2' : ''}`}
                  >
                    <ShieldAlert className="mb-1 h-5 w-5 text-fire-red" />
                    <span className="font-display text-xs font-bold text-fire-red">Emergency SOS</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Custom Tailwind Confirmation Modals */}
        {showEndConfirm && (
          <div className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-ink/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-[18px] border border-black/5 bg-white p-4 shadow-strong">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-glow" style={{ background: FIRE }}>
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <h2 className="mb-2 text-center app-section-title">Complete Trip</h2>
              <p className="mb-4 text-center text-sm font-medium text-ink/55">Are you sure you want to end this trip? This will mark the ride as successfully completed.</p>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setShowEndConfirm(false)} className="rounded-2xl border-2 border-black/10 bg-white py-3 font-display font-bold text-ink/70 transition hover:bg-paper">Go Back</button>
                <button onClick={() => { setShowEndConfirm(false); handleUpdateStatus('completed'); }} className="grain grain-strong relative overflow-hidden rounded-2xl py-3 font-display font-bold text-white shadow-glow transition active:scale-[0.98]" style={{ background: FIRE }}>Complete Trip</button>
              </div>
            </div>
          </div>
        )}

        {showCancelConfirm && (
          <div className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-ink/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-sm rounded-[18px] border border-black/5 bg-white p-4 shadow-strong">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-fire-red/10">
                <AlertTriangle className="h-7 w-7 text-fire-red" />
              </div>
              <h2 className="mb-2 text-center app-section-title">Cancel Trip</h2>
              <p className="mb-4 text-center text-sm font-medium text-ink/55">Are you sure you want to cancel this trip? This action cannot be undone.</p>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setShowCancelConfirm(false)} className="rounded-2xl border-2 border-black/10 bg-white py-3 font-display font-bold text-ink/70 transition hover:bg-paper">Go Back</button>
                <button onClick={() => { setShowCancelConfirm(false); handleUpdateStatus('cancelled'); }} className="rounded-2xl py-3 font-display font-bold text-white shadow-strong transition active:scale-[0.98]" style={{ background: 'linear-gradient(135deg, #FF3D00 0%, #D81E00 100%)' }}>Cancel Trip</button>
              </div>
            </div>
          </div>
        )}

        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={3000}
          position="bottom"
        />
      </IonContent>
    </IonPage>
  );
};

export default ActiveRidePage;
