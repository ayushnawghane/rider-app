import { useState, useEffect } from 'react';
import { useHistory } from 'react-router';
import { useAuth } from '../../context/AuthContext';
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
  Gift
} from 'lucide-react';
import type { Reward, Achievement, UserStats } from '../../types';

const RewardsPage = () => {
  const { isAuthLoaded } = useAuth();
  const history = useHistory();
  
  const [activeTab, setActiveTab] = useState<'overview' | 'achievements' | 'history'>('overview');
  const [userStats] = useState<UserStats>({
    level: 12,
    points: 2450,
    ridesTaken: 15,
    ridesPublished: 8,
    rating: 4.9
  });
  const [pointsHistory, setPointsHistory] = useState<Reward[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  useEffect(() => {
    // Mock data for now
    setPointsHistory([
      { id: '1', userId: 'u1', points: 50, action: 'publish_ride', description: 'Published a ride from Mumbai to Pune', rideId: 'r1', createdAt: new Date(Date.now() - 86400000).toISOString() },
      { id: '2', userId: 'u1', points: 30, action: 'complete_ride', description: 'Completed ride with Rahul S', rideId: 'r2', createdAt: new Date(Date.now() - 172800000).toISOString() },
      { id: '3', userId: 'u1', points: 20, action: 'weekly_streak', description: 'First ride of the week bonus', createdAt: new Date(Date.now() - 259200000).toISOString() },
      { id: '4', userId: 'u1', points: 40, action: 'weekly_streak', description: '3 rides streak bonus', createdAt: new Date(Date.now() - 345600000).toISOString() },
      { id: '5', userId: 'u1', points: 10, action: 'five_star_rating', description: 'Received 5-star rating', createdAt: new Date(Date.now() - 432000000).toISOString() },
    ]);

    setAchievements([
      { id: '1', userId: 'u1', badgeId: 'early_bird', badgeName: 'Early Bird', badgeIcon: 'sun', badgeColor: '#F59E0B', description: 'Published ride before 7 AM', earnedAt: new Date(Date.now() - 604800000).toISOString() },
      { id: '2', userId: 'u1', badgeId: 'night_owl', badgeName: 'Night Owl', badgeIcon: 'moon', badgeColor: '#6366F1', description: 'Completed ride after 10 PM', earnedAt: new Date(Date.now() - 1209600000).toISOString() },
      { id: '3', userId: 'u1', badgeId: 'road_warrior', badgeName: 'Road Warrior', badgeIcon: 'car', badgeColor: '#10B981', description: 'Completed 50 rides', earnedAt: new Date(Date.now() - 1814400000).toISOString() },
    ]);
  }, []);

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

  const getNextLevelPoints = (level: number) => {
    return level * 200;
  };

  const getCurrentLevelProgress = () => {
    const pointsForNextLevel = getNextLevelPoints(userStats.level);
    const pointsForCurrentLevel = getNextLevelPoints(userStats.level - 1);
    const pointsInCurrentLevel = userStats.points - pointsForCurrentLevel;
    const pointsNeeded = pointsForNextLevel - pointsForCurrentLevel;
    return Math.min(100, Math.round((pointsInCurrentLevel / pointsNeeded) * 100));
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'publish_ride': return <Car className="w-5 h-5" />;
      case 'complete_ride': return <Users className="w-5 h-5" />;
      case 'weekly_streak': return <Zap className="w-5 h-5" />;
      case 'referral': return <Gift className="w-5 h-5" />;
      case 'five_star_rating': return <Star className="w-5 h-5" />;
      default: return <Award className="w-5 h-5" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'publish_ride': return 'bg-blue-100 text-blue-600';
      case 'complete_ride': return 'bg-green-100 text-green-600';
      case 'weekly_streak': return 'bg-yellow-100 text-yellow-600';
      case 'referral': return 'bg-purple-100 text-purple-600';
      case 'five_star_rating': return 'bg-orange-100 text-orange-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  if (!isAuthLoaded) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="h-screen overflow-y-auto bg-gray-50 pb-24" style={{ WebkitOverflowScrolling: 'touch' }}>
      {/* Header */}
      <div className={`bg-gradient-to-br ${getTierColor(userStats.level)} pt-12 pb-8 px-4`}>
        <div className="flex items-center gap-4 mb-6">
          <button 
            onClick={() => history.push('/')}
            className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-2xl font-bold text-white">Rewards</h1>
        </div>

        {/* Points Card */}
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

          {/* Level Progress */}
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
              {getNextLevelPoints(userStats.level) - userStats.points} points to Level {userStats.level + 1}
            </p>
          </div>

          {/* Tier Badge */}
          <div className="flex items-center gap-2">
            <div className={`px-4 py-2 rounded-full bg-gradient-to-r ${getTierColor(userStats.level)} border border-white/30`}>
              <span className="text-white font-bold text-sm">{getTierName(userStats.level)} Member</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
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

      {/* Tabs */}
      <div className="px-4 mb-4">
        <div className="flex bg-gray-100 rounded-xl p-1">
          {(['overview', 'achievements', 'history'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-600'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="px-4">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Ways to Earn */}
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
                    <p className="font-medium text-gray-900">Complete a Ride</p>
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

            {/* Current Tier Benefits */}
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
                    {achievement.badgeIcon === 'sun' && <Sun className="w-7 h-7" style={{ color: achievement.badgeColor }} />}
                    {achievement.badgeIcon === 'moon' && <Moon className="w-7 h-7" style={{ color: achievement.badgeColor }} />}
                    {achievement.badgeIcon === 'car' && <Car className="w-7 h-7" style={{ color: achievement.badgeColor }} />}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{achievement.badgeName}</h3>
                    <p className="text-sm text-gray-500">{achievement.description}</p>
                    <p className="text-xs text-gray-400 mt-1">Earned {formatDate(achievement.earnedAt)}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-primary-600 font-bold">+50 pts</span>
                  </div>
                </div>
              </div>
            ))}

            {/* Locked Achievements */}
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
