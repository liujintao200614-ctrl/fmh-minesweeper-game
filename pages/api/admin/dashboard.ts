import type { NextApiRequest, NextApiResponse } from 'next';
import EconomicBalanceSystemV3 from '../../../lib/economic-balance-v3';
import { rateLimit } from '../../../lib/rateLimit';

// 管理员权限验证
const ADMIN_TOKENS = new Set(process.env.ADMIN_TOKENS?.split(',') || []);

interface DashboardData {
  overview: {
    totalUsers: number;
    dailyActiveUsers: number;
    totalGames: number;
    totalRewards: number;
    economicHealth: number;
  };
  economics: {
    totalSupply: number;
    circulatingSupply: number;
    stakingPool: number;
    rewardPool: number;
    dailyInflation: number;
    burnRate: number;
  };
  gameplay: {
    winRate: number;
    averageGameTime: number;
    difficultySplit: Record<string, number>;
    hourlyDistribution: number[];
  };
  security: {
    suspiciousActivities: number;
    blockedRewards: number;
    riskDistribution: Record<string, number>;
    recentAlerts: any[];
  };
  social: {
    referralStats: {
      totalReferrals: number;
      conversionRate: number;
      topReferrers: any[];
    };
    socialShares: {
      totalShares: number;
      platformDistribution: Record<string, number>;
      engagement: number;
    };
  };
  achievements: {
    totalUnlocked: number;
    completionRate: Record<string, number>;
    popularAchievements: any[];
  };
  alerts: any[];
  timestamp: number;
}

// 速率限制：管理员每分钟最多30次请求
const limiter = rateLimit({
  interval: 60 * 1000,
  uniqueTokenPerInterval: 10,
});

/**
 * 管理后台仪表板API
 * GET /api/admin/dashboard
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DashboardData | { error: string }>
) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // 权限验证
    const authToken = req.headers.authorization?.replace('Bearer ', '');
    if (!authToken || !ADMIN_TOKENS.has(authToken)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // 速率限制
    try {
      await limiter.check(res, 30, authToken);
    } catch {
      return res.status(429).json({ error: 'Rate limit exceeded' });
    }

    // 获取仪表板数据
    const dashboardData = await generateDashboardData();

    res.status(200).json(dashboardData);

  } catch (error) {
    console.error('Dashboard API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * 生成仪表板数据
 */
async function generateDashboardData(): Promise<DashboardData> {
  const now = Date.now();
  const economicSystem = EconomicBalanceSystemV3.getInstance();

  // 并行获取各种数据
  const [
    overviewData,
    economicData,
    gameplayData,
    securityData,
    socialData,
    achievementData,
    alertData
  ] = await Promise.all([
    getOverviewData(),
    getEconomicData(),
    getGameplayData(),
    getSecurityData(),
    getSocialData(),
    getAchievementData(),
    getAlertData()
  ]);

  return {
    overview: overviewData,
    economics: economicData,
    gameplay: gameplayData,
    security: securityData,
    social: socialData,
    achievements: achievementData,
    alerts: alertData,
    timestamp: now
  };
}

/**
 * 获取概览数据
 */
async function getOverviewData(): Promise<DashboardData['overview']> {
  try {
    // 这里应该从数据库查询真实数据
    const economicSystem = EconomicBalanceSystemV3.getInstance();
    const healthScore = economicSystem.getEconomicHealthScore();

    return {
      totalUsers: await queryDatabase(`
        SELECT COUNT(*) as count FROM users WHERE is_active = 1
      `) || 50000,
      
      dailyActiveUsers: await queryDatabase(`
        SELECT COUNT(DISTINCT user_id) as count 
        FROM game_sessions 
        WHERE played_at > datetime('now', '-24 hours')
      `) || 1500,
      
      totalGames: await queryDatabase(`
        SELECT COUNT(*) as count FROM game_sessions
      `) || 500000,
      
      totalRewards: await queryDatabase(`
        SELECT SUM(reward_amount) as total FROM game_sessions WHERE reward_amount > 0
      `) || 2500000,
      
      economicHealth: Math.round(healthScore.score)
    };
  } catch (error) {
    console.error('Failed to get overview data:', error);
    // 返回模拟数据
    return {
      totalUsers: 50000,
      dailyActiveUsers: 1500,
      totalGames: 500000,
      totalRewards: 2500000,
      economicHealth: 75
    };
  }
}

/**
 * 获取经济数据
 */
async function getEconomicData(): Promise<DashboardData['economics']> {
  try {
    return {
      totalSupply: 10000000,
      circulatingSupply: 8500000,
      stakingPool: 2000000,
      rewardPool: 500000,
      dailyInflation: 0.0015, // 0.15%
      burnRate: 0.12 // 12%
    };
  } catch (error) {
    console.error('Failed to get economic data:', error);
    return {
      totalSupply: 0,
      circulatingSupply: 0,
      stakingPool: 0,
      rewardPool: 0,
      dailyInflation: 0,
      burnRate: 0
    };
  }
}

/**
 * 获取游戏数据
 */
