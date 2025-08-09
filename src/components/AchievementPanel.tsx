import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, 
  Star, 
  Lock, 
  CheckCircle, 
  Progress, 
  Filter,
  Search,
  Calendar,
  Users,
  Zap,
  Award,
  Crown,
  Medal,
  Gift,
  Target,
  Clock,
  TrendingUp,
  Flame,
  Sparkles
} from 'lucide-react';
import { Achievement, AchievementProgress, UserAchievement } from '../../lib/achievement-system-v3';

interface AchievementPanelProps {
  playerAddress: string;
  isVisible: boolean;
  onClose: () => void;
}

interface AchievementWithProgress extends Achievement {
  progress?: AchievementProgress;
  userAchievement?: UserAchievement;
  isUnlocked: boolean;
}

const AchievementPanel: React.FC<AchievementPanelProps> = ({
  playerAddress,
  isVisible,
  onClose
}) => {
  const [achievements, setAchievements] = useState<AchievementWithProgress[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedRarity, setSelectedRarity] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'progress' | 'tier' | 'recent' | 'alphabetical'>('progress');
  const [showUnlockedOnly, setShowUnlockedOnly] = useState(false);

  // 获取成就数据
  const fetchAchievements = async () => {
    if (!playerAddress) return;
    
    setLoading(true);
    try {
      const [achievementsRes, progressRes, userAchievementsRes] = await Promise.all([
        fetch('/api/achievements/list'),
        fetch(`/api/achievements/progress?address=${playerAddress}`),
        fetch(`/api/achievements/user?address=${playerAddress}`)
      ]);

      if (achievementsRes.ok && progressRes.ok && userAchievementsRes.ok) {
        const achievementsData = await achievementsRes.json();
        const progressData = await progressRes.json();
        const userAchievementsData = await userAchievementsRes.json();

        // 合并数据
        const progressMap = new Map(progressData.progress?.map((p: AchievementProgress) => [p.achievementId, p]));
        const userAchievementsMap = new Map(userAchievementsData.achievements?.map((ua: UserAchievement) => [ua.achievementId, ua]));

        const combinedAchievements: AchievementWithProgress[] = achievementsData.achievements?.map((achievement: Achievement) => ({
          ...achievement,
          progress: progressMap.get(achievement.id),
          userAchievement: userAchievementsMap.get(achievement.id),
          isUnlocked: userAchievementsMap.has(achievement.id)
        })) || [];

        setAchievements(combinedAchievements);
      }
    } catch (error) {
      console.error('Failed to fetch achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isVisible && playerAddress) {
      fetchAchievements();
    }
  }, [isVisible, playerAddress]);

  // 过滤和排序成就
  const filteredAndSortedAchievements = useMemo(() => {
    let filtered = achievements.filter(achievement => {
      // 搜索过滤
      if (searchTerm && !achievement.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
          !achievement.description.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }

      // 类别过滤
      if (selectedCategory !== 'all' && achievement.category !== selectedCategory) {
        return false;
      }

      // 稀有度过滤
      if (selectedRarity !== 'all' && achievement.rarity !== selectedRarity) {
        return false;
      }

      // 是否只显示已解锁
      if (showUnlockedOnly && !achievement.isUnlocked) {
        return false;
      }

      return true;
    });

    // 排序
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'progress':
          const progressA = a.progress?.progress || (a.isUnlocked ? 1 : 0);
          const progressB = b.progress?.progress || (b.isUnlocked ? 1 : 0);
          return progressB - progressA;
        
        case 'tier':
          return b.tier - a.tier;
        
        case 'recent':
          const timeA = a.userAchievement?.unlockedAt || 0;
          const timeB = b.userAchievement?.unlockedAt || 0;
          return timeB - timeA;
        
        case 'alphabetical':
          return a.name.localeCompare(b.name);
        
        default:
          return 0;
      }
    });

    return filtered;
  }, [achievements, searchTerm, selectedCategory, selectedRarity, sortBy, showUnlockedOnly]);

  // 成就统计
  const achievementStats = useMemo(() => {
    const total = achievements.length;
    const unlocked = achievements.filter(a => a.isUnlocked).length;
    const inProgress = achievements.filter(a => a.progress && a.progress.progress > 0 && a.progress.progress < 1).length;
    
    const byRarity = achievements.reduce((acc, achievement) => {
      acc[achievement.rarity] = (acc[achievement.rarity] || 0) + (achievement.isUnlocked ? 1 : 0);
      return acc;
    }, {} as Record<string, number>);

    return { total, unlocked, inProgress, byRarity };
  }, [achievements]);

  // 图标映射
  const categoryIcons = {
    gameplay: Target,
    progression: TrendingUp,
    social: Users,
    seasonal: Calendar,
    special: Sparkles
  };

  const rarityColors = {
    common: 'text-gray-400 border-gray-500',
    rare: 'text-blue-400 border-blue-500',
    epic: 'text-purple-400 border-purple-500',
    legendary: 'text-yellow-400 border-yellow-500',
    mythic: 'text-pink-400 border-pink-500'
  };

  const rarityGradients = {
    common: 'from-gray-500 to-gray-700',
    rare: 'from-blue-500 to-blue-700',
    epic: 'from-purple-500 to-purple-700',
    legendary: 'from-yellow-500 to-orange-600',
    mythic: 'from-pink-500 to-purple-600'
  };

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-slate-900 rounded-2xl w-full max-w-6xl h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="bg-gradient-to-r from-indigo-900 to-purple-900 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">成就系统</h2>
                <p className="text-indigo-200">追踪你的游戏里程碑</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-red-400 transition-colors"
            >
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 统计信息 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-white">{achievementStats.unlocked}</div>
              <div className="text-sm text-indigo-200">已解锁</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-white">{achievementStats.total}</div>
              <div className="text-sm text-indigo-200">总计</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-white">{achievementStats.inProgress}</div>
              <div className="text-sm text-indigo-200">进行中</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-white">
                {Math.round((achievementStats.unlocked / achievementStats.total) * 100)}%
              </div>
              <div className="text-sm text-indigo-200">完成度</div>
            </div>
          </div>

          {/* 搜索和过滤 */}
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="搜索成就..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">所有类别</option>
              <option value="gameplay">游戏表现</option>
              <option value="progression">成长进步</option>
              <option value="social">社交互动</option>
              <option value="seasonal">季节活动</option>
              <option value="special">特殊成就</option>
            </select>

            <select
              value={selectedRarity}
              onChange={(e) => setSelectedRarity(e.target.value)}
              className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">所有稀有度</option>
              <option value="common">常见</option>
              <option value="rare">稀有</option>
              <option value="epic">史诗</option>
              <option value="legendary">传说</option>
              <option value="mythic">神话</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="progress">按进度</option>
              <option value="tier">按等级</option>
              <option value="recent">按时间</option>
              <option value="alphabetical">按名称</option>
            </select>

            <label className="flex items-center space-x-2 text-white">
              <input
                type="checkbox"
                checked={showUnlockedOnly}
                onChange={(e) => setShowUnlockedOnly(e.target.checked)}
                className="rounded"
              />
              <span>仅显示已解锁</span>
            </label>
          </div>
        </div>

        {/* 成就列表 */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAndSortedAchievements.map((achievement, index) => (
                <AchievementCard
                  key={achievement.id}
                  achievement={achievement}
                  index={index}
                  categoryIcons={categoryIcons}
                  rarityColors={rarityColors}
                  rarityGradients={rarityGradients}
                />
              ))}
            </div>
          )}

          {!loading && filteredAndSortedAchievements.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
              <Trophy className="w-16 h-16 mb-4" />
              <p className="text-xl">未找到匹配的成就</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

// 成就卡片组件
const AchievementCard: React.FC<{
  achievement: AchievementWithProgress;
  index: number;
  categoryIcons: any;
  rarityColors: any;
  rarityGradients: any;
}> = ({ achievement, index, categoryIcons, rarityColors, rarityGradients }) => {
  const CategoryIcon = categoryIcons[achievement.category] || Target;
  const progress = achievement.progress?.progress || (achievement.isUnlocked ? 1 : 0);
  const progressPercent = Math.round(progress * 100);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`relative bg-slate-800 rounded-xl p-6 border-2 transition-all duration-300 hover:transform hover:scale-105 ${
        achievement.isUnlocked 
          ? `${rarityColors[achievement.rarity]} bg-gradient-to-br ${rarityGradients[achievement.rarity]}/10` 
          : 'border-slate-700'
      }`}
    >
      {/* 稀有度指示器 */}
      <div className="absolute top-2 right-2">
        <div className={`w-3 h-3 rounded-full bg-gradient-to-r ${rarityGradients[achievement.rarity]}`}></div>
      </div>

      {/* 等级指示器 */}
      <div className="absolute top-2 left-2">
        <div className="flex space-x-1">
          {Array.from({ length: achievement.tier }).map((_, i) => (
            <Star key={i} className="w-3 h-3 text-yellow-400 fill-current" />
          ))}
        </div>
      </div>

      {/* 成就图标 */}
      <div className="flex items-center justify-center mb-4 relative">
        <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${
          achievement.isUnlocked 
            ? rarityGradients[achievement.rarity]
            : 'from-gray-600 to-gray-800'
        } flex items-center justify-center`}>
          {achievement.isUnlocked ? (
            <Trophy className="w-8 h-8 text-white" />
          ) : (
            <Lock className="w-8 h-8 text-gray-400" />
          )}
        </div>
        
        {achievement.isUnlocked && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-2 -right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center"
          >
            <CheckCircle className="w-4 h-4 text-white" />
          </motion.div>
        )}
      </div>

      {/* 成就信息 */}
      <div className="text-center mb-4">
        <h3 className={`font-bold mb-2 ${
          achievement.isUnlocked ? 'text-white' : 'text-gray-400'
        }`}>
          {achievement.name}
        </h3>
        <p className={`text-sm ${
          achievement.isUnlocked ? 'text-gray-300' : 'text-gray-500'
        }`}>
          {achievement.description}
        </p>
      </div>

      {/* 进度条 */}
      {!achievement.isUnlocked && achievement.progress && (
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-400 mb-2">
            <span>进度</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 1, delay: index * 0.1 }}
              className={`h-2 rounded-full bg-gradient-to-r ${rarityGradients[achievement.rarity]}`}
            />
          </div>
          {achievement.progress.currentValue !== undefined && (
            <div className="text-xs text-gray-500 mt-1">
              {achievement.progress.currentValue} / {achievement.progress.targetValue}
            </div>
          )}
        </div>
      )}

      {/* 类别和解锁时间 */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center space-x-1">
          <CategoryIcon className="w-4 h-4" />
          <span className="capitalize">{achievement.category}</span>
        </div>
        {achievement.userAchievement?.unlockedAt && (
          <div className="flex items-center space-x-1">
            <Clock className="w-4 h-4" />
            <span>
              {new Date(achievement.userAchievement.unlockedAt).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>

      {/* 奖励预览 */}
      {achievement.rewards && achievement.rewards.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="flex items-center space-x-2">
            <Gift className="w-4 h-4 text-yellow-400" />
            <span className="text-sm text-gray-300">
              {achievement.rewards.map(reward => {
                if (reward.type === 'fmh') return `${reward.value} FMH`;
                if (reward.type === 'multiplier') return `+${((reward.value as number) - 1) * 100}% 倍数`;
                return reward.description;
              }).join(', ')}
            </span>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default AchievementPanel;