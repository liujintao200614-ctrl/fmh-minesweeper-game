export interface Cell {
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  neighborMines: number;
  row: number;
  col: number;
}

export interface GameState {
  board: Cell[][];
  gameStatus: 'waiting' | 'playing' | 'won' | 'lost';
  mineCount: number;
  flagCount: number;
  timeElapsed: number;
  score: number;
  gameId?: number;
}

export interface GameConfig {
  width: number;
  height: number;
  mines: number;
}

export interface GameStats {
  gamesWon: number;
  totalGames: number;
  totalRewards: string;
}

export interface ContractGame {
  player: string;
  width: number;
  height: number;
  mines: number;
  startTime: number;
  endTime: number;
  isWon: boolean;
  isCompleted: boolean;
  rewardClaimed: boolean;
  score: number;
}