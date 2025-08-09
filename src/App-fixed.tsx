import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';

// 基础类型和工具
import { GameState, GameConfig } from '@/types/game';
import { createEmptyBoard, placeMines, revealCell, toggleFlag, checkWinCondition, calculateScore } from '@/utils/gameLogic';

const AppContainer = styled.div`
  min-height: 100vh;
  background: #c0c0c0;
  padding: 20px;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
`;

const GameContainer = styled.div`
  max-width: 800px;
  margin: 0 auto;
  background: #c0c0c0;
  border: 2px inset #c0c0c0;
  padding: 20px;
`;

const WalletSection = styled.div`
  background: #f0f0f0;
  padding: 15px;
  border: 2px inset #c0c0c0;
  margin-bottom: 20px;
  text-align: center;
`;

const ConnectButton = styled.button`
  padding: 10px 20px;
  font-size: 16px;
  background: #4CAF50;
  color: white;
  border: 2px outset #4CAF50;
  cursor: pointer;
  border-radius: 4px;
  margin: 5px;

  &:hover {
    background: #45a049;
  }

  &:disabled {
    background: #cccccc;
    cursor: not-allowed;
  }
`;

const GameSettings = styled.div`
  background: #f0f0f0;
  padding: 15px;
  border: 2px inset #c0c0c0;
  margin-bottom: 20px;
`;

const SettingRow = styled.div`
  display: flex;
  align-items: center;
  margin: 10px 0;
  gap: 10px;
`;

const Label = styled.label`
  min-width: 80px;
  font-weight: bold;
`;

const Input = styled.input`
  padding: 5px;
  border: 2px inset #c0c0c0;
  width: 80px;
`;

const PresetButton = styled.button`
  padding: 8px 16px;
  margin: 5px;
  background: #e0e0e0;
  border: 2px outset #e0e0e0;
  cursor: pointer;

  &:hover {
    background: #d0d0d0;
  }

  &:active {
    border: 2px inset #e0e0e0;
  }
`;

const GameArea = styled.div`
  display: flex;
  justify-content: center;
  margin: 20px 0;
  padding: 20px;
  background: #f0f0f0;
  border: 2px inset #c0c0c0;
  border-radius: 8px;
`;

const GameBoard = styled.div<{ width: number; height: number }>`
  display: grid;
  grid-template-columns: repeat(${props => props.width}, 30px);
  grid-template-rows: repeat(${props => props.height}, 30px);
  gap: 1px;
  background: #c0c0c0;
  padding: 10px;
  border: 2px inset #c0c0c0;
`;

const Cell = styled.button<{ isRevealed: boolean; isMine: boolean; isFlagged: boolean }>`
  width: 30px;
  height: 30px;
  border: ${props => props.isRevealed ? '2px inset #c0c0c0' : '2px outset #c0c0c0'};
  background: ${props => {
    if (props.isFlagged) return '#ff9800';
    if (props.isRevealed) return props.isMine ? '#ff0000' : '#ffffff';
    return '#c0c0c0';
  }};
  font-size: 14px;
  font-weight: bold;
  cursor: ${props => props.isRevealed ? 'default' : 'pointer'};
  display: flex;
  align-items: center;
  justify-content: center;

  &:active {
    border: ${props => props.isRevealed ? '2px inset #c0c0c0' : '2px inset #c0c0c0'};
  }
`;

const GameHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  background: #f0f0f0;
  border: 2px inset #c0c0c0;
  margin-bottom: 20px;
`;

const GameInfo = styled.div`
  display: flex;
  gap: 20px;
  font-weight: bold;
