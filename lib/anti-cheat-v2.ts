import crypto from 'crypto';

export interface GameSession {
  gameId: string | number;
  playerAddress: string;
  startTime: number;
  endTime: number;
  gameConfig: {
    width: number;
    height: number;
    mines: number;
    difficulty: string;
  };
  result: {
    isWon: boolean;
    score: number;
    duration: number;
    flagsUsed: number;
    cellsRevealed: number;
    moveSequence?: string; // 操作序列哈希
  };
  clientInfo: {
    userAgent: string;
    ipAddress: string;
    screenResolution: string;
    timezone: string;
    fingerprint: string;
  };
}

export interface SuspiciousActivity {
  type: 'IMPOSSIBLE_SPEED' | 'PATTERN_MATCH' | 'IP_ABUSE' | 'MULTI_ACCOUNT' | 'BOT_BEHAVIOR';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  evidence: any;
}

/**
 * 反作弊系统V2.0
 * 多维度检测和防护机制
 */
export class AntiCheatSystemV2 {
  private static readonly MIN_GAME_DURATION = 5; // 最短游戏时间（秒）
  private static readonly MAX_REASONABLE_SPEED = 10; // 每秒最大合理操作数
  private static readonly SAME_IP_LIMIT = 10; // 同IP每日游戏限制
  private static readonly PATTERN_THRESHOLD = 0.95; // 模式匹配阈值

  /**
   * 生成游戏会话签名
   */
  static generateGameSignature(gameSession: GameSession): string {
    const data = JSON.stringify({
      gameId: gameSession.gameId,
      playerAddress: gameSession.playerAddress,
      config: gameSession.gameConfig,
      result: gameSession.result,
      timestamp: gameSession.endTime
    });
    
    const secret = process.env.GAME_SIGNATURE_SECRET || 'default-secret-key';
    return crypto.createHmac('sha256', secret).update(data).digest('hex');
  }

