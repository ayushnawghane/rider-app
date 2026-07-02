import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { Trophy, Check } from 'lucide-react';
import type { Reward, Achievement, UserStats } from '../../types';
import { PageLoader } from '../../components/ui';
import AppIcon, { type AppIconName } from '../../components/icons/AppIcon';
import { MONTHLY_REWARD_POINTS_CAP, getRewardMonthWindow } from '../../services/rewards/rules';

const FIRE = 'linear-gradient(100deg, var(--fire-red), var(--fire-amber))';

// Ride rewards (publish / join / complete) are the ones subject to the monthly cap.
const CAPPED_ACTIONS = ['publish_ride', 'join_ride', 'complete_ride'];

type RewardAction = Reward['action'];

interface RewardRow {
  id: string;
  user_id: string;
  points: number;
  action: string;
  description: string;
  ride_id: string | null;
  created_at: string;
}

const REWARD_ACTIONS: RewardAction[] = [
  'publish_ride',
  'join_ride',
  'complete_ride',
  'weekly_streak',
  'referral',
  'five_star_rating',
];

const DEFAULT_STATS: UserStats = {
  level: 1,
  points: 0,
  ridesTaken: 0,
  ridesPublished: 0,
  rating: 0,
};

const REWARDS_FETCH_TIMEOUT_MS = 10000;

