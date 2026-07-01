import { supabase } from '../lib/supabase';
import type {
  Ride,
  RideCreateParams,
  RideParticipant,
} from '../types';
import { RIDE_REWARD_POINTS, type RideRewardAction } from './rewards/rules';
import { getTimeAdjustedRideStatus } from './rides/lifecycle';

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
          action: 'publish_ride',
          description: `Published a ride from ${ride.startLocation} to ${ride.endLocation}`,
        }),
        this.updateProfileStats(params.userId, {
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

      // `rides.booked_seats` is maintained authoritatively by the
      // `sync_ride_booked_seats` DB trigger (from the participant upsert above).
      // We must NOT write it from here: a passenger can't update another user's
      // ride (RLS), and writing a stale snapshot value would clobber the
      // trigger's correct SUM and race concurrent joins into an oversold ride.

      // Notifications for both the driver and the joining passenger are raised
      // automatically by the `notify_on_ride_participation` DB trigger, so we
      // deliberately do not create them here (that would double-notify and,
      // for the driver's row, fail RLS from the client).
      await Promise.allSettled([
        this.createReward({
          userId: params.userId,
          rideId: params.rideId,
          action: 'join_ride',
          description: `Joined a ride from ${rideRow.start_location} to ${rideRow.end_location}`,
        }),
        this.updateProfileStats(params.userId, {
          ridesTakenDelta: 1,
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
        .select('*, passenger:profiles(id, full_name, first_name, last_name, avatar_url, phone, rating_as_passenger)')
        .eq('ride_id', rideId)
        .order('created_at', { ascending: true });

      if (error) return { success: false, error: error.message };
      return { success: true, bookings: data || [] };
    } catch {
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  // Driver-facing passenger list. Reads from `ride_participants` (the table the
  // join flow actually writes to) rather than `bookings`, because the deployed
  // RLS on ride_participants explicitly lets the ride owner see every joined
  // participant — so a driver reliably sees their passengers. Shaped to match
  // what the ride console renders (passenger_id + passenger profile + seats).
  async getRideParticipants(rideId: string): Promise<{ success: boolean; bookings?: any[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('ride_participants')
        .select('id, user_id, seats_booked, status, created_at, passenger:profiles!ride_participants_user_id_fkey(id, full_name, first_name, last_name, avatar_url, phone, rating_as_passenger)')
        .eq('ride_id', rideId)
        .eq('status', 'joined')
        .order('created_at', { ascending: true });

      if (error) return { success: false, error: error.message };

      const bookings = (data || []).map((row: any) => ({
        id: row.id,
        passenger_id: row.user_id,
        passenger: row.passenger || null,
        seats_booked: row.seats_booked,
        status: 'confirmed',
      }));

      return { success: true, bookings };
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

  async getJoinedRideIds(
    rideIds: string[],
    userId: string,
  ): Promise<{ success: boolean; rideIds?: string[]; error?: string }> {
    if (rideIds.length === 0) {
      return { success: true, rideIds: [] };
    }

    try {
      const { data, error } = await supabase
        .from('ride_participants')
        .select('ride_id')
        .eq('user_id', userId)
        .eq('status', 'joined')
        .in('ride_id', rideIds);

      if (error) {
        return { success: false, error: error.message };
      }

      return {
        success: true,
        rideIds: (data || []).map((row: any) => row.ride_id).filter(Boolean),
      };
    } catch {
      return { success: false, error: 'An unexpected error occurred' };
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

      // Keep passengers' bookings in step with a driver-initiated status change
      // (Complete / Cancel) — otherwise their booking rows stay 'pending' on a
      // ride the driver already ended. Mirrors the time-based reconcile path.
      await this.syncBookingsForRideStatus(rideId, status);

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
    return getTimeAdjustedRideStatus(ride, now);
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
    action: RideRewardAction;
    description: string;
  }) {
    const { error } = await supabase.functions.invoke('ride-rewards', {
      body: {
        userId: params.userId,
        rideId: params.rideId,
        action: params.action,
        description: params.description,
        eventKey: `${params.action}:${params.rideId}:${params.userId}`,
        metadata: {
          expected_points: RIDE_REWARD_POINTS,
        },
      },
    });

    if (error) {
      console.warn('Reward endpoint failed:', error.message);
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
