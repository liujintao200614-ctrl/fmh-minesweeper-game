import { GameConfig } from '../src/types/game';
import crypto from 'crypto';

// 扩展的游戏结果接口
export interface GameResult {
  gameId: number | string;
  playerAddress: string;
  gameConfig: GameConfig;
  finalScore: number;
  gameDuration: number;
  flagsUsed: number;
  isWon: boolean;
  cellsRevealed: number;
  perfectGame: boolean;
  difficulty: 'easy' | 'medium' | 'hard' | 'expert' | 'custom';
  moveCount: number; // 总操作次数
  firstClickTime: number; // 首次点击时间
  lastClickTime: number; // 最后点击时间
  hintsUsed: number; // 使用提示次数
  pauseCount: number; // 暂停次数
  totalPauseTime: number; // 总暂停时间
  efficiency: number; // 效率分数 (0-100)
}

export interface PlayerStats {
  consecutiveWins: number;
  todayEarned: number;
  playerLevel: PlayerLevel;
  totalWins: number;
  totalGames: number;
  lastPlayTime: number;
  weeklyWins: number;
  monthlyWins: number;
  bestStreak: number;
  averageTime: number;
  averageScore: number;
  totalPauseTime: number;
  fmhBalance: number;
  stakingAmount: number; // 质押数量
  vipLevel: number; // VIP等级 (0-5)
  referralCount: number; // 推荐人数
  socialShares: number; // 社交分享次数
}

export enum PlayerLevel {
  BRONZE = 'bronze',
  SILVER = 'silver', 
  GOLD = 'gold',
  PLATINUM = 'platinum',
  DIAMOND = 'diamond',
  LEGEND = 'legend'
}

export interface RewardCalculationResult {
  baseReward: number;
  difficultyMultiplier: number;
  timeBonus: number;
  accuracyBonus: number;
  streakBonus: number;
  levelBonus: number;
  vipBonus: number;
  stakingBonus: number;
  socialBonus: number;
  seasonalBonus: number;
  totalFMH: number;
  breakdown: {
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
  };
  canClaim: boolean;
  reason?: string;
  dynamicMultiplier: number; // 动态调整系数
}

export interface SeasonalEvent {
  id: string;
  name: string;
  startTime: number;
  endTime: number;
  bonusMultiplier: number;
  conditions: string[];
  isActive: boolean;
}

/**
 * FMH代币奖励体系V3.0 - 全面优化版本
 * 新增功能：
 * - 更细致的等级系统
 * - VIP系统和质押奖励
 * - 社交分享奖励
 * - 季节性活动
 * - 动态经济平衡
 * - 高级防作弊机制
 */
export class RewardSystemV3 {
  // 全站每日奖励池（可动态调整）
  private static readonly BASE_DAILY_POOL_LIMIT = 100000; // FMH
  
  // 等级系统升级 - 新增钻石等级
  private static readonly DAILY_PERSONAL_LIMITS = {
    [PlayerLevel.BRONZE]: 500,
    [PlayerLevel.SILVER]: 550,    // +10%
    [PlayerLevel.GOLD]: 650,      // +30%
    [PlayerLevel.PLATINUM]: 750,  // +50%
    [PlayerLevel.DIAMOND]: 850,   // +70%
    [PlayerLevel.LEGEND]: 1000    // +100%
  };

  // 难度系数优化
  private static readonly DIFFICULTY_MULTIPLIERS = {
    easy: 1.0,
    medium: 1.8,
    hard: 2.5,
    expert: 3.5,
    custom: 2.0 // 基础倍数，根据实际配置调整
  };

  // VIP等级奖励倍数
  private static readonly VIP_MULTIPLIERS = [1.0, 1.05, 1.1, 1.15, 1.25, 1.4]; // VIP0-5

  // 质押奖励系数
  private static readonly STAKING_BONUS_RATES = {
    1000: 0.05,   // 质押1000+ FMH, +5%
    5000: 0.1,    // 质押5000+ FMH, +10%
    10000: 0.15,  // 质押10000+ FMH, +15%
    50000: 0.25,  // 质押50000+ FMH, +25%
    100000: 0.35  // 质押100000+ FMH, +35%
  };

