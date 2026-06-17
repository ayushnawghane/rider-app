#!/usr/bin/env node
// Generates the Apple "client secret" JWT used by Supabase's Apple provider.
// Apple secrets are short-lived (max 6 months) — re-run this to rotate.
//
// Usage:
//   node scripts/generate-apple-secret.mjs \
//     --team-id ABCDE12345 \
//     --key-id  K1234ABCD \
//     --service-id com.blinkcar.app.signin \
//     --p8 ./AuthKey_K1234ABCD.p8
//
// Or via env: APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_SERVICE_ID, APPLE_P8_PATH
// Prints the JWT to stdout (paste into Supabase → Auth → Providers → Apple → Secret Key).

import crypto from 'node:crypto';
import { readFileSync } from 'node:fs';

const argv = process.argv.slice(2);
const arg = (name) => {
  const i = argv.indexOf(`--${name}`);
  return i !== -1 ? argv[i + 1] : undefined;
};

const teamId = arg('team-id') || process.env.APPLE_TEAM_ID;
const keyId = arg('key-id') || process.env.APPLE_KEY_ID;
const serviceId = arg('service-id') || process.env.APPLE_SERVICE_ID;
const p8Path = arg('p8') || process.env.APPLE_P8_PATH;

const missing = [
  ['--team-id', teamId],
  ['--key-id', keyId],
  ['--service-id', serviceId],
  ['--p8', p8Path],
].filter(([, v]) => !v).map(([k]) => k);

if (missing.length) {
  console.error(`Missing required: ${missing.join(', ')}`);
  process.exit(1);
}

const privateKey = readFileSync(p8Path, 'utf8');

const b64url = (input) =>
  Buffer.from(input).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

const now = Math.floor(Date.now() / 1000);
const sixMonths = 60 * 60 * 24 * 180; // Apple max is 6 months

const header = { alg: 'ES256', kid: keyId, typ: 'JWT' };
const payload = {
  iss: teamId,
  iat: now,
  exp: now + sixMonths,
  aud: 'https://appleid.apple.com',
  sub: serviceId,
};

const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
// ES256 requires a raw (r||s) signature, not DER — hence dsaEncoding: 'ieee-p1363'.
const signature = crypto
  .sign('SHA256', Buffer.from(signingInput), { key: privateKey, dsaEncoding: 'ieee-p1363' })
  .toString('base64')
  .replace(/=/g, '')
  .replace(/\+/g, '-')
  .replace(/\//g, '_');

process.stdout.write(`${signingInput}.${signature}\n`);