`;

const defaultGameConfig: GameConfig = {
  width: 9,
  height: 9,
  mines: 10
};

const presets = {
  easy: { width: 9, height: 9, mines: 10 },
  medium: { width: 16, height: 16, mines: 40 },
  hard: { width: 30, height: 16, mines: 99 }
};

export default function App() {
  console.log('🎯 FMH Minesweeper App starting...');

  const [gameConfig, setGameConfig] = useState<GameConfig>(defaultGameConfig);
  const [gameState, setGameState] = useState<GameState>({
    board: createEmptyBoard(defaultGameConfig.width, defaultGameConfig.height),
    gameStatus: 'waiting',
    mineCount: defaultGameConfig.mines,
    flagCount: 0,
    timeElapsed: 0,
    score: 0
  });

  const [firstClick, setFirstClick] = useState(true);
  const [gameStartTime, setGameStartTime] = useState<number | null>(null);
  const [flagMode, setFlagMode] = useState(false);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (gameState.gameStatus === 'playing' && gameStartTime) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - gameStartTime) / 1000);
        setGameState(prev => ({ ...prev, timeElapsed: elapsed }));
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [gameState.gameStatus, gameStartTime]);

  const startNewGame = useCallback(() => {
    const newBoard = createEmptyBoard(gameConfig.width, gameConfig.height);
    setGameState({
      board: newBoard,
      gameStatus: 'waiting',
      mineCount: gameConfig.mines,
      flagCount: 0,
      timeElapsed: 0,
      score: 0
    });
    setFirstClick(true);
    setGameStartTime(null);
  }, [gameConfig]);

  const handleCellClick = useCallback((row: number, col: number) => {
    if (gameState.gameStatus === 'won' || gameState.gameStatus === 'lost') {
      return;
    }

    if (flagMode && !firstClick) {
      const result = toggleFlag(gameState.board, row, col, gameConfig.mines, gameState.flagCount);
      setGameState(prev => ({ 
        ...prev, 
        board: result.board, 
        flagCount: result.flagCount 
      }));
      return;
    }

    let newBoard = [...gameState.board];
    
    if (firstClick) {
      newBoard = placeMines(newBoard, gameConfig.mines, row, col);
      setFirstClick(false);
      setGameStartTime(Date.now());
      setGameState(prev => ({ ...prev, gameStatus: 'playing', board: newBoard }));
    }

    newBoard = revealCell(newBoard, row, col);
    
    if (newBoard[row][col].isMine) {
      setGameState(prev => ({ 
        ...prev, 
        board: newBoard, 
        gameStatus: 'lost' 
      }));
      return;
    }

    const isWon = checkWinCondition(newBoard);
    if (isWon) {
      const finalScore = calculateScore(gameConfig, gameState.timeElapsed, gameState.flagCount);
      setGameState(prev => ({ 
        ...prev, 
        board: newBoard, 
        gameStatus: 'won',
        score: finalScore
      }));
    } else {
      setGameState(prev => ({ ...prev, board: newBoard }));
    }
  }, [gameState, firstClick, gameConfig, flagMode]);

  const handleCellRightClick = useCallback((e: React.MouseEvent, row: number, col: number) => {
    e.preventDefault();
    if (gameState.gameStatus === 'won' || gameState.gameStatus === 'lost' || firstClick) {
      return;
    }

    const result = toggleFlag(gameState.board, row, col, gameConfig.mines, gameState.flagCount);
    setGameState(prev => ({ 
      ...prev, 
      board: result.board, 
      flagCount: result.flagCount 
    }));
  }, [gameState.board, gameState.gameStatus, gameState.flagCount, firstClick, gameConfig.mines]);

  const setPreset = (preset: keyof typeof presets) => {
    const config = presets[preset];
    setGameConfig(config);
    
    const newBoard = createEmptyBoard(config.width, config.height);
    setGameState({
      board: newBoard,
      gameStatus: 'waiting',
      mineCount: config.mines,
      flagCount: 0,
      timeElapsed: 0,
      score: 0
    });
    setFirstClick(true);
    setGameStartTime(null);
  };

  const getCellContent = (cell: any) => {
    if (cell.isFlagged) return '🚩';
    if (!cell.isRevealed) return '';
    if (cell.isMine) return '💣';
    if (cell.neighboringMines > 0) return cell.neighboringMines;
    return '';
  };

  const getGameStatus = () => {
    switch (gameState.gameStatus) {
      case 'playing': return '🎮 Playing';
      case 'won': return '🎉 You Won!';
      case 'lost': return '💥 Game Over';
      default: return '⏳ Ready';
    }
  };

  return (
    <AppContainer>
      <GameContainer>
        <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>
          🎯 FMH Minesweeper
        </h1>

        <WalletSection>
          <p>🔗 Web3 功能开发中...</p>
          <p>当前可以享受经典扫雷游戏！</p>
        </WalletSection>

        <GameSettings>
          <h3>Game Settings</h3>
          <div>
            <PresetButton onClick={() => setPreset('easy')}>Easy (9×9)</PresetButton>
            <PresetButton onClick={() => setPreset('medium')}>Medium (16×16)</PresetButton>
            <PresetButton onClick={() => setPreset('hard')}>Hard (30×16)</PresetButton>
          </div>
          
          <SettingRow>
            <Label>Width:</Label>
            <Input 
              type="number" 
              min="5" 
              max="30" 
              value={gameConfig.width}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                setGameConfig(prev => ({ ...prev, width: parseInt(e.target.value) || 5 }))}
            />
            <Label>Height:</Label>
            <Input 
              type="number" 
              min="5" 
              max="30" 
              value={gameConfig.height}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                setGameConfig(prev => ({ ...prev, height: parseInt(e.target.value) || 5 }))}
            />
            <Label>Mines:</Label>
            <Input 
              type="number" 
              min="1" 
              max={Math.floor(gameConfig.width * gameConfig.height * 0.8)}
              value={gameConfig.mines}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                setGameConfig(prev => ({ ...prev, mines: parseInt(e.target.value) || 1 }))}
            />
          </SettingRow>

          <SettingRow>
            <Label>Flag Mode:</Label>
            <PresetButton 
              onClick={() => setFlagMode(!flagMode)}
              style={{ background: flagMode ? '#ff9800' : '#4CAF50', color: 'white' }}
            >
              {flagMode ? '🚩 Flag Mode ON' : '🖱️ Click Mode'}
            </PresetButton>
          </SettingRow>
        </GameSettings>

        <GameHeader>
          <GameInfo>
            <div>💣 Mines: {gameState.mineCount - gameState.flagCount}</div>
            <div>⏱️ Time: {gameState.timeElapsed}s</div>
            <div>📊 Score: {gameState.score}</div>
          </GameInfo>
          <div>
            <ConnectButton onClick={startNewGame}>
              🎮 New Game
            </ConnectButton>
          </div>
        </GameHeader>

        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h2>{getGameStatus()}</h2>
        </div>

        <GameArea>
          <GameBoard width={gameConfig.width} height={gameConfig.height}>
            {gameState.board.map((row, rowIndex) =>
              row.map((cell, colIndex) => (
                <Cell
                  key={`${rowIndex}-${colIndex}`}
                  isRevealed={cell.isRevealed}
                  isMine={cell.isMine}
                  isFlagged={cell.isFlagged}
                  onClick={() => handleCellClick(rowIndex, colIndex)}
                  onContextMenu={(e) => handleCellRightClick(e, rowIndex, colIndex)}
                >
                  {getCellContent(cell)}
                </Cell>
              ))
            )}
          </GameBoard>
        </GameArea>

        {gameState.gameStatus === 'won' && (
          <div style={{ 
            textAlign: 'center', 
            padding: '20px', 
            background: '#4CAF50', 
            color: 'white',
            borderRadius: '8px',
            margin: '20px 0' 
          }}>
            <h3>🎉 恭喜胜利！</h3>
            <p>用时: {gameState.timeElapsed} 秒</p>
            <p>得分: {gameState.score} 分</p>
            <p>Web3 集成完成后，您将能够获得 FMH 代币奖励！</p>
          </div>
        )}
      </GameContainer>
    </AppContainer>
  );
}