import { NextApiRequest, NextApiResponse } from 'next';

// 简单的内存速率限制器
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs: number, maxRequests: number) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const entry = this.store.get(identifier);

    if (!entry || now > entry.resetTime) {
      // 新窗口或过期，重置计数
      this.store.set(identifier, {
        count: 1,
        resetTime: now + this.windowMs
      });
      return true;
    }

    if (entry.count >= this.maxRequests) {
      return false;
    }

    // 增加计数
    entry.count++;
    this.store.set(identifier, entry);
    return true;
  }

  // 清理过期条目
  cleanup(): void {
    const now = Date.now();
    const entries = Array.from(this.store.entries());
    for (const [key, entry] of entries) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }
  }
}

// 不同API的速率限制器实例 - 更严格的限制
const verificationLimiter = new RateLimiter(60 * 1000, 5); // 每分钟5次（降低）
const scoreLimiter = new RateLimiter(60 * 1000, 3); // 每分钟3次（更严格）
const claimLimiter = new RateLimiter(60 * 1000, 2); // 奖励申请每分钟2次
const gameStartLimiter = new RateLimiter(60 * 1000, 8); // 开始游戏每分钟8次
const leaderboardLimiter = new RateLimiter(60 * 1000, 15); // 每分钟15次（降低）

// 定期清理
setInterval(() => {
  verificationLimiter.cleanup();
  scoreLimiter.cleanup();
  claimLimiter.cleanup();
  gameStartLimiter.cleanup();
  leaderboardLimiter.cleanup();
}, 5 * 60 * 1000); // 每5分钟清理一次

export function rateLimit(
  req: NextApiRequest,
  res: NextApiResponse,
  limiter: RateLimiter,
  identifier?: string
): boolean {
  // 使用IP地址作为标识符，如果提供了自定义标识符则使用它
  const clientIdentifier = identifier || getClientIP(req);
  
  if (!limiter.isAllowed(clientIdentifier)) {
    res.status(429).json({
      success: false,
      error: 'Too many requests. Please try again later.'
    });
    return false;
  }

  return true;
}

// 获取客户端IP地址
function getClientIP(req: NextApiRequest): string {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded 
    ? (Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0])
    : req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';
  
  return ip;
}

// 导出不同的限制器
export const rateLimiters = {
  verification: verificationLimiter,
  score: scoreLimiter,
  claim: claimLimiter,
  gameStart: gameStartLimiter,
  leaderboard: leaderboardLimiter
};