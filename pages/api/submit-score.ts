import { NextApiRequest, NextApiResponse } from 'next';
import { DatabaseManager } from '../../lib/database';

interface SubmitScoreRequest {
  gameId: number;
  playerAddress: string;
  score: number;
  timeElapsed: number;
  width: number;
  height: number;
  mines: number;
  board: Array<Array<{
    isMine: boolean;
    isRevealed: boolean;
    isFlagged: boolean;
    neighborMines: number;
  }>>;
  signature: string;
}

interface SubmitScoreResponse {
  success: boolean;
  recordId?: string;
  rank?: number;
  error?: string;
}

// 判断游戏难度
function getDifficulty(width: number, height: number, mines: number): 'Easy' | 'Medium' | 'Hard' | 'Custom' {
  // 标准难度
  if (width === 9 && height === 9 && mines === 10) return 'Easy';
  if (width === 16 && height === 16 && mines === 40) return 'Medium';
  if (width === 30 && height === 16 && mines === 99) return 'Hard';
  return 'Custom';
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SubmitScoreResponse>
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
      score,
      timeElapsed,
      width,
      height,
      mines,
      board,
      signature
    }: SubmitScoreRequest = req.body;

    // 基本参数验证
    if (!gameId || !playerAddress || score === undefined || !timeElapsed || !board || !signature) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters'
      });
    }

    // 参数合理性检查
    if (width < 5 || width > 30 || height < 5 || height > 30) {
      return res.status(400).json({
        success: false,
        error: 'Invalid board dimensions'
      });
    }

    if (mines < 1 || mines >= width * height) {
      return res.status(400).json({
        success: false,
        error: 'Invalid mine count'
      });
    }

    if (timeElapsed < 1 || timeElapsed > 3600) { // 最多1小时
      return res.status(400).json({
        success: false,
        error: 'Invalid time elapsed'
      });
    }

    // 调用验证API来验证游戏
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

    // 使用验证后的分数
    const verifiedScore = verificationResult.verifiedScore || score;
    const difficulty = getDifficulty(width, height, mines);

    // 存储游戏记录
    const gameRecord = await DatabaseManager.addGameRecord({
      gameId,
      playerAddress: playerAddress.toLowerCase(),
      score: verifiedScore,
      timeElapsed,
      width,
      height,
      mines,
      difficulty,
      verified: true
    });

    // 获取玩家排名
    const playerRank = await DatabaseManager.getPlayerRank(playerAddress, difficulty);

    res.status(200).json({
      success: true,
      recordId: gameRecord.id,
      rank: playerRank > 0 ? playerRank : undefined
    });

  } catch (error) {
    console.error('Submit score error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}