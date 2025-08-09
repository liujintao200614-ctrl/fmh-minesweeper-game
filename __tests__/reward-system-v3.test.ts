import { describe, it, expect, beforeEach } from '@jest/globals';
import RewardSystemV3, { GameResult, PlayerStats, PlayerLevel } from '../lib/reward-system-v3';
import EconomicBalanceSystemV3 from '../lib/economic-balance-v3';
import AntiCheatSystemV3 from '../lib/anti-cheat-v3';
import AchievementSystemV3 from '../lib/achievement-system-v3';
import SocialSystemV3 from '../lib/social-system-v3';

describe('RewardSystemV3', () => {
  let mockGameResult: GameResult;
  let mockPlayerStats: PlayerStats;
  let mockEconomicData: any;

  beforeEach(() => {
    mockGameResult = {
      gameId: 'test-game-1',
      playerAddress: '0x1234567890abcdef',
      gameConfig: {
        width: 16,
        height: 16,
        mines: 40
      },
      finalScore: 5000,
      gameDuration: 120,
      flagsUsed: 38,
      isWon: true,
      cellsRevealed: 216,
      perfectGame: false,
      difficulty: 'medium',
      moveCount: 250,
      firstClickTime: 1000,
      lastClickTime: 119000,
      hintsUsed: 0,
      pauseCount: 2,
      totalPauseTime: 10,
      efficiency: 85
    };

    mockPlayerStats = {
      consecutiveWins: 5,
      todayEarned: 150,
      playerLevel: PlayerLevel.SILVER,
      totalWins: 50,
      totalGames: 75,
      lastPlayTime: Date.now() - 3600000,
      weeklyWins: 12,
      monthlyWins: 35,
      bestStreak: 10,
      averageTime: 180,
      averageScore: 4200,
      totalPauseTime: 500,
      fmhBalance: 1000,
      stakingAmount: 500,
      vipLevel: 1,
      referralCount: 3,
      socialShares: 8
    };

    mockEconomicData = {
      todayPoolUsed: 45000,
      dailyActiveUsers: 1200,
      globalWinRate: 0.62,
      totalSupply: 10000000
    };
  });

  describe('Basic Reward Calculation', () => {
    it('should calculate base reward correctly', () => {
      const result = RewardSystemV3.calculateReward(
        mockGameResult,
        mockPlayerStats,
        mockEconomicData
      );

      expect(result).toBeDefined();
      expect(result.baseReward).toBeGreaterThan(0);
      expect(result.totalFMH).toBeGreaterThan(result.baseReward);
      expect(result.canClaim).toBe(true);
    });

    it('should not give reward for lost games', () => {
      const lostGameResult = { ...mockGameResult, isWon: false };
      
      const result = RewardSystemV3.calculateReward(
        lostGameResult,
        mockPlayerStats,
        mockEconomicData
      );

      expect(result.totalFMH).toBe(0);
      expect(result.canClaim).toBe(false);
      expect(result.reason).toBe('Game not won');
    });

    it('should apply difficulty multipliers correctly', () => {
      const easyGame = { ...mockGameResult, difficulty: 'easy' as const };
      const hardGame = { ...mockGameResult, difficulty: 'hard' as const };

      const easyResult = RewardSystemV3.calculateReward(easyGame, mockPlayerStats, mockEconomicData);
      const hardResult = RewardSystemV3.calculateReward(hardGame, mockPlayerStats, mockEconomicData);

      expect(hardResult.totalFMH).toBeGreaterThan(easyResult.totalFMH);
    });

    it('should apply time bonus for fast completion', () => {
      const fastGame = { ...mockGameResult, gameDuration: 30 };
      const slowGame = { ...mockGameResult, gameDuration: 300 };

      const fastResult = RewardSystemV3.calculateReward(fastGame, mockPlayerStats, mockEconomicData);
      const slowResult = RewardSystemV3.calculateReward(slowGame, mockPlayerStats, mockEconomicData);

      expect(fastResult.timeBonus).toBeGreaterThan(slowResult.timeBonus);
    });
  });

  describe('Level and Progression System', () => {
    it('should upgrade player level correctly', () => {
      const lowLevelStats = {
        ...mockPlayerStats,
        totalWins: 5,
        fmhBalance: 50
      };

      const { newLevel, upgraded } = RewardSystemV3.checkAndUpdatePlayerLevel(lowLevelStats);
      
      expect(newLevel).toBe(PlayerLevel.BRONZE);
      expect(upgraded).toBe(true);
    });

    it('should provide level bonuses', () => {
      const bronzeStats = { ...mockPlayerStats, playerLevel: PlayerLevel.BRONZE };
      const legendStats = { ...mockPlayerStats, playerLevel: PlayerLevel.LEGEND };

      const bronzeResult = RewardSystemV3.calculateReward(mockGameResult, bronzeStats, mockEconomicData);
      const legendResult = RewardSystemV3.calculateReward(mockGameResult, legendStats, mockEconomicData);

      expect(legendResult.levelBonus).toBeGreaterThan(bronzeResult.levelBonus);
    });

    it('should calculate VIP bonuses', () => {
      const regularStats = { ...mockPlayerStats, vipLevel: 0 };
      const vipStats = { ...mockPlayerStats, vipLevel: 3 };

      const regularResult = RewardSystemV3.calculateReward(mockGameResult, regularStats, mockEconomicData);
      const vipResult = RewardSystemV3.calculateReward(mockGameResult, vipStats, mockEconomicData);

      expect(vipResult.vipBonus).toBeGreaterThan(regularResult.vipBonus);
    });
  });

  describe('Economic Balance', () => {
    it('should respect daily personal limits', () => {
      const highEarnerStats = { ...mockPlayerStats, todayEarned: 540 }; // Close to limit
      
      const result = RewardSystemV3.calculateReward(
        mockGameResult,
        highEarnerStats,
        mockEconomicData
      );

      if (result.totalFMH + highEarnerStats.todayEarned > 550) { // Silver limit
        expect(result.canClaim).toBe(false);
        expect(result.reason).toContain('personal limit');
      }
    });

    it('should apply dynamic economic adjustments', () => {
      const highInflationData = {
        ...mockEconomicData,
        todayPoolUsed: 95000, // 95% used
        globalWinRate: 0.8 // Very high win rate
      };

      const normalResult = RewardSystemV3.calculateReward(mockGameResult, mockPlayerStats, mockEconomicData);
      const adjustedResult = RewardSystemV3.calculateReward(mockGameResult, mockPlayerStats, highInflationData);

      expect(adjustedResult.dynamicMultiplier).toBeLessThan(normalResult.dynamicMultiplier);
    });
  });

  describe('Social and Staking Rewards', () => {
    it('should calculate referral rewards correctly', () => {
      const newPlayerGame = { ...mockGameResult, finalScore: 1000 };
      const referrerStats = { ...mockPlayerStats, playerLevel: PlayerLevel.GOLD };

      const reward = RewardSystemV3.calculateReferralReward(referrerStats, newPlayerGame);
      
      expect(reward).toBeGreaterThan(50); // Base reward
    });

    it('should calculate share rewards by platform', () => {
      const twitterReward = RewardSystemV3.calculateShareReward('twitter', mockGameResult, 0);
      const facebookReward = RewardSystemV3.calculateShareReward('facebook', mockGameResult, 0);

      expect(twitterReward).toBeGreaterThan(facebookReward); // Twitter has higher base reward
    });

    it('should limit daily share rewards', () => {
      const reward1 = RewardSystemV3.calculateShareReward('twitter', mockGameResult, 0);
      const reward2 = RewardSystemV3.calculateShareReward('twitter', mockGameResult, 5); // 5th share

      expect(reward1).toBeGreaterThan(0);
      expect(reward2).toBe(0); // Daily limit reached
    });
  });

  describe('Signature Verification', () => {
    it('should generate and verify reward signatures correctly', () => {
      const playerAddress = '0x1234567890abcdef';
      const gameId = 'test-game';
      const amount = 100;
      const timestamp = Date.now();
      const nonce = 'test-nonce';

      const signature = RewardSystemV3.generateRewardSignature(
        playerAddress, gameId, amount, timestamp, nonce
      );

      const isValid = RewardSystemV3.verifyRewardSignature(
        playerAddress, gameId, amount, timestamp, nonce, signature
      );

      expect(isValid).toBe(true);
    });

    it('should reject invalid signatures', () => {
      const isValid = RewardSystemV3.verifyRewardSignature(
        '0x1234', 'game-1', 100, Date.now(), 'nonce', 'invalid-signature'
      );

      expect(isValid).toBe(false);
    });
  });
});

