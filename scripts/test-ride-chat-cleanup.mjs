#!/usr/bin/env node

const env = (name) => process.env[name]?.trim() || '';

const supabaseUrl = env('VITE_SUPABASE_URL') || env('SUPABASE_URL');
const anonKey = env('VITE_SUPABASE_ANON_KEY') || env('SUPABASE_ANON_KEY');
const accessToken = env('TEST_SUPABASE_ACCESS_TOKEN') || env('SUPABASE_ACCESS_TOKEN');
const rideId = env('TEST_RIDE_ID') || process.argv[2];
const force = ['1', 'true', 'yes'].includes((env('TEST_FORCE_CLEANUP') || process.argv[3] || '').toLowerCase());

if (!supabaseUrl) throw new Error('Set VITE_SUPABASE_URL or SUPABASE_URL.');
if (!anonKey) throw new Error('Set VITE_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY.');
if (!accessToken) throw new Error('Set TEST_SUPABASE_ACCESS_TOKEN to a signed-in user JWT.');
if (!rideId) throw new Error('Set TEST_RIDE_ID or pass it as the first argument.');

const endpoint = `${supabaseUrl.replace(/\/$/, '')}/functions/v1/ride-chat-cleanup`;
const response = await fetch(endpoint, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${accessToken}`,
    apikey: anonKey,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    rideId,
    ...(force ? { force: true } : {}),
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
  rideId,
  force,
  payload,
}, null, 2));

if (!response.ok) {
  process.exitCode = 1;
}
