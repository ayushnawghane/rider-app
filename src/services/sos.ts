import { supabase } from '../lib/supabase';
import type {
  SosAlert,
  SosCreateParams,
} from '../types';

class SosService {
  async createSosAlert(params: SosCreateParams): Promise<{ success: boolean; sosAlert?: SosAlert; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('sos_alerts')
        .insert({
          user_id: params.userId,
          ride_id: params.rideId,
          location: params.location,
          status: 'active',
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, sosAlert: this.mapSosToSos(data) };
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  async getActiveAlerts(userId: string): Promise<{ success: boolean; alerts?: SosAlert[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('sos_alerts')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active');

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, alerts: data.map((alert: any) => this.mapSosToSos(alert)) };
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  async getAllActiveAlerts(): Promise<{ success: boolean; alerts?: SosAlert[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('sos_alerts')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, alerts: data.map((alert: any) => this.mapSosToSos(alert)) };
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  async resolveAlert(alertId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('sos_alerts')
        .update({ status: 'resolved', resolved_at: new Date().toISOString() })
        .eq('id', alertId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  private mapSosToSos(data: any): SosAlert {
    return {
      id: data.id,
      userId: data.user_id,
      rideId: data.ride_id,
      location: data.location,
      status: data.status,
      createdAt: data.created_at,
      resolvedAt: data.resolved_at,
    };
  }
}

export const sosService = new SosService();
