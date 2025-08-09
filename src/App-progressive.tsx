import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';

// Step 1: 基础导入
import { GameState, GameConfig } from '@/types/game';
import { createEmptyBoard, calculateScore } from '@/utils/gameLogic';

// Step 2: 尝试导入 Web3 hooks
try {
  console.log('🔄 Attempting to import Web3 hooks...');
} catch (error) {
  console.error('❌ Error importing Web3 hooks:', error);
}

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

const ErrorSection = styled.div`
  background: #ff6b6b;
  color: white;
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
  console.log('🎯 Progressive App component rendering...');
  
  const [debugStep, setDebugStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  
  // 基础状态
  const [gameConfig] = useState<GameConfig>(defaultGameConfig);
  const [gameState] = useState<GameState>({
    board: createEmptyBoard(gameConfig.width, gameConfig.height),
    gameStatus: 'waiting',
    mineCount: gameConfig.mines,
    flagCount: 0,
    timeElapsed: 0,
    score: 0
  });

  useEffect(() => {
    console.log('✅ Progressive app mounted, debug step:', debugStep);
  }, [debugStep]);

  const nextStep = () => {
    try {
      setDebugStep(prev => prev + 1);
      console.log('🔄 Moving to step:', debugStep + 1);
    } catch (err) {
      console.error('❌ Error in nextStep:', err);
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const renderCurrentStep = () => {
    try {
      switch (debugStep) {
        case 1:
          return (
            <TestSection>
              <h3>✅ Step 1: Basic React + Styled Components</h3>
              <p>React rendering: ✅</p>
              <p>Styled components: ✅</p>
              <p>State management: ✅</p>
              <p>Game config: {gameConfig.width}x{gameConfig.height}</p>
              <button onClick={nextStep}>Next Step →</button>
            </TestSection>
          );
        
        case 2:
          return (
            <TestSection>
              <h3>🔄 Step 2: Import Web3 Hooks</h3>
              <p>Trying to import useWeb3...</p>
              <button onClick={() => {
                try {
                  import('@/hooks/useWeb3').then(() => {
                    console.log('✅ useWeb3 imported successfully');
                    setDebugStep(3);
                  }).catch(err => {
                    console.error('❌ Failed to import useWeb3:', err);
                    setError('Failed to import useWeb3: ' + err.message);
                  });
                } catch (err) {
                  console.error('❌ Error importing useWeb3:', err);
                  setError('Error importing useWeb3: ' + (err instanceof Error ? err.message : String(err)));
                }
              }}>
                Import useWeb3 →
              </button>
            </TestSection>
          );

        case 3:
          return (
            <TestSection>
              <h3>✅ Step 3: Web3 Hook Imported</h3>
              <p>useWeb3 hook: ✅</p>
              <button onClick={() => {
                try {
                  import('@/components/GameBoard').then(() => {
                    console.log('✅ GameBoard imported successfully');
                    setDebugStep(4);
                  }).catch(err => {
                    console.error('❌ Failed to import GameBoard:', err);
                    setError('Failed to import GameBoard: ' + err.message);
                  });
                } catch (err) {
                  console.error('❌ Error importing GameBoard:', err);
                  setError('Error importing GameBoard: ' + (err instanceof Error ? err.message : String(err)));
                }
              }}>
                Import GameBoard →
              </button>
            </TestSection>
          );

        case 4:
          return (
            <TestSection>
              <h3>🎉 Step 4: All Components Ready!</h3>
              <p>All imports successful!</p>
              <button onClick={() => {
                // 切换到完整版本
                window.location.reload();
              }}>
                Load Full App →
              </button>
            </TestSection>
          );

        default:
          return (
            <TestSection>
              <h3>🔚 Debug Complete</h3>
              <p>All steps passed successfully!</p>
            </TestSection>
          );
      }
    } catch (err) {
      console.error('❌ Error in renderCurrentStep:', err);
      return (
        <ErrorSection>
          <h3>❌ Error in Step {debugStep}</h3>
          <p>Error: {err instanceof Error ? err.message : String(err)}</p>
        </ErrorSection>
      );
    }
  };

  return (
    <AppContainer>
      <GameContainer>
        <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>
          🔧 FMH Minesweeper - Progressive Debug
        </h1>

        {error && (
          <ErrorSection>
            <h3>❌ Error Detected</h3>
            <p>{error}</p>
            <button onClick={() => setError(null)}>Clear Error</button>
          </ErrorSection>
        )}

        {renderCurrentStep()}

        <TestSection>
          <h3>📊 Debug Info</h3>
          <p>Current Step: {debugStep}</p>
          <p>Game Status: {gameState.gameStatus}</p>
          <p>Board Size: {gameState.board.length} x {gameState.board[0]?.length || 0}</p>
          <p>Console logs available for detailed debugging</p>
        </TestSection>
      </GameContainer>
    </AppContainer>
  );
}