import { useState, useEffect } from 'react';
import { useHistory, useLocation } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { sosService, locationService } from '../../services';
import { isUuid } from '../../utils/helpers';
import { MapComponent } from '../../components/maps';
import LoadingOverlay from '../../components/LoadingOverlay';
import {
  ChevronLeft,
  ShieldAlert,
  Navigation,
  AlertTriangle,
  CheckCircle2,
  Phone,
  MapPin,
  Zap,
  MessageCircle,
} from 'lucide-react';

const FIRE = 'linear-gradient(100deg, var(--fire-red), var(--fire-amber))';
const ALERT = 'linear-gradient(135deg, #FF3D00 0%, #D81E00 100%)';

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
  },
];

const tipIcon = (id: number) => {
  if (id === 1) return <Phone className="h-5 w-5" />;
  if (id === 2) return <MapPin className="h-5 w-5" />;
  return <Zap className="h-5 w-5" />;
};

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
  // Only trust a well-formed ride id; a bad ?rideId=… must never block a
  // safety-critical SOS with a UUID/FK error.
  const rawRideId = queryParams.get('rideId');
  const preselectedRideId = isUuid(rawRideId) ? rawRideId : undefined;

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
    } else if (number.includes('@')) {
      window.location.href = `mailto:${number}`;
    } else {
      showToastMessage(`Contact: ${number}`);
    }
  };

  return (
    <div className="app-scroll-screen app-bottom-nav-safe relative overflow-hidden bg-white">
      {/* Subtle grainy aura */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[280px]">
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(120% 72% at 82% -10%, rgba(255,107,0,0.34) 0%, rgba(255,160,30,0.12) 46%, rgba(255,255,255,0) 74%)' }}
        />
        <div className="absolute -right-16 -top-12 h-64 w-64 rounded-full animate-aurora-1" style={{ background: 'radial-gradient(circle, rgba(255,200,50,0.52) 0%, transparent 62%)', filter: 'blur(48px)' }} />
      </div>

      <div className="relative z-10 px-4 pb-6 pt-[calc(env(safe-area-inset-top)+18px)]">
        <div className="mx-auto max-w-2xl">
          {/* Header */}
          <header className="mb-4 flex items-center gap-3">
            <button
              onClick={() => history.goBack()}
              aria-label="Back"
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-black/10 bg-white/70 text-ink shadow-soft backdrop-blur-sm transition active:scale-95"
            >
              <ChevronLeft size={22} strokeWidth={2.5} />
            </button>
            <div>
              <p className="mb-0.5 font-display text-xs font-bold uppercase tracking-[0.2em] text-fire-red">Stay safe</p>
              <h1 className="font-display text-[2rem] font-extrabold leading-[0.9] tracking-tight text-ink">Safety &amp; SOS</h1>
            </div>
          </header>

          {!sosSent ? (
            <>
              {/* Your Location */}
              <div className="mb-4">
                <h2 className="mb-3 font-display text-lg font-extrabold tracking-tight text-ink">Your location</h2>
                <div className="relative h-44 overflow-hidden rounded-[16px] border border-black/5 bg-paper shadow-soft">
                  {currentLocation ? (
                    <>
                      <MapComponent
                        center={currentLocation}
                        markers={[{ position: currentLocation, title: 'Your Location' }]}
                        zoom={16}
                      />
                      {isTracking && (
                        <div className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-white/95 px-3 py-1.5 shadow-soft">
                          <span className="h-2 w-2 rounded-full bg-emerald-500" />
                          <span className="font-display text-xs font-bold text-ink/70">Live location</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <div className="text-center">
                        <MapPin className="mx-auto h-10 w-10 text-ink/30" />
                        <p className="mt-2 text-sm font-medium text-ink/50">Getting your location...</p>
                      </div>
                    </div>
                  )}
                </div>

                {currentLocation && (
                  <div className="mt-2 flex items-center justify-between rounded-2xl border border-black/5 bg-white p-3 shadow-soft">
                    <div className="flex items-center gap-2">
                      <Navigation className="h-4 w-4 text-fire-orange" />
                      <span className="font-mono text-sm text-ink/60">
                        {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
                      </span>
                    </div>
                    <button
                      onClick={handleShareLocation}
                      className="rounded-xl px-3 py-1.5 font-display text-sm font-bold text-fire-orange transition hover:bg-primary-50 active:scale-95"
                    >
                      Share
                    </button>
                  </div>
                )}

                {locationError && (
                  <div className="mt-2 flex items-start gap-3 rounded-2xl border border-fire-red/20 bg-fire-red/5 p-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-fire-red" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-fire-red">{locationError}</p>
                      <button
                        onClick={getCurrentLocation}
                        className="mt-1 font-display text-sm font-bold text-fire-red transition hover:brightness-90"
                      >
                        Try Again
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* SOS Card */}
              <div className="mb-4 rounded-[18px] p-4 text-center shadow-strong" style={{ background: ALERT }}>
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                  <ShieldAlert className="h-8 w-8 text-white" strokeWidth={2.5} />
                </div>
                <h2 className="font-display text-2xl font-extrabold tracking-tight text-white">Emergency SOS</h2>
                <p className="mx-auto mt-2 max-w-sm text-sm font-medium text-white/90">
                  In case of emergency, tap the button below to alert our support team with your live location.
                </p>
                <button
                  onClick={handleSOS}
                  disabled={loading || !currentLocation}
                  className="mt-3 w-full rounded-2xl bg-white py-4 font-display text-lg font-extrabold tracking-tight text-[#D81E00] shadow-lg transition active:scale-[0.98] disabled:opacity-70"
                >
                  {loading ? 'Sending Alert...' : 'SOS EMERGENCY'}
                </button>
                {!currentLocation && (
                  <p className="mt-2 text-xs font-medium text-white/80">Waiting for location...</p>
                )}
              </div>

              {/* Safety Tips */}
              <div className="mb-4">
                <h2 className="mb-3 font-display text-lg font-extrabold tracking-tight text-ink">Safety tips</h2>
                <div className="space-y-2.5">
                  {safetyTips.map((tip) => (
                    <div key={tip.id} className="flex items-start gap-3 rounded-[14px] border border-black/5 bg-white p-3.5 shadow-soft">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary-100 bg-gradient-to-br from-primary-50 to-white text-fire-orange">
                        {tipIcon(tip.id)}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-display font-bold text-ink">{tip.title}</h3>
                        <p className="mt-0.5 text-sm font-medium text-ink/55">{tip.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Emergency Contacts */}
              <div className="mb-2">
                <h2 className="mb-3 font-display text-lg font-extrabold tracking-tight text-ink">Emergency contacts</h2>
                <div className="space-y-3">
                  <button
                    onClick={() => handleEmergencyCall('tel:112')}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 font-display font-bold text-white shadow-strong transition active:scale-[0.98]"
                    style={{ background: ALERT }}
                  >
                    <Phone className="h-5 w-5" strokeWidth={2.5} />
                    Emergency Services (112)
                  </button>
                  <button
                    onClick={() => handleEmergencyCall('support@blinkcar.com')}
                    className="grain grain-strong relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl py-3.5 font-display font-bold text-white shadow-glow transition active:scale-[0.98]"
                    style={{ background: FIRE }}
                  >
                    <MessageCircle className="h-5 w-5" strokeWidth={2.5} />
                    Blink Car Support
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-[18px] border border-black/5 bg-white p-4 text-center shadow-strong">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 className="h-9 w-9 text-emerald-600" />
              </div>
              <h2 className="mt-4 font-display text-2xl font-extrabold tracking-tight text-emerald-600">SOS Alert Sent!</h2>
              <p className="mt-2 text-sm font-medium text-ink/55">
                Our support team has been notified with your live location and will contact you immediately.
              </p>

              {currentLocation && (
                <div className="mt-4 rounded-2xl border border-black/5 bg-paper p-3">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-ink/40">Location shared</p>
                  <p className="mt-0.5 font-mono text-xs text-ink">
                    {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
                  </p>
                </div>
              )}

              <button
                onClick={() => history.replace('/home')}
                className="grain grain-strong relative mt-4 w-full overflow-hidden rounded-2xl py-3.5 font-display font-bold text-white shadow-glow transition active:scale-[0.98]"
                style={{ background: FIRE }}
              >
                Return to Home
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {showToast && (
        <div className="fixed left-1/2 z-[1000] -translate-x-1/2 rounded-2xl bg-ink px-6 py-3 text-sm font-medium text-white shadow-strong" style={{ bottom: 'calc(var(--app-bottom-nav-height) + 16px)' }}>
          {toastMessage}
        </div>
      )}

      <LoadingOverlay isOpen={loading} variant="fullscreen" message="Sending SOS alert..." />
    </div>
  );
};

export default SafetyPage;
