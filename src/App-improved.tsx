import React, { useState, useEffect, useCallback, Suspense, useRef } from 'react';
import styled, { createGlobalStyle } from 'styled-components';
import { ErrorBoundary } from './components/ErrorBoundary';
import Loading from './components/Loading';

// 核心游戏和Web3功能
import { GameConfig, Cell } from '@/types/game';

// 临时游戏状态接口（兼容当前实现）
interface AppGameState {
  board: Cell[][];
  gameStatus: 'waiting' | 'ready' | 'playing' | 'won' | 'lost';
  mines: number;
  flags: number;
  time: number;
  score: number;
  flagMode: boolean;
}
import { useWeb3 } from '@/hooks/useWeb3';
import { useGameContract } from '@/hooks/useGameContract';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useGameHistory } from '@/hooks/useGameHistory';
import { ethers } from 'ethers';

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
const ModernGameBoard = React.lazy(() => import('@/components/ModernGameBoard'));
const ResponsiveGameHeader = React.lazy(() => import('@/components/ResponsiveGameHeader'));
const Leaderboard = React.lazy(() => import('@/components/Leaderboard'));

// 全局样式 - 现代化美观设计
const GlobalStyle = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    background-attachment: fixed;
    color: #ffffff;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    min-height: 100vh;
    overflow-x: hidden;
  }

  button {
    font-family: inherit;
    outline: none;
  }

  /* 滚动条美化 */
  ::-webkit-scrollbar {
    width: 8px;
  }

  ::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.1);
    border-radius: 4px;
  }

  ::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.3);
    border-radius: 4px;
    
    &:hover {
      background: rgba(255, 255, 255, 0.5);
    }
  }

  /* 移动端优化 */
  @media (max-width: 768px) {
    body {
      font-size: 14px;
    }
  }
`;

// 样式组件 - 现代化美观布局
const AppContainer = styled.div`
  min-height: 100vh;
  padding: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  
  &::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
      radial-gradient(circle at 80% 80%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
      radial-gradient(circle at 40% 60%, rgba(120, 119, 198, 0.3) 0%, transparent 50%);
    pointer-events: none;
    z-index: -1;
  }

  @media (max-width: 768px) {
    padding: 15px;
  }
  
  @media (max-width: 480px) {
    padding: 10px;
  }