async function getGameplayData(): Promise<DashboardData['gameplay']> {
  try {
    const difficultySplit = await queryDatabase(`
      SELECT difficulty, COUNT(*) as count 
      FROM game_sessions 
      WHERE played_at > datetime('now', '-7 days')
      GROUP BY difficulty
    `) || { easy: 40, medium: 35, hard: 25 };

    const hourlyData = [];
    for (let i = 0; i < 24; i++) {
      const count = await queryDatabase(`
        SELECT COUNT(*) as count 
        FROM game_sessions 
        WHERE strftime('%H', played_at) = '${i.toString().padStart(2, '0')}'
        AND played_at > datetime('now', '-7 days')
      `) || Math.floor(Math.random() * 100) + 50;
      hourlyData.push(count);
    }

    return {
      winRate: 0.65,
      averageGameTime: 180, // 3分钟
      difficultySplit,
      hourlyDistribution: hourlyData
    };
  } catch (error) {
    console.error('Failed to get gameplay data:', error);
    return {
      winRate: 0.65,
      averageGameTime: 180,
      difficultySplit: { easy: 40, medium: 35, hard: 25 },
      hourlyDistribution: Array(24).fill(0).map(() => Math.floor(Math.random() * 100) + 50)
    };
  }
}

/**
 * 获取安全数据
 */
async function getSecurityData(): Promise<DashboardData['security']> {
  try {
    const suspiciousCount = await queryDatabase(`
      SELECT COUNT(*) as count 
      FROM suspicious_activities 
      WHERE detected_at > strftime('%s', 'now', '-24 hours')
    `) || 12;

    const blockedRewards = await queryDatabase(`
      SELECT COUNT(*) as count 
      FROM game_sessions 
      WHERE reward_claimed = 0 AND reward_amount > 0
      AND played_at > datetime('now', '-24 hours')
    `) || 8;

    const recentAlerts = await queryDatabase(`
      SELECT activity_type, severity, description, detected_at
      FROM suspicious_activities 
      WHERE detected_at > strftime('%s', 'now', '-24 hours')
      ORDER BY detected_at DESC
      LIMIT 10
    `) || [];

    return {
      suspiciousActivities: suspiciousCount,
      blockedRewards: blockedRewards,
      riskDistribution: {
        LOW: 70,
        MEDIUM: 20,
        HIGH: 8,
        CRITICAL: 2
      },
      recentAlerts
    };
  } catch (error) {
    console.error('Failed to get security data:', error);
    return {
      suspiciousActivities: 12,
      blockedRewards: 8,
      riskDistribution: { LOW: 70, MEDIUM: 20, HIGH: 8, CRITICAL: 2 },
      recentAlerts: []
    };
  }
}

/**
 * 获取社交数据
 */
async function getSocialData(): Promise<DashboardData['social']> {
  try {
    const totalReferrals = 5000;
    const conversionRate = 0.68;
    
    return {
      referralStats: {
        totalReferrals,
        conversionRate,
        topReferrers: [
          { address: '0x123...abc', referrals: 156, rewards: 7800 },
          { address: '0x456...def', referrals: 134, rewards: 6700 },
          { address: '0x789...ghi', referrals: 98, rewards: 4900 }
        ]
      },
      socialShares: {
        totalShares: 15000,
        platformDistribution: {
          twitter: 45,
          discord: 25,
          facebook: 20,
          telegram: 10
        },
        engagement: 125000 // 总互动数
      }
    };
  } catch (error) {
    console.error('Failed to get social data:', error);
    return {
      referralStats: { totalReferrals: 0, conversionRate: 0, topReferrers: [] },
      socialShares: { totalShares: 0, platformDistribution: {}, engagement: 0 }
    };
  }
}

/**
 * 获取成就数据
 */
async function getAchievementData(): Promise<DashboardData['achievements']> {
  try {
    return {
      totalUnlocked: 125000,
      completionRate: {
        first_win: 95,
        win_10: 78,
        win_100: 35,
        speed_demon: 12,
        perfect_game: 8
      },
      popularAchievements: [
        { id: 'first_win', name: '初战告捷', unlocks: 47500 },
        { id: 'win_10', name: '小有成就', unlocks: 39000 },
        { id: 'streak_5', name: '连胜开始', unlocks: 28000 }
      ]
    };
  } catch (error) {
    console.error('Failed to get achievement data:', error);
    return {
      totalUnlocked: 0,
      completionRate: {},
      popularAchievements: []
    };
  }
}

/**
 * 获取警报数据
 */
async function getAlertData(): Promise<any[]> {
  try {
    // 这里应该从警报系统获取最新警报
    return [
      {
        id: '1',
        type: 'ECONOMIC',
        severity: 'MEDIUM',
        title: '每日奖励池使用率达到80%',
        description: '今日奖励池使用率较高，建议关注',
        timestamp: Date.now() - 3600000,
        status: 'active'
      },
      {
        id: '2',
        type: 'SECURITY',
        severity: 'HIGH',
        title: '检测到异常游戏模式',
        description: '多个账户出现类似的游戏行为模式',
        timestamp: Date.now() - 7200000,
        status: 'investigating'
      }
    ];
  } catch (error) {
    console.error('Failed to get alert data:', error);
    return [];
  }
}

/**
 * 模拟数据库查询
 */
async function queryDatabase(query: string): Promise<any> {
  // 实际实现中，这里应该是真实的数据库查询
  // 这里返回模拟数据用于演示
  console.log('Query:', query);
  
  // 可以根据查询类型返回不同的模拟数据
  if (query.includes('COUNT(*)')) {
    return Math.floor(Math.random() * 1000) + 100;
  }
  
  if (query.includes('SUM(')) {
    return Math.floor(Math.random() * 1000000) + 100000;
  }
  
  return null;
}