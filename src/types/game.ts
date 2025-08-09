export interface Cell {
  isMine: boolean;
  isRevealed: boolean;
  isFlagged: boolean;
  neighborMines: number;
  row: number;
  col: number;
  isTriggered?: boolean; // 标记触发的地雷
}

export interface GameState {
  board: Cell[][];
  gameStatus: 'waiting' | 'playing' | 'won' | 'lost';
  mineCount: number;
  flagCount: number;
  timeElapsed: number;
  score: number;
  gameId?: number;
  showAllMines?: boolean; // 是否显示所有地雷
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

// 用户颜色主题设置
export interface ColorTheme {
  id: string;
  name: string;
  unrevealedCell: string;
  revealedCell: string;
  flaggedCell: string;
  mineCell: string;
  triggeredMine: string;
  numbers: string[];
  boardBackground: string;
}

// 预设颜色主题
export const DEFAULT_THEMES: ColorTheme[] = [
  {
    id: 'classic',
    name: '经典',
    unrevealedCell: 'linear-gradient(135deg, #f5f5f5, #e0e0e0)',
    revealedCell: 'linear-gradient(135deg, #ffffff, #f8f9fa)',
    flaggedCell: 'linear-gradient(135deg, #ffd54f, #ffb300)',
    mineCell: 'linear-gradient(135deg, #ff5252, #d32f2f)',
    triggeredMine: 'linear-gradient(135deg, #ff1744, #c62828)',
    numbers: ['', '#1976d2', '#388e3c', '#f44336', '#9c27b0', '#795548', '#00acc1', '#424242', '#616161'],
    boardBackground: 'linear-gradient(135deg, #f8f9fa, #e9ecef)'
  },
  {
    id: 'dark',
    name: '暗黑',
    unrevealedCell: 'linear-gradient(135deg, #424242, #212121)',
    revealedCell: 'linear-gradient(135deg, #616161, #424242)',
    flaggedCell: 'linear-gradient(135deg, #ff9800, #f57c00)',
    mineCell: 'linear-gradient(135deg, #f44336, #d32f2f)',
    triggeredMine: 'linear-gradient(135deg, #ff5722, #d84315)',
    numbers: ['', '#2196f3', '#4caf50', '#f44336', '#e91e63', '#9c27b0', '#00bcd4', '#ffc107', '#9e9e9e'],
    boardBackground: 'linear-gradient(135deg, #303030, #212121)'
  },
  {
    id: 'ocean',
    name: '海洋',
    unrevealedCell: 'linear-gradient(135deg, #b3e5fc, #81d4fa)',
    revealedCell: 'linear-gradient(135deg, #e1f5fe, #b3e5fc)',
    flaggedCell: 'linear-gradient(135deg, #ffeb3b, #ffc107)',
    mineCell: 'linear-gradient(135deg, #ff7043, #ff5722)',
    triggeredMine: 'linear-gradient(135deg, #d32f2f, #b71c1c)',
    numbers: ['', '#1976d2', '#388e3c', '#f57c00', '#7b1fa2', '#5d4037', '#00796b', '#455a64', '#616161'],
    boardBackground: 'linear-gradient(135deg, #e0f7fa, #b2ebf2)'
  },
  {
    id: 'forest',
    name: '森林',
    unrevealedCell: 'linear-gradient(135deg, #c8e6c9, #a5d6a7)',
    revealedCell: 'linear-gradient(135deg, #e8f5e8, #c8e6c9)',
    flaggedCell: 'linear-gradient(135deg, #ffcc02, #ffa000)',
    mineCell: 'linear-gradient(135deg, #8d6e63, #5d4037)',
    triggeredMine: 'linear-gradient(135deg, #bf360c, #8d2f1c)',
    numbers: ['', '#1565c0', '#2e7d32', '#ef6c00', '#7b1fa2', '#5d4037', '#00695c', '#424242', '#616161'],
    boardBackground: 'linear-gradient(135deg, #f1f8e9, #dcedc8)'
  }
];