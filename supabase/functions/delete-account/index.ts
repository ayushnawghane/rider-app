import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.108.2';

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

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed.' });
  }

  const supabaseUrl = env('SUPABASE_URL');
  const anonKey = env('SUPABASE_ANON_KEY');
  const serviceRoleKey = env('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse(500, { error: 'Account deletion is not configured.' });
  }

  const authorization = request.headers.get('Authorization') || '';
  if (!authorization.toLowerCase().startsWith('bearer ')) {
    return jsonResponse(401, { error: 'Authentication required.' });
  }

  try {
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse(401, { error: 'Authentication required.' });
    }

    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id);
    if (deleteError) {
      console.error('Failed to delete auth user:', deleteError);
      return jsonResponse(500, { error: 'Failed to delete account.' });
    }

    return jsonResponse(200, { success: true, userId: user.id });
  } catch (error) {
    console.error('Unexpected account deletion error:', error);
    return jsonResponse(500, { error: 'Failed to delete account.' });
  }
});
