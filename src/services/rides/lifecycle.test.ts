import { describe, expect, it } from 'vitest';
import { getTimeAdjustedRideStatus } from './lifecycle';

describe('ride lifecycle rules', () => {
  it('keeps future pending rides awaiting departure', () => {
    expect(getTimeAdjustedRideStatus(
      { status: 'pending', date: '2026-06-22T10:00:00.000Z', duration: 60 },
      new Date('2026-06-22T09:59:59.000Z'),
    )).toBe('pending');
  });

  it('activates pending rides at the departure timestamp', () => {
    expect(getTimeAdjustedRideStatus(
      { status: 'pending', date: '2026-06-22T10:00:00.000Z', duration: 60 },
      new Date('2026-06-22T10:00:00.000Z'),
    )).toBe('active');
  });

  it('completes rides once the expected duration has elapsed', () => {
    expect(getTimeAdjustedRideStatus(
      { status: 'pending', date: '2026-06-22T10:00:00.000Z', duration: 60 },
      new Date('2026-06-22T11:00:00.000Z'),
    )).toBe('completed');
    expect(getTimeAdjustedRideStatus(
      { status: 'active', date: '2026-06-22T10:00:00.000Z', duration: 60 },
      new Date('2026-06-22T11:00:00.000Z'),
    )).toBe('completed');
  });

  it('does not reopen terminal states', () => {
    expect(getTimeAdjustedRideStatus(
      { status: 'cancelled', date: '2026-06-22T10:00:00.000Z', duration: 60 },
      new Date('2026-06-22T11:00:00.000Z'),
    )).toBe('cancelled');
  });
});
