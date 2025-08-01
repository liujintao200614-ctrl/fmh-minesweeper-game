import { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';

// EIP-712 Domain 和类型定义
const DOMAIN = {
  name: 'MinesweeperGame',
  version: '1',
  chainId: parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '10143'),
  verifyingContract: process.env.NEXT_PUBLIC_MINESWEEPER_CONTRACT as string,
};

const CLAIM_TYPES = {
  Claim: [
    { name: 'player', type: 'address' },
    { name: 'gameId', type: 'uint256' },
    { name: 'score', type: 'uint256' },
    { name: 'duration', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' }
  ]
};

interface ClaimRequest {
  player: string;
  gameId: number;
  score: number;
  duration: number;
  signature?: string; // 游戏结果的签名（可选，用于验证游戏真实性）
}

interface ClaimData {
  player: string;
  gameId: number;
  score: number;
  duration: number;
  nonce: number;
  deadline: number;
}

// 简单的nonce存储（生产环境应使用数据库）
const usedNonces = new Set<string>();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { player, gameId, score, duration, signature } = req.body as ClaimRequest;

    // 1. 基础验证
    if (!player || !ethers.isAddress(player)) {
      return res.status(400).json({ error: 'Invalid player address' });
    }

    if (!gameId || gameId < 0) {
      return res.status(400).json({ error: 'Invalid game ID' });
    }

    if (!score || score < 0) {
      return res.status(400).json({ error: 'Invalid score' });
    }

    if (!duration || duration < 0) {
      return res.status(400).json({ error: 'Invalid duration' });
    }

    // 2. 防重放：生成唯一nonce
    const nonce = Date.now() * 1000 + Math.floor(Math.random() * 1000);
    const nonceKey = `${player}-${gameId}-${nonce}`;
    
    if (usedNonces.has(nonceKey)) {
      return res.status(400).json({ error: 'Nonce already used' });
    }

    // 3. 设置签名有效期（10分钟）
    const deadline = Math.floor(Date.now() / 1000) + 600;

    // 4. 游戏结果验证（可选）
    if (signature) {
      // 这里可以验证前端提交的游戏结果签名
      // 确保游戏确实是玩家完成的
      try {
        // 验证游戏签名逻辑...
        console.log('Game signature verification:', signature);
      } catch (error) {
        console.warn('Game signature verification failed:', error);
        // 可以选择是否拒绝无效签名
      }
    }

    // 5. 服务器签名验证逻辑（防作弊）
    if (!isValidGameResult(score, duration)) {
      return res.status(400).json({ error: 'Invalid game result' });
    }

    // 6. 创建EIP-712签名
    const claimData: ClaimData = {
      player,
      gameId,
      score,
      duration,
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

    // 7. 记录已使用的nonce
    usedNonces.add(nonceKey);

    // 8. 计算奖励金额（与合约逻辑保持一致）
    const reward = calculateReward(score, duration);

    console.log(`✅ Claim signature generated for player ${player}, game ${gameId}, reward: ${reward} FMH`);

    return res.status(200).json({
      success: true,
      claimData,
      serverSignature,
      estimatedReward: reward,
      message: 'Claim signature generated successfully'
    });

  } catch (error) {
    console.error('Claim API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

// 游戏结果验证函数
function isValidGameResult(score: number, duration: number): boolean {
  // 防作弊验证逻辑
  
  // 1. 分数合理性检查
  if (score > 10000) { // 假设最高分不超过10000
    console.warn('Suspicious high score:', score);
    return false;
  }

  // 2. 时间合理性检查  
  if (duration < 3) { // 最少3秒完成游戏
    console.warn('Suspicious fast completion:', duration);
    return false;
  }

  // 3. 分数与时间的合理性
  const scorePerSecond = score / duration;
  if (scorePerSecond > 100) { // 每秒得分不超过100
    console.warn('Suspicious score/time ratio:', scorePerSecond);
    return false;
  }

  return true;
}

// 奖励计算函数（与合约保持一致）
function calculateReward(score: number, duration: number): string {
  const WIN_REWARD = 10; // 10 FMH
  const PERFECT_BONUS = 50; // 50 FMH
  const SPEED_BONUS_FAST = 20; // 20 FMH
  const SPEED_BONUS_MEDIUM = 5; // 5 FMH

  let reward = WIN_REWARD;

  // Perfect game bonus
  if (duration < 60 && score >= 1000) {
    reward += PERFECT_BONUS;
  }

  // Speed bonus
  if (duration < 30) {
    reward += SPEED_BONUS_FAST;
  } else if (duration < 120) {
    reward += SPEED_BONUS_MEDIUM;
  }

  return reward.toString();
}