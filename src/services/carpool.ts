import { supabase } from '../lib/supabase';
import type { PublishedRide, Booking } from '../types';

interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  rides?: T[];
  bookings?: T[];
  rewards?: T[];
  achievements?: T[];
  badges?: T[];
  locations?: T[];
  messages?: T[];
  ride?: T;
  booking?: T;
  stats?: T;
}

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : 'Unknown error';

export const carpoolService = {
  // ==========================================
  // PUBLISHED RIDES
  // ==========================================
  
  async publishRide(rideData: Partial<PublishedRide>): Promise<ServiceResponse<PublishedRide>> {
    try {
      const { data, error } = await supabase
        .from('published_rides')
        .insert([rideData])
        .select()
        .single();
      
      if (error) throw error;
      return { success: true, ride: data };
    } catch (error: unknown) {
      return { success: false, error: getErrorMessage(error) };
    }
  },

  async getPublishedRides(filters?: {
    driverId?: string;
    status?: string;
    startLat?: number;
    startLng?: number;
    endLat?: number;
    endLng?: number;
    departureAfter?: string;
    departureBefore?: string;
  }) {
    try {
      let query = supabase
        .from('published_rides')
        .select(`
          *,
          driver:profiles(id, full_name, first_name, last_name, avatar_url)
        `)
        .order('departure_time', { ascending: true });

      if (filters?.driverId) {
        query = query.eq('driver_id', filters.driverId);
      }

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }

      if (filters?.departureAfter) {
        query = query.gte('departure_time', filters.departureAfter);
      }

      if (filters?.departureBefore) {
        query = query.lte('departure_time', filters.departureBefore);
      }

      const { data, error } = await query;

      if (error) throw error;
      return { success: true, rides: data || [] };
    } catch (error: unknown) {
      return { success: false, error: getErrorMessage(error), rides: [] };
    }
  },

  async getPublishedRideById(rideId: string) {
    try {
      const { data, error } = await supabase
        .from('published_rides')
        .select(`
          *,
          driver:profiles(id, full_name, first_name, last_name, avatar_url, phone),
          bookings(
            id,
            passenger_id,
            seats_booked,
            status,
            passenger:profiles(id, full_name, avatar_url)
          )
        `)
        .eq('id', rideId)
        .single();

      if (error) throw error;
      return { success: true, ride: data };
    } catch (error: unknown) {
      return { success: false, error: getErrorMessage(error) };
    }
  },

  async updateRideStatus(rideId: string, status: string) {
    try {
      const { data, error } = await supabase
        .from('published_rides')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', rideId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, ride: data };
    } catch (error: unknown) {
      return { success: false, error: getErrorMessage(error) };
    }
  },

  // ==========================================
  // BOOKINGS
  // ==========================================

  async createBooking(bookingData: Partial<Booking>) {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .insert([bookingData])
        .select()
        .single();

      if (error) throw error;
      return { success: true, booking: data };
    } catch (error: unknown) {
      return { success: false, error: getErrorMessage(error) };
    }
  },

  async getBookings(userId: string, role: 'driver' | 'passenger') {
    try {
      let query;
      
      if (role === 'passenger') {
        query = supabase
          .from('bookings')
          .select(`
            *,
            ride:published_rides(*)
          `)
          .eq('passenger_id', userId);
      } else {
        query = supabase
          .from('bookings')
          .select(`
            *,
            ride:published_rides(*),
            passenger:profiles(id, full_name, first_name, last_name, avatar_url)
          `)
          .eq('ride.driver_id', userId);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, bookings: data || [] };
    } catch (error: unknown) {
      return { success: false, error: getErrorMessage(error), bookings: [] };
    }
  },

  async updateBookingStatus(bookingId: string, status: string) {
    try {
      const updates: any = { 
        status, 
        updated_at: new Date().toISOString() 
      };

      if (status === 'confirmed') {
        updates.confirmation_time = new Date().toISOString();
      } else if (status === 'completed') {
        updates.completion_time = new Date().toISOString();
      } else if (status === 'cancelled') {
        updates.cancellation_time = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('bookings')
        .update(updates)
        .eq('id', bookingId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, booking: data };
    } catch (error: unknown) {
      return { success: false, error: getErrorMessage(error) };
    }
  },

  async submitRating(bookingId: string, rating: number, review?: string, isDriverRating: boolean = false) {
    try {
      const updates = isDriverRating 
        ? { driver_rating: rating, driver_review: review }
        : { passenger_rating: rating, passenger_review: review };

      const { data, error } = await supabase
        .from('bookings')
        .update(updates)
        .eq('id', bookingId)
        .select()
        .single();

      if (error) throw error;
      return { success: true, booking: data };
    } catch (error: unknown) {
      return { success: false, error: getErrorMessage(error) };
    }
  },

  // ==========================================
  // REWARDS & GAMIFICATION
  // ==========================================

  async getUserStats(userId: string) {
    try {
      const { data, error } = await supabase
        .from('user_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      return { success: true, stats: data };
    } catch (error: unknown) {
      return { success: false, error: getErrorMessage(error) };
    }
  },

  async getRewards(userId: string, limit: number = 50) {
    try {
      const { data, error } = await supabase
        .from('rewards')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return { success: true, rewards: data || [] };
    } catch (error: unknown) {
      return { success: false, error: getErrorMessage(error), rewards: [] };
    }
  },

  async getAchievements(userId: string) {
    try {
      const { data, error } = await supabase
        .from('user_achievements')
        .select(`
          *,
          badge:badges(*)
        `)
        .eq('user_id', userId)
        .order('earned_at', { ascending: false });

      if (error) throw error;
      return { success: true, achievements: data || [] };
    } catch (error: unknown) {
      return { success: false, error: getErrorMessage(error), achievements: [] };
    }
  },

  async getAvailableBadges() {
    try {
      const { data, error } = await supabase
        .from('badges')
        .select('*')
        .eq('is_active', true)
        .order('points_reward', { ascending: false });

      if (error) throw error;
      return { success: true, badges: data || [] };
    } catch (error: unknown) {
      return { success: false, error: getErrorMessage(error), badges: [] };
    }
  },

  // ==========================================
  // MESSAGES
  // ==========================================

  async sendMessage(rideId: string, receiverId: string, content: string) {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('messages')
        .insert([{
          ride_id: rideId,
          sender_id: user.user.id,
          receiver_id: receiverId,
          content
        }])
        .select()
        .single();

      if (error) throw error;
      return { success: true, message: data };
    } catch (error: unknown) {
      return { success: false, error: getErrorMessage(error) };
    }
  },

  async getMessages(rideId: string) {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles(id, full_name, first_name, last_name, avatar_url)
        `)
        .eq('ride_id', rideId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return { success: true, messages: data || [] };
    } catch (error: unknown) {
      return { success: false, error: getErrorMessage(error), messages: [] };
    }
  },

  async markMessagesAsRead(rideId: string) {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('ride_id', rideId)
        .eq('receiver_id', user.user.id)
        .eq('is_read', false);

      if (error) throw error;
      return { success: true };
    } catch (error: unknown) {
      return { success: false, error: getErrorMessage(error) };
    }
  },

  // ==========================================
  // REALTIME SUBSCRIPTIONS
  // ==========================================

  subscribeToRide(rideId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`ride:${rideId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'published_rides',
          filter: `id=eq.${rideId}`
        },
        callback
      )
      .subscribe();
  },

  subscribeToBookings(rideId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`bookings:${rideId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
          filter: `ride_id=eq.${rideId}`
        },
        callback
      )
      .subscribe();
  },

  subscribeToMessages(rideId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`messages:${rideId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `ride_id=eq.${rideId}`
        },
        callback
      )
      .subscribe();
  },

  // ==========================================
  // LIVE LOCATION
  // ==========================================

  async updateLocation(rideId: string, lat: number, lng: number, accuracy?: number) {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('live_locations')
        .upsert([{
          ride_id: rideId,
          user_id: user.user.id,
          lat,
          lng,
          accuracy
        }], {
          onConflict: 'ride_id,user_id'
        });

      if (error) throw error;
      return { success: true };
    } catch (error: unknown) {
      return { success: false, error: getErrorMessage(error) };
    }
  },

  async getLiveLocations(rideId: string) {
    try {
      const { data, error } = await supabase
        .from('live_locations')
        .select(`
          *,
          user:profiles(id, full_name, first_name, last_name, avatar_url)
        `)
        .eq('ride_id', rideId)
        .order('timestamp', { ascending: false });

      if (error) throw error;
      return { success: true, locations: data || [] };
    } catch (error: unknown) {
      return { success: false, error: getErrorMessage(error), locations: [] };
    }
  },

  subscribeToLocations(rideId: string, callback: (payload: any) => void) {
    return supabase
      .channel(`locations:${rideId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'live_locations',
          filter: `ride_id=eq.${rideId}`
        },
        callback
      )
      .subscribe();
  }
};
