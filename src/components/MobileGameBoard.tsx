import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled, { css } from 'styled-components';
import { TouchFriendlyCell, GameBoardContainer, media } from '@/styles/responsive';
import { useAudio } from '@/utils/audioManager';
import { Cell } from '@/types/game';

interface MobileGameBoardProps {
  board: Cell[][];
  onCellClick: (row: number, col: number) => void;
  onCellRightClick: (row: number, col: number) => void;
  gameOver: boolean;
  won: boolean;
}

const MobileBoardContainer = styled(GameBoardContainer)`
  position: relative;
  touch-action: none; /* 防止默认的触摸行为 */
  
  ${media.mobile(css`
    /* 在移动端允许水平滚动 */
    overflow-x: auto;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    max-width: 100vw;
    max-height: 70vh;
  `)}
`;

const BoardGrid = styled.div<{ $columns: number; $cellSize: number }>`
  display: grid;
  grid-template-columns: repeat(${props => props.$columns}, ${props => props.$cellSize}px);
  gap: 1px;
  background: #808080;
  border: 3px inset #c0c0c0;
  padding: 3px;
  
  ${media.mobile(css`
    /* 在小屏幕上确保最小触摸目标 */
    grid-template-columns: repeat(${props => props.$columns}, minmax(48px, ${props => props.$cellSize}px));
  `)}
`;

const MobileCell = styled(TouchFriendlyCell)<{
  $neighborMines: number;
  $isRevealed: boolean;
  $isMine: boolean;
  $isFlagged: boolean;
}>`
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  
  color: ${props => {
    if (!props.$isRevealed) return 'transparent';
    if (props.$isMine) return '#fff';
    
    // 数字颜色
    const colors = ['', '#0000ff', '#008000', '#ff0000', '#800080', '#800000', '#008080', '#000000', '#808080'];
    return colors[props.$neighborMines] || '#000000';
  }};

  /* 长按效果 */
  &:active {
    transform: scale(0.95);
    transition: transform 0.1s ease;
  }

  /* 旗帜和地雷图标 */
  &::before {
    content: ${props => {
      if (props.$isFlagged) return "'🚩'";
      if (props.$isRevealed && props.$isMine) return "'💣'";
      if (props.$isRevealed && props.$neighborMines > 0) return `'${props.$neighborMines}'`;
      return "''";
    }};
    font-size: 16px;
    
    ${media.mobile(css`
      font-size: 20px;
    `)}
  }
`;

const TouchIndicator = styled.div<{ $visible: boolean }>`
  position: absolute;
  top: 10px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 14px;
  opacity: ${props => props.$visible ? 1 : 0};
  transition: opacity 0.3s ease;
  pointer-events: none;
  z-index: 10;

  ${media.mobile(css`
    top: 5px;
    font-size: 12px;
    padding: 6px 12px;
  `)}
`;

const GestureInstructions = styled.div`
  position: absolute;
  bottom: 10px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255, 255, 255, 0.9);
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 12px;
  text-align: center;
  color: #666;
  max-width: 80%;

  ${media.tablet(css`
    bottom: 5px;
    font-size: 11px;
  `)}

  ${media.mobile(css`
    position: static;
    transform: none;
    margin-top: 10px;
    max-width: 100%;
  `)}
`;