const withTimeout = async <T,>(operation: Promise<T>, timeoutMs: number, timeoutMessage: string) => {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);
  });

  try {
    return await Promise.race([operation, timeoutPromise]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
};

const getLevelFromPoints = (points: number) => Math.max(1, Math.floor(points / 200) + 1);

const toRewardAction = (value: string): RewardAction =>
  REWARD_ACTIONS.includes(value as RewardAction) ? (value as RewardAction) : 'publish_ride';

const buildAchievements = (
  userId: string,
  rewardHistory: Reward[],
  ridesPublished: number,
  ridesTaken: number,
): Achievement[] => {
  const achievements: Achievement[] = [];
  const oldestFirstHistory = [...rewardHistory].reverse();

  const firstPublishedRide = oldestFirstHistory.find((reward) => reward.action === 'publish_ride');
  if (firstPublishedRide) {
    achievements.push({
      id: `first-publish-${userId}`,
      userId,
      badgeId: 'first_publisher',
      badgeName: 'First Publisher',
      badgeIcon: 'car',
      badgeColor: '#2563EB',
      description: 'Published your first ride',
      earnedAt: firstPublishedRide.createdAt,
    });
  }

  const firstJoinedRide = oldestFirstHistory.find((reward) => reward.action === 'join_ride');
  if (firstJoinedRide) {
    achievements.push({
      id: `first-join-${userId}`,
      userId,
      badgeId: 'first_joiner',
      badgeName: 'First Join',
      badgeIcon: 'users',
      badgeColor: '#16A34A',
      description: 'Joined your first ride',
      earnedAt: firstJoinedRide.createdAt,
    });
  }

  if (ridesPublished >= 25) {
    achievements.push({
      id: `community-champion-${userId}`,
      userId,
      badgeId: 'community_champion',
      badgeName: 'Community Champion',
      badgeIcon: 'star',
      badgeColor: '#F59E0B',
      description: 'Published 25 rides',
      earnedAt: new Date().toISOString(),
    });
  }

  if (ridesTaken >= 10) {
    achievements.push({
      id: `frequent-rider-${userId}`,
      userId,
      badgeId: 'frequent_rider',
      badgeName: 'Frequent Rider',
      badgeIcon: 'moon',
      badgeColor: '#4F46E5',
      description: 'Joined 10 rides',
      earnedAt: new Date().toISOString(),
    });
  }

  return achievements;
};

const formatRewardsLoadError = (message: string) => {
  if (
    /relation .*rewards/i.test(message) ||
    /relation .*ride_participants/i.test(message) ||
    /does not exist/i.test(message)
  ) {
    return 'Rewards tables are not set up yet. Run the SQL from supabase/rewards_schema.sql.';
  }
  return message;
};

const RewardsPage = () => {
  const { user, isAuthLoaded } = useAuth();

  const [activeTab, setActiveTab] = useState<'overview' | 'achievements' | 'history'>('overview');
  const [userStats, setUserStats] = useState<UserStats>(DEFAULT_STATS);
  const [pointsHistory, setPointsHistory] = useState<Reward[]>([]);
  const [monthlyPoints, setMonthlyPoints] = useState(0);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loadingRewards, setLoadingRewards] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthLoaded) return;

    if (!user) {
      setLoadingRewards(false);
      return;
    }

    let isMounted = true;

    const loadRewardsData = async () => {
      setLoadingRewards(true);
      setLoadError(null);

      try {
        const [rewardsQuery, ridesPublishedQuery, ridesTakenQuery] = await withTimeout(
          Promise.all([
            supabase
              .from('rewards')
              .select('id, user_id, points, action, description, ride_id, created_at')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false }),
            supabase.from('rides').select('id').eq('user_id', user.id),
            supabase
              .from('ride_participants')
              .select('id')
              .eq('user_id', user.id)
              .eq('status', 'joined'),
          ]),
          REWARDS_FETCH_TIMEOUT_MS,
          'Rewards request timed out. Please try again.',
        );

        if (rewardsQuery.error) throw rewardsQuery.error;
        if (ridesPublishedQuery.error) throw ridesPublishedQuery.error;
        if (ridesTakenQuery.error) throw ridesTakenQuery.error;

        const rewardRows = (rewardsQuery.data || []) as RewardRow[];
        const mappedRewards: Reward[] = rewardRows.map((row) => ({
          id: row.id,
          userId: row.user_id,
          points: row.points,
          action: toRewardAction(row.action),
          description: row.description,
          rideId: row.ride_id || undefined,
          createdAt: row.created_at,
        }));

        const totalPoints = mappedRewards.reduce((sum, reward) => sum + reward.points, 0);
        const ridesPublished = ridesPublishedQuery.data?.length || 0;
        const ridesTaken = ridesTakenQuery.data?.length || 0;
        const stats: UserStats = {
          level: getLevelFromPoints(totalPoints),
          points: totalPoints,
          ridesTaken,
          ridesPublished,
          rating: 0,
        };

        // Points earned this month from ride activity (subject to the cap).
        const { startIso, endIso } = getRewardMonthWindow();
        const monthly = mappedRewards
          .filter((r) => CAPPED_ACTIONS.includes(r.action) && r.createdAt >= startIso && r.createdAt < endIso)
          .reduce((sum, r) => sum + r.points, 0);

        if (!isMounted) return;
        setPointsHistory(mappedRewards);
        setMonthlyPoints(Math.min(monthly, MONTHLY_REWARD_POINTS_CAP));
        setUserStats(stats);
        setAchievements(buildAchievements(user.id, mappedRewards, ridesPublished, ridesTaken));
      } catch (error) {
        if (!isMounted) return;
        const message = error instanceof Error ? error.message : 'Failed to load rewards';
        setLoadError(formatRewardsLoadError(message));
      } finally {
        if (isMounted) {
          setLoadingRewards(false);
        }
      }
    };

    void loadRewardsData();

    return () => {
      isMounted = false;
    };
  }, [isAuthLoaded, user]);

  const getTierName = (level: number) => {
    if (level >= 31) return 'Platinum';
    if (level >= 21) return 'Gold';
    if (level >= 11) return 'Silver';
    return 'Bronze';
  };

  const getNextLevelPoints = (level: number) => level * 200;

  const getCurrentLevelProgress = () => {
    const pointsForNextLevel = getNextLevelPoints(userStats.level);
    const pointsForCurrentLevel = getNextLevelPoints(userStats.level - 1);
    const pointsInCurrentLevel = userStats.points - pointsForCurrentLevel;
    const pointsNeeded = pointsForNextLevel - pointsForCurrentLevel;
    if (pointsNeeded <= 0) return 0;
    return Math.max(0, Math.min(100, Math.round((pointsInCurrentLevel / pointsNeeded) * 100)));
  };

  const getActionIconName = (action: RewardAction): AppIconName => {
    switch (action) {
      case 'publish_ride':
        return 'car';
      case 'join_ride':
      case 'complete_ride':
        return 'users';
      case 'weekly_streak':
        return 'zap';
      case 'referral':
      case 'five_star_rating':
        return 'star';
      default:
        return 'award';
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const achievementIconName = (icon: string): AppIconName => {
    if (icon === 'car') return 'car';
    if (icon === 'users') return 'users';
    if (icon === 'star') return 'star';
    return 'award';
  };

  if (!isAuthLoaded) {
    return <PageLoader />;
  }

  const tierName = getTierName(userStats.level);
  const progress = getCurrentLevelProgress();
  const pointsToNext = Math.max(0, getNextLevelPoints(userStats.level) - userStats.points);

  const waysToEarn: { name: AppIconName; title: string; subtitle: string; pts: number }[] = [
    { name: 'car', title: 'Publish a ride', subtitle: 'Share your journey', pts: 50 },
    { name: 'users', title: 'Join a ride', subtitle: 'As a passenger', pts: 50 },
    { name: 'zap', title: 'Weekly streak', subtitle: '3+ rides in a week', pts: 40 },
    { name: 'star', title: 'Refer a friend', subtitle: 'They join and ride', pts: 100 },
  ];

  const benefits = [
    'Priority matching with top-rated drivers',
    'Featured listing when publishing rides',
    ...(userStats.level >= 11 ? ['5% discount on all rides'] : []),
    ...(userStats.level >= 21 ? ['Exclusive Gold member support'] : []),
  ];

  return (
    <div className="app-scroll-screen app-bottom-nav-safe relative overflow-hidden bg-white">
      {/* Grainy orange aura, right-weighted */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[420px]">
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(120% 70% at 80% -10%, rgba(255,107,0,0.46) 0%, rgba(255,160,30,0.18) 46%, rgba(255,255,255,0) 74%)' }}
        />
        <div className="absolute -right-16 -top-12 h-72 w-72 rounded-full animate-aurora-1" style={{ background: 'radial-gradient(circle, rgba(255,200,50,0.72) 0%, transparent 62%)', filter: 'blur(48px)' }} />
        <div className="absolute -left-20 top-10 h-56 w-56 rounded-full animate-aurora-2" style={{ background: 'radial-gradient(circle, rgba(255,140,0,0.3) 0%, transparent 62%)', filter: 'blur(50px)' }} />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <div className="px-5 pb-3 pt-[calc(env(safe-area-inset-top)+20px)]">
          <p className="mb-1 font-display text-xs font-bold uppercase tracking-[0.2em] text-fire-orange">Your rewards</p>
          <h1 className="font-display text-[2.6rem] font-extrabold leading-[0.9] tracking-tight text-ink">Rewards</h1>
        </div>

        <div className="px-4">
          {/* Hero points card */}
          <div className="grain grain-strong relative overflow-hidden rounded-[20px] p-4 text-white shadow-glow-lg" style={{ background: FIRE }}>
            <div className="relative z-10">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-display text-xs font-bold uppercase tracking-[0.2em] text-white/80">Total points</p>
                  <p className="mt-1 font-display text-6xl font-extrabold leading-none">{userStats.points.toLocaleString()}</p>
                </div>
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white/20 backdrop-blur-sm">
                  <Trophy className="h-8 w-8 text-white" strokeWidth={2.5} />
                </div>
              </div>

              <div className="mt-6">
                <div className="mb-2 flex items-center justify-between font-display text-sm font-bold">
                  <span>Level {userStats.level}</span>
                  <span className="text-white/80">{progress}%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-white/25">
                  <div className="h-full rounded-full bg-white transition-all duration-500" style={{ width: `${progress}%` }} />
                </div>
                <p className="mt-2 text-xs font-medium text-white/75">
                  {pointsToNext} points to Level {userStats.level + 1}
                </p>
              </div>

              <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 backdrop-blur-sm">
                <span className="font-display text-sm font-extrabold uppercase tracking-wide">{tierName} Member</span>
              </div>
            </div>
          </div>

          {/* Monthly reward cap */}
          <div className="mt-4 rounded-[16px] border border-black/5 bg-white p-4 shadow-soft">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-display text-sm font-extrabold tracking-tight text-ink">This month</p>
              <p className="font-display text-sm font-bold text-ink/55">
                {monthlyPoints}/{MONTHLY_REWARD_POINTS_CAP} pts
              </p>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-primary-50">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.round((monthlyPoints / MONTHLY_REWARD_POINTS_CAP) * 100))}%`, background: FIRE }}
              />
            </div>
            <p className="mt-2 text-xs font-medium text-ink/50">
              {monthlyPoints >= MONTHLY_REWARD_POINTS_CAP
                ? "You've hit this month's reward cap. It resets on the 1st."
                : `You can earn ${MONTHLY_REWARD_POINTS_CAP - monthlyPoints} more reward points from rides this month.`}
            </p>
          </div>

          {/* Stats */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-[16px] border border-black/5 bg-white p-4 shadow-soft">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-primary-100 bg-gradient-to-br from-primary-50 to-white">
                <AppIcon name="car" className="h-6 w-6" />
              </div>
              <p className="font-display text-3xl font-extrabold leading-none text-ink">{userStats.ridesPublished}</p>
              <p className="mt-1 font-display text-[11px] font-bold uppercase tracking-wide text-ink/45">Rides published</p>
            </div>
            <div className="rounded-[16px] border border-black/5 bg-white p-4 shadow-soft">
              <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-2xl border border-primary-100 bg-gradient-to-br from-primary-50 to-white">
                <AppIcon name="users" className="h-6 w-6" />
              </div>
              <p className="font-display text-3xl font-extrabold leading-none text-ink">{userStats.ridesTaken}</p>
              <p className="mt-1 font-display text-[11px] font-bold uppercase tracking-wide text-ink/45">Rides taken</p>
            </div>
          </div>

          {loadError && (
            <div className="mt-4 rounded-2xl border border-fire-red/20 bg-fire-red/5 p-3 text-sm font-medium text-fire-red">
              {loadError}
            </div>
          )}

          {loadingRewards && (
            <div className="mt-4 rounded-2xl border border-primary-100 bg-primary-50 p-3 text-sm font-medium text-primary-700">
              Refreshing rewards...
            </div>
          )}

          {/* Tabs */}
          <div className="mt-5 grid grid-cols-3 gap-1 rounded-[20px] border border-black/5 bg-white/80 p-1.5 shadow-soft backdrop-blur-md">
            {(['overview', 'achievements', 'history'] as const).map((tab) => {
              const isActive = activeTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`${isActive ? 'grain grain-strong text-white shadow-glow' : 'text-ink/45 hover:text-ink/70'} relative overflow-hidden rounded-2xl py-2.5 font-display text-sm font-bold transition-all active:scale-95`}
                  style={isActive ? { background: FIRE } : undefined}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              );
            })}
          </div>

          <div className="mt-5">
            {activeTab === 'overview' && (
              <div className="space-y-4">
                <div className="rounded-[18px] border border-black/5 bg-white p-5 shadow-soft">
                  <h2 className="mb-4 font-display text-xl font-extrabold tracking-tight text-ink">Ways to earn</h2>
                  <div className="space-y-3">
                    {waysToEarn.map((way) => (
                      <div key={way.title} className="flex items-center gap-3 rounded-2xl border border-black/5 bg-paper p-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary-100 bg-white">
                          <AppIcon name={way.name} className="h-6 w-6" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-display font-bold text-ink">{way.title}</p>
                          <p className="text-xs text-ink/50">{way.subtitle}</p>
                        </div>
                        <span className="shrink-0 rounded-full px-3 py-1 font-display text-sm font-extrabold text-white shadow-glow" style={{ background: FIRE }}>
                          +{way.pts}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-xs font-medium text-ink/45">
                    Ride rewards are capped at {MONTHLY_REWARD_POINTS_CAP} points per month.
                  </p>
                </div>

                <div className="rounded-[18px] border border-black/5 bg-white p-5 shadow-soft">
                  <h2 className="mb-4 font-display text-xl font-extrabold tracking-tight text-ink">{tierName} benefits</h2>
                  <div className="space-y-3">
                    {benefits.map((benefit) => (
                      <div key={benefit} className="flex items-center gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white" style={{ background: FIRE }}>
                          <Check className="h-3.5 w-3.5" strokeWidth={3} />
                        </div>
                        <span className="text-sm font-medium text-ink/75">{benefit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'achievements' && (
              <div className="space-y-4">
                {achievements.map((achievement) => (
                  <div key={achievement.id} className="rounded-[18px] border border-black/5 bg-white p-5 shadow-soft">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-primary-100 bg-gradient-to-br from-primary-50 to-white">
                        <AppIcon name={achievementIconName(achievement.badgeIcon)} className="h-8 w-8" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-display font-bold text-ink">{achievement.badgeName}</h3>
                        <p className="text-sm text-ink/55">{achievement.description}</p>
                        <p className="mt-1 text-xs text-ink/35">Earned {formatDate(achievement.earnedAt)}</p>
                      </div>
                      <span className="shrink-0 rounded-full bg-fire-gold px-3 py-1 font-display text-xs font-extrabold text-ink shadow-gold-glow">
                        Unlocked
                      </span>
                    </div>
                  </div>
                ))}

                <div className="rounded-[18px] border border-black/5 bg-paper p-5 opacity-70">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-black/5 bg-white grayscale">
                      <AppIcon name="star" className="h-8 w-8" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display font-bold text-ink/70">Community Champion</h3>
                      <p className="text-sm text-ink/45">Publish 25 rides</p>
                    </div>
                    <span className="shrink-0 font-display text-sm font-bold text-ink/45">{userStats.ridesPublished}/25</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'history' && (
              <div className="space-y-3">
                {pointsHistory.length === 0 && (
                  <div className="rounded-[16px] border border-black/5 bg-white p-4 text-center shadow-soft">
                    <p className="text-sm font-medium text-ink/55">No reward points yet. Publish or join a ride to start earning.</p>
                  </div>
                )}
                {pointsHistory.map((entry) => (
                  <div key={entry.id} className="rounded-[14px] border border-black/5 bg-white p-4 shadow-soft">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-primary-100 bg-gradient-to-br from-primary-50 to-white">
                        <AppIcon name={getActionIconName(entry.action)} className="h-6 w-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-display font-bold text-ink">{entry.description}</p>
                        <p className="text-xs text-ink/45">{formatDate(entry.createdAt)}</p>
                      </div>
                      <span className="shrink-0 font-display text-base font-extrabold text-fire-orange">+{entry.points}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="h-6" />
        </div>
      </div>
    </div>
  );
};

export default RewardsPage;
