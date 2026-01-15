import { supabase } from '../lib/supabase';
import type {
  Ride,
  RideCreateParams,
} from '../types';

class RideService {
  async createRide(params: RideCreateParams): Promise<{ success: boolean; ride?: Ride; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('rides')
        .insert({
          user_id: params.userId,
          date: params.date,
          start_location: params.startLocation,
          end_location: params.endLocation,
          start_location_coords: params.startLocationCoords,
          end_location_coords: params.endLocationCoords,
          vehicle_type: params.vehicleType,
          vehicle_number: params.vehicleNumber,
          reference_id: params.referenceId,
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, ride: this.mapRideToRide(data) };
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  async getRides(userId: string, limit = 50): Promise<{ success: boolean; rides?: Ride[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('rides')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(limit);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, rides: data.map((ride: any) => this.mapRideToRide(ride)) };
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  async getRideById(rideId: string): Promise<{ success: boolean; ride?: Ride; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('rides')
        .select('*')
        .eq('id', rideId)
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, ride: this.mapRideToRide(data) };
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  async getActiveRide(userId: string): Promise<{ success: boolean; ride?: Ride; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('rides')
        .select('*')
        .eq('user_id', userId)
        .in('status', ['pending', 'active'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return { success: true, ride: undefined };
        }
        return { success: false, error: error.message };
      }

      return { success: true, ride: this.mapRideToRide(data) };
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  async updateRideStatus(rideId: string, status: Ride['status']): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('rides')
        .update({ status })
        .eq('id', rideId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  async deleteRide(rideId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('rides')
        .delete()
        .eq('id', rideId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  private mapRideToRide(data: any): Ride {
    return {
      id: data.id,
      userId: data.user_id,
      driverId: data.driver_id,
      date: data.date,
      startLocation: data.start_location,
      endLocation: data.end_location,
      startLocationCoords: data.start_location_coords,
      endLocationCoords: data.end_location_coords,
      vehicleType: data.vehicle_type,
      vehicleNumber: data.vehicle_number,
      referenceId: data.reference_id,
      status: data.status,
      fare: data.fare,
      duration: data.duration,
      distance: data.distance,
      driverContact: data.driver_contact,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}

export const rideService = new RideService();
