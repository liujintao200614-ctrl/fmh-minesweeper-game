import type { NextApiRequest, NextApiResponse } from 'next';
import RewardSystemV3, { GameResult, PlayerStats, RewardCalculationResult, SeasonalEvent } from '../../../lib/reward-system-v3';
import AntiCheatSystemV3 from '../../../lib/anti-cheat-v3';
import AchievementSystemV3 from '../../../lib/achievement-system-v3';
import { rateLimit } from '../../../lib/rateLimit';
import crypto from 'crypto';

interface RewardRequest {
  gameResult: GameResult;
  playerStats: PlayerStats;
  signature: string;
  timestamp: number;
  nonce: string;
}

interface RewardResponse {
  success: boolean;
  reward: RewardCalculationResult | null;
  achievements: any[];
  canClaim: boolean;
  claimSignature?: string;
  expiresAt?: number;
  error?: string;
  sessionId: string;
}

// 速率限制：每个地址每分钟最多10次奖励计算
const limiter = rateLimit({
  interval: 60 * 1000,
  uniqueTokenPerInterval: 1000,
});

// 全局经济数据缓存
let economicDataCache: {
  data: any;
  lastUpdate: number;
} = { data: null, lastUpdate: 0 };

const CACHE_DURATION = 60000; // 1分钟缓存

