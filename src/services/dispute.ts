import { supabase } from '../lib/supabase';
import type {
  Dispute,
  DisputeCreateParams,
} from '../types';

class DisputeService {
  async createDispute(params: DisputeCreateParams): Promise<{ success: boolean; dispute?: Dispute; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('disputes')
        .insert({
          user_id: params.userId,
          ride_id: params.rideId,
          dispute_type: params.disputeType,
          description: params.description,
          status: 'open',
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, dispute: this.mapDisputeToDispute(data) };
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  async getDisputes(userId: string): Promise<{ success: boolean; disputes?: Dispute[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('disputes')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, disputes: data.map((dispute: any) => this.mapDisputeToDispute(dispute)) };
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  async getDisputeById(disputeId: string): Promise<{ success: boolean; dispute?: Dispute; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('disputes')
        .select('*')
        .eq('id', disputeId)
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, dispute: this.mapDisputeToDispute(data) };
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  async updateDisputeStatus(disputeId: string, status: Dispute['status']): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('disputes')
        .update({ status })
        .eq('id', disputeId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  private mapDisputeToDispute(data: any): Dispute {
    return {
      id: data.id,
      userId: data.user_id,
      rideId: data.ride_id,
      disputeType: data.dispute_type,
      description: data.description,
      status: data.status,
      assignedAgentId: data.assigned_agent_id,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }
}

export const disputeService = new DisputeService();
