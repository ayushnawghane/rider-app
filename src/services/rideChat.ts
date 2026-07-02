import { supabase } from '../lib/supabase';

// Unique channel topics per subscription so two subscribers to the same ride
// never collide on a shared channel (which throws after `.subscribe()`).
let chatSubscriptionSeq = 0;

// Ride chat is a 1:1 conversation between two participants of a ride
// (a passenger and the driver). It is backed by the `ride_messages` table,
// whose RLS lets any legitimate ride participant read/send while the ride is
// still `pending` (upcoming) or `active`.

export interface RideMessage {
  id: string;
  rideId: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
}

const mapMessage = (row: any): RideMessage => ({
  id: row.id,
  rideId: row.ride_id,
  senderId: row.sender_id,
  receiverId: row.receiver_id,
  content: row.content,
  isRead: row.is_read,
  createdAt: row.created_at,
});

class RideChatService {
  // All messages between the current user and one specific counterpart on a ride.
  async getThread(
    rideId: string,
    userId: string,
    peerId: string,
  ): Promise<{ success: boolean; messages?: RideMessage[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('ride_messages')
        .select('*')
        .eq('ride_id', rideId)
        .or(
          `and(sender_id.eq.${userId},receiver_id.eq.${peerId}),and(sender_id.eq.${peerId},receiver_id.eq.${userId})`,
        )
        .order('created_at', { ascending: true });

      if (error) return { success: false, error: error.message };
      return { success: true, messages: (data || []).map(mapMessage) };
    } catch {
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  async sendMessage(
    rideId: string,
    senderId: string,
    receiverId: string,
    content: string,
  ): Promise<{ success: boolean; message?: RideMessage; error?: string }> {
    const trimmed = content.trim();
    if (!trimmed) return { success: false, error: 'Message cannot be empty' };
    if (trimmed.length > 1000) return { success: false, error: 'Message is too long' };

    try {
      const { data, error } = await supabase
        .from('ride_messages')
        .insert({
          ride_id: rideId,
          sender_id: senderId,
          receiver_id: receiverId,
          content: trimmed,
        })
        .select()
        .single();

      if (error) return { success: false, error: error.message };
      return { success: true, message: mapMessage(data) };
    } catch {
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  async markThreadRead(rideId: string, userId: string, peerId: string): Promise<void> {
    try {
      await supabase
        .from('ride_messages')
        .update({ is_read: true })
        .eq('ride_id', rideId)
        .eq('receiver_id', userId)
        .eq('sender_id', peerId)
        .eq('is_read', false);
    } catch {
      // best-effort
    }
  }

  // Live updates for a ride: fires the callback with the freshly inserted
  // message on every new row for this ride. Callers filter to their thread.
  subscribe(rideId: string, callback: (message: RideMessage) => void): () => void {
    const channel = supabase
      .channel(`ride_messages:${rideId}:${++chatSubscriptionSeq}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ride_messages',
          filter: `ride_id=eq.${rideId}`,
        },
        (payload) => {
          if (payload.new) callback(mapMessage(payload.new));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}

export const rideChatService = new RideChatService();
