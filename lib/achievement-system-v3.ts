import { GameResult, PlayerStats, PlayerLevel } from './reward-system-v3';

// 成就类型定义
export interface Achievement {
  id: string;
  key: string;
  name: string;
  description: string;
  iconUrl?: string;
  tier: 1 | 2 | 3 | 4 | 5; // 成就等级
  rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
  category: 'gameplay' | 'progression' | 'social' | 'seasonal' | 'special';
  
  // 解锁条件
  conditions: AchievementCondition[];
  prerequisites?: string[]; // 前置成就
  
  // 奖励
  rewards: AchievementReward[];
  
  // 显示设置
  isHidden: boolean; // 隐藏成就（解锁后才显示）
  isActive: boolean;
  
  // 时间限制
  validFrom?: number;
  validUntil?: number;
  
  // 统计信息
  unlockCount?: number; // 解锁人数
  unlockRate?: number;  // 解锁率
  
  createdAt: number;
  updatedAt: number;
}

export interface AchievementCondition {
  type: 'stat' | 'game' | 'streak' | 'time' | 'custom';
  field: string;
  operator: '>=' | '<=' | '==' | '>' | '<' | 'in' | 'contains';
  value: any;
  accumulative?: boolean; // 是否累积计算
  timeframe?: 'daily' | 'weekly' | 'monthly' | 'all'; // 时间范围
}

export interface AchievementReward {
  type: 'fmh' | 'nft' | 'badge' | 'title' | 'privilege' | 'multiplier';
  value: any;
  description: string;
}

export interface UserAchievement {
  achievementId: string;
  playerAddress: string;
  unlockedAt: number;
  gameSessionId?: string;
  progress?: number; // 进度百分比
  isNotified: boolean;
  rewards: UserAchievementReward[];
}

export interface UserAchievementReward {
  type: string;
  value: any;
  claimed: boolean;
  claimedAt?: number;
  txHash?: string;
}

export interface AchievementProgress {
  achievementId: string;
  currentValue: number;
  targetValue: number;
  progress: number; // 0-1
  isCompleted: boolean;
  lastUpdate: number;
}

// 季节性成就事件
export interface SeasonalAchievement extends Achievement {
  seasonId: string;
  seasonName: string;
  leaderboard?: {
    enabled: boolean;
    rewards: { rank: number; reward: AchievementReward }[];
  };
}

/**
 * 成就系统V3.0 - 全面升级版本
 * 新增功能：
 * - 多维度成就条件
 * - 动态进度跟踪
 * - 季节性限时成就
 * - 成就链和前置条件
 * - 隐藏成就和惊喜解锁
 * - 社交成就和协作模式
 * - 成就数据分析
 */
export class AchievementSystemV3 {
  private static achievements: Map<string, Achievement> = new Map();
  private static seasonalAchievements: Map<string, SeasonalAchievement> = new Map();

  /**
   * 初始化成就系统
   */
  static async initialize(): Promise<void> {
    try {
      await this.loadBaseAchievements();
      await this.loadSeasonalAchievements();
      console.log('Achievement system initialized');
    } catch (error) {
      console.error('Failed to initialize achievement system:', error);
      throw error;
    }
  }

