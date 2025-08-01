import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import GameBoard from '@/components/GameBoard';
import GameHeader from '@/components/GameHeader';
import Leaderboard from '@/components/Leaderboard';
import WalletErrorHelper from '@/components/WalletErrorHelper';
import NetworkStatus from '@/components/NetworkStatus';
import NetworkGuide from '@/components/NetworkGuide';
import { useWeb3 } from '@/hooks/useWeb3';
import { useGameContract } from '@/hooks/useGameContract';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useGameHistory } from '@/hooks/useGameHistory';
import { GameState, GameConfig, Cell } from '@/types/game';
import { ethers } from 'ethers';
import {
  createEmptyBoard,
  placeMines,
  revealCell,
  toggleFlag,
  checkWinCondition,
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

const NetworkWarning = styled.div`
  background: #ff6b6b;
  color: white;
  padding: 10px;
  border-radius: 4px;
  margin: 10px 0;
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

const StatsSection = styled.div`
  background: #f0f0f0;
  padding: 15px;
  border: 2px inset #c0c0c0;
  margin-top: 20px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  text-align: center;
`;

const StatItem = styled.div`
  h3 {
    margin: 0 0 10px 0;
    color: #333;
  }
  
  .value {
    font-size: 24px;
    font-weight: bold;
    color: #4CAF50;
  }
`;

const ErrorMessage = styled.div`
  background: #ff6b6b;
  color: white;
  padding: 10px;
  border-radius: 4px;
  margin: 10px 0;
`;

const defaultGameConfig: GameConfig = {
  width: 10,
  height: 10,
  mines: 15
};

const presets = {
  easy: { width: 9, height: 9, mines: 10 },
  medium: { width: 16, height: 16, mines: 40 },
  hard: { width: 30, height: 16, mines: 99 }
};

export default function Home() {
  const web3 = useWeb3();
  const gameContract = useGameContract(web3.signer, web3.account);
  const userProfile = useUserProfile(web3.account);
  const gameHistory = useGameHistory();
  
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  
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
  const [contractGameId, setContractGameId] = useState<number | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [isSubmittingScore, setIsSubmittingScore] = useState(false);
  const [flagMode, setFlagMode] = useState(false); // 手机端插旗模式
  const [localGameMode, setLocalGameMode] = useState(false); // 本地游戏模式，不使用区块链

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

  // 签名游戏结果
  const signGameResult = async (gameId: number, score: number, timeElapsed: number): Promise<string | null> => {
    if (!web3.signer) {
      console.error('No signer available');
      return null;
    }

    try {
      const message = `gameId:${gameId},score:${score},time:${timeElapsed}`;
      const signature = await web3.signer.signMessage(message);
      return signature;
    } catch (error) {
      console.error('Failed to sign message:', error);
      return null;
    }
  };

  // 新的服务器签名奖励申请系统
  const claimRewardWithSignature = async (
    gameId: number,
    score: number,
    timeElapsed: number
  ): Promise<boolean> => {
    if (!web3.account || !web3.signer || isSubmittingScore) return false;

    setIsSubmittingScore(true);
    
    try {
      console.log('🎯 Starting server signature claim process...');
      
      // 1. 向服务器请求签名
      const response = await fetch('/api/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          player: web3.account,
          gameId,
          score,
          duration: timeElapsed
        })
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to get server signature');
      }

      console.log('✅ Server signature received:', result);

      // 2. 使用服务器签名调用合约
      if (!gameContract.contract) {
        throw new Error('Contract not available');
      }

      const { claimData, serverSignature } = result;
      
      // 调用合约的 claimWithSignature 方法
      const tx = await gameContract.contract.claimWithSignature(
        claimData.player,
        claimData.gameId,
        claimData.score,
        claimData.duration,
        claimData.nonce,
        claimData.deadline,
        serverSignature
      );

      console.log('📝 Transaction sent:', tx.hash);
      
      // 等待交易确认
      const receipt = await tx.wait();
      console.log('✅ Transaction confirmed:', receipt.transactionHash);

      // 刷新游戏统计
      await gameContract.loadGameStats();
      
      console.log(`🎉 Reward claimed successfully! Estimated: ${result.estimatedReward} FMH`);
      return true;
      
    } catch (error) {
      console.error('❌ Failed to claim reward:', error);
      throw error;
    } finally {
      setIsSubmittingScore(false);
    }
  };

  // 存储玩家地址到 localStorage 用于排行榜
  useEffect(() => {
    if (web3.account) {
      localStorage.setItem('playerAddress', web3.account);
    }
  }, [web3.account]);

  const startNewGame = useCallback(async () => {
    // Always initialize local game state first
    const newBoard = createEmptyBoard(gameConfig.width, gameConfig.height);
    
    // Force re-render by using a functional update
    setGameState(prev => ({
      board: newBoard,
      gameStatus: 'waiting' as const,
      mineCount: gameConfig.mines,  
      flagCount: 0,
      timeElapsed: 0,
      score: 0,
      gameId: undefined
    }));
    
    setFirstClick(true);
    setGameStartTime(null);
    setContractGameId(null);

    // Only try blockchain if not in local mode and wallet is connected
    if (!localGameMode && web3.isConnected && gameContract.contractsReady) {
      try {
        const timeoutPromise = new Promise<null>((_, reject) => 
          setTimeout(() => reject(new Error('Blockchain timeout')), 5000)
        );
        
        const gamePromise = gameContract.startGame(
          gameConfig.width,
          gameConfig.height, 
          gameConfig.mines
        );
        
        const blockchainGameId = await Promise.race([gamePromise, timeoutPromise]);
        
        if (blockchainGameId) {
          setGameState(prev => ({ ...prev, gameId: blockchainGameId }));
          setContractGameId(blockchainGameId);
        }
      } catch (error) {
        console.log('Blockchain game start failed, continuing with local game:', error);
        // Continue with local game even if blockchain fails
      }
    }
  }, [gameConfig, web3.isConnected, gameContract, localGameMode]);

  const handleCellClick = useCallback((row: number, col: number) => {
    if (gameState.gameStatus === 'won' || gameState.gameStatus === 'lost') {
      return;
    }

    // 在插旗模式下，点击=插旗
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
    
    // First click - place mines and start game
    if (firstClick) {
      newBoard = placeMines(newBoard, gameConfig.mines, row, col);
      setFirstClick(false);
      setGameStartTime(Date.now());
      setGameState(prev => ({ ...prev, gameStatus: 'playing', board: newBoard }));
    }

    // Reveal cell
    newBoard = revealCell(newBoard, row, col);
    
    // Check if clicked on mine
    if (newBoard[row][col].isMine) {
      setGameState(prev => ({ 
        ...prev, 
        board: newBoard, 
        gameStatus: 'lost' 
      }));
      
      // Complete blockchain game as lost
      if (contractGameId) {
        gameContract.completeGame(contractGameId, false, gameState.score);
      }
      return;
    }

    // Check win condition
    const isWon = checkWinCondition(newBoard);
    if (isWon) {
      const finalScore = calculateScore(gameConfig, gameState.timeElapsed, gameState.flagCount);
      setGameState(prev => ({ 
        ...prev, 
        board: newBoard, 
        gameStatus: 'won',
        score: finalScore
      }));
      
      // 新的游戏完成流程：保存记录 + 检查成就 + 申请奖励
      if (web3.isConnected) {
        setTimeout(async () => {
          try {
            // 1. 保存游戏记录到数据库
            const gameData = {
              walletAddress: web3.account,
              gameId: contractGameId || Date.now(), // 如果没有链上ID，使用时间戳
              gameWidth: gameConfig.width,
              gameHeight: gameConfig.height,
              mineCount: gameConfig.mines,
              isWon: true,
              finalScore,
              gameDuration: gameState.timeElapsed,
              cellsRevealed: gameState.board.flat().filter(cell => cell.isRevealed).length,
              flagsUsed: gameState.flagCount,
              rewardAmount: 0, // 暂时设为0，申请成功后更新
              rewardClaimed: false,
              startTxHash: null,
              completeTxHash: null,
              gameFee: 0.001
            };

            const completionResult = await gameHistory.completeGame(gameData, userProfile.profile?.id);
            
            if (completionResult.gameSaved) {
              console.log('✅ Game record saved to database');
              
              // 2. 显示新获得的成就
              if (completionResult.achievements && completionResult.achievements.length > 0) {
                console.log('🏆 New achievements unlocked:', completionResult.achievements);
                // TODO: 显示成就弹窗
              }
              
              // 3. 刷新用户资料
              await userProfile.fetchProfile();
            }

            // 4. 申请链上奖励（如果有合约游戏ID）
            if (contractGameId) {
              await claimRewardWithSignature(contractGameId, finalScore, gameState.timeElapsed);
              console.log('🎉 Blockchain reward automatically claimed!');
            }
            
          } catch (error) {
            console.error('❌ Game completion process failed:', error);
            console.log('💡 You can manually claim the reward using the Claim Reward button');
          }
        }, 1000); // 延迟1秒以确保状态更新完成
      }
    } else {
      setGameState(prev => ({ ...prev, board: newBoard }));
    }
  }, [gameState.board, gameState.gameStatus, gameState.timeElapsed, gameState.flagCount, firstClick, gameConfig, contractGameId, gameContract.completeGame, web3.isConnected, web3.account, claimRewardWithSignature, gameHistory, userProfile, flagMode]);

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

  // 手动申请奖励（使用服务器签名）
  const handleClaimReward = async () => {
    if (!contractGameId || gameState.gameStatus !== 'won') {
      console.error('Cannot claim reward: invalid game state');
      return;
    }

    try {
      await claimRewardWithSignature(contractGameId, gameState.score, gameState.timeElapsed);
    } catch (error) {
      console.error('Failed to claim reward:', error);
      alert('Failed to claim reward. Please try again.');
    }
  };

  const setPreset = (preset: keyof typeof presets) => {
    const config = presets[preset];
    setGameConfig(config);
    
    // Reset board with new dimensions
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
  };

  const handleShowLeaderboard = () => {
    setShowLeaderboard(true);
  };

  const handleCloseLeaderboard = () => {
    setShowLeaderboard(false);
  };

  return (
    <AppContainer>
      <GameContainer>
        <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>
          FMH Minesweeper
        </h1>

        <WalletSection>
          {!web3.isConnected ? (
            <div>
              <p>Connect your wallet to earn FMH tokens!</p>
              <ConnectButton 
                onClick={web3.connectWallet} 
                disabled={web3.isLoading}
              >
                {web3.isLoading ? (
                  <>
                    <span>🔄</span> Connecting...
                  </>
                ) : (
                  <>
                    <span>🔗</span> Connect Wallet
                  </>
                )}
              </ConnectButton>
              
              {web3.isLoading && (
                <div style={{ fontSize: '12px', color: '#666', marginTop: '8px' }}>
                  Please check MetaMask popup
                </div>
              )}
              
              {/* Enhanced error handling with user-friendly solutions */}
              <WalletErrorHelper
                error={web3.error}
                onRetry={web3.connectWallet}
                onDismiss={web3.clearError}
              />
            </div>
          ) : (
            <div>
              <p>Connected: {web3.account?.slice(0, 6)}...{web3.account?.slice(-4)}</p>
              {!web3.isOnCorrectNetwork && (
                <NetworkWarning>
                  Please switch to Monad Testnet to earn rewards
                  <ConnectButton onClick={web3.switchToMonadTestnet}>
                    Switch Network
                  </ConnectButton>
                </NetworkWarning>
              )}
              <ConnectButton onClick={web3.disconnect}>
                Disconnect
              </ConnectButton>
            </div>
          )}
          {gameContract.error && <ErrorMessage>{gameContract.error}</ErrorMessage>}
        </WalletSection>

        {/* 网络状态和指导 */}
        <NetworkStatus />
        <NetworkGuide />

        <GameSettings>
          <h3>Game Settings</h3>
          <div>
            <PresetButton onClick={() => setPreset('easy')}>Easy (9×9)</PresetButton>
            <PresetButton onClick={() => setPreset('medium')}>Medium (16×16)</PresetButton>
            <PresetButton onClick={() => setPreset('hard')}>Hard (30×16)</PresetButton>
          </div>
          
          <SettingRow>
            <Label>Game Mode:</Label>
            <PresetButton 
              onClick={() => setLocalGameMode(!localGameMode)}
              style={{ 
                background: localGameMode ? '#ff9800' : '#4CAF50',
                color: 'white' 
              }}
            >
              {localGameMode ? '🏠 Local Mode' : '⛓️ Blockchain Mode'}
            </PresetButton>
          </SettingRow>
          
          <SettingRow>
            <Label>Width:</Label>
            <Input 
              type="number" 
              min="5" 
              max="30" 
              value={gameConfig.width}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGameConfig(prev => ({ ...prev, width: parseInt(e.target.value) || 5 }))}
            />
            <Label>Height:</Label>
            <Input 
              type="number" 
              min="5" 
              max="30" 
              value={gameConfig.height}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGameConfig(prev => ({ ...prev, height: parseInt(e.target.value) || 5 }))}
            />
            <Label>Mines:</Label>
            <Input 
              type="number" 
              min="1" 
              max={Math.floor(gameConfig.width * gameConfig.height * 0.8)}
              value={gameConfig.mines}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGameConfig(prev => ({ ...prev, mines: parseInt(e.target.value) || 1 }))}
            />
          </SettingRow>
        </GameSettings>

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
            gameState.gameStatus === 'won'
          }
          onShowLeaderboard={handleShowLeaderboard}
          flagMode={flagMode}
          onToggleFlagMode={() => setFlagMode(!flagMode)}
        />

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <GameBoard
            key={`${gameConfig.width}-${gameConfig.height}-${gameState.mineCount}-${gameState.gameStatus}`}
            board={gameState.board}
            onCellClick={handleCellClick}
            onCellRightClick={handleCellRightClick}
            gameStatus={gameState.gameStatus}
            flagMode={flagMode}
          />
        </div>

        {web3.isConnected && userProfile.profile && (
          <StatsSection>
            <StatItem>
              <h3>游戏胜利</h3>
              <div className="value">{userProfile.stats?.totalWins || 0}</div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                胜率: {userProfile.stats?.winRate || 0}%
              </div>
            </StatItem>
            <StatItem>
              <h3>最高分数</h3>
              <div className="value">{userProfile.stats?.bestScore || 0}</div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                最快: {userProfile.stats?.bestTime || 0}秒
              </div>
            </StatItem>
            <StatItem>
              <h3>FMH 代币</h3>
              <div className="value">{parseFloat(userProfile.stats?.totalRewards || 0).toFixed(2)}</div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                成就: {userProfile.stats?.achievementCount || 0}个
              </div>
            </StatItem>
          </StatsSection>
        )}
        
        {/* 加载状态显示 */}
        {(userProfile.loading || gameHistory.saving) && (
          <div style={{ 
            textAlign: 'center', 
            padding: '10px', 
            background: '#fff3cd', 
            border: '1px solid #ffeaa7',
            borderRadius: '4px',
            margin: '10px 0',
            fontSize: '14px'
          }}>
            {userProfile.loading && '📊 加载用户数据...'}
            {gameHistory.saving && '💾 保存游戏记录...'}
          </div>
        )}
      </GameContainer>
      
      <Leaderboard 
        isVisible={showLeaderboard} 
        onClose={handleCloseLeaderboard} 
      />
      
    </AppContainer>
  );
}