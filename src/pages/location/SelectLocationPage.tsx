import { IonContent, IonPage } from '@ionic/react';
import { useState, useEffect } from 'react';
import { useHistory, useLocation } from 'react-router';
import { useJsApiLoader } from '@react-google-maps/api';
import { ArrowLeft, Check } from 'lucide-react';
import LocationSearch from '../../components/maps/LocationSearch';
import { mapsService } from '../../services';
import { Location } from '../../types/maps';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

interface LocationState {
  type: 'pickup' | 'dropoff' | 'start' | 'end';
  returnTo: string;
  initialLocation?: Location;
}

const SelectLocationPage = () => {
  const history = useHistory();
  const location = useLocation();
  const state = location.state as LocationState | undefined;
  
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [isReady, setIsReady] = useState(false);

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries: ['places'],
    version: 'weekly'
  });

  useEffect(() => {
    const initMaps = async () => {
      if (isLoaded && !loadError) {
        console.log('Google Maps loaded, initializing service...');
        const initialized = await mapsService.initialize();
        console.log('Maps service initialized:', initialized);
        setIsReady(true);
      }
    };
    initMaps();
  }, [isLoaded, loadError]);

  useEffect(() => {
    if (loadError) {
      console.error('Google Maps load error:', loadError);
    }
  }, [loadError]);

  const locationType = state?.type || 'pickup';
  const returnTo = state?.returnTo || '/home';

  const handleLocationSelect = (loc: Location) => {
    setSelectedLocation(loc);
  };

  const handleConfirm = () => {
    if (selectedLocation) {
      history.push(returnTo, {
        [locationType]: selectedLocation,
        ...(returnTo === '/find-ride' || returnTo === '/home' ? { 
          // Preserve other location if exists
        } : {})
      });
    }
  };

  const getTitle = () => {
    switch (locationType) {
      case 'pickup':
        return 'Select Pickup Location';
      case 'dropoff':
        return 'Select Drop-off Location';
      case 'start':
        return 'Select Start Location';
      case 'end':
        return 'Select End Location';
      default:
        return 'Select Location';
    }
  };

  const getPlaceholder = () => {
    switch (locationType) {
      case 'pickup':
        return 'Where would you like to be picked up?';
      case 'dropoff':
        return 'Where are you going?';
      case 'start':
        return 'Where will you start from?';
      case 'end':
        return 'Where will you end?';
      default:
        return 'Search for a location...';
    }
  };

  const getIcon = () => {
    switch (locationType) {
      case 'pickup':
      case 'start':
        return 'pickup' as const;
      case 'dropoff':
      case 'end':
        return 'drop' as const;
      default:
        return 'default' as const;
    }
  };

  if (loadError) {
    return (
      <IonPage>
        <IonContent className="bg-gray-50">
          <div style={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
            background: '#f9fafb'
          }}>
            <div style={{
              padding: '20px',
              background: '#fef2f2',
              borderRadius: '12px',
              border: '1px solid #fecaca',
              maxWidth: '300px'
            }}>
              <p style={{ color: '#dc2626', margin: 0, textAlign: 'center' }}>
                ?? Failed to load Google Maps. Please check your internet connection and try again.
              </p>
            </div>
            <button
              onClick={() => history.goBack()}
              style={{
                marginTop: '20px',
                padding: '12px 24px',
                background: '#6366f1',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px'
              }}
            >
              Go Back
            </button>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (!isLoaded) {
    return (
      <IonPage>
        <IonContent className="bg-gray-50">
          <div style={{
            height: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f9fafb'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '3px solid #e5e7eb',
              borderTopColor: '#6366f1',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <style>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage>
      <IonContent className="bg-gray-50">
        <div style={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#f9fafb'
        }}>
          {/* Header */}
          <div style={{
            padding: '16px',
            paddingTop: '48px',
            background: 'white',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <button
              onClick={() => history.goBack()}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                border: 'none',
                background: '#f3f4f6',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
            >
              <ArrowLeft size={20} color="#374151" />
            </button>
            <h1 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#1f2937',
              margin: 0
            }}>
              {getTitle()}
            </h1>
          </div>

          {/* Search */}
          <div style={{ padding: '16px', background: 'white' }}>
            <LocationSearch
              placeholder={getPlaceholder()}
              value={selectedLocation?.address || ''}
              onLocationSelect={handleLocationSelect}
              onClear={() => setSelectedLocation(null)}
              icon={getIcon()}
            />
          </div>

          {/* Selected Location Display */}
          {selectedLocation && (
            <div style={{
              margin: '16px',
              padding: '16px',
              background: 'white',
              borderRadius: '12px',
              border: '2px solid #6366f1'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Check size={20} color="#6366f1" />
                <span style={{ fontWeight: '500', color: '#1f2937' }}>
                  Selected Location
                </span>
              </div>
              <p style={{ margin: '8px 0 0', color: '#6b7280', fontSize: '14px' }}>
                {selectedLocation.address}
              </p>
            </div>
          )}

          {/* Confirm Button */}
          <div style={{
            marginTop: 'auto',
            padding: '16px',
            background: 'white',
            borderTop: '1px solid #e5e7eb'
          }}>
            <button
              onClick={handleConfirm}
              disabled={!selectedLocation}
              style={{
                width: '100%',
                padding: '16px',
                background: selectedLocation ? '#6366f1' : '#d1d5db',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: selectedLocation ? 'pointer' : 'not-allowed',
                opacity: selectedLocation ? 1 : 0.6
              }}
            >
              Confirm Location
            </button>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default SelectLocationPage;
