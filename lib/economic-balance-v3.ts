import crypto from 'crypto';

// 经济数据接口
export interface EconomicMetrics {
  totalSupply: number;
  circulatingSupply: number;
  dailyMinted: number;
  dailyBurned: number;
  stakingPool: number;
  rewardPool: number;
  treasuryReserve: number;
  
  // 用户活动指标
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  totalUsers: number;
  newUserRate: number;
  
  // 游戏指标
  dailyGames: number;
  winRate: number;
  averageGameDuration: number;
  
  // 经济健康指标
  inflationRate: number; // 年化通胀率
  stakingRatio: number; // 质押比例
  burnRate: number; // 销毁率
  
  // 时间戳
  timestamp: number;
  dateString: string;
}

export interface BalanceAction {
  id: string;
  type: 'MINT' | 'BURN' | 'REWARD_ADJUST' | 'POOL_REBALANCE' | 'EMERGENCY_STOP';
  reason: string;
  parameters: {
    amount?: number;
    multiplier?: number;
    poolName?: string;
    newLimit?: number;
  };
  impact: {
    supplyChange?: number;
    inflationChange?: number;
    expectedEffect: string;
  };
  executed: boolean;
  executedAt?: number;
  createdAt: number;
  createdBy: string;
}

export interface AlertCondition {
  id: string;
  name: string;
  type: 'INFLATION_HIGH' | 'DEFLATION_HIGH' | 'USER_SPIKE' | 'REWARD_DEPLETION' | 'STAKING_LOW';
  condition: {
    metric: keyof EconomicMetrics;
    operator: '>=' | '<=' | '>' | '<' | '==';
    threshold: number;
  };
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  isActive: boolean;
  lastTriggered?: number;
  actions: string[]; // 触发时执行的自动化操作
}

/**
 * FMH代币经济平衡系统V3.0
 * 功能：
 * - 实时监控经济指标
 * - 自动调节奖励参数
 * - 动态通胀/通缩控制
 * - 紧急干预机制
 * - 长期经济健康维护
 */
export class EconomicBalanceSystemV3 {
  private static instance: EconomicBalanceSystemV3;
  private metrics: EconomicMetrics | null = null;
  private alertConditions: Map<string, AlertCondition> = new Map();
  private actionHistory: BalanceAction[] = [];
  
  // 经济平衡参数
  private static readonly BALANCE_PARAMETERS = {
    // 通胀控制
    targetInflationRate: 0.05, // 5% 年化目标通胀率
    maxDailyInflation: 0.001, // 0.1% 日最大通胀
    minDailyInflation: -0.0005, // -0.05% 日最小通胀（轻微通缩）
    
    // 用户活跃度
    optimalDailyUsers: 2000, // 理想日活
    userGrowthTarget: 0.02, // 2% 日增长目标
    
    // 奖励池管理
    minRewardPoolRatio: 0.1, // 奖励池最少占总供应量10%
    maxRewardPoolRatio: 0.3, // 奖励池最多占总供应量30%
    rewardPoolRefillRate: 0.01, // 每日补充1%
    
    // 质押经济
    targetStakingRatio: 0.4, // 40%理想质押率
    stakingRewardRate: 0.08, // 8%年化质押奖励
    
    // 销毁机制
    baseBurnRate: 0.1, // 10%的消费被销毁
    excessBurnRate: 0.2, // 高通胀时额外销毁
    
    // 紧急阈值
    emergencyInflationRate: 0.01, // 1%日通胀紧急线
    emergencyDeflationRate: -0.005, // -0.5%日通缩紧急线
    minCirculatingSupply: 1000000, // 最少流通量
  };

  private constructor() {
    this.initializeAlertConditions();
  }

  static getInstance(): EconomicBalanceSystemV3 {
    if (!this.instance) {
      this.instance = new EconomicBalanceSystemV3();
    }
    return this.instance;
  }

