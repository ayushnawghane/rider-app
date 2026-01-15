import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not found in environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: window.localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          phone: string;
          kyc_status: 'pending' | 'approved' | 'rejected';
          kyc_document_url?: string;
          language: string;
          notification_preferences: boolean;
          is_blocked: boolean;
          role: 'rider' | 'driver' | 'admin';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          phone: string;
          kyc_status?: 'pending' | 'approved' | 'rejected';
          kyc_document_url?: string;
          language?: string;
          notification_preferences?: boolean;
          is_blocked?: boolean;
          role?: 'rider' | 'driver' | 'admin';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          phone?: string;
          kyc_status?: 'pending' | 'approved' | 'rejected';
          kyc_document_url?: string;
          language?: string;
          notification_preferences?: boolean;
          is_blocked?: boolean;
          role?: 'rider' | 'driver' | 'admin';
          created_at?: string;
          updated_at?: string;
        };
      };
      rides: {
        Row: {
          id: string;
          user_id: string;
          driver_id?: string;
          date: string;
          start_location: string;
          end_location: string;
          start_location_coords?: { lat: number; lng: number };
          end_location_coords?: { lat: number; lng: number };
          vehicle_type: string;
          vehicle_number: string;
          reference_id: string;
          status: 'pending' | 'active' | 'completed' | 'cancelled';
          fare?: number;
          duration?: number;
          distance?: number;
          driver_contact?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          driver_id?: string;
          date: string;
          start_location: string;
          end_location: string;
          start_location_coords?: { lat: number; lng: number };
          end_location_coords?: { lat: number; lng: number };
          vehicle_type: string;
          vehicle_number: string;
          reference_id: string;
          status?: 'pending' | 'active' | 'completed' | 'cancelled';
          fare?: number;
          duration?: number;
          distance?: number;
          driver_contact?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          driver_id?: string;
          date?: string;
          start_location?: string;
          end_location?: string;
          start_location_coords?: { lat: number; lng: number };
          end_location_coords?: { lat: number; lng: number };
          vehicle_type?: string;
          vehicle_number?: string;
          reference_id?: string;
          status?: 'pending' | 'active' | 'completed' | 'cancelled';
          fare?: number;
          duration?: number;
          distance?: number;
          driver_contact?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      disputes: {
        Row: {
          id: string;
          user_id: string;
          ride_id?: string;
          dispute_type: 'ride' | 'kyc' | 'other';
          description: string;
          status: 'open' | 'in_review' | 'resolved';
          assigned_agent_id?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          ride_id?: string;
          dispute_type: 'ride' | 'kyc' | 'other';
          description: string;
          status?: 'open' | 'in_review' | 'resolved';
          assigned_agent_id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          ride_id?: string;
          dispute_type?: 'ride' | 'kyc' | 'other';
          description?: string;
          status?: 'open' | 'in_review' | 'resolved';
          assigned_agent_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          dispute_id?: string;
          user_id: string;
          agent_id?: string;
          content: string;
          is_from_user: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          dispute_id?: string;
          user_id: string;
          agent_id?: string;
          content: string;
          is_from_user: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          dispute_id?: string;
          user_id?: string;
          agent_id?: string;
          content?: string;
          is_from_user?: boolean;
          created_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          message: string;
          type: 'ride' | 'dispute' | 'system';
          read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          message: string;
          type?: 'ride' | 'dispute' | 'system';
          read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          message?: string;
          type?: 'ride' | 'dispute' | 'system';
          read?: boolean;
          created_at?: string;
        };
      };
      sos_alerts: {
        Row: {
          id: string;
          user_id: string;
          ride_id?: string;
          location: { lat: number; lng: number };
          status: 'active' | 'resolved';
          created_at: string;
          resolved_at?: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          ride_id?: string;
          location: { lat: number; lng: number };
          status?: 'active' | 'resolved';
          created_at?: string;
          resolved_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          ride_id?: string;
          location?: { lat: number; lng: number };
          status?: 'active' | 'resolved';
          created_at?: string;
          resolved_at?: string;
        };
      };
      notices: {
        Row: {
          id: string;
          title: string;
          content: string;
          priority: 'low' | 'medium' | 'high';
          created_at: string;
          expires_at?: string;
        };
        Insert: {
          id?: string;
          title: string;
          content: string;
          priority?: 'low' | 'medium' | 'high';
          created_at?: string;
          expires_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          content?: string;
          priority?: 'low' | 'medium' | 'high';
          created_at?: string;
          expires_at?: string;
        };
      };
      faq: {
        Row: {
          id: string;
          question: string;
          answer: string;
          category: string;
          order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          question: string;
          answer: string;
          category: string;
          order?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          question?: string;
          answer?: string;
          category?: string;
          order?: number;
          created_at?: string;
        };
      };
    };
  };
};
