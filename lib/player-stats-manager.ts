import { PlayerLevel, PlayerStats } from './reward-system-v2';

export interface PlayerGameHistory {
  id: string;
  gameId: string | number;
  isWon: boolean;
  playedAt: number;
  fmhEarned: number;
  difficulty: string;
}

export interface DailyStats {
  date: string; // YYYY-MM-DD
  gamesPlayed: number;
  gamesWon: number;
  fmhEarned: number;
  lastUpdated: number;
}

/**
 * 玩家统计和状态管理器
 */
export class PlayerStatsManager {
  private playerAddress: string;
  private stats: PlayerStats | null = null;
  
  constructor(playerAddress: string) {
    this.playerAddress = playerAddress;
  }

  /**
   * 从数据库加载玩家统计
   */
  async loadPlayerStats(): Promise<PlayerStats> {
    try {
      const response = await fetch(`/api/players/stats?address=${this.playerAddress}`);
      const data = await response.json();
      
      if (data.success) {
        this.stats = {
          consecutiveWins: data.stats.consecutiveWins || 0,
          todayEarned: data.stats.todayEarned || 0,
          playerLevel: data.stats.playerLevel || PlayerLevel.BRONZE,
          totalWins: data.stats.totalWins || 0,
          totalGames: data.stats.totalGames || 0,
          lastPlayTime: data.stats.lastPlayTime || 0
        };
      } else {
        // 新玩家，创建默认统计
        this.stats = this.createDefaultStats();
      }
      
      return this.stats;
    } catch (error) {
      console.error('Failed to load player stats:', error);
      this.stats = this.createDefaultStats();
      return this.stats;
    }
  }

  /**
   * 创建默认玩家统计
   */
  private createDefaultStats(): PlayerStats {
    return {
      consecutiveWins: 0,
      todayEarned: 0,
      playerLevel: PlayerLevel.BRONZE,
      totalWins: 0,
      totalGames: 0,
      lastPlayTime: 0
    };
  }

  /**
   * 更新连胜记录
   */
  async updateStreakRecord(won: boolean): Promise<void> {
    if (!this.stats) {
      await this.loadPlayerStats();
    }

    if (won) {
      this.stats!.consecutiveWins += 1;
    } else {
      this.stats!.consecutiveWins = 0; // 重置连胜
    }

    this.stats!.totalGames += 1;
    if (won) {
      this.stats!.totalWins += 1;
    }
    
    this.stats!.lastPlayTime = Date.now();

    // 保存到数据库
    await this.savePlayerStats();
  }

  /**
   * 更新今日收入
   */
  async updateTodayEarnings(fmhAmount: number): Promise<void> {
    if (!this.stats) {
      await this.loadPlayerStats();
    }

    // 检查是否是新的一天
    const today = new Date().toDateString();
    const lastPlayDay = new Date(this.stats!.lastPlayTime).toDateString();
    
    if (today !== lastPlayDay) {
      // 新的一天，重置今日收入
      this.stats!.todayEarned = 0;
    }

    this.stats!.todayEarned += fmhAmount;
    await this.savePlayerStats();
  }

  /**
   * 更新玩家等级
   */
  async updatePlayerLevel(fmhBalance: number): Promise<PlayerLevel> {
    if (!this.stats) {
      await this.loadPlayerStats();
    }

    const newLevel = this.calculatePlayerLevel(fmhBalance);
    
    if (newLevel !== this.stats!.playerLevel) {
      console.log(`Player level upgraded: ${this.stats!.playerLevel} -> ${newLevel}`);
      this.stats!.playerLevel = newLevel;
      await this.savePlayerStats();
      
      // 可以在这里触发升级奖励或通知
      await this.handleLevelUpgrade(newLevel);
    }

    return newLevel;
  }