  // 经济平衡参数
  private static readonly ECONOMIC_BALANCE = {
    maxDailyInflation: 0.001, // 每日最大通胀率 0.1%
    burnRate: 0.1,           // 10%的消费会被销毁
    stakingRewardPool: 0.15, // 15%的奖励进入质押池
    referralPool: 0.05,      // 5%用于推荐奖励
    seasonalPool: 0.1        // 10%用于季节性活动
  };

  /**
   * 计算自定义难度的倍数
   */
  private static calculateCustomDifficultyMultiplier(gameConfig: GameConfig): number {
    const totalCells = gameConfig.width * gameConfig.height;
    const mineRatio = gameConfig.mines / totalCells;
    const sizeComplexity = Math.log10(totalCells) / 2; // 尺寸复杂度
    
    // 基础倍数 = 雷密度 * 尺寸复杂度 + 调整因子
    const baseMultiplier = 1 + (mineRatio * 3) + (sizeComplexity * 0.5);
    
    return Math.min(Math.max(baseMultiplier, 1.5), 4.0); // 限制在1.5-4.0之间
  }

  /**
   * 改进的基础分数计算
   */
  private static calculateBaseScore(gameResult: GameResult): number {
    const { gameConfig, gameDuration, flagsUsed, moveCount, efficiency, cellsRevealed } = gameResult;
    
    // 1. 游戏规模基础分
    const sizeScore = gameConfig.width * gameConfig.height * 2;
    
    // 2. 雷密度奖励
    const mineRatio = gameConfig.mines / (gameConfig.width * gameConfig.height);
    const densityBonus = Math.floor(mineRatio * 200);
    
    // 3. 时间效率分 (越快越高分)
    const timeEfficiency = Math.max(0, 300 - gameDuration);
    
    // 4. 操作效率分 (操作次数越少越高分)
    const operationEfficiency = Math.max(0, cellsRevealed * 3 - moveCount);
    
    // 5. 整体效率奖励
    const efficiencyBonus = Math.floor(efficiency * 1.5);
    
    // 6. 标旗精准度奖励
    const flagAccuracy = gameConfig.mines > 0 ? 
      Math.max(0, 50 - Math.abs(flagsUsed - gameConfig.mines) * 5) : 0;
    
    return sizeScore + densityBonus + timeEfficiency + operationEfficiency + efficiencyBonus + flagAccuracy;
  }

  /**
   * 改进的时间奖励算法
   */
  private static calculateTimeBonus(gameResult: GameResult): number {
    const { gameDuration, gameConfig, difficulty } = gameResult;
    
    // 根据难度设置不同的时间标准
    const timeStandards = {
      easy: 60,
      medium: 120,
      hard: 180,
      expert: 240,
      custom: Math.sqrt(gameConfig.width * gameConfig.height) * 8
    };
    
    const standard = timeStandards[difficulty] || 120;
    
    if (gameDuration <= standard * 0.3) { // 30%以内完成
      return 15; // 大幅奖励
    } else if (gameDuration <= standard * 0.5) { // 50%以内完成
      return 10;
    } else if (gameDuration <= standard * 0.7) { // 70%以内完成
      return 5;
    } else if (gameDuration <= standard) { // 标准时间内完成
      return 2;
    }
    
    return 0;
  }