  /**
   * 初始化警报条件
   */
  private initializeAlertConditions(): void {
    const conditions: AlertCondition[] = [
      {
        id: 'high_inflation',
        name: '高通胀警报',
        type: 'INFLATION_HIGH',
        condition: {
          metric: 'inflationRate',
          operator: '>=',
          threshold: EconomicBalanceSystemV3.BALANCE_PARAMETERS.emergencyInflationRate
        },
        severity: 'CRITICAL',
        isActive: true,
        actions: ['reduce_rewards', 'increase_burn_rate', 'notify_admin']
      },
      {
        id: 'high_deflation',
        name: '高通缩警报',
        type: 'DEFLATION_HIGH',
        condition: {
          metric: 'inflationRate',
          operator: '<=',
          threshold: EconomicBalanceSystemV3.BALANCE_PARAMETERS.emergencyDeflationRate
        },
        severity: 'CRITICAL',
        isActive: true,
        actions: ['increase_rewards', 'reduce_burn_rate', 'notify_admin']
      },
      {
        id: 'low_reward_pool',
        name: '奖励池不足',
        type: 'REWARD_DEPLETION',
        condition: {
          metric: 'rewardPool',
          operator: '<=',
          threshold: 50000 // 5万FMH
        },
        severity: 'HIGH',
        isActive: true,
        actions: ['refill_reward_pool', 'reduce_reward_rates']
      },
      {
        id: 'user_activity_spike',
        name: '用户活跃度激增',
        type: 'USER_SPIKE',
        condition: {
          metric: 'dailyActiveUsers',
          operator: '>=',
          threshold: 5000
        },
        severity: 'MEDIUM',
        isActive: true,
        actions: ['increase_pool_limits', 'scale_infrastructure']
      },
      {
        id: 'low_staking_ratio',
        name: '质押率过低',
        type: 'STAKING_LOW',
        condition: {
          metric: 'stakingRatio',
          operator: '<=',
          threshold: 0.2 // 20%
        },
        severity: 'MEDIUM',
        isActive: true,
        actions: ['increase_staking_rewards', 'promote_staking']
      }
    ];

    conditions.forEach(condition => {
      this.alertConditions.set(condition.id, condition);
    });
  }

  /**
   * 更新经济指标
   */
  async updateMetrics(newMetrics: Partial<EconomicMetrics>): Promise<EconomicMetrics> {
    const now = Date.now();
    const currentMetrics = await this.getCurrentMetrics();
    
    this.metrics = {
      ...currentMetrics,
      ...newMetrics,
      timestamp: now,
      dateString: new Date(now).toISOString()
    };

    // 计算衍生指标
    this.calculateDerivedMetrics();
    
    // 检查警报条件
    await this.checkAlertConditions();
    
    // 保存指标到数据库
    await this.saveMetrics(this.metrics);
    
    return this.metrics;
  }

  /**
   * 计算衍生指标
   */
  private calculateDerivedMetrics(): void {
    if (!this.metrics) return;

    // 计算通胀率（年化）
    if (this.metrics.dailyMinted > 0) {
      this.metrics.inflationRate = (this.metrics.dailyMinted / this.metrics.totalSupply) * 365;
    }

    // 计算质押比例
    if (this.metrics.totalSupply > 0) {
      this.metrics.stakingRatio = this.metrics.stakingPool / this.metrics.totalSupply;
    }

    // 计算销毁率
    if (this.metrics.dailyMinted > 0) {
      this.metrics.burnRate = this.metrics.dailyBurned / this.metrics.dailyMinted;
    }
  }

  /**
   * 检查警报条件
   */
  private async checkAlertConditions(): Promise<void> {
    if (!this.metrics) return;

    for (const [id, condition] of this.alertConditions) {
      if (!condition.isActive) continue;

      const metricValue = this.metrics[condition.condition.metric] as number;
      const shouldTrigger = this.evaluateCondition(
        metricValue,
        condition.condition.operator,
        condition.condition.threshold
      );

      if (shouldTrigger) {
        await this.triggerAlert(condition);
      }
    }
  }

