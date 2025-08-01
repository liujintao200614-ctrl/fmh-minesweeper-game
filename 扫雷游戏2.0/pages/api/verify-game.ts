import { NextApiRequest, NextApiResponse } from 'next';
import { ethers } from 'ethers';
import { rateLimit, rateLimiters } from '../../lib/rateLimit';

// 游戏验证接口
interface GameVerificationRequest {
  gameId: number;
  board: Array<Array<{
    isMine: boolean;
    isRevealed: boolean;
    isFlagged: boolean;
    neighborMines: number;
  }>>;
  timeElapsed: number;
  score: number;
  playerAddress: string;
  signature: string;
}

interface GameVerificationResponse {
  isValid: boolean;
  reason?: string;
  verifiedScore?: number;
}

// 验证扫雷游戏逻辑
function verifyMinesweeperLogic(board: any[][]): boolean {
  const height = board.length;
  const width = board[0].length;
  
  // 验证所有非雷格子都已揭开
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const cell = board[row][col];
      if (!cell.isMine && !cell.isRevealed) {
        return false; // 游戏未完成
      }
      if (cell.isMine && cell.isRevealed) {
        return false; // 踩到雷了
      }
    }
  }
  
  // 验证雷数统计正确性
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const cell = board[row][col];
      if (!cell.isMine && cell.isRevealed) {
        const actualNeighborMines = countNeighborMines(board, row, col);
        if (cell.neighborMines !== actualNeighborMines) {
          return false; // 邻居雷数不正确
        }
      }
    }
  }
  
  return true;
}

function countNeighborMines(board: any[][], row: number, col: number): number {
  let count = 0;
  const height = board.length;
  const width = board[0].length;
  
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      const newRow = row + i;
      const newCol = col + j;
      
      if (newRow >= 0 && newRow < height && newCol >= 0 && newCol < width) {
        if (board[newRow][newCol].isMine) {
          count++;
        }
      }
    }
  }
  
  return count;
}

// 验证分数计算
function verifyScore(board: any[][], timeElapsed: number, flagsUsed: number): number {
  const height = board.length;
  const width = board[0].length;
  const mines = board.flat().filter((cell: any) => cell.isMine).length;
  
  // 重新计算分数
  const totalCells = width * height;
  const difficultyMultiplier = mines / totalCells;
  const baseScore = Math.floor(mines * 100 * difficultyMultiplier);
  
  const timeBonus = Math.max(0, 300 - timeElapsed);
  const flagEfficiency = Math.max(0, mines - flagsUsed) * 10;
  
  return baseScore + timeBonus + flagEfficiency;
}

// 验证消息签名
function verifySignature(
  gameId: number,
  score: number,
  timeElapsed: number,
  playerAddress: string,
  signature: string
): boolean {
  try {
    const message = `gameId:${gameId},score:${score},time:${timeElapsed}`;
    const messageHash = ethers.hashMessage(message);
    const recoveredAddress = ethers.recoverAddress(messageHash, signature);
    
    return recoveredAddress.toLowerCase() === playerAddress.toLowerCase();
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<GameVerificationResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ isValid: false, reason: 'Method not allowed' });
  }

  // 速率限制检查
  if (!rateLimit(req, res, rateLimiters.verification)) {
    return; // 速率限制已处理响应
  }

  try {
    const {
      gameId,
      board,
      timeElapsed,
      score,
      playerAddress,
      signature
    }: GameVerificationRequest = req.body;

    // 基本参数验证
    if (!gameId || !board || !playerAddress || !signature) {
      return res.status(400).json({ 
        isValid: false, 
        reason: 'Missing required parameters' 
      });
    }

    // 验证参数类型和范围
    if (typeof gameId !== 'number' || gameId < 0) {
      return res.status(400).json({ 
        isValid: false, 
        reason: 'Invalid gameId' 
      });
    }

    if (typeof timeElapsed !== 'number' || timeElapsed < 0 || timeElapsed > 86400) { // 最多24小时
      return res.status(400).json({ 
        isValid: false, 
        reason: 'Invalid timeElapsed' 
      });
    }

    if (typeof score !== 'number' || score < 0 || score > 100000) { // 最高分限制
      return res.status(400).json({ 
        isValid: false, 
        reason: 'Invalid score' 
      });
    }

    // 验证棋盘尺寸合理性
    if (!Array.isArray(board) || board.length < 3 || board.length > 50 || 
        !Array.isArray(board[0]) || board[0].length < 3 || board[0].length > 50) {
      return res.status(400).json({ 
        isValid: false, 
        reason: 'Invalid board dimensions' 
      });
    }

    // 验证地址格式
    if (!ethers.isAddress(playerAddress)) {
      return res.status(400).json({ 
        isValid: false, 
        reason: 'Invalid player address' 
      });
    }

    // 验证游戏逻辑
    if (!verifyMinesweeperLogic(board)) {
      return res.status(400).json({ 
        isValid: false, 
        reason: 'Invalid game state' 
      });
    }

    // 重新计算并验证分数
    const flagsUsed = board.flat().filter(cell => cell.isFlagged).length;
    const verifiedScore = verifyScore(board, timeElapsed, flagsUsed);
    
    // 允许一定的分数误差（±5分）
    if (Math.abs(score - verifiedScore) > 5) {
      return res.status(400).json({ 
        isValid: false, 
        reason: `Score mismatch. Expected: ${verifiedScore}, Got: ${score}` 
      });
    }

    // 验证签名
    if (!verifySignature(gameId, verifiedScore, timeElapsed, playerAddress, signature)) {
      return res.status(400).json({ 
        isValid: false, 
        reason: 'Invalid signature' 
      });
    }

    // 验证时间合理性（防止时间作弊）
    const minTime = Math.floor(board.length * board[0].length / 10); // 最少时间
    if (timeElapsed < minTime) {
      return res.status(400).json({ 
        isValid: false, 
        reason: 'Completion time too fast' 
      });
    }

    // 验证通过
    res.status(200).json({ 
      isValid: true, 
      verifiedScore 
    });

  } catch (error) {
    console.error('Game verification error:', error);
    res.status(500).json({ 
      isValid: false, 
      reason: 'Internal server error' 
    });
  }
}