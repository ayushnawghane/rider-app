import { supabase } from '../lib/supabase';
import type {
  Ride,
  RideCreateParams,
  RideParticipant,
} from '../types';

const JOIN_RIDE_POINTS = 30;
const PUBLISH_RIDE_POINTS = 50;
const DEFAULT_RIDE_DURATION_MINUTES = 60;

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
          duration: params.duration,
          distance: params.distance,
          notes: params.notes,
          status: 'pending',
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      const ride = this.mapRideToRide(data);
      await Promise.allSettled([
        this.createReward({
          userId: params.userId,
          rideId: ride.id,
          points: PUBLISH_RIDE_POINTS,
          action: 'publish_ride',
          description: `Published a ride from ${ride.startLocation} to ${ride.endLocation}`,
        }),
        this.updateProfileStats(params.userId, {
          pointsDelta: PUBLISH_RIDE_POINTS,
          ridesPublishedDelta: 1,
        }),
      ]);

      return { success: true, ride };
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
      const seatsBooked = Math.max(1, params.seatsBooked ?? 1);
      const { data: rideRow, error: rideError } = await supabase
        .from('rides')
        .select('id, user_id, driver_id, status, available_seats, booked_seats, price_per_seat, start_location, end_location, date')
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

      const availableSeats = rideRow.available_seats ?? 1;
      const bookedSeats = rideRow.booked_seats ?? 0;
      const remainingSeats = Math.max(0, availableSeats - bookedSeats);
      if (remainingSeats < seatsBooked) {
        return {
          success: false,
          error: remainingSeats > 0
            ? `Only ${remainingSeats} seat${remainingSeats === 1 ? '' : 's'} left on this ride`
            : 'This ride is fully booked',
        };
      }

      const { data: existingParticipant, error: participantLookupError } = await supabase
        .from('ride_participants')
        .select('*')
        .eq('ride_id', params.rideId)
        .eq('user_id', params.userId)
        .eq('status', 'joined')
        .maybeSingle();

      if (participantLookupError) {
        return { success: false, error: participantLookupError.message };
      }

      if (existingParticipant) {
        return { success: true, participant: this.mapRideParticipant(existingParticipant) };
      }

      const { data, error } = await supabase
        .from('ride_participants')
        .upsert(
          {
            ride_id: params.rideId,
            user_id: params.userId,
            seats_booked: seatsBooked,
            status: 'joined',
          },
          { onConflict: 'ride_id,user_id' },
        )
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      const totalPrice = seatsBooked * (rideRow.price_per_seat ?? 0);
      const bookingResult = await this.createBooking({
        rideId: params.rideId,
        passengerId: params.userId,
        seatsBooked,
        totalPrice,
        pickupLocation: rideRow.start_location,
        dropLocation: rideRow.end_location,
      });

      if (!bookingResult.success) {
        await this.cancelParticipant(params.rideId, params.userId);
        return { success: false, error: bookingResult.error || 'Unable to create booking' };
      }

      const { error: seatUpdateError } = await supabase
        .from('rides')
        .update({ booked_seats: bookedSeats + seatsBooked })
        .eq('id', params.rideId);

      if (seatUpdateError) {
        await this.cancelParticipant(params.rideId, params.userId);
        return { success: false, error: seatUpdateError.message };
      }

      await Promise.allSettled([
        this.createReward({
          userId: params.userId,
          rideId: params.rideId,
          points: JOIN_RIDE_POINTS,
          action: 'join_ride',
          description: `Joined a ride from ${rideRow.start_location} to ${rideRow.end_location}`,
        }),
        this.updateProfileStats(params.userId, {
          pointsDelta: JOIN_RIDE_POINTS,
          ridesTakenDelta: 1,
        }),
        this.createNotification({
          userId: rideRow.user_id,
          title: 'New rider joined',
          message: `A passenger joined your ride from ${rideRow.start_location} to ${rideRow.end_location}.`,
          type: 'ride',
        }),
        this.createNotification({
          userId: params.userId,
          title: 'Ride joined',
          message: `You joined the ride from ${rideRow.start_location} to ${rideRow.end_location}.`,
          type: 'ride',
        }),
      ]);

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
      const driverRidesQuery = supabase
        .from('rides')
        .select('*, driver:profiles!driver_id(id, full_name, avatar_url, rating_as_driver)')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .limit(limit);

      const passengerRidesQuery = supabase
        .from('ride_participants')
        .select('*, ride:rides(*, driver:profiles!driver_id(id, full_name, avatar_url, rating_as_driver, phone))')
        .eq('user_id', userId)
        .eq('status', 'joined')
        .order('created_at', { ascending: false })
        .limit(limit);

      const [driverResult, passengerResult] = await Promise.all([
        driverRidesQuery,
        passengerRidesQuery,
      ]);

      if (driverResult.error) {
        return { success: false, error: driverResult.error.message };
      }

      if (passengerResult.error) {
        return { success: false, error: passengerResult.error.message };
      }

      const driverRides = await this.reconcileRideTimings(
        (driverResult.data || []).map((ride: any) =>
          this.mapRideToRide({ ...ride, user_role: 'driver' }),
        ),
      );
      const passengerRides = (passengerResult.data || [])
        .filter((participant: any) => participant.ride)
        .map((participant: any) =>
          this.mapRideToRide({
            ...participant.ride,
            user_role: 'passenger',
          }),
        );
      const reconciledPassengerRides = await this.reconcileRideTimings(passengerRides);

      const ridesById = new Map<string, Ride>();
      [...driverRides, ...reconciledPassengerRides].forEach((ride) => ridesById.set(ride.id, ride));
      const rides = Array.from(ridesById.values())
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, limit);

      return { success: true, rides };
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
        .select('*, driver:profiles!driver_id(id, full_name, avatar_url, rating_as_driver)')
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

      const rides = await this.reconcileRideTimings(
        (data || []).map((ride: any) => this.mapRideToRide(ride)),
      );

      return { success: true, rides };
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

      return { success: true, ride: await this.reconcileRideTiming(this.mapRideToRide(data)) };
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

      return { success: true, ride: await this.reconcileRideTiming(this.mapRideToRide(data)) };
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  async updateRideStatus(rideId: string, status: Ride['status']): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('rides')
        .update({ status, updated_at: new Date().toISOString() })
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
      driverContact: data.driver_contact || data.driver?.phone,
      userRole: data.user_role,
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

  private async reconcileRideTimings(rides: Ride[]): Promise<Ride[]> {
    return Promise.all(rides.map((ride) => this.reconcileRideTiming(ride)));
  }

  private getTimeAdjustedStatus(ride: Ride, now = new Date()): Ride['status'] {
    if (ride.status === 'completed' || ride.status === 'cancelled') {
      return ride.status;
    }

    const startTime = new Date(ride.date);
    if (Number.isNaN(startTime.getTime())) {
      return ride.status;
    }

    const durationMinutes =
      typeof ride.duration === 'number' && ride.duration > 0
        ? ride.duration
        : DEFAULT_RIDE_DURATION_MINUTES;
    const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

    if (ride.status === 'active' && now >= endTime) {
      return 'completed';
    }

    if (ride.status === 'pending') {
      if (now >= endTime) {
        return 'completed';
      }
      if (now >= startTime) {
        return 'active';
      }
    }

    return ride.status;
  }

  private async reconcileRideTiming(ride: Ride): Promise<Ride> {
    const status = this.getTimeAdjustedStatus(ride);
    if (status === ride.status) {
      return ride;
    }

    const { error } = await supabase
      .from('rides')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', ride.id)
      .eq('status', ride.status);

    if (error) {
      console.warn('Ride timing status update failed:', error.message);
      return ride;
    }

    await this.syncBookingsForRideStatus(ride.id, status);
    return { ...ride, status, updatedAt: new Date().toISOString() };
  }

  private async syncBookingsForRideStatus(rideId: string, status: Ride['status']) {
    if (status !== 'active' && status !== 'completed' && status !== 'cancelled') return;

    const bookingStatus =
      status === 'active'
        ? 'confirmed'
        : status === 'completed'
          ? 'completed'
          : 'cancelled';
    const timestampField =
      status === 'active'
        ? 'confirmation_time'
        : status === 'completed'
          ? 'completion_time'
          : 'cancellation_time';

    const { error } = await supabase
      .from('bookings')
      .update({
        status: bookingStatus,
        [timestampField]: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('ride_id', rideId)
      .in('status', ['pending', 'confirmed']);

    if (error) {
      console.warn('Booking timing status update failed:', error.message);
    }
  }

  private async cancelParticipant(rideId: string, userId: string) {
    await supabase
      .from('ride_participants')
      .update({ status: 'cancelled' })
      .eq('ride_id', rideId)
      .eq('user_id', userId);
  }

  private async createReward(params: {
    userId: string;
    rideId: string;
    points: number;
    action: 'publish_ride' | 'join_ride';
    description: string;
  }) {
    const { error } = await supabase
      .from('rewards')
      .insert({
        user_id: params.userId,
        ride_id: params.rideId,
        points: params.points,
        action: params.action,
        description: params.description,
      });

    if (error) {
      console.warn('Reward write failed:', error.message);
    }
  }

  private async createNotification(params: {
    userId: string;
    title: string;
    message: string;
    type: 'ride' | 'dispute' | 'system';
  }) {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: params.userId,
        title: params.title,
        message: params.message,
        type: params.type,
        read: false,
      });

    if (error) {
      console.warn('Notification write failed:', error.message);
    }
  }

  private async updateProfileStats(userId: string, deltas: {
    pointsDelta?: number;
    ridesTakenDelta?: number;
    ridesPublishedDelta?: number;
  }) {
    const { data, error } = await supabase
      .from('profiles')
      .select('total_points, level, rides_taken, rides_published')
      .eq('id', userId)
      .maybeSingle();

    if (error || !data) {
      if (error) console.warn('Profile stats read failed:', error.message);
      return;
    }

    const totalPoints = (data.total_points ?? 0) + (deltas.pointsDelta ?? 0);
    const ridesTaken = (data.rides_taken ?? 0) + (deltas.ridesTakenDelta ?? 0);
    const ridesPublished = (data.rides_published ?? 0) + (deltas.ridesPublishedDelta ?? 0);
    const level = Math.max(data.level ?? 1, Math.floor(totalPoints / 500) + 1);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        total_points: totalPoints,
        rides_taken: ridesTaken,
        rides_published: ridesPublished,
        level,
      })
      .eq('id', userId);

    if (updateError) {
      console.warn('Profile stats update failed:', updateError.message);
    }
  }
}

export const rideService = new RideService();