  /**
   * 改进的精准度计算
   */
  private static calculateAccuracyBonus(gameResult: GameResult): number {
    const { perfectGame, flagsUsed, gameConfig, hintsUsed, efficiency } = gameResult;
    
    let bonus = 0;
    
    // 完美游戏奖励
    if (perfectGame) {
      bonus += 8;
    }
    
    // 标旗精准度奖励
    if (gameConfig.mines > 0) {
      const flagAccuracy = 1 - Math.abs(flagsUsed - gameConfig.mines) / gameConfig.mines;
      if (flagAccuracy >= 0.95) bonus += 5;
      else if (flagAccuracy >= 0.9) bonus += 3;
      else if (flagAccuracy >= 0.8) bonus += 1;
    }
    
    // 无提示奖励
    if (hintsUsed === 0) {
      bonus += 3;
    }
    
    // 高效率奖励
    if (efficiency >= 95) bonus += 3;
    else if (efficiency >= 90) bonus += 2;
    else if (efficiency >= 85) bonus += 1;
    
    return bonus;
  }

  /**
   * 改进的连胜奖励
   */
  private static calculateStreakBonus(consecutiveWins: number, bestStreak: number): number {
    let bonus = Math.min(consecutiveWins, 15); // 最多15FMH连胜奖励
    
    // 突破历史最佳连胜额外奖励
    if (consecutiveWins > bestStreak && bestStreak >= 5) {
      bonus += 5;
    }
    
    // 连胜里程碑奖励
    if (consecutiveWins === 10) bonus += 10;
    else if (consecutiveWins === 25) bonus += 25;
    else if (consecutiveWins === 50) bonus += 50;
    else if (consecutiveWins === 100) bonus += 100;
    
    return bonus;
  }

  /**
   * 等级奖励计算
   */
  private static calculateLevelBonus(level: PlayerLevel, baseAmount: number): number {
    const multipliers = {
      [PlayerLevel.BRONZE]: 0,
      [PlayerLevel.SILVER]: 0.1,   // +10%
      [PlayerLevel.GOLD]: 0.2,     // +20%  
      [PlayerLevel.PLATINUM]: 0.3, // +30%
      [PlayerLevel.DIAMOND]: 0.45, // +45%
      [PlayerLevel.LEGEND]: 0.6    // +60%
    };
    
    return Math.floor(baseAmount * multipliers[level]);
  }

  /**
   * VIP奖励计算
   */
  private static calculateVipBonus(vipLevel: number, baseAmount: number): number {
    const multiplier = this.VIP_MULTIPLIERS[Math.min(vipLevel, 5)] - 1;
    return Math.floor(baseAmount * multiplier);
  }

  /**
   * 质押奖励计算
   */
  private static calculateStakingBonus(stakingAmount: number, baseAmount: number): number {
    let bonusRate = 0;
    
    for (const [threshold, rate] of Object.entries(this.STAKING_BONUS_RATES).reverse()) {
      if (stakingAmount >= parseInt(threshold)) {
        bonusRate = rate;
        break;
      }
    }
    
    return Math.floor(baseAmount * bonusRate);
  }

  /**
   * 社交奖励计算
   */
  private static calculateSocialBonus(playerStats: PlayerStats, baseAmount: number): number {
    let bonus = 0;
    
    // 推荐奖励
    if (playerStats.referralCount >= 10) bonus += Math.floor(baseAmount * 0.05);
    else if (playerStats.referralCount >= 5) bonus += Math.floor(baseAmount * 0.03);
    else if (playerStats.referralCount >= 1) bonus += Math.floor(baseAmount * 0.01);
    
    // 社交分享奖励
    const shareBonus = Math.min(Math.floor(playerStats.socialShares * 0.5), Math.floor(baseAmount * 0.02));
    bonus += shareBonus;
    
    return bonus;
  }

  /**
   * 季节性活动奖励
   */
  private static calculateSeasonalBonus(gameResult: GameResult, activeEvents: SeasonalEvent[]): number {
    let totalBonus = 0;
    
    for (const event of activeEvents) {
      if (!event.isActive) continue;
      
      const now = Date.now();
      if (now >= event.startTime && now <= event.endTime) {
        // 检查是否满足活动条件
        if (this.checkEventConditions(gameResult, event.conditions)) {
          totalBonus += Math.floor(10 * event.bonusMultiplier);
        }
      }
    }
    
    return totalBonus;
  }

