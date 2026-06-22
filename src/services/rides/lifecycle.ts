import type { Ride } from '../../types';

export const DEFAULT_RIDE_DURATION_MINUTES = 60;

export const getTimeAdjustedRideStatus = (
  ride: Pick<Ride, 'status' | 'date' | 'duration'>,
  now = new Date(),
): Ride['status'] => {
  if (ride.status === 'completed' || ride.status === 'cancelled') {
    return ride.status;
  }

  const startTime = new Date(ride.date);
  if (Number.isNaN(startTime.getTime())) {
    return ride.status;
  }

  const durationMinutes =
    typeof ride.duration === 'number' && ride.duration > 0
      ? ride.duration
      : DEFAULT_RIDE_DURATION_MINUTES;
  const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

  if (ride.status === 'active' && now >= endTime) {
    return 'completed';
  }

  if (ride.status === 'pending') {
    if (now >= endTime) {
      return 'completed';
    }
    if (now >= startTime) {
      return 'active';
    }
  }

  return ride.status;
};
