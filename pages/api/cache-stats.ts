import { NextApiRequest, NextApiResponse } from 'next';
import { cacheManager } from '../../lib/cache-manager';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    try {
      const stats = cacheManager.getStats();
      
      res.status(200).json({
        success: true,
        stats: {
          ...stats,
          hitRateFormatted: `${stats.hitRate}%`,
          memoryUsageFormatted: `${(stats.memoryUsage / 1024).toFixed(2)} KB`,
          utilizationRate: `${((stats.size / stats.maxSize) * 100).toFixed(2)}%`
        }
      });
    } catch (error) {
      console.error('Cache stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get cache stats'
      });
    }
  } else if (req.method === 'POST') {
    const { action } = req.body;
    
    try {
      if (action === 'cleanup') {
        cacheManager.cleanup();
        res.status(200).json({ success: true, message: 'Cache cleaned up' });
      } else if (action === 'clear') {
        cacheManager.clear();
        res.status(200).json({ success: true, message: 'Cache cleared' });
      } else {
        res.status(400).json({ success: false, error: 'Invalid action' });
      }
    } catch (error) {
      console.error('Cache management error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to perform cache operation'
      });
    }
  } else {
    res.status(405).json({ success: false, error: 'Method not allowed' });
  }
}