  /**
   * 加载基础成就
   */
  private static async loadBaseAchievements(): Promise<void> {
    const baseAchievements: Achievement[] = [
      // === 游戏基础成就 ===
      {
        id: 'first_win',
        key: 'first_win',
        name: '🎯 初战告捷',
        description: '完成第一次游戏胜利',
        tier: 1,
        rarity: 'common',
        category: 'gameplay',
        conditions: [
          { type: 'stat', field: 'totalWins', operator: '>=', value: 1 }
        ],
        rewards: [
          { type: 'fmh', value: 10, description: '首胜奖励 10 FMH' },
          { type: 'badge', value: 'first_win', description: '新手徽章' }
        ],
        isHidden: false,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },

      {
        id: 'win_10',
        key: 'win_10',
        name: '🏆 小有成就',
        description: '累计获得10次胜利',
        tier: 2,
        rarity: 'common',
        category: 'gameplay',
        conditions: [
          { type: 'stat', field: 'totalWins', operator: '>=', value: 10 }
        ],
        rewards: [
          { type: 'fmh', value: 25, description: '里程碑奖励 25 FMH' },
          { type: 'multiplier', value: 1.05, description: '经验倍数 +5%' }
        ],
        isHidden: false,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },

      {
        id: 'win_100',
        key: 'win_100',
        name: '🎖️ 百战不殆',
        description: '累计获得100次胜利',
        tier: 3,
        rarity: 'rare',
        category: 'gameplay',
        conditions: [
          { type: 'stat', field: 'totalWins', operator: '>=', value: 100 }
        ],
        rewards: [
          { type: 'fmh', value: 100, description: '重要里程碑 100 FMH' },
          { type: 'title', value: '百胜将军', description: '专属称号' },
          { type: 'privilege', value: 'custom_avatar', description: '自定义头像权限' }
        ],
        isHidden: false,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },

      // === 高难度成就 ===
      {
        id: 'perfect_streak_10',
        key: 'perfect_streak_10',
        name: '💎 完美十连',
        description: '连续10局完美游戏（无误点、高效率）',
        tier: 4,
        rarity: 'epic',
        category: 'gameplay',
        conditions: [
          { type: 'custom', field: 'perfectStreak', operator: '>=', value: 10 }
        ],
        rewards: [
          { type: 'fmh', value: 200, description: '完美奖励 200 FMH' },
          { type: 'nft', value: 'perfect_streak_diamond', description: '钻石完美NFT' },
          { type: 'multiplier', value: 1.15, description: '永久奖励倍数 +15%' }
        ],
        isHidden: true,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },

      // === 速度成就 ===
      {
        id: 'speed_demon_easy',
        key: 'speed_demon_easy',
        name: '⚡ 简单闪电',
        description: '简单模式15秒内完成',
        tier: 2,
        rarity: 'common',
        category: 'gameplay',
        conditions: [
          { type: 'game', field: 'difficulty', operator: '==', value: 'easy' },
          { type: 'game', field: 'gameDuration', operator: '<=', value: 15 },
          { type: 'game', field: 'isWon', operator: '==', value: true }
        ],
        rewards: [
          { type: 'fmh', value: 15, description: '速度奖励 15 FMH' }
        ],
        isHidden: false,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },

      {
        id: 'speed_demon_hard',
        key: 'speed_demon_hard',
        name: '🚀 困难闪电',
        description: '困难模式60秒内完成',
        tier: 4,
        rarity: 'epic',
        category: 'gameplay',
        conditions: [
          { type: 'game', field: 'difficulty', operator: '==', value: 'hard' },
          { type: 'game', field: 'gameDuration', operator: '<=', value: 60 },
          { type: 'game', field: 'isWon', operator: '==', value: true }
        ],
        rewards: [
          { type: 'fmh', value: 50, description: '困难速度奖励 50 FMH' },
          { type: 'badge', value: 'speed_demon', description: '速度恶魔徽章' }
        ],
        isHidden: false,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },

      // === 连胜成就 ===
      {
        id: 'streak_5',
        key: 'streak_5',
        name: '🔥 连胜开始',
        description: '连续获得5次胜利',
        tier: 2,
        rarity: 'common',
        category: 'gameplay',
        conditions: [
          { type: 'stat', field: 'consecutiveWins', operator: '>=', value: 5 }
        ],
        rewards: [
          { type: 'fmh', value: 20, description: '连胜奖励 20 FMH' }
        ],
        isHidden: false,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },

      {
        id: 'legendary_streak',
        key: 'legendary_streak',
        name: '👑 传奇连胜',
        description: '连续获得50次胜利',
        tier: 5,
        rarity: 'legendary',
        category: 'gameplay',
        conditions: [
          { type: 'stat', field: 'consecutiveWins', operator: '>=', value: 50 }
        ],
        rewards: [
          { type: 'fmh', value: 500, description: '传奇奖励 500 FMH' },
          { type: 'nft', value: 'legendary_streak_crown', description: '传奇连胜皇冠NFT' },
          { type: 'title', value: '不败传说', description: '传奇称号' },
          { type: 'privilege', value: 'leaderboard_highlight', description: '排行榜高亮显示' }
        ],
        isHidden: true,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },

      // === 社交成就 ===
      {
        id: 'social_butterfly',
        key: 'social_butterfly',
        name: '🦋 社交达人',
        description: '分享游戏到社交媒体20次',
        tier: 3,
        rarity: 'rare',
        category: 'social',
        conditions: [
          { type: 'stat', field: 'socialShares', operator: '>=', value: 20 }
        ],
        rewards: [
          { type: 'fmh', value: 50, description: '社交奖励 50 FMH' },
          { type: 'multiplier', value: 1.1, description: '社交分享奖励 +10%' }
        ],
        isHidden: false,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },

      {
        id: 'referral_master',
        key: 'referral_master',
        name: '🎯 推荐大师',
        description: '成功推荐10位新玩家',
        tier: 4,
        rarity: 'epic',
        category: 'social',
        conditions: [
          { type: 'stat', field: 'referralCount', operator: '>=', value: 10 }
        ],
        rewards: [
          { type: 'fmh', value: 200, description: '推荐大师奖励 200 FMH' },
          { type: 'privilege', value: 'vip_support', description: 'VIP客服支持' },
          { type: 'multiplier', value: 1.2, description: '推荐奖励永久 +20%' }
        ],
        isHidden: false,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },

      // === 特殊隐藏成就 ===
      {
        id: 'midnight_miner',
        key: 'midnight_miner',
        name: '🌙 午夜矿工',
        description: '在午夜12点到1点之间完成游戏',
        tier: 3,
        rarity: 'rare',
        category: 'special',
        conditions: [
          { type: 'custom', field: 'gameTime', operator: 'in', value: [0, 1] } // 小时范围
        ],
        rewards: [
          { type: 'fmh', value: 30, description: '午夜奖励 30 FMH' },
          { type: 'badge', value: 'midnight_miner', description: '午夜矿工徽章' }
        ],
        isHidden: true,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },

      {
        id: 'lucky_seven',
        key: 'lucky_seven',
        name: '🍀 幸运七',
        description: '在游戏ID包含连续三个7的游戏中获胜',
        tier: 3,
        rarity: 'rare',
        category: 'special',
        conditions: [
          { type: 'custom', field: 'gameId', operator: 'contains', value: '777' },
          { type: 'game', field: 'isWon', operator: '==', value: true }
        ],
        rewards: [
          { type: 'fmh', value: 77, description: '幸运奖励 77 FMH' },
          { type: 'badge', value: 'lucky_seven', description: '幸运七徽章' }
        ],
        isHidden: true,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },

      // === 等级提升成就 ===
      {
        id: 'level_silver',
        key: 'level_silver',
        name: '🥈 银级玩家',
        description: '达到银级等级',
        tier: 2,
        rarity: 'common',
        category: 'progression',
        conditions: [
          { type: 'stat', field: 'playerLevel', operator: '>=', value: PlayerLevel.SILVER }
        ],
        rewards: [
          { type: 'fmh', value: 50, description: '晋级奖励 50 FMH' }
        ],
        isHidden: false,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      },

      {
        id: 'level_legend',
        key: 'level_legend',
        name: '👑 传说玩家',
        description: '达到传说等级',
        tier: 5,
        rarity: 'legendary',
        category: 'progression',
        conditions: [
          { type: 'stat', field: 'playerLevel', operator: '>=', value: PlayerLevel.LEGEND }
        ],
        rewards: [
          { type: 'fmh', value: 1000, description: '传说奖励 1000 FMH' },
          { type: 'nft', value: 'legend_crown', description: '传说皇冠NFT' },
          { type: 'privilege', value: 'beta_access', description: '新功能优先体验' },
          { type: 'title', value: '扫雷传说', description: '传说称号' }
        ],
        isHidden: false,
        isActive: true,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ];

    // 将成就存储到内存映射中
    baseAchievements.forEach(achievement => {
      this.achievements.set(achievement.id, achievement);
    });
  }

  /**
   * 加载季节性成就
   */
  private static async loadSeasonalAchievements(): Promise<void> {
    const currentTime = Date.now();
    const oneMonth = 30 * 24 * 60 * 60 * 1000;

    const seasonalAchievements: SeasonalAchievement[] = [
      {
        id: 'spring_festival_2024',
        key: 'spring_festival_2024',
        seasonId: 'spring_2024',
        seasonName: '2024春节特别活动',
        name: '🐲 龙年大吉',
        description: '在春节期间累计获得88次胜利',
        tier: 4,
        rarity: 'epic',
        category: 'seasonal',
        conditions: [
          { type: 'stat', field: 'totalWins', operator: '>=', value: 88, timeframe: 'monthly' }
        ],
        rewards: [
          { type: 'fmh', value: 888, description: '龙年红包 888 FMH' },
          { type: 'nft', value: 'dragon_year_2024', description: '2024龙年纪念NFT' }
        ],
        validFrom: currentTime,
        validUntil: currentTime + oneMonth,
        isHidden: false,
        isActive: true,
        leaderboard: {
          enabled: true,
          rewards: [
            { rank: 1, reward: { type: 'fmh', value: 2000, description: '冠军奖励' } },
            { rank: 2, reward: { type: 'fmh', value: 1500, description: '亚军奖励' } },
            { rank: 3, reward: { type: 'fmh', value: 1000, description: '季军奖励' } }
          ]
        },
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
    ];

    seasonalAchievements.forEach(achievement => {
      this.seasonalAchievements.set(achievement.id, achievement);
    });
  }

  /**
   * 检查游戏后的成就解锁
   */
  static async checkAchievements(
    playerAddress: string,
    gameResult: GameResult,
    playerStats: PlayerStats
  ): Promise<UserAchievement[]> {
    const unlockedAchievements: UserAchievement[] = [];
    
    try {
      // 获取玩家现有成就
      const existingAchievements = await this.getPlayerAchievements(playerAddress);
      const existingIds = new Set(existingAchievements.map(a => a.achievementId));

      // 检查所有活跃成就
      const allAchievements = [
        ...this.achievements.values(),
        ...this.seasonalAchievements.values()
      ];

      for (const achievement of allAchievements) {
        if (!achievement.isActive) continue;
        if (existingIds.has(achievement.id)) continue; // 已解锁
        
        // 检查时间有效性
        if (!this.isAchievementValid(achievement)) continue;
        
        // 检查前置条件
        if (!await this.checkPrerequisites(achievement, existingIds)) continue;
        
        // 检查解锁条件
        const isUnlocked = await this.checkConditions(
          achievement.conditions,
          gameResult,
          playerStats,
          playerAddress
        );

        if (isUnlocked) {
          const userAchievement: UserAchievement = {
            achievementId: achievement.id,
            playerAddress,
            unlockedAt: Date.now(),
            gameSessionId: gameResult.gameId.toString(),
            progress: 100,
            isNotified: false,
            rewards: achievement.rewards.map(reward => ({
              type: reward.type,
              value: reward.value,
              claimed: false
            }))
          };

          unlockedAchievements.push(userAchievement);
        }
      }

      // 保存新解锁的成就
      if (unlockedAchievements.length > 0) {
        await this.saveUserAchievements(unlockedAchievements);
      }

    } catch (error) {
      console.error('Achievement check failed:', error);
    }

    return unlockedAchievements;
  }

  /**
   * 检查成就条件
   */
  private static async checkConditions(
    conditions: AchievementCondition[],
    gameResult: GameResult,
    playerStats: PlayerStats,
    playerAddress: string
  ): Promise<boolean> {
    
    for (const condition of conditions) {
      const result = await this.evaluateCondition(condition, gameResult, playerStats, playerAddress);
      if (!result) return false;
    }
    
    return true;
  }

  /**
   * 评估单个条件
   */
  private static async evaluateCondition(
    condition: AchievementCondition,
    gameResult: GameResult,
    playerStats: PlayerStats,
    playerAddress: string
  ): Promise<boolean> {
    
    let actualValue: any;
    
    switch (condition.type) {
      case 'stat':
        actualValue = (playerStats as any)[condition.field];
        break;
        
      case 'game':
        actualValue = (gameResult as any)[condition.field];
        break;
        
      case 'streak':
        actualValue = playerStats.consecutiveWins;
        break;
        
      case 'time':
        if (condition.field === 'gameTime') {
          const hour = new Date().getHours();
          return condition.value.includes(hour);
        }
        actualValue = Date.now();
        break;
        
      case 'custom':
        actualValue = await this.evaluateCustomCondition(condition, gameResult, playerStats, playerAddress);
        break;
        
      default:
        return false;
    }

    // 执行比较操作
    return this.compareValues(actualValue, condition.operator, condition.value);
  }

  /**
   * 评估自定义条件
   */
  private static async evaluateCustomCondition(
    condition: AchievementCondition,
    gameResult: GameResult,
    playerStats: PlayerStats,
    playerAddress: string
  ): Promise<any> {
    
    switch (condition.field) {
      case 'perfectStreak':
        // 需要查询数据库获取完美连胜数
        return await this.getPerfectStreak(playerAddress);
        
      case 'gameTime':
        return new Date().getHours();
        
      case 'gameId':
        return gameResult.gameId.toString();
        
      default:
        return null;
    }
  }

  /**
   * 比较数值
   */
  private static compareValues(actual: any, operator: string, expected: any): boolean {
    switch (operator) {
      case '>=': return actual >= expected;
      case '<=': return actual <= expected;
      case '==': return actual === expected;
      case '>': return actual > expected;
      case '<': return actual < expected;
      case 'in': return Array.isArray(expected) && expected.includes(actual);
      case 'contains': return typeof actual === 'string' && actual.includes(expected);
      default: return false;
    }
  }

  /**
   * 检查成就是否在有效期内
   */
  private static isAchievementValid(achievement: Achievement): boolean {
    const now = Date.now();
    
    if (achievement.validFrom && now < achievement.validFrom) return false;
    if (achievement.validUntil && now > achievement.validUntil) return false;
    
    return true;
  }

  /**
   * 检查前置成就条件
   */
  private static async checkPrerequisites(
    achievement: Achievement,
    existingAchievementIds: Set<string>
  ): Promise<boolean> {
    
    if (!achievement.prerequisites) return true;
    
    for (const prerequisiteId of achievement.prerequisites) {
      if (!existingAchievementIds.has(prerequisiteId)) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * 获取玩家成就进度
   */
  static async getPlayerProgress(playerAddress: string): Promise<AchievementProgress[]> {
    try {
      const playerStats = await this.getPlayerStats(playerAddress);
      const existingAchievements = await this.getPlayerAchievements(playerAddress);
      const existingIds = new Set(existingAchievements.map(a => a.achievementId));
      
      const progressList: AchievementProgress[] = [];
      
      // 计算所有成就的进度
      const allAchievements = [...this.achievements.values()];
      
      for (const achievement of allAchievements) {
        if (!achievement.isActive || existingIds.has(achievement.id)) continue;
        if (!this.isAchievementValid(achievement)) continue;
        
        // 计算第一个条件的进度（简化处理）
        const mainCondition = achievement.conditions[0];
        if (!mainCondition) continue;
        
        let currentValue = 0;
        let targetValue = mainCondition.value;
        
        if (mainCondition.type === 'stat') {
          currentValue = (playerStats as any)[mainCondition.field] || 0;
        }
        
        const progress = Math.min(1, currentValue / targetValue);
        
        progressList.push({
          achievementId: achievement.id,
          currentValue,
          targetValue,
          progress,
          isCompleted: progress >= 1,
          lastUpdate: Date.now()
        });
      }
      
      return progressList.sort((a, b) => b.progress - a.progress);
      
    } catch (error) {
      console.error('Failed to get player progress:', error);
      return [];
    }
  }

  /**
   * 获取成就排行榜
   */
  static async getAchievementLeaderboard(achievementId: string, limit: number = 100): Promise<any[]> {
    try {
      const response = await fetch(`/api/achievements/leaderboard?id=${achievementId}&limit=${limit}`);
      const data = await response.json();
      return data.leaderboard || [];
    } catch (error) {
      console.error('Failed to get achievement leaderboard:', error);
      return [];
    }
  }

  /**
   * 领取成就奖励
   */
  static async claimReward(
    playerAddress: string,
    achievementId: string,
    rewardType: string
  ): Promise<{ success: boolean; txHash?: string; error?: string }> {
    try {
      const response = await fetch('/api/achievements/claim-reward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerAddress,
          achievementId,
          rewardType
        })
      });
      
      return await response.json();
    } catch (error) {
      console.error('Failed to claim reward:', error);
      return { success: false, error: 'Network error' };
    }
  }

  /**
   * 获取成就统计信息
   */
  static getAchievementStats(): {
    total: number;
    byCategory: Record<string, number>;
    byRarity: Record<string, number>;
    seasonal: number;
  } {
    const stats = {
      total: this.achievements.size,
      byCategory: {} as Record<string, number>,
      byRarity: {} as Record<string, number>,
      seasonal: this.seasonalAchievements.size
    };
    
    for (const achievement of this.achievements.values()) {
      stats.byCategory[achievement.category] = (stats.byCategory[achievement.category] || 0) + 1;
      stats.byRarity[achievement.rarity] = (stats.byRarity[achievement.rarity] || 0) + 1;
    }
    
    return stats;
  }

  // 辅助方法（模拟数据库操作）
  private static async getPlayerAchievements(playerAddress: string): Promise<UserAchievement[]> {
    try {
      const response = await fetch(`/api/achievements/player?address=${playerAddress}`);
      const data = await response.json();
      return data.achievements || [];
    } catch {
      return [];
    }
  }

  private static async getPlayerStats(playerAddress: string): Promise<PlayerStats> {
    try {
      const response = await fetch(`/api/players/stats?address=${playerAddress}`);
      const data = await response.json();
      return data.stats || {};
    } catch {
      return {} as PlayerStats;
    }
  }

  private static async saveUserAchievements(achievements: UserAchievement[]): Promise<void> {
    try {
      await fetch('/api/achievements/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ achievements })
      });
    } catch (error) {
      console.error('Failed to save achievements:', error);
    }
  }

