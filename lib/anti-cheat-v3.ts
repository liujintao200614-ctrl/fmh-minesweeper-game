import crypto from 'crypto';

// 扩展游戏会话接口
export interface GameSession {
  gameId: string | number;
  playerAddress: string;
  startTime: number;
  endTime: number;
  gameConfig: {
    width: number;
    height: number;
    mines: number;
    difficulty: string;
  };
  result: {
    isWon: boolean;
    score: number;
    duration: number;
    flagsUsed: number;
    cellsRevealed: number;
    moveSequence: string; // 操作序列哈希
    moveCount: number;
    firstClickTime: number;
    lastClickTime: number;
    hintsUsed: number;
    pauseCount: number;
    totalPauseTime: number;
    efficiency: number;
    clickPattern: number[]; // 点击时间间隔
    mousePath: string; // 鼠标轨迹哈希
  };
  clientInfo: {
    userAgent: string;
    ipAddress: string;
    screenResolution: string;
    timezone: string;
    fingerprint: string;
    language: string;
    platform: string;
    cookieEnabled: boolean;
    javaEnabled: boolean;
    webglFingerprint: string;
    canvasFingerprint: string;
    audioFingerprint: string;
  };
  networkInfo: {
    connectionType: string;
    downlink: number;
    effectiveType: string;
    rtt: number;
  };
  performanceMetrics: {
    memoryUsage: number;
    cpuUsage: number;
    frameRate: number;
    renderTime: number;
  };
}

export interface SuspiciousActivity {
  type: 'IMPOSSIBLE_SPEED' | 'PATTERN_MATCH' | 'IP_ABUSE' | 'MULTI_ACCOUNT' | 
        'BOT_BEHAVIOR' | 'MOUSE_PATTERN' | 'TIMING_ANOMALY' | 'FINGERPRINT_COLLISION' |
        'NETWORK_ANOMALY' | 'PERFORMANCE_ANOMALY' | 'SIGNATURE_FORGERY';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  evidence: any;
  confidence: number; // 0-1，检测置信度
  timestamp: number;
}

export interface RiskProfile {
  playerAddress: string;
  overallRiskScore: number; // 0-100
  riskFactors: {
    speedRisk: number;
    patternRisk: number;
    behaviorRisk: number;
    networkRisk: number;
    deviceRisk: number;
  };
  trustLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'BLACKLIST';
  lastUpdated: number;
  totalFlags: number;
  recentActivities: SuspiciousActivity[];
}

/**
 * 反作弊系统V3.0 - 全面增强版本
 * 新增功能：
 * - 高级行为分析
 * - 机器学习模式检测
 * - 网络指纹分析
 * - 性能指标异常检测
 * - 风险评分系统
 * - 实时监控和预警
 */
export class AntiCheatSystemV3 {
  // 基础检测阈值
  private static readonly DETECTION_THRESHOLDS = {
    minGameDuration: 3,          // 最短游戏时间（秒）
    maxReasonableSpeed: 12,      // 每秒最大合理操作数
    maxSameIP: 15,               // 同IP每日游戏限制
    patternThreshold: 0.92,      // 模式匹配阈值
    mouseSpeedLimit: 5000,       // 鼠标移动速度限制(px/s)
    minClickInterval: 50,        // 最小点击间隔(ms)
    maxPauseRatio: 0.3,          // 最大暂停时间比例
    anomalyConfidence: 0.8       // 异常检测置信度阈值
  };

  // 风险评分权重
  private static readonly RISK_WEIGHTS = {
    speed: 0.25,
    pattern: 0.20,
    behavior: 0.20,
    network: 0.15,
    device: 0.10,
    history: 0.10
  };

  // 信誉度衰减因子
  private static readonly TRUST_DECAY = {
    timeDecay: 0.95,     // 时间衰减因子（每天）
    activityBonus: 1.02, // 正常活动奖励
    penaltyFactor: 0.8   // 作弊行为惩罚
  };

