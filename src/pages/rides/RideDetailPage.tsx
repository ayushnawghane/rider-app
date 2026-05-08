import { IonContent, IonPage } from '@ionic/react';
import { useEffect, useState } from 'react';
import { useParams, useHistory, useLocation } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { rideService, mapsService } from '../../services';
import { MapComponent } from '../../components/maps';
import { Phone, MessageSquare, ShieldAlert, MapPin, Navigation, Calendar, Car, DollarSign, Clock, CheckCircle2, AlertTriangle, Route } from 'lucide-react';
import type { Ride } from '../../types';
import { hasRequiredBookingProfile } from '../../utils/profileCompletion';
import Button from '../../components/Button';
import { AppCard, BackButton, EmptyState, StatusBadge } from '../../components/ui';
import { Skeleton, SkeletonCard } from '../../components/Skeleton';

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
      setJoinSuccessMessage('Ride joined successfully. You earned +30 reward points.');
    } finally {
      setIsJoining(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      active: { icon: CheckCircle2, tone: 'active', label: 'Active' },
      pending: { icon: AlertTriangle, tone: 'pending', label: 'Pending' },
      completed: { icon: CheckCircle2, tone: 'completed', label: 'Completed' },
      cancelled: { icon: CheckCircle2, tone: 'cancelled', label: 'Cancelled' },
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

  if (loading) {
    return (
      <IonPage>
        <IonContent className="ion-padding bg-gray-50">
          <div className="max-w-2xl mx-auto px-4 app-top-safe pb-6">
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
        <IonContent className="ion-padding bg-gray-50">
          <div className="max-w-2xl mx-auto px-4 app-top-safe pb-6">
            <BackButton label="Back" className="mb-6" />
            <EmptyState
              icon={<AlertTriangle className="w-16 h-16" />}
              title="Ride Not Found"
              message="The ride you're looking for doesn't exist or has been deleted."
            />
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
      <IonContent className="ion-padding bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 app-top-safe pb-6">
          <BackButton label="Back" className="mb-6" />

          <div className="space-y-6 app-bottom-nav-safe">
            {/* Map Section */}
            {hasMapData && (
              <AppCard className="overflow-hidden">
                <div className="h-64">
                  <MapComponent
                    center={mapCenter}
                    markers={markers}
                    routePath={routePath}
                    fitBounds={true}
                  />
                </div>
                <div className="p-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Route className="w-4 h-4" />
                    <span>Route snapshot • {ride.distance ? `${ride.distance} km` : 'Distance unavailable'}</span>
                  </div>
                </div>
              </AppCard>
            )}

            <AppCard className="p-6 animate-fade-in">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                    <Car className="w-6 h-6 text-primary-600" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-gray-900">Ride Details</h1>
                    <StatusBadge tone={status.tone as 'active' | 'pending' | 'completed' | 'cancelled'} className="mt-1">
                      <status.icon className="w-3.5 h-3.5" />
                      {status.label}
                    </StatusBadge>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Date & Time</p>
                    <p className="font-medium text-gray-900">{formatDate(ride.date)}</p>
                  </div>
                </div>

                <div className="space-y-3 p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-primary-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">From</p>
                      <p className="font-medium text-gray-900">{ride.startLocation}</p>
                    </div>
                  </div>
                  <div className="ml-4 w-0.5 h-4 bg-primary-200" />
                  <div className="flex items-start gap-3">
                    <Navigation className="w-5 h-5 text-success-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">To</p>
                      <p className="font-medium text-gray-900">{ride.endLocation}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-3">
                    <Car className="w-4 h-4 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500">Vehicle Type</p>
                      <p className="font-medium text-gray-900 capitalize">{ride.vehicleType}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-gray-50 rounded-xl p-3">
                    <Car className="w-4 h-4 text-gray-500" />
                    <div>
                      <p className="text-xs text-gray-500">Vehicle Number</p>
                      <p className="font-medium text-gray-900">{ride.vehicleNumber}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Reference ID</p>
                    <p className="font-mono font-medium text-gray-900">{ride.referenceId}</p>
                  </div>
                </div>

                {(ride.fare || ride.duration || ride.distance) && (
                  <div className="grid grid-cols-3 gap-3 pt-4 border-t border-gray-100">
                    {ride.fare && (
                      <div className="text-center">
                        <DollarSign className="w-4 h-4 text-success-500 mx-auto mb-1" />
                        <p className="text-lg font-bold text-gray-900">${ride.fare.toFixed(2)}</p>
                        <p className="text-xs text-gray-500">Fare</p>
                      </div>
                    )}
                    {ride.duration && (
                      <div className="text-center">
                        <Clock className="w-4 h-4 text-primary-500 mx-auto mb-1" />
                        <p className="text-lg font-bold text-gray-900">{ride.duration}m</p>
                        <p className="text-xs text-gray-500">Duration</p>
                      </div>
                    )}
                    {ride.distance && (
                      <div className="text-center">
                        <Navigation className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                        <p className="text-lg font-bold text-gray-900">{ride.distance}km</p>
                        <p className="text-xs text-gray-500">Distance</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </AppCard>

            {canJoinRide && (
              <AppCard className="p-4">
                <Button
                  onClick={handleJoinRide}
                  disabled={isJoining || isJoined}
                  loading={isJoining}
                  expand="block"
                  variant={isJoined ? 'secondary' : 'primary'}
                >
                  {isJoined
                    ? 'Joined Ride'
                    : isJoining
                      ? 'Joining Ride...'
                      : `Join Ride (${passengerCount} Seat${passengerCount > 1 ? 's' : ''})`}
                </Button>
                <p className="text-xs text-gray-500 mt-2">Earn +30 points when you join this ride.</p>
                {joinError && <p className="text-xs text-red-600 mt-1">{joinError}</p>}
                {joinSuccessMessage && <p className="text-xs text-green-600 mt-1">{joinSuccessMessage}</p>}
              </AppCard>
            )}

            {user?.id === ride.userId && (
              <div className="grid gap-3">
                {ride.status === 'pending' && (
                <Button
                  onClick={() => history.push(`/rides/edit/${ride.id}`)}
                  variant="outline"
                  expand="block"
                  size="lg"
                >
                  Edit Ride Details
                </Button>
                )}
                {['pending', 'active'].includes(ride.status) && (
                  <Button
                    onClick={() => history.push(`/rides/active/${ride.id}`)}
                    expand="block"
                    size="lg"
                  >
                    {ride.status === 'pending' ? 'Go to Start Console' : 'Go to Tracking Console'}
                  </Button>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleContactDriver}
                disabled={!ride.driverContact}
                className="rounded-2xl bg-white p-4 text-left shadow-lg transition-all hover:shadow-medium disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Phone className="w-6 h-6 text-primary-600 mb-2" />
                <p className="font-medium text-gray-900">Contact Driver</p>
                <p className="text-sm text-gray-500">{ride.driverContact || 'Not available'}</p>
              </button>

              <button
                onClick={handleRaiseDispute}
                className="rounded-2xl bg-white p-4 text-left shadow-lg transition-all hover:shadow-medium"
              >
                <MessageSquare className="w-6 h-6 text-warning-600 mb-2" />
                <p className="font-medium text-gray-900">Raise Dispute</p>
                <p className="text-sm text-gray-500">Report an issue</p>
              </button>
            </div>

            <button
              onClick={handleSOS}
              className="w-full btn btn-danger py-4 flex items-center justify-center gap-3"
            >
              <ShieldAlert className="w-6 h-6" />
              SOS Emergency
            </button>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default RideDetailPage;
