/**
 * Google Maps Types
 * Type definitions for Google Maps integration
 */

declare global {
  interface Window {
    google: typeof google;
  }
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Location {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  placeId?: string;
}

export interface RouteData {
  distance: string;
  duration: string;
  distanceValue: number;
  durationValue: number;
  polyline: string;
  bounds: google.maps.LatLngBounds;
  legs: google.maps.DirectionsLeg[];
}

export interface MapMarker {
  position: LatLng;
  title?: string;
  icon?: string;
}

export interface RideEstimate {
  type: string;
  name: string;
  capacity: string;
  eta: string;
  price: number;
  currency: string;
}
