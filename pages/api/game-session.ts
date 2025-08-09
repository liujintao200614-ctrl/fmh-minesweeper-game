import { NextApiRequest, NextApiResponse } from 'next';
import { AntiCheatSystem } from '../../lib/anti-cheat';
import { rateLimit, rateLimiters } from '../../lib/rateLimit';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // 速率限制
  if (!rateLimit(req, res, rateLimiters.api)) {
    return;
  }

  if (req.method === 'POST') {
    // 开始游戏会话
    const { action, gameId, playerAddress, board } = req.body;

    if (action === 'start') {
      try {
        AntiCheatSystem.startGameSession(gameId, playerAddress, board);
        res.status(200).json({ success: true, message: 'Game session started' });
      } catch (error) {
        console.error('Start game session error:', error);
        res.status(500).json({ success: false, error: 'Failed to start session' });
      }
    } else if (action === 'move') {
      // 记录玩家操作
      const { row, col, moveAction } = req.body;
      try {
        AntiCheatSystem.recordMove(gameId, playerAddress, row, col, moveAction);
        res.status(200).json({ success: true, message: 'Move recorded' });
      } catch (error) {
        console.error('Record move error:', error);
        res.status(500).json({ success: false, error: 'Failed to record move' });
      }
    } else {
      res.status(400).json({ success: false, error: 'Invalid action' });
    }
  } else if (req.method === 'GET') {
    // 获取会话统计
    try {
      const stats = AntiCheatSystem.getSessionStats();
      res.status(200).json({ success: true, stats });
    } catch (error) {
      console.error('Get session stats error:', error);
      res.status(500).json({ success: false, error: 'Failed to get stats' });
    }
  } else {
    res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}