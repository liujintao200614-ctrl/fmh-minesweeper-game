import { NextApiRequest, NextApiResponse } from 'next';
import { DatabaseManager } from '../../../lib/database';
import { rateLimit, rateLimiters } from '../../../lib/rateLimit';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 应用限流
  if (!rateLimit(req, res, rateLimiters.default)) {
    return;
  }

  try {
    const { address, limit = '10' } = req.query;

    if (!address || typeof address !== 'string') {
      return res.status(400).json({ error: 'Player address is required' });
    }

    const limitNum = parseInt(limit as string, 10);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 50) {
      return res.status(400).json({ error: 'Invalid limit parameter' });
    }

    const db = await DatabaseManager.getInstance();
    
    // 获取最近的游戏记录，包含客户端信息
    const games = await db.all(`
      SELECT 
        gs.game_id,
        gs.final_score as score,
        gs.game_duration as duration,
        gs.flags_used,
        gs.cells_revealed,
        gs.is_won,
        gs.created_at,
        gs.client_info,
        gs.game_config,
        u.wallet_address as playerAddress
      FROM game_sessions gs
      JOIN users u ON gs.user_id = u.id
      WHERE u.wallet_address = ?
      ORDER BY gs.created_at DESC
      LIMIT ?
    `, [address, limitNum]);

    // 转换为GameSession格式
    const gameSessions = games.map(game => ({
      gameId: game.game_id,
      playerAddress: game.playerAddress,
      startTime: new Date(game.created_at).getTime() - (game.duration * 1000),
      endTime: new Date(game.created_at).getTime(),
      gameConfig: game.game_config ? JSON.parse(game.game_config) : {
        width: 10, height: 10, mines: 15, difficulty: 'easy'
      },
      result: {
        isWon: game.is_won === 1,
        score: game.score,
        duration: game.duration,
        flagsUsed: game.flags_used || 0,
        cellsRevealed: game.cells_revealed || 0
      },
      clientInfo: game.client_info ? JSON.parse(game.client_info) : {
        userAgent: '',
        ipAddress: '',
        screenResolution: '',
        timezone: '',
        fingerprint: ''
      }
    }));

    return res.status(200).json({
      success: true,
      games: gameSessions,
      total: games.length
    });

  } catch (error) {
    console.error('Recent games API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}