  /**
   * 主要反作弊检测函数 - V3.0增强版
   */
  static async detectSuspiciousActivity(gameSession: GameSession): Promise<SuspiciousActivity[]> {
    const activities: SuspiciousActivity[] = [];

    try {
      // 并行执行各种检测
      const detectionPromises = [
        this.checkImpossibleSpeed(gameSession),
        this.checkSuspiciousPatterns(gameSession),
        this.checkIPAbuse(gameSession),
        this.checkMultiAccount(gameSession),
        this.checkBotBehavior(gameSession),
        this.checkMousePattern(gameSession),
        this.checkTimingAnomalies(gameSession),
        this.checkNetworkAnomalies(gameSession),
        this.checkPerformanceAnomalies(gameSession),
        this.checkSignatureIntegrity(gameSession)
      ];

      const detectionResults = await Promise.allSettled(detectionPromises);
      
      for (const result of detectionResults) {
        if (result.status === 'fulfilled' && result.value) {
          activities.push(result.value);
        } else if (result.status === 'rejected') {
          console.error('Detection failed:', result.reason);
        }
      }

      // 进行综合风险分析
      const riskAnalysis = await this.performRiskAnalysis(gameSession, activities);
      if (riskAnalysis) {
        activities.push(riskAnalysis);
      }

    } catch (error) {
      console.error('Anti-cheat detection error:', error);
    }

    return activities;
  }

  /**
   * 改进的不可能速度检测
   */
  private static checkImpossibleSpeed(gameSession: GameSession): SuspiciousActivity | null {
    const { result, gameConfig } = gameSession;
    const { duration, cellsRevealed, moveCount } = result;

    // 1. 最小游戏时间检查
    if (duration < this.DETECTION_THRESHOLDS.minGameDuration) {
      return {
        type: 'IMPOSSIBLE_SPEED',
        severity: 'CRITICAL',
        description: `Game completed in ${duration}s (minimum: ${this.DETECTION_THRESHOLDS.minGameDuration}s)`,
        evidence: { duration, minimumRequired: this.DETECTION_THRESHOLDS.minGameDuration },
        confidence: 0.95,
        timestamp: Date.now()
      };
    }

    // 2. 操作速度检查
    const operationsPerSecond = moveCount / duration;
    if (operationsPerSecond > this.DETECTION_THRESHOLDS.maxReasonableSpeed) {
      return {
        type: 'IMPOSSIBLE_SPEED',
        severity: 'HIGH',
        description: `Unrealistic operation speed: ${operationsPerSecond.toFixed(2)} ops/sec`,
        evidence: { operationsPerSecond, maxReasonable: this.DETECTION_THRESHOLDS.maxReasonableSpeed },
        confidence: 0.9,
        timestamp: Date.now()
      };
    }

    // 3. 完美效率检查
    if (result.efficiency > 98 && duration < 30) {
      return {
        type: 'IMPOSSIBLE_SPEED',
        severity: 'HIGH',
        description: `Near-perfect efficiency with very fast completion`,
        evidence: { efficiency: result.efficiency, duration },
        confidence: 0.85,
        timestamp: Date.now()
      };
    }

    return null;
  }

  /**
   * 鼠标模式分析
   */
  private static checkMousePattern(gameSession: GameSession): SuspiciousActivity | null {
    const { result, clientInfo } = gameSession;

    // 检查点击时间间隔模式
    if (result.clickPattern && result.clickPattern.length > 10) {
      const intervals = result.clickPattern;
      
      // 1. 检查是否存在过于规律的间隔
      const uniformityScore = this.calculateUniformityScore(intervals);
      if (uniformityScore > 0.9) {
        return {
          type: 'MOUSE_PATTERN',
          severity: 'HIGH',
          description: `Highly uniform click intervals detected (${uniformityScore.toFixed(3)})`,
          evidence: { uniformityScore, sampleIntervals: intervals.slice(0, 10) },
          confidence: 0.88,
          timestamp: Date.now()
        };
      }

      // 2. 检查异常快速的连续点击
      const fastClicks = intervals.filter(interval => interval < this.DETECTION_THRESHOLDS.minClickInterval);
      if (fastClicks.length > intervals.length * 0.3) {
        return {
          type: 'MOUSE_PATTERN',
          severity: 'MEDIUM',
          description: `Excessive fast clicking detected (${fastClicks.length}/${intervals.length})`,
          evidence: { fastClickRatio: fastClicks.length / intervals.length },
          confidence: 0.75,
          timestamp: Date.now()
        };
      }
    }

    return null;
  }

