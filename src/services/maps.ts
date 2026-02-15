/**
 * Google Maps Service
 * Handles all map-related operations including geocoding, directions, and autocomplete
 */

import { Location, RouteData, RideEstimate } from '../types/maps';

class GoogleMapsService {
  private geocoder: google.maps.Geocoder | null = null;
  private directionsService: google.maps.DirectionsService | null = null;
  private autocompleteService: google.maps.places.AutocompleteService | null = null;
  private placesService: google.maps.places.PlacesService | null = null;
  private sessionToken: google.maps.places.AutocompleteSessionToken | null = null;
  private placesServiceDiv: HTMLDivElement | null = null;

  /**
   * Initialize Google Maps services
   * Should be called after Google Maps API is loaded
   */
  initialize(): boolean {
    if (typeof window === 'undefined' || !window.google || !window.google.maps) {
      console.warn('Google Maps API not available');
      return false;
    }

    try {
      // Initialize services
      this.geocoder = new google.maps.Geocoder();
      this.directionsService = new google.maps.DirectionsService();
      
      if (window.google.maps.places) {
        this.autocompleteService = new google.maps.places.AutocompleteService();
        this.sessionToken = new google.maps.places.AutocompleteSessionToken();
        
        // Create a hidden div for PlacesService
        if (!this.placesServiceDiv) {
          this.placesServiceDiv = document.createElement('div');
          this.placesServiceDiv.style.display = 'none';
          document.body.appendChild(this.placesServiceDiv);
        }
        this.placesService = new google.maps.places.PlacesService(this.placesServiceDiv);
      }

      console.log('Google Maps services initialized successfully');
      return true;
    } catch (error) {
      console.error('Error initializing Google Maps services:', error);
      return false;
    }
  }

  /**
   * Check if services are initialized
   */
  isInitialized(): boolean {
    return !!(
      typeof window !== 'undefined' &&
      window.google &&
      window.google.maps &&
      this.geocoder &&
      this.autocompleteService
    );
  }

  /**
   * Ensure services are initialized
   */
  private ensureInitialized(): boolean {
    if (this.isInitialized()) return true;
    return this.initialize();
  }

  // Geocode address to coordinates
  async geocodeAddress(address: string): Promise<Location | null> {
    if (!this.ensureInitialized()) return null;

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
          console.warn('Geocoding failed:', status);
          resolve(null);
        }
      });
    });
  }

  // Reverse geocode coordinates to address
  async reverseGeocode(lat: number, lng: number): Promise<Location | null> {
    if (!this.ensureInitialized()) return null;

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
          console.warn('Reverse geocoding failed:', status);
          resolve(null);
        }
      });
    });
  }

  // Get autocomplete predictions
  async getPlacePredictions(input: string): Promise<google.maps.places.AutocompletePrediction[]> {
    if (!this.ensureInitialized()) {
      console.warn('Google Maps services not initialized');
      return [];
    }

    if (!this.autocompleteService) {
      console.warn('Autocomplete service not available');
      return [];
    }

    return new Promise((resolve) => {
      this.autocompleteService?.getPlacePredictions(
        {
          input,
          sessionToken: this.sessionToken || undefined,
          types: ['geocode', 'establishment'],
          componentRestrictions: undefined, // Add country restriction if needed
        },
        (predictions, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
            resolve(predictions);
          } else {
            if (status !== google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
              console.warn('Autocomplete failed:', status);
            }
            resolve([]);
          }
        }
      );
    });
  }

  // Get place details
  async getPlaceDetails(placeId: string): Promise<Location | null> {
    if (!this.ensureInitialized()) return null;

    if (!this.placesService) {
      console.warn('Places service not available');
      return null;
    }

    return new Promise((resolve) => {
      this.placesService?.getDetails(
        {
          placeId,
          fields: ['name', 'formatted_address', 'geometry', 'place_id'],
          sessionToken: this.sessionToken || undefined,
        },
        (place, status) => {
          if (status === google.maps.places.PlacesServiceStatus.OK && place && place.geometry && place.geometry.location) {
            // Reset session token after place details (for billing optimization)
            this.resetSessionToken();
            
            resolve({
              id: place.place_id || placeId,
              name: place.name || place.formatted_address?.split(',')[0] || '',
              address: place.formatted_address || '',
              lat: place.geometry.location.lat(),
              lng: place.geometry.location.lng(),
              placeId: place.place_id,
            });
          } else {
            console.warn('Place details failed:', status);
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
    if (!this.ensureInitialized()) return null;

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
            console.warn('Route calculation failed:', status);
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
    if (typeof window !== 'undefined' && window.google?.maps?.places) {
      this.sessionToken = new google.maps.places.AutocompleteSessionToken();
    }
  }

  // Cleanup
  cleanup() {
    if (this.placesServiceDiv && document.body.contains(this.placesServiceDiv)) {
      document.body.removeChild(this.placesServiceDiv);
    }
    this.placesServiceDiv = null;
    this.placesService = null;
    this.autocompleteService = null;
    this.geocoder = null;
    this.directionsService = null;
    this.sessionToken = null;
  }
}

export const mapsService = new GoogleMapsService();
export default mapsService;
