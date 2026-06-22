import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.108.2';

interface RequestBody {
  rideId?: string;
  force?: boolean;
}

const TERMINAL_RIDE_STATUSES = ['completed', 'cancelled'];

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

const env = (name: string) => Deno.env.get(name)?.trim() || '';
const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i.test(value);

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  const supabaseUrl = env('SUPABASE_URL');
  const anonKey = env('SUPABASE_ANON_KEY');
  const serviceRoleKey = env('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse(500, { error: 'Ride chat cleanup environment is not configured.' });
  }

  try {
    const authorization = request.headers.get('Authorization') || '';
    if (!authorization.toLowerCase().startsWith('bearer ')) {
      return jsonResponse(401, { error: 'Authentication required.' });
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
      return jsonResponse(401, { error: 'Authentication required.' });
    }

    const body = (await request.json()) as RequestBody;
    const rideId = typeof body.rideId === 'string' ? body.rideId.trim() : '';
    if (!isUuid(rideId)) {
      return jsonResponse(400, { error: 'Invalid ride id.' });
    }

    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('role, is_blocked')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) throw profileError;
    if (profile?.is_blocked) {
      return jsonResponse(403, { error: 'Account is blocked.' });
    }

    const { data: ride, error: rideError } = await adminClient
      .from('rides')
      .select('id, user_id, driver_id, status')
      .eq('id', rideId)
      .maybeSingle();

    if (rideError) throw rideError;
    if (!ride) return jsonResponse(404, { error: 'Ride not found.' });

    const isAdmin = profile?.role === 'admin';
    const isDriver = ride.user_id === user.id || ride.driver_id === user.id;
    let isParticipant = false;
    if (!isAdmin && !isDriver) {
      const { data: participant, error: participantError } = await adminClient
        .from('ride_participants')
        .select('id')
        .eq('ride_id', rideId)
        .eq('user_id', user.id)
        .eq('status', 'joined')
        .maybeSingle();
      if (participantError) throw participantError;
      isParticipant = Boolean(participant);
    }

    if (!isAdmin && !isDriver && !isParticipant) {
      return jsonResponse(403, { error: 'Ride access denied.' });
    }

    if (!body.force && !TERMINAL_RIDE_STATUSES.includes(ride.status)) {
      return jsonResponse(409, {
        success: false,
        error: 'Ride chat can only be cleaned after completion or cancellation.',
        status: ride.status,
      });
    }

    if (body.force && !isAdmin) {
      return jsonResponse(403, { error: 'Only admins can force cleanup before terminal ride status.' });
    }

    const { data: deletedRows, error: deleteError } = await adminClient
      .from('ride_messages')
      .delete()
      .eq('ride_id', rideId)
      .select('id');

    if (deleteError) throw deleteError;

    return jsonResponse(200, {
      success: true,
      rideId,
      deletedMessages: deletedRows?.length || 0,
    });
  } catch (error) {
    console.error('ride-chat-cleanup failed:', error);
    const message = error instanceof Error ? error.message : 'Failed to clean ride chat.';
    return jsonResponse(400, { success: false, error: message });
  }
});
