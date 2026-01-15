// Supabase Edge Function for sending push notifications
// Deploy this to supabase/functions/send-notification

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface RequestBody {
  userId: string;
  title: string;
  message: string;
  type: 'ride' | 'dispute' | 'system';
  metadata?: Record<string, any>;
}

serve(async (req: Request) => {
  const { userId, title, message, type, metadata } = await req.json() as RequestBody;

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const fcmServerKey = Deno.env.get('FCM_SERVER_KEY') ?? '';

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Get user's FCM token
  const { data: userData } = await supabase
    .from('profiles')
    .select('fcm_token')
    .eq('id', userId)
    .single();

  if (!userData?.fcm_token) {
    return new Response(JSON.stringify({ error: 'No FCM token found' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400,
    });
  }

  // Create notification record
  await supabase.from('notifications').insert({
    user_id: userId,
    title,
    message,
    type,
    read: false,
  });

  // Send push notification via FCM
  try {
    const fcmResponse = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${fcmServerKey}`,
      },
      body: JSON.stringify({
        to: userData.fcm_token,
        notification: {
          title,
          body: message,
          icon: 'notification_icon',
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
        },
        data: {
          type,
          ...metadata,
        },
      }),
    });

    const fcmResult = await fcmResponse.json();

    return new Response(JSON.stringify({ success: true, fcmResult }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to send push notification' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
