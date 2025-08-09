// 反作弊系统
import { DatabaseManager } from './database';

interface GameSession {
  gameId: number;
  playerAddress: string;
  startTime: number;
  board: any[][];
  moves: Array<{
    timestamp: number;
    row: number;
    col: number;
    action: 'reveal' | 'flag' | 'unflag';
  }>;
}

class AntiCheatSystem {
  private static sessions = new Map<string, GameSession>();
  
  // 启动游戏会话
  static startGameSession(gameId: number, playerAddress: string, board: any[][]) {
    const sessionKey = `${playerAddress}_${gameId}`;
    this.sessions.set(sessionKey, {
      gameId,
      playerAddress: playerAddress.toLowerCase(),
      startTime: Date.now(),
      board,
      moves: []
    });
    
    // 清理过期会话（超过1小时）
    this.cleanExpiredSessions();
  }
  
  // 记录玩家操作
  static recordMove(gameId: number, playerAddress: string, row: number, col: number, action: 'reveal' | 'flag' | 'unflag') {
    const sessionKey = `${playerAddress}_${gameId}`;
    const session = this.sessions.get(sessionKey);
    
    if (!session) {
      throw new Error('Game session not found');
    }
    
    session.moves.push({
      timestamp: Date.now(),
      row,
      col,
      action
    });
  }
  
  // 验证游戏完整性
  static async verifyGameIntegrity(
    gameId: number,
    playerAddress: string,
    finalBoard: any[][],
    timeElapsed: number
  ): Promise<{ isValid: boolean; reason?: string }> {
    const sessionKey = `${playerAddress}_${gameId}`;
    const session = this.sessions.get(sessionKey);
    
    if (!session) {
      return { isValid: false, reason: 'No game session found' };
    }
    
    // 验证时间一致性
    const actualTime = Math.floor((Date.now() - session.startTime) / 1000);
    if (Math.abs(timeElapsed - actualTime) > 10) { // 允许10秒误差
      return { isValid: false, reason: 'Time inconsistency detected' };
    }
    
    // 验证移动序列合理性
    const moveValidation = this.validateMoveSequence(session, finalBoard);
    if (!moveValidation.isValid) {
      return moveValidation;
    }
    
    // 验证游戏速度合理性
    const speedValidation = this.validateGameSpeed(session, timeElapsed);
    if (!speedValidation.isValid) {
      return speedValidation;
    }
    
    // 检查可疑行为模式
    const behaviorValidation = await this.checkSuspiciousBehavior(playerAddress, timeElapsed, finalBoard);
    if (!behaviorValidation.isValid) {
      return behaviorValidation;
    }
    
    // 清理会话
    this.sessions.delete(sessionKey);
    
    return { isValid: true };
  }
  
  // 验证移动序列
  private static validateMoveSequence(session: GameSession, finalBoard: any[][]): { isValid: boolean; reason?: string } {
    if (session.moves.length === 0) {
      return { isValid: false, reason: 'No moves recorded' };
    }
    
    // 检查移动频率是否过快
    const avgTimeBetweenMoves = session.moves.length > 1 
      ? (session.moves[session.moves.length - 1].timestamp - session.moves[0].timestamp) / (session.moves.length - 1)
      : 1000;
    
    if (avgTimeBetweenMoves < 50) { // 少于50毫秒一次操作视为可疑
      return { isValid: false, reason: 'Moves too frequent - possible bot' };
    }
    
    // 检查是否有不合理的移动模式
    const suspiciousPatterns = this.detectSuspiciousPatterns(session.moves);
    if (suspiciousPatterns.length > 0) {
      return { isValid: false, reason: `Suspicious patterns detected: ${suspiciousPatterns.join(', ')}` };
    }
    
    return { isValid: true };
  }
  