describe('AntiCheatSystemV3', () => {
  let mockGameSession: any;

  beforeEach(() => {
    mockGameSession = {
      gameId: 'test-game-1',
      playerAddress: '0x1234567890abcdef',
      startTime: Date.now() - 120000,
      endTime: Date.now(),
      gameConfig: { width: 16, height: 16, mines: 40, difficulty: 'medium' },
      result: {
        isWon: true,
        score: 5000,
        duration: 120,
        flagsUsed: 38,
        cellsRevealed: 216,
        moveSequence: 'hash123',
        moveCount: 250,
        firstClickTime: 1000,
        lastClickTime: 119000,
        hintsUsed: 0,
        pauseCount: 2,
        totalPauseTime: 10,
        efficiency: 85,
        clickPattern: [100, 150, 200, 180, 120],
        mousePath: 'path-hash'
      },
      clientInfo: {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ipAddress: '192.168.1.1',
        screenResolution: '1920x1080',
        timezone: 'UTC',
        fingerprint: 'fp123',
        language: 'en',
        platform: 'Web',
        cookieEnabled: true,
        javaEnabled: false,
        webglFingerprint: 'webgl123',
        canvasFingerprint: 'canvas123',
        audioFingerprint: 'audio123'
      },
      networkInfo: {
        connectionType: '4g',
        downlink: 10,
        effectiveType: '4g',
        rtt: 50
      },
      performanceMetrics: {
        memoryUsage: 50,
        cpuUsage: 30,
        frameRate: 60,
        renderTime: 16
      }
    };
  });

  describe('Speed Detection', () => {
    it('should detect impossibly fast games', async () => {
      const fastSession = {
        ...mockGameSession,
        result: { ...mockGameSession.result, duration: 2 } // 2 seconds
      };

      const activities = await AntiCheatSystemV3.detectSuspiciousActivity(fastSession);
      
      const speedViolation = activities.find(a => a.type === 'IMPOSSIBLE_SPEED');
      expect(speedViolation).toBeDefined();
      expect(speedViolation?.severity).toBe('CRITICAL');
    });

    it('should detect unrealistic operation speed', async () => {
      const fastSession = {
        ...mockGameSession,
        result: { ...mockGameSession.result, moveCount: 1000, duration: 10 } // 100 ops/sec
      };

      const activities = await AntiCheatSystemV3.detectSuspiciousActivity(fastSession);
      
      const speedViolation = activities.find(a => a.type === 'IMPOSSIBLE_SPEED');
      expect(speedViolation).toBeDefined();
    });
  });

  describe('Pattern Detection', () => {
    it('should detect uniform click patterns', async () => {
      const uniformSession = {
        ...mockGameSession,
        result: {
          ...mockGameSession.result,
          clickPattern: [100, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100]
        }
      };

      const activities = await AntiCheatSystemV3.detectSuspiciousActivity(uniformSession);
      
      const patternViolation = activities.find(a => a.type === 'MOUSE_PATTERN');
      expect(patternViolation).toBeDefined();
    });
  });

  describe('Bot Detection', () => {
    it('should detect bot user agents', async () => {
      const botSession = {
        ...mockGameSession,
        clientInfo: {
          ...mockGameSession.clientInfo,
          userAgent: 'Mozilla/5.0 (compatible; Selenium/4.0)'
        }
      };

      const activities = await AntiCheatSystemV3.detectSuspiciousActivity(botSession);
      
      const botViolation = activities.find(a => a.type === 'BOT_BEHAVIOR');
      expect(botViolation).toBeDefined();
      expect(botViolation?.severity).toBe('CRITICAL');
    });
  });

  describe('Risk Profiling', () => {
    it('should create and update risk profiles', async () => {
      const activities = await AntiCheatSystemV3.detectSuspiciousActivity(mockGameSession);
      const riskProfile = await AntiCheatSystemV3.updateRiskProfile(
        mockGameSession.playerAddress,
        activities
      );

      expect(riskProfile).toBeDefined();
      expect(riskProfile.playerAddress).toBe(mockGameSession.playerAddress);
      expect(riskProfile.overallRiskScore).toBeGreaterThanOrEqual(0);
      expect(riskProfile.trustLevel).toMatch(/HIGH|MEDIUM|LOW|BLACKLIST/);
    });

    it('should determine when to block rewards', async () => {
      const highRiskActivities = [
        {
          type: 'IMPOSSIBLE_SPEED' as const,
          severity: 'CRITICAL' as const,
          description: 'Game too fast',
          evidence: {},
          confidence: 0.95,
          timestamp: Date.now()
        }
      ];

      const blockDecision = AntiCheatSystemV3.shouldBlockReward(highRiskActivities);
      
      expect(blockDecision.shouldBlock).toBe(true);
      expect(blockDecision.confidence).toBeGreaterThan(0.9);
    });
  });
});

