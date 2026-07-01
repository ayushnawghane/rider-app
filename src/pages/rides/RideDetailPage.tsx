import { IonContent, IonPage } from '@ionic/react';
import { useEffect, useState } from 'react';
import { useParams, useHistory, useLocation } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { locationService, rideService, mapsService } from '../../services';
import { MapComponent } from '../../components/maps';
import {
  Phone,
  MessageSquare,
  ShieldAlert,
  Navigation,
  Calendar,
  Car,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Route,
  ChevronLeft,
} from 'lucide-react';
import type { Ride } from '../../types';
import { hasRequiredBookingProfile } from '../../utils/profileCompletion';
import AppIcon from '../../components/icons/AppIcon';
import { Skeleton, SkeletonCard } from '../../components/Skeleton';

const FIRE = 'linear-gradient(100deg, var(--fire-red), var(--fire-amber))';
const ALERT = 'linear-gradient(100deg, #D81E00, #FF3D00)';

interface RideDetailLocationState {
  passengerCount?: number;
}

const RideDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [ride, setRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [isJoined, setIsJoined] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinSuccessMessage, setJoinSuccessMessage] = useState<string | null>(null);
  const [routePath, setRoutePath] = useState<Array<{ lat: number; lng: number }>>([]);
  const history = useHistory();
  const location = useLocation<RideDetailLocationState>();
  const passengerCount = Math.max(1, location.state?.passengerCount ?? 1);
  const [routeMeta, setRouteMeta] = useState<{ distanceKm: number; durationMinutes: number } | null>(null);

  useEffect(() => {
    const fetchRide = async () => {
      setLoading(true);
      setJoinError(null);
      setJoinSuccessMessage(null);
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
            setRouteMeta({
              distanceKm: Math.round((route.distanceValue / 1000) * 10) / 10,
              durationMinutes: Math.max(1, Math.round(route.durationValue / 60)),
            });
          } else {
            const fallbackDistance = locationService.calculateDistance(
              result.ride.startLocationCoords.lat,
              result.ride.startLocationCoords.lng,
              result.ride.endLocationCoords.lat,
              result.ride.endLocationCoords.lng,
            );
            setRouteMeta({
              distanceKm: Math.round(fallbackDistance * 10) / 10,
              durationMinutes: Math.max(1, Math.round((fallbackDistance / 45) * 60)),
            });
          }
        }

        if (user && result.ride.userId !== user.id) {
          const participation = await rideService.getRideParticipation(result.ride.id, user.id);
          if (participation.success) {
            setIsJoined(participation.joined);
          }
        } else {
          setIsJoined(false);
        }
      }
      setLoading(false);
    };

    fetchRide();
  }, [id, user]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleContactDriver = () => {
    if (ride?.driverContact) {
      window.location.href = `tel:${ride.driverContact}`;
    }
  };

  const handleRaiseDispute = () => {
    history.push(`/support/dispute/new?rideId=${ride?.id}`);
  };

  const handleSOS = () => {
    history.push(`/safety/sos?rideId=${ride?.id}`);
  };

  const handleJoinRide = async () => {
    if (!ride || !user) {
      setJoinError('Please log in to join this ride.');
      return;
    }

    if (!hasRequiredBookingProfile(user)) {
      setJoinError('Complete your name, email, and mobile number before booking a ride.');
      return;
    }

    setJoinError(null);
    setJoinSuccessMessage(null);
    setIsJoining(true);

    try {
      const result = await rideService.joinRide({
        rideId: ride.id,
        userId: user.id,
        seatsBooked: passengerCount,
      });

      if (!result.success) {
        setJoinError(result.error || 'Unable to join ride right now.');
        return;
      }

      setIsJoined(true);
      setJoinSuccessMessage('Ride joined successfully. You earned +50 reward points.');
    } finally {
      setIsJoining(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      active: { icon: CheckCircle2, label: 'Ride Confirmed', cls: 'bg-fire-orange text-white shadow-glow' },
      pending: { icon: AlertTriangle, label: 'Awaiting Departure', cls: 'bg-fire-gold/25 text-[#9a5b00]' },
      completed: { icon: CheckCircle2, label: 'Completed', cls: 'bg-ink/8 text-ink/55' },
      cancelled: { icon: AlertTriangle, label: 'Cancelled', cls: 'bg-fire-red/12 text-fire-red' },
    };
    return statusMap[status as keyof typeof statusMap] || statusMap.pending;
  };

  // Prepare markers for map
  const markers = ride ? [
    ...(ride.startLocationCoords ? [{
      position: { lat: ride.startLocationCoords.lat, lng: ride.startLocationCoords.lng },
      title: 'Pickup',
    }] : []),
    ...(ride.endLocationCoords ? [{
      position: { lat: ride.endLocationCoords.lat, lng: ride.endLocationCoords.lng },
      title: 'Drop',
    }] : []),
  ] : [];

  // Calculate map center
  const mapCenter = ride?.startLocationCoords || { lat: 28.6139, lng: 77.2090 };

  const BackBar = () => (
    <button
      onClick={() => history.goBack()}
      className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white/70 py-2 pl-2.5 pr-4 font-display text-sm font-bold text-ink shadow-soft backdrop-blur-sm transition active:scale-95"
      type="button"
    >
      <ChevronLeft className="h-4 w-4" strokeWidth={2.75} />
      Back
    </button>
  );

  if (loading) {
    return (
      <IonPage>
        <IonContent>
          <div className="app-top-safe mx-auto max-w-2xl px-4 pb-6 pt-5">
            <div className="space-y-4">
              <Skeleton variant="rounded" height="32px" width="75%" />
              <SkeletonCard hasImage lines={2} />
            </div>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (!ride) {
    return (
      <IonPage>
        <IonContent>
          <div className="app-top-safe relative min-h-full overflow-hidden bg-white">
            <div className="relative z-10 mx-auto max-w-2xl px-4 pb-6 pt-5">
              <BackBar />
              <div className="rounded-[28px] border border-black/5 bg-white p-8 text-center shadow-soft">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-fire-red/10">
                  <AlertTriangle className="h-10 w-10 text-fire-red" />
                </div>
                <h2 className="mt-5 font-display text-2xl font-extrabold tracking-tight text-ink">Ride not found</h2>
                <p className="mt-2 text-sm font-medium text-ink/50">
                  The ride you're looking for doesn't exist or has been deleted.
                </p>
              </div>
            </div>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const status = getStatusBadge(ride.status);
  const hasMapData = markers.length > 0;
  const canJoinRide = !!user && ride.userId !== user.id && ['pending', 'active'].includes(ride.status);

  return (
    <IonPage>
      <IonContent>
        <div className="app-top-safe relative min-h-full overflow-hidden bg-white">
          {/* Grainy orange aura, right-weighted */}
          <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[320px]">
            <div
              className="absolute inset-0"
              style={{ background: 'radial-gradient(120% 72% at 82% -10%, rgba(255,107,0,0.4) 0%, rgba(255,160,30,0.15) 46%, rgba(255,255,255,0) 74%)' }}
            />
            <div className="absolute -right-16 -top-12 h-72 w-72 rounded-full animate-aurora-1" style={{ background: 'radial-gradient(circle, rgba(255,200,50,0.62) 0%, transparent 62%)', filter: 'blur(48px)' }} />
          </div>

          <div className="relative z-10 mx-auto max-w-2xl px-4 pb-6 pt-5">
            <BackBar />

            <div className="app-bottom-nav-safe space-y-5">
              {/* Map Section */}
              {hasMapData && (
                <div className="overflow-hidden rounded-[26px] border border-black/5 bg-white shadow-soft">
                  <div className="h-64">
                    <MapComponent
                      center={mapCenter}
                      markers={markers}
                      routePath={routePath}
                      fitBounds={true}
                    />
                  </div>
                  <div className="flex items-center gap-2 border-t border-black/5 p-4 text-sm font-medium text-ink/55">
                    <Route className="h-4 w-4 text-fire-orange" />
                    <span>
                      Route snapshot • {routeMeta?.distanceKm || ride.distance
                        ? `${routeMeta?.distanceKm || ride.distance} km`
                        : 'Distance unavailable'}
                    </span>
                  </div>
                </div>
              )}

              {/* Details Card */}
              <div className="animate-fade-in rounded-[28px] border border-black/5 bg-white p-6 shadow-soft">
                <div className="mb-6 flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary-100 bg-gradient-to-br from-primary-50 to-white">
                    <AppIcon name="car" className="h-7 w-7" />
                  </div>
                  <div>
                    <h1 className="font-display text-xl font-extrabold tracking-tight text-ink">Ride details</h1>
                    <span className={`mt-1.5 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-display text-[11px] font-bold ${status.cls}`}>
                      <status.icon className="h-3.5 w-3.5" />
                      {status.label}
                    </span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Calendar className="mt-0.5 h-5 w-5 shrink-0 text-ink/35" />
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-ink/40">Date & time</p>
                      <p className="font-display font-bold text-ink">{formatDate(ride.date)}</p>
                    </div>
                  </div>

                  {/* From / To timeline */}
                  <div className="rounded-2xl border border-black/5 bg-paper p-4">
                    <div className="flex items-start gap-3">
                      <div className="mt-1 h-3 w-3 shrink-0 rounded-full bg-fire-orange ring-4 ring-fire-orange/15" />
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-ink/40">From</p>
                        <p className="font-display font-bold text-ink">{ride.startLocation}</p>
                      </div>
                    </div>
                    <div className="ml-[5px] h-5 w-0.5 bg-gradient-to-b from-fire-orange to-fire-gold" />
                    <div className="flex items-start gap-3">
                      <div className="mt-1 h-3 w-3 shrink-0 rounded-full bg-fire-gold ring-4 ring-fire-gold/15" />
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-ink/40">To</p>
                        <p className="font-display font-bold text-ink">{ride.endLocation}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2.5 rounded-2xl border border-black/5 bg-paper p-3">
                      <Car className="h-4 w-4 shrink-0 text-fire-orange" />
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-ink/40">Vehicle type</p>
                        <p className="truncate font-display font-bold capitalize text-ink">{ride.vehicleType}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 rounded-2xl border border-black/5 bg-paper p-3">
                      <Car className="h-4 w-4 shrink-0 text-fire-orange" />
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-ink/40">Vehicle number</p>
                        <p className="truncate font-display font-bold text-ink">{ride.vehicleNumber}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Calendar className="mt-0.5 h-5 w-5 shrink-0 text-ink/35" />
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide text-ink/40">Reference ID</p>
                      <p className="font-mono font-bold text-ink">{ride.referenceId}</p>
                    </div>
                  </div>

                  {(ride.fare || routeMeta?.durationMinutes || ride.duration || routeMeta?.distanceKm || ride.distance) && (
                    <div className="grid grid-cols-3 gap-3 border-t border-black/5 pt-4">
                      {ride.fare && (
                        <div className="text-center">
                          <p className="font-display text-xl font-extrabold text-fire-orange">₹{ride.fare.toFixed(2)}</p>
                          <p className="text-[11px] font-bold uppercase tracking-wide text-ink/40">Fare</p>
                        </div>
                      )}
                      {(routeMeta?.durationMinutes || ride.duration) && (
                        <div className="text-center">
                          <p className="font-display text-xl font-extrabold text-ink">{routeMeta?.durationMinutes || ride.duration}m</p>
                          <p className="text-[11px] font-bold uppercase tracking-wide text-ink/40">Duration</p>
                        </div>
                      )}
                      {(routeMeta?.distanceKm || ride.distance) && (
                        <div className="text-center">
                          <p className="font-display text-xl font-extrabold text-ink">{routeMeta?.distanceKm || ride.distance}km</p>
                          <p className="text-[11px] font-bold uppercase tracking-wide text-ink/40">Distance</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Join Card */}
              {canJoinRide && (
                <div className="rounded-[28px] border border-black/5 bg-white p-4 shadow-soft">
                  <button
                    onClick={handleJoinRide}
                    disabled={isJoining || isJoined}
                    className={`${isJoined ? 'border-2 border-black/10 bg-paper text-ink/45' : 'grain grain-strong text-white shadow-glow'} relative w-full overflow-hidden rounded-2xl py-4 font-display text-lg font-bold tracking-tight transition-all active:scale-[0.98] disabled:opacity-80`}
                    style={isJoined ? undefined : { background: FIRE }}
                  >
                    {isJoined
                      ? 'Joined Ride'
                      : isJoining
                        ? 'Joining Ride...'
                        : `Join Ride (${passengerCount} Seat${passengerCount > 1 ? 's' : ''})`}
                  </button>
                  <p className="mt-2 text-xs font-medium text-ink/50">Earn +50 points when you join this ride.</p>
                  {joinError && <p className="mt-1 text-xs font-semibold text-fire-red">{joinError}</p>}
                  {joinSuccessMessage && <p className="mt-1 text-xs font-semibold text-emerald-600">{joinSuccessMessage}</p>}
                </div>
              )}

              {/* Owner actions */}
              {user?.id === ride.userId && (
                <div className="grid gap-3">
                  {ride.status === 'pending' && (
                    <button
                      onClick={() => history.push(`/rides/edit/${ride.id}`)}
                      className="w-full rounded-2xl border-2 border-primary-200 py-4 font-display font-bold text-primary-700 transition-colors hover:border-primary-300 hover:bg-primary-50 active:scale-[0.98]"
                    >
                      Edit Ride Details
                    </button>
                  )}
                  {['pending', 'active'].includes(ride.status) && (
                    <button
                      onClick={() => history.push(`/rides/active/${ride.id}`)}
                      className="grain grain-strong relative w-full overflow-hidden rounded-2xl py-4 font-display font-bold text-white shadow-glow transition-all active:scale-[0.98]"
                      style={{ background: FIRE }}
                    >
                      {ride.status === 'pending' ? 'Go to Start Console' : 'Go to Tracking Console'}
                    </button>
                  )}
                </div>
              )}

              {/* Contact / Dispute */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleContactDriver}
                  disabled={!ride.driverContact}
                  className="rounded-[22px] border border-black/5 bg-white p-4 text-left shadow-soft transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-fire-orange">
                    <Phone className="h-5 w-5" strokeWidth={2.5} />
                  </div>
                  <p className="font-display font-bold text-ink">Contact Driver</p>
                  <p className="truncate text-sm font-medium text-ink/50">{ride.driverContact || 'Not available'}</p>
                </button>

                <button
                  onClick={handleRaiseDispute}
                  className="rounded-[22px] border border-black/5 bg-white p-4 text-left shadow-soft transition active:scale-[0.98]"
                >
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-fire-gold/20 text-[#9a5b00]">
                    <MessageSquare className="h-5 w-5" strokeWidth={2.5} />
                  </div>
                  <p className="font-display font-bold text-ink">Raise Dispute</p>
                  <p className="text-sm font-medium text-ink/50">Report an issue</p>
                </button>
              </div>

              {/* SOS */}
              <button
                onClick={handleSOS}
                className="flex w-full items-center justify-center gap-3 rounded-2xl py-4 font-display text-lg font-bold tracking-tight text-white shadow-strong transition active:scale-[0.98]"
                style={{ background: ALERT }}
              >
                <ShieldAlert className="h-6 w-6" strokeWidth={2.5} />
                SOS Emergency
              </button>
            </div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default RideDetailPage;
