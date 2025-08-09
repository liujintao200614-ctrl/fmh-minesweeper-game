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
    const { ip, date } = req.query;

    if (!ip || typeof ip !== 'string') {
      return res.status(400).json({ error: 'IP address is required' });
    }

    if (!date || typeof date !== 'string') {
      return res.status(400).json({ error: 'Date is required' });
    }

    // 验证日期格式
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      return res.status(400).json({ error: 'Invalid date format' });
    }

    const db = await DatabaseManager.getInstance();
    
    // 获取指定IP在指定日期的游戏次数
    const result = await db.get(`
      SELECT COUNT(*) as count
      FROM game_sessions gs
      WHERE DATE(gs.created_at) = DATE(?)
      AND JSON_EXTRACT(gs.client_info, '$.ipAddress') = ?
    `, [date, ip]);

    const count = result?.count || 0;

    // 记录IP查询（用于监控）
    if (count > 5) {
      console.warn(`🚨 High IP activity detected: ${ip} played ${count} games on ${date}`);
    }

    return res.status(200).json({
      success: true,
      count,
      ip,
      date,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('IP games count API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}