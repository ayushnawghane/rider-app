/**
 * MapComponent
 * Reusable map component using Google Maps
 */

import React, { useEffect, useRef, useState } from 'react';
import { LoadScript, GoogleMap, Marker, Polyline } from '@react-google-maps/api';

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

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
  markers?: Array<{
    position: { lat: number; lng: number };
    title?: string;
    icon?: string;
  }>;
  routePath?: Array<{ lat: number; lng: number }>;
  onMapClick?: (e: google.maps.MapMouseEvent) => void;
  onMarkerDragEnd?: (index: number, position: { lat: number; lng: number }) => void;
  fitBounds?: boolean;
  className?: string;
}

const MapComponent: React.FC<MapComponentProps> = ({
  center = defaultCenter,
  zoom = 14,
  markers = [],
  routePath,
  onMapClick,
  onMarkerDragEnd,
  fitBounds = false,
  className = '',
}) => {
  const mapRef = useRef<google.maps.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const onLoad = (map: google.maps.Map) => {
    mapRef.current = map;
    setIsLoaded(true);

    if (fitBounds && markers.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      markers.forEach((marker) => bounds.extend(marker.position));
      map.fitBounds(bounds);
    }
  };

  const onUnmount = () => {
    mapRef.current = null;
  };

  // Update bounds when markers change
  useEffect(() => {
    if (isLoaded && mapRef.current && fitBounds && markers.length > 0) {
      const bounds = new google.maps.LatLngBounds();
      markers.forEach((marker) => bounds.extend(marker.position));
      mapRef.current.fitBounds(bounds);
    }
  }, [markers, fitBounds, isLoaded]);

  return (
    <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY} libraries={['places']}>
      <div className={`relative ${className}`} style={{ width: '100%', height: '100%' }}>
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
                strokeColor: '#3B82F6',
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
    </LoadScript>
  );
};

export default MapComponent;
