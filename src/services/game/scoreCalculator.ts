import { GameConfig } from '../../types/game';

export interface ScoreFactors {
  difficulty: number;
  time: number;
  efficiency: number;
  accuracy: number;
}

export interface ScoreBreakdown {
  baseScore: number;
  timeBonus: number;
  efficiencyBonus: number;
  accuracyBonus: number;
  totalScore: number;
  factors: ScoreFactors;
}

export class ScoreCalculator {
  static calculate(
    gameConfig: GameConfig,
    timeElapsed: number,
    flagsUsed: number,
    moves: number
  ): ScoreBreakdown {
    const factors = this.calculateFactors(gameConfig, timeElapsed, flagsUsed, moves);
    
    const baseScore = this.calculateBaseScore(gameConfig);
    const timeBonus = this.calculateTimeBonus(timeElapsed, factors.time);
    const efficiencyBonus = this.calculateEfficiencyBonus(gameConfig.mines, flagsUsed);
    const accuracyBonus = this.calculateAccuracyBonus(gameConfig, moves, factors.accuracy);
    
    const totalScore = baseScore + timeBonus + efficiencyBonus + accuracyBonus;
    
    return {
      baseScore,
      timeBonus,
      efficiencyBonus,
      accuracyBonus,
      totalScore: Math.max(0, Math.floor(totalScore)),
      factors
    };
  }

  private static calculateFactors(
    config: GameConfig,
    timeElapsed: number,
    flagsUsed: number,
    moves: number
  ): ScoreFactors {
    const difficultyFactor = this.getDifficultyMultiplier(config);
    const timeFactor = this.getTimeEfficiencyFactor(timeElapsed);
    const efficiencyFactor = this.getFlagEfficiencyFactor(config.mines, flagsUsed);
    const accuracyFactor = this.getAccuracyFactor(config, moves);
    
    return {
      difficulty: difficultyFactor,
      time: timeFactor,
      efficiency: efficiencyFactor,
      accuracy: accuracyFactor
    };
  }

  private static calculateBaseScore(config: GameConfig): number {
    const { width, height, mines } = config;
    const totalCells = width * height;
    const difficultyRatio = mines / totalCells;
    
    return Math.floor(mines * 100 * (1 + difficultyRatio));
  }

  private static calculateTimeBonus(timeElapsed: number, timeFactor: number): number {
    // Bonus decreases as time increases
    const maxTimeBonus = 500;
    const timeBonus = Math.max(0, maxTimeBonus - (timeElapsed * 2));
    return Math.floor(timeBonus * timeFactor);
  }

  private static calculateEfficiencyBonus(mines: number, flagsUsed: number): number {
    // Perfect flag usage gets maximum bonus
    if (flagsUsed === mines) {
      return 200;
    }
    
    // Penalty for over-flagging or under-flagging
    const flagDifference = Math.abs(mines - flagsUsed);
    const efficiencyRatio = Math.max(0, 1 - (flagDifference / mines));
    
    return Math.floor(100 * efficiencyRatio);
  }

  private static calculateAccuracyBonus(
    config: GameConfig, 
    moves: number, 
    accuracyFactor: number
  ): number {
    const { width, height, mines } = config;
    const safeCells = (width * height) - mines;
    
    // Fewer moves relative to safe cells = higher bonus
    if (moves <= safeCells) {
      const moveRatio = moves / safeCells;
      const accuracyBonus = Math.max(0, 100 * (2 - moveRatio));
      return Math.floor(accuracyBonus * accuracyFactor);
    }
    
    return 0;
  }

  private static getDifficultyMultiplier(config: GameConfig): number {
    const { width, height, mines } = config;
    const ratio = mines / (width * height);
    
    if (ratio < 0.15) return 1.0;      // Easy
    if (ratio < 0.25) return 1.5;      // Medium  
    return 2.0;                        // Hard
  }

  private static getTimeEfficiencyFactor(timeElapsed: number): number {
    // Faster completion gets higher multiplier
    if (timeElapsed < 30) return 1.5;
    if (timeElapsed < 60) return 1.2;
    if (timeElapsed < 120) return 1.0;
    return 0.8;
  }

  private static getFlagEfficiencyFactor(mines: number, flagsUsed: number): number {
    if (flagsUsed === mines) return 1.5;  // Perfect flagging
    
    const efficiency = Math.abs(mines - flagsUsed) / mines;
    return Math.max(0.5, 1 - efficiency);
  }

  private static getAccuracyFactor(config: GameConfig, moves: number): number {
    const { width, height, mines } = config;
    const totalCells = width * height;
    const moveRatio = moves / totalCells;
    
    if (moveRatio < 0.3) return 1.5;   // Very accurate
    if (moveRatio < 0.6) return 1.2;   // Accurate
    if (moveRatio < 0.9) return 1.0;   // Average
    return 0.8;                        // Many moves
  }

  static getDifficultyName(config: GameConfig): string {
    const { width, height, mines } = config;
    const ratio = mines / (width * height);
    
    if (ratio < 0.15) return 'Easy';
    if (ratio < 0.25) return 'Medium';
    return 'Hard';
  }

  static getPerformanceRating(scoreBreakdown: ScoreBreakdown): string {
    const { factors } = scoreBreakdown;
    const avgFactor = (factors.time + factors.efficiency + factors.accuracy) / 3;
    
    if (avgFactor >= 1.4) return 'Excellent';
    if (avgFactor >= 1.2) return 'Great';
    if (avgFactor >= 1.0) return 'Good';
    if (avgFactor >= 0.8) return 'Average';
    return 'Needs Improvement';
  }
}