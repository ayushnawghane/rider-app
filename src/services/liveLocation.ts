/**
 * Live Location Service
 * Maintains the latest GPS location per (ride, user) and streams it to other
 * ride participants in realtime (Uber/Rapido style tracking).
 *
 * One row per participant is kept in `live_locations` via upsert on
 * (ride_id, user_id) instead of appending endless inserts.
 */

import { supabase } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface LiveLocation {
  userId: string;
  lat: number;
  lng: number;
  accuracy?: number | null;
  timestamp?: string | null;
}

export interface PublishLocationParams {
  rideId: string;
  userId: string;
  lat: number;
  lng: number;
  accuracy?: number | null;
}

interface LiveLocationRow {
  user_id: string;
  lat: number;
  lng: number;
  accuracy?: number | null;
  timestamp?: string | null;
}

const TABLE = 'live_locations';

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Unknown error';

const mapRow = (row: LiveLocationRow): LiveLocation => ({
  userId: row.user_id,
  lat: row.lat,
  lng: row.lng,
  accuracy: row.accuracy ?? null,
  timestamp: row.timestamp ?? null,
});

class LiveLocationService {
  /**
   * Publish (upsert) the caller's latest location for a ride.
   * Maintains a single latest row per (ride_id, user_id).
   */
  async publishLocation(params: PublishLocationParams): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from(TABLE)
        .upsert(
          {
            ride_id: params.rideId,
            user_id: params.userId,
            lat: params.lat,
            lng: params.lng,
            accuracy: params.accuracy ?? null,
            timestamp: new Date().toISOString(),
          },
          { onConflict: 'ride_id,user_id' },
        );

      if (error) throw error;
      return { success: true };
    } catch (error) {
      return { success: false, error: getErrorMessage(error) };
    }
  }

  /**
   * Fetch the latest known locations for all OTHER participants of a ride
   * (excludes the current user). Used for initial screen load so we don't
   * have to wait for the next realtime update.
   */
  async getLatestOtherLocations(rideId: string, currentUserId: string): Promise<LiveLocation[]> {
    try {
      const { data, error } = await supabase
        .from(TABLE)
        .select('user_id, lat, lng, accuracy, timestamp')
        .eq('ride_id', rideId)
        .neq('user_id', currentUserId)
        .order('timestamp', { ascending: false });

      if (error) throw error;
      return (data ?? []).map((row) => mapRow(row as LiveLocationRow));
    } catch (error) {
      console.error('Failed to fetch live locations:', getErrorMessage(error));
      return [];
    }
  }

  /**
   * Subscribe to realtime INSERT/UPDATE changes on live_locations for a ride.
   * Only rows from OTHER participants (user_id !== currentUserId) are forwarded.
   * Returns the channel so the caller can tear it down via supabase.removeChannel.
   */
  subscribeToRideLocations(
    rideId: string,
    currentUserId: string,
    callback: (location: LiveLocation) => void,
  ): RealtimeChannel {
    return supabase
      .channel(`live_locations:${rideId}:${currentUserId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: TABLE,
          filter: `ride_id=eq.${rideId}`,
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as LiveLocationRow | undefined;
          if (!row || !row.user_id || row.user_id === currentUserId) return;
          callback(mapRow(row));
        },
      )
      .subscribe();
  }
}

export const liveLocationService = new LiveLocationService();
export default liveLocationService;