  /**
   * 检查季节性活动条件
   */
  private static checkEventConditions(gameResult: GameResult, conditions: string[]): boolean {
    for (const condition of conditions) {
      const [key, operator, value] = condition.split(' ');
      const gameValue = (gameResult as any)[key];
      
      switch (operator) {
        case '>=':
          if (!(gameValue >= parseFloat(value))) return false;
          break;
        case '<=':
          if (!(gameValue <= parseFloat(value))) return false;
          break;
        case '==':
          if (gameValue !== value) return false;
          break;
        default:
          return false;
      }
    }
    return true;
  }

  /**
   * 动态经济平衡调整
   */
  private static calculateDynamicMultiplier(
    totalPoolUsed: number, 
    dailyActiveUsers: number,
    globalWinRate: number,
    totalSupply: number
  ): number {
    let multiplier = 1.0;
    
    // 1. 奖励池使用率调整
    const poolUtilization = totalPoolUsed / this.BASE_DAILY_POOL_LIMIT;
    if (poolUtilization > 0.8) multiplier *= 0.85; // 池子快用完了，降低奖励
    else if (poolUtilization < 0.3) multiplier *= 1.1; // 池子用得少，可以提高奖励
    
    // 2. 活跃用户数调整
    if (dailyActiveUsers > 10000) multiplier *= 0.9; // 用户太多，降低单人奖励
    else if (dailyActiveUsers < 1000) multiplier *= 1.1; // 用户较少，提高奖励吸引人
    
    // 3. 全局胜率调整
    if (globalWinRate > 0.75) multiplier *= 0.85; // 胜率过高，可能有问题
    else if (globalWinRate < 0.3) multiplier *= 1.15; // 胜率过低，提高奖励
    
    // 4. 通胀控制
    const dailyInflation = totalPoolUsed / totalSupply;
    if (dailyInflation > this.ECONOMIC_BALANCE.maxDailyInflation) {
      multiplier *= 0.8; // 通胀过高，严格控制
    }
    
    return Math.max(0.5, Math.min(1.5, multiplier)); // 限制调整范围
  }

  /**
   * 玩家等级检查和升级
   */
  static checkAndUpdatePlayerLevel(stats: PlayerStats): { newLevel: PlayerLevel; upgraded: boolean } {
    const { totalWins, totalGames, fmhBalance, stakingAmount, referralCount } = stats;
    const winRate = totalGames > 0 ? totalWins / totalGames : 0;
    const currentLevel = stats.playerLevel;
    
    let newLevel = PlayerLevel.BRONZE;
    
    // 传说等级条件更加严格
    if (totalWins >= 500 && winRate >= 0.6 && fmhBalance >= 10000 && stakingAmount >= 5000) {
      newLevel = PlayerLevel.LEGEND;
    }
    // 新增钻石等级
    else if (totalWins >= 300 && winRate >= 0.55 && fmhBalance >= 5000 && referralCount >= 5) {
      newLevel = PlayerLevel.DIAMOND;
    }
    // 白金等级条件调整
    else if (totalWins >= 150 && winRate >= 0.5 && fmhBalance >= 2000) {
      newLevel = PlayerLevel.PLATINUM;
    }
    // 黄金等级条件调整
    else if (totalWins >= 75 && winRate >= 0.45 && fmhBalance >= 500) {
      newLevel = PlayerLevel.GOLD;
    }
    // 白银等级条件调整
    else if (totalWins >= 25 && winRate >= 0.4) {
      newLevel = PlayerLevel.SILVER;
    }
    
    return {
      newLevel,
      upgraded: newLevel !== currentLevel
    };
  }

