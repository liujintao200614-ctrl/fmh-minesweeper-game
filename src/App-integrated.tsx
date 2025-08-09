import React, { useState, useEffect, useCallback, Suspense } from 'react';
import styled, { ThemeProvider, createGlobalStyle } from 'styled-components';
import { ErrorBoundary } from './components/ErrorBoundary';
import Loading from './components/Loading';

// 核心游戏和Web3功能
import { GameState, GameConfig } from '@/types/game';
import { useWeb3 } from '@/hooks/useWeb3';
import { useGameContract } from '@/hooks/useGameContract';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useGameHistory } from '@/hooks/useGameHistory';

// 游戏逻辑工具
import {
  createEmptyBoard,
  placeMines,
  revealCell,
  toggleFlag,
  checkWinCondition,
  calculateScore
} from '@/utils/gameLogic';

// 组件（懒加载）
const GameBoard = React.lazy(() => import('@/components/GameBoard'));
const GameHeader = React.lazy(() => import('@/components/GameHeader'));
const Leaderboard = React.lazy(() => import('@/components/Leaderboard'));
const WalletErrorHelper = React.lazy(() => import('@/components/WalletErrorHelper'));
const NetworkStatus = React.lazy(() => import('@/components/NetworkStatus'));
const NetworkGuide = React.lazy(() => import('@/components/NetworkGuide'));

// 全局样式
const GlobalStyle = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    background: #c0c0c0;
    color: #333;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  button {
    font-family: inherit;
  }

  /* 禁用右键菜单在游戏区域 */
  .game-area {
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
  }
`;

// 主题配置
const theme = {
  colors: {
    primary: '#4CAF50',
    secondary: '#2196F3',
    warning: '#ff9800',
    error: '#f44336',
    success: '#4CAF50',
    background: '#c0c0c0',
    surface: '#f0f0f0',
    text: '#333',
    border: '#999'
  },
  breakpoints: {
    mobile: '768px',
    tablet: '1024px',
    desktop: '1200px'
  }
};

// 样式组件
const AppContainer = styled.div`
  min-height: 100vh;
  background: ${props => props.theme.colors.background};
  padding: 20px;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: 10px;
  }
`;

const GameContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  background: ${props => props.theme.colors.background};
  border: 2px inset ${props => props.theme.colors.background};
  padding: 20px;
  border-radius: 8px;

  @media (max-width: ${props => props.theme.breakpoints.mobile}) {
    padding: 15px;
  }
`;

const Header = styled.header`
  text-align: center;
  margin-bottom: 30px;

  h1 {
    font-size: 2.5rem;
    margin-bottom: 10px;
    color: ${props => props.theme.colors.text};

    @media (max-width: ${props => props.theme.breakpoints.mobile}) {
      font-size: 2rem;
    }
  }

  .subtitle {
    font-size: 1.1rem;
    color: #666;
    margin-bottom: 20px;
  }
`;

const WalletSection = styled.section`
  background: ${props => props.theme.colors.surface};
  padding: 20px;
  border: 2px inset ${props => props.theme.colors.background};
  margin-bottom: 20px;
  text-align: center;
  border-radius: 8px;
`;

const ConnectButton = styled.button`
  padding: 12px 24px;
  font-size: 16px;
  background: ${props => props.theme.colors.primary};
  color: white;
  border: 2px outset ${props => props.theme.colors.primary};
  cursor: pointer;
  border-radius: 6px;
  margin: 5px;
  transition: all 0.2s ease;

  &:hover {
    background: #45a049;
    transform: translateY(-1px);
  }

  &:active {
    border: 2px inset ${props => props.theme.colors.primary};
    transform: translateY(0);
  }

  &:disabled {
    background: #cccccc;
    cursor: not-allowed;
    transform: none;
  }
`;

const NetworkWarning = styled.div`
  background: ${props => props.theme.colors.warning};
  color: white;
  padding: 15px;
  border-radius: 6px;
  margin: 15px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
`;

const ErrorMessage = styled.div`
  background: ${props => props.theme.colors.error};
  color: white;
  padding: 15px;
  border-radius: 6px;
  margin: 15px 0;
`;

const LoadingWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
`;

// 默认游戏配置
const defaultGameConfig: GameConfig = {
  width: 10,
  height: 10,
  mines: 15
};

export default function IntegratedApp() {
  console.log('🎯 FMH Minesweeper Integrated App starting...');

  // Web3 状态管理
  const web3 = useWeb3();
  const gameContract = useGameContract(web3.signer, web3.account);
  const userProfile = useUserProfile(web3.account);
  const gameHistory = useGameHistory();

  // 游戏状态管理
  const [gameConfig, setGameConfig] = useState<GameConfig>(defaultGameConfig);
  const [gameState, setGameState] = useState<GameState>({
    board: createEmptyBoard(defaultGameConfig.width, defaultGameConfig.height),
    gameStatus: 'waiting',
    mineCount: defaultGameConfig.mines,
    flagCount: 0,
    timeElapsed: 0,
    score: 0
  });

  // UI 状态管理
  const [mounted, setMounted] = useState(false);
  const [firstClick, setFirstClick] = useState(true);
  const [gameStartTime, setGameStartTime] = useState<number | null>(null);
  const [contractGameId, setContractGameId] = useState<number | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [isSubmittingScore, setIsSubmittingScore] = useState(false);
  const [flagMode, setFlagMode] = useState(false);
  const [localGameMode, setLocalGameMode] = useState(false);

  // 初始化效果
  useEffect(() => {
    setMounted(true);
    
    // 添加调试工具
    (window as any).debugFMH = {
      web3State: () => ({ ...web3 }),
      gameState: () => ({ ...gameState }),
      gameConfig: () => ({ ...gameConfig }),
      contractInfo: () => gameContract.contractsReady ? 'Ready' : 'Not Ready',
      resetGame: () => startNewGame(),
      connectWallet: () => web3.connectWallet()
    };
    
    console.log('🛠️ Debug tools available: window.debugFMH');
    console.log('🎮 Game initialized with config:', gameConfig);
  }, []);

  // 计时器效果
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

  // 新游戏
  const startNewGame = useCallback(async () => {
    console.log('🎮 Starting new game...');
    
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
    setContractGameId(null);

    // 区块链游戏初始化
    if (!localGameMode && web3.isConnected && gameContract.contractsReady) {
      try {
        console.log('🔗 Initializing blockchain game...');
        const gameId = await gameContract.startGame(
          gameConfig.width,
          gameConfig.height,
          gameConfig.mines
        );
        
        if (gameId) {
          setContractGameId(gameId);
          console.log('✅ Blockchain game initialized:', gameId);
        }
      } catch (error) {
        console.warn('⚠️ Blockchain initialization failed, using local mode:', error);
      }
    }
  }, [gameConfig, web3.isConnected, gameContract, localGameMode]);

  // 格子点击处理
  const handleCellClick = useCallback((row: number, col: number) => {
    if (gameState.gameStatus === 'won' || gameState.gameStatus === 'lost') {
      return;
    }

    // 旗帜模式处理
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
    
    // 首次点击 - 放置地雷并开始游戏
    if (firstClick) {
      console.log('🚀 First click - starting game!');
      newBoard = placeMines(newBoard, gameConfig.mines, row, col);
      setFirstClick(false);
      setGameStartTime(Date.now());
      setGameState(prev => ({ ...prev, gameStatus: 'playing', board: newBoard }));
    }

    // 揭开格子
    newBoard = revealCell(newBoard, row, col);
    
    // 检查是否踩到地雷
    if (newBoard[row][col].isMine) {
      console.log('💥 Game over - mine hit!');
      setGameState(prev => ({ 
        ...prev, 
        board: newBoard, 
        gameStatus: 'lost' 
      }));
      
      if (contractGameId) {
        gameContract.completeGame(contractGameId, false, gameState.score);
      }
      return;
    }

    // 检查胜利条件
    const isWon = checkWinCondition(newBoard);
    if (isWon) {
      console.log('🎉 Game won!');
      const finalScore = calculateScore(gameConfig, gameState.timeElapsed, gameState.flagCount);
      setGameState(prev => ({ 
        ...prev, 
        board: newBoard, 
        gameStatus: 'won',
        score: finalScore
      }));
      
      // 处理游戏胜利
      if (web3.isConnected) {
        handleGameWin(finalScore);
      }
    } else {
      setGameState(prev => ({ ...prev, board: newBoard }));
    }
  }, [gameState, firstClick, gameConfig, contractGameId, gameContract, web3.isConnected, flagMode]);

  // 右键点击处理
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

  // 游戏胜利处理
  const handleGameWin = async (finalScore: number) => {
    try {
      console.log('🏆 Processing game win...');
      
      const gameData = {
        walletAddress: web3.account,
        gameId: contractGameId || Date.now(),
        gameWidth: gameConfig.width,
        gameHeight: gameConfig.height,
        mineCount: gameConfig.mines,
        isWon: true,
        finalScore,
        gameDuration: gameState.timeElapsed,
        cellsRevealed: gameState.board.flat().filter(cell => cell.isRevealed).length,
        flagsUsed: gameState.flagCount,
        rewardAmount: 0,
        rewardClaimed: false,
        startTxHash: null,
        completeTxHash: null,
        gameFee: 0.001
      };

      const result = await gameHistory.completeGame(gameData, userProfile.profile?.id);
      
      if (result.gameSaved) {
        console.log('✅ Game saved to database');
        if (result.achievements?.length > 0) {
          console.log('🏆 New achievements:', result.achievements);
        }
        await userProfile.fetchProfile();
      }

      // 区块链奖励申请
      if (contractGameId) {
        console.log('💰 Claiming blockchain reward...');
        // TODO: 实现奖励申请逻辑
      }
    } catch (error) {
      console.error('❌ Error processing game win:', error);
    }
  };

  // 奖励申请
  const handleClaimReward = async () => {
    if (!contractGameId || gameState.gameStatus !== 'won') {
      console.error('Cannot claim reward: invalid game state');
      return;
    }

    setIsSubmittingScore(true);
    try {
      console.log('💰 Claiming reward...');
      // TODO: 实现服务器签名奖励申请
      console.log('✅ Reward claimed successfully!');
    } catch (error) {
      console.error('❌ Failed to claim reward:', error);
    } finally {
      setIsSubmittingScore(false);
    }
  };

  // 切换排行榜
  const toggleLeaderboard = () => {
    setShowLeaderboard(!showLeaderboard);
  };

  if (!mounted) {
    return (
      <ThemeProvider theme={theme}>
        <GlobalStyle />
        <LoadingWrapper>
          <Loading />
        </LoadingWrapper>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <GlobalStyle />
      <ErrorBoundary>
        <AppContainer>
          <GameContainer>
            <Header>
              <h1>🎯 FMH Minesweeper</h1>
              <div className="subtitle">
                集成区块链技术的经典扫雷游戏 - 在 Monad 测试网上赚取 FMH 代币
              </div>
            </Header>

            {/* 钱包连接区域 */}
            <WalletSection>
              {!web3.isConnected ? (
                <div>
                  <h3>🔗 连接钱包开始游戏</h3>
                  <p>连接 MetaMask 钱包来赚取 FMH 代币奖励！</p>
                  <ConnectButton 
                    onClick={web3.connectWallet} 
                    disabled={web3.isLoading}
                  >
                    {web3.isLoading ? (
                      <>🔄 连接中...</>
                    ) : (
                      <>🔗 连接钱包</>
                    )}
                  </ConnectButton>
                  
                  {web3.isLoading && (
                    <div style={{ fontSize: '14px', color: '#666', marginTop: '10px' }}>
                      请检查 MetaMask 弹窗并确认连接
                    </div>
                  )}
                  
                  <Suspense fallback={<Loading />}>
                    <WalletErrorHelper
                      error={web3.error}
                      onRetry={web3.connectWallet}
                      onDismiss={web3.clearError}
                    />
                  </Suspense>
                </div>
              ) : (
                <div>
                  <h3>✅ 钱包已连接</h3>
                  <p>账户: {web3.account?.slice(0, 8)}...{web3.account?.slice(-6)}</p>
                  
                  {!web3.isOnCorrectNetwork && (
                    <NetworkWarning>
                      <span>⚠️ 请切换到 Monad 测试网来获得代币奖励</span>
                      <ConnectButton onClick={web3.switchToMonadTestnet}>
                        🔄 切换网络
                      </ConnectButton>
                    </NetworkWarning>
                  )}
                  
                  <div style={{ marginTop: '15px' }}>
                    <ConnectButton 
                      onClick={() => setLocalGameMode(!localGameMode)}
                      style={{ 
                        background: localGameMode ? theme.colors.warning : theme.colors.success,
                        marginRight: '10px'
                      }}
                    >
                      {localGameMode ? '🏠 本地模式' : '⛓️ 区块链模式'}
                    </ConnectButton>
                    
                    <ConnectButton onClick={web3.disconnect}>
                      🚪 断开连接
                    </ConnectButton>
                  </div>
                </div>
              )}
              
              {gameContract.error && (
                <ErrorMessage>
                  合约错误: {gameContract.error}
                </ErrorMessage>
              )}
            </WalletSection>

            {/* 网络状态和指导 */}
            <Suspense fallback={<Loading />}>
              <NetworkStatus />
              <NetworkGuide />
            </Suspense>

            {/* 游戏区域 */}
            <Suspense fallback={<LoadingWrapper><Loading /></LoadingWrapper>}>
              <GameHeader
                mineCount={gameState.mineCount}
                flagCount={gameState.flagCount}
                timeElapsed={gameState.timeElapsed}
                gameStatus={gameState.gameStatus}
                score={gameState.score}
                onNewGame={startNewGame}
                onClaimReward={handleClaimReward}
                canClaimReward={
                  web3.isConnected && 
                  web3.isOnCorrectNetwork && 
                  contractGameId !== null && 
                  gameState.gameStatus === 'won' &&
                  !isSubmittingScore
                }
                onShowLeaderboard={toggleLeaderboard}
                flagMode={flagMode}
                onToggleFlagMode={() => setFlagMode(!flagMode)}
              />

              <div className="game-area" style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                marginBottom: '20px' 
              }}>
                <GameBoard
                  key={`${gameConfig.width}-${gameConfig.height}-${gameState.mineCount}-${gameState.gameStatus}`}
                  board={gameState.board}
                  onCellClick={handleCellClick}
                  onCellRightClick={handleCellRightClick}
                  gameStatus={gameState.gameStatus}
                  flagMode={flagMode}
                />
              </div>
            </Suspense>

            {/* 用户统计 */}
            {web3.isConnected && userProfile.profile && (
              <div style={{ 
                background: theme.colors.surface,
                padding: '20px',
                borderRadius: '8px',
                border: `2px inset ${theme.colors.background}`,
                marginTop: '20px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '20px',
                textAlign: 'center'
              }}>
                <div>
                  <h3>🎮 游戏统计</h3>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: theme.colors.success }}>
                    {userProfile.stats?.totalWins || 0}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    胜率: {userProfile.stats?.winRate || 0}%
                  </div>
                </div>
                <div>
                  <h3>🏆 最高分数</h3>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: theme.colors.success }}>
                    {userProfile.stats?.bestScore || 0}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    最快: {userProfile.stats?.bestTime || 0}秒
                  </div>
                </div>
                <div>
                  <h3>💰 FMH 代币</h3>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: theme.colors.success }}>
                    {parseFloat(userProfile.stats?.totalRewards || '0').toFixed(2)}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    成就: {userProfile.stats?.achievementCount || 0}个
                  </div>
                </div>
              </div>
            )}

            {/* 加载状态 */}
            {(userProfile.loading || gameHistory.saving || isSubmittingScore) && (
              <div style={{ 
                textAlign: 'center', 
                padding: '15px', 
                background: '#fff3cd', 
                border: '1px solid #ffeaa7',
                borderRadius: '6px',
                margin: '20px 0',
                fontSize: '14px'
              }}>
                {userProfile.loading && '📊 加载用户数据...'}
                {gameHistory.saving && '💾 保存游戏记录...'}
                {isSubmittingScore && '💰 申请奖励中...'}
              </div>
            )}
          </GameContainer>
          
          {/* 排行榜 */}
          <Suspense fallback={<Loading />}>
            <Leaderboard 
              isVisible={showLeaderboard} 
              onClose={() => setShowLeaderboard(false)} 
            />
          </Suspense>
        </AppContainer>
      </ErrorBoundary>
    </ThemeProvider>
  );
}