  /**
   * 验证游戏会话签名
   */
  static verifyGameSignature(gameSession: GameSession, signature: string): boolean {
    const expectedSignature = this.generateGameSignature(gameSession);
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  /**
   * 主要反作弊检测函数
   */
  static async detectSuspiciousActivity(gameSession: GameSession): Promise<SuspiciousActivity[]> {
    const activities: SuspiciousActivity[] = [];

    // 1. 检测不可能的游戏速度
    const speedCheck = this.checkImpossibleSpeed(gameSession);
    if (speedCheck) activities.push(speedCheck);

    // 2. 检测操作模式
    const patternCheck = await this.checkSuspiciousPatterns(gameSession);
    if (patternCheck) activities.push(patternCheck);

    // 3. IP地址滥用检测
    const ipCheck = await this.checkIPAbuse(gameSession);
    if (ipCheck) activities.push(ipCheck);

    // 4. 多账户检测
    const multiAccountCheck = await this.checkMultiAccount(gameSession);
    if (multiAccountCheck) activities.push(multiAccountCheck);

    // 5. 机器人行为检测
    const botCheck = this.checkBotBehavior(gameSession);
    if (botCheck) activities.push(botCheck);

    return activities;
  }

  /**
   * 检测不可能的游戏速度
   */
  private static checkImpossibleSpeed(gameSession: GameSession): SuspiciousActivity | null {
    const { result, gameConfig } = gameSession;
    const { duration, cellsRevealed } = result;

    // 检查最小游戏时间
    if (duration < this.MIN_GAME_DURATION) {
      return {
        type: 'IMPOSSIBLE_SPEED',
        severity: 'CRITICAL',
        description: `Game completed too quickly: ${duration}s (minimum: ${this.MIN_GAME_DURATION}s)`,
        evidence: { duration, minimumRequired: this.MIN_GAME_DURATION }
      };
    }

    // 检查操作速度
    const operationsPerSecond = cellsRevealed / duration;
    if (operationsPerSecond > this.MAX_REASONABLE_SPEED) {
      return {
        type: 'IMPOSSIBLE_SPEED',
        severity: 'HIGH',
        description: `Unrealistic operation speed: ${operationsPerSecond.toFixed(2)} ops/sec`,
        evidence: { operationsPerSecond, maxReasonable: this.MAX_REASONABLE_SPEED }
      };
    }

    // 检查理论最快时间
    const theoreticalMinTime = Math.max(3, cellsRevealed * 0.1); // 每次操作至少0.1秒
    if (duration < theoreticalMinTime) {
      return {
        type: 'IMPOSSIBLE_SPEED',
        severity: 'HIGH',
        description: `Game duration below theoretical minimum: ${duration}s < ${theoreticalMinTime}s`,
        evidence: { actualDuration: duration, theoreticalMin: theoreticalMinTime }
      };
    }

    return null;
  }

  /**
   * 检测可疑操作模式
   */
  private static async checkSuspiciousPatterns(gameSession: GameSession): Promise<SuspiciousActivity | null> {
    try {
      const { playerAddress, result } = gameSession;
      
      // 获取该玩家最近的游戏记录
      const recentGames = await this.getRecentPlayerGames(playerAddress, 10);
      
      if (recentGames.length < 3) return null; // 数据不足

      // 检查游戏时长模式
      const durations = recentGames.map(g => g.result.duration);
      const similarity = this.calculatePatternSimilarity(durations);
      
      if (similarity > this.PATTERN_THRESHOLD) {
        return {
          type: 'PATTERN_MATCH',
          severity: 'MEDIUM',
          description: `Suspicious timing pattern detected (${(similarity * 100).toFixed(1)}% similarity)`,
          evidence: { durations, similarity }
        };
      }

      // 检查分数模式
      const scores = recentGames.map(g => g.result.score);
      const scoreSimilarity = this.calculatePatternSimilarity(scores);
      
      if (scoreSimilarity > this.PATTERN_THRESHOLD) {
        return {
          type: 'PATTERN_MATCH',
          severity: 'MEDIUM',
          description: `Suspicious score pattern detected (${(scoreSimilarity * 100).toFixed(1)}% similarity)`,
          evidence: { scores, similarity: scoreSimilarity }
        };
      }

      return null;
    } catch (error) {
      console.error('Pattern check failed:', error);
      return null;
    }
  }

  /**
   * 检测IP地址滥用
   */
  private static async checkIPAbuse(gameSession: GameSession): Promise<SuspiciousActivity | null> {
    try {
      const { clientInfo } = gameSession;
      const today = new Date().toDateString();
      
      const ipGamesCount = await this.getIPGamesCount(clientInfo.ipAddress, today);
      
      if (ipGamesCount > this.SAME_IP_LIMIT) {
        return {
          type: 'IP_ABUSE',
          severity: 'HIGH',
          description: `Excessive games from same IP: ${ipGamesCount} games today`,
          evidence: { ipAddress: clientInfo.ipAddress, gamesCount: ipGamesCount }
        };
      }

      return null;
    } catch (error) {
      console.error('IP abuse check failed:', error);
      return null;
    }
  }

  /**
   * 检测多账户滥用
   */
  private static async checkMultiAccount(gameSession: GameSession): Promise<SuspiciousActivity | null> {
    try {
      const { clientInfo, playerAddress } = gameSession;
      
      // 检查相同设备指纹的不同地址
      const accountsWithSameFingerprint = await this.getAccountsByFingerprint(clientInfo.fingerprint);
      
      if (accountsWithSameFingerprint.length > 3 && !accountsWithSameFingerprint.includes(playerAddress)) {
        return {
          type: 'MULTI_ACCOUNT',
          severity: 'HIGH',
          description: `Multiple accounts detected from same device: ${accountsWithSameFingerprint.length} accounts`,
          evidence: { fingerprint: clientInfo.fingerprint, accounts: accountsWithSameFingerprint }
        };
      }

      return null;
    } catch (error) {
      console.error('Multi-account check failed:', error);
      return null;
    }
  }

  /**
   * 检测机器人行为
   */
  private static checkBotBehavior(gameSession: GameSession): SuspiciousActivity | null {
    const { clientInfo, result, startTime, endTime } = gameSession;

    // 检查用户代理字符串
    const suspiciousUAPatterns = [
      /headless/i,
      /phantom/i,
      /selenium/i,
      /webdriver/i,
      /puppeteer/i
    ];

    for (const pattern of suspiciousUAPatterns) {
      if (pattern.test(clientInfo.userAgent)) {
        return {
          type: 'BOT_BEHAVIOR',
          severity: 'CRITICAL',
          description: `Suspicious user agent detected: ${clientInfo.userAgent}`,
          evidence: { userAgent: clientInfo.userAgent, pattern: pattern.toString() }
        };
      }
    }

    // 检查时间戳合理性
    const sessionDuration = endTime - startTime;
    if (Math.abs(sessionDuration - result.duration * 1000) > 5000) { // 5秒容差
      return {
        type: 'BOT_BEHAVIOR',
        severity: 'MEDIUM',
        description: 'Session timestamp inconsistency detected',
        evidence: { 
          sessionDuration, 
          reportedDuration: result.duration * 1000,
          difference: Math.abs(sessionDuration - result.duration * 1000)
        }
      };
    }

    return null;
  }

  /**
   * 计算数值序列的相似度
   */
  private static calculatePatternSimilarity(values: number[]): number {
    if (values.length < 2) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    // 标准差越小，相似度越高
    const maxExpectedStdDev = mean * 0.3; // 期望标准差为均值的30%
    return Math.max(0, 1 - stdDev / maxExpectedStdDev);
  }

  /**
   * 获取玩家最近游戏记录（模拟）
   */
  private static async getRecentPlayerGames(playerAddress: string, limit: number): Promise<GameSession[]> {
    // 实际实现中应该查询数据库
    try {
      const response = await fetch(`/api/anti-cheat/recent-games?address=${playerAddress}&limit=${limit}`);
      const data = await response.json();
      return data.games || [];
    } catch {
      return [];
    }
  }

  /**
   * 获取IP地址今日游戏次数（模拟）
   */
  private static async getIPGamesCount(ipAddress: string, date: string): Promise<number> {
    try {
      const response = await fetch(`/api/anti-cheat/ip-games?ip=${ipAddress}&date=${date}`);
      const data = await response.json();
      return data.count || 0;
    } catch {
      return 0;
    }
  }

  /**
   * 根据设备指纹获取账户列表（模拟）
   */
  private static async getAccountsByFingerprint(fingerprint: string): Promise<string[]> {
    try {
      const response = await fetch(`/api/anti-cheat/accounts-by-fingerprint?fingerprint=${fingerprint}`);
      const data = await response.json();
      return data.accounts || [];
    } catch {
      return [];
    }
  }

  /**
   * 记录可疑活动
   */
  static async logSuspiciousActivity(gameSession: GameSession, activities: SuspiciousActivity[]): Promise<void> {
    if (activities.length === 0) return;

    try {
      await fetch('/api/anti-cheat/log-suspicious', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: gameSession.gameId,
          playerAddress: gameSession.playerAddress,
          activities,
          timestamp: Date.now()
        })
      });
    } catch (error) {
      console.error('Failed to log suspicious activity:', error);
    }
  }

  /**
   * 判断是否应该阻止奖励发放
   */
  static shouldBlockReward(activities: SuspiciousActivity[]): { shouldBlock: boolean; reason?: string } {
    const criticalActivities = activities.filter(a => a.severity === 'CRITICAL');
    const highActivities = activities.filter(a => a.severity === 'HIGH');

    if (criticalActivities.length > 0) {
      return {
        shouldBlock: true,
        reason: `Critical suspicious activity detected: ${criticalActivities[0].description}`
      };
    }

    if (highActivities.length >= 2) {
      return {
        shouldBlock: true,
        reason: `Multiple high-risk activities detected: ${highActivities.map(a => a.type).join(', ')}`
      };
    }

    return { shouldBlock: false };
  }

  /**
   * 生成设备指纹（客户端调用）
   */
  static generateDeviceFingerprint(): string {
    if (typeof window === 'undefined') return 'server';
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    ctx!.textBaseline = 'top';
    ctx!.font = '14px Arial';
    ctx!.fillText('Device fingerprint', 2, 2);
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height,
      new Date().getTimezoneOffset(),
      navigator.platform,
      canvas.toDataURL()
    ].join('|');
    
    // 在浏览器环境中使用Web Crypto API
    return btoa(fingerprint).substring(0, 32);
  }
}

export default AntiCheatSystemV2;