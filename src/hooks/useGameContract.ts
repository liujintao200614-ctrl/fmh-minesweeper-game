import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { GameStats, ContractGame } from '@/types/game';

// Contract ABIs (simplified for this example)
const MINESWEEPER_ABI = [
  "function startGame(uint8 width, uint8 height, uint8 mines) external payable returns (uint256)",
  "function completeGame(uint256 gameId, bool won, uint256 score) external",
  "function claimReward(uint256 gameId) external",
  "function getPlayerGames(address player) external view returns (uint256[])",
  "function getGameDetails(uint256 gameId) external view returns (address, uint8, uint8, uint8, uint256, uint256, bool, bool, bool, uint256)",
  "function getPlayerStats(address player) external view returns (uint256, uint256)",
  "function GAME_FEE() external view returns (uint256)",
  "event GameStarted(uint256 indexed gameId, address indexed player, uint8 width, uint8 height, uint8 mines)",
  "event GameCompleted(uint256 indexed gameId, address indexed player, bool won, uint256 score, uint256 duration)",
  "event RewardClaimed(uint256 indexed gameId, address indexed player, uint256 reward)"
];

const FMH_TOKEN_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function name() external view returns (string)",
  "function symbol() external view returns (string)",
  "function decimals() external view returns (uint8)"
];

const MON_TOKEN_ABI = [
  "function balanceOf(address account) external view returns (uint256)",
  "function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function name() external view returns (string)",
  "function symbol() external view returns (string)",
  "function decimals() external view returns (uint8)"
];

// Contract addresses
const CONTRACT_ADDRESSES = {
  MINESWEEPER_GAME: process.env.NEXT_PUBLIC_MINESWEEPER_CONTRACT || "0x4bE377d2bf2b3412b6eBF1b179314fd90adf9C27",
  FMH_TOKEN: process.env.NEXT_PUBLIC_FMH_TOKEN_CONTRACT || "0x83aB028468ef2a5495Cc7964B3266437956231E2",
  MON_TOKEN: "0x0000000000000000000000000000000000000000" // 需要设置正确的 MON 代币地址
};

