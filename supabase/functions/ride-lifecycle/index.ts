import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.108.2';

type RideStatus = 'pending' | 'active' | 'completed' | 'cancelled';

interface RequestBody {
  rideId?: string;
  now?: string;
}

const DEFAULT_RIDE_DURATION_MINUTES = 60;

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

const getTimeAdjustedRideStatus = (
  ride: { status: RideStatus; date: string; duration?: number | null },
  now = new Date(),
): RideStatus => {
  if (ride.status === 'completed' || ride.status === 'cancelled') {
    return ride.status;
  }

  const startTime = new Date(ride.date);
  if (Number.isNaN(startTime.getTime())) {
    return ride.status;
  }

  const durationMinutes =
    typeof ride.duration === 'number' && ride.duration > 0
      ? ride.duration
      : DEFAULT_RIDE_DURATION_MINUTES;
  const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

  if (ride.status === 'active' && now >= endTime) {
    return 'completed';
  }

  if (ride.status === 'pending') {
    if (now >= endTime) return 'completed';
    if (now >= startTime) return 'active';
  }

  return ride.status;
};

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
    return jsonResponse(500, { error: 'Ride lifecycle environment is not configured.' });
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

    const now = body.now ? new Date(body.now) : new Date();
    if (Number.isNaN(now.getTime())) {
      return jsonResponse(400, { error: 'Invalid now timestamp.' });
    }

    const { data: ride, error: rideError } = await adminClient
      .from('rides')
      .select('id, user_id, driver_id, date, duration, status')
      .eq('id', rideId)
      .maybeSingle();

    if (rideError) throw rideError;
    if (!ride) return jsonResponse(404, { error: 'Ride not found.' });

    const isDriver = ride.user_id === user.id || ride.driver_id === user.id;
    let isParticipant = false;
    if (!isDriver) {
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

    if (!isDriver && !isParticipant) {
      return jsonResponse(403, { error: 'Ride access denied.' });
    }

    const nextStatus = getTimeAdjustedRideStatus(ride, now);
    if (nextStatus === ride.status) {
      return jsonResponse(200, {
        success: true,
        changed: false,
        rideId,
        status: ride.status,
      });
    }

    const updatedAt = new Date().toISOString();
    const { error: updateError } = await adminClient
      .from('rides')
      .update({ status: nextStatus, updated_at: updatedAt })
      .eq('id', rideId)
      .eq('status', ride.status);

    if (updateError) throw updateError;

    if (nextStatus === 'active' || nextStatus === 'completed' || nextStatus === 'cancelled') {
      const bookingStatus =
        nextStatus === 'active'
          ? 'confirmed'
          : nextStatus === 'completed'
            ? 'completed'
            : 'cancelled';
      const timestampField =
        nextStatus === 'active'
          ? 'confirmation_time'
          : nextStatus === 'completed'
            ? 'completion_time'
            : 'cancellation_time';

      const { error: bookingError } = await adminClient
        .from('bookings')
        .update({
          status: bookingStatus,
          [timestampField]: updatedAt,
          updated_at: updatedAt,
        })
        .eq('ride_id', rideId)
        .in('status', ['pending', 'confirmed']);

      if (bookingError) throw bookingError;
    }

    return jsonResponse(200, {
      success: true,
      changed: true,
      rideId,
      previousStatus: ride.status,
      status: nextStatus,
      updatedAt,
    });
  } catch (error) {
    console.error('ride-lifecycle failed:', error);
    const message = error instanceof Error ? error.message : 'Failed to reconcile ride lifecycle.';
    return jsonResponse(400, { success: false, error: message });
  }
});
