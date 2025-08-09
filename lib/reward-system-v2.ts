import { GameConfig } from '../src/types/game';

export interface GameResult {
  gameId: number | string;
  playerAddress: string;
  gameConfig: GameConfig;
  finalScore: number;
  gameDuration: number; // 秒数
  flagsUsed: number;
  isWon: boolean;
  cellsRevealed: number;
  perfectGame: boolean; // 无误点
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface PlayerStats {
  consecutiveWins: number;
  todayEarned: number; // 今日已获得FMH
  playerLevel: PlayerLevel;
  totalWins: number;
  totalGames: number;
  lastPlayTime: number;
}

export enum PlayerLevel {
  BRONZE = 'bronze',
  SILVER = 'silver', 
  GOLD = 'gold',
  PLATINUM = 'platinum',
  LEGEND = 'legend'
}

export interface RewardCalculationResult {
  baseReward: number;
  difficultyMultiplier: number;
  timeBonus: number;
  accuracyBonus: number;
  streakBonus: number;
  levelBonus: number;
  totalFMH: number;
  breakdown: {
    base: number;
    difficulty: number;
    time: number;
    accuracy: number;
    streak: number;
    level: number;
  };
  canClaim: boolean;
  reason?: string;
}

/**
 * FMH代币奖励体系V2.0核心计算逻辑
 */
export class RewardSystemV2 {
  // 全站每日奖励池上限
  private static readonly DAILY_POOL_LIMIT = 100000; // FMH
  
  // 单人每日限制
  private static readonly DAILY_PERSONAL_LIMITS = {
    [PlayerLevel.BRONZE]: 500,
    [PlayerLevel.SILVER]: 550, // +10%
    [PlayerLevel.GOLD]: 600,   // +20%
    [PlayerLevel.PLATINUM]: 650, // +30%
    [PlayerLevel.LEGEND]: 750    // +50%
  };

  // 难度系数
  private static readonly DIFFICULTY_MULTIPLIERS = {
    easy: 1,
    medium: 2,
    hard: 3
  };

  /**
   * 计算基础游戏分数
   */
  private static calculateBaseScore(gameResult: GameResult): number {
    const { gameConfig, gameDuration, flagsUsed } = gameResult;
    
    // 奖励基数 = (宽度 * 高度) - 地雷数量
    const baseReward = (gameConfig.width * gameConfig.height) - gameConfig.mines;
    
    // 时间奖励 = max(0, 100 - 用时秒数)
    const timeBonus = Math.max(0, 100 - gameDuration);
    
    // 效率奖励 = max(0, 地雷数 - 使用标旗数) * 10
    const efficiencyBonus = Math.max(0, gameConfig.mines - flagsUsed) * 10;
    
    return baseReward + timeBonus + efficiencyBonus;
  }

  /**
   * 计算时间加成奖励
   */
  private static calculateTimeBonus(duration: number): number {
    if (duration <= 100) {
      // 100秒内完成，额外2-5 FMH
      const bonus = Math.max(2, 5 - Math.floor(duration / 20));
      return bonus;
    }
    return 0;
  }

  /**
   * 计算精准度加成
   */
  private static calculateAccuracyBonus(gameResult: GameResult): number {
    const { perfectGame, flagsUsed, gameConfig } = gameResult;
    
    let bonus = 0;
    
    // 完美游戏（无误点）+3 FMH
    if (perfectGame) {
      bonus += 3;
    }
    
    // 标旗使用精准度奖励
    const flagAccuracy = gameConfig.mines > 0 ? 
      1 - Math.abs(flagsUsed - gameConfig.mines) / gameConfig.mines : 1;
    
    if (flagAccuracy >= 0.9) {
      bonus += 2; // 90%以上精准度额外奖励
    } else if (flagAccuracy >= 0.8) {
      bonus += 1; // 80%以上精准度奖励
    }
    
    return bonus;
  }

  /**
   * 计算连胜加成
   */
  private static calculateStreakBonus(consecutiveWins: number): number {
    // 连胜每+1场，额外+1 FMH，最多+10 FMH
    return Math.min(consecutiveWins, 10);
  }

  /**
   * 计算等级加成
   */
  private static calculateLevelBonus(level: PlayerLevel, baseAmount: number): number {
    const multipliers = {
      [PlayerLevel.BRONZE]: 0,
      [PlayerLevel.SILVER]: 0.1,  // +10%
      [PlayerLevel.GOLD]: 0.2,    // +20%  
      [PlayerLevel.PLATINUM]: 0.3, // +30%
      [PlayerLevel.LEGEND]: 0.5    // +50%
    };
    
    return Math.floor(baseAmount * multipliers[level]);
  }

