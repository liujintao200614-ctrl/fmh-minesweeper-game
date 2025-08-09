import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import GameBoard from '@/components/GameBoard';
import GameHeader from '@/components/GameHeader';
import Leaderboard from '@/components/Leaderboard';
import ThemeSelector from '@/components/ThemeSelector';
import { useWeb3 } from '@/hooks/useWeb3';
import { useGameContract } from '@/hooks/useGameContract';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useGameHistory } from '@/hooks/useGameHistory';
import { GameState, GameConfig } from '@/types/game';
import {
  createEmptyBoard,
  placeMines,
  revealCell,
  toggleFlag,
  checkWinCondition,
  calculateScore,
  revealAllMines,
  markTriggeredMine
} from '@/utils/gameLogic';
import { ColorTheme, DEFAULT_THEMES } from '@/types/game';

// 现代化的样式设计
const AppContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
`;

const Header = styled.header`
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  padding: 1rem 0;
  position: sticky;
  top: 0;
  z-index: 100;
`;

const HeaderContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
`;

const Logo = styled.h1`
  font-size: 1.8rem;
  font-weight: 700;
  background: linear-gradient(45deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0;
`;

const WalletSection = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
`;

const WalletButton = styled.button<{ variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  
  ${props => props.variant === 'primary' && `
    background: linear-gradient(45deg, #667eea, #764ba2);
    color: white;
    &:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4); }
  `}
  
  ${props => props.variant === 'secondary' && `
    background: rgba(102, 126, 234, 0.1);
    color: #667eea;
    border: 1px solid rgba(102, 126, 234, 0.3);
    &:hover { background: rgba(102, 126, 234, 0.2); }
  `}
  
  ${props => props.variant === 'danger' && `
    background: rgba(255, 107, 107, 0.1);
    color: #ff6b6b;
    border: 1px solid rgba(255, 107, 107, 0.3);
    &:hover { background: rgba(255, 107, 107, 0.2); }
  `}
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none !important;
  }
`;

const WalletInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #666;
`;

const MainContent = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1rem;
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 2rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1rem;
    padding: 1rem;
  }
`;

const GameArea = styled.div`
  background: white;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  overflow: hidden;
`;

const GameContent = styled.div`
  padding: 1.5rem;
`;

const Sidebar = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  
  @media (max-width: 768px) {
    order: -1;
  }
`;

const Card = styled.div`
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
  overflow: hidden;
`;

const CardHeader = styled.div`
  padding: 1rem 1.5rem;
  background: linear-gradient(45deg, #667eea, #764ba2);
  color: white;
  font-weight: 600;
  font-size: 0.875rem;
`;

const CardContent = styled.div`
  padding: 1.5rem;
`;

const GameSettings = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const SettingRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
`;

const Label = styled.label`
  font-weight: 500;
  color: #333;
  font-size: 0.875rem;
`;

const PresetButtons = styled.div`
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const PresetButton = styled.button<{ active?: boolean }>`
  padding: 0.5rem 1rem;
  border: 1px solid ${props => props.active ? '#667eea' : '#ddd'};
  background: ${props => props.active ? '#667eea' : 'white'};
  color: ${props => props.active ? 'white' : '#666'};
  border-radius: 6px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: #667eea;
    color: ${props => props.active ? 'white' : '#667eea'};
  }
`;

const RangeInput = styled.input`
  width: 80px;
  padding: 0.25rem 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.875rem;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
