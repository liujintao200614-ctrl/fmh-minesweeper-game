import { getDatabase } from './database.js';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class CacheManager {
  private static instance: CacheManager | null = null;
  private memoryCache = new Map<string, CacheEntry<any>>();
  private readonly defaultTTL = 5 * 60 * 1000; // 5分钟
  private readonly maxMemorySize = 1000; // 最大缓存条目数

  static getInstance(): CacheManager {
    if (!this.instance) {
      this.instance = new CacheManager();
    }
    return this.instance;
  }

  // 生成缓存键
  private generateKey(prefix: string, params: any): string {
    const paramString = typeof params === 'object' 
      ? JSON.stringify(params) 
      : String(params);
    return `${prefix}:${paramString}`;
  }

  // 设置缓存
  set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    const now = Date.now();
    const expiresAt = now + ttl;

    // 如果缓存已满，清理最旧的条目
    if (this.memoryCache.size >= this.maxMemorySize) {
      this.cleanup();
    }

    this.memoryCache.set(key, {
      data,
      timestamp: now,
      expiresAt
    });
  }

  // 获取缓存
  get<T>(key: string): T | null {
    const entry = this.memoryCache.get(key);
    
    if (!entry) {
      return null;
    }

    // 检查是否过期
    if (Date.now() > entry.expiresAt) {
      this.memoryCache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  // 删除缓存
  delete(key: string): boolean {
    return this.memoryCache.delete(key);
  }

  // 清理过期缓存
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.memoryCache.entries()) {
      if (now > entry.expiresAt) {
        this.memoryCache.delete(key);
      }
    }
  }

  // 清空所有缓存
  clear(): void {
    this.memoryCache.clear();
  }

  // 获取缓存统计信息
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    totalHits: number;
    totalMisses: number;
  } {
    return {
      size: this.memoryCache.size,
      maxSize: this.maxMemorySize,
      hitRate: 0, // 需要实现命中率统计
      totalHits: 0,
      totalMisses: 0
    };
  }
}

// 数据库缓存装饰器
export function withCache<T>(
  prefix: string,
  ttl: number = 5 * 60 * 1000
) {
  return function (
    target: any,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value;
    const cache = CacheManager.getInstance();

    descriptor.value = async function (...args: any[]) {
      const cacheKey = cache.generateKey(prefix, args);
      
      // 尝试从缓存获取
      const cached = cache.get<T>(cacheKey);
      if (cached !== null) {
        return cached;
      }

      // 执行原始方法
      const result = await method.apply(this, args);
      
      // 缓存结果
      cache.set(cacheKey, result, ttl);
      
      return result;
    };
  };
}

// 排行榜缓存管理器
export class LeaderboardCache {
  private static cache = CacheManager.getInstance();
  private static readonly LEADERBOARD_TTL = 2 * 60 * 1000; // 2分钟
  private static readonly STATS_TTL = 5 * 60 * 1000; // 5分钟

  static async getLeaderboard(difficulty?: string, limit: number = 50) {
    const cacheKey = `leaderboard:${difficulty || 'all'}:${limit}`;
    
    let result = this.cache.get(cacheKey);
    if (result) {
      return result;
    }

    const db = await getDatabase();
    const whereClause = difficulty && difficulty !== 'All' 
      ? 'WHERE gs.difficulty = ?' 
      : 'WHERE 1=1';
    
    const params = difficulty && difficulty !== 'All' ? [difficulty, limit] : [limit];
    
    result = await db.all(`
      SELECT 
        u.wallet_address as playerAddress,
        u.username,
        MAX(gs.final_score) as bestScore,
        MIN(CASE WHEN gs.is_won = 1 THEN gs.game_duration END) as bestTime,
        COUNT(gs.id) as totalGames,
        COUNT(CASE WHEN gs.is_won = 1 THEN 1 END) as totalWins,
        AVG(gs.final_score) as averageScore
      FROM users u
      LEFT JOIN game_sessions gs ON u.id = gs.user_id
      ${whereClause}
      GROUP BY u.id, u.wallet_address
      HAVING totalWins > 0
      ORDER BY bestScore DESC, bestTime ASC
      LIMIT ?
    `, params);

    // 添加排名
    const leaderboard = result.map((row: any, index: number) => ({
      ...row,
      rank: index + 1,
      averageScore: Math.round(row.averageScore || 0),
      bestTime: row.bestTime || 0
    }));

    this.cache.set(cacheKey, leaderboard, this.LEADERBOARD_TTL);
    return leaderboard;
  }

  static async getGameStats() {
    const cacheKey = 'game_stats';
    
    let result = this.cache.get(cacheKey);
    if (result) {
      return result;
    }

    const db = await getDatabase();
    result = await db.get(`
      SELECT 
        COUNT(gs.id) as totalGames,
        COUNT(DISTINCT u.id) as totalPlayers,
        AVG(gs.final_score) as averageScore,
        MAX(gs.final_score) as topScore
      FROM game_sessions gs
      JOIN users u ON gs.user_id = u.id
      WHERE gs.is_won = 1
    `);

    const stats = {
      totalGames: result.totalGames || 0,
      totalPlayers: result.totalPlayers || 0,
      averageScore: Math.round(result.averageScore || 0),
      topScore: result.topScore || 0
    };

    this.cache.set(cacheKey, stats, this.STATS_TTL);
    return stats;
  }

  static async getUserProfile(walletAddress: string) {
    const cacheKey = `user_profile:${walletAddress}`;
    
    let result = this.cache.get(cacheKey);
    if (result) {
      return result;
    }

    const db = await getDatabase();
    result = await db.get(`
      SELECT 
        u.*,
        COUNT(gs.id) as total_sessions,
        COUNT(CASE WHEN gs.is_won = 1 THEN 1 END) as actual_wins,
        AVG(CASE WHEN gs.is_won = 1 THEN gs.game_duration END) as avg_win_time,
        MAX(gs.final_score) as highest_score,
        MIN(CASE WHEN gs.is_won = 1 THEN gs.game_duration END) as fastest_win,
        COUNT(ua.id) as achievement_count_actual,
        SUM(gs.reward_amount) as total_rewards_actual
      FROM users u
      LEFT JOIN game_sessions gs ON u.id = gs.user_id
      LEFT JOIN user_achievements ua ON u.id = ua.user_id
      WHERE u.wallet_address = ?
      GROUP BY u.id
    `, [walletAddress]);

    this.cache.set(cacheKey, result, this.STATS_TTL);
    return result;
  }

  // 清除特定用户的缓存
  static invalidateUserCache(walletAddress: string) {
    this.cache.delete(`user_profile:${walletAddress}`);
  }

  // 清除排行榜缓存
  static invalidateLeaderboardCache() {
    // 清除所有排行榜相关的缓存
    for (const key of this.cache.memoryCache.keys()) {
      if (key.startsWith('leaderboard:')) {
        this.cache.delete(key);
      }
    }
  }

  // 清除所有缓存
  static clearAll() {
    this.cache.clear();
  }
}

// 导出缓存管理器实例
export const cacheManager = CacheManager.getInstance();
export default CacheManager; 