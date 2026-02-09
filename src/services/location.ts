/**
 * Location Service
 * Handles device GPS location tracking using Capacitor Geolocation
 */

import { Geolocation, Position } from '@capacitor/geolocation';

export interface LocationCoordinates {
  lat: number;
  lng: number;
  accuracy?: number;
  altitude?: number | null;
  heading?: number | null;
  speed?: number | null;
  timestamp: number;
}

class LocationService {
  private watchId: string | null = null;

  /**
   * Check and request location permissions
   */
  async checkPermissions(): Promise<boolean> {
    try {
      const permission = await Geolocation.checkPermissions();
      if (permission.location === 'granted') {
        return true;
      }

      const request = await Geolocation.requestPermissions();
      return request.location === 'granted';
    } catch (error) {
      console.error('Error checking location permissions:', error);
      return false;
    }
  }

  /**
   * Get current position (one-time)
   */
  async getCurrentPosition(): Promise<LocationCoordinates | null> {
    try {
      const hasPermission = await this.checkPermissions();
      if (!hasPermission) {
        console.error('Location permission not granted');
        return null;
      }

      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
      });

      return this.convertPosition(position);
    } catch (error) {
      console.error('Error getting current position:', error);
      return null;
    }
  }

  /**
   * Start watching position updates
   */
  async startWatching(
    callback: (position: LocationCoordinates) => void,
    errorCallback?: (error: Error | unknown) => void
  ): Promise<boolean> {
    try {
      const hasPermission = await this.checkPermissions();
      if (!hasPermission) {
        console.error('Location permission not granted');
        return false;
      }

      // Clear any existing watch
      if (this.watchId) {
        await this.stopWatching();
      }

      this.watchId = await Geolocation.watchPosition(
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        },
        (position, err) => {
          if (err) {
            console.error('Watch position error:', err);
            errorCallback?.(err);
            return;
          }

          if (position) {
            callback(this.convertPosition(position));
          }
        }
      );

      return true;
    } catch (error) {
      console.error('Error starting location watch:', error);
      return false;
    }
  }

  /**
   * Stop watching position updates
   */
  async stopWatching(): Promise<void> {
    if (this.watchId) {
      try {
        await Geolocation.clearWatch({ id: this.watchId });
        this.watchId = null;
      } catch (error) {
        console.error('Error stopping location watch:', error);
      }
    }
  }

  /**
   * Check if currently watching position
   */
  isWatching(): boolean {
    return this.watchId !== null;
  }

  /**
   * Convert Capacitor Position to our LocationCoordinates format
   */
  private convertPosition(position: Position): LocationCoordinates {
    return {
      lat: position.coords.latitude,
      lng: position.coords.longitude,
      accuracy: position.coords.accuracy,
      altitude: position.coords.altitude,
      heading: position.coords.heading,
      speed: position.coords.speed,
      timestamp: position.timestamp,
    };
  }

  /**
   * Calculate distance between two coordinates in kilometers (Haversine formula)
   */
  calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number
  ): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.degreesToRadians(lat2 - lat1);
    const dLng = this.degreesToRadians(lng2 - lng1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.degreesToRadians(lat1)) *
        Math.cos(this.degreesToRadians(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private degreesToRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Format coordinates for display
   */
  formatCoordinates(lat: number, lng: number): string {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }
}

export const locationService = new LocationService();
export default locationService;
