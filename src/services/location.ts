/**
 * Location Service
 * Handles device GPS location tracking using Capacitor Geolocation
 */

import { Geolocation, Position } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

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
  private readonly permissionTimeoutMs = 12000;
  private readonly positionTimeoutMs = 10000;
  private readonly fallbackPositionTimeoutMs = 20000;
  private readonly cachedPositionMaxAgeMs = 5 * 60 * 1000;

  private async withTimeout<T>(operation: () => Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
    });
    const operationPromise = operation();

    try {
      return await Promise.race([operationPromise, timeoutPromise]);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  /**
   * Check if running on native mobile (Android/iOS)
   */
  private isNative(): boolean {
    return Capacitor.isNativePlatform();
  }

  private async getBrowserPermissionState(): Promise<PermissionState | null> {
    if (typeof navigator === 'undefined' || !navigator.permissions?.query) {
      return null;
    }

    try {
      const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      return status.state;
    } catch (error) {
      console.warn('Failed to read geolocation permission state:', error);
      return null;
    }
  }

  private getBrowserCurrentPosition(options: PositionOptions): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(resolve, reject, options);
    });
  }

  private isPermissionDeniedError(error: unknown): boolean {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: unknown }).code === 1
    ) {
      return true;
    }

    return error instanceof Error && /permission|denied/i.test(error.message);
  }

  private isPositionTimeoutError(error: unknown): boolean {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: unknown }).code === 3
    ) {
      return true;
    }

    return error instanceof Error && /timeout/i.test(error.message);
  }

  /**
   * Check and request location permissions
   * On web: Uses browser's native geolocation API which triggers permission popup
   * On native: Uses Capacitor Geolocation plugin
   */
  async checkPermissions(): Promise<boolean> {
    try {
      if (this.isNative()) {
        // Native mobile: Use Capacitor plugin
        const permission = await this.withTimeout(
          () => Geolocation.checkPermissions(),
          this.permissionTimeoutMs,
          'Native location permission check timed out',
        );
        if (permission.location === 'granted') {
          return true;
        }

        const request = await this.withTimeout(
          () => Geolocation.requestPermissions(),
          this.permissionTimeoutMs,
          'Native location permission request timed out',
        );
        return request.location === 'granted';
      } else {
        if (!navigator.geolocation) {
          console.error('Geolocation is not supported by this browser');
          return false;
        }

        const permissionState = await this.getBrowserPermissionState();
        if (permissionState === 'granted') {
          return true;
        }
        if (permissionState === 'denied') {
          return false;
        }

        // Permission is prompt/unknown: trigger browser prompt with a coarse, cached-friendly request.
        try {
          await this.withTimeout(
            () =>
              this.getBrowserCurrentPosition({
                enableHighAccuracy: false,
                timeout: this.positionTimeoutMs,
                maximumAge: this.cachedPositionMaxAgeMs,
              }),
            this.permissionTimeoutMs,
            'Geolocation permission check timed out',
          );
          return true;
        } catch (error) {
          if (this.isPermissionDeniedError(error)) {
            console.error('Geolocation permission denied:', error);
            return false;
          }

          if (this.isPositionTimeoutError(error)) {
            const postPromptState = await this.getBrowserPermissionState();
            if (postPromptState === 'granted') {
              return true;
            }
          }

          console.error('Geolocation permission error:', error);
          return false;
        }
      }
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

      if (this.isNative()) {
        // Native mobile: try precise fix first, then relax to coarse/cached if timeout.
        try {
          const position = await Geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: this.positionTimeoutMs,
            maximumAge: 0,
          });
          return this.convertPosition(position);
        } catch (error) {
          if (!this.isPositionTimeoutError(error)) {
            throw error;
          }

          const fallbackPosition = await Geolocation.getCurrentPosition({
            enableHighAccuracy: false,
            timeout: this.fallbackPositionTimeoutMs,
            maximumAge: this.cachedPositionMaxAgeMs,
          });
          return this.convertPosition(fallbackPosition);
        }
      } else {
        // Web: try precise fix first, then coarse/cached fallback for low-GPS environments.
        const attempts: PositionOptions[] = [
          { enableHighAccuracy: true, timeout: this.positionTimeoutMs, maximumAge: 0 },
          {
            enableHighAccuracy: false,
            timeout: this.fallbackPositionTimeoutMs,
            maximumAge: this.cachedPositionMaxAgeMs,
          },
        ];

        let lastError: unknown = null;
        for (const attempt of attempts) {
          try {
            const position = await this.getBrowserCurrentPosition(attempt);
            return this.convertBrowserPosition(position);
          } catch (error) {
            lastError = error;
            if (this.isPermissionDeniedError(error)) {
              break;
            }
          }
        }

        if (lastError) {
          console.error('Error getting current position:', lastError);
        }
        return null;
      }
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

      if (this.isNative()) {
        // Native mobile: Use Capacitor plugin
        this.watchId = await Geolocation.watchPosition(
          {
            enableHighAccuracy: true,
            timeout: this.positionTimeoutMs,
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
      } else {
        // Web: Use browser's native geolocation
        const watchId = navigator.geolocation.watchPosition(
          (position) => {
            callback(this.convertBrowserPosition(position));
          },
          (error) => {
            console.error('Watch position error:', error);
            errorCallback?.(error);
          },
          { enableHighAccuracy: true, timeout: this.positionTimeoutMs, maximumAge: 0 }
        );
        // Store as string for consistency
        this.watchId = watchId.toString();
      }

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
        if (this.isNative()) {
          // Native mobile: Use Capacitor plugin
          await Geolocation.clearWatch({ id: this.watchId });
        } else {
          // Web: Use browser's native geolocation
          navigator.geolocation.clearWatch(parseInt(this.watchId));
        }
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
   * Convert browser's GeolocationPosition to our LocationCoordinates format
   */
  private convertBrowserPosition(position: GeolocationPosition): LocationCoordinates {
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
