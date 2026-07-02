import { IonContent, IonPage } from '@ionic/react';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useHistory, useLocation } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { locationService, rideService, mapsService } from '../../services';
import { MapComponent } from '../../components/maps';
import {
  Phone,
  MessageSquare,
  ShieldAlert,
  Calendar,
  Car,
  CheckCircle2,
  AlertTriangle,
  Route,
  ChevronLeft,
  ChevronRight,
  BadgeCheck,
  Star,
} from 'lucide-react';
import type { Ride, DriverProfile } from '../../types';
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
  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [myBooking, setMyBooking] = useState<{ id: string; driverRating: number | null } | null>(null);
  const [showRatePrompt, setShowRatePrompt] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingReview, setRatingReview] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const [ratedNow, setRatedNow] = useState(false);
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

        // Load the driver's public trust profile for the ride card.
        const driverId = result.ride.driverId;
        if (driverId) {
          void rideService.getDriverProfile(driverId).then((dp) => {
            if (dp.success && dp.profile) setDriverProfile(dp.profile);
          });
        }

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
          // Whether this passenger has already reviewed the driver.
          const booking = await rideService.getMyBooking(result.ride.id, user.id);
          if (booking.success) setMyBooking(booking.booking || null);
        } else {
          setIsJoined(false);
          setMyBooking(null);
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

  const handleSubmitRating = async () => {
    if (!myBooking || ratingValue < 1 || submittingRating) return;
    setSubmittingRating(true);
    const result = await rideService.submitRating({
      bookingId: myBooking.id,
      isDriverRating: true,
      rating: ratingValue,
      review: ratingReview.trim() || undefined,
    });
    setSubmittingRating(false);
    if (result.success) {
      setRatedNow(true);
      setShowRatePrompt(false);
      setMyBooking({ ...myBooking, driverRating: ratingValue });
    }
  };

  const canRate =
    !!ride && ride.status === 'completed' && !!myBooking && myBooking.driverRating == null && !ratedNow;
  const alreadyRated = !!myBooking && (myBooking.driverRating != null || ratedNow);

  const getStatusBadge = (status: string) => {
    const statusMap = {
      active: { icon: CheckCircle2, label: 'Ride Confirmed', cls: 'bg-fire-orange text-white shadow-glow' },
      pending: { icon: AlertTriangle, label: 'Awaiting Departure', cls: 'bg-fire-gold/25 text-[#9a5b00]' },
      completed: { icon: CheckCircle2, label: 'Completed', cls: 'bg-ink/8 text-ink/55' },
      cancelled: { icon: AlertTriangle, label: 'Cancelled', cls: 'bg-fire-red/12 text-fire-red' },
    };
    return statusMap[status as keyof typeof statusMap] || statusMap.pending;
  };

  // Prepare markers for map. Memoized on the actual coordinates so we don't
  // hand MapComponent a fresh array every render — that made it re-fit bounds
  // continuously and fight the user's pan/zoom.
  // Depend on the coordinate values, not the `ride` object identity, so the
  // memo stays stable across re-renders that don't move the pins (which would
  // otherwise make the map continuously re-fit and fight the user's pan/zoom).
  const markers = useMemo(() => (ride ? [
    ...(ride.startLocationCoords ? [{
      position: { lat: ride.startLocationCoords.lat, lng: ride.startLocationCoords.lng },
      title: 'Pickup',
    }] : []),
    ...(ride.endLocationCoords ? [{
      position: { lat: ride.endLocationCoords.lat, lng: ride.endLocationCoords.lng },
      title: 'Drop',
    }] : []),
  ] : []), [
    ride?.startLocationCoords?.lat, ride?.startLocationCoords?.lng,
    ride?.endLocationCoords?.lat, ride?.endLocationCoords?.lng,
  ]);

  // Calculate map center
  const mapCenter = ride?.startLocationCoords || { lat: 28.6139, lng: 77.2090 };

  const BackBar = () => (
    <button
      onClick={() => history.goBack()}
      className="mb-4 inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white/70 py-2 pl-2.5 pr-4 font-display text-sm font-bold text-ink shadow-soft backdrop-blur-sm transition active:scale-95"
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
            <div className="space-y-3">
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
              <div className="rounded-[18px] border border-black/5 bg-white p-4 text-center shadow-soft">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-fire-red/10">
                  <AlertTriangle className="h-10 w-10 text-fire-red" />
                </div>
                <h2 className="mt-3 app-section-title">Ride not found</h2>
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
                <div className="overflow-hidden rounded-[16px] border border-black/5 bg-white shadow-soft">
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

              {/* Driver trust card — who you're riding with (tap for full profile) */}
              {ride.driverId && (
                <button
                  type="button"
                  onClick={() => history.push(`/driver/${ride.driverId}`)}
                  className="app-card flex w-full items-center gap-3 text-left transition active:scale-[0.99]"
                >
                  <img
                    src={driverProfile?.avatarUrl || ride.driver?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(ride.driver?.name || 'Driver')}&background=random`}
                    alt={ride.driver?.name || 'Driver'}
                    className="h-12 w-12 shrink-0 rounded-2xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="truncate font-display font-bold text-ink">{driverProfile?.name || ride.driver?.name || 'Driver'}</p>
                      {driverProfile?.verifications.kyc && (
                        <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                          <BadgeCheck className="h-3 w-3 fill-emerald-500 text-white" /> Verified
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-medium text-ink/50">
                      {driverProfile?.rating != null ? (
                        <>
                          <span className="font-bold text-fire-gold">★ {driverProfile.rating.toFixed(1)}</span>
                          <span className="text-ink/40"> · {driverProfile.reviewCount} review{driverProfile.reviewCount === 1 ? '' : 's'}</span>
                        </>
                      ) : (
                        <span>New driver</span>
                      )}
                      <span className="text-ink/40"> · View profile</span>
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-ink/30" />
                </button>
              )}

              {/* Post-ride: rate the driver */}
              {canRate && (
                <div className="app-card">
                  <p className="font-display font-bold text-ink">How was your ride?</p>
                  <p className="mt-1 text-sm font-medium text-ink/50">Rate {ride.driver?.name || 'your driver'} to help other riders.</p>
                  <button
                    onClick={() => { setRatingValue(0); setRatingReview(''); setShowRatePrompt(true); }}
                    className="mt-3 rounded-xl px-4 py-2.5 font-display text-sm font-bold text-white shadow-glow transition active:scale-95"
                    style={{ background: FIRE }}
                  >
                    Rate your driver
                  </button>
                </div>
              )}
              {alreadyRated && (
                <div className="app-card flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                  <p className="text-sm font-medium text-ink/60">
                    Thanks — you rated this ride{myBooking?.driverRating ? ` ★ ${myBooking.driverRating}` : ''}.
                  </p>
                </div>
              )}

              {/* Details Card */}
              <div className="animate-fade-in app-card">
                <div className="mb-4 flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary-100 bg-gradient-to-br from-primary-50 to-white">
                    <AppIcon name="car" className="h-7 w-7" />
                  </div>
                  <div>
                    <h1 className="app-section-title">Ride details</h1>
                    <span className={`mt-1.5 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-display text-[11px] font-bold ${status.cls}`}>
                      <status.icon className="h-3.5 w-3.5" />
                      {status.label}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
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
                <div className="app-card">
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
                  className="rounded-[14px] border border-black/5 bg-white p-4 text-left shadow-soft transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-primary-50 text-fire-orange">
                    <Phone className="h-5 w-5" strokeWidth={2.5} />
                  </div>
                  <p className="font-display font-bold text-ink">Contact Driver</p>
                  <p className="truncate text-sm font-medium text-ink/50">{ride.driverContact || 'Not available'}</p>
                </button>

                <button
                  onClick={handleRaiseDispute}
                  className="rounded-[14px] border border-black/5 bg-white p-4 text-left shadow-soft transition active:scale-[0.98]"
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

        {/* Rating modal */}
        {showRatePrompt && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 px-4 pb-8 backdrop-blur-sm sm:items-center sm:pb-0">
            <div className="w-full max-w-md app-card" role="dialog" aria-modal="true">
              <h2 className="app-section-title">Rate your ride</h2>
              <p className="mt-1 text-sm font-medium text-ink/50">with {ride?.driver?.name || 'your driver'}</p>
              <div className="mt-4 flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" onClick={() => setRatingValue(n)} aria-label={`${n} star${n > 1 ? 's' : ''}`} className="transition active:scale-90">
                    <Star className={`h-9 w-9 ${n <= ratingValue ? 'fill-fire-gold text-fire-gold' : 'fill-ink/10 text-ink/20'}`} />
                  </button>
                ))}
              </div>
              <textarea
                value={ratingReview}
                onChange={(e) => setRatingReview(e.target.value)}
                placeholder="Add a short review (optional)"
                rows={3}
                maxLength={500}
                className="mt-4 w-full resize-none rounded-xl border-2 border-black/10 p-3 text-sm font-medium focus:border-fire-orange focus:outline-none"
              />
              <div className="mt-4 flex gap-3">
                <button type="button" onClick={() => setShowRatePrompt(false)} className="flex-1 rounded-xl border-2 border-black/10 py-2.5 font-display font-bold text-ink/60 transition active:scale-95">Cancel</button>
                <button
                  type="button"
                  onClick={handleSubmitRating}
                  disabled={ratingValue < 1 || submittingRating}
                  className="flex-1 rounded-xl py-2.5 font-display font-bold text-white shadow-glow transition active:scale-95 disabled:opacity-50"
                  style={{ background: FIRE }}
                >
                  {submittingRating ? 'Submitting…' : 'Submit'}
                </button>
              </div>
            </div>
          </div>
        )}
      </IonContent>
    </IonPage>
  );
};

export default RideDetailPage;
