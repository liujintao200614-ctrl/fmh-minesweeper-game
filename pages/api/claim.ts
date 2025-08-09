import { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import RewardSystemV2, { GameResult, PlayerLevel } from '../../lib/reward-system-v2';
import PlayerStatsManager from '../../lib/player-stats-manager';
import AntiCheatSystemV2, { GameSession, SuspiciousActivity } from '../../lib/anti-cheat-v2';

// EIP-712 Domain 和类型定义 - V2.0更新
const DOMAIN = {
  name: 'MinesweeperGameV2',
  version: '2',
  chainId: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '10143'),
  verifyingContract: process.env.NEXT_PUBLIC_MINESWEEPER_CONTRACT as string,
};

const CLAIM_TYPES = {
  Claim: [
    { name: 'player', type: 'address' },
    { name: 'gameId', type: 'uint256' },
    { name: 'score', type: 'uint256' },
    { name: 'duration', type: 'uint256' },
    { name: 'rewardAmount', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' }
  ]
};

interface ClaimRequestV2 {
  player: string;
  gameId: number;
  score: number;
  duration: number;
  gameConfig?: {
    width: number;
    height: number;
    mines: number;
  };
  flagsUsed?: number;
  cellsRevealed?: number;
  perfectGame?: boolean;
  difficulty?: 'easy' | 'medium' | 'hard';
  clientInfo?: {
    userAgent: string;
    screenResolution: string;
    timezone: string;
    fingerprint: string;
  };
}

interface ClaimDataV2 {
  player: string;
  gameId: number;
  score: number;
  duration: number;
  rewardAmount: number;
  nonce: number;
  deadline: number;
}

// 持久化nonce存储（使用数据库）
import { DatabaseManager } from '../../lib/database';
import { rateLimit, rateLimiters } from '../../lib/rateLimit';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 应用限流机制
  if (!rateLimit(req, res, rateLimiters.claim)) {
    return; // 限流触发，已经返回429错误
  }

  try {
    const { 
      player, 
      gameId, 
      score, 
      duration,
      gameConfig = { width: 10, height: 10, mines: 15 },
      flagsUsed = 0,
      cellsRevealed = 0,
      perfectGame = false,
      difficulty = 'easy',
      clientInfo
    } = req.body as ClaimRequestV2;

    console.log('🎯 V2.0 Claim request received:', {
      player,
      gameId,
      score,
      duration,
      difficulty,
      flagsUsed,
      perfectGame
    });

    // 1. 基础验证
    if (!player || !ethers.isAddress(player)) {
      return res.status(400).json({ error: 'Invalid player address' });
    }

    if (!gameId || gameId < 0) {
      return res.status(400).json({ error: 'Invalid game ID' });
    }

    if (score < 0) {
      return res.status(400).json({ error: 'Invalid score' });
    }

    if (!duration || duration < 0) {
      return res.status(400).json({ error: 'Invalid duration' });
    }

    // 2. 加载玩家统计数据
    const statsManager = new PlayerStatsManager(player);
    const playerStats = await statsManager.loadPlayerStats();
    
    console.log('📊 Player stats loaded:', {
      level: playerStats.playerLevel,
      todayEarned: playerStats.todayEarned,
      consecutiveWins: playerStats.consecutiveWins,
      totalWins: playerStats.totalWins
    });

    // 3. 构建游戏结果对象
    const gameResult: GameResult = {
      gameId,
      playerAddress: player,
      gameConfig,
      finalScore: score,
      gameDuration: duration,
      flagsUsed,
      isWon: true, // 只有胜利才会调用claim
      cellsRevealed,
      perfectGame,
      difficulty: difficulty as any
    };

    // 4. 反作弊检测
    let suspiciousActivities: SuspiciousActivity[] = [];
    if (clientInfo) {
      const gameSession: GameSession = {
        gameId,
        playerAddress: player,
        startTime: Date.now() - (duration * 1000),
        endTime: Date.now(),
        gameConfig,
        result: {
          isWon: true,
          score,
          duration,
          flagsUsed,
          cellsRevealed
        },
        clientInfo: {
          userAgent: clientInfo.userAgent || req.headers['user-agent'] || '',
          ipAddress: getClientIP(req),
          screenResolution: clientInfo.screenResolution || '',
          timezone: clientInfo.timezone || '',
          fingerprint: clientInfo.fingerprint || ''
        }
      };

      suspiciousActivities = await AntiCheatSystemV2.detectSuspiciousActivity(gameSession);
      
      if (suspiciousActivities.length > 0) {
        console.warn('⚠️ Suspicious activities detected:', suspiciousActivities);
        await AntiCheatSystemV2.logSuspiciousActivity(gameSession, suspiciousActivities);
        
        const blockResult = AntiCheatSystemV2.shouldBlockReward(suspiciousActivities);
        if (blockResult.shouldBlock) {
          return res.status(403).json({
            success: false,
            error: 'Reward blocked due to suspicious activity',
            reason: blockResult.reason,
            canRetry: false
          });
        }
      }
    }

    // 5. 基础反作弊检查（后备）
    if (!isValidGameResultV2(gameResult)) {
      return res.status(400).json({ error: 'Invalid game result detected' });
    }

    // 6. 获取今日全站奖励池使用情况
    const todayPoolUsed = await getTodayPoolUsage();

    // 7. 计算奖励
    const rewardCalculation = RewardSystemV2.calculateReward(
      gameResult,
      playerStats,
      todayPoolUsed
    );

    console.log('💰 Reward calculation:', {
      totalFMH: rewardCalculation.totalFMH,
      breakdown: rewardCalculation.breakdown,
      canClaim: rewardCalculation.canClaim,
      reason: rewardCalculation.reason
    });

    // 8. 检查是否可以申请奖励
    if (!rewardCalculation.canClaim) {
      return res.status(400).json({
        success: false,
        error: 'Cannot claim reward',
        reason: rewardCalculation.reason,
        calculation: rewardCalculation
      });
    }

    // 9. 防重放：生成唯一nonce并检查数据库
    const nonce = Date.now() * 1000 + Math.floor(Math.random() * 1000);
    const nonceKey = `${player}-${gameId}-${nonce}`;
    
    try {
      const db = await DatabaseManager.getInstance();
      const existingNonce = await db.get(
        'SELECT id FROM used_nonces WHERE nonce_key = ? AND expires_at > ?',
        [nonceKey, Math.floor(Date.now() / 1000)]
      );
      
      if (existingNonce) {
        return res.status(400).json({ error: 'Nonce already used' });
      }
    } catch (error) {
      console.error('Nonce check failed:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }

    // 10. 设置签名有效期（10分钟）
    const deadline = Math.floor(Date.now() / 1000) + 600;

    // 11. 创建EIP-712签名
    const claimData: ClaimDataV2 = {
      player,
      gameId,
      score,
      duration,
      rewardAmount: rewardCalculation.totalFMH,
      nonce,
      deadline
    };

    const serverPrivateKey = process.env.SERVER_PRIVATE_KEY;
    if (!serverPrivateKey) {
      console.error('SERVER_PRIVATE_KEY not configured');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const wallet = new ethers.Wallet(serverPrivateKey);
    
    // 创建EIP-712签名
    const serverSignature = await wallet.signTypedData(DOMAIN, CLAIM_TYPES, claimData);

    // 12. 记录已使用的nonce到数据库
    try {
      const db = await DatabaseManager.getInstance();
      await db.run(
        'INSERT INTO used_nonces (nonce_key, player_address, game_id, expires_at) VALUES (?, ?, ?, ?)',
        [nonceKey, player, gameId, deadline + 3600] // 过期时间延长1小时用于清理
      );
    } catch (error) {
      console.error('Failed to record nonce:', error);
      // 即使记录失败也继续，但记录日志
    }

    // 13. 更新玩家统计（预更新，实际发放在合约确认后）
    await statsManager.updateStreakRecord(true);
    
    // 14. 记录奖励预分配
    await recordPendingReward(player, gameId, rewardCalculation.totalFMH);

    console.log(`✅ V2.0 Claim signature generated for player ${player}, game ${gameId}, reward: ${rewardCalculation.totalFMH} FMH`);

    return res.status(200).json({
      success: true,
      claimData,
      serverSignature,
      rewardCalculation,
      estimatedReward: `${rewardCalculation.totalFMH} FMH`,
      playerLevel: playerStats.playerLevel,
      suspiciousActivities: suspiciousActivities.length,
      message: 'V2.0 Claim signature generated successfully'
    });

  } catch (error) {
    console.error('V2.0 Claim API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * 获取客户端IP地址
 */
function getClientIP(req: NextApiRequest): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
         req.connection.remoteAddress || 
         (req.socket as any)?.remoteAddress || 
         'unknown';
}

/**
 * 获取今日全站奖励池使用情况
 */
async function getTodayPoolUsage(): Promise<number> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const db = await DatabaseManager.getInstance();
    
    const result = await db.get(
      'SELECT COALESCE(SUM(fmh_earned), 0) as total FROM game_sessions WHERE DATE(created_at) = ?',
      [today]
    );
    
    return result?.total || 0;
  } catch (error) {
    console.error('Failed to get today pool usage:', error);
    return 0;
  }
}

/**
 * 记录待发放奖励
 */
async function recordPendingReward(playerAddress: string, gameId: string | number, amount: number): Promise<void> {
  try {
    const db = await DatabaseManager.getInstance();
    await db.run(
      'INSERT OR REPLACE INTO pending_rewards (player_address, game_id, reward_amount, created_at) VALUES (?, ?, ?, ?)',
      [playerAddress, gameId.toString(), amount, Date.now()]
    );
    console.log('💾 Pending reward recorded:', { playerAddress, gameId, amount });
  } catch (error) {
    console.error('Failed to record pending reward:', error);
  }
}

/**
 * V2.0增强的游戏结果验证函数
 */
function isValidGameResultV2(gameResult: GameResult): boolean {
  const { finalScore, gameDuration, gameConfig, cellsRevealed, flagsUsed } = gameResult;

  // 1. 基础范围检查
  if (finalScore < 0 || finalScore > 10000) {
    console.warn('V2.0: Invalid score range:', finalScore);
    return false;
  }

  if (gameDuration < 5 || gameDuration > 3600) { // 5秒到1小时
    console.warn('V2.0: Invalid duration range:', gameDuration);
    return false;
  }

  // 2. 棋盘逻辑验证
  const totalCells = gameConfig.width * gameConfig.height;
  const maxRevealableCells = totalCells - gameConfig.mines;

  if (cellsRevealed > maxRevealableCells) {
    console.warn('V2.0: Invalid cells revealed:', { cellsRevealed, maxRevealableCells });
    return false;
  }

  if (flagsUsed > gameConfig.mines + 5) { // 允许一些误标
    console.warn('V2.0: Too many flags used:', { flagsUsed, mines: gameConfig.mines });
    return false;
  }

  // 3. 速度与复杂度关系验证
  const complexity = gameConfig.width * gameConfig.height * gameConfig.mines;
  const minReasonableDuration = Math.max(5, complexity / 1000); // 基于复杂度的最小时间

  if (gameDuration < minReasonableDuration) {
    console.warn('V2.0: Game too fast for complexity:', { 
      duration: gameDuration, 
      minRequired: minReasonableDuration,
      complexity 
    });
    return false;
  }

  // 4. 操作频率验证
  const operationsPerSecond = cellsRevealed / gameDuration;
  if (operationsPerSecond > 20) { // 每秒最多20次操作
    console.warn('V2.0: Unrealistic operation speed:', operationsPerSecond);
    return false;
  }

  return true;
}

// 保留旧函数以兼容性（标记为已弃用）
/** @deprecated Use isValidGameResultV2 instead */
function isValidGameResult(score: number, duration: number): boolean {
  return isValidGameResultV2({
    gameId: 0,
    playerAddress: '',
    gameConfig: { width: 10, height: 10, mines: 15 },
    finalScore: score,
    gameDuration: duration,
    flagsUsed: 0,
    isWon: true,
    cellsRevealed: 0,
    perfectGame: false,
    difficulty: 'easy'
  });
}

// 保留旧函数以兼容性（标记为已弃用）
/** @deprecated Reward calculation now handled by RewardSystemV2 */
function calculateReward(score: number, duration: number): string {
  const WIN_REWARD = 5;
  const PERFECT_BONUS = 15;
  const SPEED_BONUS_FAST = 8;
  const SPEED_BONUS_MEDIUM = 3;

  let reward = WIN_REWARD;

  if (duration < 60 && score >= 1000) {
    reward += PERFECT_BONUS;
  }

  if (duration < 30) {
    reward += SPEED_BONUS_FAST;
  } else if (duration < 120) {
    reward += SPEED_BONUS_MEDIUM;
  }

  return reward.toString();
}