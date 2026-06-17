import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.108.2';

interface RequestBody {
  userId: string;
  title: string;
  message: string;
  type: 'ride' | 'dispute' | 'system';
  metadata?: Record<string, any>;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const jsonResponse = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });

const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

const validateBody = (body: Partial<RequestBody>): RequestBody => {
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  const type = body.type;
  const userId = typeof body.userId === 'string' ? body.userId.trim() : '';

  if (!isUuid(userId)) throw new Error('Invalid notification recipient.');
  if (!title || title.length > 120) throw new Error('Invalid notification title.');
  if (!message || message.length > 500) throw new Error('Invalid notification message.');
  if (!type || !['ride', 'dispute', 'system'].includes(type)) throw new Error('Invalid notification type.');

  return {
    userId,
    title,
    message,
    type,
    metadata: body.metadata && typeof body.metadata === 'object' ? body.metadata : undefined,
  };
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
  const fcmServerKey = Deno.env.get('FCM_SERVER_KEY') ?? '';

  if (!supabaseUrl || !anonKey || !serviceRoleKey || !fcmServerKey) {
    return jsonResponse(500, { error: 'Notification environment is not configured' });
  }

  try {
    const authorization = req.headers.get('Authorization') || '';
    if (!authorization.toLowerCase().startsWith('bearer ')) {
      return jsonResponse(401, { error: 'Authentication required' });
    }

    const anonClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const {
      data: { user },
      error: userError,
    } = await anonClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse(401, { error: 'Authentication required' });
    }

    const { data: callerProfile, error: callerError } = await adminClient
      .from('profiles')
      .select('role, is_blocked')
      .eq('id', user.id)
      .maybeSingle();

    if (callerError) throw callerError;
    if (callerProfile?.is_blocked || callerProfile?.role !== 'admin') {
      return jsonResponse(403, { error: 'Admin access required' });
    }

    const { userId, title, message, type, metadata } = validateBody(await req.json());

    const { data: userData, error: recipientError } = await adminClient
      .from('profiles')
      .select('fcm_token')
      .eq('id', userId)
      .single();

    if (recipientError) throw recipientError;
    if (!userData?.fcm_token) {
      return jsonResponse(400, { error: 'No FCM token found' });
    }

    const { error: insertError } = await adminClient.from('notifications').insert({
      user_id: userId,
      title,
      message,
      type,
      read: false,
    });

    if (insertError) throw insertError;

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
    if (!fcmResponse.ok) {
      return jsonResponse(502, { error: 'FCM request failed', fcmResult });
    }

    return jsonResponse(200, { success: true, fcmResult });
  } catch (error) {
    console.error('send-notification failed:', error);
    return jsonResponse(500, { error: 'Failed to send push notification' });
  }
});
