import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.108.2';

type RideRewardAction = 'publish_ride' | 'join_ride' | 'complete_ride';

interface RequestBody {
  userId?: string;
  rideId?: string;
  action?: RideRewardAction;
  description?: string;
  metadata?: Record<string, unknown>;
  eventKey?: string;
}

const RIDE_REWARD_POINTS = 50;
const MONTHLY_REWARD_POINTS_CAP = 100;
const RIDE_REWARD_ACTIONS = ['publish_ride', 'join_ride', 'complete_ride'] as const;

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

const getRewardMonthWindow = (date = new Date()) => {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1, 0, 0, 0, 0));
  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
};

const getAwardableRideRewardPoints = (monthlyPoints: number) => {
  const remaining = Math.max(0, MONTHLY_REWARD_POINTS_CAP - Math.max(0, monthlyPoints));
  return Math.min(RIDE_REWARD_POINTS, remaining);
};

const validateBody = (body: RequestBody) => {
  const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
  const rideId = typeof body.rideId === 'string' ? body.rideId.trim() : '';
  const action = body.action;
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const eventKey = typeof body.eventKey === 'string' ? body.eventKey.trim() : '';

  if (!isUuid(userId)) throw new Error('Invalid reward user.');
  if (!isUuid(rideId)) throw new Error('Invalid reward ride.');
  if (!action || !RIDE_REWARD_ACTIONS.includes(action)) throw new Error('Invalid reward action.');
  if (!description || description.length > 500) throw new Error('Invalid reward description.');

  return {
    userId,
    rideId,
    action,
    description,
    metadata: body.metadata && typeof body.metadata === 'object' ? body.metadata : {},
    eventKey: eventKey || `${action}:${rideId}:${userId}`,
  };
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
    return jsonResponse(500, { error: 'Reward environment is not configured.' });
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

    const reward = validateBody(await request.json());
    if (reward.userId !== user.id) {
      return jsonResponse(403, { error: 'Cannot award points to another user.' });
    }

    const { data: existingReward, error: existingError } = await adminClient
      .from('rewards')
      .select('id, points, action, event_key, created_at')
      .eq('event_key', reward.eventKey)
      .maybeSingle();

    if (existingError) throw existingError;
    if (existingReward) {
      return jsonResponse(200, {
        success: true,
        awarded: false,
        duplicate: true,
        pointsAwarded: 0,
        existingReward,
      });
    }

    const { startIso, endIso } = getRewardMonthWindow();
    const { data: monthlyRows, error: monthlyError } = await adminClient
      .from('rewards')
      .select('points')
      .eq('user_id', reward.userId)
      .in('action', RIDE_REWARD_ACTIONS)
      .gte('created_at', startIso)
      .lt('created_at', endIso);

    if (monthlyError) throw monthlyError;

    const monthlyPoints = (monthlyRows || []).reduce((sum: number, row: { points?: number }) => sum + (row.points || 0), 0);
    const pointsAwarded = getAwardableRideRewardPoints(monthlyPoints);

    if (pointsAwarded <= 0) {
      return jsonResponse(200, {
        success: true,
        awarded: false,
        capped: true,
        pointsAwarded: 0,
        monthlyPoints,
        monthlyCap: MONTHLY_REWARD_POINTS_CAP,
      });
    }

    const { data: insertedReward, error: insertError } = await adminClient
      .from('rewards')
      .insert({
        user_id: reward.userId,
        ride_id: reward.rideId,
        points: pointsAwarded,
        action: reward.action,
        description: reward.description,
        metadata: {
          ...reward.metadata,
          source: 'ride-rewards-edge-function',
          monthly_points_before_award: monthlyPoints,
          monthly_cap: MONTHLY_REWARD_POINTS_CAP,
        },
        event_key: reward.eventKey,
      })
      .select('id, points, action, event_key, created_at')
      .single();

    if (insertError) {
      if (insertError.code === '23505') {
        return jsonResponse(200, {
          success: true,
          awarded: false,
          duplicate: true,
          pointsAwarded: 0,
        });
      }
      throw insertError;
    }

    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('total_points, level')
      .eq('id', reward.userId)
      .maybeSingle();

    if (profileError) throw profileError;

    const totalPoints = (profile?.total_points || 0) + pointsAwarded;
    const level = Math.max(profile?.level || 1, Math.floor(totalPoints / 500) + 1);
    const { error: updateProfileError } = await adminClient
      .from('profiles')
      .update({ total_points: totalPoints, level })
      .eq('id', reward.userId);

    if (updateProfileError) throw updateProfileError;

    return jsonResponse(200, {
      success: true,
      awarded: true,
      capped: false,
      pointsAwarded,
      monthlyPoints: monthlyPoints + pointsAwarded,
      monthlyCap: MONTHLY_REWARD_POINTS_CAP,
      reward: insertedReward,
    });
  } catch (error) {
    console.error('ride-rewards failed:', error);
    const message = error instanceof Error ? error.message : 'Failed to award ride reward.';
    return jsonResponse(400, { success: false, error: message });
  }
});