`;

const StatItem = styled.div`
  text-align: center;
  
  .label {
    font-size: 0.75rem;
    color: #666;
    margin-bottom: 0.25rem;
  }
  
  .value {
    font-size: 1.5rem;
    font-weight: 700;
    color: #333;
    background: linear-gradient(45deg, #667eea, #764ba2);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
`;

const NetworkStatus = styled.div<{ connected?: boolean }>`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  color: ${props => props.connected ? '#4CAF50' : '#ff6b6b'};
  
  &::before {
    content: '';
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: ${props => props.connected ? '#4CAF50' : '#ff6b6b'};
  }
`;

const WinMessage = styled.div`
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: linear-gradient(135deg, #4CAF50, #45a049);
  color: white;
  padding: 2rem;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(76, 175, 80, 0.4);
  text-align: center;
  z-index: 1000;
  min-width: 300px;
  
  h2 {
    font-size: 1.5rem;
    margin-bottom: 1rem;
    font-weight: 700;
  }
  
  p {
    margin-bottom: 1.5rem;
    opacity: 0.9;
  }
  
  .buttons {
    display: flex;
    gap: 1rem;
    justify-content: center;
    flex-wrap: wrap;
  }
`;

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 999;
`;

const GameModeToggle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  
  .toggle {
    position: relative;
    width: 48px;
    height: 24px;
    background: ${props => props.theme?.web3Mode ? '#667eea' : '#ccc'};
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.3s ease;
    
    &::after {
      content: '';
      position: absolute;
      top: 2px;
      left: ${props => props.theme?.web3Mode ? '26px' : '2px'};
      width: 20px;
      height: 20px;
      background: white;
      border-radius: 50%;
      transition: all 0.3s ease;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
    }
  }
`;

const defaultGameConfig: GameConfig = {
  width: 16,
  height: 16,
  mines: 40
};

const presets = {
  easy: { width: 9, height: 9, mines: 10 },
  medium: { width: 16, height: 16, mines: 40 },
  hard: { width: 30, height: 16, mines: 99 }
};

export default function ModernMinesweeper() {
  const web3 = useWeb3();
  const gameContract = useGameContract(web3.signer, web3.account);
  const userProfile = useUserProfile(web3.account);
  const gameHistory = useGameHistory();
  
  const [mounted, setMounted] = useState(false);
  const [gameConfig, setGameConfig] = useState<GameConfig>(defaultGameConfig);
  const [activePreset, setActivePreset] = useState<keyof typeof presets>('medium');
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
  const [contractGameId, setContractGameId] = useState<number | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [isSubmittingScore, setIsSubmittingScore] = useState(false);
  const [flagMode, setFlagMode] = useState(false);
  const [localGameMode, setLocalGameMode] = useState(false); // 默认Web3模式
  const [canClaimReward, setCanClaimReward] = useState(false);
  const [isClaimingReward, setIsClaimingReward] = useState(false);
  const [showWinMessage, setShowWinMessage] = useState(false);
  const [currentTheme, setCurrentTheme] = useState<ColorTheme>(DEFAULT_THEMES[0]);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  
  // 加载保存的主题设置
  useEffect(() => {
    const savedTheme = localStorage.getItem('minesweeper-theme');
    if (savedTheme) {
      try {
        const theme = JSON.parse(savedTheme);
        const foundTheme = DEFAULT_THEMES.find(t => t.id === theme.id);
        if (foundTheme) {
          setCurrentTheme(foundTheme);
        }
      } catch (error) {
        console.error('加载主题设置失败:', error);
      }
    }
  }, []);
  
  // 保存主题设置
  const handleThemeChange = (theme: ColorTheme) => {
    setCurrentTheme(theme);
    localStorage.setItem('minesweeper-theme', JSON.stringify(theme));
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  // Timer effect with real-time score calculation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (gameState.gameStatus === 'playing' && gameStartTime) {
      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - gameStartTime) / 1000);
        const currentScore = calculateScore(gameConfig, elapsed, gameState.flagCount);
        setGameState(prev => ({ 
          ...prev, 
          timeElapsed: elapsed,
          score: currentScore
        }));
      }, 1000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [gameState.gameStatus, gameStartTime, gameState.flagCount, gameConfig]);

  const startNewGame = useCallback(async () => {
    const newBoard = createEmptyBoard(gameConfig.width, gameConfig.height);
    
    setGameState({
      board: newBoard,
      gameStatus: 'waiting',
      mineCount: gameConfig.mines,  
      flagCount: 0,
      timeElapsed: 0,
      score: 0,
      gameId: undefined
    });
    
    setFirstClick(true);
    setGameStartTime(null);
    setContractGameId(null);
    setCanClaimReward(false);
    setShowWinMessage(false);
    setIsSubmittingScore(false);
    
    // 如果是Web3模式且已连接钱包，启动链上游戏
    if (!localGameMode && web3.isConnected && gameContract.contractsReady) {
      setIsSubmittingScore(true);
      try {
        console.log('🚀 正在启动链上游戏...', gameConfig);
        const gameId = await gameContract.startGame(gameConfig.width, gameConfig.height, gameConfig.mines);
        if (gameId !== null) {
          setContractGameId(gameId);
          console.log('✅ 链上游戏启动成功，游戏ID:', gameId);
        } else {
          console.log('⚠️ 链上游戏启动失败，切换到本地模式');
          setLocalGameMode(true);
        }
      } catch (error) {
        console.error('启动链上游戏失败:', error);
        setLocalGameMode(true);
      } finally {
        setIsSubmittingScore(false);
      }
    }
  }, [gameConfig, localGameMode, web3.isConnected, gameContract]);

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
      const startTime = Date.now();
      setGameStartTime(startTime);
      setGameState(prev => ({ ...prev, gameStatus: 'playing', board: newBoard }));
      
      console.log('🎮 游戏开始！', {
        mode: localGameMode ? 'Local' : 'Web3',
        contractGameId,
        config: gameConfig
      });
    }

    newBoard = revealCell(newBoard, row, col);
    
    if (newBoard[row][col].isMine) {
      // 标记触发的地雷
      newBoard = markTriggeredMine(newBoard, row, col);
      // 显示所有地雷
      newBoard = revealAllMines(newBoard);
      
      setGameState(prev => ({ 
        ...prev, 
        board: newBoard, 
        gameStatus: 'lost',
        showAllMines: true
      }));
      
      // 如果是Web3模式且已连接钱包，完成链上游戏
      if (!localGameMode && web3.isConnected && contractGameId !== null && gameContract.contractsReady) {
        const finalScore = calculateScore(gameConfig, gameState.timeElapsed, gameState.flagCount);
        handleGameComplete(contractGameId, false, finalScore);
      }
      return;
    }

    const isWon = checkWinCondition(newBoard);
    if (isWon) {
      // 获胜时也显示所有地雷
      newBoard = revealAllMines(newBoard);
      
      const finalScore = calculateScore(gameConfig, gameState.timeElapsed, gameState.flagCount);
      setGameState(prev => ({ 
        ...prev, 
        board: newBoard, 
        gameStatus: 'won',
        score: finalScore,
        showAllMines: true
      }));
      
      setShowWinMessage(true);
      
      // 如果是Web3模式且已连接钱包，完成链上游戏
      if (!localGameMode && web3.isConnected && contractGameId !== null && gameContract.contractsReady) {
        handleGameComplete(contractGameId, true, finalScore);
      }
    } else {
      setGameState(prev => ({ ...prev, board: newBoard }));
    }
  }, [gameState.board, gameState.gameStatus, gameState.timeElapsed, gameState.flagCount, firstClick, gameConfig, flagMode]);

  const handleCellRightClick = useCallback((row: number, col: number) => {
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

  // 处理游戏完成和奖励申请
  const handleGameComplete = useCallback(async (gameId: number, won: boolean, score: number) => {
    if (!gameContract.contractsReady) {
      console.log('⚠️ 合约未准备好，跳过链上操作');
      return;
    }

    setIsSubmittingScore(true);
    try {
      console.log('🔄 正在完成链上游戏...', { gameId, won, score });
      const success = await gameContract.completeGame(gameId, won, score);
      if (success && won) {
        setCanClaimReward(true);
        console.log('✅ 游戏完成，可以申请奖励！');
      }
    } catch (error) {
      console.error('完成游戏失败:', error);
    } finally {
      setIsSubmittingScore(false);
    }
  }, [gameContract]);

  // 申请奖励
  const handleClaimReward = useCallback(async () => {
    if (!contractGameId || !gameContract.contractsReady) {
      console.log('⚠️ 没有游戏ID或合约未准备好');
      return;
    }

    setIsClaimingReward(true);
    try {
      console.log('💰 正在申请奖励...', contractGameId);
      const success = await gameContract.claimReward(contractGameId);
      if (success) {
        setCanClaimReward(false);
        setShowWinMessage(false);
        console.log('✅ 奖励申请成功！');
        
        // 刷新用户统计
        await gameContract.loadGameStats();
      }
    } catch (error) {
      console.error('申请奖励失败:', error);
    } finally {
      setIsClaimingReward(false);
    }
  }, [contractGameId, gameContract]);

  const setPreset = (preset: keyof typeof presets) => {
    const config = presets[preset];
    setGameConfig(config);
    setActivePreset(preset);
    
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
    setContractGameId(null);
    setCanClaimReward(false);
    setShowWinMessage(false);
  };

  if (!mounted) {
    return <div>Loading...</div>;
  }

  return (
    <AppContainer>
      <Header>
        <HeaderContent>
          <Logo>🎮 FMH 扫雷</Logo>
          
          <WalletSection>
            <GameModeToggle theme={{ web3Mode: !localGameMode }}>
              <span>Web3</span>
              <div 
                className="toggle" 
                onClick={() => setLocalGameMode(!localGameMode)}
                title={localGameMode ? '切换到Web3模式' : '切换到本地模式'}
              />
            </GameModeToggle>
            
            {!localGameMode && (
              <>
                <NetworkStatus connected={web3.isOnCorrectNetwork}>
                  {web3.isOnCorrectNetwork ? 'Monad 测试网' : '网络未连接'}
                </NetworkStatus>
                
                {!web3.isConnected ? (
                  <WalletButton 
                    variant="primary" 
                    onClick={web3.connectWallet}
                    disabled={web3.isLoading}
                  >
                    {web3.isLoading ? '连接中...' : '🔗 连接钱包'}
                  </WalletButton>
                ) : (
                  <>
                    <WalletInfo>
                      <span>💳 {web3.account?.slice(0, 6)}...{web3.account?.slice(-4)}</span>
                    </WalletInfo>
                    <WalletButton variant="secondary" onClick={web3.disconnect}>
                      断开连接
                    </WalletButton>
                  </>
                )}
              </>
            )}
          </WalletSection>
        </HeaderContent>
      </Header>

      <MainContent>
        <GameArea>
          <GameContent>
            <GameHeader
              mineCount={gameState.mineCount}
              flagCount={gameState.flagCount}
              timeElapsed={gameState.timeElapsed}
              gameStatus={gameState.gameStatus}
              score={gameState.score}
              onNewGame={startNewGame}
              onClaimReward={canClaimReward ? handleClaimReward : undefined}
              canClaimReward={canClaimReward && !isClaimingReward}
              onShowLeaderboard={() => setShowLeaderboard(true)}
              flagMode={flagMode}
              onToggleFlagMode={() => setFlagMode(!flagMode)}
            />

            <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
              <GameBoard
                key={`${gameConfig.width}-${gameConfig.height}-${gameState.mineCount}-${gameState.gameStatus}`}
                board={gameState.board}
                onCellClick={handleCellClick}
                onCellRightClick={handleCellRightClick}
                gameStatus={gameState.gameStatus}
                flagMode={flagMode}
                colorTheme={currentTheme}
                showAllMines={gameState.showAllMines}
              />
            </div>
          </GameContent>
        </GameArea>

        <Sidebar>
          <Card>
            <CardHeader>游戏设置</CardHeader>
            <CardContent>
              <GameSettings>
                <div>
                  <Label>难度预设</Label>
                  <PresetButtons>
                    <PresetButton 
                      active={activePreset === 'easy'}
                      onClick={() => setPreset('easy')}
                    >
                      简单
                    </PresetButton>
                    <PresetButton 
                      active={activePreset === 'medium'}
                      onClick={() => setPreset('medium')}
                    >
                      中等
                    </PresetButton>
                    <PresetButton 
                      active={activePreset === 'hard'}
                      onClick={() => setPreset('hard')}
                    >
                      困难
                    </PresetButton>
                  </PresetButtons>
                </div>
                
                <SettingRow>
                  <Label>主题设置</Label>
                  <WalletButton 
                    variant="secondary"
                    onClick={() => setShowThemeSelector(true)}
                    style={{ padding: '0.5rem 1rem', fontSize: '0.75rem' }}
                  >
                    🎨 {currentTheme.name}
                  </WalletButton>
                </SettingRow>

                <SettingRow>
                  <Label>宽度</Label>
                  <RangeInput 
                    type="number" 
                    min="5" 
                    max="30" 
                    value={gameConfig.width}
                    onChange={(e) => setGameConfig(prev => ({ ...prev, width: parseInt(e.target.value) || 5 }))}
                  />
                </SettingRow>

                <SettingRow>
                  <Label>高度</Label>
                  <RangeInput 
                    type="number" 
                    min="5" 
                    max="30" 
                    value={gameConfig.height}
                    onChange={(e) => setGameConfig(prev => ({ ...prev, height: parseInt(e.target.value) || 5 }))}
                  />
                </SettingRow>

                <SettingRow>
                  <Label>地雷数</Label>
                  <RangeInput 
                    type="number" 
                    min="1" 
                    max={Math.floor(gameConfig.width * gameConfig.height * 0.8)}
                    value={gameConfig.mines}
                    onChange={(e) => setGameConfig(prev => ({ ...prev, mines: parseInt(e.target.value) || 1 }))}
                  />
                </SettingRow>
              </GameSettings>
            </CardContent>
          </Card>

          {!localGameMode && web3.isConnected && userProfile.profile && (
            <Card>
              <CardHeader>游戏统计</CardHeader>
              <CardContent>
                <StatsGrid>
                  <StatItem>
                    <div className="label">总胜利</div>
                    <div className="value">{userProfile.stats?.totalWins || 0}</div>
                  </StatItem>
                  <StatItem>
                    <div className="label">最高分</div>
                    <div className="value">{userProfile.stats?.bestScore || 0}</div>
                  </StatItem>
                  <StatItem>
                    <div className="label">FMH 代币</div>
                    <div className="value">{parseFloat(userProfile.stats?.totalRewards || '0').toFixed(1)}</div>
                  </StatItem>
                  <StatItem>
                    <div className="label">成就数</div>
                    <div className="value">{userProfile.stats?.achievementCount || 0}</div>
                  </StatItem>
                </StatsGrid>
              </CardContent>
            </Card>
          )}
          
          {localGameMode && (
            <Card>
              <CardHeader>本地模式</CardHeader>
              <CardContent>
                <StatsGrid>
                  <StatItem>
                    <div className="label">当前分数</div>
                    <div className="value">{gameState.score}</div>
                  </StatItem>
                  <StatItem>
                    <div className="label">游戏状态</div>
                    <div className="value">{gameState.gameStatus === 'won' ? '胜利' : gameState.gameStatus === 'lost' ? '失败' : gameState.gameStatus === 'playing' ? '游戏中' : '等待'}</div>
                  </StatItem>
                </StatsGrid>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>排行榜</CardHeader>
            <CardContent>
              <WalletButton 
                variant="secondary" 
                onClick={() => setShowLeaderboard(true)}
                style={{ width: '100%' }}
              >
                📊 查看排行榜
              </WalletButton>
            </CardContent>
          </Card>
        </Sidebar>
      </MainContent>
      
      <Leaderboard 
        isVisible={showLeaderboard} 
        onClose={() => setShowLeaderboard(false)} 
      />
      
      {showWinMessage && (
        <>
          <Overlay onClick={() => setShowWinMessage(false)} />
          <WinMessage>
            <h2>🎉 恭喜获胜！</h2>
            <p>
              您的分数: <strong>{gameState.score}</strong><br/>
              用时: <strong>{Math.floor(gameState.timeElapsed / 60)}:{(gameState.timeElapsed % 60).toString().padStart(2, '0')}</strong><br/>
              {!localGameMode && canClaimReward && '🎁 您可以申请 FMH 代币奖励！'}
            </p>
            <div className="buttons">
              {!localGameMode && canClaimReward && (
                <WalletButton 
                  variant="primary" 
                  onClick={handleClaimReward}
                  disabled={isClaimingReward}
                >
                  {isClaimingReward ? '申请中...' : '💰 申请奖励'}
                </WalletButton>
              )}
              <WalletButton variant="secondary" onClick={startNewGame}>
                🎮 新游戏
              </WalletButton>
              <WalletButton variant="outline" onClick={() => setShowWinMessage(false)}>
                关闭
              </WalletButton>
            </div>
          </WinMessage>
        </>
      )}
      
      <ThemeSelector
        currentTheme={currentTheme}
        onThemeChange={handleThemeChange}
        onClose={() => setShowThemeSelector(false)}
        isVisible={showThemeSelector}
      />
    </AppContainer>
  );
}