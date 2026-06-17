import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.108.2';

type OtpAction = 'send' | 'verify';

interface OtpRequestBody {
  action?: OtpAction;
  phone?: string;
  otp?: string;
}

interface Msg91Payload {
  type?: string;
  message?: string;
  request_id?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const env = (name: string) => Deno.env.get(name)?.trim() || '';

const SUPABASE_URL = env('SUPABASE_URL');
const SUPABASE_ANON_KEY = env('SUPABASE_ANON_KEY');
const SUPABASE_SERVICE_ROLE_KEY = env('SUPABASE_SERVICE_ROLE_KEY');
const MSG91_AUTH_KEY = env('MSG91_AUTH_KEY');
const MSG91_TEMPLATE_ID = env('MSG91_TEMPLATE_ID');
const MSG91_OTP_EXPIRY_MINUTES = env('MSG91_OTP_EXPIRY_MINUTES') || '5';
const MSG91_OTP_LENGTH = env('MSG91_OTP_LENGTH') || '6';
const MSG91_SENDER_ID = env('MSG91_SENDER_ID') || 'BLICAR';
const MSG91_OTP_MESSAGE =
  env('MSG91_OTP_MESSAGE') || 'Your Blinkcar verification code is ##OTP##. Do not share this OTP with anyone.';
const OTP_AUTH_PASSWORD_SECRET = env('OTP_AUTH_PASSWORD_SECRET') || env('OTP_PASSWORD_SECRET') || SUPABASE_SERVICE_ROLE_KEY;
const ALLOW_DUMMY_OTP = env('ALLOW_DUMMY_OTP').toLowerCase() === 'true';
const DUMMY_OTP_CODE = env('DUMMY_OTP_CODE') || '123456';
const APP_ENV = (env('APP_ENV') || env('ENVIRONMENT') || env('DENO_ENV') || 'development').toLowerCase();
const OTP_RATE_LIMIT_WINDOW_MS = Number(env('OTP_RATE_LIMIT_WINDOW_MS')) || 10 * 60 * 1000;
const OTP_SEND_LIMIT_PER_PHONE = Number(env('OTP_SEND_LIMIT_PER_PHONE')) || 3;
const OTP_SEND_LIMIT_PER_IP = Number(env('OTP_SEND_LIMIT_PER_IP')) || 20;
const OTP_VERIFY_LIMIT_PER_PHONE = Number(env('OTP_VERIFY_LIMIT_PER_PHONE')) || 8;
const OTP_VERIFY_LIMIT_PER_IP = Number(env('OTP_VERIFY_LIMIT_PER_IP')) || 40;

let adminClient: ReturnType<typeof createClient> | null = null;
let anonClient: ReturnType<typeof createClient> | null = null;
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

const jsonResponse = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });

const normalizePhone = (phone: string) => {
  const compact = phone.trim().replace(/[\s()-]/g, '');
  if (!/^\+?[1-9]\d{7,14}$/.test(compact)) {
    throw new Error('Enter a valid mobile number with country code.');
  }
  return compact.startsWith('+') ? compact : `+${compact}`;
};

const toMsg91Mobile = (phone: string) => phone.replace(/^\+/, '');

const createEmailForPhone = async (phone: string) => {
  const encoder = new TextEncoder();
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(phone));
  const bytes = Array.from(new Uint8Array(digest));
  const hash = bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('').slice(0, 32);
  return `phone-${hash}@otp.riderapp.local`;
};

const createPasswordForPhone = async (phone: string) => {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(OTP_AUTH_PASSWORD_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(phone));
  const bytes = Array.from(new Uint8Array(signature));
  return `Otp-${bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('')}`;
};

const assertProviderConfigured = () => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase OTP auth environment is not configured.');
  }

  if (ALLOW_DUMMY_OTP && ['production', 'prod'].includes(APP_ENV)) {
    throw new Error('Dummy OTP is disabled in production.');
  }

  if (!ALLOW_DUMMY_OTP && !MSG91_AUTH_KEY) {
    throw new Error('MSG91 OTP environment is not configured.');
  }
};

const getClientIp = (request: Request) => {
  const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return forwardedFor || request.headers.get('cf-connecting-ip') || request.headers.get('x-real-ip') || 'unknown';
};

const assertRateLimit = (key: string, limit: number) => {
  const now = Date.now();
  const bucket = rateLimitBuckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + OTP_RATE_LIMIT_WINDOW_MS });
    return;
  }

  if (bucket.count >= limit) {
    throw new Error('Too many OTP attempts. Please try again later.');
  }

  bucket.count += 1;
};

const applyRateLimits = (action: OtpAction, phone: string, ip: string) => {
  const phoneLimit = action === 'send' ? OTP_SEND_LIMIT_PER_PHONE : OTP_VERIFY_LIMIT_PER_PHONE;
  const ipLimit = action === 'send' ? OTP_SEND_LIMIT_PER_IP : OTP_VERIFY_LIMIT_PER_IP;

  assertRateLimit(`${action}:phone:${phone}`, phoneLimit);
  assertRateLimit(`${action}:ip:${ip}`, ipLimit);
};