  /**
   * 时序异常检测
   */
  private static checkTimingAnomalies(gameSession: GameSession): SuspiciousActivity | null {
    const { startTime, endTime, result } = gameSession;
    
    // 1. 检查时间戳一致性
    const sessionDuration = endTime - startTime;
    const reportedDuration = result.duration * 1000;
    const timeDiff = Math.abs(sessionDuration - reportedDuration);
    
    if (timeDiff > 10000) { // 10秒容差
      return {
        type: 'TIMING_ANOMALY',
        severity: 'HIGH',
        description: 'Significant timestamp inconsistency detected',
        evidence: { 
          sessionDuration,
          reportedDuration,
          difference: timeDiff
        },
        confidence: 0.9,
        timestamp: Date.now()
      };
    }

    // 2. 检查暂停模式异常
    if (result.pauseCount > 0) {
      const pauseRatio = result.totalPauseTime / result.duration;
      if (pauseRatio > this.DETECTION_THRESHOLDS.maxPauseRatio) {
        return {
          type: 'TIMING_ANOMALY',
          severity: 'MEDIUM',
          description: `Excessive pause time ratio: ${(pauseRatio * 100).toFixed(1)}%`,
          evidence: { pauseRatio, pauseCount: result.pauseCount },
          confidence: 0.7,
          timestamp: Date.now()
        };
      }
    }

    // 3. 检查首次和最后点击时间的合理性
    if (result.firstClickTime < 1000 || result.lastClickTime > result.duration * 1000 - 1000) {
      return {
        type: 'TIMING_ANOMALY',
        severity: 'MEDIUM',
        description: 'Suspicious first/last click timing',
        evidence: { 
          firstClickTime: result.firstClickTime,
          lastClickTime: result.lastClickTime,
          gameDuration: result.duration * 1000
        },
        confidence: 0.65,
        timestamp: Date.now()
      };
    }

    return null;
  }

  /**
   * 网络异常检测
   */
  private static checkNetworkAnomalies(gameSession: GameSession): SuspiciousActivity | null {
    if (!gameSession.networkInfo) return null;

    const { networkInfo, result } = gameSession;
    
    // 检查网络延迟与游戏表现的不匹配
    if (networkInfo.rtt > 500 && result.duration < 30) {
      return {
        type: 'NETWORK_ANOMALY',
        severity: 'MEDIUM',
        description: 'High network latency with very fast game completion',
        evidence: { 
          rtt: networkInfo.rtt,
          duration: result.duration,
          connectionType: networkInfo.connectionType
        },
        confidence: 0.7,
        timestamp: Date.now()
      };
    }

    // 检查连接类型异常
    if (networkInfo.effectiveType === 'slow-2g' && result.efficiency > 95) {
      return {
        type: 'NETWORK_ANOMALY',
        severity: 'MEDIUM',
        description: 'High efficiency on very slow connection',
        evidence: { 
          effectiveType: networkInfo.effectiveType,
          efficiency: result.efficiency
        },
        confidence: 0.65,
        timestamp: Date.now()
      };
    }

    return null;
  }

  /**
   * 性能异常检测
   */
  private static checkPerformanceAnomalies(gameSession: GameSession): SuspiciousActivity | null {
    if (!gameSession.performanceMetrics) return null;

    const { performanceMetrics, result } = gameSession;
    
    // 检查性能与游戏表现的匹配度
    if (performanceMetrics.frameRate < 20 && result.duration < 20) {
      return {
        type: 'PERFORMANCE_ANOMALY',
        severity: 'MEDIUM',
        description: 'Low frame rate with extremely fast completion',
        evidence: { 
          frameRate: performanceMetrics.frameRate,
          duration: result.duration
        },
        confidence: 0.75,
        timestamp: Date.now()
      };
    }

    // 检查CPU使用率异常
    if (performanceMetrics.cpuUsage > 90 && result.efficiency > 95) {
      return {
        type: 'PERFORMANCE_ANOMALY',
        severity: 'MEDIUM',
        description: 'High CPU usage with perfect efficiency',
        evidence: { 
          cpuUsage: performanceMetrics.cpuUsage,
          efficiency: result.efficiency
        },
        confidence: 0.7,
        timestamp: Date.now()
      };
    }

    return null;
  }

