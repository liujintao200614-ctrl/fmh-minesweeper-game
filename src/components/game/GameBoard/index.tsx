import React from 'react';
import styled from 'styled-components';
import Cell from './Cell';
import { Cell as CellType } from '../../../types/game';
import { useTouchHandler } from './useTouchHandler';

interface GameBoardProps {
  board: CellType[][];
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
  
  /* 移动端优化 */
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  
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

const GameBoard: React.FC<GameBoardProps> = React.memo(({ 
  board, 
  onCellClick, 
  onCellRightClick, 
  gameStatus,
  flagMode = false
}) => {
  const {
    longPressCell,
    flaggedCell,
    handleTouchStart,
    handleTouchEnd,
    handleTouchMove,
    handleTouchCancel
  } = useTouchHandler(onCellRightClick);

  return (
    <BoardContainer $flagMode={flagMode}>
      {board.map((row, rowIndex) => (
        <BoardRow key={rowIndex}>
          {row.map((cell, colIndex) => (
            <Cell
              key={`${rowIndex}-${colIndex}`}
              cell={cell}
              row={rowIndex}
              col={colIndex}
              flagMode={flagMode}
              gameStatus={gameStatus}
              isLongPressing={longPressCell?.row === rowIndex && longPressCell?.col === colIndex}
              isFlagSuccess={flaggedCell?.row === rowIndex && flaggedCell?.col === colIndex}
              onCellClick={onCellClick}
              onCellRightClick={onCellRightClick}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              onTouchMove={handleTouchMove}
              onTouchCancel={handleTouchCancel}
            />
          ))}
        </BoardRow>
      ))}
    </BoardContainer>
  );
});

export default GameBoard;