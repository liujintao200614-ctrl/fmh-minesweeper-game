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
    const { fingerprint } = req.query;

    if (!fingerprint || typeof fingerprint !== 'string') {
      return res.status(400).json({ error: 'Fingerprint is required' });
    }

    if (fingerprint.length < 10) {
      return res.status(400).json({ error: 'Invalid fingerprint format' });
    }

    const db = await DatabaseManager.getInstance();
    
    // 获取使用相同设备指纹的不同钱包地址
    const accounts = await db.all(`
      SELECT DISTINCT u.wallet_address
      FROM users u
      JOIN game_sessions gs ON u.id = gs.user_id
      WHERE JSON_EXTRACT(gs.client_info, '$.fingerprint') = ?
      AND gs.created_at > datetime('now', '-30 days')
      ORDER BY MAX(gs.created_at) DESC
      LIMIT 10
    `, [fingerprint]);

    const walletAddresses = accounts.map(account => account.wallet_address);

    // 如果检测到多个账户，记录警告
    if (walletAddresses.length > 3) {
      console.warn(`🚨 Multi-account detection: ${walletAddresses.length} accounts with fingerprint ${fingerprint.substring(0, 8)}...`);
    }

    return res.status(200).json({
      success: true,
      accounts: walletAddresses,
      fingerprint: fingerprint.substring(0, 8) + '...', // 只返回前8位用于隐私保护
      count: walletAddresses.length,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('Accounts by fingerprint API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}