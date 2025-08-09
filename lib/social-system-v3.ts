import crypto from 'crypto';
import { PlayerStats } from './reward-system-v3';

// 推荐系统接口
export interface ReferralData {
  referrerId: string;
  refereeId: string;
  referralCode: string;
  signupTime: number;
  firstGameTime?: number;
  firstWinTime?: number;
  status: 'pending' | 'qualified' | 'rewarded' | 'expired';
  rewardsClaimed: {
    referrer: number;
    referee: number;
  };
  milestones: ReferralMilestone[];
}

export interface ReferralMilestone {
  id: string;
  name: string;
  description: string;
  condition: {
    type: 'games_played' | 'wins_achieved' | 'tokens_earned' | 'days_active';
    value: number;
  };
  rewards: {
    referrer: number;
    referee: number;
  };
  achieved: boolean;
  achievedAt?: number;
}

// 社交分享接口
export interface SocialShare {
  id: string;
  playerId: string;
  platform: 'twitter' | 'facebook' | 'discord' | 'telegram' | 'weibo';
  shareType: 'achievement' | 'high_score' | 'win_streak' | 'level_up' | 'custom';
  content: {
    title: string;
    description: string;
    imageUrl?: string;
    gameData?: any;
  };
  engagement: {
    likes: number;
    shares: number;
    comments: number;
    clicks: number;
  };
  rewards: {
    baseReward: number;
    engagementBonus: number;
    totalRewarded: number;
  };
  verified: boolean;
  createdAt: number;
  verifiedAt?: number;
}

// 社区排行榜
export interface CommunityLeaderboard {
  type: 'referral' | 'social' | 'gaming' | 'contribution';
  period: 'daily' | 'weekly' | 'monthly' | 'all_time';
  entries: LeaderboardEntry[];
  lastUpdate: number;
  nextUpdate: number;
}

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  playerName: string;
  avatar?: string;
  value: number;
  change: number; // 排名变化
  badge?: string;
}

// 社区活动
export interface CommunityEvent {
  id: string;
  name: string;
  description: string;
  type: 'competition' | 'challenge' | 'collaboration' | 'campaign';
  startTime: number;
  endTime: number;
  
  rules: {
    eligibility: string[];
    objectives: string[];
    scoring: string;
  };
  
  rewards: {
    totalPool: number;
    distribution: { rank: number; reward: number; additional?: string }[];
  };
  
  participants: {
    playerId: string;
    joinedAt: number;
    currentScore: number;
    submissions?: any[];
  }[];
  
  status: 'upcoming' | 'active' | 'ended' | 'cancelled';
  featuredContent?: {
    bannerUrl: string;
    videoUrl?: string;
    highlights: string[];
  };
}

// 用户声誉系统
export interface PlayerReputation {
  playerId: string;
  overallScore: number; // 0-1000
  components: {
    gaming: number;    // 游戏表现
    social: number;    // 社交贡献
    referral: number;  // 推荐贡献
    community: number; // 社区参与
    trust: number;     // 信任度
  };
  level: 'novice' | 'regular' | 'veteran' | 'expert' | 'legend' | 'ambassador';
  badges: string[];
  lastUpdate: number;
  history: ReputationChange[];
}

export interface ReputationChange {
  timestamp: number;
  reason: string;
  change: number;
  category: keyof PlayerReputation['components'];
}

/**
 * 社交推广系统V3.0
 * 功能：
 * - 多级推荐奖励体系
 * - 社交媒体分享验证
 * - 社区排行榜管理
 * - 声誉积分系统
 * - 社区活动组织
 * - KOL和大使计划
 */
export class SocialSystemV3 {
  private static instance: SocialSystemV3;
  
  // 推荐奖励配置
  private static readonly REFERRAL_CONFIG = {
    // 基础推荐奖励
    baseReferrerReward: 50,
    baseRefereeReward: 25,
    
    // 多级推荐（二级推荐）
    secondLevelEnabled: true,
    secondLevelRatio: 0.3, // 30%的一级奖励
    
    // 推荐码设置
    codeLength: 8,
    codeExpiry: 30 * 24 * 60 * 60 * 1000, // 30天
    
    // 资格要求
    qualificationRequirements: {
      minGames: 3,
      minWins: 1,
      timeWindow: 7 * 24 * 60 * 60 * 1000 // 7天内完成
    }
  };

