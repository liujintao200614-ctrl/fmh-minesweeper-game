import { ethers } from 'ethers';

export interface Web3ProviderConfig {
  chainId: number;
  chainName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls: string[];
}

export interface Web3State {
  isConnected: boolean;
  account: string | null;
  chainId: number | null;
  balance: string;
  isCorrectNetwork: boolean;
  isLoading: boolean;
  error: string | null;
  hasMetaMask: boolean;
}

export interface Web3Context {
  state: Web3State;
  connectWallet: () => Promise<string>;
  switchToMonadTestnet: () => Promise<void>;
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
}

export interface NetworkConfig {
  chainId: number;
  name: string;
  shortName: string;
  networkId: number;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpc: string[];
  faucets?: string[];
  explorers?: Array<{
    name: string;
    url: string;
    standard: string;
  }>;
}

export interface TransactionResult {
  hash: string;
  wait: () => Promise<ethers.TransactionReceipt>;
}

export interface ContractError {
  code: string;
  message: string;
  reason?: string;
  transaction?: any;
}