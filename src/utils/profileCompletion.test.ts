import {
  isProfileEmailIncomplete,
  getProfileCompletion,
  hasRequiredBookingProfile,
  hasRequiredPublishingProfile,
  isProfileIncomplete,
  isProfileNameIncomplete,
  isProfilePhoneIncomplete,
} from './profileCompletion';
import type { User } from '../types';

const completeUser: User = {
  id: 'user-1',
  email: 'rider@example.com',
  fullName: 'Mann Jadwani',
  firstName: 'Mann',
  lastName: 'Jadwani',
  phone: '+919730156154',
  kycStatus: 'pending',
  language: 'en',
  notificationPreferences: true,
  isBlocked: false,
  role: 'rider',
  totalPoints: 0,
  level: 1,
  ridesTaken: 0,
  ridesPublished: 0,
  createdAt: '2026-05-08T00:00:00.000Z',
  updatedAt: '2026-05-08T00:00:00.000Z',
};

describe('profile completion checks', () => {
  it('accepts a real rider profile', () => {
    expect(isProfileIncomplete(completeUser)).toBe(false);
  });

  it('rejects generic, empty, phone-derived, and email-shaped names', () => {
    expect(isProfileNameIncomplete('')).toBe(true);
    expect(isProfileNameIncomplete('Rider')).toBe(true);
    expect(isProfileNameIncomplete('phone-user-123')).toBe(true);
    expect(isProfileNameIncomplete('user@example.com')).toBe(true);
    expect(isProfileNameIncomplete('Aarav Mehta')).toBe(false);
  });

  it('rejects placeholder OTP and phone fallback emails', () => {
    expect(isProfileEmailIncomplete('')).toBe(true);
    expect(isProfileEmailIncomplete('phone-user-1@riderapp.local')).toBe(true);
    expect(isProfileEmailIncomplete('user-abc@otp.riderapp.local')).toBe(true);
    expect(isProfileEmailIncomplete('rider@example.com')).toBe(false);
  });

  it('rejects temporary phone placeholders', () => {
    expect(isProfilePhoneIncomplete('')).toBe(true);
    expect(isProfilePhoneIncomplete('temp_123')).toBe(true);
    expect(isProfilePhoneIncomplete('phone-user-123')).toBe(true);
    expect(isProfilePhoneIncomplete('+919730156154')).toBe(false);
  });

  it('marks the full profile incomplete when any required field is placeholder-like', () => {
    expect(isProfileIncomplete({ ...completeUser, fullName: 'User' })).toBe(true);
    expect(isProfileIncomplete({ ...completeUser, email: 'phone-user-1@riderapp.local' })).toBe(true);
    expect(isProfileIncomplete({ ...completeUser, phone: 'phone-user-1' })).toBe(true);
  });

  it('allows booking with contact details but requires vehicle details for publishing', () => {
    expect(hasRequiredBookingProfile(completeUser)).toBe(true);
    expect(hasRequiredPublishingProfile(completeUser)).toBe(false);
    expect(hasRequiredPublishingProfile({
      ...completeUser,
      vehicleDetails: {
        vehicleType: 'Sedan',
        vehicleNumber: 'MH01AB1234',
      },
    })).toBe(true);
  });

  it('calculates profile completion percentage from contact, preferences, and vehicle details', () => {
    expect(getProfileCompletion(completeUser)).toMatchObject({
      percent: 71,
      complete: false,
      missing: ['Vehicle type', 'Vehicle number'],
    });
    expect(getProfileCompletion({
      ...completeUser,
      vehicleDetails: {
        vehicleType: 'Sedan',
        vehicleNumber: 'MH01AB1234',
      },
    })).toMatchObject({
      percent: 100,
      complete: true,
      missing: [],
    });
  });
});
