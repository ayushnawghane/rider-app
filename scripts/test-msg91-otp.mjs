#!/usr/bin/env node

const env = (name) => process.env[name]?.trim() || '';

const authKey = env('MSG91_AUTH_KEY');
const templateId = env('MSG91_TEMPLATE_ID');
const phone = env('TEST_PHONE') || process.argv[2];
const otpLength = env('MSG91_OTP_LENGTH') || '6';
const otpVariableName = env('MSG91_OTP_VARIABLE_NAME') || 'var';

if (!authKey) {
  throw new Error('Set MSG91_AUTH_KEY before running this script.');
}

if (!templateId) {
  throw new Error('Set MSG91_TEMPLATE_ID before running this script.');
}

if (!phone) {
  throw new Error('Pass a phone number as TEST_PHONE or the first argument.');
}

const toMsg91Mobile = (value) => value.trim().replace(/[\s()+-]/g, '');
const generateOtp = () => {
  const length = Math.max(4, Math.min(8, Number(otpLength) || 6));
  const max = 10 ** length;
  return String(Math.floor(Math.random() * max)).padStart(length, '0');
};

const callMsg91 = async () => {
  const otp = env('TEST_OTP') || generateOtp();
  const url = new URL('https://control.msg91.com/api/v5/flow/');
  const recipient = {
    mobiles: toMsg91Mobile(phone),
    [otpVariableName]: otp,
    OTP: otp,
    otp,
    Otp: otp,
    VAR: otp,
    var: otp,
    VAR1: otp,
    var1: otp,
    CODE: otp,
    code: otp,
  };

  return fetch(url, {
    method: 'POST',
    headers: {
      authkey: authKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      template_id: templateId,
      short_url: '0',
      recipients: [recipient],
    }),
  });
};

const response = await callMsg91();
const text = await response.text();

let payload;
try {
  payload = JSON.parse(text);
} catch {
  payload = text;
}

console.log(
  JSON.stringify(
    {
      ok: response.ok,
      status: response.status,
      endpoint: 'flow',
      variableName: otpVariableName,
      payload,
    },
    null,
    2,
  ),
);
