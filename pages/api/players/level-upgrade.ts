import { NextApiRequest, NextApiResponse } from 'next';
import { DatabaseManager } from '../../../lib/database';
import { rateLimit, rateLimiters } from '../../../lib/rateLimit';
import { PlayerLevel } from '../../../lib/reward-system-v2';

interface LevelUpgradeData {
  playerAddress: string;
  newLevel: PlayerLevel;
  timestamp: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 应用限流
  if (!rateLimit(req, res, rateLimiters.default)) {
    return;
  }

  try {
    const { playerAddress, newLevel, timestamp } = req.body as LevelUpgradeData;

    if (!playerAddress || !newLevel) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // 验证等级有效性
    const validLevels = Object.values(PlayerLevel);
    if (!validLevels.includes(newLevel)) {
      return res.status(400).json({ error: 'Invalid player level' });
    }

    const db = await DatabaseManager.getInstance();
    
    // 确保level_upgrades表存在
    await db.run(`
      CREATE TABLE IF NOT EXISTS level_upgrades (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        player_address TEXT NOT NULL,
        old_level TEXT,
        new_level TEXT NOT NULL,
        upgraded_at INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 获取当前等级
    const currentStats = await db.get(`
      SELECT player_level FROM player_stats 
      WHERE player_address = ?
    `, [playerAddress]);

    const oldLevel = currentStats?.player_level || PlayerLevel.BRONZE;

    // 记录等级升级事件
    await db.run(`
      INSERT INTO level_upgrades 
      (player_address, old_level, new_level, upgraded_at)
      VALUES (?, ?, ?, ?)
    `, [playerAddress, oldLevel, newLevel, timestamp || Date.now()]);

    // 更新玩家统计中的等级
    await db.run(`
      UPDATE player_stats 
      SET player_level = ?, updated_at = CURRENT_TIMESTAMP
      WHERE player_address = ?
    `, [newLevel, playerAddress]);

    // 记录升级奖励（可选）
    const levelBenefits = {
      [PlayerLevel.BRONZE]: { dailyLimit: 500, badge: '🥉' },
      [PlayerLevel.SILVER]: { dailyLimit: 550, badge: '🥈' },
      [PlayerLevel.GOLD]: { dailyLimit: 600, badge: '🥇' },
      [PlayerLevel.PLATINUM]: { dailyLimit: 650, badge: '💎' },
      [PlayerLevel.LEGEND]: { dailyLimit: 750, badge: '👑' }
    };

    const benefits = levelBenefits[newLevel];
    
    console.log(`🎉 LEVEL UP! Player ${playerAddress.substring(0, 8)}... upgraded from ${oldLevel} to ${newLevel} ${benefits.badge}`);

    // 在这里可以添加等级升级奖励逻辑
    // 例如：发放升级奖励FMH、解锁新功能等

    return res.status(200).json({
      success: true,
      playerAddress: playerAddress.substring(0, 8) + '...',
      oldLevel,
      newLevel,
      benefits,
      message: `Congratulations! You've reached ${newLevel} level!`,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('Level upgrade API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}