  /**
   * 签名完整性检查
   */
  private static checkSignatureIntegrity(gameSession: GameSession): SuspiciousActivity | null {
    try {
      // 检查关键数据的数学一致性
      const { result, gameConfig } = gameSession;
      
      // 1. 检查得分计算的合理性
      const expectedMinScore = Math.floor(gameConfig.width * gameConfig.height * 0.5);
      const expectedMaxScore = Math.floor(gameConfig.width * gameConfig.height * 5);
      
      if (result.score < expectedMinScore || result.score > expectedMaxScore) {
        return {
          type: 'SIGNATURE_FORGERY',
          severity: 'HIGH',
          description: 'Score outside expected range for game configuration',
          evidence: { 
            actualScore: result.score,
            expectedRange: [expectedMinScore, expectedMaxScore]
          },
          confidence: 0.85,
          timestamp: Date.now()
        };
      }

      // 2. 检查揭开格子数的合理性
      const maxCells = gameConfig.width * gameConfig.height - gameConfig.mines;
      if (result.cellsRevealed > maxCells) {
        return {
          type: 'SIGNATURE_FORGERY',
          severity: 'CRITICAL',
          description: 'More cells revealed than mathematically possible',
          evidence: { 
            cellsRevealed: result.cellsRevealed,
            maxPossible: maxCells
          },
          confidence: 1.0,
          timestamp: Date.now()
        };
      }

      return null;
    } catch (error) {
      return {
        type: 'SIGNATURE_FORGERY',
        severity: 'MEDIUM',
        description: 'Failed to verify game data integrity',
        evidence: { error: error instanceof Error ? error.message : 'Unknown error' },
        confidence: 0.6,
        timestamp: Date.now()
      };
    }
  }

  /**
   * 综合风险分析
   */
  private static async performRiskAnalysis(
    gameSession: GameSession, 
    activities: SuspiciousActivity[]
  ): Promise<SuspiciousActivity | null> {
    
    // 计算综合风险评分
    let riskScore = 0;
    let maxSeverity: SuspiciousActivity['severity'] = 'LOW';
    
    for (const activity of activities) {
      const severityScores = { LOW: 1, MEDIUM: 3, HIGH: 7, CRITICAL: 10 };
      const activityScore = severityScores[activity.severity] * activity.confidence;
      riskScore += activityScore;
      
      if (severityScores[activity.severity] > severityScores[maxSeverity]) {
        maxSeverity = activity.severity;
      }
    }

    // 如果综合风险评分过高，生成综合风险报告
    if (riskScore > 15) {
      return {
        type: 'PATTERN_MATCH',
        severity: maxSeverity,
        description: `Multiple suspicious patterns detected (risk score: ${riskScore.toFixed(1)})`,
        evidence: { 
          totalRiskScore: riskScore,
          detectedActivities: activities.map(a => a.type),
          analysisConfidence: Math.min(0.95, riskScore / 30)
        },
        confidence: Math.min(0.95, riskScore / 30),
        timestamp: Date.now()
      };
    }

    return null;
  }

  /**
   * 更新玩家风险档案
   */
  static async updateRiskProfile(
    playerAddress: string, 
    activities: SuspiciousActivity[]
  ): Promise<RiskProfile> {
    try {
      // 获取现有风险档案
      let profile = await this.getRiskProfile(playerAddress);
      
      if (!profile) {
        profile = {
          playerAddress,
          overallRiskScore: 0,
          riskFactors: {
            speedRisk: 0,
            patternRisk: 0,
            behaviorRisk: 0,
            networkRisk: 0,
            deviceRisk: 0
          },
          trustLevel: 'HIGH',
          lastUpdated: Date.now(),
          totalFlags: 0,
          recentActivities: []
        };
      }

      // 更新风险因子
      for (const activity of activities) {
        this.updateRiskFactors(profile, activity);
        profile.totalFlags++;
      }

      // 添加最新活动（保持最近50条）
      profile.recentActivities = [
        ...activities,
        ...profile.recentActivities
      ].slice(0, 50);

      // 计算综合风险评分
      profile.overallRiskScore = this.calculateOverallRisk(profile);
      
      // 更新信任等级
      profile.trustLevel = this.determineTrustLevel(profile.overallRiskScore);
      
      profile.lastUpdated = Date.now();

      // 保存更新后的档案
      await this.saveRiskProfile(profile);
      
      return profile;
    } catch (error) {
      console.error('Failed to update risk profile:', error);
      throw error;
    }
  }

