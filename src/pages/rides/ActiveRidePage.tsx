import { IonContent, IonPage, IonButton, IonLoading, IonToast } from '@ionic/react';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useHistory } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { rideService, locationService, mapsService } from '../../services';
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

  // Start location tracking for live updates
  useEffect(() => {
    const startTracking = async () => {
      // Get initial location
      const position = await locationService.getCurrentPosition();
      if (position) {
        setCurrentLocation({ lat: position.lat, lng: position.lng });
      }

      // Start watching position
      await locationService.startWatching(
        (position) => {
          setCurrentLocation({ lat: position.lat, lng: position.lng });
        },
        (error) => {
          console.error('Location tracking error:', error);
        }
      );
    };

    startTracking();

    // Simulate driver location updates (in real app, this would come from backend)
    const driverInterval = setInterval(() => {
      if (ride?.startLocationCoords) {
        // Simulate driver moving towards pickup
        const randomOffset = () => (Math.random() - 0.5) * 0.001;
        setDriverLocation({
          lat: ride.startLocationCoords.lat + randomOffset(),
          lng: ride.startLocationCoords.lng + randomOffset(),
        });
      }
    }, 5000);

    return () => {
      locationService.stopWatching();
      clearInterval(driverInterval);
    };
  }, [ride]);

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
    }] : []),
    ...(ride?.endLocationCoords ? [{
      position: { lat: ride.endLocationCoords.lat, lng: ride.endLocationCoords.lng },
      title: 'Drop',
    }] : []),
    ...(driverLocation ? [{
      position: driverLocation,
      title: 'Driver',
    }] : []),
  ];

  const mapCenter = isAutoRecenter && currentLocation 
    ? currentLocation 
    : ride?.startLocationCoords || { lat: 28.6139, lng: 77.2090 };

  if (loading) {
    return (
      <IonPage>
        <IonContent className="ion-padding bg-gray-50">
          <div className="h-screen flex items-center justify-center">
            <IonLoading isOpen message="Loading ride details..." />
          </div>
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
          <div className="bg-white rounded-t-3xl shadow-strong -mt-6 relative z-10">
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1 bg-gray-300 rounded-full" />
            </div>

            <div className="px-4 pb-24 max-h-[50vh] overflow-y-auto">
              {/* Status Timeline */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Ride Status</h3>
                <div className="flex items-start justify-between">
                  {steps.map((step, index) => {
                    const Icon = step.icon;
                    const isCompleted = index <= currentIndex;
                    const isCurrent = index === currentIndex;

                    return (
                      <div key={step.id} className="flex-1 flex flex-col items-center">
                        <div 
                          className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                            isCompleted 
                              ? 'bg-primary-500 text-white' 
                              : 'bg-gray-100 text-gray-400'
                          } ${isCurrent ? 'ring-4 ring-primary-100' : ''}`}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <span className={`text-xs text-center ${isCompleted ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
                          {step.label}
                        </span>
                        {index < steps.length - 1 && (
                          <div className={`absolute h-0.5 w-full top-5 left-1/2 -z-10 ${
                            isCompleted ? 'bg-primary-500' : 'bg-gray-200'
                          }`} style={{ width: '25%' }} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Location Details */}
              <div className="card p-4 mb-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-4 h-4 text-primary-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Pickup</p>
                      <p className="font-medium text-gray-900">{ride.startLocation}</p>
                    </div>
                  </div>
                  <div className="ml-4 w-0.5 h-4 bg-gray-200" />
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-success-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Navigation className="w-4 h-4 text-success-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Drop</p>
                      <p className="font-medium text-gray-900">{ride.endLocation}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <button
                  onClick={handleContactDriver}
                  className="card p-4 text-center hover:shadow-medium transition-all"
                >
                  <Phone className="w-6 h-6 text-primary-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-900">Driver</p>
                </button>

                <button
                  onClick={handleContactSupport}
                  className="card p-4 text-center hover:shadow-medium transition-all"
                >
                  <MessageSquare className="w-6 h-6 text-warning-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-900">Support</p>
                </button>

                <button
                  onClick={handleSOS}
                  className="card p-4 text-center hover:shadow-medium transition-all bg-danger-50"
                >
                  <ShieldAlert className="w-6 h-6 text-danger-600 mx-auto mb-2" />
                  <p className="text-sm font-medium text-danger-700">SOS</p>
                </button>
              </div>
            </div>
          </div>
        </div>

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