  // 社交分享配置
  private static readonly SOCIAL_CONFIG = {
    platforms: {
      twitter: { baseReward: 5, verified: true, engagementMultiplier: 0.1 },
      facebook: { baseReward: 3, verified: false, engagementMultiplier: 0.05 },
      discord: { baseReward: 4, verified: true, engagementMultiplier: 0.08 },
      telegram: { baseReward: 3, verified: false, engagementMultiplier: 0.05 },
      weibo: { baseReward: 6, verified: true, engagementMultiplier: 0.12 }
    },
    dailyShareLimit: 5,
    verificationRequired: true,
    minEngagementForBonus: 10
  };

  // 声誉系统配置
  private static readonly REPUTATION_CONFIG = {
    maxScore: 1000,
    levelThresholds: {
      novice: 0,
      regular: 100,
      veteran: 250,
      expert: 500,
      legend: 750,
      ambassador: 900
    },
    decayRate: 0.99, // 每周99%保持率（轻微衰减）
    activityBonus: 1.02 // 活跃用户每周2%加成
  };

  private constructor() {}

  static getInstance(): SocialSystemV3 {
    if (!this.instance) {
      this.instance = new SocialSystemV3();
    }
    return this.instance;
  }

  /**
   * 生成推荐码
   */
  async generateReferralCode(playerId: string): Promise<string> {
    const existingCode = await this.getPlayerReferralCode(playerId);
    if (existingCode && !this.isReferralCodeExpired(existingCode)) {
      return existingCode;
    }

    let code: string;
    let attempts = 0;
    const maxAttempts = 10;

    do {
      code = this.createRandomCode();
      attempts++;
    } while (await this.isReferralCodeTaken(code) && attempts < maxAttempts);

    if (attempts >= maxAttempts) {
      throw new Error('Failed to generate unique referral code');
    }

    await this.saveReferralCode(playerId, code);
    return code;
  }

  /**
   * 处理推荐注册
   */
  async processReferralSignup(
    referralCode: string,
    newPlayerId: string
  ): Promise<{ success: boolean; referralData?: ReferralData; error?: string }> {
    try {
      // 验证推荐码
      const referrerId = await this.getReferrerIdByCode(referralCode);
      if (!referrerId) {
        return { success: false, error: 'Invalid referral code' };
      }

      // 检查是否已经被推荐过
      const existingReferral = await this.getExistingReferral(newPlayerId);
      if (existingReferral) {
        return { success: false, error: 'Player already has a referrer' };
      }

      // 创建推荐记录
      const referralData: ReferralData = {
        referrerId,
        refereeId: newPlayerId,
        referralCode,
        signupTime: Date.now(),
        status: 'pending',
        rewardsClaimed: { referrer: 0, referee: 0 },
        milestones: this.createDefaultMilestones()
      };

      await this.saveReferralData(referralData);

      // 更新声誉系统
      await this.updateReputation(referrerId, 'referral', 5, 'New referral signup');

      return { success: true, referralData };
    } catch (error) {
      console.error('Referral signup error:', error);
      return { success: false, error: 'Internal error' };
    }
  }

  /**
   * 检查推荐资格和发放奖励
   */
  async checkReferralQualification(playerId: string, playerStats: PlayerStats): Promise<void> {
    const referralData = await this.getReferralDataByReferee(playerId);
    if (!referralData || referralData.status !== 'pending') return;

    const { minGames, minWins, timeWindow } = SocialSystemV3.REFERRAL_CONFIG.qualificationRequirements;
    const signupAge = Date.now() - referralData.signupTime;

    // 检查时间窗口
    if (signupAge > timeWindow) {
      referralData.status = 'expired';
      await this.updateReferralData(referralData);
      return;
    }

    // 检查资格条件
    if (playerStats.totalGames >= minGames && playerStats.totalWins >= minWins) {
      referralData.status = 'qualified';
      referralData.firstGameTime = referralData.firstGameTime || Date.now();
      
      if (playerStats.totalWins >= 1 && !referralData.firstWinTime) {
        referralData.firstWinTime = Date.now();
        
        // 发放基础推荐奖励
        await this.distributeReferralRewards(referralData);
      }

      await this.updateReferralData(referralData);
    }

    // 检查里程碑
    await this.checkReferralMilestones(referralData, playerStats);
  }

