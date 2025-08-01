import { NextApiRequest, NextApiResponse } from 'next';
import { DatabaseManager } from '../../lib/database';

interface LeaderboardResponse {
  success: boolean;
  data: any[];
  stats?: {
    totalGames: number;
    totalPlayers: number;
    averageScore: number;
    topScore: number;
  };
  error?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LeaderboardResponse>
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    const { 
      difficulty = 'All', 
      limit = '50',
      includeStats = 'false'
    } = req.query;

    // 参数验证
    const limitNum = parseInt(limit as string);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        success: false,
        error: 'Invalid limit parameter (1-100)'
      });
    }

    const validDifficulties = ['All', 'Easy', 'Medium', 'Hard', 'Custom'];
    if (!validDifficulties.includes(difficulty as string)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid difficulty parameter'
      });
    }

    // 获取排行榜数据
    const leaderboard = await DatabaseManager.getLeaderboard(
      difficulty === 'All' ? undefined : difficulty as string,
      limitNum
    );

    const response: LeaderboardResponse = {
      success: true,
      data: leaderboard
    };

    // 如果需要统计信息
    if (includeStats === 'true') {
      response.stats = await DatabaseManager.getGameStats();
    }

    res.status(200).json(response);

  } catch (error) {
    console.error('Leaderboard API error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}