  /**
   * 计算玩家等级
   */
  private calculatePlayerLevel(fmhBalance: number): PlayerLevel {
    const { totalWins, totalGames } = this.stats!;
    const winRate = totalGames > 0 ? totalWins / totalGames : 0;
    
    if (totalWins >= 500 && fmhBalance >= 1000) {
      return PlayerLevel.LEGEND;
    } else if (fmhBalance >= 100 && totalWins >= 100 && winRate >= 0.5) {
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
   * 处理等级升级
   */
  private async handleLevelUpgrade(newLevel: PlayerLevel): Promise<void> {
    try {
      await fetch('/api/players/level-upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerAddress: this.playerAddress,
          newLevel,
          timestamp: Date.now()
        })
      });
    } catch (error) {
      console.error('Failed to handle level upgrade:', error);
    }
  }

  /**
   * 保存玩家统计到数据库
   */
  private async savePlayerStats(): Promise<void> {
    try {
      await fetch('/api/players/stats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerAddress: this.playerAddress,
          stats: this.stats
        })
      });
    } catch (error) {
      console.error('Failed to save player stats:', error);
    }
  }

  /**
   * 获取当前统计
   */
  getCurrentStats(): PlayerStats | null {
    return this.stats;
  }

  /**
   * 获取今日剩余额度
   */
  getTodayRemainingLimit(): number {
    if (!this.stats) return 0;
    
    const limits = {
      [PlayerLevel.BRONZE]: 500,
      [PlayerLevel.SILVER]: 550,
      [PlayerLevel.GOLD]: 600,
      [PlayerLevel.PLATINUM]: 650,
      [PlayerLevel.LEGEND]: 750
    };
    
    const limit = limits[this.stats.playerLevel];
    return Math.max(0, limit - this.stats.todayEarned);
  }

  /**
   * 检查是否可以继续游戏（防滥用）
   */
  canPlayMore(): { canPlay: boolean; reason?: string } {
    if (!this.stats) {
      return { canPlay: true };
    }

    // 检查今日是否已达上限
    const remaining = this.getTodayRemainingLimit();
    if (remaining <= 0) {
      return { 
        canPlay: false, 
        reason: `Daily FMH limit reached. Upgrade your level to increase limit.` 
      };
    }

    // 检查连续游戏频率（防机器人）
    const now = Date.now();
    const timeSinceLastGame = now - this.stats.lastPlayTime;
    if (timeSinceLastGame < 10000) { // 10秒内不能连续游戏
      return {
        canPlay: false,
        reason: 'Please wait a moment before starting another game.'
      };
    }

    return { canPlay: true };
  }

  /**
   * 获取玩家成就进度
   */
  getAchievementProgress(): any {
    if (!this.stats) return {};

    const { totalWins, totalGames } = this.stats;
    const winRate = totalGames > 0 ? totalWins / totalGames : 0;

    return {
      nextLevelProgress: this.calculateNextLevelProgress(),
      achievements: {
        firstWin: totalWins >= 1,
        tenWins: totalWins >= 10,
        fiftyWins: totalWins >= 50,
        hundredWins: totalWins >= 100,
        fiveHundredWins: totalWins >= 500,
        goodWinRate: winRate >= 0.6,
        excellentWinRate: winRate >= 0.8,
        streakMaster: this.stats.consecutiveWins >= 10
      }
    };
  }

  /**
   * 计算下一等级进度
   */
  private calculateNextLevelProgress(): { current: PlayerLevel; next?: PlayerLevel; progress: number; requirement: string } {
    if (!this.stats) {
      return { 
        current: PlayerLevel.BRONZE, 
        next: PlayerLevel.SILVER,
        progress: 0, 
        requirement: 'Win 50 games' 
      };
    }

    const { totalWins, totalGames, playerLevel } = this.stats;
    const winRate = totalGames > 0 ? totalWins / totalGames : 0;

    switch (playerLevel) {
      case PlayerLevel.BRONZE:
        return {
          current: playerLevel,
          next: PlayerLevel.SILVER,
          progress: Math.min(100, (totalWins / 50) * 100),
          requirement: `Win ${Math.max(0, 50 - totalWins)} more games`
        };
      
      case PlayerLevel.SILVER:
        return {
          current: playerLevel,
          next: PlayerLevel.GOLD,
          progress: Math.min(100, (totalWins / 100) * 100),
          requirement: `Win ${Math.max(0, 100 - totalWins)} more games with 50%+ win rate`
        };
      
      case PlayerLevel.GOLD:
        return {
          current: playerLevel,
          next: PlayerLevel.PLATINUM,
          progress: 100, // Already achieved game requirements
          requirement: 'Hold 100+ FMH tokens'
        };
      
      case PlayerLevel.PLATINUM:
        return {
          current: playerLevel,
          next: PlayerLevel.LEGEND,
          progress: Math.min(100, (totalWins / 500) * 100),
          requirement: `Win ${Math.max(0, 500 - totalWins)} more games and hold 1000+ FMH`
        };
      
      default:
        return {
          current: PlayerLevel.LEGEND,
          progress: 100,
          requirement: 'Maximum level achieved!'
        };
    }
  }
}

export default PlayerStatsManager;