  /**
   * 发放推荐奖励
   */
  private async distributeReferralRewards(referralData: ReferralData): Promise<void> {
    const { baseReferrerReward, baseRefereeReward } = SocialSystemV3.REFERRAL_CONFIG;

    // 获取推荐者等级影响
    const referrerStats = await this.getPlayerStats(referralData.referrerId);
    const levelMultiplier = this.getReferralLevelMultiplier(referrerStats?.playerLevel || 'bronze');

    const referrerReward = Math.floor(baseReferrerReward * levelMultiplier);
    const refereeReward = baseRefereeReward;

    try {
      // 发放奖励
      await this.grantTokenReward(referralData.referrerId, referrerReward, 'Referral reward');
      await this.grantTokenReward(referralData.refereeId, refereeReward, 'Welcome bonus');

      // 更新记录
      referralData.rewardsClaimed.referrer += referrerReward;
      referralData.rewardsClaimed.referee += refereeReward;
      referralData.status = 'rewarded';

      // 更新声誉
      await this.updateReputation(referralData.referrerId, 'referral', 15, 'Successful referral');

      // 二级推荐奖励（如果启用）
      if (SocialSystemV3.REFERRAL_CONFIG.secondLevelEnabled) {
        await this.processSecondLevelReferral(referralData.referrerId, referrerReward);
      }

    } catch (error) {
      console.error('Failed to distribute referral rewards:', error);
    }
  }

  /**
   * 处理社交分享
   */
  async processSocialShare(
    playerId: string,
    platform: keyof typeof SocialSystemV3.SOCIAL_CONFIG.platforms,
    shareType: SocialShare['shareType'],
    content: SocialShare['content'],
    shareUrl?: string
  ): Promise<{ success: boolean; share?: SocialShare; reward?: number; error?: string }> {
    try {
      // 检查今日分享次数
      const todayShares = await this.getTodayShareCount(playerId);
      if (todayShares >= SocialSystemV3.SOCIAL_CONFIG.dailyShareLimit) {
        return { success: false, error: 'Daily share limit reached' };
      }

      const platformConfig = SocialSystemV3.SOCIAL_CONFIG.platforms[platform];
      const baseReward = platformConfig.baseReward;

      // 创建分享记录
      const share: SocialShare = {
        id: crypto.randomUUID(),
        playerId,
        platform,
        shareType,
        content,
        engagement: { likes: 0, shares: 0, comments: 0, clicks: 0 },
        rewards: {
          baseReward,
          engagementBonus: 0,
          totalRewarded: baseReward
        },
        verified: false,
        createdAt: Date.now()
      };

      // 保存分享记录
      await this.saveSocialShare(share);

      // 立即发放基础奖励
      await this.grantTokenReward(playerId, baseReward, `${platform} share reward`);

      // 更新声誉
      await this.updateReputation(playerId, 'social', 2, 'Social media share');

      // 如果需要验证，启动验证流程
      if (platformConfig.verified && shareUrl) {
        await this.scheduleSocialVerification(share.id, shareUrl);
      }

      return { success: true, share, reward: baseReward };
    } catch (error) {
      console.error('Social share error:', error);
      return { success: false, error: 'Internal error' };
    }
  }

  /**
   * 更新社交分享互动数据
   */
  async updateShareEngagement(
    shareId: string,
    engagement: Partial<SocialShare['engagement']>
  ): Promise<void> {
    const share = await this.getSocialShare(shareId);
    if (!share) return;

    // 更新互动数据
    share.engagement = { ...share.engagement, ...engagement };

    // 计算互动奖励
    const totalEngagement = share.engagement.likes + share.engagement.shares + share.engagement.comments;
    
    if (totalEngagement >= SocialSystemV3.SOCIAL_CONFIG.minEngagementForBonus) {
      const platformConfig = SocialSystemV3.SOCIAL_CONFIG.platforms[share.platform];
      const engagementBonus = Math.floor(totalEngagement * platformConfig.engagementMultiplier);
      
      if (engagementBonus > share.rewards.engagementBonus) {
        const additionalBonus = engagementBonus - share.rewards.engagementBonus;
        share.rewards.engagementBonus = engagementBonus;
        share.rewards.totalRewarded += additionalBonus;

        // 发放额外奖励
        await this.grantTokenReward(share.playerId, additionalBonus, 'Social engagement bonus');
      }
    }

    await this.updateSocialShare(share);
  }