  /**
   * 评估条件
   */
  private evaluateCondition(value: number, operator: string, threshold: number): boolean {
    switch (operator) {
      case '>=': return value >= threshold;
      case '<=': return value <= threshold;
      case '>': return value > threshold;
      case '<': return value < threshold;
      case '==': return value === threshold;
      default: return false;
    }
  }

  /**
   * 触发警报
   */
  private async triggerAlert(condition: AlertCondition): Promise<void> {
    const now = Date.now();
    
    // 避免短时间内重复触发
    if (condition.lastTriggered && (now - condition.lastTriggered) < 300000) { // 5分钟冷却
      return;
    }

    console.warn(`🚨 Economic Alert Triggered: ${condition.name}`);
    
    // 执行自动化操作
    for (const actionType of condition.actions) {
      try {
        await this.executeAutomatedAction(actionType, condition);
      } catch (error) {
        console.error(`Failed to execute action ${actionType}:`, error);
      }
    }

    // 更新触发时间
    condition.lastTriggered = now;
    
    // 发送通知
    await this.sendAlertNotification(condition);
  }

  /**
   * 执行自动化操作
   */
  private async executeAutomatedAction(actionType: string, condition: AlertCondition): Promise<void> {
    const now = Date.now();
    
    switch (actionType) {
      case 'reduce_rewards':
        await this.createBalanceAction({
          type: 'REWARD_ADJUST',
          reason: `Reduce rewards due to ${condition.name}`,
          parameters: { multiplier: 0.8 },
          impact: {
            expectedEffect: 'Reduce token inflation by 20%'
          }
        });
        break;

      case 'increase_rewards':
        await this.createBalanceAction({
          type: 'REWARD_ADJUST',
          reason: `Increase rewards due to ${condition.name}`,
          parameters: { multiplier: 1.2 },
          impact: {
            expectedEffect: 'Increase token inflation by 20%'
          }
        });
        break;

      case 'increase_burn_rate':
        await this.createBalanceAction({
          type: 'POOL_REBALANCE',
          reason: `Increase burn rate due to ${condition.name}`,
          parameters: { multiplier: 1.5 },
          impact: {
            expectedEffect: 'Increase token burn by 50%'
          }
        });
        break;

      case 'refill_reward_pool':
        const refillAmount = Math.min(100000, this.metrics!.totalSupply * 0.01);
        await this.createBalanceAction({
          type: 'MINT',
          reason: `Refill reward pool due to ${condition.name}`,
          parameters: { amount: refillAmount, poolName: 'reward' },
          impact: {
            supplyChange: refillAmount,
            expectedEffect: 'Maintain reward distribution'
          }
        });
        break;

      case 'notify_admin':
        await this.sendAdminNotification(condition);
        break;
    }
  }

  /**
   * 创建平衡操作
   */
  async createBalanceAction(params: {
    type: BalanceAction['type'];
    reason: string;
    parameters: BalanceAction['parameters'];
    impact: BalanceAction['impact'];
  }): Promise<BalanceAction> {
    const action: BalanceAction = {
      id: crypto.randomUUID(),
      type: params.type,
      reason: params.reason,
      parameters: params.parameters,
      impact: params.impact,
      executed: false,
      createdAt: Date.now(),
      createdBy: 'system'
    };

    this.actionHistory.push(action);
    await this.saveBalanceAction(action);
    
    // 如果是紧急情况，立即执行
    if (params.type === 'EMERGENCY_STOP' || 
        this.metrics?.inflationRate && Math.abs(this.metrics.inflationRate) > 0.01) {
      await this.executeBalanceAction(action.id);
    }

    return action;
  }