  /**
   * 主要奖励计算函数 - V3.0增强版
   */
  static calculateReward(
    gameResult: GameResult, 
    playerStats: PlayerStats,
    economicData: {
      todayPoolUsed: number;
      dailyActiveUsers: number;
      globalWinRate: number;
      totalSupply: number;
    },
    activeEvents: SeasonalEvent[] = []
  ): RewardCalculationResult {
    
    if (!gameResult.isWon) {
      return {
        baseReward: 0,
        difficultyMultiplier: 0,
        timeBonus: 0,
        accuracyBonus: 0,
        streakBonus: 0,
        levelBonus: 0,
        vipBonus: 0,
        stakingBonus: 0,
        socialBonus: 0,
        seasonalBonus: 0,
        totalFMH: 0,
        breakdown: { base: 0, difficulty: 0, time: 0, accuracy: 0, streak: 0, level: 0, vip: 0, staking: 0, social: 0, seasonal: 0 },
        canClaim: false,
        reason: 'Game not won',
        dynamicMultiplier: 1.0
      };
    }

    // 1. 基础分数和FMH转换
    const baseScore = this.calculateBaseScore(gameResult);
    const baseFMH = Math.max(1, Math.floor(baseScore / 50)); // 提高转换率

    // 2. 难度系数计算
    const difficultyMultiplier = gameResult.difficulty === 'custom' 
      ? this.calculateCustomDifficultyMultiplier(gameResult.gameConfig)
      : this.DIFFICULTY_MULTIPLIERS[gameResult.difficulty];
    const difficultyFMH = Math.floor(baseFMH * (difficultyMultiplier - 1));

    // 3. 各种奖励计算
    const timeBonus = this.calculateTimeBonus(gameResult);
    const accuracyBonus = this.calculateAccuracyBonus(gameResult);
    const streakBonus = this.calculateStreakBonus(playerStats.consecutiveWins, playerStats.bestStreak);
    
    // 4. 基础奖励总和
    const baseTotal = baseFMH + difficultyFMH + timeBonus + accuracyBonus + streakBonus;
    
    // 5. 等级和进阶奖励
    const levelBonus = this.calculateLevelBonus(playerStats.playerLevel, baseTotal);
    const vipBonus = this.calculateVipBonus(playerStats.vipLevel, baseTotal);
    const stakingBonus = this.calculateStakingBonus(playerStats.stakingAmount, baseTotal);
    const socialBonus = this.calculateSocialBonus(playerStats, baseTotal);
    const seasonalBonus = this.calculateSeasonalBonus(gameResult, activeEvents);
    
    // 6. 总奖励（应用动态调整前）
    const subtotal = baseTotal + levelBonus + vipBonus + stakingBonus + socialBonus + seasonalBonus;
    
    // 7. 动态经济平衡调整
    const dynamicMultiplier = this.calculateDynamicMultiplier(
      economicData.todayPoolUsed,
      economicData.dailyActiveUsers, 
      economicData.globalWinRate,
      economicData.totalSupply
    );
    
    const totalFMH = Math.floor(subtotal * dynamicMultiplier);

    // 8. 限制检查
    const personalLimit = this.DAILY_PERSONAL_LIMITS[playerStats.playerLevel];
    const adjustedDailyLimit = Math.floor(this.BASE_DAILY_POOL_LIMIT * dynamicMultiplier);
    const poolRemaining = adjustedDailyLimit - economicData.todayPoolUsed;
    
    let canClaim = true;
    let reason = '';
    
    if (playerStats.todayEarned + totalFMH > personalLimit) {
      canClaim = false;
      reason = `Exceeds daily personal limit (${personalLimit} FMH)`;
    } else if (totalFMH > poolRemaining) {
      canClaim = false;
      reason = `Exceeds daily pool limit (${poolRemaining} FMH remaining)`;
    }

    return {
      baseReward: baseFMH,
      difficultyMultiplier,
      timeBonus,
      accuracyBonus,
      streakBonus,
      levelBonus,
      vipBonus,
      stakingBonus,
      socialBonus,
      seasonalBonus,
      totalFMH,
      breakdown: {
        base: baseFMH,
        difficulty: difficultyFMH,
        time: timeBonus,
        accuracy: accuracyBonus,
        streak: streakBonus,
        level: levelBonus,
        vip: vipBonus,
        staking: stakingBonus,
        social: socialBonus,
        seasonal: seasonalBonus
      },
      canClaim,
      reason,
      dynamicMultiplier
    };
  }