export default function MobileGameBoard({
  board,
  onCellClick,
  onCellRightClick,
  gameOver,
  won
}: MobileGameBoardProps) {
  const [touchIndicator, setTouchIndicator] = useState('');
  const [showInstructions, setShowInstructions] = useState(true);
  const touchStartTime = useRef<number>(0);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  
  // 音效系统
  const { playSound, playWinSequence, playExplosionSequence, preloadSounds } = useAudio();

  useEffect(() => {
    // 检测是否为移动设备
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768 || 'ontouchstart' in window);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    // 预加载音效
    preloadSounds();
    
    // 5秒后隐藏说明
    const timer = setTimeout(() => setShowInstructions(false), 5000);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      clearTimeout(timer);
    };
  }, [preloadSounds]);

  const calculateCellSize = useCallback(() => {
    const screenWidth = window.innerWidth;
    const maxBoardWidth = Math.min(screenWidth - 40, 500); // 留40px边距
    const cellSize = Math.floor(maxBoardWidth / board[0]?.length || 1);
    
    // 确保最小触摸目标大小
    return Math.max(cellSize, isMobile ? 48 : 32);
  }, [board, isMobile]);

  const handleTouchStart = useCallback((row: number, col: number, event: React.TouchEvent) => {
    event.preventDefault();
    touchStartTime.current = Date.now();
    
    // 设置长按定时器
    longPressTimer.current = setTimeout(() => {
      // 长按 = 右键点击 (标记/取消标记)
      onCellRightClick(row, col);
      
      // 播放标记音效
      const cell = board[row]?.[col];
      if (cell) {
        playSound(cell.isFlagged ? 'unflag' : 'flag');
      }
      
      setTouchIndicator('标记/取消标记');
      setTimeout(() => setTouchIndicator(''), 1000);
      
      // 触觉反馈
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    }, 500); // 500ms长按
  }, [onCellRightClick, board, playSound]);

  const handleTouchEnd = useCallback((row: number, col: number, event: React.TouchEvent) => {
    event.preventDefault();
    const touchDuration = Date.now() - touchStartTime.current;
    
    // 清除长按定时器
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    
    // 如果是短按（小于500ms），执行普通点击
    if (touchDuration < 500) {
      onCellClick(row, col);
      
      // 播放点击音效
      const cell = board[row]?.[col];
      if (cell && !cell.isRevealed) {
        if (cell.isMine) {
          playExplosionSequence();
        } else {
          playSound('reveal');
        }
      }
      
      setTouchIndicator('揭开');
      setTimeout(() => setTouchIndicator(''), 500);
    }
  }, [onCellClick, board, playSound, playExplosionSequence]);

  const handleMouseClick = useCallback((row: number, col: number, event: React.MouseEvent) => {
    if (isMobile) return; // 移动端使用触摸事件
    
    event.preventDefault();
    if (event.button === 0) { // 左键
      onCellClick(row, col);
      
      // 播放点击音效
      const cell = board[row]?.[col];
      if (cell && !cell.isRevealed) {
        if (cell.isMine) {
          playExplosionSequence();
        } else {
          playSound('reveal');
        }
      }
    } else if (event.button === 2) { // 右键
      onCellRightClick(row, col);
      
      // 播放标记音效
      const cell = board[row]?.[col];
      if (cell) {
        playSound(cell.isFlagged ? 'unflag' : 'flag');
      }
    }
  }, [isMobile, onCellClick, onCellRightClick, board, playSound, playExplosionSequence]);

  // 游戏结束音效
  useEffect(() => {
    if (won) {
      playWinSequence();
    }
  }, [won, playWinSequence]);

  const cellSize = calculateCellSize();

  return (
    <MobileBoardContainer>
      <TouchIndicator $visible={!!touchIndicator}>
        {touchIndicator}
      </TouchIndicator>
      
      <BoardGrid $columns={board[0]?.length || 0} $cellSize={cellSize}>
        {board.map((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <MobileCell
              key={`${rowIndex}-${colIndex}`}
              $neighborMines={cell.neighborMines}
              $isRevealed={cell.isRevealed}
              $isMine={cell.isMine}
              $isFlagged={cell.isFlagged}
              $size={cellSize}
              onTouchStart={isMobile ? (e) => handleTouchStart(rowIndex, colIndex, e) : undefined}
              onTouchEnd={isMobile ? (e) => handleTouchEnd(rowIndex, colIndex, e) : undefined}
              onMouseDown={!isMobile ? (e) => handleMouseClick(rowIndex, colIndex, e) : undefined}
              onContextMenu={(e) => e.preventDefault()} // 禁用右键菜单
              disabled={gameOver || cell.isRevealed}
            />
          ))
        )}
      </BoardGrid>
      
      {showInstructions && isMobile && (
        <GestureInstructions>
          💡 轻触揭开格子，长按标记地雷
        </GestureInstructions>
      )}
    </MobileBoardContainer>
  );
}