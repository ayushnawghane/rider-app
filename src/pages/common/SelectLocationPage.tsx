import { useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router';
import { CheckCircle2, MapPin, Navigation as NavigationIcon, Target, ChevronLeft } from 'lucide-react';
import { useJsApiLoader } from '@react-google-maps/api';
import { useAuth } from '../../context/AuthContext';
import { PageLoader } from '../../components/ui';
import { LocationSearch } from '../../components/maps';
import { googleMapsLoaderOptions } from '../../lib/googleMapsLoader';
import { mapsService, locationService } from '../../services';
import type { Location as MapLocation } from '../../types/maps';

const FIRE = 'linear-gradient(100deg, var(--fire-red), var(--fire-amber))';

type LocationType = 'pickup' | 'dropoff' | 'start' | 'end';

interface SelectLocationState {
  type?: LocationType;
  returnTo?: string;
  pickup?: MapLocation;
  dropoff?: MapLocation;
  start?: MapLocation;
  end?: MapLocation;
}

const SelectLocationPage = () => {
  const { isAuthLoaded } = useAuth();
  const history = useHistory();
  const location = useLocation<SelectLocationState>();
  const [selectedLocation, setSelectedLocation] = useState<MapLocation | null>(null);
  const [manualAddress, setManualAddress] = useState('');
  const [isResolvingCurrent, setIsResolvingCurrent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navState = useMemo(() => (location.state || {}) as SelectLocationState, [location.state]);
  const type = navState.type || 'pickup';
  const returnTo = navState.returnTo || '/home';

  const { isLoaded, loadError } = useJsApiLoader({
    ...googleMapsLoaderOptions,
  });

  useEffect(() => {
    if (isLoaded) {
      mapsService.initialize();
    }
  }, [isLoaded]);

  useEffect(() => {
    const existing = navState[type];
    if (existing) {
      setSelectedLocation(existing);
      setManualAddress(existing.address);
    } else {
      setSelectedLocation(null);
      setManualAddress('');
    }
    setError(null);
  }, [navState, type]);

  const title = useMemo(() => {
    if (type === 'dropoff' || type === 'end') return 'Select Drop Location';
    return 'Select Pickup Location';
  }, [type]);

  const placeholder = useMemo(() => {
    if (type === 'dropoff' || type === 'end') return 'Search drop location';
    return 'Search pickup location';
  }, [type]);

  const iconMode = useMemo(() => {
    if (type === 'dropoff' || type === 'end') return 'drop' as const;
    return 'pickup' as const;
  }, [type]);

  const applySelectionAndReturn = (selected: MapLocation) => {
    const nextState: SelectLocationState = {
      ...navState,
      [type]: selected,
    };
    history.push(returnTo, nextState);
  };

  const handleConfirm = async () => {
    if (selectedLocation) {
      applySelectionAndReturn(selectedLocation);
      return;
    }

    // If the user typed a free-text address without picking a suggestion, geocode
    // it to real coordinates. Never fall back to (0,0) — that "null island"
    // point breaks route calculation and map centering downstream.
    if (!loadError && manualAddress.trim().length > 0) {
      const geocoded = await mapsService.geocodeAddress(manualAddress.trim());
      if (geocoded) {
        applySelectionAndReturn(geocoded);
        return;
      }
      setError('We couldn’t locate that address. Please pick one from the suggestions.');
      return;
    }

    setError('Please select a location first.');
  };

  const handleUseCurrentLocation = async () => {
    setError(null);
    setIsResolvingCurrent(true);
    try {
      const coords = await locationService.getCurrentPosition();
      if (!coords) {
        setError('Unable to detect your location right now. Ensure GPS is on and try again from an open area.');
        return;
      }

      const reverse = await mapsService.reverseGeocode(coords.lat, coords.lng);
      if (!reverse) {
        setError('Could not resolve address for current location.');
        return;
      }

      setSelectedLocation(reverse);
    } catch (resolveError) {
      console.error('Failed to resolve current location:', resolveError);
      setError('Failed to fetch current location.');
    } finally {
      setIsResolvingCurrent(false);
    }
  };

  if (!isAuthLoaded) {
    return <PageLoader />;
  }

  return (
    <div className="app-scroll-screen app-bottom-nav-safe relative overflow-hidden bg-white">
      {/* Grainy orange aura */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[300px]">
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(120% 72% at 82% -10%, rgba(255,107,0,0.4) 0%, rgba(255,160,30,0.15) 46%, rgba(255,255,255,0) 74%)' }}
        />
        <div className="absolute -right-16 -top-12 h-72 w-72 rounded-full animate-aurora-1" style={{ background: 'radial-gradient(circle, rgba(255,200,50,0.62) 0%, transparent 62%)', filter: 'blur(48px)' }} />
      </div>

      <div className="relative z-10 px-4 pb-6 pt-[calc(env(safe-area-inset-top)+20px)]">
        <div className="mx-auto max-w-2xl">
          {/* Header */}
          <div className="mb-6 flex items-center gap-3">
            <button
              onClick={() => history.goBack()}
              aria-label="Back"
              className="flex h-11 w-11 items-center justify-center rounded-2xl border border-black/10 bg-white/70 text-ink shadow-soft backdrop-blur-sm transition active:scale-95"
            >
              <ChevronLeft size={22} strokeWidth={2.5} />
            </button>
            <div>
              <p className="mb-0.5 font-display text-xs font-bold uppercase tracking-[0.2em] text-fire-orange">Location</p>
              <h1 className="font-display text-[1.9rem] font-extrabold leading-[0.9] tracking-tight text-ink">{title}</h1>
            </div>
          </div>

          <div className="space-y-4 rounded-[18px] border border-black/5 bg-white/85 p-4 shadow-strong backdrop-blur-md">
            {!loadError ? (
              <LocationSearch
                placeholder={placeholder}
                value={selectedLocation?.address || ''}
                onLocationSelect={(loc) => {
                  setError(null);
                  setSelectedLocation(loc);
                }}
                icon={iconMode}
                onClear={() => setSelectedLocation(null)}
              />
            ) : (
              <div className="space-y-2">
                <p className="rounded-xl border border-fire-gold/30 bg-fire-gold/10 px-3 py-2 text-sm font-medium text-[#7a4a00]">
                  Google Maps is unavailable. Enter address manually.
                </p>
                <input
                  value={manualAddress}
                  onChange={(e) => setManualAddress(e.target.value)}
                  placeholder={placeholder}
                  className="w-full rounded-2xl border-2 border-black/10 bg-white p-3 font-medium text-ink outline-none transition focus:border-fire-orange focus:ring-2 focus:ring-[rgba(255,107,0,0.18)]"
                />
              </div>
            )}

            <button
              onClick={handleUseCurrentLocation}
              type="button"
              disabled={isResolvingCurrent || !isLoaded}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-primary-200 py-3.5 font-display font-bold text-primary-700 transition hover:bg-primary-50 active:scale-[0.98] disabled:opacity-60"
            >
              <Target className="h-4 w-4" strokeWidth={2.5} />
              {isResolvingCurrent ? 'Detecting current location...' : 'Use Current Location'}
            </button>

            {selectedLocation && (
              <div className="rounded-2xl border border-primary-100 bg-primary-50/60 p-3">
                <div className="flex items-start gap-2.5">
                  {iconMode === 'drop' ? (
                    <NavigationIcon className="mt-0.5 h-5 w-5 text-fire-gold" />
                  ) : (
                    <MapPin className="mt-0.5 h-5 w-5 text-fire-orange" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-display font-bold text-ink">{selectedLocation.name}</p>
                    <p className="break-words text-xs font-medium text-ink/55">{selectedLocation.address}</p>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <p className="rounded-xl border border-fire-red/20 bg-fire-red/5 px-3 py-2 text-sm font-medium text-fire-red">
                {error}
              </p>
            )}

            <button
              onClick={handleConfirm}
              type="button"
              className="grain grain-strong relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl py-4 font-display text-lg font-bold tracking-tight text-white shadow-glow transition-all active:scale-[0.98]"
              style={{ background: FIRE }}
            >
              <CheckCircle2 className="h-5 w-5" strokeWidth={2.5} />
              Confirm Location
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SelectLocationPage;