export const useGameContract = (signer: ethers.JsonRpcSigner | null, account: string | null) => {
  const [contracts, setContracts] = useState<{
    gameContract: ethers.Contract | null;
    tokenContract: ethers.Contract | null;
    monContract: ethers.Contract | null;
  }>({ gameContract: null, tokenContract: null, monContract: null });
  
  const [gameStats, setGameStats] = useState<GameStats>({
    gamesWon: 0,
    totalGames: 0,
    totalRewards: '0'
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('🎮 useGameContract initialized with:');
    console.log('Signer:', !!signer);
    console.log('Account:', account);
    console.log('Contract Addresses:', CONTRACT_ADDRESSES);
    
    if (signer) {
      try {
        const gameContract = new ethers.Contract(CONTRACT_ADDRESSES.MINESWEEPER_GAME, MINESWEEPER_ABI, signer);
        const tokenContract = new ethers.Contract(CONTRACT_ADDRESSES.FMH_TOKEN, FMH_TOKEN_ABI, signer);
        setContracts({ gameContract, tokenContract });
      } catch (err) {
        console.error('Failed to initialize contracts:', err);
        setError('Failed to initialize contracts. Please check if contracts are deployed.');
      }
    } else {
      setContracts({ gameContract: null, tokenContract: null });
    }
  }, [signer]);

  const startGame = async (width: number, height: number, mines: number): Promise<number | null> => {
    if (!contracts.gameContract) {
      setError('Contract not initialized');
      return null;
    }

    // 验证参数范围，确保在 uint8 范围内 (0-255)
    if (width < 1 || width > 255 || height < 1 || height > 255 || mines < 1 || mines > 255) {
      console.error('Invalid parameters for contract:', { width, height, mines });
      setError(`Invalid game parameters. Width: ${width}, Height: ${height}, Mines: ${mines}`);
      return null;
    }

    // 确保地雷数不超过总格子数，并检查乘积是否会在合约中溢出
    const totalCells = width * height;
    if (totalCells > 255) {
      console.error('Board size too large for contract (uint8 overflow):', { width, height, totalCells });
      setError(`Board size ${width}x${height}=${totalCells} exceeds contract limit (255). Try smaller dimensions.`);
      return null;
    }
    
    if (mines >= totalCells) {
      console.error('Too many mines for board size:', { width, height, mines, totalCells });
      setError(`Too many mines (${mines}) for board size ${width}x${height}`);
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('🚀 Starting contract game with validated parameters:', { width, height, mines });
      
      const gameFee = await contracts.gameContract.GAME_FEE();
      
      // 估算Gas费用
      let gasEstimate;
      try {
        gasEstimate = await contracts.gameContract.startGame.estimateGas(width, height, mines, {
          value: gameFee
        });
        // 增加20%的Gas缓冲
        gasEstimate = gasEstimate * BigInt(120) / BigInt(100);
      } catch (gasError) {
        console.warn('Gas estimation failed, using default:', gasError);
        gasEstimate = BigInt(300000); // 默认Gas限制
      }

      const tx = await contracts.gameContract.startGame(width, height, mines, {
        value: gameFee,
        gasLimit: gasEstimate
      });
      
      const receipt = await tx.wait();
      
      // Parse the GameStarted event to get gameId
      const gameStartedEvent = receipt.logs.find((log: any) => {
        try {
          const parsed = contracts.gameContract?.interface.parseLog(log);
          return parsed?.name === 'GameStarted';
        } catch {
          return false;
        }
      });

      if (gameStartedEvent && contracts.gameContract) {
        try {
          const parsed = contracts.gameContract.interface.parseLog(gameStartedEvent);
          if (parsed?.args?.gameId !== undefined) {
            return Number(parsed.args.gameId);
          }
        } catch (parseError) {
          console.error('Failed to parse game event:', parseError);
        }
      }

      return null;
    } catch (err: any) {
      setError(err.message || 'Failed to start game');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const completeGame = async (gameId: number, won: boolean, score: number): Promise<boolean> => {
    if (!contracts.gameContract) {
      setError('Contract not initialized');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const tx = await contracts.gameContract.completeGame(gameId, won, score);
      await tx.wait();
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to complete game');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const claimReward = async (gameId: number): Promise<boolean> => {
    if (!contracts.gameContract) {
      setError('Contract not initialized');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      const tx = await contracts.gameContract.claimReward(gameId);
      await tx.wait();
      await loadGameStats(); // Refresh stats
      return true;
    } catch (err: any) {
      setError(err.message || 'Failed to claim reward');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const loadGameStats = useCallback(async (): Promise<void> => {
    if (!contracts.gameContract || !contracts.tokenContract || !account) return;

    try {
      const [gamesWon, totalGames] = await contracts.gameContract.getPlayerStats(account);
      const tokenBalance = await contracts.tokenContract.balanceOf(account);
      
      setGameStats({
        gamesWon: Number(gamesWon),
        totalGames: Number(totalGames),
        totalRewards: ethers.formatEther(tokenBalance)
      });
    } catch (err) {
      console.error('Failed to load game stats:', err);
    }
  }, [contracts.gameContract, contracts.tokenContract, account]);

  const getPlayerGames = async (): Promise<ContractGame[]> => {
    if (!contracts.gameContract || !account) return [];

    try {
      const gameIds = await contracts.gameContract.getPlayerGames(account);
      const games: ContractGame[] = [];

      for (const gameId of gameIds) {
        const gameDetails = await contracts.gameContract.getGameDetails(gameId);
        games.push({
          player: gameDetails[0],
          width: gameDetails[1],
          height: gameDetails[2],
          mines: gameDetails[3],
          startTime: Number(gameDetails[4]),
          endTime: Number(gameDetails[5]),
          isWon: gameDetails[6],
          isCompleted: gameDetails[7],
          rewardClaimed: gameDetails[8],
          score: Number(gameDetails[9])
        });
      }

      return games;
    } catch (err) {
      console.error('Failed to load player games:', err);
      return [];
    }
  };

  useEffect(() => {
    if (contracts.gameContract && contracts.tokenContract && account) {
      loadGameStats();
    }
  }, [contracts.gameContract, contracts.tokenContract, account, loadGameStats]);

  return {
    startGame,
    completeGame,
    claimReward,
    loadGameStats,
    getPlayerGames,
    gameStats,
    loading,
    error,
    contractsReady: contracts.gameContract !== null && contracts.tokenContract !== null
  };
};