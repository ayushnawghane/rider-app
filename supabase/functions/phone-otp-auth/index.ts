import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.90.1';

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
  requestId?: string;
  [key: string]: unknown;
}

interface OtpProfile {
  id: string;
  email?: string | null;
  full_name?: string | null;
  phone?: string | null;
  kyc_status?: 'pending' | 'approved' | 'rejected' | null;
  language?: string | null;
  notification_preferences?: boolean | null;
  is_blocked?: boolean | null;
  role?: 'rider' | 'driver' | 'admin' | null;
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
const OTP_AUTH_PASSWORD_SECRET = env('OTP_AUTH_PASSWORD_SECRET') || env('OTP_PASSWORD_SECRET') || SUPABASE_SERVICE_ROLE_KEY;
const ALLOW_DUMMY_OTP = env('ALLOW_DUMMY_OTP').toLowerCase() === 'true';
const DUMMY_OTP_CODE = env('DUMMY_OTP_CODE') || '123456';
const MSG91_OTP_BASE_URL = 'https://control.msg91.com/api/v5';

let adminClient: ReturnType<typeof createClient> | null = null;
let anonClient: ReturnType<typeof createClient> | null = null;

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

  if (!ALLOW_DUMMY_OTP) {
    const missingMsg91Secrets = [
      ['MSG91_AUTH_KEY', MSG91_AUTH_KEY],
      ['MSG91_TEMPLATE_ID', MSG91_TEMPLATE_ID],
    ]
      .filter(([, value]) => !value)
      .map(([name]) => name);

    if (missingMsg91Secrets.length > 0) {
      throw new Error(`MSG91 OTP environment is not configured. Missing ${missingMsg91Secrets.join(', ')}.`);
    }
  }
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
      accept: 'application/json',
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

const assertMsg91Success = (payload: Msg91Payload, fallbackMessage: string) => {
  if (payload.type && payload.type.toLowerCase() !== 'success') {
    throw new Error(payload.message || fallbackMessage);
  }
};

const sendMsg91Otp = async (phone: string) => {
  const url = new URL(`${MSG91_OTP_BASE_URL}/otp`);
  url.searchParams.set('template_id', MSG91_TEMPLATE_ID);
  url.searchParams.set('mobile', toMsg91Mobile(phone));
  url.searchParams.set('authkey', MSG91_AUTH_KEY);
  url.searchParams.set('otp_expiry', MSG91_OTP_EXPIRY_MINUTES);
  url.searchParams.set('otp_length', MSG91_OTP_LENGTH);

  const payload = await callMsg91(url, {
    method: 'POST',
    body: '{}',
  });
  assertMsg91Success(payload, 'MSG91 failed to send OTP.');
  return payload;
};

const verifyMsg91Otp = async (phone: string, otp: string) => {
  const cleanedOtp = otp.trim();
  if (!/^\d{4,8}$/.test(cleanedOtp)) {
    throw new Error('Enter the verification code sent to your phone.');
  }

  const url = new URL(`${MSG91_OTP_BASE_URL}/otp/verify`);
  url.searchParams.set('mobile', toMsg91Mobile(phone));
  url.searchParams.set('otp', cleanedOtp);

  const payload = await callMsg91(url, { method: 'GET' });
  assertMsg91Success(payload, 'MSG91 OTP verification failed.');

  const message = payload.message?.toLowerCase() || '';
  if (/(invalid|expired|wrong|fail|not verified)/i.test(message)) {
    throw new Error(payload.message || 'MSG91 OTP verification failed.');
  }

  if (!payload.type && message && !/(verified|success)/i.test(message)) {
    throw new Error(payload.message || 'MSG91 OTP verification failed.');
  }

  return payload;
};

const getProfileByPhone = async (phone: string) => {
  const { data, error } = await getAdminClient()
    .from('profiles')
    .select('id, email, full_name, phone, kyc_status, language, notification_preferences, is_blocked, role')
    .eq('phone', phone)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as OtpProfile | null;
};

const getProfileById = async (id: string) => {
  const { data, error } = await getAdminClient()
    .from('profiles')
    .select('id, email, full_name, phone, kyc_status, language, notification_preferences, is_blocked, role')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data as OtpProfile | null;
};

const createOrUpdatePhoneUser = async (phone: string, password: string) => {
  const email = await createEmailForPhone(phone);
  const existingProfile = await getProfileByPhone(phone);

  if (existingProfile?.id) {
    const { data, error } = await getAdminClient().auth.admin.updateUserById(existingProfile.id, {
      email,
      password,
      email_confirm: true,
      phone,
      phone_confirm: true,
      user_metadata: {
        phone,
        full_name: existingProfile.full_name?.trim() || phone,
      },
    });

    if (error) throw new Error(error.message);
    return data.user;
  }

  const { data, error } = await getAdminClient().auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    phone,
    phone_confirm: true,
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
  const existingProfile = await getProfileById(user.id);
  const metadataFullName =
    typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim()
      ? user.user_metadata.full_name.trim()
      : '';

  const { data: profile, error: profileError } = await getAdminClient()
    .from('profiles')
    .upsert(
      {
        id: user.id,
        email: existingProfile?.email?.trim() || email,
        full_name: existingProfile?.full_name?.trim() || metadataFullName || phone,
        phone,
        kyc_status: existingProfile?.kyc_status || 'pending',
        language: existingProfile?.language || 'en',
        notification_preferences: existingProfile?.notification_preferences ?? true,
        is_blocked: existingProfile?.is_blocked ?? false,
        role: existingProfile?.role || 'rider',
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

    if (action === 'send') {
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
        request_id: payload.request_id || payload.requestId || payload.message,
        provider_type: 'sms',
      });
    }

    if (action === 'verify') {
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
