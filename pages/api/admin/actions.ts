import type { NextApiRequest, NextApiResponse } from 'next';
import EconomicBalanceSystemV3, { BalanceAction } from '../../../lib/economic-balance-v3';
import AntiCheatSystemV3, { RiskProfile } from '../../../lib/anti-cheat-v3';
import AchievementSystemV3 from '../../../lib/achievement-system-v3';
import SocialSystemV3 from '../../../lib/social-system-v3';
import { rateLimit } from '../../../lib/rateLimit';
import crypto from 'crypto';

// 管理员权限级别
interface AdminUser {
  token: string;
  level: 'viewer' | 'operator' | 'admin' | 'superadmin';
  permissions: string[];
}

// 模拟管理员用户数据
const ADMIN_USERS: AdminUser[] = [
  {
    token: process.env.SUPERADMIN_TOKEN || 'super-admin-token',
    level: 'superadmin',
    permissions: ['*'] // 所有权限
  },
  {
    token: process.env.ADMIN_TOKEN || 'admin-token',
    level: 'admin',
    permissions: [
      'economic.view',
      'economic.adjust',
      'security.view',
      'security.block',
      'user.view',
      'user.moderate'
    ]
  },
  {
    token: process.env.OPERATOR_TOKEN || 'operator-token',
    level: 'operator',
    permissions: [
      'economic.view',
      'security.view',
      'user.view'
    ]
  }
];

interface ActionRequest {
  action: string;
  parameters: any;
  reason?: string;
}

interface ActionResponse {
  success: boolean;
  actionId?: string;
  result?: any;
  error?: string;
  timestamp: number;
}

// 速率限制
const limiter = rateLimit({
  interval: 60 * 1000,
  uniqueTokenPerInterval: 10,
});

/**
 * 管理员操作API
 * POST /api/admin/actions
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ActionResponse>
) {
  const timestamp = Date.now();

  try {
    if (req.method !== 'POST') {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed',
        timestamp
      });
    }

    // 权限验证
    const authToken = req.headers.authorization?.replace('Bearer ', '');
    const adminUser = ADMIN_USERS.find(user => user.token === authToken);
    
    if (!adminUser) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        timestamp
      });
    }

    // 速率限制
    try {
      await limiter.check(res, 20, authToken); // 管理员操作更严格的限制
    } catch {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        timestamp
      });
    }

    const { action, parameters, reason } = req.body as ActionRequest;

    if (!action) {
      return res.status(400).json({
        success: false,
        error: 'Action is required',
        timestamp
      });
    }

    // 执行操作
    const result = await executeAdminAction(action, parameters, reason, adminUser);
    
    // 记录管理员操作日志
    await logAdminAction({
      adminToken: authToken,
      adminLevel: adminUser.level,
      action,
      parameters,
      reason,
      result: result.success,
      timestamp,
      ip: getClientIP(req)
    });

    res.status(result.success ? 200 : 400).json({
      ...result,
      timestamp
    });

  } catch (error) {
    console.error('Admin action error:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp
    });
  }
}

/**
 * 执行管理员操作
 */