/**
 * 奖励计算API端点
 * POST /api/rewards/calculate
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RewardResponse>
) {
  const sessionId = crypto.randomUUID();

  try {
    if (req.method !== 'POST') {
      return res.status(405).json({
        success: false,
        reward: null,
        achievements: [],
        canClaim: false,
        sessionId,
        error: 'Method not allowed'
      });
    }

    const { gameResult, playerStats, signature, timestamp, nonce } = req.body as RewardRequest;

    // 参数验证
    if (!gameResult || !playerStats || !signature || !timestamp || !nonce) {
      return res.status(400).json({
        success: false,
        reward: null,
        achievements: [],
        canClaim: false,
        sessionId,
        error: 'Missing required parameters'
      });
    }

    // 速率限制
    try {
      await limiter.check(res, 10, gameResult.playerAddress);
    } catch {
      return res.status(429).json({
        success: false,
        reward: null,
        achievements: [],
        canClaim: false,
        sessionId,
        error: 'Rate limit exceeded'
      });
    }

    // 时间戳验证
    const now = Date.now();
    if (Math.abs(now - timestamp) > 300000) { // 5分钟有效期
      return res.status(400).json({
        success: false,
        reward: null,
        achievements: [],
        canClaim: false,
        sessionId,
        error: 'Invalid timestamp'
      });
    }

    // Nonce验证（防重放）
    const isNonceUsed = await checkNonceUsed(nonce, gameResult.playerAddress);
    if (isNonceUsed) {
      return res.status(400).json({
        success: false,
        reward: null,
        achievements: [],
        canClaim: false,
        sessionId,
        error: 'Nonce already used'
      });
    }

    // 签名验证
    const expectedSignature = RewardSystemV3.generateRewardSignature(
      gameResult.playerAddress,
      gameResult.gameId,
      gameResult.finalScore,
      timestamp,
      nonce
    );

    if (!RewardSystemV3.verifyRewardSignature(
      gameResult.playerAddress,
      gameResult.gameId,
      gameResult.finalScore,
      timestamp,
      nonce,
      signature
    )) {
      return res.status(401).json({
        success: false,
        reward: null,
        achievements: [],
        canClaim: false,
        sessionId,
        error: 'Invalid signature'
      });
    }

    // 标记Nonce为已使用
    await markNonceUsed(nonce, gameResult.playerAddress, gameResult.gameId);

    // 获取经济数据
    const economicData = await getEconomicData();

    // 获取活跃的季节性事件
    const activeEvents = await getActiveSeasonalEvents();

    // 计算奖励
    const rewardResult = RewardSystemV3.calculateReward(
      gameResult,
      playerStats,
      economicData,
      activeEvents
    );

    // 检查成就解锁
    const unlockedAchievements = await AchievementSystemV3.checkAchievements(
      gameResult.playerAddress,
      gameResult,
      playerStats
    );

    // 检查反作弊（如果游戏获胜）
    let antiCheatResult = { shouldBlock: false, confidence: 0 };
    if (gameResult.isWon && rewardResult.canClaim) {
      // 构建游戏会话数据进行检测
      const gameSession = buildGameSessionFromResult(gameResult, req);
      const activities = await AntiCheatSystemV3.detectSuspiciousActivity(gameSession);
      
      if (activities.length > 0) {
        const riskProfile = await AntiCheatSystemV3.updateRiskProfile(
          gameResult.playerAddress,
          activities
        );
        antiCheatResult = AntiCheatSystemV3.shouldBlockReward(activities, riskProfile);
      }
    }

    // 如果反作弊系统建议阻止，则更新结果
    if (antiCheatResult.shouldBlock) {
      rewardResult.canClaim = false;
      rewardResult.reason = `Security check failed: ${antiCheatResult.confidence > 0.8 ? 'High risk detected' : 'Suspicious activity detected'}`;
    }

    // 生成领取签名（如果可以领取）
    let claimSignature: string | undefined;
    let expiresAt: number | undefined;

    if (rewardResult.canClaim && rewardResult.totalFMH > 0) {
      expiresAt = now + 3600000; // 1小时有效期
      claimSignature = generateClaimSignature(
        gameResult.playerAddress,
        gameResult.gameId,
        rewardResult.totalFMH,
        expiresAt
      );

      // 预分配奖励（记录到待发放表）
      await allocatePendingReward({
        playerAddress: gameResult.playerAddress,
        gameId: gameResult.gameId.toString(),
        rewardAmount: rewardResult.totalFMH,
        expiresAt,
        signature: claimSignature
      });
    }

    // 记录奖励计算结果
    await logRewardCalculation({
      sessionId,
      playerAddress: gameResult.playerAddress,
      gameId: gameResult.gameId.toString(),
      baseReward: rewardResult.baseReward,
      totalReward: rewardResult.totalFMH,
      canClaim: rewardResult.canClaim,
      achievementsUnlocked: unlockedAchievements.length,
      antiCheatBlock: antiCheatResult.shouldBlock,
      timestamp: now
    });

    const response: RewardResponse = {
      success: true,
      reward: rewardResult,
      achievements: unlockedAchievements,
      canClaim: rewardResult.canClaim,
      claimSignature,
      expiresAt,
      sessionId
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('Reward calculation error:', error);

    await logRewardError({
      sessionId,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now(),
      playerAddress: req.body?.gameResult?.playerAddress || 'unknown'
    });

    res.status(500).json({
      success: false,
      reward: null,
      achievements: [],
      canClaim: false,
      sessionId,
      error: 'Internal server error'
    });
  }
}

/**
 * 构建游戏会话数据
 */
