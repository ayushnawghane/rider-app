#!/usr/bin/env node

const env = (name) => process.env[name]?.trim() || '';

const supabaseUrl = env('VITE_SUPABASE_URL') || env('SUPABASE_URL');
const anonKey = env('VITE_SUPABASE_ANON_KEY') || env('SUPABASE_ANON_KEY');
const accessToken = env('TEST_SUPABASE_ACCESS_TOKEN') || env('SUPABASE_ACCESS_TOKEN');
const userId = env('TEST_USER_ID') || process.argv[2];
const rideId = env('TEST_RIDE_ID') || process.argv[3];
const action = env('TEST_REWARD_ACTION') || process.argv[4] || 'complete_ride';
const eventKey = env('TEST_REWARD_EVENT_KEY') || `terminal-test:${action}:${rideId}:${userId}:${Date.now()}`;

if (!supabaseUrl) throw new Error('Set VITE_SUPABASE_URL or SUPABASE_URL.');
if (!anonKey) throw new Error('Set VITE_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY.');
if (!accessToken) throw new Error('Set TEST_SUPABASE_ACCESS_TOKEN to a signed-in user JWT.');
if (!userId) throw new Error('Set TEST_USER_ID or pass it as the first argument.');
if (!rideId) throw new Error('Set TEST_RIDE_ID or pass it as the second argument.');

const endpoint = `${supabaseUrl.replace(/\/$/, '')}/functions/v1/ride-rewards`;
const response = await fetch(endpoint, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${accessToken}`,
    apikey: anonKey,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    userId,
    rideId,
    action,
    description: `Terminal reward endpoint test for ${action}`,
    eventKey,
    metadata: {
      source: 'scripts/test-ride-rewards.mjs',
    },
  }),
});

const text = await response.text();
let payload;
try {
  payload = JSON.parse(text);
} catch {
  payload = text;
}

console.log(JSON.stringify({
  ok: response.ok,
  status: response.status,
  endpoint,
  action,
  eventKey,
  payload,
}, null, 2));

if (!response.ok) {
  process.exitCode = 1;
}
