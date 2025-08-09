import { GameConfig, Cell, GameResult } from '../../types/game';
import { GameEngine } from './gameEngine';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface GameValidationData {
  config: GameConfig;
  board: Cell[][];
  result: GameResult;
  moves: number;
  flagsUsed: number;
}

export class GameValidator {
  static validateGameConfig(config: GameConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate dimensions
    if (config.width < 4 || config.width > 50) {
      errors.push('Width must be between 4 and 50');
    }
    if (config.height < 4 || config.height > 50) {
      errors.push('Height must be between 4 and 50');
    }

    // Validate mine count
    const totalCells = config.width * config.height;
    const maxMines = totalCells - 9; // Leave space for first click area
    
    if (config.mines < 1) {
      errors.push('Must have at least 1 mine');
    }
    if (config.mines > maxMines) {
      errors.push(`Too many mines. Maximum is ${maxMines} for ${config.width}x${config.height} board`);
    }

    // Validate difficulty
    const difficultyRatio = config.mines / totalCells;
    if (difficultyRatio > 0.4) {
      warnings.push('Very high mine density may make game too difficult');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  static validateBoard(board: Cell[][], config: GameConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check board dimensions
    if (board.length !== config.height) {
      errors.push(`Board height ${board.length} doesn't match config ${config.height}`);
    }
    if (board[0]?.length !== config.width) {
      errors.push(`Board width ${board[0]?.length} doesn't match config ${config.width}`);
    }

    // Count mines
    let mineCount = 0;
    let revealedMines = 0;
    let flaggedCells = 0;
    let revealedCells = 0;

    for (let row = 0; row < board.length; row++) {
      for (let col = 0; col < board[row].length; col++) {
        const cell = board[row][col];
        
        if (cell.isMine) {
          mineCount++;
          if (cell.isRevealed) {
            revealedMines++;
          }
        }
        if (cell.isFlagged) {
          flaggedCells++;
        }
        if (cell.isRevealed) {
          revealedCells++;
        }

        // Validate neighbor count
        if (!cell.isMine) {
          const expectedNeighbors = GameEngine.countNeighborMines(board, row, col);
          if (cell.neighborMines !== expectedNeighbors) {
            errors.push(`Invalid neighbor count at (${row}, ${col})`);
          }
        }
      }
    }

    // Validate mine count
    if (mineCount !== config.mines) {
      errors.push(`Mine count ${mineCount} doesn't match config ${config.mines}`);
    }

    // Check for revealed mines (game should be over)
    if (revealedMines > 0) {
      warnings.push('Game has revealed mines - should be in lost state');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  static validateGameResult(data: GameValidationData): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const { config, board, result, moves, flagsUsed } = data;

    // Validate basic result data
    if (result.timeElapsed < 1) {
      errors.push('Game time must be at least 1 second');
    }
    if (result.timeElapsed > 7200) { // 2 hours
      warnings.push('Extremely long game time - may be suspicious');
    }

    if (moves < 1) {
      errors.push('Must have at least 1 move');
    }
    if (moves > config.width * config.height) {
      warnings.push('Move count exceeds total cells - may indicate repeated clicks');
    }

    if (flagsUsed < 0 || flagsUsed > config.mines + 10) {
      errors.push('Invalid flag usage count');
    }

    // Validate win condition
    if (result.won) {
      const actuallyWon = GameEngine.checkWinCondition(board);
      if (!actuallyWon) {
        errors.push('Game marked as won but board state indicates otherwise');
      }

      // Check for revealed mines
      const hasRevealedMines = board.some(row => 
        row.some(cell => cell.isMine && cell.isRevealed)
      );
      if (hasRevealedMines) {
        errors.push('Winning game cannot have revealed mines');
      }
    }

    // Validate score reasonableness
    const maxPossibleScore = config.mines * 200 + 500 + 200 + 100; // rough estimate
    if (result.score > maxPossibleScore) {
      warnings.push('Score seems unusually high');
    }
    if (result.score < 0) {
      errors.push('Score cannot be negative');
    }

    // Performance validation
    const cellsPerSecond = moves / result.timeElapsed;
    if (cellsPerSecond > 10) {
      warnings.push('Very fast play - may indicate automation');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  static validateGameIntegrity(data: GameValidationData): ValidationResult {
    const configValidation = this.validateGameConfig(data.config);
    const boardValidation = this.validateBoard(data.board, data.config);
    const resultValidation = this.validateGameResult(data);

    const allErrors = [
      ...configValidation.errors,
      ...boardValidation.errors,
      ...resultValidation.errors
    ];

    const allWarnings = [
      ...configValidation.warnings,
      ...boardValidation.warnings,
      ...resultValidation.warnings
    ];

    return {
      isValid: allErrors.length === 0,
      errors: allErrors,
      warnings: allWarnings
    };
  }

  static generateBoardHash(board: Cell[][]): string {
    // Create a deterministic hash of the board state
    const boardString = board.map(row =>
      row.map(cell => 
        `${cell.isMine ? 'M' : ''}${cell.isRevealed ? 'R' : ''}${cell.isFlagged ? 'F' : ''}${cell.neighborMines}`
      ).join('|')
    ).join('||');

    // Simple hash function (in production, use a proper crypto hash)
    let hash = 0;
    for (let i = 0; i < boardString.length; i++) {
      const char = boardString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }
}