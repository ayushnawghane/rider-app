import React, { useEffect, useState } from 'react';
import { GoogleMap, Marker, Polyline } from '@react-google-maps/api';
import { mapsService } from '../../services';
import { Location, RouteData, RideEstimate } from '../../types/maps';

interface RoutePreviewProps {
  pickup: Location | null;
  drop: Location | null;
  onRideSelect?: (estimate: RideEstimate) => void;
  onConfirm?: (estimate: RideEstimate) => void;
  showEstimates?: boolean;
}

const vehicleEmojis: Record<string, string> = {
  economy: '🚗',
  comfort: '⭐',
  premium: '💎',
  suv: '🚙',
};

const RoutePreview: React.FC<RoutePreviewProps> = ({
  pickup,
  drop,
  onRideSelect,
  onConfirm,
  showEstimates = true,
}) => {
  const [routeData, setRouteData] = useState<RouteData | null>(null);
  const [estimates, setEstimates] = useState<RideEstimate[]>([]);
  const [selectedEstimate, setSelectedEstimate] = useState<RideEstimate | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [routePath, setRoutePath] = useState<Array<{ lat: number; lng: number }>>([]);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  // Calculate route when pickup or drop changes
  useEffect(() => {
    const calculateRoute = async () => {
      if (!pickup || !drop) {
        setRouteData(null);
        setEstimates([]);
        setRoutePath([]);
        return;
      }

      setIsLoading(true);
      const route = await mapsService.calculateRoute(
        { lat: pickup.lat, lng: pickup.lng },
        { lat: drop.lat, lng: drop.lng }
      );

      if (route) {
        setRouteData(route);
        
        // Decode polyline to path
        const decodedPath = mapsService.decodePolyline(route.polyline);
        setRoutePath(decodedPath);

        // Calculate estimates
        const distanceKm = route.distanceValue / 1000;
        const durationMinutes = Math.round(route.durationValue / 60);
        const rideEstimates = mapsService.getRideEstimates(distanceKm, durationMinutes);
        setEstimates(rideEstimates);
      }

      setIsLoading(false);
    };

    calculateRoute();
  }, [pickup, drop]);

  // Fit bounds when map loads or markers change
  useEffect(() => {
    if (map && pickup && drop) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend({ lat: pickup.lat, lng: pickup.lng });
      bounds.extend({ lat: drop.lat, lng: drop.lng });
      map.fitBounds(bounds);
    }
  }, [map, pickup, drop]);

  const handleEstimateSelect = (estimate: RideEstimate) => {
    setSelectedEstimate(estimate);
    onRideSelect?.(estimate);
  };

  const mapCenter = pickup || drop || { lat: 28.6139, lng: 77.2090 };

  const mapContainerStyle: React.CSSProperties = {
    width: '100%',
    height: '100%'
  };

  const mapOptions: google.maps.MapOptions = {
    disableDefaultUI: false,
    zoomControl: true,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
    styles: [
      {
        featureType: 'poi',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }],
      },
    ],
  };

  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    height: '100%'
  };

  const mapSectionStyle: React.CSSProperties = {
    flex: 1,
    position: 'relative',
    minHeight: '300px'
  };

  const routeInfoOverlayStyle: React.CSSProperties = {
    position: 'absolute',
    top: '16px',
    left: '16px',
    right: '16px',
    background: 'rgba(255,255,255,0.95)',
    backdropFilter: 'blur(4px)',
    borderRadius: '12px',
    padding: '12px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
  };

  const bottomSheetStyle: React.CSSProperties = {
    background: 'white',
    borderRadius: '24px 24px 0 0',
    boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
    marginTop: '-24px',
    position: 'relative',
    zIndex: 10
  };

  const handleBarStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    paddingTop: '12px',
    paddingBottom: '8px'
  };

  const handleStyle: React.CSSProperties = {
    width: '48px',
    height: '4px',
    background: '#d1d5db',
    borderRadius: '2px'
  };

  const contentStyle: React.CSSProperties = {
    padding: '0 16px',
    paddingBottom: selectedEstimate ? '100px' : '24px',
    maxHeight: '50vh',
    overflowY: 'auto'
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: '600',
    color: '#1f2937',
    margin: '0 0 16px 0'
  };

  const estimateCardStyle = (isSelected: boolean): React.CSSProperties => ({
    width: '100%',
    padding: '16px',
    background: isSelected ? '#eef2ff' : 'white',
    borderRadius: '12px',
    border: isSelected ? '2px solid #6366f1' : '1px solid #e5e7eb',
    marginBottom: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    transition: 'all 0.2s'
  });

  const iconContainerStyle = (isSelected: boolean): React.CSSProperties => ({
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    background: isSelected ? '#e0e7ff' : '#f3f4f6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px'
  });

  const priceStyle: React.CSSProperties = {
    fontWeight: '700',
    fontSize: '18px',
    color: '#1f2937'
  };

  const ctaContainerStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: '16px',
    background: 'white',
    borderTop: '1px solid #e5e7eb'
  };

  const primaryButtonStyle: React.CSSProperties = {
    width: '100%',
    padding: '16px 24px',
    background: '#6366f1',
    color: 'white',
    borderRadius: '12px',
    fontSize: '16px',
    fontWeight: '600',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px'
  };

  const skeletonStyle: React.CSSProperties = {
    background: '#e5e7eb',
    borderRadius: '8px',
    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
  };

  return (
    <div style={containerStyle}>
      {/* Map Section */}
      <div style={mapSectionStyle}>
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={mapCenter}
          zoom={14}
          options={mapOptions}
          onLoad={setMap}
        >
          {/* Pickup Marker */}
          {pickup && (
            <Marker
              position={{ lat: pickup.lat, lng: pickup.lng }}
              title="Pickup"
              icon={{
                url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTIiIGZpbGw9IiM2MzY2ZjEiLz4KPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iNiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+',
                scaledSize: new google.maps.Size(32, 32)
              }}
            />
          )}

          {/* Drop Marker */}
          {drop && (
            <Marker
              position={{ lat: drop.lat, lng: drop.lng }}
              title="Drop"
              icon={{
                url: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iMTIiIGZpbGw9IiMyMmM1NWUiLz4KPGNpcmNsZSBjeD0iMTYiIGN5PSIxNiIgcj0iNiIgZmlsbD0id2hpdGUiLz4KPC9zdmc+',
                scaledSize: new google.maps.Size(32, 32)
              }}
            />
          )}

          {/* Route Polyline */}
          {routePath.length > 0 && (
            <Polyline
              path={routePath}
              options={{
                strokeColor: '#6366f1',
                strokeOpacity: 0.8,
                strokeWeight: 4,
                clickable: false,
                draggable: false,
                editable: false,
                visible: true,
                zIndex: 1,
              }}
            />
          )}
        </GoogleMap>

        {/* Route Info Overlay */}
        {routeData && (
          <div style={routeInfoOverlayStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '16px' }}>📍</span>
                  <span style={{ fontSize: '13px', color: '#4b5563', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {pickup?.name || 'Pickup'}
                  </span>
                </div>
                <span style={{ fontSize: '14px', color: '#9ca3af' }}>→</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '16px' }}>🏁</span>
                  <span style={{ fontSize: '13px', color: '#4b5563', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {drop?.name || 'Drop'}
                  </span>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '8px', paddingTop: '8px', borderTop: '1px solid #f3f4f6' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#4b5563' }}>
                <span>📏</span>
                {routeData.distance}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#4b5563' }}>
                <span>⏱️</span>
                {routeData.duration}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Sheet - Ride Options */}
      {showEstimates && (
        <div style={bottomSheetStyle}>
          {/* Handle bar */}
          <div style={handleBarStyle}>
            <div style={handleStyle} />
          </div>

          <div style={contentStyle}>
            <h3 style={titleStyle}>Choose a ride</h3>

            {isLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[1, 2, 3].map((i) => (
                  <div key={i} style={{ padding: '16px', background: 'white', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ ...skeletonStyle, width: '48px', height: '48px', borderRadius: '12px' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ ...skeletonStyle, height: '16px', width: '80px', marginBottom: '8px' }} />
                        <div style={{ ...skeletonStyle, height: '12px', width: '120px' }} />
                      </div>
                      <div style={{ ...skeletonStyle, height: '20px', width: '60px' }} />
                    </div>
                  </div>
                ))}
                <style>{`
                  @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: .5; }
                  }
                `}</style>
              </div>
            ) : estimates.length > 0 ? (
              <div>
                {estimates.map((estimate) => (
                  <button
                    key={estimate.type}
                    onClick={() => handleEstimateSelect(estimate)}
                    style={estimateCardStyle(selectedEstimate?.type === estimate.type)}
                    type="button"
                  >
                    <div style={iconContainerStyle(selectedEstimate?.type === estimate.type)}>
                      {vehicleEmojis[estimate.type] || '🚗'}
                    </div>
                    <div style={{ flex: 1, textAlign: 'left' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h4 style={{ fontSize: '15px', fontWeight: '600', color: '#1f2937', margin: 0 }}>
                          {estimate.name}
                        </h4>
                        <span style={{ fontSize: '12px', color: '#6b7280' }}>• {estimate.eta}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                        <span style={{ fontSize: '13px', color: '#6b7280' }}>👥 {estimate.capacity}</span>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <p style={priceStyle}>
                        {estimate.currency}{estimate.price}
                      </p>
                      <p style={{ fontSize: '11px', color: '#9ca3af', margin: 0 }}>est. fare</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <span style={{ fontSize: '48px' }}>🚗</span>
                <p style={{ fontSize: '14px', color: '#6b7280', margin: '12px 0 0 0' }}>
                  Select pickup and drop locations to see ride options
                </p>
              </div>
            )}
          </div>

          {/* Sticky CTA */}
          {selectedEstimate && (
            <div style={ctaContainerStyle}>
              <button
                onClick={() => onConfirm?.(selectedEstimate)}
                style={primaryButtonStyle}
                type="button"
              >
                Choose {selectedEstimate.name}
                <span>›</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RoutePreview;
