export const RIDE_REWARD_POINTS = 50;
export const MONTHLY_REWARD_POINTS_CAP = 100;

export type RideRewardAction = 'publish_ride' | 'join_ride' | 'complete_ride';

export const getRewardMonthWindow = (date = new Date()) => {
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1, 0, 0, 0, 0));
  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  };
};

export const getAwardableRideRewardPoints = (monthlyPoints: number) => {
  const remaining = Math.max(0, MONTHLY_REWARD_POINTS_CAP - Math.max(0, monthlyPoints));
  return Math.min(RIDE_REWARD_POINTS, remaining);
};