  /**
   * 执行平衡操作
   */
  async executeBalanceAction(actionId: string): Promise<boolean> {
    const action = this.actionHistory.find(a => a.id === actionId);
    if (!action || action.executed) return false;

    try {
      switch (action.type) {
        case 'MINT':
          await this.executeMint(action);
          break;
        case 'BURN':
          await this.executeBurn(action);
          break;
        case 'REWARD_ADJUST':
          await this.executeRewardAdjust(action);
          break;
        case 'POOL_REBALANCE':
          await this.executePoolRebalance(action);
          break;
        case 'EMERGENCY_STOP':
          await this.executeEmergencyStop(action);
          break;
      }

      action.executed = true;
      action.executedAt = Date.now();
      
      await this.updateBalanceAction(action);
      
      console.log(`✅ Balance action executed: ${action.type} - ${action.reason}`);
      return true;
      
    } catch (error) {
      console.error(`Failed to execute balance action ${actionId}:`, error);
      return false;
    }
  }

  /**
   * 获取经济健康评分
   */
  getEconomicHealthScore(): {
    score: number; // 0-100
    factors: {
      inflation: number;
      userActivity: number;
      tokenDistribution: number;
      rewardSustainability: number;
    };
    recommendations: string[];
  } {
    if (!this.metrics) {
      return {
        score: 50,
        factors: { inflation: 50, userActivity: 50, tokenDistribution: 50, rewardSustainability: 50 },
        recommendations: ['Insufficient data for analysis']
      };
    }

    const factors = {
      inflation: this.evaluateInflationHealth(),
      userActivity: this.evaluateUserActivityHealth(),
      tokenDistribution: this.evaluateTokenDistributionHealth(),
      rewardSustainability: this.evaluateRewardSustainabilityHealth()
    };

    const score = (factors.inflation + factors.userActivity + factors.tokenDistribution + factors.rewardSustainability) / 4;
    const recommendations = this.generateRecommendations(factors);

    return { score, factors, recommendations };
  }

  /**
   * 评估通胀健康度
   */
  private evaluateInflationHealth(): number {
    if (!this.metrics) return 50;
    
    const { inflationRate } = this.metrics;
    const target = EconomicBalanceSystemV3.BALANCE_PARAMETERS.targetInflationRate;
    
    // 计算偏离度
    const deviation = Math.abs(inflationRate - target) / target;
    
    // 转换为分数 (0-100)
    return Math.max(0, Math.min(100, 100 - deviation * 200));
  }

  /**
   * 评估用户活跃度健康
   */
  private evaluateUserActivityHealth(): number {
    if (!this.metrics) return 50;
    
    const { dailyActiveUsers, newUserRate } = this.metrics;
    const targetUsers = EconomicBalanceSystemV3.BALANCE_PARAMETERS.optimalDailyUsers;
    const targetGrowth = EconomicBalanceSystemV3.BALANCE_PARAMETERS.userGrowthTarget;
    
    const userScore = Math.min(100, (dailyActiveUsers / targetUsers) * 100);
    const growthScore = Math.min(100, (newUserRate / targetGrowth) * 100);
    
    return (userScore + growthScore) / 2;
  }

  /**
   * 评估代币分布健康度
   */
  private evaluateTokenDistributionHealth(): number {
    if (!this.metrics) return 50;
    
    const { stakingRatio, rewardPool, totalSupply } = this.metrics;
    const targetStaking = EconomicBalanceSystemV3.BALANCE_PARAMETERS.targetStakingRatio;
    const rewardRatio = rewardPool / totalSupply;
    
    const stakingScore = Math.min(100, (stakingRatio / targetStaking) * 100);
    const rewardPoolScore = rewardRatio > EconomicBalanceSystemV3.BALANCE_PARAMETERS.minRewardPoolRatio ? 100 : 50;
    
    return (stakingScore + rewardPoolScore) / 2;
  }

