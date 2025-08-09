import React from 'react';
import styled from 'styled-components';
import { Cell, ColorTheme } from '../types/game';
import { GameBoard as GameBoardContainer } from './ResponsiveLayout';

interface GameBoardProps {
  board: Cell[][];
  onCellClick: (row: number, col: number) => void;
  onCellRightClick: (row: number, col: number) => void;
  gameStatus: string;
  flagMode?: boolean;
  colorTheme?: ColorTheme;
  showAllMines?: boolean;
}

const BoardContainer = styled(GameBoardContainer)<{ $flagMode: boolean; $boardBg?: string }>`
  display: inline-block;
  border: 2px solid ${props => props.$flagMode ? '#ff9800' : 'rgba(102, 126, 234, 0.3)'};
  background: ${props => props.$boardBg || (props.$flagMode ? 'linear-gradient(135deg, #fff3e0, #ffe0b2)' : 'linear-gradient(135deg, #f8f9fa, #e9ecef)')};
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  position: relative;
  
  /* 移动端优化 */
  touch-action: manipulation; /* 禁用双击缩放等手势 */
  user-select: none; /* 禁用文本选择 */
  -webkit-user-select: none;
  -webkit-touch-callout: none; /* 禁用iOS长按菜单 */
  
  ${props => props.$flagMode && `
    &::before {
      content: '🚩 插旗模式';
      position: absolute;
      top: -40px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(45deg, #ff9800, #f57c00);
      color: white;
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
      box-shadow: 0 2px 8px rgba(255, 152, 0, 0.3);
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
  $isTriggered?: boolean;
  $customColors?: {
    unrevealedCell: string;
    revealedCell: string;
    flaggedCell: string;
    mineCell: string;
    triggeredMine: string;
    numberColor: string;
  };
}>`
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  transition: all 0.15s ease;
  
  /* 移动端基础优化 */
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent; /* 移除点击高亮 */
  
  /* 手机端优化 - 更大的触摸目标 */
  @media (max-width: 768px) {
    width: 36px;
    height: 36px;
    font-size: 1rem;
    min-height: 44px;
    min-width: 44px;
    border-radius: 8px;
  }
  
  @media (max-width: 480px) {
    width: 38px;
    height: 38px;
    font-size: 0.95rem;
    min-height: 44px;
    min-width: 44px;
  }
  background: ${(props) => {
    if (props.$customColors) {
      if (props.$isFlagged) return props.$customColors.flaggedCell;
      if (!props.$isRevealed) return props.$customColors.unrevealedCell;
      if (props.$isMine) return props.$isTriggered ? props.$customColors.triggeredMine : props.$customColors.mineCell;
      return props.$customColors.revealedCell;
    }
    // 默认颜色
    if (props.$isFlagged) return 'linear-gradient(135deg, #ffd54f, #ffb300)';
    if (!props.$isRevealed) return 'linear-gradient(135deg, #f5f5f5, #e0e0e0)';
    if (props.$isMine) return props.$isTriggered ? 'linear-gradient(135deg, #ff1744, #c62828)' : 'linear-gradient(135deg, #ff5252, #d32f2f)';
    return 'linear-gradient(135deg, #ffffff, #f8f9fa)';
  }};
  
  box-shadow: ${(props) => {
    if (props.$isRevealed) return 'inset 0 1px 3px rgba(0, 0, 0, 0.2)';
    return '0 2px 4px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.3)';
  }};
  
  font-size: 0.875rem;
  cursor: ${(props) => props.$isRevealed || props.$isFlagged ? 'default' : 'pointer'};
  color: ${(props) => {
    if (props.$customColors && props.$customColors.numberColor) {
      return props.$customColors.numberColor;
    }
    const colors = ['', '#1976d2', '#388e3c', '#f44336', '#9c27b0', '#795548', '#00acc1', '#424242', '#616161'];
    return colors[props.$neighborMines] || '#424242';
  }};
  
  &:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.3);
  }
  
  &:active:not(:disabled) {
    transform: translateY(0);
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
  }
  
  &:focus {
    outline: 2px solid #667eea;
    outline-offset: 1px;
  }
  
  &:disabled {
    opacity: 0.7;
    cursor: not-allowed;
  }
  
  /* 长按时的视觉效果 */
  &.long-pressing {
    background: linear-gradient(135deg, #ffc107, #ff9800) !important;
    transform: scale(0.95);
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3) !important;
    position: relative;
    
    &::after {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      right: 2px;
      height: 3px;
      background: linear-gradient(90deg, #ff5722, #f44336);
      border-radius: 2px;
      animation: longPressProgress 0.3s linear;
    }
  }
  
  @keyframes longPressProgress {
    0% {
      width: 0%;
    }
    100% {
      width: calc(100% - 4px);
    }
  }
  
  &.flag-success {
    animation: flagSuccess 0.4s ease;
  }
  
  @keyframes flagSuccess {
    0% {
      transform: scale(1);
      box-shadow: 0 0 0 0 rgba(255, 193, 7, 0.6);
    }
    50% {
      transform: scale(1.05);
      box-shadow: 0 0 0 8px rgba(255, 193, 7, 0);
    }
    100% {
      transform: scale(1);
      box-shadow: 0 0 0 0 rgba(255, 193, 7, 0);
    }
  }
`;

const GameBoard: React.FC<GameBoardProps> = React.memo(({ 
  board, 
  onCellClick, 
  onCellRightClick, 
  gameStatus,
  flagMode = false,
  colorTheme,
  showAllMines = false
}) => {
  const [longPressTimer, setLongPressTimer] = React.useState<NodeJS.Timeout | null>(null);
  const [isLongPressing, setIsLongPressing] = React.useState(false);
  const [longPressCell, setLongPressCell] = React.useState<{row: number, col: number} | null>(null);
  const [touchStartPos, setTouchStartPos] = React.useState<{x: number, y: number} | null>(null);
  const [touchMoved, setTouchMoved] = React.useState(false);
  const [flaggedCell, setFlaggedCell] = React.useState<{row: number, col: number} | null>(null);

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
  const handleTouchStart = (e: React.TouchEvent, row: number, col: number) => {
    // 阻止默认行为，避免长按时出现浏览器菜单
    e.preventDefault();
    
    const touch = e.touches[0];
    if (touch) {
      setTouchStartPos({ x: touch.clientX, y: touch.clientY });
    }
    
    setIsLongPressing(false);
    setTouchMoved(false);
    setLongPressCell({ row, col });
    
    const timer = setTimeout(() => {
      // 只有没有移动时才触发长按
      if (!touchMoved) {
        setIsLongPressing(true);
        setLongPressCell(null);
        // 触发震动反馈（如果支持）
        if (navigator.vibrate) {
          navigator.vibrate([50, 20, 50]); // 更强的震动反馈
        }
        onCellRightClick(row, col);
        
        // 显示成功插旗反馈
        setFlaggedCell({ row, col });
        setTimeout(() => setFlaggedCell(null), 500);
      }
    }, 300); // 减少到300ms，更快响应
    setLongPressTimer(timer);
  };

  // 长按结束
  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
    
    // 重置状态
    setLongPressCell(null);
    setTouchStartPos(null);
    setTouchMoved(false);
    
    // 短延迟后重置长按状态，避免误触点击
    setTimeout(() => {
      setIsLongPressing(false);
    }, 100);
  };

  // 手指移动时检测移动距离
  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    
    if (touchStartPos && e.touches[0]) {
      const touch = e.touches[0];
      const deltaX = Math.abs(touch.clientX - touchStartPos.x);
      const deltaY = Math.abs(touch.clientY - touchStartPos.y);
      const moveDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      // 移动超过10像素认为是移动操作，取消长按
      if (moveDistance > 10) {
        setTouchMoved(true);
        if (longPressTimer) {
          clearTimeout(longPressTimer);
          setLongPressTimer(null);
        }
        setLongPressCell(null);
      }
    }
  };

  // 点击处理 - 支持插旗模式
  const handleCellClick = (row: number, col: number) => {
    // 如果刚刚完成长按操作或者手指移动了，不执行点击
    if (isLongPressing || touchMoved) {
      setIsLongPressing(false);
      setTouchMoved(false);
      return;
    }

    const cell = board[row][col];
    
    // 在插旗模式下，点击就是插旗
    if (flagMode) {
      // 添加轻微震动反馈
      if (navigator.vibrate) {
        navigator.vibrate(30);
      }
      onCellRightClick(row, col);
      return;
    }
    
    // 普通模式下，只有未插旗的格子才能点击
    if (!cell.isFlagged) {
      onCellClick(row, col);
    }
  };

  const getCellContent = (cell: Cell) => {
    if (cell.isFlagged && !showAllMines) return '🚩';
    if (!cell.isRevealed && !showAllMines) return '';
    if (cell.isMine) {
      // 游戏结束时显示所有地雷，触发的地雷用不同符号
      if (showAllMines) {
        return cell.isTriggered ? '💥' : '💣';
      }
      return '💣';
    }
    if (cell.neighborMines === 0) return '';
    return cell.neighborMines.toString();
  };
  
  // 根据主题生成自定义颜色
  const getCustomColors = (cell: Cell) => {
    if (!colorTheme) return undefined;
    
    return {
      unrevealedCell: colorTheme.unrevealedCell,
      revealedCell: colorTheme.revealedCell,
      flaggedCell: colorTheme.flaggedCell,
      mineCell: colorTheme.mineCell,
      triggeredMine: colorTheme.triggeredMine,
      numberColor: colorTheme.numbers[cell.neighborMines] || colorTheme.numbers[0]
    };
  };

  return (
    <BoardContainer 
      $flagMode={flagMode}
      $boardBg={colorTheme?.boardBackground}
    >
      {board.map((row, rowIndex) => (
        <BoardRow key={rowIndex}>
          {row.map((cell, colIndex) => (
            <CellButton
              key={`${rowIndex}-${colIndex}`}
              $isRevealed={cell.isRevealed || showAllMines}
              $isMine={cell.isMine}
              $isFlagged={cell.isFlagged}
              $neighborMines={cell.neighborMines}
              $isTriggered={cell.isTriggered}
              $customColors={getCustomColors(cell)}
              className={
                longPressCell?.row === rowIndex && longPressCell?.col === colIndex 
                  ? 'long-pressing' 
                  : flaggedCell?.row === rowIndex && flaggedCell?.col === colIndex 
                    ? 'flag-success' 
                    : ''
              }
              onClick={() => handleCellClick(rowIndex, colIndex)}
              onContextMenu={(e: React.MouseEvent) => handleRightClick(e, rowIndex, colIndex)}
              onTouchStart={(e) => handleTouchStart(e, rowIndex, colIndex)}
              onTouchEnd={handleTouchEnd}
              onTouchMove={handleTouchMove}
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