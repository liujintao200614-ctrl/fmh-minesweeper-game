import { Cell } from '../../types/game';

export class GameEngine {
  static createEmptyBoard(width: number, height: number): Cell[][] {
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
  }

  static placeMines(
    board: Cell[][], 
    mineCount: number, 
    firstClickRow: number, 
    firstClickCol: number
  ): Cell[][] {
    const newBoard = board.map(row => row.map(cell => ({ ...cell })));
    const height = newBoard.length;
    const width = newBoard[0].length;
    
    // Calculate excluded cells (first click and neighbors)
    const excludedCells = this.getExcludedCells(
      firstClickRow, 
      firstClickCol, 
      width, 
      height
    );
    
    const availablePositions = width * height - excludedCells.size;
    const actualMineCount = Math.min(mineCount, availablePositions);
    
    this.placeMinesRandomly(newBoard, actualMineCount, excludedCells);
    this.calculateNeighborMines(newBoard);
    
    return newBoard;
  }

  private static getExcludedCells(
    row: number, 
    col: number, 
    width: number, 
    height: number
  ): Set<string> {
    const excluded = new Set<string>();
    
    for (let r = Math.max(0, row - 1); r <= Math.min(height - 1, row + 1); r++) {
      for (let c = Math.max(0, col - 1); c <= Math.min(width - 1, col + 1); c++) {
        excluded.add(`${r},${c}`);
      }
    }
    
    return excluded;
  }

  private static placeMinesRandomly(
    board: Cell[][], 
    mineCount: number, 
    excludedCells: Set<string>
  ): void {
    const height = board.length;
    const width = board[0].length;
    let minesPlaced = 0;
    let attempts = 0;
    const maxAttempts = mineCount * 10;
    
    while (minesPlaced < mineCount && attempts < maxAttempts) {
      const row = Math.floor(Math.random() * height);
      const col = Math.floor(Math.random() * width);
      const key = `${row},${col}`;
      
      if (!board[row][col].isMine && !excludedCells.has(key)) {
        board[row][col].isMine = true;
        minesPlaced++;
      }
      attempts++;
    }
  }

  private static calculateNeighborMines(board: Cell[][]): void {
    const height = board.length;
    const width = board[0].length;
    
    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        if (!board[row][col].isMine) {
          board[row][col].neighborMines = this.countNeighborMines(board, row, col);
        }
      }
    }
  }

  static countNeighborMines(board: Cell[][], row: number, col: number): number {
    let count = 0;
    const height = board.length;
    const width = board[0].length;
    
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        const newRow = row + i;
        const newCol = col + j;
        
        if (this.isValidPosition(newRow, newCol, width, height)) {
          if (board[newRow][newCol].isMine) {
            count++;
          }
        }
      }
    }
    
    return count;
  }

  private static isValidPosition(
    row: number, 
    col: number, 
    width: number, 
    height: number
  ): boolean {
    return row >= 0 && row < height && col >= 0 && col < width;
  }

  static revealCell(board: Cell[][], row: number, col: number): Cell[][] {
    const newBoard = board.map(row => row.map(cell => ({ ...cell })));
    const height = newBoard.length;
    const width = newBoard[0].length;
    
    if (!this.isValidPosition(row, col, width, height)) {
      return newBoard;
    }
    
    const cell = newBoard[row][col];
    if (cell.isRevealed || cell.isFlagged) {
      return newBoard;
    }
    
    // Use iterative approach to avoid stack overflow
    this.revealCellsIteratively(newBoard, row, col);
    
    return newBoard;
  }

  private static revealCellsIteratively(
    board: Cell[][], 
    startRow: number, 
    startCol: number
  ): void {
    const queue: [number, number][] = [[startRow, startCol]];
    const height = board.length;
    const width = board[0].length;
    
    while (queue.length > 0) {
      const [currentRow, currentCol] = queue.shift()!;
      const currentCell = board[currentRow][currentCol];
      
      if (currentCell.isRevealed || currentCell.isFlagged) {
        continue;
      }
      
      currentCell.isRevealed = true;
      
      // If cell has no neighboring mines and is not a mine, reveal neighbors
      if (currentCell.neighborMines === 0 && !currentCell.isMine) {
        this.addNeighborsToQueue(queue, currentRow, currentCol, board, width, height);
      }
    }
  }

  private static addNeighborsToQueue(
    queue: [number, number][],
    row: number,
    col: number,
    board: Cell[][],
    width: number,
    height: number
  ): void {
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        const newRow = row + i;
        const newCol = col + j;
        
        if (this.isValidPosition(newRow, newCol, width, height)) {
          const neighborCell = board[newRow][newCol];
          if (!neighborCell.isRevealed && !neighborCell.isFlagged) {
            const isInQueue = queue.some(([r, c]) => r === newRow && c === newCol);
            if (!isInQueue) {
              queue.push([newRow, newCol]);
            }
          }
        }
      }
    }
  }

  static toggleFlag(
    board: Cell[][], 
    row: number, 
    col: number, 
    maxFlags: number, 
    currentFlagCount: number
  ): { board: Cell[][], flagCount: number } {
    if (!this.isValidPosition(row, col, board[0].length, board.length)) {
      return { board, flagCount: currentFlagCount };
    }
    
    const newBoard = board.map(row => row.map(cell => ({ ...cell })));
    const cell = newBoard[row][col];
    
    if (cell.isRevealed) {
      return { board: newBoard, flagCount: currentFlagCount };
    }
    
    // Check if we can add more flags
    if (!cell.isFlagged && currentFlagCount >= maxFlags) {
      return { board: newBoard, flagCount: currentFlagCount };
    }
    
    cell.isFlagged = !cell.isFlagged;
    const newFlagCount = cell.isFlagged ? currentFlagCount + 1 : currentFlagCount - 1;
    
    return { board: newBoard, flagCount: newFlagCount };
  }

  static checkWinCondition(board: Cell[][]): boolean {
    for (let row = 0; row < board.length; row++) {
      for (let col = 0; col < board[row].length; col++) {
        const cell = board[row][col];
        if (!cell.isMine && !cell.isRevealed) {
          return false;
        }
      }
    }
    return true;
  }
}