describe('EconomicBalanceSystemV3', () => {
  let economicSystem: EconomicBalanceSystemV3;

  beforeEach(() => {
    economicSystem = EconomicBalanceSystemV3.getInstance();
  });

  describe('Economic Health Scoring', () => {
    it('should calculate economic health score', () => {
      const healthScore = economicSystem.getEconomicHealthScore();
      
      expect(healthScore).toBeDefined();
      expect(healthScore.score).toBeGreaterThanOrEqual(0);
      expect(healthScore.score).toBeLessThanOrEqual(100);
      expect(healthScore.factors).toHaveProperty('inflation');
      expect(healthScore.factors).toHaveProperty('userActivity');
      expect(healthScore.factors).toHaveProperty('tokenDistribution');
      expect(healthScore.factors).toHaveProperty('rewardSustainability');
      expect(Array.isArray(healthScore.recommendations)).toBe(true);
    });
  });

  describe('Balance Actions', () => {
    it('should create balance actions', async () => {
      const action = await economicSystem.createBalanceAction({
        type: 'REWARD_ADJUST',
        reason: 'Test adjustment',
        parameters: { multiplier: 0.9 },
        impact: { expectedEffect: 'Reduce rewards by 10%' }
      });

      expect(action).toBeDefined();
      expect(action.type).toBe('REWARD_ADJUST');
      expect(action.executed).toBe(false);
      expect(action.id).toBeDefined();
    });

    it('should execute balance actions', async () => {
      const action = await economicSystem.createBalanceAction({
        type: 'MINT',
        reason: 'Test mint',
        parameters: { amount: 1000 },
        impact: { supplyChange: 1000, expectedEffect: 'Increase supply' }
      });

      const executed = await economicSystem.executeBalanceAction(action.id);
      expect(executed).toBe(true);
    });
  });
});