  private static async getPerfectStreak(playerAddress: string): Promise<number> {
    try {
      const response = await fetch(`/api/players/perfect-streak?address=${playerAddress}`);
      const data = await response.json();
      return data.streak || 0;
    } catch {
      return 0;
    }
  }

  /**
   * 获取成就详情
   */
  static getAchievement(id: string): Achievement | SeasonalAchievement | null {
    return this.achievements.get(id) || this.seasonalAchievements.get(id) || null;
  }

  /**
   * 获取所有可见成就
   */
  static getVisibleAchievements(): (Achievement | SeasonalAchievement)[] {
    const allAchievements = [
      ...this.achievements.values(),
      ...this.seasonalAchievements.values()
    ];
    
    return allAchievements
      .filter(achievement => achievement.isActive && !achievement.isHidden)
      .sort((a, b) => a.tier - b.tier);
  }

  /**
   * 搜索成就
   */
  static searchAchievements(query: string, category?: string, rarity?: string): Achievement[] {
    const allAchievements = [...this.achievements.values()];
    
    return allAchievements.filter(achievement => {
      if (!achievement.isActive) return false;
      
      const matchesQuery = !query || 
        achievement.name.toLowerCase().includes(query.toLowerCase()) ||
        achievement.description.toLowerCase().includes(query.toLowerCase());
      
      const matchesCategory = !category || achievement.category === category;
      const matchesRarity = !rarity || achievement.rarity === rarity;
      
      return matchesQuery && matchesCategory && matchesRarity;
    });
  }
}

export default AchievementSystemV3;