  /**
   * 推荐奖励计算
   */
  static calculateReferralReward(
    referrerStats: PlayerStats,
    newPlayerFirstGame: GameResult
  ): number {
    if (!newPlayerFirstGame.isWon) return 0;
    
    // 基础推荐奖励50 FMH
    let reward = 50;
    
    // 推荐者等级奖励
    const levelMultipliers = {
      [PlayerLevel.BRONZE]: 1.0,
      [PlayerLevel.SILVER]: 1.1,
      [PlayerLevel.GOLD]: 1.2,
      [PlayerLevel.PLATINUM]: 1.3,
      [PlayerLevel.DIAMOND]: 1.4,
      [PlayerLevel.LEGEND]: 1.5
    };
    
    reward *= levelMultipliers[referrerStats.playerLevel];
    
    // 新玩家表现奖励
    if (newPlayerFirstGame.perfectGame) reward += 10;
    if (newPlayerFirstGame.gameDuration < 60) reward += 5;
    
    return Math.floor(reward);
  }

  /**
   * 社交分享奖励
   */
  static calculateShareReward(
    shareType: 'twitter' | 'facebook' | 'discord' | 'telegram',
    gameResult: GameResult,
    dailyShares: number
  ): number {
    // 每日首次分享基础奖励
    const baseRewards = {
      twitter: 5,
      facebook: 3,
      discord: 4,
      telegram: 3
    };
    
    let reward = baseRewards[shareType];
    
    // 每日分享次数限制
    if (dailyShares >= 5) return 0; // 每日最多5次分享奖励
    
    // 高分游戏分享额外奖励
    if (gameResult.finalScore >= 5000) reward += 2;
    if (gameResult.perfectGame) reward += 3;
    
    return reward;
  }

  /**
   * 获取等级权益说明
   */
  static getLevelBenefits(level: PlayerLevel): string[] {
    const benefits = {
      [PlayerLevel.BRONZE]: [
        '每日上限: 500 FMH',
        '基础奖励计算'
      ],
      [PlayerLevel.SILVER]: [
        '每日上限: 550 FMH (+10%)',
        '等级奖励 +10%',
        '专属银色徽章'
      ],
      [PlayerLevel.GOLD]: [
        '每日上限: 650 FMH (+30%)',
        '等级奖励 +20%',
        '解锁高级皮肤',
        '专属金色头像框'
      ],
      [PlayerLevel.PLATINUM]: [
        '每日上限: 750 FMH (+50%)',
        '等级奖励 +30%',
        '社区提案投票权',
        '月度排行榜种子席位'
      ],
      [PlayerLevel.DIAMOND]: [
        '每日上限: 850 FMH (+70%)',
        '等级奖励 +45%',
        '钻石专属皮肤包',
        'VIP客服通道',
        '新功能优先体验'
      ],
      [PlayerLevel.LEGEND]: [
        '每日上限: 1000 FMH (+100%)',
        '等级奖励 +60%',
        '传说专属动态头像',
        '游戏开发意见咨询权',
        'FMH生态治理参与权',
        '年度传说玩家认证NFT'
      ]
    };
    
    return benefits[level] || [];
  }

  /**
   * 生成奖励发放签名
   */
  static generateRewardSignature(
    playerAddress: string,
    gameId: string | number,
    rewardAmount: number,
    timestamp: number,
    nonce: string
  ): string {
    const data = `${playerAddress}:${gameId}:${rewardAmount}:${timestamp}:${nonce}`;
    const secret = process.env.REWARD_SIGNATURE_SECRET || 'default-reward-secret';
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  }

  /**
   * 验证奖励发放签名
   */
  static verifyRewardSignature(
    playerAddress: string,
    gameId: string | number,
    rewardAmount: number,
    timestamp: number,
    nonce: string,
    signature: string
  ): boolean {
    const expectedSignature = this.generateRewardSignature(playerAddress, gameId, rewardAmount, timestamp, nonce);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }
}

export default RewardSystemV3;