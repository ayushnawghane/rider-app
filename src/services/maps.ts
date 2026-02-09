/**
 * Google Maps Service
 * Handles all map-related operations including geocoding, directions, and autocomplete
 */

import { Location, RouteData, RideEstimate } from '../types/maps';

class GoogleMapsService {
  private geocoder: google.maps.Geocoder | null = null;
  private directionsService: google.maps.DirectionsService | null = null;
  private placesService: google.maps.places.AutocompleteService | null = null;
  private placesSessionToken: google.maps.places.AutocompleteSessionToken | null = null;

  constructor() {
    this.initializeServices();
  }

  private initializeServices() {
    if (typeof window !== 'undefined' && window.google) {
      this.geocoder = new google.maps.Geocoder();
      this.directionsService = new google.maps.DirectionsService();
      this.placesService = new google.maps.places.AutocompleteService();
      this.placesSessionToken = new google.maps.places.AutocompleteSessionToken();
    }
  }

  // Geocode address to coordinates
  async geocodeAddress(address: string): Promise<Location | null> {
    if (!this.geocoder) {
      this.initializeServices();
    }

    return new Promise((resolve) => {
      this.geocoder?.geocode({ address }, (results, status) => {
        if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
          const location = results[0].geometry.location;
          resolve({
            id: results[0].place_id,
            name: results[0].formatted_address.split(',')[0],
            address: results[0].formatted_address,
            lat: location.lat(),
            lng: location.lng(),
            placeId: results[0].place_id,
          });
        } else {
          resolve(null);
        }
      });
    });
  }

  // Reverse geocode coordinates to address
  async reverseGeocode(lat: number, lng: number): Promise<Location | null> {
    if (!this.geocoder) {
      this.initializeServices();
    }

    return new Promise((resolve) => {
      this.geocoder?.geocode({ location: { lat, lng } }, (results, status) => {
        if (status === google.maps.GeocoderStatus.OK && results && results[0]) {
          resolve({
            id: results[0].place_id,
            name: results[0].formatted_address.split(',')[0],
            address: results[0].formatted_address,
            lat,
            lng,
            placeId: results[0].place_id,
          });
        } else {
          resolve(null);
        }
      });
    });
  }

  // Get autocomplete predictions
  async getPlacePredictions(input: string): Promise<google.maps.places.AutocompletePrediction[]> {
    if (!this.placesService) {
      this.initializeServices();
    }

    return new Promise((resolve) => {
      this.placesService?.getPlacePredictions(
        {
          input,
          sessionToken: this.placesSessionToken || undefined,
          types: ['geocode', 'establishment'],
        },
        (predictions, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
            resolve(predictions);
          } else {
            resolve([]);
          }
        }
      );
    });
  }

  // Get place details
  async getPlaceDetails(placeId: string): Promise<Location | null> {
    return new Promise((resolve) => {
      const service = new google.maps.places.PlacesService(
        document.createElement('div')
      );

      service.getDetails(
        {
          placeId,
          fields: ['name', 'formatted_address', 'geometry', 'place_id'],
          sessionToken: this.placesSessionToken || undefined,
        },
        (place, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && place && place.geometry) {
            resolve({
              id: place.place_id || placeId,
              name: place.name || place.formatted_address?.split(',')[0] || '',
              address: place.formatted_address || '',
              lat: place.geometry.location?.lat() || 0,
              lng: place.geometry.location?.lng() || 0,
              placeId: place.place_id,
            });
          } else {
            resolve(null);
          }
        }
      );
    });
  }

  // Calculate route between two points
  async calculateRoute(
    origin: { lat: number; lng: number } | string,
    destination: { lat: number; lng: number } | string
  ): Promise<RouteData | null> {
    if (!this.directionsService) {
      this.initializeServices();
    }

    return new Promise((resolve) => {
      this.directionsService?.route(
        {
          origin,
          destination,
          travelMode: google.maps.TravelMode.DRIVING,
          provideRouteAlternatives: false,
          optimizeWaypoints: false,
        },
        (result, status) => {
          if (status === google.maps.DirectionsStatus.OK && result && result.routes[0]) {
            const route = result.routes[0];
            const leg = route.legs[0];

            resolve({
              distance: leg.distance?.text || '',
              duration: leg.duration?.text || '',
              distanceValue: leg.distance?.value || 0,
              durationValue: leg.duration?.value || 0,
              polyline: route.overview_polyline,
              bounds: route.bounds,
              legs: route.legs,
            });
          } else {
            resolve(null);
          }
        }
      );
    });
  }

  // Get ride estimates based on distance
  getRideEstimates(distanceKm: number, durationMinutes: number): RideEstimate[] {
    const baseFare = 50; // Base fare in INR
    const perKmRate = 12;
    const perMinuteRate = 2;

    const calculatePrice = (multiplier: number) => {
      return Math.round(
        (baseFare + distanceKm * perKmRate + durationMinutes * perMinuteRate) * multiplier
      );
    };

    const getETA = (minutes: number) => {
      const eta = new Date(Date.now() + minutes * 60000);
      return eta.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    };

    return [
      {
        type: 'economy',
        name: 'Economy',
        capacity: '4 seats',
        eta: getETA(3),
        price: calculatePrice(1),
        currency: '₹',
      },
      {
        type: 'comfort',
        name: 'Comfort',
        capacity: '4 seats',
        eta: getETA(5),
        price: calculatePrice(1.3),
        currency: '₹',
      },
      {
        type: 'premium',
        name: 'Premium',
        capacity: '4 seats',
        eta: getETA(7),
        price: calculatePrice(1.8),
        currency: '₹',
      },
      {
        type: 'suv',
        name: 'SUV',
        capacity: '6 seats',
        eta: getETA(8),
        price: calculatePrice(2.2),
        currency: '₹',
      },
    ];
  }

  // Decode polyline to array of coordinates
  decodePolyline(encoded: string): { lat: number; lng: number }[] {
    const path: { lat: number; lng: number }[] = [];
    let index = 0;
    let lat = 0;
    let lng = 0;

    while (index < encoded.length) {
      let shift = 0;
      let result = 0;

      do {
        const b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (result & 0x20);

      const dlat = result & 1 ? ~(result >> 1) : result >> 1;
      lat += dlat;

      shift = 0;
      result = 0;

      do {
        const b = encoded.charCodeAt(index++) - 63;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (result & 0x20);

      const dlng = result & 1 ? ~(result >> 1) : result >> 1;
      lng += dlng;

      path.push({
        lat: lat / 1e5,
        lng: lng / 1e5,
      });
    }

    return path;
  }

  // Reset session token for billing optimization
  resetSessionToken() {
    this.placesSessionToken = new google.maps.places.AutocompleteSessionToken();
  }
}

export const mapsService = new GoogleMapsService();
export default mapsService;
