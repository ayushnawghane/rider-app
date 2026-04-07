import type { User } from '../types';

const GENERIC_PROFILE_NAMES = new Set(['rider', 'user']);
const PLACEHOLDER_PROFILE_EMAIL_REGEX = /^phone-[^@]+@riderapp\.local$/i;
const TEMP_PROFILE_EMAIL_REGEX = /^user-[^@]+@otp\.riderapp\.local$/i;

const looksLikeEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export const isProfileNameIncomplete = (value?: string | null) => {
  const fullName = value?.trim() || '';
  if (!fullName) return true;

  const normalizedName = fullName.toLowerCase();
  if (GENERIC_PROFILE_NAMES.has(normalizedName)) return true;
  if (normalizedName.startsWith('phone-')) return true;
  if (looksLikeEmail(fullName)) return true;

  return false;
};

export const isProfileEmailIncomplete = (value?: string | null) => {
  const email = value?.trim().toLowerCase() || '';
  if (!email) return true;
  if (email.endsWith('@otp.riderapp.local')) return true;
  if (PLACEHOLDER_PROFILE_EMAIL_REGEX.test(email)) return true;
  if (TEMP_PROFILE_EMAIL_REGEX.test(email)) return true;
  return false;
};

export const isProfilePhoneIncomplete = (value?: string | null) => {
  const phone = value?.trim() || '';
  if (!phone) return true;
  if (phone.startsWith('temp_')) return true;
  if (phone.startsWith('phone-')) return true;
  return false;
};

export const isProfileIncomplete = (user?: User | null) => {
  if (!user) return true;

  return (
    isProfileNameIncomplete(user.fullName) ||
    isProfileEmailIncomplete(user.email) ||
    isProfilePhoneIncomplete(user.phone)
  );
};
