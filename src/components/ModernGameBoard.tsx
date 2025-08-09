import React, { useCallback, useRef, useState, useEffect } from 'react';
import styled from 'styled-components';
import { Cell } from '../types/game';

interface ModernGameBoardProps {
  board: Cell[][];
  onCellClick: (row: number, col: number) => void;
  onCellRightClick: (row: number, col: number) => void;
  gameStatus: string;
  flagMode?: boolean;
}

const BoardContainer = styled.div<{ $flagMode: boolean; $boardWidth: number }>`
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(145deg, #2c3e50, #34495e);
  border-radius: 12px;
  padding: 16px;
  box-shadow: 
    0 10px 30px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  position: relative;
  user-select: none;
  touch-action: manipulation;
  width: fit-content;
  margin: 0 auto;
  
  ${props => props.$flagMode && `
    &::before {
      content: '🚩 标旗模式';
      position: absolute;
      top: -40px;
      left: 50%;
      transform: translateX(-50%);
      background: linear-gradient(135deg, #e74c3c, #c0392b);
      color: white;
      padding: 8px 20px;
      border-radius: 25px;
      font-size: 14px;
      font-weight: bold;
      box-shadow: 0 4px 12px rgba(231, 76, 60, 0.4);
      animation: pulse 2s infinite;
    }
    
    @keyframes pulse {
      0%, 100% { transform: translateX(-50%) scale(1); }
      50% { transform: translateX(-50%) scale(1.05); }
    }
  `}
  
  @media (max-width: 768px) {
    padding: 12px;
    ${props => props.$boardWidth > 16 && `
      transform: scale(0.85);
      transform-origin: center;
    `}
  }
  
  @media (max-width: 480px) {
    padding: 10px;
    ${props => props.$boardWidth > 16 && `
      transform: scale(0.75);
      transform-origin: center;
    `}
  }
`;

const BoardGrid = styled.div<{ $columns: number; $cellSize: number }>`
  display: grid;
  grid-template-columns: repeat(${props => props.$columns}, ${props => props.$cellSize}px);
  gap: 2px;
  background: #1a252f;
  border-radius: 8px;
  padding: 8px;
  
  @media (max-width: 480px) {
    grid-template-columns: repeat(${props => props.$columns}, ${props => Math.max(24, props.$cellSize - 6)}px);
    gap: 1px;
    padding: 6px;
  }
`;

const CellButton = styled.button<{ 
  $isRevealed: boolean; 
  $isMine: boolean; 
  $isFlagged: boolean;
  $neighborCount: number;
  $cellSize: number;
  $gameOver: boolean;
}>`
  width: ${props => props.$cellSize}px;
  height: ${props => props.$cellSize}px;
  border: none;
  border-radius: 4px;
  font-size: ${props => Math.max(10, props.$cellSize * 0.4)}px;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  
  /* 未揭开的方块 - 3D效果 */
  ${props => !props.$isRevealed && !props.$isFlagged && `
    background: linear-gradient(145deg, #7f8c8d, #95a5a6);
    box-shadow: 
      inset -2px -2px 4px rgba(0, 0, 0, 0.2),
      inset 2px 2px 4px rgba(255, 255, 255, 0.2),
      0 2px 4px rgba(0, 0, 0, 0.1);
    
    &:hover:not(:disabled) {
      background: linear-gradient(145deg, #95a5a6, #bdc3c7);
      transform: translateY(-1px);
      box-shadow: 
        inset -2px -2px 4px rgba(0, 0, 0, 0.2),
        inset 2px 2px 4px rgba(255, 255, 255, 0.2),
        0 4px 8px rgba(0, 0, 0, 0.15);
    }
    
    &:active:not(:disabled) {
      transform: translateY(0px);
      box-shadow: 
        inset -1px -1px 2px rgba(0, 0, 0, 0.3),
        inset 1px 1px 2px rgba(255, 255, 255, 0.1);
    }
  `}
  
  /* 标旗方块 */
  ${props => props.$isFlagged && `
    background: linear-gradient(145deg, #e74c3c, #c0392b);
    color: white;
    box-shadow: 
      0 2px 4px rgba(231, 76, 60, 0.3),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
    
    &:hover:not(:disabled) {
      background: linear-gradient(145deg, #c0392b, #a93226);
      transform: translateY(-1px) scale(1.02);
    }
  `}
  
  /* 已揭开的空方块 */
  ${props => props.$isRevealed && !props.$isMine && props.$neighborCount === 0 && `
    background: linear-gradient(145deg, #ecf0f1, #d5dbdb);
    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
    cursor: default;
  `}
  
  /* 已揭开的数字方块 */
  ${props => props.$isRevealed && !props.$isMine && props.$neighborCount > 0 && `
    background: linear-gradient(145deg, #ecf0f1, #d5dbdb);
    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.1);
    cursor: default;
    ${getNumberColor(props.$neighborCount)}
  `}
  
  /* 地雷方块 */
  ${props => props.$isRevealed && props.$isMine && `
    background: linear-gradient(145deg, #e74c3c, #c0392b);
    color: white;
    box-shadow: 
      0 0 10px rgba(231, 76, 60, 0.5),
      inset 0 1px 0 rgba(255, 255, 255, 0.2);
    animation: ${!props.$gameOver ? 'explode 0.5s ease-out' : 'none'};
    
    @keyframes explode {
      0% { 
        transform: scale(1); 
        background: linear-gradient(145deg, #e74c3c, #c0392b);
      }
      50% { 
        transform: scale(1.2); 
        background: linear-gradient(145deg, #ff6b47, #e74c3c);
        box-shadow: 0 0 20px rgba(255, 107, 71, 0.8);
      }
      100% { 
        transform: scale(1); 
        background: linear-gradient(145deg, #e74c3c, #c0392b);
      }
    }
  `}
  
  /* 禁用状态 */
  ${props => props.$gameOver && `
    pointer-events: none;
    opacity: 0.8;
  `}
  
  /* 移动端优化 */
  @media (max-width: 480px) {
    width: ${props => Math.max(24, props.$cellSize - 6)}px;
    height: ${props => Math.max(24, props.$cellSize - 6)}px;
    font-size: ${props => Math.max(8, (props.$cellSize - 6) * 0.4)}px;
  }
  
  /* 添加触摸反馈 */
  @media (pointer: coarse) {
    &:active:not(:disabled) {
      background: ${props => props.$isFlagged 
        ? 'linear-gradient(145deg, #a93226, #922b21)'
        : 'linear-gradient(145deg, #85929e, #7b8794)'
      };
    }
  }
`;

// 数字颜色配置
function getNumberColor(count: number): string {
  const colors = {
    1: 'color: #3498db; text-shadow: 0 1px 2px rgba(52, 152, 219, 0.3);',
    2: 'color: #27ae60; text-shadow: 0 1px 2px rgba(39, 174, 96, 0.3);',
    3: 'color: #e74c3c; text-shadow: 0 1px 2px rgba(231, 76, 60, 0.3);',
    4: 'color: #8e44ad; text-shadow: 0 1px 2px rgba(142, 68, 173, 0.3);',
    5: 'color: #d35400; text-shadow: 0 1px 2px rgba(211, 84, 0, 0.3);',
    6: 'color: #16a085; text-shadow: 0 1px 2px rgba(22, 160, 133, 0.3);',
    7: 'color: #2c3e50; text-shadow: 0 1px 2px rgba(44, 62, 80, 0.3);',
    8: 'color: #7f8c8d; text-shadow: 0 1px 2px rgba(127, 140, 141, 0.3);'
  };
  
  return colors[count as keyof typeof colors] || '';
}

// 获取单元格显示内容
function getCellContent(cell: Cell): string {
  if (cell.isFlagged) return '🚩';
  if (!cell.isRevealed) return '';
  if (cell.isMine) return '💣';
  if (cell.neighborMines > 0) return cell.neighborMines.toString();
  return '';
}

const ModernGameBoard: React.FC<ModernGameBoardProps> = ({
  board,
  onCellClick,
  onCellRightClick,
  gameStatus,
  flagMode = false
}) => {
  const [touchStartTime, setTouchStartTime] = useState<number>(0);
  const [touchedCell, setTouchedCell] = useState<{row: number, col: number} | null>(null);
  const touchTimerRef = useRef<NodeJS.Timeout>();
  const longPressThreshold = 350; // 350ms 长按阈值
  
  // 清理定时器
  useEffect(() => {
    return () => {
      if (touchTimerRef.current) {
        clearTimeout(touchTimerRef.current);
      }
    };
  }, []);
  
  // 处理触摸开始
  const handleTouchStart = useCallback((row: number, col: number, e: React.TouchEvent) => {
    e.preventDefault();
    const startTime = Date.now();
    setTouchStartTime(startTime);
    setTouchedCell({row, col});
    
    // 设置长按定时器
    touchTimerRef.current = setTimeout(() => {
      onCellRightClick(row, col);
      setTouchedCell(null);
      // 触觉反馈
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    }, longPressThreshold);
  }, [onCellRightClick, longPressThreshold]);
  
  // 处理触摸结束
  const handleTouchEnd = useCallback((row: number, col: number, e: React.TouchEvent) => {
    e.preventDefault();
    const endTime = Date.now();
    const touchDuration = endTime - touchStartTime;
    
    // 清除长按定时器
    if (touchTimerRef.current) {
      clearTimeout(touchTimerRef.current);
    }
    
    setTouchedCell(null);
    
    // 如果是短按，触发左键点击
    if (touchDuration < longPressThreshold) {
      if (flagMode) {
        onCellRightClick(row, col);
      } else {
        onCellClick(row, col);
      }
    }
  }, [touchStartTime, onCellClick, onCellRightClick, flagMode, longPressThreshold]);
  
  // 处理鼠标点击
  const handleMouseClick = useCallback((row: number, col: number, e: React.MouseEvent) => {
    e.preventDefault();
    console.log('🖱️ Mouse click:', row, col, 'flagMode:', flagMode);
    if (flagMode) {
      onCellRightClick(row, col);
    } else {
      onCellClick(row, col);
    }
  }, [onCellClick, onCellRightClick, flagMode]);
  
  // 处理右键菜单
  const handleContextMenu = useCallback((e: React.MouseEvent, row: number, col: number) => {
    e.preventDefault();
    onCellRightClick(row, col);
  }, [onCellRightClick]);
  
  if (board.length === 0) {
    return (
      <div style={{ 
        color: '#7f8c8d', 
        textAlign: 'center', 
        padding: '40px',
        background: 'linear-gradient(145deg, #ecf0f1, #d5dbdb)',
        borderRadius: '12px',
        boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.1)',
        cursor: 'pointer'
      }}
      onClick={() => {
        console.log('🎮 Empty board clicked, initializing...');
        // 触发一个默认点击来初始化游戏
        onCellClick(0, 0);
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '10px' }}>🎮</div>
        <div>点击这里开始游戏</div>
      </div>
    );
  }
  
  const boardWidth = board[0]?.length || 0;
  const boardHeight = board.length;
  const cellSize = boardWidth > 20 ? 24 : boardWidth > 16 ? 28 : 32;
  const isGameOver = gameStatus === 'won' || gameStatus === 'lost';
  
  return (
    <BoardContainer $flagMode={flagMode} $boardWidth={boardWidth}>
      <BoardGrid $columns={boardWidth} $cellSize={cellSize}>
        {board.map((row, rowIndex) => 
          row.map((cell, colIndex) => (
            <CellButton
              key={`${rowIndex}-${colIndex}`}
              $isRevealed={cell.isRevealed}
              $isMine={cell.isMine}
              $isFlagged={cell.isFlagged}
              $neighborCount={cell.neighborMines}
              $cellSize={cellSize}
              $gameOver={isGameOver}
              onTouchStart={(e) => handleTouchStart(rowIndex, colIndex, e)}
              onTouchEnd={(e) => handleTouchEnd(rowIndex, colIndex, e)}
              onClick={(e) => handleMouseClick(rowIndex, colIndex, e)}
              onContextMenu={(e) => handleContextMenu(e, rowIndex, colIndex)}
              disabled={isGameOver && !(cell.isRevealed && cell.isMine)}
              style={{
                transform: touchedCell?.row === rowIndex && touchedCell?.col === colIndex 
                  ? 'scale(0.95)' : undefined
              }}
            >
              {getCellContent(cell)}
            </CellButton>
          ))
        )}
      </BoardGrid>
    </BoardContainer>
  );
};

export default ModernGameBoard;