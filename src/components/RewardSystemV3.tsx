import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, 
  Star, 
  Gift, 
  Zap, 
  Target, 
  Award,
  TrendingUp,
  Users,
  Share2,
  Flame,
  Crown,
  Medal,
  ChevronRight,
  Info
} from 'lucide-react';
import { RewardCalculationResult, PlayerLevel } from '../../lib/reward-system-v3';
import { UserAchievement } from '../../lib/achievement-system-v3';

interface RewardSystemProps {
  playerAddress: string;
  gameResult?: any;
  onRewardClaim?: (amount: number) => void;
  onAchievementView?: (achievementId: string) => void;
}

interface RewardBreakdown {
  base: number;
  difficulty: number;
  time: number;
  accuracy: number;
  streak: number;
  level: number;
  vip: number;
  staking: number;
  social: number;
  seasonal: number;
}

interface PlayerStats {
  totalWins: number;
  consecutiveWins: number;
  bestStreak: number;
  level: PlayerLevel;
  vipLevel: number;
  todayEarned: number;
  stakingAmount: number;
  referralCount: number;
  socialShares: number;
}

const RewardSystemV3: React.FC<RewardSystemProps> = ({
  playerAddress,
  gameResult,
  onRewardClaim,
  onAchievementView
}) => {
  const [currentReward, setCurrentReward] = useState<RewardCalculationResult | null>(null);
  const [achievements, setAchievements] = useState<UserAchievement[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [loading, setLoading] = useState(false);
  const [claimingReward, setClaimingReward] = useState(false);
  const [animatingReward, setAnimatingReward] = useState(false);
  
  // 获取玩家统计信息
  const fetchPlayerStats = useCallback(async () => {
    try {
      const response = await fetch(`/api/players/stats?address=${playerAddress}`);
      if (response.ok) {
        const data = await response.json();
        setPlayerStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch player stats:', error);
    }
  }, [playerAddress]);

  // 计算奖励
  const calculateReward = useCallback(async () => {
    if (!gameResult || !playerStats) return;
    
    setLoading(true);
    try {
      const response = await fetch('/api/rewards/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameResult,
          playerStats,
          signature: 'mock-signature',
          timestamp: Date.now(),
          nonce: Math.random().toString(36)
        })
      });

      if (response.ok) {
        const data = await response.json();
        setCurrentReward(data.reward);
        setAchievements(data.achievements || []);
        
        if (data.reward?.totalFMH > 0) {
          setAnimatingReward(true);
          setTimeout(() => setAnimatingReward(false), 2000);
        }
      }
    } catch (error) {
      console.error('Failed to calculate reward:', error);
    } finally {
      setLoading(false);
    }
  }, [gameResult, playerStats]);

  // 领取奖励
  const handleClaimReward = async () => {
    if (!currentReward?.canClaim || claimingReward) return;
    
    setClaimingReward(true);
    try {
      const response = await fetch('/api/rewards/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerAddress,
          gameId: gameResult?.gameId,
          amount: currentReward.totalFMH
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          onRewardClaim?.(currentReward.totalFMH);
          // 触发成功动画
          setAnimatingReward(true);
          setTimeout(() => setAnimatingReward(false), 3000);
        }
      }
    } catch (error) {
      console.error('Failed to claim reward:', error);
    } finally {
      setClaimingReward(false);
    }
  };

  useEffect(() => {
    if (playerAddress) {
      fetchPlayerStats();
    }
  }, [playerAddress, fetchPlayerStats]);

  useEffect(() => {
    if (gameResult && playerStats) {
      calculateReward();
    }
  }, [gameResult, playerStats, calculateReward]);

  // 等级颜色映射
  const levelColors = useMemo(() => ({
    bronze: 'from-amber-600 to-amber-800',
    silver: 'from-slate-400 to-slate-600',
    gold: 'from-yellow-400 to-yellow-600',
    platinum: 'from-slate-300 to-slate-500',
    diamond: 'from-cyan-400 to-blue-500',
    legend: 'from-purple-500 to-pink-600'
  }), []);

  // 等级图标映射
  const levelIcons = useMemo(() => ({
    bronze: Medal,
    silver: Award,
    gold: Trophy,
    platinum: Star,
    diamond: Crown,
    legend: Flame
  }), []);

  if (loading && !currentReward) {
    return (
      <div className="reward-system bg-gradient-to-br from-slate-900 to-indigo-900 rounded-xl p-6 text-white">
        <div className="flex items-center justify-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          <span className="text-lg">计算奖励中...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="reward-system bg-gradient-to-br from-slate-900 to-indigo-900 rounded-xl p-6 text-white relative overflow-hidden">
      {/* 背景动画元素 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10">
        {/* 头部 - 玩家等级信息 */}
        {playerStats && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-black/20 rounded-lg p-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${levelColors[playerStats.level]} flex items-center justify-center`}>
                  {React.createElement(levelIcons[playerStats.level], { 
                    className: "w-8 h-8 text-white" 
                  })}
                </div>
                <div>
                  <h3 className="text-xl font-bold capitalize">{playerStats.level} 玩家</h3>
                  <div className="flex items-center space-x-4 text-sm text-slate-300">
                    <span>胜场: {playerStats.totalWins}</span>
                    <span>连胜: {playerStats.consecutiveWins}</span>
                    {playerStats.vipLevel > 0 && (
                      <span className="bg-gradient-to-r from-yellow-400 to-yellow-600 px-2 py-1 rounded text-black font-semibold">
                        VIP {playerStats.vipLevel}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-green-400">
                  {playerStats.todayEarned} FMH
                </div>
                <div className="text-sm text-slate-400">今日已获得</div>
              </div>
            </div>
          </motion.div>
        )}

        {/* 主奖励区域 */}
        {currentReward && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-6"
          >
            <div className="text-center mb-4">
              <motion.div
                animate={animatingReward ? { scale: [1, 1.2, 1], rotate: [0, 360] } : {}}
                transition={{ duration: 0.8, ease: "easeInOut" }}
                className="relative inline-block"
              >
                <div className={`text-6xl font-bold mb-2 ${
                  currentReward.canClaim ? 'text-green-400' : 'text-red-400'
                }`}>
                  {currentReward.totalFMH} FMH
                </div>
                {animatingReward && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0 }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <div className="text-yellow-400">
                      <Zap className="w-16 h-16 animate-pulse" />
                    </div>
                  </motion.div>
                )}
              </motion.div>
              
              <div className="text-lg text-slate-300 mb-4">
                {currentReward.canClaim ? '恭喜获得奖励！' : '暂时无法领取'}
              </div>
              
              {!currentReward.canClaim && currentReward.reason && (
                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 mb-4">
                  <div className="flex items-center space-x-2 text-red-300">
                    <Info className="w-5 h-5" />
                    <span>{currentReward.reason}</span>
                  </div>
                </div>
              )}
            </div>

            {/* 领取按钮 */}
            {currentReward.canClaim && (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleClaimReward}
                disabled={claimingReward}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 mb-4 flex items-center justify-center space-x-2"
              >
                {claimingReward ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>领取中...</span>
                  </>
                ) : (
                  <>
                    <Gift className="w-6 h-6" />
                    <span>领取奖励</span>
                  </>
                )}
              </motion.button>
            )}

            {/* 奖励明细按钮 */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowBreakdown(!showBreakdown)}
                className="bg-slate-700/50 hover:bg-slate-700 text-white py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
              >
                <TrendingUp className="w-5 h-5" />
                <span>奖励明细</span>
                <ChevronRight className={`w-4 h-4 transition-transform ${showBreakdown ? 'rotate-90' : ''}`} />
              </button>
              
              {achievements.length > 0 && (
                <button
                  onClick={() => setShowAchievements(!showAchievements)}
                  className="bg-yellow-600/50 hover:bg-yellow-600 text-white py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                >
                  <Trophy className="w-5 h-5" />
                  <span>新成就 ({achievements.length})</span>
                </button>
              )}
            </div>
          </motion.div>
        )}

        {/* 奖励明细 */}
        <AnimatePresence>
          {showBreakdown && currentReward && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 bg-black/30 rounded-lg p-4"
            >
              <h4 className="text-lg font-semibold mb-4 flex items-center space-x-2">
                <Target className="w-5 h-5" />
                <span>奖励明细</span>
              </h4>
              
              <div className="space-y-3">
                {Object.entries(currentReward.breakdown).map(([key, value]) => {
                  if (value === 0) return null;
                  
                  const labels: Record<string, { name: string; icon: any; color: string }> = {
                    base: { name: '基础奖励', icon: Target, color: 'text-blue-400' },
                    difficulty: { name: '难度加成', icon: Zap, color: 'text-purple-400' },
                    time: { name: '时间奖励', icon: Flame, color: 'text-orange-400' },
                    accuracy: { name: '精准奖励', icon: Star, color: 'text-yellow-400' },
                    streak: { name: '连胜奖励', icon: Trophy, color: 'text-green-400' },
                    level: { name: '等级加成', icon: Crown, color: 'text-indigo-400' },
                    vip: { name: 'VIP加成', icon: Medal, color: 'text-pink-400' },
                    staking: { name: '质押奖励', icon: TrendingUp, color: 'text-cyan-400' },
                    social: { name: '社交奖励', icon: Share2, color: 'text-teal-400' },
                    seasonal: { name: '活动奖励', icon: Gift, color: 'text-red-400' }
                  };
                  
                  const config = labels[key];
                  if (!config) return null;
                  
                  return (
                    <motion.div
                      key={key}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <config.icon className={`w-5 h-5 ${config.color}`} />
                        <span className="font-medium">{config.name}</span>
                      </div>
                      <span className={`font-bold ${config.color}`}>+{value} FMH</span>
                    </motion.div>
                  );
                })}
              </div>
              
              {currentReward.dynamicMultiplier !== 1 && (
                <div className="mt-4 p-3 bg-blue-500/20 border border-blue-500/50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-blue-300">动态调整系数</span>
                    <span className="text-blue-400 font-bold">×{currentReward.dynamicMultiplier.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 新成就展示 */}
        <AnimatePresence>
          {showAchievements && achievements.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 bg-gradient-to-br from-yellow-600/20 to-orange-600/20 border border-yellow-500/50 rounded-lg p-4"
            >
              <h4 className="text-lg font-semibold mb-4 flex items-center space-x-2 text-yellow-400">
                <Trophy className="w-5 h-5" />
                <span>新获得成就</span>
              </h4>
              
              <div className="space-y-3">
                {achievements.map((achievement, index) => (
                  <motion.div
                    key={achievement.achievementId}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-black/30 rounded-lg p-4 cursor-pointer hover:bg-black/40 transition-colors"
                    onClick={() => onAchievementView?.(achievement.achievementId)}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                        <Trophy className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h5 className="font-semibold text-yellow-400">成就解锁</h5>
                        <p className="text-sm text-slate-300">ID: {achievement.achievementId}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-yellow-400" />
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 额外统计信息 */}
        {playerStats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="bg-black/20 rounded-lg p-3 text-center">
              <Users className="w-6 h-6 mx-auto mb-2 text-blue-400" />
              <div className="font-bold text-blue-400">{playerStats.referralCount}</div>
              <div className="text-slate-400">推荐人数</div>
            </div>
            <div className="bg-black/20 rounded-lg p-3 text-center">
              <Share2 className="w-6 h-6 mx-auto mb-2 text-green-400" />
              <div className="font-bold text-green-400">{playerStats.socialShares}</div>
              <div className="text-slate-400">社交分享</div>
            </div>
            <div className="bg-black/20 rounded-lg p-3 text-center">
              <Flame className="w-6 h-6 mx-auto mb-2 text-orange-400" />
              <div className="font-bold text-orange-400">{playerStats.bestStreak}</div>
              <div className="text-slate-400">最佳连胜</div>
            </div>
            <div className="bg-black/20 rounded-lg p-3 text-center">
              <TrendingUp className="w-6 h-6 mx-auto mb-2 text-purple-400" />
              <div className="font-bold text-purple-400">{playerStats.stakingAmount}</div>
              <div className="text-slate-400">质押数量</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RewardSystemV3;