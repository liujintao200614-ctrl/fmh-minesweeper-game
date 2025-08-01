import { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { DatabaseManager } from '../../lib/database';

interface SecureRewardRequest {
  gameId: number;
  playerAddress: string;
  board: number[][];
  timeElapsed: number;
  score: number;
  signature: string;
}

interface SecureRewardResponse {
  success: boolean;
  data?: {
    rewardAmount: number;
    transactionHash?: string;
  };
  error?: string;
}

// 验证游戏逻辑
async function verifyGameLogic(gameId: number, board: number[][], timeElapsed: number, score: number) {
  // 这里应该包含完整的游戏逻辑验证
  // 简化版本，实际应该验证：
  // 1. 棋盘布局是否合理
  // 2. 分数计算是否正确
  // 3. 时间是否合理
  
  if (!board || board.length === 0) {
    return { isValid: false, reason: 'Invalid board data' };
  }

  if (timeElapsed < 0 || timeElapsed > 3600) { // 最大1小时
    return { isValid: false, reason: 'Invalid time elapsed' };
  }

  if (score < 0) {
    return { isValid: false, reason: 'Invalid score' };
  }

  return { isValid: true };
}

// 验证区块链上的游戏状态
async function verifyGameOnChain(gameId: number, playerAddress: string) {
  // 这里应该连接到智能合约验证游戏状态
  // 简化版本，返回模拟数据
  return {
    isValid: true,
    isCompleted: true,
    isWon: true,
    rewardClaimed: false
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SecureRewardResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    const {
      gameId,
      playerAddress,
      board,
      timeElapsed,
      score,
      signature
    }: SecureRewardRequest = req.body;

    // 基本参数验证
    if (!gameId || !playerAddress || !board || !signature) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters'
      });
    }

    // 1. 验证游戏逻辑
    const verificationResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/verify-game`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        gameId,
        board,
        timeElapsed,
        score,
        playerAddress,
        signature
      })
    });

    const verificationResult = await verificationResponse.json();

    if (!verificationResult.isValid) {
      return res.status(400).json({
        success: false,
        error: `Game verification failed: ${verificationResult.reason}`
      });
    }

    // 2. 验证区块链上的游戏状态
    const chainVerification = await verifyGameOnChain(gameId, playerAddress);
    
    if (!chainVerification.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Game not found on blockchain or player mismatch'
      });
    }

    if (chainVerification.rewardClaimed) {
      return res.status(400).json({
        success: false,
        error: 'Reward already claimed'
      });
    }

    if (chainVerification.isCompleted && !chainVerification.isWon) {
      return res.status(400).json({
        success: false,
        error: 'Game was not won'
      });
    }

    // 3. 检查是否已经在数据库中处理过
    const existingRecords = await DatabaseManager.getPlayerRecords(playerAddress);
    const existingGame = existingRecords.find(record => record.gameId === gameId);
    
    if (existingGame) {
      return res.status(400).json({
        success: false,
        error: 'Game already processed'
      });
    }

    // 4. 计算奖励金额
    const baseReward = 100; // 基础奖励
    const timeBonus = Math.max(0, 60 - timeElapsed) * 2; // 时间奖励
    const scoreBonus = Math.floor(score / 1000) * 50; // 分数奖励
    
    const totalReward = baseReward + timeBonus + scoreBonus;

    // 5. 保存游戏记录到数据库
    const gameRecord = await DatabaseManager.addGameRecord({
      gameId,
      playerAddress,
      score,
      timeElapsed,
      width: board[0]?.length || 10,
      height: board.length || 10,
      mines: Math.floor((board[0]?.length || 10) * (board.length || 10) * 0.15),
      difficulty: 'Custom',
      verified: true
    });

    // 6. 记录系统日志
    const db = await DatabaseManager.getInstance();
    await db.run(`
      INSERT INTO system_logs (log_type, wallet_address, action, message, game_session_id, data)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      'reward_claim',
      playerAddress,
      'secure_reward_claimed',
      `Reward claimed for game ${gameId}: ${totalReward} tokens`,
      gameRecord.id,
      JSON.stringify({ gameId, score, timeElapsed, reward: totalReward })
    ]);

    // 7. 返回成功响应
    res.status(200).json({
      success: true,
      data: {
        rewardAmount: totalReward,
        transactionHash: `0x${Math.random().toString(16).substr(2, 64)}` // 模拟交易哈希
      }
    });

  } catch (error) {
    console.error('Secure reward API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}