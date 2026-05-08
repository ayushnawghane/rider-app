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

export const hasRequiredBookingProfile = (user?: User | null) => {
  if (!user) return false;
  return !isProfileIncomplete(user);
};

export const hasRequiredPublishingProfile = (user?: User | null) => {
  if (!hasRequiredBookingProfile(user)) return false;

  const vehicle = user?.vehicleDetails;
  return Boolean(vehicle?.vehicleNumber?.trim() && vehicle?.vehicleType?.trim());
};

export const getProfileCompletion = (user?: User | null) => {
  if (!user) {
    return {
      percent: 0,
      complete: false,
      missing: ['Contact details', 'Ride preferences', 'Vehicle details'],
    };
  }

  const items = [
    {
      complete: !isProfileNameIncomplete(user.fullName),
      label: 'Full name',
    },
    {
      complete: !isProfileEmailIncomplete(user.email),
      label: 'Email',
    },
    {
      complete: !isProfilePhoneIncomplete(user.phone),
      label: 'Mobile number',
    },
    {
      complete: Boolean(user.language),
      label: 'Language',
    },
    {
      complete: typeof user.notificationPreferences === 'boolean',
      label: 'Notification preference',
    },
    {
      complete: Boolean(user.vehicleDetails?.vehicleType?.trim()),
      label: 'Vehicle type',
    },
    {
      complete: Boolean(user.vehicleDetails?.vehicleNumber?.trim()),
      label: 'Vehicle number',
    },
  ];

  const completed = items.filter((item) => item.complete).length;
  const percent = Math.round((completed / items.length) * 100);

  return {
    percent,
    complete: percent === 100,
    missing: items.filter((item) => !item.complete).map((item) => item.label),
  };
};
