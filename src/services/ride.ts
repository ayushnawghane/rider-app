import { supabase } from '../lib/supabase';
import type {
  Ride,
  RideCreateParams,
  RideParticipant,
} from '../types';

class RideService {
  async createRide(params: RideCreateParams): Promise<{ success: boolean; ride?: Ride; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('rides')
        .insert({
          user_id: params.userId,
          driver_id: params.userId,
          date: params.date,
          start_location: params.startLocation,
          end_location: params.endLocation,
          start_location_coords: params.startLocationCoords,
          end_location_coords: params.endLocationCoords,
          vehicle_type: params.vehicleType,
          vehicle_number: params.vehicleNumber,
          reference_id: params.referenceId,
          available_seats: params.availableSeats ?? 3,
          price_per_seat: params.pricePerSeat ?? 0,
          notes: params.notes,
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

  async joinRide(params: {
    rideId: string;
    userId: string;
    seatsBooked?: number;
  }): Promise<{ success: boolean; participant?: RideParticipant; error?: string }> {
    try {
      const { data: rideRow, error: rideError } = await supabase
        .from('rides')
        .select('id, user_id, status')
        .eq('id', params.rideId)
        .single();

      if (rideError) {
        return { success: false, error: rideError.message };
      }

      if (!rideRow) {
        return { success: false, error: 'Ride not found' };
      }

      if (rideRow.user_id === params.userId) {
        return { success: false, error: 'You cannot join your own ride' };
      }

      if (!['pending', 'active'].includes(rideRow.status)) {
        return { success: false, error: 'This ride is not available to join' };
      }

      const { data, error } = await supabase
        .from('ride_participants')
        .upsert(
          {
            ride_id: params.rideId,
            user_id: params.userId,
            seats_booked: Math.max(1, params.seatsBooked ?? 1),
            status: 'joined',
          },
          { onConflict: 'ride_id,user_id' },
        )
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, participant: this.mapRideParticipant(data) };
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  // ─── Bookings ────────────────────────────────────────────────────────────

  async createBooking(params: {
    rideId: string;
    passengerId: string;
    seatsBooked: number;
    totalPrice: number;
    pickupLocation?: string;
    dropLocation?: string;
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('bookings')
        .insert({
          ride_id: params.rideId,
          passenger_id: params.passengerId,
          seats_booked: params.seatsBooked,
          total_price: params.totalPrice,
          pickup_location: params.pickupLocation,
          drop_location: params.dropLocation,
          status: 'pending',
        });

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch {
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  async getBookingsByRide(rideId: string): Promise<{ success: boolean; bookings?: any[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*, passenger:profiles(id, full_name, first_name, last_name, avatar_url, rating_as_passenger)')
        .eq('ride_id', rideId)
        .order('created_at', { ascending: true });

      if (error) return { success: false, error: error.message };
      return { success: true, bookings: data || [] };
    } catch {
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  async submitRating(params: {
    bookingId: string;
    isDriverRating: boolean;
    rating: number;
    review?: string;
  }): Promise<{ success: boolean; error?: string }> {
    const updates = params.isDriverRating
      ? { driver_rating: params.rating, driver_review: params.review }
      : { passenger_rating: params.rating, passenger_review: params.review };

    try {
      const { error } = await supabase
        .from('bookings')
        .update(updates)
        .eq('id', params.bookingId);

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch {
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  async getRideParticipation(
    rideId: string,
    userId: string,
  ): Promise<{ success: boolean; joined: boolean; participant?: RideParticipant; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('ride_participants')
        .select('*')
        .eq('ride_id', rideId)
        .eq('user_id', userId)
        .eq('status', 'joined')
        .maybeSingle();

      if (error) {
        return { success: false, joined: false, error: error.message };
      }

      if (!data) {
        return { success: true, joined: false };
      }

      return { success: true, joined: true, participant: this.mapRideParticipant(data) };
    } catch (error) {
      return { success: false, joined: false, error: 'An unexpected error occurred' };
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

  async searchRides(params: {
    startLocation?: string;
    endLocation?: string;
    departureTime?: string;
    limit?: number;
  }): Promise<{ success: boolean; rides?: Ride[]; error?: string }> {
    try {
      const { startLocation, endLocation, departureTime, limit = 50 } = params;

      let query = supabase
        .from('rides')
        .select('*, driver:profiles!driver_id(id, full_name, avatar_url, rating_as_driver, phone)')
        .in('status', ['pending', 'active']);

      if (startLocation) {
        query = query.ilike('start_location', `%${startLocation}%`);
      }

      if (endLocation) {
        query = query.ilike('end_location', `%${endLocation}%`);
      }

      if (departureTime) {
        query = query.gte('date', new Date(departureTime).toISOString());
      }

      const { data, error } = await query
        .order('date', { ascending: true })
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
        .select('*, driver:profiles!driver_id(id, full_name, avatar_url, rating_as_driver, phone)')
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

  async updateRideDetails(rideId: string, updates: Partial<Pick<Ride, 'date' | 'availableSeats' | 'pricePerSeat' | 'notes' | 'vehicleNumber' | 'vehicleType'>>): Promise<{ success: boolean; error?: string }> {
    try {
      const dbUpdates: any = {};
      if (updates.date) dbUpdates.date = updates.date;
      if (updates.availableSeats !== undefined) dbUpdates.available_seats = updates.availableSeats;
      if (updates.pricePerSeat !== undefined) dbUpdates.price_per_seat = updates.pricePerSeat;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
      if (updates.vehicleNumber) dbUpdates.vehicle_number = updates.vehicleNumber;
      if (updates.vehicleType) dbUpdates.vehicle_type = updates.vehicleType;

      const { error } = await supabase
        .from('rides')
        .update(dbUpdates)
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

  // ─── Private mappers ─────────────────────────────────────────────────────

  private mapRideToRide(data: any): Ride {
    return {
      id: data.id,
      userId: data.user_id,
      driverId: data.driver_id,
      driver: data.driver && !Array.isArray(data.driver) ? {
        id: data.driver.id,
        name: data.driver.full_name,
        avatar: data.driver.avatar_url,
        rating: data.driver.rating_as_driver || 5.0,
        phone: data.driver.phone,
      } : undefined,
      date: data.date,
      startLocation: data.start_location,
      endLocation: data.end_location,
      startLocationCoords: data.start_location_coords,
      endLocationCoords: data.end_location_coords,
      vehicleType: data.vehicle_type,
      vehicleNumber: data.vehicle_number,
      referenceId: data.reference_id,
      status: data.status,
      // Carpool
      availableSeats: data.available_seats ?? 3,
      bookedSeats: data.booked_seats ?? 0,
      pricePerSeat: data.price_per_seat ?? 0,
      notes: data.notes,
      routePolyline: data.route_polyline,
      // Optional
      fare: data.fare,
      duration: data.duration,
      distance: data.distance,
      driverContact: data.driver_contact,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private mapRideParticipant(data: any): RideParticipant {
    return {
      id: data.id,
      rideId: data.ride_id,
      userId: data.user_id,
      seatsBooked: data.seats_booked,
      status: data.status,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}

export const rideService = new RideService();