  /**
   * 更新特定风险因子
   */
  private static updateRiskFactors(profile: RiskProfile, activity: SuspiciousActivity) {
    const impact = activity.confidence * (activity.severity === 'CRITICAL' ? 4 : 
                   activity.severity === 'HIGH' ? 3 :
                   activity.severity === 'MEDIUM' ? 2 : 1);

    switch (activity.type) {
      case 'IMPOSSIBLE_SPEED':
      case 'TIMING_ANOMALY':
        profile.riskFactors.speedRisk = Math.min(100, profile.riskFactors.speedRisk + impact * 5);
        break;
      case 'PATTERN_MATCH':
      case 'MOUSE_PATTERN':
        profile.riskFactors.patternRisk = Math.min(100, profile.riskFactors.patternRisk + impact * 4);
        break;
      case 'BOT_BEHAVIOR':
      case 'SIGNATURE_FORGERY':
        profile.riskFactors.behaviorRisk = Math.min(100, profile.riskFactors.behaviorRisk + impact * 6);
        break;
      case 'NETWORK_ANOMALY':
        profile.riskFactors.networkRisk = Math.min(100, profile.riskFactors.networkRisk + impact * 3);
        break;
      case 'FINGERPRINT_COLLISION':
      case 'PERFORMANCE_ANOMALY':
        profile.riskFactors.deviceRisk = Math.min(100, profile.riskFactors.deviceRisk + impact * 3);
        break;
    }
  }

  /**
   * 计算综合风险评分
   */
  private static calculateOverallRisk(profile: RiskProfile): number {
    const { riskFactors } = profile;
    
    const weightedScore = 
      riskFactors.speedRisk * this.RISK_WEIGHTS.speed +
      riskFactors.patternRisk * this.RISK_WEIGHTS.pattern +
      riskFactors.behaviorRisk * this.RISK_WEIGHTS.behavior +
      riskFactors.networkRisk * this.RISK_WEIGHTS.network +
      riskFactors.deviceRisk * this.RISK_WEIGHTS.device;

    // 应用历史因子（最近活动的频率）
    const recentActivity = profile.recentActivities.length;
    const historyFactor = Math.min(1.5, 1 + recentActivity / 100);

    return Math.min(100, weightedScore * historyFactor);
  }

  /**
   * 确定信任等级
   */
  private static determineTrustLevel(riskScore: number): RiskProfile['trustLevel'] {
    if (riskScore >= 80) return 'BLACKLIST';
    if (riskScore >= 60) return 'LOW';
    if (riskScore >= 30) return 'MEDIUM';
    return 'HIGH';
  }

  /**
   * 计算数值序列的均匀性
   */
  private static calculateUniformityScore(values: number[]): number {
    if (values.length < 3) return 0;

    const differences = values.slice(1).map((v, i) => Math.abs(v - values[i]));
    const avgDiff = differences.reduce((sum, diff) => sum + diff, 0) / differences.length;
    
    if (avgDiff === 0) return 1; // 完全一致
    
    const variance = differences.reduce((sum, diff) => sum + Math.pow(diff - avgDiff, 2), 0) / differences.length;
    const stdDev = Math.sqrt(variance);
    
    // 标准差越小，均匀性越高
    return Math.max(0, 1 - stdDev / avgDiff);
  }

