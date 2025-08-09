import { NextApiRequest, NextApiResponse } from 'next';
import { DatabaseManager } from '../../../lib/database';
import { rateLimit, rateLimiters } from '../../../lib/rateLimit';

interface SuspiciousActivityLog {
  gameId: string | number;
  playerAddress: string;
  activities: Array<{
    type: string;
    severity: string;
    description: string;
    evidence: any;
  }>;
  timestamp: number;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 应用限流
  if (!rateLimit(req, res, rateLimiters.claim)) {
    return;
  }

  try {
    const { gameId, playerAddress, activities, timestamp } = req.body as SuspiciousActivityLog;

    if (!gameId || !playerAddress || !activities || !Array.isArray(activities)) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (activities.length === 0) {
      return res.status(400).json({ error: 'No activities to log' });
    }

    const db = await DatabaseManager.getInstance();
    
    // 确保suspicious_activities表存在
    await db.run(`
      CREATE TABLE IF NOT EXISTS suspicious_activities (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        game_id TEXT NOT NULL,
        player_address TEXT NOT NULL,
        activity_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        description TEXT NOT NULL,
        evidence TEXT,
        detected_at INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 批量插入可疑活动记录
    const stmt = await db.prepare(`
      INSERT INTO suspicious_activities 
      (game_id, player_address, activity_type, severity, description, evidence, detected_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const activity of activities) {
      await stmt.run([
        gameId.toString(),
        playerAddress,
        activity.type,
        activity.severity,
        activity.description,
        JSON.stringify(activity.evidence),
        timestamp || Date.now()
      ]);
    }

    await stmt.finalize();

    // 统计严重度，用于警报
    const criticalCount = activities.filter(a => a.severity === 'CRITICAL').length;
    const highCount = activities.filter(a => a.severity === 'HIGH').length;
    
    if (criticalCount > 0 || highCount > 1) {
      console.error(`🚨 SECURITY ALERT: Player ${playerAddress} - ${criticalCount} CRITICAL, ${highCount} HIGH severity activities in game ${gameId}`);
      
      // 可以在这里添加通知或自动封禁逻辑
      if (criticalCount >= 2) {
        console.error(`⛔ RECOMMENDATION: Consider blocking player ${playerAddress} due to multiple critical violations`);
      }
    }

    // 记录统计信息用于监控
    console.log(`🔍 Anti-cheat log: Game ${gameId}, Player ${playerAddress.substring(0, 8)}..., Activities: ${activities.length}`);

    return res.status(200).json({
      success: true,
      logged: activities.length,
      gameId,
      playerAddress: playerAddress.substring(0, 8) + '...', // 隐私保护
      severityBreakdown: {
        CRITICAL: activities.filter(a => a.severity === 'CRITICAL').length,
        HIGH: activities.filter(a => a.severity === 'HIGH').length,
        MEDIUM: activities.filter(a => a.severity === 'MEDIUM').length,
        LOW: activities.filter(a => a.severity === 'LOW').length
      },
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('Log suspicious activity API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}