const getAdminClient = () => {
  if (!adminClient) {
    adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return adminClient;
};

const getAnonClient = () => {
  if (!anonClient) {
    anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return anonClient;
};

const callMsg91 = async (url: URL, init?: RequestInit) => {
  const response = await fetch(url, {
    ...init,
    headers: {
      authkey: MSG91_AUTH_KEY,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  const text = await response.text();
  let payload: Msg91Payload = {};

  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { message: text };
  }

  if (!response.ok || payload.type === 'error') {
    throw new Error(payload.message || `MSG91 request failed with ${response.status}`);
  }

  return payload;
};

const sendMsg91Otp = async (phone: string) => {
  const url = new URL('https://api.msg91.com/api/sendotp.php');
  url.searchParams.set('authkey', MSG91_AUTH_KEY);
  url.searchParams.set('mobile', toMsg91Mobile(phone));
  url.searchParams.set('message', MSG91_OTP_MESSAGE);
  url.searchParams.set('sender', MSG91_SENDER_ID);
  url.searchParams.set('otp_expiry', MSG91_OTP_EXPIRY_MINUTES);
  url.searchParams.set('otp_length', MSG91_OTP_LENGTH);
  if (MSG91_TEMPLATE_ID) {
    url.searchParams.set('DLT_TE_ID', MSG91_TEMPLATE_ID);
  }

  return callMsg91(url, { method: 'GET' });
};

const verifyMsg91Otp = async (phone: string, otp: string) => {
  const cleanedOtp = otp.trim();
  if (!/^\d{4,8}$/.test(cleanedOtp)) {
    throw new Error('Enter the verification code sent to your phone.');
  }

  const url = new URL('https://api.msg91.com/api/verifyRequestOTP.php');
  url.searchParams.set('authkey', MSG91_AUTH_KEY);
  url.searchParams.set('mobile', toMsg91Mobile(phone));
  url.searchParams.set('otp', cleanedOtp);

  return callMsg91(url, { method: 'GET' });
};

const getProfileUserIdByPhone = async (phone: string) => {
  const { data, error } = await getAdminClient()
    .from('profiles')
    .select('id')
    .eq('phone', phone)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data?.id as string | undefined;
};

const createOrUpdatePhoneUser = async (phone: string, password: string) => {
  const email = await createEmailForPhone(phone);
  const existingUserId = await getProfileUserIdByPhone(phone);

  if (existingUserId) {
    const { data, error } = await getAdminClient().auth.admin.updateUserById(existingUserId, {
      email,
      password,
      email_confirm: true,
      user_metadata: { phone, full_name: phone },
    });

    if (error) throw new Error(error.message);
    return data.user;
  }

  const { data, error } = await getAdminClient().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      phone,
      full_name: phone,
    },
  });

  if (error) throw new Error(error.message);
  return data.user;
};

const signInPhoneUser = async (phone: string) => {
  const email = await createEmailForPhone(phone);
  const password = await createPasswordForPhone(phone);
  const user = await createOrUpdatePhoneUser(phone, password);

  const { data: profile, error: profileError } = await getAdminClient()
    .from('profiles')
    .upsert(
      {
        id: user.id,
        email,
        full_name:
          typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim()
            ? user.user_metadata.full_name
            : phone,
        phone,
        kyc_status: 'pending',
        language: 'en',
        notification_preferences: true,
        is_blocked: false,
        role: 'rider',
      },
      { onConflict: 'id' },
    )
    .select('id')
    .maybeSingle();

  if (profileError || !profile) {
    throw new Error(profileError?.message || 'Failed to prepare phone profile.');
  }

  const { data, error } = await getAnonClient().auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw new Error(error.message);
  if (!data.session) throw new Error('OTP verified but Supabase did not return a session.');

  return data.session;
};

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse(405, { success: false, error: 'Method not allowed' });
  }

  try {
    assertProviderConfigured();

    const body = (await request.json()) as OtpRequestBody;
    const action = body.action;
    const phone = normalizePhone(body.phone || '');
    const ip = getClientIp(request);

    if (action === 'send') {
      applyRateLimits(action, phone, ip);

      if (ALLOW_DUMMY_OTP) {
        return jsonResponse(200, {
          success: true,
          message: 'OTP sent',
          request_id: 'dummy-otp',
          provider_type: 'dummy',
        });
      }

      const payload = await sendMsg91Otp(phone);
      return jsonResponse(200, {
        success: true,
        message: payload.message || 'OTP sent',
        request_id: payload.request_id,
        provider_type: 'sms',
      });
    }

    if (action === 'verify') {
      applyRateLimits(action, phone, ip);

      if (ALLOW_DUMMY_OTP) {
        if ((body.otp || '').trim() !== DUMMY_OTP_CODE) {
          throw new Error('Enter the verification code sent to your phone.');
        }
      } else {
        await verifyMsg91Otp(phone, body.otp || '');
      }

      const session = await signInPhoneUser(phone);
      return jsonResponse(200, {
        success: true,
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        provider_type: ALLOW_DUMMY_OTP ? 'dummy' : 'sms',
      });
    }

    return jsonResponse(400, { success: false, error: 'Unsupported OTP action.' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'OTP request failed';
    return jsonResponse(400, { success: false, error: message });
  }
});
