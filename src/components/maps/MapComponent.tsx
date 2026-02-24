import React, { useEffect, useRef, useState } from 'react';
import { GoogleMap, Marker, Polyline, useJsApiLoader } from '@react-google-maps/api';
import { googleMapsLoaderOptions, hasGoogleMapsApiKey } from '../../lib/googleMapsLoader';

const defaultCenter = {
  lat: 28.6139,
  lng: 77.2090,
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

interface MapComponentProps {
  center?: { lat: number; lng: number };
  zoom?: number;
  className?: string;
  markers?: Array<{
    position: { lat: number; lng: number };
    title?: string;
    icon?: string;
  }>;
  routePath?: Array<{ lat: number; lng: number }>;
  onMapClick?: (e: google.maps.MapMouseEvent) => void;
  onMarkerDragEnd?: (index: number, position: { lat: number; lng: number }) => void;
  fitBounds?: boolean;
}

const MapComponent: React.FC<MapComponentProps> = ({
  center = defaultCenter,
  zoom = 14,
  className,
  markers = [],
  routePath,
  onMapClick,
  onMarkerDragEnd,
  fitBounds = false,
}) => {
  const mapRef = useRef<google.maps.Map | null>(null);
  const [isMapMounted, setIsMapMounted] = useState(false);
  const { isLoaded: isScriptLoaded, loadError } = useJsApiLoader({
    ...googleMapsLoaderOptions,
  });

  const onLoad = (map: google.maps.Map) => {
    mapRef.current = map;
    setIsMapMounted(true);

    if (fitBounds && markers.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      markers.forEach((marker) => bounds.extend(marker.position));
      map.fitBounds(bounds);
    }
  };

  const onUnmount = () => {
    mapRef.current = null;
    setIsMapMounted(false);
  };

  // Update bounds when markers change
  useEffect(() => {
    if (isMapMounted && mapRef.current && fitBounds && markers.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      markers.forEach((marker) => bounds.extend(marker.position));
      mapRef.current.fitBounds(bounds);
    }
  }, [markers, fitBounds, isMapMounted]);

  const mapContainerStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    borderRadius: '12px'
  };

  if (!hasGoogleMapsApiKey) {
    return (
      <div className={className} style={{ width: '100%', height: '100%' }}>
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '12px',
            background: '#f3f4f6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '12px',
            textAlign: 'center',
            color: '#6b7280',
            fontSize: '13px',
          }}
        >
          Maps unavailable. Missing VITE_GOOGLE_MAPS_API_KEY.
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className={className} style={{ width: '100%', height: '100%' }}>
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '12px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '12px',
            textAlign: 'center',
            color: '#b91c1c',
            fontSize: '13px',
          }}
        >
          Failed to load Google Maps.
        </div>
      </div>
    );
  }

  if (!isScriptLoaded || typeof window === 'undefined' || !window.google || !window.google.maps) {
    return (
      <div className={className} style={{ width: '100%', height: '100%' }}>
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '12px',
            background: '#f9fafb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#6b7280',
            fontSize: '13px',
          }}
        >
          Loading map...
        </div>
      </div>
    );
  }

  return (
    <div className={className} style={{ width: '100%', height: '100%' }}>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={zoom}
        options={mapOptions}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onClick={onMapClick}
      >
        {/* Render markers */}
        {markers.map((marker, index) => (
          <Marker
            key={index}
            position={marker.position}
            title={marker.title}
            icon={marker.icon}
            draggable={!!onMarkerDragEnd}
            onDragEnd={(e) => {
              if (e.latLng && onMarkerDragEnd) {
                onMarkerDragEnd(index, {
                  lat: e.latLng.lat(),
                  lng: e.latLng.lng(),
                });
              }
            }}
          />
        ))}

        {/* Render route polyline */}
        {routePath && routePath.length > 0 && (
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
    </div>
  );
};

export default MapComponent;