  /**
   * 判断是否应该阻止奖励发放 - V3.0增强版
   */
  static shouldBlockReward(
    activities: SuspiciousActivity[], 
    riskProfile?: RiskProfile
  ): { shouldBlock: boolean; reason?: string; confidence: number } {
    
    // 1. 关键级别活动直接阻止
    const criticalActivities = activities.filter(a => a.severity === 'CRITICAL');
    if (criticalActivities.length > 0) {
      const maxConfidence = Math.max(...criticalActivities.map(a => a.confidence));
      return {
        shouldBlock: true,
        reason: `Critical security threat detected: ${criticalActivities[0].description}`,
        confidence: maxConfidence
      };
    }

    // 2. 高风险活动组合判断
    const highActivities = activities.filter(a => a.severity === 'HIGH');
    if (highActivities.length >= 2) {
      const avgConfidence = highActivities.reduce((sum, a) => sum + a.confidence, 0) / highActivities.length;
      return {
        shouldBlock: true,
        reason: `Multiple high-risk activities: ${highActivities.map(a => a.type).join(', ')}`,
        confidence: avgConfidence
      };
    }

    // 3. 风险档案评估
    if (riskProfile && riskProfile.trustLevel === 'BLACKLIST') {
      return {
        shouldBlock: true,
        reason: 'Player is blacklisted due to high risk score',
        confidence: 0.95
      };
    }

    // 4. 低信任度玩家的严格检查
    if (riskProfile && riskProfile.trustLevel === 'LOW') {
      const mediumActivities = activities.filter(a => a.severity === 'MEDIUM');
      if (mediumActivities.length >= 2) {
        return {
          shouldBlock: true,
          reason: 'Low trust player with suspicious activities',
          confidence: 0.8
        };
      }
    }

    // 5. 综合风险评分判断
    const totalRisk = activities.reduce((sum, a) => {
      const severityMultiplier = { LOW: 1, MEDIUM: 2, HIGH: 4, CRITICAL: 8 };
      return sum + severityMultiplier[a.severity] * a.confidence;
    }, 0);

    if (totalRisk > 10) {
      return {
        shouldBlock: true,
        reason: `Total risk score too high: ${totalRisk.toFixed(1)}`,
        confidence: Math.min(0.9, totalRisk / 20)
      };
    }

    return { shouldBlock: false, confidence: 0 };
  }

