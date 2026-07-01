import { supabase } from '../lib/supabase';
import type {
  Notification,
} from '../types';

class NotificationService {
  // Notifications are created through a SECURITY DEFINER RPC so the app can
  // notify ANY user (e.g. a passenger notifying the ride owner). A direct
  // client insert into `notifications` is blocked by RLS for other users and
  // only works for yourself, so the RPC is the correct path. Most notifications
  // are also raised automatically by DB triggers; this remains available for
  // any explicit client-driven notification.
  async createNotification(params: {
    userId: string;
    title: string;
    message: string;
    type?: Notification['type'];
  }): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase.rpc('create_notification', {
        target_user_id: params.userId,
        notification_title: params.title,
        notification_message: params.message,
        notification_type: params.type ?? 'system',
      });

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  async getNotifications(userId: string): Promise<{ success: boolean; notifications?: Notification[]; error?: string }> {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, notifications: data.map((notification: any) => this.mapNotificationToNotification(notification)) };
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  async markAsRead(notificationId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  async markAllAsRead(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  async getUnreadCount(userId: string): Promise<{ success: boolean; count?: number; error?: string }> {
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true, count: count || 0 };
    } catch (error) {
      return { success: false, error: 'An unexpected error occurred' };
    }
  }

  subscribeToNotifications(userId: string, callback: (notification: Notification) => void): () => void {
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          const { data } = await supabase
            .from('notifications')
            .select('*')
            .eq('id', payload.new.id)
            .single();

          if (data) {
            callback(this.mapNotificationToNotification(data));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  private mapNotificationToNotification(data: any): Notification {
    return {
      id: data.id,
      userId: data.user_id,
      title: data.title,
      message: data.message,
      type: data.type,
      read: data.read,
      createdAt: data.created_at,
    };
  }
}

export const notificationService = new NotificationService();
