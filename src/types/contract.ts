import { ethers } from 'ethers';

export interface GameConfig {
  rows: number;
  cols: number;
  mines: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface GameResult {
  won: boolean;
  score: number;
  timeElapsed: number;
  moves: number;
  flagsUsed: number;
  efficiency: number;
}

export interface ContractGameData {
  player: string;
  rows: number;
  cols: number;
  mines: number;
  startTime: number;
  endTime: number;
  score: number;
  won: boolean;
  claimed: boolean;
}

export interface ClaimableReward {
  amount: string;
  reason: string;
  gameId: number;
}

export interface GameContract extends ethers.Contract {
  startGame: (rows: number, cols: number, mines: number) => Promise<ethers.ContractTransactionResponse>;
  submitGame: (
    gameId: number,
    won: boolean,
    score: number,
    timeElapsed: number,
    moves: number,
    flagsUsed: number,
    boardHash: string
  ) => Promise<ethers.ContractTransactionResponse>;
  claimReward: (gameId: number) => Promise<ethers.ContractTransactionResponse>;
  getGame: (gameId: number) => Promise<ContractGameData>;
  getPlayerGames: (player: string) => Promise<number[]>;
  getClaimableRewards: (player: string) => Promise<ClaimableReward[]>;
  gameCounter: () => Promise<number>;
}

export interface ContractConfig {
  address: string;
  abi: any[];
}

export interface TransactionOptions {
  gasLimit?: number;
  gasPrice?: string;
  value?: string;
}