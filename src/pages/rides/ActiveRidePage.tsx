import { IonContent, IonPage, IonButton, IonToast } from '@ionic/react';
import LoadingOverlay from '../../components/LoadingOverlay';
import { useEffect, useState } from 'react';
import { useParams, useHistory } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { rideService, locationService, mapsService } from '../../services';
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
  MoreVertical
} from 'lucide-react';
import type { Ride } from '../../types';

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

  // Driver Controls State
  const [showStartConfirm, setShowStartConfirm] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const isDriver = user?.id === ride?.userId || Boolean(ride?.driverId && user?.id === ride?.driverId);

  // Fetch ride details
  useEffect(() => {
    const fetchRide = async () => {
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
      }
      setLoading(false);
    };

    fetchRide();
  }, [id]);

  // Start location tracking + live_locations publishing + Realtime subscription
  useEffect(() => {
    if (!ride || !user) return;
    let locationInsertInterval: ReturnType<typeof setInterval> | null = null;

    const startTracking = async () => {
      // Get initial location
      const position = await locationService.getCurrentPosition();
      if (position) {
        setCurrentLocation({ lat: position.lat, lng: position.lng });
        // Publish initial location
        await supabase.from('live_locations').insert({
          ride_id: ride.id,
          user_id: user.id,
          lat: position.lat,
          lng: position.lng,
          accuracy: position.accuracy,
        });
      }

      // Watch position + publish every update
      await locationService.startWatching(
        async (pos) => {
          setCurrentLocation({ lat: pos.lat, lng: pos.lng });
        },
        (error) => {
          console.error('Location tracking error:', error);
        }
      );

      // Publish location every 10 seconds
      locationInsertInterval = setInterval(async () => {
        const pos = await locationService.getCurrentPosition();
        if (pos) {
          await supabase.from('live_locations').insert({
            ride_id: ride.id,
            user_id: user.id,
            lat: pos.lat,
            lng: pos.lng,
            accuracy: pos.accuracy,
          });
        }
      }, 10000);
    };

    startTracking();

    // Subscribe to live_locations for this ride via Realtime
    const channel = supabase
      .channel(`live_locations:${ride.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'live_locations',
          filter: `ride_id=eq.${ride.id}`,
        },
        (payload) => {
          const row = payload.new as { user_id: string; lat: number; lng: number };
          // Show other participants' location as the driver/co-rider marker
          if (row.user_id !== user.id) {
            setDriverLocation({ lat: row.lat, lng: row.lng });
          }
        }
      )
      .subscribe();

    return () => {
      locationService.stopWatching();
      if (locationInsertInterval) clearInterval(locationInsertInterval);
      supabase.removeChannel(channel);
    };
  }, [ride, user]);

  const handleContactDriver = () => {
    if (ride?.driverContact) {
      window.location.href = `tel:${ride.driverContact}`;
    } else {
      setToastMessage('Driver contact not available');
      setShowToast(true);
    }
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
        <IonContent className="ion-padding bg-gray-50">
          <LoadingOverlay isOpen variant="fullscreen" message="Loading ride details..." />
        </IonContent>
      </IonPage>
    );
  }

  if (!ride) {
    return (
      <IonPage>
        <IonContent className="ion-padding bg-gray-50">
          <div className="max-w-2xl mx-auto px-4 py-6">
            <div className="card p-8 text-center">
              <AlertTriangle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">Ride Not Found</h2>
              <p className="text-gray-500">The ride you're looking for doesn't exist.</p>
              <IonButton
                expand="block"
                onClick={() => history.push('/home')}
                className="mt-4"
              >
                Go Home
              </IonButton>
            </div>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  const { steps, currentIndex } = getStatusStep(ride.status);

  return (
    <IonPage>
      <IonContent className="bg-gray-50">
        <div className="h-screen flex flex-col">
          {/* Header */}
          <header className="bg-white px-4 py-3 shadow-sm z-10">
            <div className="flex items-center justify-between">
              <button
                onClick={() => history.goBack()}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ChevronLeft className="w-6 h-6 text-gray-700" />
              </button>
              <div className="text-center">
                <h1 className="font-semibold text-gray-900">Active Ride</h1>
                <p className="text-sm text-gray-500">{ride.vehicleType} • {ride.vehicleNumber}</p>
              </div>
              <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <MoreVertical className="w-6 h-6 text-gray-700" />
              </button>
            </div>
          </header>

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
              className="absolute top-4 right-4 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
            >
              <Target className="w-6 h-6 text-gray-700" />
            </button>

            {/* ETA Card */}
            {eta && (
              <div className="absolute top-4 left-4 bg-white rounded-xl shadow-lg px-4 py-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary-600" />
                  <div>
                    <p className="text-xs text-gray-500">ETA</p>
                    <p className="font-semibold text-gray-900">{eta}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Sheet */}
          <div className="bg-white rounded-t-3xl shadow-strong -mt-6 relative z-10 flex flex-col max-h-[60vh]">
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-2 flex-shrink-0">
              <div className="w-12 h-1 bg-gray-300 rounded-full" />
            </div>

            <div className="px-4 pb-6 overflow-y-auto flex-1">

              {/* Driver & Vehicle Profile (Uber-like) */}
              <div className="flex items-center pb-4 mb-4 border-b border-gray-100">
                <div className="w-14 h-14 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 border-2 border-white shadow-sm">
                  <img src={ride.driver?.avatar || `https://ui-avatars.com/api/?name=${isDriver ? user?.fullName || 'Driver' : (ride.driver?.name || 'Driver')}&background=random`} alt="Driver" className="w-full h-full object-cover" />
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-base font-bold text-gray-900">{isDriver ? 'You (Driver)' : (ride.driver?.name || 'Your Driver')}</h3>
                  <div className="flex items-center text-sm text-gray-500 mt-0.5">
                    <span className="font-medium text-warning-500 flex items-center gap-1">★ {ride.driver?.rating ? ride.driver.rating.toFixed(1) : '4.9'}</span>
                    <span className="mx-2">•</span>
                    <span>{ride.vehicleType}</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200">
                    <span className="text-sm font-bold text-gray-900 tracking-wide">{ride.vehicleNumber}</span>
                  </div>
                </div>
              </div>

              {/* Status Timeline */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Ride Status</h3>
                  <span className="text-xs font-semibold px-2 py-1 bg-primary-50 text-primary-700 rounded-md">
                    {ride.status.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-start justify-between">
                  {steps.map((step, index) => {
                    const Icon = step.icon;
                    const isCompleted = index <= currentIndex;
                    const isCurrent = index === currentIndex;

                    return (
                      <div key={step.id} className="flex-1 flex flex-col items-center relative">
                        <div
                          className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 z-10 transition-all ${isCompleted
                            ? 'bg-primary-500 text-white shadow-md'
                            : 'bg-gray-100 text-gray-400'
                            } ${isCurrent ? 'ring-4 ring-primary-100 scale-110' : ''}`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className={`text-[10px] text-center uppercase tracking-wider ${isCompleted ? 'text-gray-900 font-bold' : 'text-gray-400 font-semibold'}`}>
                          {step.label}
                        </span>
                        {index < steps.length - 1 && (
                          <div className={`absolute h-1 w-full top-4 left-1/2 -z-0 rounded-r-full transition-all ${isCompleted ? 'bg-primary-400' : 'bg-gray-100'
                            }`} style={{ width: '100%' }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Location Details */}
              <div className="bg-gray-50 rounded-2xl p-4 mb-6 border border-gray-100">
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-white border border-gray-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                      <div className="w-2.5 h-2.5 bg-gray-900 rounded-full" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Pickup</p>
                      <p className="font-medium text-gray-900 leading-tight">{ride.startLocation}</p>
                    </div>
                  </div>
                  <div className="ml-4 w-0.5 h-6 bg-gray-300" />
                  <div className="flex items-start gap-4">
                    <div className="w-8 h-8 bg-white border border-gray-200 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                      <div className="w-2.5 h-2.5 bg-primary-600 rounded-sm" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Dropoff</p>
                      <p className="font-medium text-gray-900 leading-tight">{ride.endLocation}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid gap-3">
                {isDriver && !['completed', 'cancelled'].includes(ride.status) && (
                  <div className="flex flex-col gap-3 mb-2">
                    {ride.status === 'pending' ? (
                      <button
                        onClick={() => setShowStartConfirm(true)}
                        disabled={isUpdatingStatus}
                        className="w-full py-3.5 bg-success-600 text-white font-semibold rounded-xl shadow-md hover:bg-success-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <Navigation className="w-5 h-5" /> Start Trip
                      </button>
                    ) : (
                      <button
                        onClick={() => setShowEndConfirm(true)}
                        disabled={isUpdatingStatus}
                        className="w-full py-3.5 bg-primary-600 text-white font-semibold rounded-xl shadow-md hover:bg-primary-700 active:bg-primary-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 className="w-5 h-5" /> Complete Trip
                      </button>
                    )}
                    <button
                      onClick={() => setShowCancelConfirm(true)}
                      disabled={isUpdatingStatus}
                      className="w-full py-3.5 bg-white text-danger-600 border border-danger-200 font-semibold rounded-xl hover:bg-danger-50 active:bg-danger-100 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <AlertTriangle className="w-5 h-5" /> Cancel Trip
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-3">
                  {!isDriver && (
                    <button
                      onClick={handleContactDriver}
                      className="flex flex-col items-center justify-center py-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      <Phone className="w-5 h-5 text-gray-700 mb-1" />
                      <span className="text-xs font-semibold text-gray-700">Call Driver</span>
                    </button>
                  )}
                  <button
                    onClick={handleContactSupport}
                    className={`flex flex-col items-center justify-center py-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors ${isDriver ? 'col-span-1' : ''}`}
                  >
                    <MessageSquare className="w-5 h-5 text-gray-700 mb-1" />
                    <span className="text-xs font-semibold text-gray-700">Support</span>
                  </button>
                  <button
                    onClick={handleSOS}
                    className={`flex flex-col items-center justify-center py-3 bg-danger-50 border border-danger-100 rounded-xl hover:bg-danger-100 transition-colors ${isDriver ? 'col-span-2' : ''}`}
                  >
                    <ShieldAlert className="w-5 h-5 text-danger-600 mb-1" />
                    <span className="text-xs font-semibold text-danger-700">Emergency SOS</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Custom Tailwind Confirmation Modals */}
        {showStartConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 scale-100 transition-all">
              <div className="w-12 h-12 bg-success-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Navigation className="w-6 h-6 text-success-600" />
              </div>
              <h2 className="text-xl font-bold text-center text-gray-900 mb-2">Start Trip</h2>
              <p className="text-center text-gray-500 mb-6 text-sm">Are you sure you want to start this trip? Ensure all passengers are aboard.</p>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setShowStartConfirm(false)} className="py-3 font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">Go Back</button>
                <button onClick={() => { setShowStartConfirm(false); handleUpdateStatus('active'); }} className="py-3 font-semibold text-white bg-success-600 rounded-xl hover:bg-success-700 transition-colors">Start Trip</button>
              </div>
            </div>
          </div>
        )}

        {showEndConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 scale-100 transition-all">
              <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-6 h-6 text-primary-600" />
              </div>
              <h2 className="text-xl font-bold text-center text-gray-900 mb-2">Complete Trip</h2>
              <p className="text-center text-gray-500 mb-6 text-sm">Are you sure you want to end this trip? This will mark the ride as successfully completed.</p>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setShowEndConfirm(false)} className="py-3 font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">Go Back</button>
                <button onClick={() => { setShowEndConfirm(false); handleUpdateStatus('completed'); }} className="py-3 font-semibold text-white bg-primary-600 rounded-xl hover:bg-primary-700 transition-colors">Complete Trip</button>
              </div>
            </div>
          </div>
        )}

        {showCancelConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 scale-100 transition-all">
              <div className="w-12 h-12 bg-danger-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-6 h-6 text-danger-600" />
              </div>
              <h2 className="text-xl font-bold text-center text-gray-900 mb-2">Cancel Trip</h2>
              <p className="text-center text-gray-500 mb-6 text-sm">Are you sure you want to cancel this trip? This action cannot be undone.</p>
              <div className="grid grid-cols-2 gap-3">
                <button onClick={() => setShowCancelConfirm(false)} className="py-3 font-semibold text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">Go Back</button>
                <button onClick={() => { setShowCancelConfirm(false); handleUpdateStatus('cancelled'); }} className="py-3 font-semibold text-white bg-danger-600 rounded-xl hover:bg-danger-700 transition-colors">Cancel Trip</button>
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
