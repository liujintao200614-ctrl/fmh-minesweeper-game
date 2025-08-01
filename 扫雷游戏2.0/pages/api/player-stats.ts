import { NextApiRequest, NextApiResponse } from 'next';
import { DatabaseManager } from '../../lib/database';

// 类型定义
interface GameRecord {
  id: string;
  gameId: number;
  playerAddress: string;
  score: number;
  timeElapsed: number;
  width: number;
  height: number;
  mines: number;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Custom';
  timestamp: number;
  verified: boolean;
}

interface PlayerStatsResponse {
  success: boolean;
  data?: {
    playerAddress: string;
    totalGames: number;
    totalWins: number;
    bestScore: number;
    bestTime: number;
    averageScore: number;
    currentRank: number;
    recentGames: GameRecord[];
    difficultyStats: {
      [key: string]: {
        games: number;
        bestScore: number;
        bestTime: number;
      };
    };
  };
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<PlayerStatsResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    const { address } = req.query;

    if (!address || typeof address !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Player address is required'
      });
    }

    // 获取玩家所有游戏记录
    const playerRecords = await DatabaseManager.getPlayerRecords(address);
    const verifiedRecords = playerRecords.filter(record => record.verified);

    if (verifiedRecords.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          playerAddress: address.toLowerCase(),
          totalGames: 0,
          totalWins: 0,
          bestScore: 0,
          bestTime: 0,
          averageScore: 0,
          currentRank: -1,
          recentGames: [],
          difficultyStats: {}
        }
      });
    }

    // 计算统计信息
    const totalGames = verifiedRecords.length;
    const totalWins = verifiedRecords.length; // 所有记录都是胜利的
    const bestScore = Math.max(...verifiedRecords.map(r => r.score));
    const bestTime = Math.min(...verifiedRecords.map(r => r.timeElapsed));
    const averageScore = Math.round(
      verifiedRecords.reduce((sum, r) => sum + r.score, 0) / totalGames
    );

    // 获取当前排名（基于最佳分数）
    const currentRank = await DatabaseManager.getPlayerRank(address);

    // 获取最近的游戏记录（最多10个）
    const recentGames = verifiedRecords
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 10);

    // 按难度统计
    const difficultyStats: { [key: string]: { games: number; bestScore: number; bestTime: number } } = {};
    
    verifiedRecords.forEach(record => {
      const difficulty = record.difficulty;
      if (!difficultyStats[difficulty]) {
        difficultyStats[difficulty] = {
          games: 0,
          bestScore: 0,
          bestTime: Infinity
        };
      }
      
      const stats = difficultyStats[difficulty];
      stats.games++;
      stats.bestScore = Math.max(stats.bestScore, record.score);
      stats.bestTime = Math.min(stats.bestTime, record.timeElapsed);
    });

    // 修正无穷大的最佳时间
    Object.values(difficultyStats).forEach(stats => {
      if (stats.bestTime === Infinity) {
        stats.bestTime = 0;
      }
    });

    res.status(200).json({
      success: true,
      data: {
        playerAddress: address.toLowerCase(),
        totalGames,
        totalWins,
        bestScore,
        bestTime,
        averageScore,
        currentRank,
        recentGames,
        difficultyStats
      }
    });

  } catch (error) {
    console.error('Player stats API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}