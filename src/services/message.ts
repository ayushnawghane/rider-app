import { supabase } from '../lib/supabase';
import type {
  Message,
  MessageCreateParams,
} from '../types';

class MessageService {
  async sendMessage(params: MessageCreateParams): Promise<{ success: boolean; message?: Message; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          dispute_id: params.disputeId,
          user_id: params.userId,
          content: params.content,
          is_from_user: params.isFromUser,
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, message: this.mapMessageToMessage(data) };
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  async getMessages(disputeId: string): Promise<{ success: boolean; messages?: Message[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('dispute_id', disputeId)
        .order('created_at', { ascending: true });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, messages: data.map((message: any) => this.mapMessageToMessage(message)) };
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  subscribeToMessages(disputeId: string, callback: (messages: Message[]) => void): () => void {
    const channel = supabase
      .channel(`messages:${disputeId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `dispute_id=eq.${disputeId}`,
        },
        async (payload) => {
          const { data } = await supabase
            .from('messages')
            .select('*')
            .eq('id', payload.new.id)
            .single();

          if (data) {
            callback([this.mapMessageToMessage(data)]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  private mapMessageToMessage(data: any): Message {
    return {
      id: data.id,
      disputeId: data.dispute_id,
      userId: data.user_id,
      agentId: data.agent_id,
      content: data.content,
      isFromUser: data.is_from_user,
      createdAt: data.created_at,
    };
  }
}

export const messageService = new MessageService();