  /**
   * 检查玩家等级
   */
  static getPlayerLevel(stats: { totalWins: number, totalGames: number, fmhBalance: number }): PlayerLevel {
    const { totalWins, totalGames, fmhBalance } = stats;
    const winRate = totalGames > 0 ? totalWins / totalGames : 0;
    
    if (totalWins >= 500 && fmhBalance >= 1000) {
      return PlayerLevel.LEGEND;
    } else if (totalWins >= 100 && winRate >= 0.5 && fmhBalance >= 100) {
      return PlayerLevel.PLATINUM;
    } else if (totalWins >= 100 && winRate >= 0.5) {
      return PlayerLevel.GOLD;
    } else if (totalWins >= 50) {
      return PlayerLevel.SILVER;
    } else {
      return PlayerLevel.BRONZE;
    }
  }

  /**
   * 主要奖励计算函数
   */
  static calculateReward(
    gameResult: GameResult, 
    playerStats: PlayerStats,
    todayPoolUsed: number = 0
  ): RewardCalculationResult {
    
    if (!gameResult.isWon) {
      return {
        baseReward: 0,
        difficultyMultiplier: 0,
        timeBonus: 0,
        accuracyBonus: 0,
        streakBonus: 0,
        levelBonus: 0,
        totalFMH: 0,
        breakdown: { base: 0, difficulty: 0, time: 0, accuracy: 0, streak: 0, level: 0 },
        canClaim: false,
        reason: 'Game not won'
      };
    }

    // 1. 基础分数转换为FMH（简化：分数/100作为基础FMH）
    const baseScore = this.calculateBaseScore(gameResult);
    const baseFMH = Math.floor(baseScore / 100);

    // 2. 难度系数
    const difficultyMultiplier = this.DIFFICULTY_MULTIPLIERS[gameResult.difficulty];
    const difficultyFMH = baseFMH * (difficultyMultiplier - 1); // 额外奖励部分

    // 3. 各种加成
    const timeBonus = this.calculateTimeBonus(gameResult.gameDuration);
    const accuracyBonus = this.calculateAccuracyBonus(gameResult);
    const streakBonus = this.calculateStreakBonus(playerStats.consecutiveWins);
    
    // 4. 等级加成（基于总基础奖励）
    const baseTotal = baseFMH + difficultyFMH + timeBonus + accuracyBonus + streakBonus;
    const levelBonus = this.calculateLevelBonus(playerStats.playerLevel, baseTotal);
    
    // 5. 总奖励
    const totalFMH = baseTotal + levelBonus;

    // 6. 检查限制
    const personalLimit = this.DAILY_PERSONAL_LIMITS[playerStats.playerLevel];
    const poolRemaining = this.DAILY_POOL_LIMIT - todayPoolUsed;
    
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
      totalFMH: Math.floor(totalFMH),
      breakdown: {
        base: baseFMH,
        difficulty: difficultyFMH,
        time: timeBonus,
        accuracy: accuracyBonus,
        streak: streakBonus,
        level: levelBonus
      },
      canClaim,
      reason
    };
  }

  /**
   * 动态调整奖励比例（根据胜率）
   */
  static applyDynamicAdjustment(baseReward: number, globalWinRate: number): number {
    // 如果全站胜率过高，降低奖励
    if (globalWinRate > 0.7) {
      return baseReward * 0.8; // 降低20%
    } else if (globalWinRate > 0.6) {
      return baseReward * 0.9; // 降低10%
    }
    return baseReward;
  }

  /**
   * 获取等级权益说明
   */
  static getLevelBenefits(level: PlayerLevel): string[] {
    const benefits = {
      [PlayerLevel.BRONZE]: ['每日上限: 500 FMH'],
      [PlayerLevel.SILVER]: ['每日上限: +10%', '专属徽章'],
      [PlayerLevel.GOLD]: ['每日上限: +20%', '高级皮肤资格'],
      [PlayerLevel.PLATINUM]: ['每日上限: +30%', '提案投票权'],
      [PlayerLevel.LEGEND]: ['每日上限: +50%', '内测资格', 'FMH生态权限']
    };
    
    return benefits[level] || [];
  }
}

// 导出类型和函数
export default RewardSystemV2;