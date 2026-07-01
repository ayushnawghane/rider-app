// notify-email — sends a transactional email for an app notification.
//
// Called server-side (from the create_notification SQL function via pg_net) or
// directly by an authenticated client. Runs with the service role so it can look
// up the recipient's email + notification preference. Uses Resend when
// RESEND_API_KEY is configured; otherwise it no-ops gracefully (so notifications
// never fail just because email isn't set up yet).
//
// Required secrets (only for real sending):
//   supabase secrets set RESEND_API_KEY=...           # https://resend.com
//   supabase secrets set NOTIFY_EMAIL_FROM="BlinkCar <no-reply@yourdomain.com>"
// Optional shared secret so only trusted callers can trigger email:
//   supabase secrets set NOTIFY_EMAIL_HOOK_SECRET=...

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.108.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hook-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const env = (name: string) => Deno.env.get(name)?.trim() || '';

const SUPABASE_URL = env('SUPABASE_URL');
const SERVICE_ROLE_KEY = env('SUPABASE_SERVICE_ROLE_KEY');
const RESEND_API_KEY = env('RESEND_API_KEY');
const NOTIFY_EMAIL_FROM = env('NOTIFY_EMAIL_FROM') || 'BlinkCar <onboarding@resend.dev>';
const HOOK_SECRET = env('NOTIFY_EMAIL_HOOK_SECRET');

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

const isPlaceholderEmail = (email: string) => email.endsWith('@otp.riderapp.local');

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json(405, { success: false, error: 'Method not allowed' });

  try {
    // If a hook secret is configured, require it (server-to-server calls).
    if (HOOK_SECRET && request.headers.get('x-hook-secret') !== HOOK_SECRET) {
      return json(401, { success: false, error: 'Unauthorized' });
    }

    const { userId, subject, message } = await request.json() as {
      userId?: string; subject?: string; message?: string;
    };

    if (!userId || !subject || !message) {
      return json(400, { success: false, error: 'userId, subject and message are required' });
    }

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return json(500, { success: false, error: 'Supabase service environment not configured' });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: profile, error } = await admin
      .from('profiles')
      .select('email, full_name, notification_preferences')
      .eq('id', userId)
      .maybeSingle();

    if (error) return json(400, { success: false, error: error.message });
    if (!profile) return json(404, { success: false, error: 'User not found' });

    // Respect the recipient's preference and skip generated placeholder emails.
    if (profile.notification_preferences === false) {
      return json(200, { success: true, skipped: 'notifications disabled' });
    }
    if (!profile.email || isPlaceholderEmail(profile.email)) {
      return json(200, { success: true, skipped: 'no deliverable email on file' });
    }

    // No email provider configured yet → succeed without sending.
    if (!RESEND_API_KEY) {
      return json(200, { success: true, skipped: 'email provider not configured' });
    }

    const html = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <div style="font-weight:800;font-size:20px;color:#ff6b00">BlinkCar</div>
        <h1 style="font-size:18px;color:#111;margin:16px 0 8px">${subject}</h1>
        <p style="font-size:15px;color:#444;line-height:1.5">${message}</p>
        <p style="font-size:12px;color:#999;margin-top:24px">You're receiving this because notifications are on for your BlinkCar account.</p>
      </div>`;

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: NOTIFY_EMAIL_FROM,
        to: [profile.email],
        subject,
        html,
      }),
    });

    if (!resendResponse.ok) {
      const text = await resendResponse.text();
      return json(502, { success: false, error: `Email provider error: ${text}` });
    }

    return json(200, { success: true });
  } catch (error) {
    const messageText = error instanceof Error ? error.message : 'Email request failed';
    return json(400, { success: false, error: messageText });
  }
});
