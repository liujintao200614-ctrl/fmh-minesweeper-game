import { Cell, GameState, GameConfig } from '../types/game';

export const createEmptyBoard = (width: number, height: number): Cell[][] => {
  return Array(height).fill(null).map((_, row) =>
    Array(width).fill(null).map((_, col) => ({
      isMine: false,
      isRevealed: false,
      isFlagged: false,
      neighborMines: 0,
      row,
      col,
    }))
  );
};

export const placeMines = (board: Cell[][], mineCount: number, firstClickRow: number, firstClickCol: number): Cell[][] => {
  const newBoard = board.map(row => row.map(cell => ({ ...cell })));
  const height = newBoard.length;
  const width = newBoard[0].length;
  
  // 计算可用位置数量（排除首次点击和相邻位置）
  const excludedCells = new Set<string>();
  for (let r = Math.max(0, firstClickRow - 1); r <= Math.min(height - 1, firstClickRow + 1); r++) {
    for (let c = Math.max(0, firstClickCol - 1); c <= Math.min(width - 1, firstClickCol + 1); c++) {
      excludedCells.add(`${r},${c}`);
    }
  }
  
  const availablePositions = width * height - excludedCells.size;
  const actualMineCount = Math.min(mineCount, availablePositions);
  
  let minesPlaced = 0;
  let attempts = 0;
  const maxAttempts = actualMineCount * 10; // 防止无限循环
  
  while (minesPlaced < actualMineCount && attempts < maxAttempts) {
    const row = Math.floor(Math.random() * height);
    const col = Math.floor(Math.random() * width);
    
    // Don't place mine on first click or adjacent cells
    const isExcluded = excludedCells.has(`${row},${col}`);
    
    if (!newBoard[row][col].isMine && !isExcluded) {
      newBoard[row][col].isMine = true;
      minesPlaced++;
    }
    attempts++;
  }
  
  // Calculate neighbor mines
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      if (!newBoard[row][col].isMine) {
        newBoard[row][col].neighborMines = countNeighborMines(newBoard, row, col);
      }
    }
  }
  
  return newBoard;
};

export const countNeighborMines = (board: Cell[][], row: number, col: number): number => {
  let count = 0;
  const height = board.length;
  const width = board[0].length;
  
  for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
      const newRow = row + i;
      const newCol = col + j;
      
      if (newRow >= 0 && newRow < height && newCol >= 0 && newCol < width) {
        if (board[newRow][newCol].isMine) {
          count++;
        }
      }
    }
  }
  
  return count;
};

export const revealCell = (board: Cell[][], row: number, col: number): Cell[][] => {
  const newBoard = board.map(row => row.map(cell => ({ ...cell })));
  const height = newBoard.length;
  const width = newBoard[0].length;
  
  if (row < 0 || row >= height || col < 0 || col >= width) {
    return newBoard;
  }
  
  const cell = newBoard[row][col];
  
  if (cell.isRevealed || cell.isFlagged) {
    return newBoard;
  }
  
  // 使用队列进行迭代展开，避免递归导致的堆栈溢出
  const queue: [number, number][] = [[row, col]];
  
  while (queue.length > 0) {
    const [currentRow, currentCol] = queue.shift()!;
    const currentCell = newBoard[currentRow][currentCol];
    
    if (currentCell.isRevealed || currentCell.isFlagged) {
      continue;
    }
    
    currentCell.isRevealed = true;
    
    // 如果当前格子没有相邻雷且不是雷，则添加相邻格子到队列
    if (currentCell.neighborMines === 0 && !currentCell.isMine) {
      for (let i = -1; i <= 1; i++) {
        for (let j = -1; j <= 1; j++) {
          const newRow = currentRow + i;
          const newCol = currentCol + j;
          
          if (newRow >= 0 && newRow < height && newCol >= 0 && newCol < width) {
            const neighborCell = newBoard[newRow][newCol];
            if (!neighborCell.isRevealed && !neighborCell.isFlagged) {
              // 检查是否已在队列中，避免重复添加
              const isInQueue = queue.some(([r, c]) => r === newRow && c === newCol);
              if (!isInQueue) {
                queue.push([newRow, newCol]);
              }
            }
          }
        }
      }
    }
  }
  
  return newBoard;
};

export const toggleFlag = (board: Cell[][], row: number, col: number, maxFlags: number, currentFlagCount: number): { board: Cell[][], flagCount: number } => {
  // 边界检查
  if (row < 0 || row >= board.length || col < 0 || col >= board[0].length) {
    return { board, flagCount: currentFlagCount };
  }
  
  const newBoard = board.map(row => row.map(cell => ({ ...cell })));
  const cell = newBoard[row][col];
  
  if (cell.isRevealed) {
    return { board: newBoard, flagCount: currentFlagCount };
  }
  
  // 如果当前没有插旗，检查是否超过最大插旗数
  if (!cell.isFlagged && currentFlagCount >= maxFlags) {
    return { board: newBoard, flagCount: currentFlagCount }; // 已达到最大插旗数，不允许再插旗
  }
  
  // 切换插旗状态
  cell.isFlagged = !cell.isFlagged;
  const newFlagCount = cell.isFlagged ? currentFlagCount + 1 : currentFlagCount - 1;
  
  return { board: newBoard, flagCount: newFlagCount };
};

export const checkWinCondition = (board: Cell[][]): boolean => {
  for (let row = 0; row < board.length; row++) {
    for (let col = 0; col < board[row].length; col++) {
      const cell = board[row][col];
      if (!cell.isMine && !cell.isRevealed) {
        return false;
      }
    }
  }
  return true;
};

export const calculateScore = (gameConfig: GameConfig, timeElapsed: number, flagsUsed: number): number => {
  const { width, height, mines } = gameConfig;
  const totalCells = width * height;
  
  // Base score based on difficulty
  const difficultyMultiplier = mines / totalCells;
  const baseScore = Math.floor(mines * 100 * difficultyMultiplier);
  
  // Time bonus (faster = higher score)
  const timeBonus = Math.max(0, 300 - timeElapsed);
  
  // Efficiency bonus (fewer flags used = higher score)
  const flagEfficiency = Math.max(0, mines - flagsUsed) * 10;
  
  return baseScore + timeBonus + flagEfficiency;
};

export const getGameDifficulty = (config: GameConfig): string => {
  const { width, height, mines } = config;
  const ratio = mines / (width * height);
  
  if (ratio < 0.15) return 'Easy';
  if (ratio < 0.25) return 'Medium';
  return 'Hard';
};