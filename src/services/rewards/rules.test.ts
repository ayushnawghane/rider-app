import { describe, expect, it } from 'vitest';
import {
  getAwardableRideRewardPoints,
  getRewardMonthWindow,
  MONTHLY_REWARD_POINTS_CAP,
  RIDE_REWARD_POINTS,
} from './rules';

describe('reward rules', () => {
  it('computes UTC calendar month windows', () => {
    expect(getRewardMonthWindow(new Date('2026-06-22T10:30:00.000Z'))).toEqual({
      startIso: '2026-06-01T00:00:00.000Z',
      endIso: '2026-07-01T00:00:00.000Z',
    });
  });

  it('awards 50 points until the monthly 100-point cap is reached', () => {
    expect(RIDE_REWARD_POINTS).toBe(50);
    expect(MONTHLY_REWARD_POINTS_CAP).toBe(100);
    expect(getAwardableRideRewardPoints(0)).toBe(50);
    expect(getAwardableRideRewardPoints(50)).toBe(50);
    expect(getAwardableRideRewardPoints(75)).toBe(25);
    expect(getAwardableRideRewardPoints(100)).toBe(0);
    expect(getAwardableRideRewardPoints(150)).toBe(0);
  });
});
