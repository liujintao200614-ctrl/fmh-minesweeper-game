import React from 'react';
import styled from 'styled-components';
import { Cell as CellType } from '../../../types/game';

interface CellProps {
  cell: CellType;
  row: number;
  col: number;
  flagMode?: boolean;
  gameStatus: string;
  isLongPressing?: boolean;
  isFlagSuccess?: boolean;
  onCellClick: (row: number, col: number) => void;
  onCellRightClick: (row: number, col: number) => void;
  onTouchStart: (e: React.TouchEvent, row: number, col: number) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchCancel: (e: React.TouchEvent) => void;
}

const CellButton = styled.button<{ 
  $isRevealed: boolean; 
  $isMine: boolean; 
  $isFlagged: boolean;
  $neighborMines: number;
}>`
  width: 30px;
  height: 30px;
  
  /* 移动端基础优化 */
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
  
  /* 手机端优化 - 更大的触摸目标 */
  @media (max-width: 768px) {
    width: 40px;
    height: 40px;
    font-size: 18px;
    min-height: 48px;
    min-width: 48px;
  }
  
  @media (max-width: 480px) {
    width: 42px;
    height: 42px;
    font-size: 16px;
    min-height: 48px;
    min-width: 48px;
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
  
  &:focus {
    outline: 2px solid #2196F3;
    outline-offset: -2px;
  }
  
  /* 长按时的视觉效果 */
  &.long-pressing {
    background: #ffc107 !important;
    transform: scale(0.95);
    transition: all 0.1s ease;
    position: relative;
    
    &::after {
      content: '';
      position: absolute;
      top: 2px;
      left: 2px;
      right: 2px;
      height: 4px;
      background: #ff5722;
      border-radius: 2px;
      animation: longPressProgress 0.4s linear;
    }
  }
  
  @keyframes longPressProgress {
    0% { width: 0%; }
    100% { width: calc(100% - 4px); }
  }
  
  /* 插旗成功反馈效果 */
  &.flag-success {
    animation: flagSuccess 0.5s ease;
  }
  
  @keyframes flagSuccess {
    0% {
      transform: scale(1);
      box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7);
    }
    50% {
      transform: scale(1.1);
      box-shadow: 0 0 0 10px rgba(76, 175, 80, 0);
    }
    100% {
      transform: scale(1);
      box-shadow: 0 0 0 0 rgba(76, 175, 80, 0);
    }
  }
`;

const Cell: React.FC<CellProps> = ({
  cell,
  row,
  col,
  flagMode = false,
  gameStatus,
  isLongPressing = false,
  isFlagSuccess = false,
  onCellClick,
  onCellRightClick,
  onTouchStart,
  onTouchEnd,
  onTouchMove,
  onTouchCancel
}) => {
  const handleRightClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onCellRightClick(row, col);
  };

  const handleClick = () => {
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

  const getCellContent = () => {
    if (cell.isFlagged) return '🚩';
    if (!cell.isRevealed) return '';
    if (cell.isMine) return '💣';
    if (cell.neighborMines === 0) return '';
    return cell.neighborMines.toString();
  };

  return (
    <CellButton
      $isRevealed={cell.isRevealed}
      $isMine={cell.isMine}
      $isFlagged={cell.isFlagged}
      $neighborMines={cell.neighborMines}
      className={
        isLongPressing 
          ? 'long-pressing' 
          : isFlagSuccess 
            ? 'flag-success' 
            : ''
      }
      onClick={handleClick}
      onContextMenu={handleRightClick}
      onTouchStart={(e) => onTouchStart(e, row, col)}
      onTouchEnd={onTouchEnd}
      onTouchMove={onTouchMove}
      onTouchCancel={onTouchCancel}
      disabled={gameStatus === 'won' || gameStatus === 'lost'}
    >
      {getCellContent()}
    </CellButton>
  );
};

export default React.memo(Cell);