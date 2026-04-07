import { useEffect, useState } from 'react';
import { useHistory } from 'react-router';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import {
  ArrowLeft,
  Award,
  Star,
  Trophy,
  Target,
  Zap,
  Moon,
  Sun,
  Car,
  Users,
  Gift,
} from 'lucide-react';
import type { Reward, Achievement, UserStats } from '../../types';

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
  const history = useHistory();

  const [activeTab, setActiveTab] = useState<'overview' | 'achievements' | 'history'>('overview');
  const [userStats, setUserStats] = useState<UserStats>(DEFAULT_STATS);
  const [pointsHistory, setPointsHistory] = useState<Reward[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loadingRewards, setLoadingRewards] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const handleBackToHome = () => {
    if (history.length > 1) {
      history.goBack();
      return;
    }
    history.replace('/home');
  };

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

        if (!isMounted) return;
        setPointsHistory(mappedRewards);
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

  const getTierColor = (level: number) => {
    if (level >= 31) return 'from-purple-500 to-purple-700';
    if (level >= 21) return 'from-yellow-400 to-yellow-600';
    if (level >= 11) return 'from-gray-300 to-gray-500';
    return 'from-amber-600 to-amber-800';
  };

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

  const getActionIcon = (action: RewardAction) => {
    switch (action) {
      case 'publish_ride':
        return <Car className="w-5 h-5" />;
      case 'join_ride':
      case 'complete_ride':
        return <Users className="w-5 h-5" />;
      case 'weekly_streak':
        return <Zap className="w-5 h-5" />;
      case 'referral':
        return <Gift className="w-5 h-5" />;
      case 'five_star_rating':
        return <Star className="w-5 h-5" />;
      default:
        return <Award className="w-5 h-5" />;
    }
  };

  const getActionColor = (action: RewardAction) => {
    switch (action) {
      case 'publish_ride':
        return 'bg-blue-100 text-blue-600';
      case 'join_ride':
      case 'complete_ride':
        return 'bg-green-100 text-green-600';
      case 'weekly_streak':
        return 'bg-yellow-100 text-yellow-600';
      case 'referral':
        return 'bg-purple-100 text-purple-600';
      case 'five_star_rating':
        return 'bg-orange-100 text-orange-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderAchievementIcon = (icon: string, color: string) => {
    if (icon === 'sun') return <Sun className="w-7 h-7" style={{ color }} />;
    if (icon === 'moon') return <Moon className="w-7 h-7" style={{ color }} />;
    if (icon === 'car') return <Car className="w-7 h-7" style={{ color }} />;
    if (icon === 'users') return <Users className="w-7 h-7" style={{ color }} />;
    if (icon === 'star') return <Star className="w-7 h-7" style={{ color }} />;
    return <Award className="w-7 h-7" style={{ color }} />;
  };

  if (!isAuthLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="app-scroll-screen app-bottom-nav-safe bg-gray-50">
      <div className={`bg-gradient-to-br ${getTierColor(userStats.level)} pt-12 pb-8 px-4`}>
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={handleBackToHome}
            className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-2xl font-bold text-white">Rewards</h1>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-white/80 text-sm mb-1">Total Points</p>
              <p className="text-4xl font-bold text-white">{userStats.points.toLocaleString()}</p>
            </div>
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
              <Trophy className="w-8 h-8 text-white" />
            </div>
          </div>

          <div className="mb-4">
            <div className="flex items-center justify-between text-white mb-2">
              <span className="text-sm font-medium">Level {userStats.level}</span>
              <span className="text-sm opacity-80">{getCurrentLevelProgress()}%</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{ width: `${getCurrentLevelProgress()}%` }}
              />
            </div>
            <p className="text-white/60 text-xs mt-2">
              {Math.max(0, getNextLevelPoints(userStats.level) - userStats.points)} points to Level{' '}
              {userStats.level + 1}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div
              className={`px-4 py-2 rounded-full bg-gradient-to-r ${getTierColor(
                userStats.level,
              )} border border-white/30`}
            >
              <span className="text-white font-bold text-sm">{getTierName(userStats.level)} Member</span>
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 -mt-4 mb-6">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl shadow-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Car className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-xs text-gray-500">Rides Published</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{userStats.ridesPublished}</p>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Users className="w-4 h-4 text-green-600" />
              </div>
              <span className="text-xs text-gray-500">Rides Taken</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{userStats.ridesTaken}</p>
          </div>
        </div>
      </div>

      {loadError && (
        <div className="px-4 mb-4">
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{loadError}</div>
        </div>
      )}

      {loadingRewards && (
        <div className="px-4 mb-4">
          <div className="rounded-xl border border-primary-100 bg-primary-50 p-3 text-sm text-primary-700">
            Refreshing rewards...
          </div>
        </div>
      )}

      <div className="px-4 mb-4">
        <div className="flex bg-gray-100 rounded-xl p-1">
          {(['overview', 'achievements', 'history'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-600'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow-lg p-5">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Ways to Earn</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Car className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Publish a Ride</p>
                    <p className="text-xs text-gray-500">Share your journey</p>
                  </div>
                  <span className="text-blue-600 font-bold">+50 pts</span>
                </div>
                <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Join a Ride</p>
                    <p className="text-xs text-gray-500">As a passenger</p>
                  </div>
                  <span className="text-green-600 font-bold">+30 pts</span>
                </div>
                <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Zap className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Weekly Streak</p>
                    <p className="text-xs text-gray-500">3+ rides in a week</p>
                  </div>
                  <span className="text-yellow-600 font-bold">+40 pts</span>
                </div>
                <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Gift className="w-5 h-5 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">Refer a Friend</p>
                    <p className="text-xs text-gray-500">They join and ride</p>
                  </div>
                  <span className="text-purple-600 font-bold">+100 pts</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-lg p-5">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">{getTierName(userStats.level)} Benefits</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <Target className="w-3 h-3 text-green-600" />
                  </div>
                  <span className="text-gray-700">Priority matching with top-rated drivers</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                    <Target className="w-3 h-3 text-green-600" />
                  </div>
                  <span className="text-gray-700">Featured listing when publishing rides</span>
                </div>
                {userStats.level >= 11 && (
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                      <Target className="w-3 h-3 text-green-600" />
                    </div>
                    <span className="text-gray-700">5% discount on all rides</span>
                  </div>
                )}
                {userStats.level >= 21 && (
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                      <Target className="w-3 h-3 text-green-600" />
                    </div>
                    <span className="text-gray-700">Exclusive Gold member support</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'achievements' && (
          <div className="space-y-4">
            {achievements.map((achievement) => (
              <div key={achievement.id} className="bg-white rounded-2xl shadow-lg p-5">
                <div className="flex items-center gap-4">
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center"
                    style={{ backgroundColor: `${achievement.badgeColor}20` }}
                  >
                    {renderAchievementIcon(achievement.badgeIcon, achievement.badgeColor)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{achievement.badgeName}</h3>
                    <p className="text-sm text-gray-500">{achievement.description}</p>
                    <p className="text-xs text-gray-400 mt-1">Earned {formatDate(achievement.earnedAt)}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-primary-600 font-bold">Unlocked</span>
                  </div>
                </div>
              </div>
            ))}

            <div className="bg-gray-100 rounded-2xl p-5 opacity-60">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gray-200 rounded-2xl flex items-center justify-center">
                  <Star className="w-7 h-7 text-gray-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-700">Community Champion</h3>
                  <p className="text-sm text-gray-500">Publish 25 rides</p>
                </div>
                <div className="text-right">
                  <span className="text-gray-500 font-medium">{userStats.ridesPublished}/25</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-3">
            {pointsHistory.length === 0 && (
              <div className="bg-white rounded-xl shadow-lg p-5 text-center text-sm text-gray-500">
                No reward points yet. Publish or join a ride to start earning.
              </div>
            )}
            {pointsHistory.map((entry) => (
              <div key={entry.id} className="bg-white rounded-xl shadow-lg p-4">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getActionColor(entry.action)}`}>
                    {getActionIcon(entry.action)}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{entry.description}</p>
                    <p className="text-xs text-gray-500">{formatDate(entry.createdAt)}</p>
                  </div>
                  <span className="text-green-600 font-bold">+{entry.points}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RewardsPage;