`;

const Header = styled.div`
  text-align: center;
  margin-bottom: 30px;
  z-index: 1;
  
  h1 {
    color: #ffffff;
    font-size: 3rem;
    margin-bottom: 10px;
    font-weight: 700;
    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
    background: linear-gradient(45deg, #ffffff, #e3f2fd);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    
    @media (max-width: 768px) {
      font-size: 2.5rem;
    }
    
    @media (max-width: 480px) {
      font-size: 2rem;
    }
  }
  
  .subtitle {
    color: rgba(255, 255, 255, 0.9);
    font-size: 1.1rem;
    margin-bottom: 20px;
    text-shadow: 0 1px 5px rgba(0, 0, 0, 0.2);
    font-weight: 400;
    
    @media (max-width: 768px) {
      font-size: 1rem;
    }
  }
`;

const WalletSection = styled.div`
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  padding: 25px;
  margin-bottom: 30px;
  text-align: center;
  max-width: 500px;
  width: 100%;
  box-shadow: 
    0 8px 32px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.3);
  
  .status {
    margin-bottom: 15px;
    color: rgba(255, 255, 255, 0.95);
    font-weight: 500;
    font-size: 1.1rem;
  }
  
  .network-info {
    color: rgba(255, 255, 255, 0.7);
    font-size: 0.9rem;
    margin-top: 15px;
    padding: 10px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  @media (max-width: 768px) {
    padding: 20px;
    margin-bottom: 25px;
  }
`;

const ConnectButton = styled.button<{ connected?: boolean }>`
  background: ${props => props.connected 
    ? 'linear-gradient(135deg, #4CAF50, #45a049)' 
    : 'linear-gradient(135deg, #3498db, #2980b9)'};
  color: white;
  border: none;
  padding: 14px 35px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 30px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s;
  }
  
  &:hover {
    background: ${props => props.connected 
      ? 'linear-gradient(135deg, #45a049, #3d8b40)' 
      : 'linear-gradient(135deg, #2980b9, #1f639a)'};
    transform: translateY(-3px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.25);
    
    &::before {
      left: 100%;
    }
  }
  
  &:active {
    transform: translateY(-1px);
  }
  
  &:disabled {
    background: linear-gradient(135deg, #7f8c8d, #6c7b7f);
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
    
    &::before {
      display: none;
    }
  }
  
  @media (max-width: 768px) {
    padding: 12px 30px;
    font-size: 15px;
  }
`;

const GameSection = styled.div`
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 20px;
  padding: 25px;
  margin-bottom: 20px;
  max-width: 800px;
  width: 100%;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  align-items: center;
  
  @media (max-width: 768px) {
    padding: 20px;
    margin-bottom: 15px;
  }
`;

const DifficultySelector = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 25px;
  flex-wrap: wrap;
  justify-content: center;
  
  @media (max-width: 768px) {
    gap: 8px;
  }
`;

const DifficultyButton = styled.button<{ active?: boolean }>`
  background: ${props => props.active 
    ? 'linear-gradient(135deg, #3498db, #2980b9)'
    : 'rgba(255, 255, 255, 0.15)'};
  color: white;
  border: 1px solid ${props => props.active ? '#3498db' : 'rgba(255, 255, 255, 0.2)'};
  padding: 10px 20px;
  border-radius: 25px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s ease;
  backdrop-filter: blur(10px);
  
  &:hover {
    background: ${props => props.active 
      ? 'linear-gradient(135deg, #2980b9, #1f639a)'
      : 'rgba(255, 255, 255, 0.25)'};
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }
  
  &:active {
    transform: translateY(0);
  }
  
  @media (max-width: 768px) {
    padding: 8px 16px;
    font-size: 13px;
  }
`;

const MobileGuide = styled.div`
  background: rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(15px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 18px;
  padding: 22px;
  margin-bottom: 20px;
  max-width: 500px;
  width: 100%;
  box-shadow: 0 6px 25px rgba(0, 0, 0, 0.15);
  
  h3 {
    color: rgba(255, 255, 255, 0.95);
    margin-bottom: 18px;
    font-size: 1.3rem;
    font-weight: 600;
    text-align: center;
  }
  
  .guide-item {
    margin-bottom: 12px;
    color: rgba(255, 255, 255, 0.85);
    font-size: 0.95rem;
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 0;
    border-radius: 8px;
    transition: background 0.2s ease;
    
    &:hover {
      background: rgba(255, 255, 255, 0.1);
      padding-left: 8px;
    }
  }
  
  .emoji {
    font-size: 1.4rem;
    min-width: 35px;
    text-align: center;
  }
  
  @media (max-width: 768px) {
    padding: 18px;
  }
`;

const GameBoardWrapper = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  margin: 20px 0;
`;

const ControlButtons = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 25px;
  flex-wrap: wrap;
  justify-content: center;
`;

const ControlButton = styled.button<{ active?: boolean }>`
  background: ${props => props.active 
    ? 'linear-gradient(135deg, #ff9800, #f57c00)'
    : 'rgba(255, 255, 255, 0.15)'};
  color: white;
  border: 1px solid ${props => props.active ? '#ff9800' : 'rgba(255, 255, 255, 0.2)'};
  padding: 12px 24px;
  border-radius: 30px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  gap: 8px;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
  
  &:hover {
    background: ${props => props.active 
      ? 'linear-gradient(135deg, #f57c00, #e65100)'
      : 'rgba(255, 255, 255, 0.25)'};
    transform: translateY(-3px);
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
  }
  
  &:active {
    transform: translateY(-1px);
  }
  
  @media (max-width: 768px) {
    padding: 10px 18px;
    font-size: 13px;
    gap: 6px;
  }
`;

const GameResultModal = styled.div<{ $show: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: ${props => props.$show ? 'flex' : 'none'};
  justify-content: center;
  align-items: center;
  z-index: 1000;
  backdrop-filter: blur(10px);
`;

const ResultCard = styled.div<{ $won: boolean }>`
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 24px;
  padding: 40px;
  text-align: center;
  max-width: 500px;
  width: 90%;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  
  .result-icon {
    font-size: 4rem;
    margin-bottom: 20px;
    animation: bounce 2s infinite;
  }
  
  .result-title {
    font-size: 2.5rem;
    font-weight: bold;
    margin-bottom: 15px;
    color: ${props => props.$won ? '#4CAF50' : '#f44336'};
    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
  }
  
  .result-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
    margin: 30px 0;
  }
  
  .stat-item {
    background: rgba(255, 255, 255, 0.1);
    padding: 15px;
    border-radius: 15px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    
    .stat-label {
      font-size: 0.9rem;
      color: rgba(255, 255, 255, 0.8);
      margin-bottom: 8px;
    }
    
    .stat-value {
      font-size: 1.5rem;
      font-weight: bold;
      color: white;
    }
  }
  
  .blockchain-status {
    background: rgba(76, 175, 80, 0.2);
    border: 1px solid #4CAF50;
    border-radius: 15px;
    padding: 15px;
    margin: 20px 0;
    
    .status-title {
      font-weight: bold;
      color: #4CAF50;
      margin-bottom: 8px;
    }
    
    .status-text {
      color: rgba(255, 255, 255, 0.9);
      font-size: 0.9rem;
    }
  }
  
  @keyframes bounce {
    0%, 20%, 60%, 100% { transform: translateY(0); }
    40% { transform: translateY(-10px); }
    80% { transform: translateY(-5px); }
  }
  
  @media (max-width: 768px) {
    padding: 30px 20px;
    
    .result-title {
      font-size: 2rem;
    }
    
    .result-stats {
      grid-template-columns: 1fr;
      gap: 15px;
    }
  }
`;

const RewardButton = styled(ControlButton)`
  background: linear-gradient(135deg, #4CAF50, #45a049);
  border-color: #4CAF50;
  font-size: 16px;
  padding: 15px 30px;
  margin-top: 20px;
  
  &:hover {
    background: linear-gradient(135deg, #45a049, #3d8b40);
  }
  
  &:disabled {
    background: linear-gradient(135deg, #7f8c8d, #6c7b7f);
    border-color: #7f8c8d;
    cursor: not-allowed;
    transform: none;
  }
`;

const CloseButton = styled.button`
  position: absolute;
  top: 15px;
  right: 15px;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  color: white;
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.3s ease;
  
  &:hover {
    background: rgba(255, 255, 255, 0.3);
    transform: scale(1.1);
  }
`;

// 游戏配置
const GAME_CONFIGS: { [key: string]: GameConfig } = {
  easy: { width: 9, height: 9, mines: 10 },
  medium: { width: 16, height: 16, mines: 40 },
  hard: { width: 30, height: 16, mines: 99 }
};

export default function ImprovedApp() {
  // Web3 状态
  const { account, isConnected, isLoading, error, connectWallet, disconnect } = useWeb3();
  const gameContract = useGameContract(null, account);
  const userProfile = useUserProfile(account);
  const gameHistory = useGameHistory(account);

  // 游戏状态
  const [currentDifficulty, setCurrentDifficulty] = useState<keyof typeof GAME_CONFIGS>('easy');
  const [gameState, setGameState] = useState<AppGameState>({
    board: [],
    gameStatus: 'waiting',
    mines: 10,
    flags: 10,
    time: 0,
    score: 0,
    flagMode: false
  });
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [firstClick, setFirstClick] = useState(true);
  const [showRewardClaim, setShowRewardClaim] = useState(false);
  const [gameId, setGameId] = useState<number | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const timerRef = useRef<NodeJS.Timeout>();

  // 计时器功能
  const startTimer = useCallback(() => {
    const now = Date.now();
    setStartTime(now);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    timerRef.current = setInterval(() => {
      setGameState(prev => {
        if (prev.gameStatus === 'playing') {
          const elapsedSeconds = Math.floor((Date.now() - now) / 1000);
          return { ...prev, time: elapsedSeconds };
        }
        return prev;
      });
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = undefined;
    }
  }, []);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // 初始化游戏
  const initializeGame = useCallback((difficulty: keyof typeof GAME_CONFIGS) => {
    const config = GAME_CONFIGS[difficulty];
    const emptyBoard = createEmptyBoard(config.width, config.height);
    
    setGameState({
      board: emptyBoard,
      gameStatus: 'ready',
      mines: config.mines,
      flags: config.mines,
      time: 0,
      score: 0,
      flagMode: false
    });
  }, []);

  // 开始新游戏
  const startNewGame = useCallback(() => {
    const config = GAME_CONFIGS[currentDifficulty];
    const emptyBoard = createEmptyBoard(config.width, config.height);
    
    // 停止现有计时器
    stopTimer();
    
    setGameState({
      board: emptyBoard,
      gameStatus: 'ready', // 等待首次点击
      mines: config.mines,
      flags: config.mines,
      time: 0,
      score: 0,
      flagMode: false
    });
    setFirstClick(true);
    setGameId(null);
    setShowRewardClaim(false);
    setStartTime(null);
  }, [currentDifficulty, stopTimer]);

  // 切换难度
  const handleDifficultyChange = useCallback((difficulty: keyof typeof GAME_CONFIGS) => {
    setCurrentDifficulty(difficulty);
    initializeGame(difficulty);
  }, [initializeGame]);

  // 切换标旗模式
  const toggleFlagMode = useCallback(() => {
    setGameState(prev => ({
      ...prev,
      flagMode: !prev.flagMode
    }));
  }, []);

  // 处理单元格点击
  const handleCellClick = useCallback((row: number, col: number) => {
    console.log('🎯 Cell click:', row, col, 'gameStatus:', gameState.gameStatus, 'firstClick:', firstClick);
    if (gameState.gameStatus === 'won' || gameState.gameStatus === 'lost') return;

    // 如果是首次点击，先放置地雷
    if (firstClick && (gameState.gameStatus === 'ready' || gameState.gameStatus === 'waiting')) {
      const config = GAME_CONFIGS[currentDifficulty];
      // 如果棋盘为空，先创建空棋盘
      const currentBoard = gameState.board.length === 0 ? 
        createEmptyBoard(config.width, config.height) : 
        gameState.board;
      const boardWithMines = placeMines(currentBoard, config.mines, row, col);
      
      setGameState(prev => ({
        ...prev,
        board: boardWithMines,
        gameStatus: 'playing'
      }));
      setFirstClick(false);
      
      // 开始计时
      startTimer();
      
      // 如果已连接钱包，启动区块链游戏
      if (isConnected && account) {
        startBlockchainGame();
      }
      
      // 揭开首次点击的单元格
      setTimeout(() => {
        const newBoard = revealCell(boardWithMines, row, col);
        const isGameOver = newBoard[row][col].isMine;
        const isWin = checkWinCondition(newBoard);
        
        setGameState(prev => ({
          ...prev,
          board: newBoard,
          gameStatus: isGameOver ? 'lost' : isWin ? 'won' : 'playing',
          score: calculateScore({ width: config.width, height: config.height, mines: config.mines }, prev.time, 0)
        }));
      }, 50);
      return;
    }

    if (gameState.gameStatus !== 'playing') return;

    if (gameState.flagMode) {
      const currentFlagCount = gameState.mines - gameState.flags;
      const result = toggleFlag(gameState.board, row, col, gameState.mines, currentFlagCount);
      setGameState(prev => ({
        ...prev,
        board: result.board,
        flags: gameState.mines - result.flagCount
      }));
    } else {
      const newBoard = revealCell(gameState.board, row, col);
      const isGameOver = newBoard[row][col].isMine;
      const isWin = checkWinCondition(newBoard);
      
      setGameState(prev => ({
        ...prev,
        board: newBoard,
        gameStatus: isGameOver ? 'lost' : isWin ? 'won' : 'playing',
        score: calculateScore({ 
          width: GAME_CONFIGS[currentDifficulty].width, 
          height: GAME_CONFIGS[currentDifficulty].height, 
          mines: gameState.mines 
        }, prev.time, gameState.mines - prev.flags)
      }));
    }
  }, [gameState, firstClick, currentDifficulty]);

  // 处理右键点击
  const handleCellRightClick = useCallback((row: number, col: number) => {
    if (gameState.gameStatus !== 'playing') return;
    
    const currentFlagCount = gameState.mines - gameState.flags;
    const result = toggleFlag(gameState.board, row, col, gameState.mines, currentFlagCount);
    setGameState(prev => ({
      ...prev,
      board: result.board,
      flags: gameState.mines - result.flagCount
    }));
  }, [gameState]);

  // 处理游戏结束 - 提前定义避免引用错误
  const handleGameEnd = useCallback(async (won: boolean, score: number, time: number) => {
    console.log('🎮 Game ended:', { won, score, time, account, isConnected, gameId });
    
    if (!isConnected || !account || !gameContract?.gameContract || !gameId) {
      console.log('⚠️ Not connected to blockchain or no game ID, skipping transaction');
      return;
    }

    try {
      console.log('📝 Recording game result to blockchain...');
      
      const tx = await gameContract.gameContract.completeGame(
        gameId,
        won,
        score
      );
      
      console.log('🔗 Transaction sent:', tx.hash);
      await tx.wait();
      console.log('✅ Game result recorded on blockchain');
      
      if (won) {
        setShowRewardClaim(true);
      }
    } catch (error) {
      console.error('❌ Error recording game result:', error);
    }
  }, [isConnected, account, gameContract, gameId]);

  // 游戏结束处理
  useEffect(() => {
    if (gameState.gameStatus === 'won' || gameState.gameStatus === 'lost') {
      // 停止计时器
      stopTimer();
      
      // 计算最终时间
      const finalTime = startTime ? Math.floor((Date.now() - startTime) / 1000) : gameState.time;
      
      handleGameEnd(gameState.gameStatus === 'won', gameState.score, finalTime);
    }
  }, [gameState.gameStatus, gameState.score, gameState.time, stopTimer, startTime]);

  // 开始新游戏时记录到区块链
  const startBlockchainGame = useCallback(async () => {
    if (!isConnected || !account || !gameContract?.gameContract) {
      return null;
    }

    try {
      const config = GAME_CONFIGS[currentDifficulty];
      console.log('🚀 Starting blockchain game:', config);
      
      const tx = await gameContract.gameContract.startGame(
        config.width,
        config.height, 
        config.mines,
        { value: ethers.parseEther('0.001') } // 游戏费用
      );
      
      console.log('🔗 Game start transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('✅ Game started on blockchain');
      
      // 从事件中获取游戏ID
      const gameStartedEvent = receipt.logs.find((log: any) => 
        log.topics[0] === ethers.id('GameStarted(uint256,address,uint8,uint8,uint8)')
      );
      
      if (gameStartedEvent) {
        const gameId = parseInt(gameStartedEvent.topics[1], 16);
        setGameId(gameId);
        return gameId;
      }
    } catch (error) {
      console.error('❌ Error starting blockchain game:', error);
    }
    
    return null;
  }, [isConnected, account, gameContract, currentDifficulty]);

  // 领取奖励
  const claimReward = useCallback(async () => {
    if (!isConnected || !account || !gameContract?.gameContract || !gameId) {
      return;
    }

    try {
      console.log('💰 Claiming reward for game:', gameId);
      
      const tx = await gameContract.gameContract.claimReward(gameId);
      console.log('🔗 Claim transaction sent:', tx.hash);
      
      await tx.wait();
      console.log('✅ Reward claimed successfully!');
      
      setShowRewardClaim(false);
    } catch (error) {
      console.error('❌ Error claiming reward:', error);
    }
  }, [isConnected, account, gameContract, gameId]);

  // 初始化
  useEffect(() => {
    initializeGame('easy');
  }, [initializeGame]);

  return (
    <ErrorBoundary>
      <GlobalStyle />
      <AppContainer>
        <Header>
          <h1>🎯 FMH Minesweeper</h1>
          <p className="subtitle">区块链扫雷游戏 - 赢取FMH代币奖励</p>
        </Header>

        <WalletSection>
          <div className="status">
            {isConnected ? (
              <div>
                <div>✅ 钱包已连接</div>
                <div style={{ fontSize: '0.9rem', color: '#4CAF50', marginTop: '5px' }}>
                  {account?.slice(0, 6)}...{account?.slice(-4)}
                </div>
              </div>
            ) : (
              <div>🔗 连接钱包开始游戏并获得奖励</div>
            )}
          </div>
          
          <ConnectButton
            connected={isConnected}
            onClick={isConnected ? disconnect : connectWallet}
            disabled={isLoading}
          >
            {isLoading ? '连接中...' : isConnected ? '断开钱包' : '连接钱包'}
          </ConnectButton>
          
          <div className="network-info">
            目标网络: Monad Testnet (Chain ID: 10143)
          </div>
          {error && (
            <div style={{ color: '#f44336', marginTop: '10px', fontSize: '0.9rem' }}>
              {error}
            </div>
          )}
        </WalletSection>

        <GameSection>
          <DifficultySelector>
            <DifficultyButton
              active={currentDifficulty === 'easy'}
              onClick={() => handleDifficultyChange('easy')}
            >
              简单 (9×9)
            </DifficultyButton>
            <DifficultyButton
              active={currentDifficulty === 'medium'}
              onClick={() => handleDifficultyChange('medium')}
            >
              中等 (16×16)
            </DifficultyButton>
            <DifficultyButton
              active={currentDifficulty === 'hard'}
              onClick={() => handleDifficultyChange('hard')}
            >
              困难 (30×16)
            </DifficultyButton>
          </DifficultySelector>

          <Suspense fallback={<Loading message="加载游戏中..." />}>
            <ResponsiveGameHeader
              minesLeft={gameState.flags}
              time={gameState.time}
              score={gameState.score}
              gameStatus={gameState.gameStatus as 'playing' | 'won' | 'lost'}
              difficulty={currentDifficulty}
              onNewGame={startNewGame}
              onDifficultyChange={(diff) => handleDifficultyChange(diff as keyof typeof GAME_CONFIGS)}
              onShowLeaderboard={() => setShowLeaderboard(true)}
              isConnected={isConnected}
              walletAddress={account || undefined}
            />
            
            <GameBoardWrapper>
              <ModernGameBoard
                board={gameState.board}
                onCellClick={handleCellClick}
                onCellRightClick={handleCellRightClick}
                gameStatus={gameState.gameStatus}
                flagMode={gameState.flagMode}
              />
            </GameBoardWrapper>
          </Suspense>

          <ControlButtons>
            <ControlButton onClick={startNewGame}>
              <span>🎮</span>
              新游戏
            </ControlButton>
            <ControlButton
              active={gameState.flagMode}
              onClick={toggleFlagMode}
            >
              <span>{gameState.flagMode ? '🚩' : '⛏️'}</span>
              {gameState.flagMode ? '挖掘模式' : '标旗模式'}
            </ControlButton>
            <ControlButton onClick={() => setShowLeaderboard(true)}>
              <span>🏆</span>
              排行榜
            </ControlButton>
          </ControlButtons>
        </GameSection>

        <MobileGuide>
          <h3>📱 移动端操作指南</h3>
          <div className="guide-item">
            <span className="emoji">👆</span>
            <span>点击 = 挖掘方块</span>
          </div>
          <div className="guide-item">
            <span className="emoji">👆👆</span>
            <span>长按 (0.3秒) = 标记/取消标记</span>
          </div>
          <div className="guide-item">
            <span className="emoji">🔄</span>
            <span>底部按钮 = 切换操作模式</span>
          </div>
          <div className="guide-item">
            <span className="emoji">💡</span>
            <span>提示: 使用标旗模式更容易操作</span>
          </div>
        </MobileGuide>

        <Suspense fallback={<Loading message="加载排行榜..." />}>
          <Leaderboard
            isVisible={showLeaderboard}
            onClose={() => setShowLeaderboard(false)}
          />
        </Suspense>

        {/* 游戏结果模态框 */}
        <GameResultModal $show={gameState.gameStatus === 'won' || gameState.gameStatus === 'lost'}>
          <ResultCard $won={gameState.gameStatus === 'won'}>
            <CloseButton onClick={startNewGame}>×</CloseButton>
            
            <div className="result-icon">
              {gameState.gameStatus === 'won' ? '🎉' : '💥'}
            </div>
            
            <div className="result-title">
              {gameState.gameStatus === 'won' ? '恭喜获胜！' : '游戏结束'}
            </div>
            
            <div className="result-stats">
              <div className="stat-item">
                <div className="stat-label">⏱️ 用时</div>
                <div className="stat-value">{Math.floor(gameState.time / 60)}:{(gameState.time % 60).toString().padStart(2, '0')}</div>
              </div>
              
              <div className="stat-item">
                <div className="stat-label">⭐ 分数</div>
                <div className="stat-value">{gameState.score.toLocaleString()}</div>
              </div>
              
              <div className="stat-item">
                <div className="stat-label">🏆 难度</div>
                <div className="stat-value">
                  {currentDifficulty === 'easy' ? '简单' : 
                   currentDifficulty === 'medium' ? '中等' : '困难'}
                </div>
              </div>
            </div>
            
            {isConnected && gameId && (
              <div className="blockchain-status">
                <div className="status-title">🔗 区块链记录</div>
                <div className="status-text">
                  游戏结果已记录到区块链<br/>
                  游戏ID: {gameId}
                </div>
              </div>
            )}
            
            {!isConnected && (
              <div className="blockchain-status" style={{ 
                background: 'rgba(255, 152, 0, 0.2)', 
                borderColor: '#ff9800' 
              }}>
                <div className="status-title" style={{ color: '#ff9800' }}>
                  ⚠️ 未连接钱包
                </div>
                <div className="status-text">
                  连接钱包后可获得代币奖励
                </div>
              </div>
            )}
            
            {showRewardClaim && gameState.gameStatus === 'won' && (
              <RewardButton onClick={claimReward}>
                <span>💰</span>
                领取FMH代币奖励
              </RewardButton>
            )}
            
            <ControlButtons style={{ marginTop: '30px' }}>
              <ControlButton onClick={startNewGame}>
                <span>🎮</span>
                开始新游戏
              </ControlButton>
              <ControlButton onClick={() => setShowLeaderboard(true)}>
                <span>🏆</span>
                查看排行榜
              </ControlButton>
            </ControlButtons>
          </ResultCard>
        </GameResultModal>
      </AppContainer>
    </ErrorBoundary>
  );
}