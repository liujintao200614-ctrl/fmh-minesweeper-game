import React, { useState } from 'react';
import styled from 'styled-components';

// Step 1: 先导入类型定义
import { GameState, GameConfig } from '@/types/game';

// Step 2: 先导入工具函数
import {
  createEmptyBoard,
  calculateScore
} from '@/utils/gameLogic';

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

const TestSection = styled.div`
  background: #f0f0f0;
  padding: 15px;
  border: 2px inset #c0c0c0;
  margin-bottom: 20px;
  text-align: center;
`;

const defaultGameConfig: GameConfig = {
  width: 10,
  height: 10,
  mines: 15
};

export default function App() {
  console.log('🎯 App component rendering...');

  // 测试类型和工具函数是否正常
  const [gameConfig] = useState<GameConfig>(defaultGameConfig);
  const [gameState] = useState<GameState>({
    board: createEmptyBoard(gameConfig.width, gameConfig.height),
    gameStatus: 'waiting',
    mineCount: gameConfig.mines,
    flagCount: 0,
    timeElapsed: 0,
    score: 0
  });

  console.log('✅ Types and utils loaded successfully');
  console.log('Game board created:', gameState.board.length, 'x', gameState.board[0]?.length);

  return (
    <AppContainer>
      <GameContainer>
        <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>
          🎯 FMH Minesweeper - Step by Step Debug
        </h1>

        <TestSection>
          <h3>✅ Basic React Rendering Works</h3>
          <p>Game Config: {gameConfig.width} x {gameConfig.height} with {gameConfig.mines} mines</p>
          <p>Game Status: {gameState.gameStatus}</p>
          <p>Board Size: {gameState.board.length} rows</p>
          <p>Current Score: {gameState.score}</p>
        </TestSection>

        <TestSection>
          <h3>🔧 Debug Information</h3>
          <p>Types imported: ✅</p>
          <p>Game logic utils imported: ✅</p>
          <p>Styled components working: ✅</p>
          <p>State management working: ✅</p>
        </TestSection>

        <TestSection>
          <h3>📝 Next Steps</h3>
          <p>1. Add Web3 hooks ⏳</p>
          <p>2. Add game components ⏳</p>
          <p>3. Add game logic ⏳</p>
          <p>4. Test full functionality ⏳</p>
        </TestSection>
      </GameContainer>
    </AppContainer>
  );
}