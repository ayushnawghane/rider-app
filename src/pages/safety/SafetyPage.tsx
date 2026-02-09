import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButton, IonIcon, IonCard, IonCardContent, IonRow, IonCol, IonLoading, IonToast } from '@ionic/react';
import { useState, useEffect } from 'react';
import { useHistory, useLocation } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { sosService, locationService } from '../../services';
import { MapComponent } from '../../components/maps';
import { warningOutline, locationOutline, callOutline, chevronBackOutline, shareOutline, shieldCheckmarkOutline, navigateOutline } from 'ionicons/icons';

const SafetyPage: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [sosSent, setSosSent] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState('');
  const [isTracking, setIsTracking] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const history = useHistory();

  const queryParams = new URLSearchParams(location.search);
  const preselectedRideId = queryParams.get('rideId');

  useEffect(() => {
    // Get initial location when page loads
    getCurrentLocation();

    // Start tracking location
    startLocationTracking();

    // Cleanup on unmount
    return () => {
      locationService.stopWatching();
    };
  }, []);

  const getCurrentLocation = async () => {
    const position = await locationService.getCurrentPosition();
    if (position) {
      setCurrentLocation({ lat: position.lat, lng: position.lng });
    } else {
      setLocationError('Unable to get your location. Please enable location services.');
    }
  };

  const startLocationTracking = async () => {
    const started = await locationService.startWatching(
      (position) => {
        setCurrentLocation({ lat: position.lat, lng: position.lng });
        setIsTracking(true);
      },
      (error) => {
        console.error('Location tracking error:', error);
        setLocationError('Location tracking failed. Please check your permissions.');
        setIsTracking(false);
      }
    );

    if (!started) {
      setLocationError('Location permission denied. Please enable location services.');
    }
  };

  const handleSOS = async () => {
    if (!user) return;

    let locationToUse = currentLocation;

    if (!locationToUse) {
      setToastMessage('Getting your location... Please wait.');
      setShowToast(true);
      
      // Try to get location again
      const position = await locationService.getCurrentPosition();
      if (!position) {
        setToastMessage('Unable to get location. Please check your location settings.');
        setShowToast(true);
        return;
      }
      locationToUse = { lat: position.lat, lng: position.lng };
      setCurrentLocation(locationToUse);
    }

    setLoading(true);

    const result = await sosService.createSosAlert({
      userId: user.id,
      rideId: preselectedRideId || undefined,
      location: locationToUse,
    });

    if (result.success) {
      setSosSent(true);
      setToastMessage('SOS Alert sent successfully! Help is on the way.');
      setShowToast(true);
    } else {
      setToastMessage('Failed to send SOS alert. Please try again.');
      setShowToast(true);
    }

    setLoading(false);
  };

  const handleShareLocation = async () => {
    if (!currentLocation) {
      setToastMessage('Location not available yet.');
      setShowToast(true);
      return;
    }

    const shareData = {
      title: 'My Location',
      text: `I'm sharing my location with you: https://maps.google.com/?q=${currentLocation.lat},${currentLocation.lng}`,
      url: `https://maps.google.com/?q=${currentLocation.lat},${currentLocation.lng}`,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(shareData.text);
        setToastMessage('Location link copied to clipboard!');
        setShowToast(true);
      }
    } catch (error) {
      console.error('Error sharing location:', error);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButton slot="start" fill="clear" onClick={() => history.goBack()}>
            <IonIcon icon={chevronBackOutline} />
          </IonButton>
          <IonTitle>Safety & SOS</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        {!sosSent ? (
          <>
            {/* Live Location Map */}
            <div className="mb-4">
              <div className="h-48 rounded-2xl overflow-hidden relative">
                {currentLocation ? (
                  <MapComponent
                    center={currentLocation}
                    markers={[{ position: currentLocation, title: 'Your Location' }]}
                    zoom={16}
                  />
                ) : (
                  <div className="h-full bg-gray-100 flex items-center justify-center">
                    <div className="text-center">
                      <IonIcon icon={locationOutline} style={{ fontSize: '48px', color: 'var(--ion-color-medium)' }} />
                      <p className="text-gray-500 mt-2">Getting your location...</p>
                    </div>
                  </div>
                )}
                
                {/* Location Status Badge */}
                {currentLocation && (
                  <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-2 shadow-sm">
                    <div className={`w-2 h-2 rounded-full ${isTracking ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
                    <span className="text-xs font-medium text-gray-700">
                      {isTracking ? 'Live Location' : 'Location Available'}
                    </span>
                  </div>
                )}
              </div>

              {/* Location Coordinates */}
              {currentLocation && (
                <div className="mt-2 p-3 bg-gray-50 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <IonIcon icon={navigateOutline} style={{ color: 'var(--ion-color-primary)' }} />
                      <span className="text-sm text-gray-600 font-mono">
                        {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
                      </span>
                    </div>
                    <IonButton fill="clear" size="small" onClick={handleShareLocation}>
                      <IonIcon icon={shareOutline} slot="start" />
                      Share
                    </IonButton>
                  </div>
                </div>
              )}

              {/* Location Error */}
              {locationError && (
                <div className="mt-2 p-3 bg-danger-50 border border-danger-200 rounded-xl">
                  <p className="text-sm text-danger-700">{locationError}</p>
                  <IonButton 
                    fill="clear" 
                    size="small" 
                    color="danger"
                    onClick={getCurrentLocation}
                    className="mt-1"
                  >
                    Try Again
                  </IonButton>
                </div>
              )}
            </div>

            {/* SOS Card */}
            <IonCard color="danger" style={{ textAlign: 'center', padding: '24px' }}>
              <IonIcon icon={warningOutline} style={{ fontSize: '64px', marginBottom: '16px' }} />
              <h2>Emergency SOS</h2>
              <p>In case of emergency, tap the button below to alert our support team with your live location.</p>
              <IonButton
                size="large"
                onClick={handleSOS}
                disabled={loading || !currentLocation}
                style={{ marginTop: '16px' }}
              >
                {loading ? 'Sending Alert...' : 'SOS EMERGENCY'}
              </IonButton>
              {!currentLocation && (
                <p className="text-sm mt-2 opacity-80">Waiting for location...</p>
              )}
            </IonCard>

            {/* Emergency Instructions */}
            <h2 style={{ marginTop: '24px' }}>Emergency Instructions</h2>
            <IonCard>
              <IonCardContent>
                <IonRow>
                  <IonCol>
                    <IonIcon icon={callOutline} />
                    <p><strong>Call Emergency Services</strong></p>
                    <p>Dial 112 for immediate emergency assistance.</p>
                  </IonCol>
                </IonRow>
              </IonCardContent>
            </IonCard>

            <IonCard>
              <IonCardContent>
                <IonRow>
                  <IonCol>
                    <IonIcon icon={locationOutline} />
                    <p><strong>Share Your Location</strong></p>
                    <p>Always share your ride details with a trusted contact.</p>
                  </IonCol>
                </IonRow>
              </IonCardContent>
            </IonCard>

            {/* Important Contacts */}
            <h2 style={{ marginTop: '24px' }}>Important Contacts</h2>
            <IonCard>
              <IonCardContent>
                <IonButton expand="block" onClick={() => window.location.href = 'tel:112'}>
                  Emergency Services (112)
                </IonButton>
                <IonButton expand="block" fill="outline" style={{ marginTop: '8px' }}>
                  RiderApp Support
                </IonButton>
              </IonCardContent>
            </IonCard>
          </>
        ) : (
          <IonCard>
            <IonCardContent style={{ textAlign: 'center', padding: '32px' }}>
              <IonIcon 
                icon={shieldCheckmarkOutline} 
                style={{ fontSize: '64px', color: 'var(--ion-color-success)', marginBottom: '16px' }} 
              />
              <h2 style={{ color: 'var(--ion-color-success)' }}>SOS Alert Sent!</h2>
              <p>Our support team has been notified with your live location and will contact you immediately.</p>
              
              {currentLocation && (
                <div className="mt-4 p-3 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-600">Location Shared:</p>
                  <p className="font-mono text-sm text-gray-800">
                    {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
                  </p>
                </div>
              )}

              <IonButton
                expand="block"
                onClick={() => history.replace('/home')}
                style={{ marginTop: '24px' }}
              >
                Return to Home
              </IonButton>
            </IonCardContent>
          </IonCard>
        )}

        <IonToast
          isOpen={showToast}
          onDidDismiss={() => setShowToast(false)}
          message={toastMessage}
          duration={3000}
          position="bottom"
        />
        <IonLoading isOpen={loading} message="Sending SOS alert..." />
      </IonContent>
    </IonPage>
  );
};

export default SafetyPage;