async function executeAdminAction(
  action: string,
  parameters: any,
  reason: string = 'Admin operation',
  adminUser: AdminUser
): Promise<Omit<ActionResponse, 'timestamp'>> {
  
  // 权限检查
  if (!hasPermission(adminUser, action)) {
    return {
      success: false,
      error: 'Insufficient permissions'
    };
  }

  try {
    switch (action) {
      // 经济系统操作
      case 'economic.adjust_rewards':
        return await adjustRewards(parameters, reason);
      
      case 'economic.emergency_stop':
        return await emergencyStop(parameters, reason);
      
      case 'economic.refill_pools':
        return await refillPools(parameters, reason);
      
      case 'economic.adjust_inflation':
        return await adjustInflation(parameters, reason);

      // 安全系统操作
      case 'security.block_user':
        return await blockUser(parameters, reason);
      
      case 'security.unblock_user':
        return await unblockUser(parameters, reason);
      
      case 'security.reset_risk_profile':
        return await resetRiskProfile(parameters, reason);
      
      case 'security.force_review':
        return await forceSecurityReview(parameters, reason);

      // 用户管理操作
      case 'user.ban':
        return await banUser(parameters, reason);
      
      case 'user.unban':
        return await unbanUser(parameters, reason);
      
      case 'user.reset_stats':
        return await resetUserStats(parameters, reason);
      
      case 'user.grant_achievement':
        return await grantAchievement(parameters, reason);

      // 系统维护操作
      case 'system.cache_clear':
        return await clearCache(parameters, reason);
      
      case 'system.recalculate_leaderboard':
        return await recalculateLeaderboard(parameters, reason);
      
      case 'system.backup_data':
        return await backupData(parameters, reason);

      // 社交系统操作
      case 'social.verify_share':
        return await verifySocialShare(parameters, reason);
      
      case 'social.create_event':
        return await createCommunityEvent(parameters, reason);
      
      case 'social.end_event':
        return await endCommunityEvent(parameters, reason);

      default:
        return {
          success: false,
          error: `Unknown action: ${action}`
        };
    }
  } catch (error) {
    console.error(`Admin action ${action} failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Operation failed'
    };
  }
}

/**
 * 权限检查
 */
function hasPermission(adminUser: AdminUser, action: string): boolean {
  // 超级管理员有所有权限
  if (adminUser.permissions.includes('*')) return true;
  
  // 检查具体权限
  const [category, operation] = action.split('.');
  return adminUser.permissions.includes(action) || 
         adminUser.permissions.includes(`${category}.*`);
}

// ===== 经济系统操作 =====

async function adjustRewards(params: { multiplier: number }, reason: string): Promise<any> {
  const economicSystem = EconomicBalanceSystemV3.getInstance();
  
  const action = await economicSystem.createBalanceAction({
    type: 'REWARD_ADJUST',
    reason: `Admin adjustment: ${reason}`,
    parameters: { multiplier: params.multiplier },
    impact: {
      expectedEffect: `Adjust rewards by ${params.multiplier}x`
    }
  });

  const executed = await economicSystem.executeBalanceAction(action.id);
  
  return {
    success: executed,
    actionId: action.id,
    result: { multiplier: params.multiplier }
  };
}

async function emergencyStop(params: { scope?: string }, reason: string): Promise<any> {
  const economicSystem = EconomicBalanceSystemV3.getInstance();
  
  const action = await economicSystem.createBalanceAction({
    type: 'EMERGENCY_STOP',
    reason: `Emergency stop: ${reason}`,
    parameters: { scope: params.scope || 'all' },
    impact: {
      expectedEffect: 'Halt reward distribution immediately'
    }
  });

  const executed = await economicSystem.executeBalanceAction(action.id);
  
  return {
    success: executed,
    actionId: action.id,
    result: { stopped: params.scope || 'all' }
  };
}

async function refillPools(params: { pool: string; amount: number }, reason: string): Promise<any> {
  const economicSystem = EconomicBalanceSystemV3.getInstance();
  
  const action = await economicSystem.createBalanceAction({
    type: 'MINT',
    reason: `Pool refill: ${reason}`,
    parameters: { 
      amount: params.amount, 
      poolName: params.pool 
    },
    impact: {
      supplyChange: params.amount,
      expectedEffect: `Add ${params.amount} tokens to ${params.pool} pool`
    }
  });

  const executed = await economicSystem.executeBalanceAction(action.id);
  
  return {
    success: executed,
    actionId: action.id,
    result: { pool: params.pool, amount: params.amount }
  };
}

async function adjustInflation(params: { targetRate: number }, reason: string): Promise<any> {
  // 实现通胀率调整逻辑
  return {
    success: true,
    result: { newInflationRate: params.targetRate }
  };
}

// ===== 安全系统操作 =====

async function blockUser(params: { userAddress: string; duration?: number }, reason: string): Promise<any> {
  // 实现用户封锁逻辑
  await saveUserBlock({
    userAddress: params.userAddress,
    blockedAt: Date.now(),
    duration: params.duration,
    reason,
    active: true
  });

  return {
    success: true,
    result: { 
      blocked: params.userAddress, 
      duration: params.duration || 'permanent' 
    }
  };
}

async function unblockUser(params: { userAddress: string }, reason: string): Promise<any> {
  // 实现用户解封逻辑
  await removeUserBlock(params.userAddress, reason);

  return {
    success: true,
    result: { unblocked: params.userAddress }
  };
}

async function resetRiskProfile(params: { userAddress: string }, reason: string): Promise<any> {
  // 重置用户风险档案
  return {
    success: true,
    result: { reset: params.userAddress }
  };
}

async function forceSecurityReview(params: { userAddress: string }, reason: string): Promise<any> {
  // 强制安全审查
  return {
    success: true,
    result: { reviewing: params.userAddress }
  };
}

// ===== 用户管理操作 =====

async function banUser(params: { userAddress: string; duration?: number }, reason: string): Promise<any> {
  return {
    success: true,
    result: { banned: params.userAddress }
  };
}

async function unbanUser(params: { userAddress: string }, reason: string): Promise<any> {
  return {
    success: true,
    result: { unbanned: params.userAddress }
  };
}

async function resetUserStats(params: { userAddress: string; statsType: string }, reason: string): Promise<any> {
  return {
    success: true,
    result: { reset: params.userAddress, type: params.statsType }
  };
}

async function grantAchievement(params: { userAddress: string; achievementId: string }, reason: string): Promise<any> {
  return {
    success: true,
    result: { granted: params.achievementId, to: params.userAddress }
  };
}

// ===== 系统维护操作 =====

async function clearCache(params: { cacheType?: string }, reason: string): Promise<any> {
  return {
    success: true,
    result: { cleared: params.cacheType || 'all' }
  };
}

async function recalculateLeaderboard(params: { type?: string }, reason: string): Promise<any> {
  return {
    success: true,
    result: { recalculated: params.type || 'all' }
  };
}

async function backupData(params: { tables?: string[] }, reason: string): Promise<any> {
  const backupId = crypto.randomUUID();
  return {
    success: true,
    result: { backupId, tables: params.tables || ['all'] }
  };
}

// ===== 社交系统操作 =====

async function verifySocialShare(params: { shareId: string; verified: boolean }, reason: string): Promise<any> {
  return {
    success: true,
    result: { shareId: params.shareId, verified: params.verified }
  };
}

async function createCommunityEvent(params: any, reason: string): Promise<any> {
  const socialSystem = SocialSystemV3.getInstance();
  const event = await socialSystem.createCommunityEvent(params);
  
  return {
    success: true,
    result: { eventId: event.id, name: event.name }
  };
}

async function endCommunityEvent(params: { eventId: string }, reason: string): Promise<any> {
  return {
    success: true,
    result: { ended: params.eventId }
  };
}

// ===== 辅助函数 =====

function getClientIP(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  return typeof forwarded === 'string' 
    ? forwarded.split(',')[0].trim()
    : req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';
}

async function logAdminAction(data: {
  adminToken: string;
  adminLevel: string;
  action: string;
  parameters: any;
  reason?: string;
  result: boolean;
  timestamp: number;
  ip: string;
}): Promise<void> {
  // 实际实现应该写入数据库
  console.log('Admin action logged:', {
    ...data,
    adminToken: data.adminToken.substring(0, 8) + '...' // 隐藏完整token
  });
}

// 模拟数据库操作
async function saveUserBlock(data: any): Promise<void> {
  console.log('User blocked:', data);
}

async function removeUserBlock(userAddress: string, reason: string): Promise<void> {
  console.log('User unblocked:', userAddress, reason);
}