  // 验证游戏速度
  private static validateGameSpeed(session: GameSession, timeElapsed: number): { isValid: boolean; reason?: string } {
    const totalCells = session.board.length * session.board[0].length;
    const mines = session.board.flat().filter(cell => cell.isMine).length;
    
    // 计算理论最快完成时间（基于棋盘大小和复杂度）
    const minTime = Math.max(5, Math.floor(totalCells / 20) + mines / 5);
    
    if (timeElapsed < minTime) {
      return { isValid: false, reason: `Completion time too fast: ${timeElapsed}s (min: ${minTime}s)` };
    }
    
    // 检查极端高分时间是否合理
    const maxReasonableTime = totalCells * 5; // 每格最多5秒
    if (timeElapsed > maxReasonableTime) {
      return { isValid: false, reason: 'Completion time too slow - possible idle time' };
    }
    
    return { isValid: true };
  }
  
  // 检查可疑行为
  private static async checkSuspiciousBehavior(
    playerAddress: string,
    timeElapsed: number,
    board: any[][]
  ): Promise<{ isValid: boolean; reason?: string }> {
    // 检查该玩家最近的游戏记录
    const recentGames = await DatabaseManager.getPlayerRecentGames(playerAddress, 10);
    
    if (recentGames.length >= 3) {
      // 检查是否有完全相同的成绩（可能是重放攻击）
      const duplicateScores = recentGames.filter((game: any) => 
        Math.abs(game.timeElapsed - timeElapsed) < 2
      ).length;
      
      if (duplicateScores >= 2) {
        return { isValid: false, reason: 'Suspicious identical scores detected' };
      }
      
      // 检查成绩提升是否过于显著
      const avgTime = recentGames.reduce((sum: number, game: any) => sum + game.timeElapsed, 0) / recentGames.length;
      if (timeElapsed < avgTime * 0.3) { // 成绩突然提升70%以上
        return { isValid: false, reason: 'Suspicious performance improvement' };
      }
    }
    
    return { isValid: true };
  }
  
  // 检测可疑操作模式
  private static detectSuspiciousPatterns(moves: any[]): string[] {
    const patterns: string[] = [];
    
    // 检查是否有完全规律的移动
    if (moves.length > 10) {
      const intervals = moves.slice(1).map((move, i) => move.timestamp - moves[i].timestamp);
      const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
      const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
      
      if (variance < 100) { // 时间间隔方差很小，可能是机器人
        patterns.push('Regular timing pattern');
      }
    }
    
    // 检查是否有不自然的移动顺序
    const directSequences = this.findDirectionalSequences(moves);
    if (directSequences > moves.length * 0.8) { // 80%以上都是直线移动
      patterns.push('Unnatural movement sequence');
    }
    
    return patterns;
  }
  
  // 查找方向性移动序列
  private static findDirectionalSequences(moves: any[]): number {
    let sequences = 0;
    
    for (let i = 2; i < moves.length; i++) {
      const prev2 = moves[i - 2];
      const prev1 = moves[i - 1];
      const curr = moves[i];
      
      // 检查是否在同一行或同一列
      if ((prev2.row === prev1.row && prev1.row === curr.row) ||
          (prev2.col === prev1.col && prev1.col === curr.col)) {
        sequences++;
      }
    }
    
    return sequences;
  }
  
  // 清理过期会话
  private static cleanExpiredSessions() {
    const now = Date.now();
    const maxAge = 60 * 60 * 1000; // 1小时
    
    for (const [key, session] of this.sessions.entries()) {
      if (now - session.startTime > maxAge) {
        this.sessions.delete(key);
      }
    }
  }
  
  // 获取会话统计
  static getSessionStats() {
    return {
      activeSessions: this.sessions.size,
      sessions: Array.from(this.sessions.values()).map(session => ({
        gameId: session.gameId,
        playerAddress: session.playerAddress,
        startTime: session.startTime,
        moveCount: session.moves.length
      }))
    };
  }
}

export { AntiCheatSystem };