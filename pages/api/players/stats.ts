import { NextApiRequest, NextApiResponse } from 'next';
import { DatabaseManager } from '../../../lib/database';
import { rateLimit, rateLimiters } from '../../../lib/rateLimit';
import { PlayerLevel, PlayerStats } from '../../../lib/reward-system-v2';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // 应用限流
  if (!rateLimit(req, res, rateLimiters.default)) {
    return;
  }

  if (req.method === 'GET') {
    return handleGetStats(req, res);
  } else if (req.method === 'POST') {
    return handleUpdateStats(req, res);
  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}

/**
 * 获取玩家统计数据
 */
async function handleGetStats(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { address } = req.query;

    if (!address || typeof address !== 'string') {
      return res.status(400).json({ error: 'Player address is required' });
    }

    const db = await DatabaseManager.getInstance();
    
    // 确保player_stats表存在
    await db.run(`
      CREATE TABLE IF NOT EXISTS player_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_address TEXT UNIQUE NOT NULL,
        consecutive_wins INTEGER DEFAULT 0,
        today_earned REAL DEFAULT 0,
        player_level TEXT DEFAULT 'bronze',
        total_wins INTEGER DEFAULT 0,
        total_games INTEGER DEFAULT 0,
        last_play_time INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 获取玩家统计数据
    const stats = await db.get(`
      SELECT * FROM player_stats 
      WHERE player_address = ?
    `, [address]);

    if (!stats) {
      // 新玩家，从game_sessions计算初始统计
      const gameStats = await db.get(`
        SELECT 
          COUNT(*) as totalGames,
          COUNT(CASE WHEN is_won = 1 THEN 1 END) as totalWins,
          MAX(created_at) as lastPlayTime
        FROM game_sessions gs
        JOIN users u ON gs.user_id = u.id
        WHERE u.wallet_address = ?
      `, [address]);

      const playerStats: PlayerStats = {
        consecutiveWins: 0,
        todayEarned: 0,
        playerLevel: PlayerLevel.BRONZE,
        totalWins: gameStats?.totalWins || 0,
        totalGames: gameStats?.totalGames || 0,
        lastPlayTime: gameStats?.lastPlayTime ? new Date(gameStats.lastPlayTime).getTime() : 0
      };

      // 插入初始统计数据
      await db.run(`
        INSERT INTO player_stats 
        (player_address, consecutive_wins, today_earned, player_level, total_wins, total_games, last_play_time)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        address,
        playerStats.consecutiveWins,
        playerStats.todayEarned,
        playerStats.playerLevel,
        playerStats.totalWins,
        playerStats.totalGames,
        playerStats.lastPlayTime
      ]);

      return res.status(200).json({
        success: true,
        stats: playerStats,
        isNew: true
      });
    }

    // 检查今日收入是否需要重置
    const today = new Date().toDateString();
    const lastPlayDay = new Date(stats.last_play_time).toDateString();
    let todayEarned = stats.today_earned;

    if (today !== lastPlayDay) {
      todayEarned = 0;
      // 更新数据库
      await db.run(`
        UPDATE player_stats 
        SET today_earned = 0, updated_at = CURRENT_TIMESTAMP
        WHERE player_address = ?
      `, [address]);
    }

    const playerStats: PlayerStats = {
      consecutiveWins: stats.consecutive_wins,
      todayEarned,
      playerLevel: stats.player_level as PlayerLevel,
      totalWins: stats.total_wins,
      totalGames: stats.total_games,
      lastPlayTime: stats.last_play_time
    };

    return res.status(200).json({
      success: true,
      stats: playerStats,
      lastUpdate: stats.updated_at
    });

  } catch (error) {
    console.error('Get player stats API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

/**
 * 更新玩家统计数据
 */
async function handleUpdateStats(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { playerAddress, stats } = req.body;

    if (!playerAddress || !stats) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const db = await DatabaseManager.getInstance();
    
    // 更新或插入玩家统计数据
    await db.run(`
      INSERT OR REPLACE INTO player_stats 
      (player_address, consecutive_wins, today_earned, player_level, total_wins, total_games, last_play_time, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [
      playerAddress,
      stats.consecutiveWins,
      stats.todayEarned,
      stats.playerLevel,
      stats.totalWins,
      stats.totalGames,
      stats.lastPlayTime
    ]);

    console.log(`📊 Player stats updated: ${playerAddress.substring(0, 8)}... Level: ${stats.playerLevel}, Wins: ${stats.totalWins}`);

    return res.status(200).json({
      success: true,
      playerAddress: playerAddress.substring(0, 8) + '...',
      updated: true,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('Update player stats API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}