  /**
   * 更新玩家声誉
   */
  async updateReputation(
    playerId: string,
    category: keyof PlayerReputation['components'],
    change: number,
    reason: string
  ): Promise<PlayerReputation> {
    let reputation = await this.getPlayerReputation(playerId);
    
    if (!reputation) {
      reputation = this.createDefaultReputation(playerId);
    }

    // 应用变化
    reputation.components[category] = Math.max(0, reputation.components[category] + change);
    
    // 重新计算总分
    const weights = { gaming: 0.3, social: 0.2, referral: 0.2, community: 0.15, trust: 0.15 };
    reputation.overallScore = Object.entries(reputation.components)
      .reduce((sum, [key, value]) => sum + value * weights[key as keyof typeof weights], 0);

    // 更新等级
    const newLevel = this.calculateReputationLevel(reputation.overallScore);
    if (newLevel !== reputation.level) {
      reputation.level = newLevel;
      // 发放升级奖励
      await this.grantReputationLevelReward(playerId, newLevel);
    }

    // 记录变化
    reputation.history.push({
      timestamp: Date.now(),
      reason,
      change,
      category
    });

    // 保持历史记录不超过100条
    if (reputation.history.length > 100) {
      reputation.history = reputation.history.slice(-100);
    }

    reputation.lastUpdate = Date.now();
    
    await this.savePlayerReputation(reputation);
    
    return reputation;
  }

  /**
   * 获取社区排行榜
   */
  async getCommunityLeaderboard(
    type: CommunityLeaderboard['type'],
    period: CommunityLeaderboard['period'] = 'all_time',
    limit: number = 100
  ): Promise<CommunityLeaderboard> {
    const cacheKey = `leaderboard:${type}:${period}`;
    const cached = await this.getCachedLeaderboard(cacheKey);
    
    if (cached && this.isLeaderboardCacheValid(cached)) {
      return cached;
    }

    // 生成新的排行榜
    const entries = await this.generateLeaderboardEntries(type, period, limit);
    const leaderboard: CommunityLeaderboard = {
      type,
      period,
      entries,
      lastUpdate: Date.now(),
      nextUpdate: this.calculateNextUpdateTime(period)
    };

    await this.cacheLeaderboard(cacheKey, leaderboard);
    
    return leaderboard;
  }

  /**
   * 创建社区活动
   */
  async createCommunityEvent(
    eventData: Omit<CommunityEvent, 'id' | 'participants' | 'status'>
  ): Promise<CommunityEvent> {
    const event: CommunityEvent = {
      ...eventData,
      id: crypto.randomUUID(),
      participants: [],
      status: Date.now() < eventData.startTime ? 'upcoming' : 'active'
    };

    await this.saveCommunityEvent(event);
    
    // 发送社区通知
    await this.notifyCommunityEvent(event, 'created');
    
    return event;
  }

  /**
   * 参加社区活动
   */
  async joinCommunityEvent(eventId: string, playerId: string): Promise<boolean> {
    const event = await this.getCommunityEvent(eventId);
    if (!event || event.status !== 'active') return false;

    // 检查是否已参加
    if (event.participants.some(p => p.playerId === playerId)) return false;

    // 检查资格
    const isEligible = await this.checkEventEligibility(event, playerId);
    if (!isEligible) return false;

    // 添加参与者
    event.participants.push({
      playerId,
      joinedAt: Date.now(),
      currentScore: 0,
      submissions: []
    });

    await this.updateCommunityEvent(event);
    
    // 更新声誉
    await this.updateReputation(playerId, 'community', 3, `Joined event: ${event.name}`);
    
    return true;
  }

  // 工具方法
  private createRandomCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < SocialSystemV3.REFERRAL_CONFIG.codeLength; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private createDefaultMilestones(): ReferralMilestone[] {
    return [
      {
        id: 'm1',
        name: '首次游戏',
        description: '推荐用户完成首次游戏',
        condition: { type: 'games_played', value: 1 },
        rewards: { referrer: 10, referee: 5 },
        achieved: false
      },
      {
        id: 'm2',
        name: '连续活跃',
        description: '推荐用户连续活跃7天',
        condition: { type: 'days_active', value: 7 },
        rewards: { referrer: 25, referee: 15 },
        achieved: false
      },
      {
        id: 'm3',
        name: '高级玩家',
        description: '推荐用户获得100个FMH',
        condition: { type: 'tokens_earned', value: 100 },
        rewards: { referrer: 50, referee: 25 },
        achieved: false
      }
    ];
  }

