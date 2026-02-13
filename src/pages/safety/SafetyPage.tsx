import { useState, useEffect } from 'react';
import { useHistory, useLocation } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { sosService, locationService } from '../../services';
import { MapComponent } from '../../components/maps';
import Button from '../../components/Button';


const emergencyContacts = [
  { id: 1, name: 'Emergency Services', number: '112' },
  { id: 2, name: 'RiderApp Support', number: 'support@riderapp.com' },
];

const safetyTips = [
  {
    id: 1,
    title: 'Call Emergency Services',
    description: 'Dial 112 for immediate emergency assistance. Available 24/7.',
  },
  {
    id: 2,
    title: 'Share Your Location',
    description: 'Always share your ride details with a trusted contact.',
  },
  {
    id: 3,
    title: 'Stay Calm & Alert',
    description: 'Keep your phone charged and stay aware of your surroundings.',
  }
];

const SafetyPage: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const history = useHistory();
  
  const [loading, setLoading] = useState(false);
  const [sosSent, setSosSent] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState('');
  const [isTracking, setIsTracking] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const queryParams = new URLSearchParams(location.search);
  const preselectedRideId = queryParams.get('rideId');

  useEffect(() => {
    const init = async () => {
      await getCurrentLocation();
      await startLocationTracking();
    };
    init();
    return () => {
      locationService.stopWatching();
    };
  }, []);

  const getCurrentLocation = async () => {
    const position = await locationService.getCurrentPosition();
    if (position) {
      setCurrentLocation({ lat: position.lat, lng: position.lng });
      setLocationError('');
    } else {
      setLocationError('Unable to get your location. Please enable location services.');
    }
  };

  const startLocationTracking = async () => {
    const started = await locationService.startWatching(
      (position) => {
        setCurrentLocation({ lat: position.lat, lng: position.lng });
        setIsTracking(true);
        setLocationError('');
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

  const showToastMessage = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleSOS = async () => {
    if (!user) {
      showToastMessage('Please log in to send SOS alerts');
      return;
    }

    let locationToUse = currentLocation;

    if (!locationToUse) {
      showToastMessage('Getting your location... Please wait.');
      
      const position = await locationService.getCurrentPosition();
      if (!position) {
        showToastMessage('Unable to get location. Please check your location settings.');
        return;
      }
      locationToUse = { lat: position.lat, lng: position.lng };
      setCurrentLocation(locationToUse);
    }

    setLoading(true);

    try {
      const result = await sosService.createSosAlert({
        userId: user.id,
        rideId: preselectedRideId || undefined,
        location: locationToUse,
      });

      if (result.success) {
        setSosSent(true);
        showToastMessage('SOS Alert sent successfully! Help is on the way.');
      } else {
        showToastMessage('Failed to send SOS alert. Please try again.');
      }
    } catch {
      showToastMessage('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleShareLocation = async () => {
    if (!currentLocation) {
      showToastMessage('Location not available yet.');
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
        await navigator.clipboard.writeText(shareData.text);
        showToastMessage('Location link copied to clipboard!');
      }
    } catch (error) {
      console.error('Error sharing location:', error);
    }
  };

  const handleEmergencyCall = (number: string) => {
    if (number.startsWith('tel:')) {
      window.location.href = number;
    } else {
      showToastMessage(`Contact: ${number}`);
    }
  };

  return (
    <div style={{ 
      height: '100vh', 
      overflow: 'auto', 
      background: '#f9fafb', 
      padding: '16px',
      WebkitOverflowScrolling: 'touch'
    }}>
      {/* Header */}
      <header style={{ 
        display: 'flex', 
        alignItems: 'center', 
        padding: '12px 0', 
        marginBottom: '16px',
        borderBottom: '1px solid #e5e7eb'
      }}>
        <button 
          onClick={() => history.goBack()}
          style={{ 
            background: 'transparent', 
            border: 'none', 
            padding: '8px',
            cursor: 'pointer'
          }}
        >
          <span style={{ fontSize: '24px' }}>←</span>
        </button>
        <h1 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>Safety & SOS</h1>
      </header>

      {!sosSent ? (
        <>
          {/* Your Location */}
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 12px 0' }}>Your Location</h2>
            <div style={{ height: '180px', borderRadius: '12px', overflow: 'hidden', position: 'relative', background: '#f3f4f6' }}>
              {currentLocation ? (
                <>
                  <MapComponent
                    center={currentLocation}
                    markers={[{ position: currentLocation, title: 'Your Location' }]}
                    zoom={16}
                  />
                  {isTracking && (
                    <div style={{
                      position: 'absolute',
                      top: '12px',
                      left: '12px',
                      background: 'rgba(255,255,255,0.95)',
                      borderRadius: '20px',
                      padding: '6px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}>
                      <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }} />
                      <span style={{ fontSize: '12px', fontWeight: '500', color: '#374151' }}>Live Location</span>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ height: '100%', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ textAlign: 'center' }}>
                    <span style={{ fontSize: '40px', color: '#9ca3af' }}>📍</span>
                    <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '8px', margin: 0 }}>Getting your location...</p>
                  </div>
                </div>
              )}
            </div>

            {currentLocation && (
              <div style={{ marginTop: '8px', padding: '12px', background: 'white', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#6366f1' }}>🧭</span>
                  <span style={{ fontSize: '14px', color: '#4b5563', fontFamily: 'monospace' }}>
                    {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
                  </span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleShareLocation}
                >
                  Share
                </Button>
              </div>
            )}

            {locationError && (
              <div style={{ marginTop: '8px', padding: '12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <span style={{ color: '#ef4444', fontSize: '20px', marginTop: '2px' }}>⚠️</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: '14px', color: '#b91c1c', margin: 0 }}>{locationError}</p>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={getCurrentLocation}
                      style={{ marginTop: '4px', color: '#dc2626' }}
                    >
                      Try Again
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SOS Card */}
          <div style={{ 
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', 
            borderRadius: '12px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            marginBottom: '24px',
            padding: '20px',
            textAlign: 'center'
          }}>
            <div style={{ width: '48px', height: '48px', background: 'rgba(255,255,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
              <span style={{ fontSize: '28px' }}>🚨</span>
            </div>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: 'white', margin: '0 0 8px 0' }}>Emergency SOS</h2>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.9)', margin: '0 0 16px 0' }}>
              In case of emergency, tap the button below to alert our support team with your live location.
            </p>
            <Button
              variant="secondary"
              size="md"
              onClick={handleSOS}
              loading={loading}
              disabled={!currentLocation}
              expand="full"
              style={{ background: 'white', color: '#dc2626', fontWeight: '600' }}
            >
              {loading ? 'Sending Alert...' : 'SOS EMERGENCY'}
            </Button>
            {!currentLocation && (
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', marginTop: '8px', margin: 0 }}>Waiting for location...</p>
            )}
          </div>

          {/* Safety Tips */}
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 12px 0' }}>Safety Tips</h2>
            {safetyTips.map((tip) => (
              <div key={tip.id} style={{ 
                background: 'white', 
                borderRadius: '8px', 
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)', 
                marginBottom: '8px',
                padding: '12px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px'
              }}>
                <div style={{ 
                  width: '40px', 
                  height: '40px', 
                  borderRadius: '50%', 
                  background: '#f3f4f6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontSize: '20px'
                }}>
                  {tip.id === 1 && '📞'}
                  {tip.id === 2 && '📍'}
                  {tip.id === 3 && '⚡️'}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: '14px', fontWeight: '500', color: '#1f2937', margin: 0 }}>{tip.title}</h3>
                  <p style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px', margin: 0 }}>{tip.description}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Emergency Contacts */}
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: '600', margin: '0 0 12px 0' }}>Emergency Contacts</h2>
            <div style={{ background: 'white', borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', padding: '12px' }}>
              {emergencyContacts.map((contact) => (
                <Button
                  key={contact.id}
                  expand="block"
                  variant={contact.id === 1 ? 'danger' : 'primary'}
                  size="md"
                  onClick={() => handleEmergencyCall(contact.id === 1 ? `tel:${contact.number}` : contact.number)}
                  style={{ marginBottom: contact.id === 1 ? '8px' : 0 }}
                >
                  {contact.id === 1 && '📞 '}
                  {contact.id === 2 && '💬 '}
                  {contact.name} {contact.id === 1 && `(${contact.number})`}
                </Button>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div style={{ 
          background: 'white', 
          borderRadius: '12px', 
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', 
          padding: '24px',
          textAlign: 'center'
        }}>
          <div style={{ width: '64px', height: '64px', background: '#dcfce7', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <span style={{ fontSize: '36px' }}>✅</span>
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#22c55e', margin: '0 0 8px 0' }}>SOS Alert Sent!</h2>
          <p style={{ fontSize: '14px', color: '#4b5563', margin: '0 0 16px 0' }}>
            Our support team has been notified with your live location and will contact you immediately.
          </p>
          
          {currentLocation && (
            <div style={{ padding: '12px', background: '#f9fafb', borderRadius: '8px', marginBottom: '16px' }}>
              <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', margin: 0 }}>Location Shared:</p>
              <p style={{ fontSize: '12px', fontFamily: 'monospace', color: '#1f2937', margin: 0 }}>
                {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
              </p>
            </div>
          )}

          <Button
            expand="block"
            onClick={() => history.replace('/home')}
            variant="primary"
            size="md"
          >
            Return to Home
          </Button>
        </div>
      )}

      {/* Toast */}
      {showToast && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: '#1f2937',
          color: 'white',
          padding: '12px 24px',
          borderRadius: '8px',
          fontSize: '14px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 1000
        }}>
          {toastMessage}
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999
        }}>
          <div style={{
            background: 'white',
            padding: '24px',
            borderRadius: '12px',
            textAlign: 'center'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid #e5e7eb',
              borderTopColor: '#6366f1',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 12px'
            }} />
            <p style={{ margin: 0, color: '#4b5563' }}>Sending SOS alert...</p>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default SafetyPage;