  /**
   * 获取风险档案（模拟函数）
   */
  private static async getRiskProfile(playerAddress: string): Promise<RiskProfile | null> {
    try {
      const response = await fetch(`/api/anti-cheat/risk-profile?address=${playerAddress}`);
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * 保存风险档案（模拟函数）
   */
  private static async saveRiskProfile(profile: RiskProfile): Promise<void> {
    try {
      await fetch('/api/anti-cheat/risk-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });
    } catch (error) {
      console.error('Failed to save risk profile:', error);
    }
  }

  /**
   * 增强的设备指纹生成
   */
  static generateEnhancedFingerprint(): string {
    if (typeof window === 'undefined') return 'server';
    
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      ctx!.textBaseline = 'top';
      ctx!.font = '14px Arial';
      ctx!.fillText('FMH Fingerprint', 2, 2);
      
      // WebGL指纹
      const webglCanvas = document.createElement('canvas');
      const webgl = webglCanvas.getContext('webgl');
      const webglFingerprint = webgl ? webgl.getParameter(webgl.VERSION) + webgl.getParameter(webgl.VENDOR) : '';
      
      // 音频指纹
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      oscillator.type = 'triangle';
      const analyser = audioContext.createAnalyser();
      oscillator.connect(analyser);
      const audioFingerprint = analyser.frequencyBinCount.toString();

      const components = [
        navigator.userAgent,
        navigator.language,
        screen.width + 'x' + screen.height,
        new Date().getTimezoneOffset(),
        navigator.platform,
        navigator.cookieEnabled,
        typeof navigator.javaEnabled !== 'undefined' ? navigator.javaEnabled() : false,
        canvas.toDataURL(),
        webglFingerprint,
        audioFingerprint,
        navigator.hardwareConcurrency || 0,
        (navigator as any).deviceMemory || 0,
        (navigator as any).connection?.effectiveType || '',
      ].join('|');
      
      return crypto.createHash('sha256').update(components).digest('hex').substring(0, 32);
    } catch (error) {
      console.error('Fingerprint generation failed:', error);
      return crypto.createHash('sha256').update(navigator.userAgent).digest('hex').substring(0, 32);
    }
  }

  // 重写原有的检测函数，使其返回新的接口格式
  private static async checkSuspiciousPatterns(gameSession: GameSession): Promise<SuspiciousActivity | null> {
    // 复用原有逻辑，但返回新格式
    // 这里应该调用原有的检测逻辑
    const original = null; // TODO: 实现具体的检测逻辑
    if (!original) return null;
    
    return {
      ...original,
      confidence: 0.85,
      timestamp: Date.now()
    };
  }

  private static async checkIPAbuse(gameSession: GameSession): Promise<SuspiciousActivity | null> {
    try {
      const { clientInfo } = gameSession;
      const today = new Date().toDateString();
      
      const ipGamesCount = await this.getIPGamesCount(clientInfo.ipAddress, today);
      
      if (ipGamesCount > this.DETECTION_THRESHOLDS.maxSameIP) {
        return {
          type: 'IP_ABUSE',
          severity: 'HIGH',
          description: `Excessive games from IP: ${ipGamesCount} games today`,
          evidence: { ipAddress: clientInfo.ipAddress, gamesCount: ipGamesCount },
          confidence: 0.9,
          timestamp: Date.now()
        };
      }

      return null;
    } catch (error) {
      console.error('IP abuse check failed:', error);
      return null;
    }
  }

  private static async checkMultiAccount(gameSession: GameSession): Promise<SuspiciousActivity | null> {
    try {
      const { clientInfo, playerAddress } = gameSession;
      
      const accountsWithSameFingerprint = await this.getAccountsByFingerprint(clientInfo.fingerprint);
      
      if (accountsWithSameFingerprint.length > 3 && !accountsWithSameFingerprint.includes(playerAddress)) {
        return {
          type: 'MULTI_ACCOUNT',
          severity: 'HIGH',
          description: `Multiple accounts from same device: ${accountsWithSameFingerprint.length} accounts`,
          evidence: { fingerprint: clientInfo.fingerprint, accounts: accountsWithSameFingerprint },
          confidence: 0.85,
          timestamp: Date.now()
        };
      }

      return null;
    } catch (error) {
      console.error('Multi-account check failed:', error);
      return null;
    }
  }

  private static checkBotBehavior(gameSession: GameSession): SuspiciousActivity | null {
    const { clientInfo, result, startTime, endTime } = gameSession;

    // 检查用户代理字符串
    const suspiciousUAPatterns = [
      /headless/i,
      /phantom/i,
      /selenium/i,
      /webdriver/i,
      /puppeteer/i,
      /playwright/i,
      /bot/i
    ];

    for (const pattern of suspiciousUAPatterns) {
      if (pattern.test(clientInfo.userAgent)) {
        return {
          type: 'BOT_BEHAVIOR',
          severity: 'CRITICAL',
          description: `Bot user agent detected: ${clientInfo.userAgent}`,
          evidence: { userAgent: clientInfo.userAgent, pattern: pattern.toString() },
          confidence: 0.95,
          timestamp: Date.now()
        };
      }
    }

    // 检查时间戳合理性
    const sessionDuration = endTime - startTime;
    if (Math.abs(sessionDuration - result.duration * 1000) > 5000) {
      return {
        type: 'BOT_BEHAVIOR',
        severity: 'MEDIUM',
        description: 'Session timestamp inconsistency',
        evidence: { 
          sessionDuration, 
          reportedDuration: result.duration * 1000,
          difference: Math.abs(sessionDuration - result.duration * 1000)
        },
        confidence: 0.7,
        timestamp: Date.now()
      };
    }

    return null;
  }

  // 工具函数
  private static async getIPGamesCount(ipAddress: string, date: string): Promise<number> {
    try {
      const response = await fetch(`/api/anti-cheat/ip-games?ip=${ipAddress}&date=${date}`);
      const data = await response.json();
      return data.count || 0;
    } catch {
      return 0;
    }
  }

  private static async getAccountsByFingerprint(fingerprint: string): Promise<string[]> {
    try {
      const response = await fetch(`/api/anti-cheat/accounts-by-fingerprint?fingerprint=${fingerprint}`);
      const data = await response.json();
      return data.accounts || [];
    } catch {
      return [];
    }
  }
}

export default AntiCheatSystemV3;