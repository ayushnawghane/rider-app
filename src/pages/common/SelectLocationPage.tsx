import { useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router';
import { ArrowLeft, CheckCircle2, MapPin, Navigation as NavigationIcon, Target } from 'lucide-react';
import { useJsApiLoader } from '@react-google-maps/api';
import { useAuth } from '../../context/AuthContext';
import { LocationSearch } from '../../components/maps';
import { mapsService, locationService } from '../../services';
import type { Location as MapLocation } from '../../types/maps';

type LocationType = 'pickup' | 'dropoff' | 'start' | 'end';

interface SelectLocationState {
  type?: LocationType;
  returnTo?: string;
  pickup?: MapLocation;
  dropoff?: MapLocation;
  start?: MapLocation;
  end?: MapLocation;
}

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const libraries: ('places')[] = ['places'];

const SelectLocationPage = () => {
  const { isClerkLoaded } = useAuth();
  const history = useHistory();
  const location = useLocation<SelectLocationState>();
  const [selectedLocation, setSelectedLocation] = useState<MapLocation | null>(null);
  const [manualAddress, setManualAddress] = useState('');
  const [isResolvingCurrent, setIsResolvingCurrent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navState = (location.state || {}) as SelectLocationState;
  const type = navState.type || 'pickup';
  const returnTo = navState.returnTo || '/home';

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY || '',
    libraries,
  });

  useEffect(() => {
    if (isLoaded) {
      mapsService.initialize();
    }
  }, [isLoaded]);

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

  const handleConfirm = () => {
    if (selectedLocation) {
      applySelectionAndReturn(selectedLocation);
      return;
    }

    if (!loadError && manualAddress.trim().length > 0) {
      applySelectionAndReturn({
        id: `manual-${Date.now()}`,
        name: manualAddress.trim(),
        address: manualAddress.trim(),
        lat: 0,
        lng: 0,
      });
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
        setError('Unable to read your current location.');
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

  if (!isClerkLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700 pt-12 pb-6 px-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => history.goBack()}
            className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"
            type="button"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">{title}</h1>
            <p className="text-primary-100 text-sm">Choose a location to continue</p>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-4 pb-6">
        <div className="bg-white rounded-2xl shadow-lg p-4 space-y-4">
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
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Google Maps is unavailable. Enter address manually.
              </p>
              <input
                value={manualAddress}
                onChange={(e) => setManualAddress(e.target.value)}
                placeholder={placeholder}
                className="w-full p-3 border border-gray-300 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          )}

          <button
            onClick={handleUseCurrentLocation}
            type="button"
            disabled={isResolvingCurrent || !isLoaded}
            className="w-full py-3 border-2 border-primary-200 text-primary-700 font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Target className="w-4 h-4" />
            {isResolvingCurrent ? 'Detecting current location...' : 'Use Current Location'}
          </button>

          {selectedLocation && (
            <div className="p-3 rounded-xl border border-green-200 bg-green-50">
              <div className="flex items-start gap-2">
                {iconMode === 'drop' ? (
                  <NavigationIcon className="w-5 h-5 text-green-600 mt-0.5" />
                ) : (
                  <MapPin className="w-5 h-5 text-primary-600 mt-0.5" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{selectedLocation.name}</p>
                  <p className="text-xs text-gray-600 break-words">{selectedLocation.address}</p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            onClick={handleConfirm}
            type="button"
            className="w-full py-3 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Confirm Location
          </button>
        </div>
      </div>
    </div>
  );
};

export default SelectLocationPage;
