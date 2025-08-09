import { ethers } from 'ethers';
import { GameContract, ContractConfig, TransactionOptions } from '../../types/contract';
import { Web3ProviderManager } from './provider';

// Contract ABI - should be imported from generated types in production
const GAME_CONTRACT_ABI = [
  "function startGame(uint8 rows, uint8 cols, uint8 mines) external returns (uint256)",
  "function submitGame(uint256 gameId, bool won, uint256 score, uint256 timeElapsed, uint256 moves, uint256 flagsUsed, bytes32 boardHash) external",
  "function claimReward(uint256 gameId) external",
  "function getGame(uint256 gameId) external view returns (address player, uint8 rows, uint8 cols, uint8 mines, uint256 startTime, uint256 endTime, uint256 score, bool won, bool claimed)",
  "function getPlayerGames(address player) external view returns (uint256[])",
  "function getClaimableRewards(address player) external view returns (uint256[] gameIds, uint256[] amounts, string[] reasons)",
  "function gameCounter() external view returns (uint256)",
  "event GameStarted(uint256 indexed gameId, address indexed player, uint8 rows, uint8 cols, uint8 mines)",
  "event GameSubmitted(uint256 indexed gameId, address indexed player, bool won, uint256 score)",
  "event RewardClaimed(uint256 indexed gameId, address indexed player, uint256 amount)"
];

export class ContractManager {
  private static instance: ContractManager;
  private gameContract: GameContract | null = null;
  private config: ContractConfig | null = null;

  static getInstance(): ContractManager {
    if (!ContractManager.instance) {
      ContractManager.instance = new ContractManager();
    }
    return ContractManager.instance;
  }

  initialize(config: ContractConfig): void {
    this.config = config;
    this.gameContract = null; // Reset contract instance
  }

  async getGameContract(): Promise<GameContract> {
    if (!this.gameContract || !this.config) {
      await this.createContractInstance();
    }
    return this.gameContract!;
  }

  private async createContractInstance(): Promise<void> {
    if (!this.config) {
      throw new Error('Contract config not initialized');
    }

    const providerManager = Web3ProviderManager.getInstance();
    const signer = providerManager.getSigner();
    
    if (!signer) {
      throw new Error('No signer available. Please connect wallet first.');
    }

    this.gameContract = new ethers.Contract(
      this.config.address,
      GAME_CONTRACT_ABI,
      signer
    ) as GameContract;
  }

  async startGame(
    rows: number, 
    cols: number, 
    mines: number, 
    options?: TransactionOptions
  ): Promise<{ gameId: number; txHash: string }> {
    const contract = await this.getGameContract();
    
    const txOptions: any = {};
    if (options?.gasLimit) txOptions.gasLimit = options.gasLimit;
    if (options?.gasPrice) txOptions.gasPrice = options.gasPrice;
    if (options?.value) txOptions.value = options.value;

    try {
      const tx = await contract.startGame(rows, cols, mines, txOptions);
      const receipt = await tx.wait();
      
      // Extract gameId from event logs
      const gameStartedEvent = receipt.logs.find(
        (log: any) => log.fragment?.name === 'GameStarted'
      );
      
      const gameId = gameStartedEvent ? Number(gameStartedEvent.args[0]) : 0;
      
      return {
        gameId,
        txHash: tx.hash
      };
    } catch (error: any) {
      throw this.handleContractError(error, 'Failed to start game');
    }
  }

  async submitGame(
    gameId: number,
    won: boolean,
    score: number,
    timeElapsed: number,
    moves: number,
    flagsUsed: number,
    boardHash: string,
    options?: TransactionOptions
  ): Promise<string> {
    const contract = await this.getGameContract();
    
    const txOptions: any = {};
    if (options?.gasLimit) txOptions.gasLimit = options.gasLimit;
    if (options?.gasPrice) txOptions.gasPrice = options.gasPrice;

    try {
      const boardHashBytes = ethers.id(boardHash); // Convert to bytes32
      const tx = await contract.submitGame(
        gameId,
        won,
        score,
        timeElapsed,
        moves,
        flagsUsed,
        boardHashBytes,
        txOptions
      );
      
      await tx.wait();
      return tx.hash;
    } catch (error: any) {
      throw this.handleContractError(error, 'Failed to submit game');
    }
  }

  async claimReward(gameId: number, options?: TransactionOptions): Promise<string> {
    const contract = await this.getGameContract();
    
    const txOptions: any = {};
    if (options?.gasLimit) txOptions.gasLimit = options.gasLimit;
    if (options?.gasPrice) txOptions.gasPrice = options.gasPrice;

    try {
      const tx = await contract.claimReward(gameId, txOptions);
      await tx.wait();
      return tx.hash;
    } catch (error: any) {
      throw this.handleContractError(error, 'Failed to claim reward');
    }
  }

  async getGame(gameId: number): Promise<any> {
    const contract = await this.getGameContract();
    
    try {
      const gameData = await contract.getGame(gameId);
      return {
        player: gameData[0],
        rows: Number(gameData[1]),
        cols: Number(gameData[2]),
        mines: Number(gameData[3]),
        startTime: Number(gameData[4]),
        endTime: Number(gameData[5]),
        score: Number(gameData[6]),
        won: gameData[7],
        claimed: gameData[8]
      };
    } catch (error: any) {
      throw this.handleContractError(error, 'Failed to get game data');
    }
  }

  async getPlayerGames(playerAddress: string): Promise<number[]> {
    const contract = await this.getGameContract();
    
    try {
      const gameIds = await contract.getPlayerGames(playerAddress);
      return gameIds.map((id: any) => Number(id));
    } catch (error: any) {
      throw this.handleContractError(error, 'Failed to get player games');
    }
  }

  async getClaimableRewards(playerAddress: string): Promise<any[]> {
    const contract = await this.getGameContract();
    
    try {
      const [gameIds, amounts, reasons] = await contract.getClaimableRewards(playerAddress);
      
      return gameIds.map((gameId: any, index: number) => ({
        gameId: Number(gameId),
        amount: ethers.formatEther(amounts[index]),
        reason: reasons[index]
      }));
    } catch (error: any) {
      throw this.handleContractError(error, 'Failed to get claimable rewards');
    }
  }

  async getCurrentGameId(): Promise<number> {
    const contract = await this.getGameContract();
    
    try {
      const counter = await contract.gameCounter();
      return Number(counter);
    } catch (error: any) {
      throw this.handleContractError(error, 'Failed to get current game ID');
    }
  }

  private handleContractError(error: any, defaultMessage: string): Error {
    // Handle different types of contract errors
    if (error.code === 'CALL_EXCEPTION') {
      return new Error(`Contract call failed: ${error.reason || defaultMessage}`);
    }
    
    if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
      return new Error('Transaction would fail. Please check your parameters.');
    }
    
    if (error.code === 4001) {
      return new Error('Transaction rejected by user');
    }
    
    if (error.message?.includes('insufficient funds')) {
      return new Error('Insufficient funds for transaction');
    }
    
    return new Error(error.message || defaultMessage);
  }

  isContractInitialized(): boolean {
    return this.gameContract !== null && this.config !== null;
  }

  getContractAddress(): string | null {
    return this.config?.address || null;
  }
}