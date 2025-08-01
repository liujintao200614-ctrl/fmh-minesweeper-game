import React from 'react';
import styled from 'styled-components';
import { Cell } from '../types/game';

interface GameBoardProps {
  board: Cell[][];
  onCellClick: (row: number, col: number) => void;
  onCellRightClick: (row: number, col: number) => void;
  gameStatus: string;
  flagMode?: boolean;
}

const BoardContainer = styled.div<{ $flagMode: boolean }>`
  display: inline-block;
  border: 3px solid ${props => props.$flagMode ? '#ff9800' : '#999'};
  background: ${props => props.$flagMode ? '#fff3e0' : '#c0c0c0'};
  padding: 10px;
  position: relative;
  
  ${props => props.$flagMode && `
    &::before {
      content: '🚩 插旗模式';
      position: absolute;
      top: -30px;
      left: 50%;
      transform: translateX(-50%);
      background: #ff9800;
      color: white;
      padding: 4px 12px;
      border-radius: 15px;
      font-size: 12px;
      font-weight: bold;
      white-space: nowrap;
    }
  `}
`;

const BoardRow = styled.div`
  display: flex;
`;

const CellButton = styled.button<{ 
  $isRevealed: boolean; 
  $isMine: boolean; 
  $isFlagged: boolean;
  $neighborMines: number;
}>`
  width: 30px;
  height: 30px;
  
  /* 手机端优化 */
  @media (max-width: 768px) {
    width: 35px;
    height: 35px;
    font-size: 16px;
    /* 增加触摸友好性 */
    min-height: 44px; /* iOS推荐的最小触摸目标 */
    min-width: 44px;
  }
  
  @media (max-width: 480px) {
    width: 40px;
    height: 40px;
    font-size: 14px;
    /* 保持触摸友好的尺寸 */
    min-height: 44px;
    min-width: 44px;
  }
  border: 2px outset #c0c0c0;
  background: ${(props) => {
    if (props.$isFlagged) return '#ffeb3b';
    if (!props.$isRevealed) return '#c0c0c0';
    if (props.$isMine) return '#ff0000';
    return '#e0e0e0';
  }};
  font-size: 14px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: ${(props) => props.$isRevealed || props.$isFlagged ? 'default' : 'pointer'};
  color: ${(props) => {
    const colors = ['', '#0000ff', '#008000', '#ff0000', '#800080', '#800000', '#008080', '#000000', '#808080'];
    return colors[props.$neighborMines] || '#000000';
  }};
  
  &:hover {
    background: ${(props) => props.$isRevealed ? (props.$isMine ? '#ff0000' : '#e0e0e0') : '#d0d0d0'};
  }
  
  &:active {
    border: 2px inset #c0c0c0;
    transform: translateY(1px);
  }
  
  /* 提供触摸反馈 */
  &:focus {
    outline: 2px solid #2196F3;
    outline-offset: -2px;
  }
  
  /* 长按时的视觉效果 */
  &.long-pressing {
    background: #ffc107 !important;
    transform: scale(0.95);
    transition: all 0.1s ease;
  }
`;

const GameBoard: React.FC<GameBoardProps> = React.memo(({ 
  board, 
  onCellClick, 
  onCellRightClick, 
  gameStatus,
  flagMode = false
}) => {
  const [longPressTimer, setLongPressTimer] = React.useState<NodeJS.Timeout | null>(null);
  const [isLongPressing, setIsLongPressing] = React.useState(false);
  const [longPressCell, setLongPressCell] = React.useState<{row: number, col: number} | null>(null);

  // 清理定时器
  React.useEffect(() => {
    return () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
      }
    };
  }, [longPressTimer]);

  const handleRightClick = (e: React.MouseEvent, row: number, col: number) => {
    e.preventDefault();
    onCellRightClick(row, col);
  };

  // 长按开始（手机端插旗的主要方式）
  const handleTouchStart = (row: number, col: number) => {
    setIsLongPressing(false);
    setLongPressCell({ row, col });
    
    const timer = setTimeout(() => {
      setIsLongPressing(true);
      setLongPressCell(null);
      // 触发震动反馈（如果支持）
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      onCellRightClick(row, col);
    }, 600); // 600ms长按，避免误触
    setLongPressTimer(timer);
  };

  // 长按结束
  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    setLongPressCell(null);
  };

  // 点击处理 - 支持插旗模式
  const handleCellClick = (row: number, col: number) => {
    // 如果正在长按，不执行点击
    if (isLongPressing) {
      setIsLongPressing(false);
      return;
    }

    const cell = board[row][col];
    
    // 在插旗模式下，点击就是插旗
    if (flagMode) {
      onCellRightClick(row, col);
      return;
    }
    
    // 普通模式下，只有未插旗的格子才能点击
    if (!cell.isFlagged) {
      onCellClick(row, col);
    }
  };

  const getCellContent = (cell: Cell) => {
    if (cell.isFlagged) return '🚩';
    if (!cell.isRevealed) return '';
    if (cell.isMine) return '💣';
    if (cell.neighborMines === 0) return '';
    return cell.neighborMines.toString();
  };

  return (
    <BoardContainer $flagMode={flagMode}>
      {board.map((row, rowIndex) => (
        <BoardRow key={rowIndex}>
          {row.map((cell, colIndex) => (
            <CellButton
              key={`${rowIndex}-${colIndex}`}
              $isRevealed={cell.isRevealed}
              $isMine={cell.isMine}
              $isFlagged={cell.isFlagged}
              $neighborMines={cell.neighborMines}
              className={longPressCell?.row === rowIndex && longPressCell?.col === colIndex ? 'long-pressing' : ''}
              onClick={() => handleCellClick(rowIndex, colIndex)}
              onContextMenu={(e: React.MouseEvent) => handleRightClick(e, rowIndex, colIndex)}
              onTouchStart={() => handleTouchStart(rowIndex, colIndex)}
              onTouchEnd={handleTouchEnd}
              onTouchCancel={handleTouchEnd}
              disabled={gameStatus === 'won' || gameStatus === 'lost'}
            >
              {getCellContent(cell)}
            </CellButton>
          ))}
        </BoardRow>
      ))}
    </BoardContainer>
  );
});

export default GameBoard;