function buildGameSessionFromResult(gameResult: GameResult, req: NextApiRequest): any {
  return {
    gameId: gameResult.gameId,
    playerAddress: gameResult.playerAddress,
    startTime: Date.now() - gameResult.gameDuration * 1000,
    endTime: Date.now(),
    gameConfig: gameResult.gameConfig,
    result: {
      isWon: gameResult.isWon,
      score: gameResult.finalScore,
      duration: gameResult.gameDuration,
      flagsUsed: gameResult.flagsUsed,
      cellsRevealed: gameResult.cellsRevealed,
      moveSequence: 'hashed',
      moveCount: gameResult.moveCount || 0,
      firstClickTime: gameResult.firstClickTime || 1000,
      lastClickTime: gameResult.lastClickTime || gameResult.gameDuration * 1000 - 1000,
      hintsUsed: gameResult.hintsUsed || 0,
      pauseCount: gameResult.pauseCount || 0,
      totalPauseTime: gameResult.totalPauseTime || 0,
      efficiency: gameResult.efficiency || 85,
      clickPattern: [],
      mousePath: 'hashed'
    },
    clientInfo: {
      userAgent: req.headers['user-agent'] || '',
      ipAddress: getClientIP(req),
      screenResolution: '1920x1080',
      timezone: 'UTC',
      fingerprint: 'generated',
      language: 'en',
      platform: 'Web',
      cookieEnabled: true,
      javaEnabled: false,
      webglFingerprint: 'webgl',
      canvasFingerprint: 'canvas',
      audioFingerprint: 'audio'
    },
    networkInfo: {
      connectionType: '4g',
      downlink: 10,
      effectiveType: '4g',
      rtt: 100
    },
    performanceMetrics: {
      memoryUsage: 50,
      cpuUsage: 30,
      frameRate: 60,
      renderTime: 16
    }
  };
}

/**
 * 获取经济数据
 */
async function getEconomicData(): Promise<any> {
  const now = Date.now();
  
  // 使用缓存避免频繁查询
  if (economicDataCache.data && (now - economicDataCache.lastUpdate) < CACHE_DURATION) {
    return economicDataCache.data;
  }

  try {
    // 这里应该从数据库获取实际数据
    const data = {
      todayPoolUsed: 50000, // 今日已使用的奖励池
      dailyActiveUsers: 1500, // 日活用户数
      globalWinRate: 0.65, // 全局胜率
      totalSupply: 10000000 // 代币总供应量
    };

    economicDataCache = { data, lastUpdate: now };
    return data;
  } catch (error) {
    console.error('Failed to get economic data:', error);
    // 返回默认值
    return {
      todayPoolUsed: 0,
      dailyActiveUsers: 100,
      globalWinRate: 0.5,
      totalSupply: 10000000
    };
  }
}

/**
 * 获取活跃的季节性事件
 */
async function getActiveSeasonalEvents(): Promise<SeasonalEvent[]> {
  try {
    // 这里应该从数据库查询活跃的季节性事件
    const now = Date.now();
    return [
      {
        id: 'spring_2024',
        name: '春节活动',
        startTime: now - 86400000, // 1天前开始
        endTime: now + 86400000 * 7, // 7天后结束
        bonusMultiplier: 1.2,
        conditions: ['difficulty == hard', 'gameDuration <= 120'],
        isActive: true
      }
    ];
  } catch (error) {
    console.error('Failed to get seasonal events:', error);
    return [];
  }
}

/**
 * 生成领取签名
 */
function generateClaimSignature(
  playerAddress: string,
  gameId: string | number,
  amount: number,
  expiresAt: number
): string {
  const data = `claim:${playerAddress}:${gameId}:${amount}:${expiresAt}`;
  const secret = process.env.CLAIM_SECRET || 'claim-secret-key';
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/**
 * 获取客户端IP
 */
function getClientIP(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  return typeof forwarded === 'string' 
    ? forwarded.split(',')[0].trim()
    : req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';
}

// 数据库操作函数（模拟）
async function checkNonceUsed(nonce: string, playerAddress: string): Promise<boolean> {
  // 实际实现应该查询数据库
  return false;
}

async function markNonceUsed(nonce: string, playerAddress: string, gameId: string | number): Promise<void> {
  // 实际实现应该写入数据库
  console.log('Nonce used:', { nonce, playerAddress, gameId });
}

async function allocatePendingReward(data: {
  playerAddress: string;
  gameId: string;
  rewardAmount: number;
  expiresAt: number;
  signature: string;
}): Promise<void> {
  // 实际实现应该写入pending_rewards表
  console.log('Pending reward allocated:', data);
}

async function logRewardCalculation(data: any): Promise<void> {
  console.log('Reward calculation:', data);
}

async function logRewardError(data: any): Promise<void> {
  console.error('Reward error:', data);
}