  /**
   * 评估奖励可持续性
   */
  private evaluateRewardSustainabilityHealth(): number {
    if (!this.metrics) return 50;
    
    const { rewardPool, dailyMinted, dailyBurned } = this.metrics;
    const burnBalance = dailyBurned / Math.max(dailyMinted, 1);
    
    const poolScore = rewardPool > 100000 ? 100 : (rewardPool / 100000) * 100;
    const burnScore = burnBalance > 0.1 ? 100 : (burnBalance / 0.1) * 100;
    
    return (poolScore + burnScore) / 2;
  }

  /**
   * 生成改进建议
   */
  private generateRecommendations(factors: any): string[] {
    const recommendations: string[] = [];
    
    if (factors.inflation < 70) {
      if (this.metrics!.inflationRate > EconomicBalanceSystemV3.BALANCE_PARAMETERS.targetInflationRate) {
        recommendations.push('考虑减少奖励发放或增加代币销毁机制');
      } else {
        recommendations.push('考虑增加奖励发放以刺激代币流通');
      }
    }
    
    if (factors.userActivity < 70) {
      recommendations.push('需要增加用户获取和留存策略');
      recommendations.push('考虑推出新的激励活动');
    }
    
    if (factors.tokenDistribution < 70) {
      recommendations.push('优化质押奖励以提高质押参与度');
      recommendations.push('考虑调整奖励池分配策略');
    }
    
    if (factors.rewardSustainability < 70) {
      recommendations.push('需要增加代币销毁机制的效率');
      recommendations.push('考虑引入更多代币使用场景');
    }
    
    return recommendations;
  }

  // 数据库操作方法（模拟实现）
  private async getCurrentMetrics(): Promise<EconomicMetrics> {
    // 实际实现应从数据库获取
    return this.metrics || {
      totalSupply: 10000000,
      circulatingSupply: 8000000,
      dailyMinted: 5000,
      dailyBurned: 500,
      stakingPool: 2000000,
      rewardPool: 500000,
      treasuryReserve: 1500000,
      dailyActiveUsers: 1500,
      weeklyActiveUsers: 8000,
      totalUsers: 50000,
      newUserRate: 0.02,
      dailyGames: 10000,
      winRate: 0.65,
      averageGameDuration: 180,
      inflationRate: 0.05,
      stakingRatio: 0.25,
      burnRate: 0.1,
      timestamp: Date.now(),
      dateString: new Date().toISOString()
    };
  }

  private async saveMetrics(metrics: EconomicMetrics): Promise<void> {
    console.log('Economic metrics updated:', metrics);
  }

  private async saveBalanceAction(action: BalanceAction): Promise<void> {
    console.log('Balance action created:', action);
  }

  private async updateBalanceAction(action: BalanceAction): Promise<void> {
    console.log('Balance action updated:', action);
  }

  private async sendAlertNotification(condition: AlertCondition): Promise<void> {
    console.warn(`Alert notification: ${condition.name}`);
  }

  private async sendAdminNotification(condition: AlertCondition): Promise<void> {
    console.warn(`Admin notification: ${condition.name}`);
  }

  // 操作执行方法（模拟实现）
  private async executeMint(action: BalanceAction): Promise<void> {
    console.log(`Minting ${action.parameters.amount} tokens to ${action.parameters.poolName}`);
  }

  private async executeBurn(action: BalanceAction): Promise<void> {
    console.log(`Burning ${action.parameters.amount} tokens`);
  }

  private async executeRewardAdjust(action: BalanceAction): Promise<void> {
    console.log(`Adjusting rewards by multiplier ${action.parameters.multiplier}`);
  }

  private async executePoolRebalance(action: BalanceAction): Promise<void> {
    console.log(`Rebalancing pools with multiplier ${action.parameters.multiplier}`);
  }

  private async executeEmergencyStop(action: BalanceAction): Promise<void> {
    console.log(`Emergency stop executed: ${action.reason}`);
  }
}

export default EconomicBalanceSystemV3;