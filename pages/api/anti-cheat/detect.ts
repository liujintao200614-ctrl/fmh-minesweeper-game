import type { NextApiRequest, NextApiResponse } from 'next';
import AntiCheatSystemV3, { GameSession, SuspiciousActivity, RiskProfile } from '../../../lib/anti-cheat-v3';
import { rateLimit } from '../../../lib/rateLimit';
import crypto from 'crypto';

interface DetectionRequest {
  gameSession: GameSession;
  signature: string;
  timestamp: number;
}

interface DetectionResponse {
  success: boolean;
  activities: SuspiciousActivity[];
  riskProfile?: RiskProfile;
  shouldBlock: boolean;
  blockReason?: string;
  confidence: number;
  sessionId: string;
  error?: string;
}

// 速率限制：每个IP每分钟最多30次请求
const limiter = rateLimit({
  interval: 60 * 1000, // 1分钟
  uniqueTokenPerInterval: 500,
});

/**
 * 反作弊检测API端点
 * POST /api/anti-cheat/detect
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DetectionResponse>
) {
  const sessionId = crypto.randomUUID();

  try {
    // 方法检查
    if (req.method !== 'POST') {
      return res.status(405).json({
        success: false,
        activities: [],
        shouldBlock: false,
        confidence: 0,
        sessionId,
        error: 'Method not allowed'
      });
    }

    // 速率限制
    try {
      await limiter.check(res, 30, getClientIP(req));
    } catch {
      return res.status(429).json({
        success: false,
        activities: [],
        shouldBlock: true,
        confidence: 1.0,
        sessionId,
        blockReason: 'Rate limit exceeded',
        error: 'Too many requests'
      });
    }

    const { gameSession, signature, timestamp } = req.body as DetectionRequest;

    // 参数验证
    if (!gameSession || !signature || !timestamp) {
      return res.status(400).json({
        success: false,
        activities: [],
        shouldBlock: false,
        confidence: 0,
        sessionId,
        error: 'Missing required parameters'
      });
    }

    // 时间戳验证（防重放攻击）
    const now = Date.now();
    const timeDiff = Math.abs(now - timestamp);
    if (timeDiff > 300000) { // 5分钟有效期
      return res.status(400).json({
        success: false,
        activities: [],
        shouldBlock: true,
        confidence: 1.0,
        sessionId,
        blockReason: 'Request timestamp too old or in future',
        error: 'Invalid timestamp'
      });
    }

    // 签名验证
    const expectedSignature = generateDetectionSignature(gameSession, timestamp);
    if (!crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'))) {
      return res.status(401).json({
        success: false,
        activities: [],
        shouldBlock: true,
        confidence: 1.0,
        sessionId,
        blockReason: 'Invalid signature',
        error: 'Authentication failed'
      });
    }

    // 增强客户端信息
    gameSession.clientInfo.ipAddress = getClientIP(req);
    gameSession.clientInfo.userAgent = req.headers['user-agent'] || '';

    // 执行反作弊检测
    const activities = await AntiCheatSystemV3.detectSuspiciousActivity(gameSession);

    // 更新风险档案
    const riskProfile = await AntiCheatSystemV3.updateRiskProfile(
      gameSession.playerAddress, 
      activities
    );

    // 判断是否应该阻止
    const blockDecision = AntiCheatSystemV3.shouldBlockReward(activities, riskProfile);

    // 记录检测结果
    await logDetectionResult({
      sessionId,
      playerAddress: gameSession.playerAddress,
      gameId: gameSession.gameId.toString(),
      activitiesCount: activities.length,
      riskScore: riskProfile.overallRiskScore,
      shouldBlock: blockDecision.shouldBlock,
      timestamp: now,
      clientIP: getClientIP(req)
    });

    // 如果检测到严重问题，发送实时警报
    if (blockDecision.shouldBlock && blockDecision.confidence > 0.9) {
      await sendRealTimeAlert({
        type: 'HIGH_RISK_DETECTION',
        playerAddress: gameSession.playerAddress,
        activities,
        riskScore: riskProfile.overallRiskScore,
        sessionId
      });
    }

    const response: DetectionResponse = {
      success: true,
      activities,
      riskProfile,
      shouldBlock: blockDecision.shouldBlock,
      blockReason: blockDecision.reason,
      confidence: blockDecision.confidence,
      sessionId
    };

    res.status(200).json(response);

  } catch (error) {
    console.error('Anti-cheat detection error:', error);
    
    // 记录错误
    await logDetectionError({
      sessionId,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now(),
      clientIP: getClientIP(req)
    });

    res.status(500).json({
      success: false,
      activities: [],
      shouldBlock: false,
      confidence: 0,
      sessionId,
      error: 'Internal server error'
    });
  }
}

/**
 * 生成检测请求签名
 */
function generateDetectionSignature(gameSession: GameSession, timestamp: number): string {
  const data = JSON.stringify({
    gameId: gameSession.gameId,
    playerAddress: gameSession.playerAddress,
    startTime: gameSession.startTime,
    endTime: gameSession.endTime,
    timestamp
  });
  
  const secret = process.env.DETECTION_SECRET || 'detection-secret-key';
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/**
 * 获取客户端IP地址
 */
function getClientIP(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = typeof forwarded === 'string' 
    ? forwarded.split(',')[0].trim()
    : req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';
  
  return ip;
}

/**
 * 记录检测结果
 */
async function logDetectionResult(data: {
  sessionId: string;
  playerAddress: string;
  gameId: string;
  activitiesCount: number;
  riskScore: number;
  shouldBlock: boolean;
  timestamp: number;
  clientIP: string;
}): Promise<void> {
  try {
    // 这里应该写入数据库
    console.log('Detection result:', data);
    
    // 如果有数据库连接，可以这样做：
    // await db.query(`
    //   INSERT INTO anti_cheat_logs 
    //   (session_id, player_address, game_id, activities_count, risk_score, should_block, timestamp, client_ip)
    //   VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    // `, [data.sessionId, data.playerAddress, data.gameId, data.activitiesCount, data.riskScore, data.shouldBlock, data.timestamp, data.clientIP]);
  } catch (error) {
    console.error('Failed to log detection result:', error);
  }
}

/**
 * 记录检测错误
 */
async function logDetectionError(data: {
  sessionId: string;
  error: string;
  timestamp: number;
  clientIP: string;
}): Promise<void> {
  try {
    console.error('Detection error:', data);
  } catch (error) {
    console.error('Failed to log detection error:', error);
  }
}

/**
 * 发送实时警报
 */
async function sendRealTimeAlert(data: {
  type: string;
  playerAddress: string;
  activities: SuspiciousActivity[];
  riskScore: number;
  sessionId: string;
}): Promise<void> {
  try {
    // 这里可以集成警报系统，如发送邮件、Slack通知等
    console.warn('🚨 High risk detection alert:', data);
    
    // 示例：发送到监控系统
    if (process.env.ALERT_WEBHOOK_URL) {
      await fetch(process.env.ALERT_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `🚨 High Risk Detection Alert`,
          attachments: [{
            color: 'danger',
            fields: [
              { title: 'Player', value: data.playerAddress, short: true },
              { title: 'Risk Score', value: data.riskScore.toString(), short: true },
              { title: 'Activities', value: data.activities.length.toString(), short: true },
              { title: 'Session ID', value: data.sessionId, short: true }
            ]
          }]
        })
      });
    }
  } catch (error) {
    console.error('Failed to send alert:', error);
  }
}