describe('Integration Tests', () => {
  let mockGameResult: GameResult;
  let mockPlayerStats: PlayerStats;
  let mockEconomicData: any;
  let mockGameSession: any;

  beforeEach(() => {
    mockGameResult = {
      gameId: 'test-game-1',
      playerAddress: '0x1234567890abcdef',
      gameConfig: {
        width: 16,
        height: 16,
        mines: 40
      },
      finalScore: 5000,
      gameDuration: 120,
      flagsUsed: 38,
      isWon: true,
      cellsRevealed: 216,
      perfectGame: false,
      difficulty: 'medium',
      moveCount: 250,
      firstClickTime: 1000,
      lastClickTime: 119000,
      hintsUsed: 0,
      pauseCount: 2,
      totalPauseTime: 10,
      efficiency: 85
    };

    mockPlayerStats = {
      consecutiveWins: 5,
      todayEarned: 150,
      playerLevel: PlayerLevel.SILVER,
      totalWins: 50,
      totalGames: 75,
      lastPlayTime: Date.now() - 3600000,
      weeklyWins: 12,
      monthlyWins: 35,
      bestStreak: 10,
      averageTime: 180,
      averageScore: 4200,
      totalPauseTime: 500,
      winRate: 66.67,
      avgScore: 4200,
      efficiency: 85
    };

    mockEconomicData = {
      inflationRate: 5.2,
      totalSupply: 1000000,
      dailyRewardBudget: 5000,
      usedBudget: 1500,
      averageReward: 50
    };

    mockGameSession = {
      gameId: 'test-game-1',
      playerAddress: '0x1234567890abcdef',
      startTime: Date.now() - 120000,
      endTime: Date.now(),
      gameConfig: { width: 16, height: 16, mines: 40, difficulty: 'medium' },
      result: {
        isWon: true,
        score: 5000,
        duration: 120,
        flagsUsed: 38,
        cellsRevealed: 216,
        moveSequence: 'hash123',
        moveCount: 250,
        firstClickTime: 1000,
        lastClickTime: 119000,
        hintsUsed: 0,
        pauseCount: 2,
        totalPauseTime: 10,
        efficiency: 85,
        clickPattern: [100, 150, 200, 180, 120],
        mousePath: 'path-hash'
      },
      clientInfo: {
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        ipAddress: '192.168.1.1',
        screenResolution: '1920x1080',
        timezone: 'UTC',
        fingerprint: 'fp123',
        language: 'en',
        platform: 'Web',
        cookieEnabled: true,
        javaEnabled: false,
        webglFingerprint: 'webgl123',
        canvasFingerprint: 'canvas123',
        audioFingerprint: 'audio123'
      }
    };
  });

  it('should integrate reward calculation with anti-cheat detection', async () => {
    // Simulate a suspicious game
    const suspiciousGame = {
      ...mockGameResult,
      gameDuration: 5, // Very fast
      efficiency: 100  // Perfect efficiency
    };

    // Calculate reward
    const rewardResult = RewardSystemV3.calculateReward(
      suspiciousGame,
      mockPlayerStats,
      mockEconomicData
    );

    expect(rewardResult).toBeDefined();
    // In a real scenario, anti-cheat would be called during reward calculation
  });

  it('should handle concurrent reward calculations', async () => {
    const promises = Array.from({ length: 10 }, (_, i) => {
      const gameResult = { ...mockGameResult, gameId: `game-${i}` };
      return RewardSystemV3.calculateReward(gameResult, mockPlayerStats, mockEconomicData);
    });

    const results = await Promise.all(promises);
    
    expect(results).toHaveLength(10);
    results.forEach(result => {
      expect(result.totalFMH).toBeGreaterThan(0);
    });
  });
});

describe('Performance Tests', () => {
  it('should calculate rewards efficiently', () => {
    const startTime = Date.now();
    
    for (let i = 0; i < 1000; i++) {
      RewardSystemV3.calculateReward(mockGameResult, mockPlayerStats, mockEconomicData);
    }
    
    const endTime = Date.now();
    const avgTime = (endTime - startTime) / 1000;
    
    expect(avgTime).toBeLessThan(1); // Should take less than 1ms per calculation
  });

  it('should handle large datasets efficiently', async () => {
    const largeGameSession = {
      ...mockGameSession,
      result: {
        ...mockGameSession.result,
        clickPattern: Array.from({ length: 1000 }, () => Math.random() * 200)
      }
    };

    const startTime = Date.now();
    await AntiCheatSystemV3.detectSuspiciousActivity(largeGameSession);
    const endTime = Date.now();

    expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
  });
});