  private getReferralLevelMultiplier(level: string): number {
    const multipliers: Record<string, number> = {
      bronze: 1.0,
      silver: 1.1,
      gold: 1.2,
      platinum: 1.3,
      diamond: 1.4,
      legend: 1.5
    };
    return multipliers[level] || 1.0;
  }

  private calculateReputationLevel(score: number): PlayerReputation['level'] {
    const thresholds = this.REPUTATION_CONFIG.levelThresholds;
    
    if (score >= thresholds.ambassador) return 'ambassador';
    if (score >= thresholds.legend) return 'legend';
    if (score >= thresholds.expert) return 'expert';
    if (score >= thresholds.veteran) return 'veteran';
    if (score >= thresholds.regular) return 'regular';
    return 'novice';
  }

  private createDefaultReputation(playerId: string): PlayerReputation {
    return {
      playerId,
      overallScore: 0,
      components: {
        gaming: 0,
        social: 0,
        referral: 0,
        community: 0,
        trust: 100 // 默认信任度
      },
      level: 'novice',
      badges: [],
      lastUpdate: Date.now(),
      history: []
    };
  }

  private calculateNextUpdateTime(period: CommunityLeaderboard['period']): number {
    const now = Date.now();
    switch (period) {
      case 'daily':
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return tomorrow.getTime();
      case 'weekly':
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + (7 - nextWeek.getDay()));
        nextWeek.setHours(0, 0, 0, 0);
        return nextWeek.getTime();
      case 'monthly':
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1, 1);
        nextMonth.setHours(0, 0, 0, 0);
        return nextMonth.getTime();
      default:
        return now + 24 * 60 * 60 * 1000; // 每天更新
    }
  }

  // 数据库操作方法（模拟实现）
  private async getPlayerReferralCode(playerId: string): Promise<string | null> { return null; }
  private async isReferralCodeTaken(code: string): Promise<boolean> { return false; }
  private async saveReferralCode(playerId: string, code: string): Promise<void> {}
  private async getReferrerIdByCode(code: string): Promise<string | null> { return null; }
  private async getExistingReferral(playerId: string): Promise<ReferralData | null> { return null; }
  private async saveReferralData(data: ReferralData): Promise<void> {}
  private async updateReferralData(data: ReferralData): Promise<void> {}
  private async getReferralDataByReferee(playerId: string): Promise<ReferralData | null> { return null; }
  private async getPlayerStats(playerId: string): Promise<PlayerStats | null> { return null; }
  private async grantTokenReward(playerId: string, amount: number, reason: string): Promise<void> {}
  private async processSecondLevelReferral(referrerId: string, amount: number): Promise<void> {}
  private async checkReferralMilestones(data: ReferralData, stats: PlayerStats): Promise<void> {}
  private async getTodayShareCount(playerId: string): Promise<number> { return 0; }
  private async saveSocialShare(share: SocialShare): Promise<void> {}
  private async scheduleSocialVerification(shareId: string, url: string): Promise<void> {}
  private async getSocialShare(shareId: string): Promise<SocialShare | null> { return null; }
  private async updateSocialShare(share: SocialShare): Promise<void> {}
  private async getPlayerReputation(playerId: string): Promise<PlayerReputation | null> { return null; }
  private async savePlayerReputation(reputation: PlayerReputation): Promise<void> {}
  private async grantReputationLevelReward(playerId: string, level: string): Promise<void> {}
  private async getCachedLeaderboard(key: string): Promise<CommunityLeaderboard | null> { return null; }
  private async cacheLeaderboard(key: string, data: CommunityLeaderboard): Promise<void> {}
  private async generateLeaderboardEntries(type: string, period: string, limit: number): Promise<LeaderboardEntry[]> { return []; }
  private async saveCommunityEvent(event: CommunityEvent): Promise<void> {}
  private async getCommunityEvent(eventId: string): Promise<CommunityEvent | null> { return null; }
  private async updateCommunityEvent(event: CommunityEvent): Promise<void> {}
  private async checkEventEligibility(event: CommunityEvent, playerId: string): Promise<boolean> { return true; }
  private async notifyCommunityEvent(event: CommunityEvent, action: string): Promise<void> {}
  
  private isReferralCodeExpired(code: string): boolean { return false; }
  private isLeaderboardCacheValid(leaderboard: CommunityLeaderboard): boolean { 
    return Date.now() < leaderboard.nextUpdate;
  }
}

export default SocialSystemV3;