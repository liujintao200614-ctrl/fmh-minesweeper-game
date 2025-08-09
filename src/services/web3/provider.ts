import { ethers } from 'ethers';
import detectEthereumProvider from '@metamask/detect-provider';

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

export const MONAD_TESTNET_CONFIG: Web3ProviderConfig = {
  chainId: 10143,  // 修复: 使用正确的 Monad 测试网 chainId
  chainName: 'Monad Testnet',
  nativeCurrency: {
    name: 'MON',
    symbol: 'MON', 
    decimals: 18
  },
  rpcUrls: ['https://testnet-rpc.monad.xyz'],
  blockExplorerUrls: ['https://testnet-explorer.monad.xyz']
};

export class Web3ProviderManager {
  private static instance: Web3ProviderManager;
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.JsonRpcSigner | null = null;
  private currentAccount: string | null = null;

  static getInstance(): Web3ProviderManager {
    if (!Web3ProviderManager.instance) {
      Web3ProviderManager.instance = new Web3ProviderManager();
    }
    return Web3ProviderManager.instance;
  }

  async detectProvider(): Promise<any> {
    const ethereumProvider = await detectEthereumProvider();
    return ethereumProvider;
  }

  async initialize(): Promise<void> {
    const ethereumProvider = await this.detectProvider();
    if (!ethereumProvider) {
      throw new Error('MetaMask not detected');
    }

    this.provider = new ethers.BrowserProvider(ethereumProvider, {
      name: 'Monad Testnet',
      chainId: MONAD_TESTNET_CONFIG.chainId,
      ensAddress: null, // 禁用 ENS 解析
    });
  }

  async connect(): Promise<string[]> {
    if (!this.provider) {
      await this.initialize();
    }

    const accounts = await this.provider!.send('eth_requestAccounts', []);
    if (accounts.length > 0) {
      this.currentAccount = accounts[0];
      this.signer = await this.provider!.getSigner();
    }
    return accounts;
  }

  async switchToMonadTestnet(): Promise<void> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    try {
      await this.provider.send('wallet_switchEthereumChain', [
        { chainId: `0x${MONAD_TESTNET_CONFIG.chainId.toString(16)}` }
      ]);
    } catch (error: any) {
      if (error.code === 4902) {
        await this.addMonadTestnet();
      } else {
        throw error;
      }
    }
  }

  private async addMonadTestnet(): Promise<void> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    await this.provider.send('wallet_addEthereumChain', [
      {
        chainId: `0x${MONAD_TESTNET_CONFIG.chainId.toString(16)}`,
        chainName: MONAD_TESTNET_CONFIG.chainName,
        nativeCurrency: MONAD_TESTNET_CONFIG.nativeCurrency,
        rpcUrls: MONAD_TESTNET_CONFIG.rpcUrls,
        blockExplorerUrls: MONAD_TESTNET_CONFIG.blockExplorerUrls
      }
    ]);
  }

  async getCurrentChainId(): Promise<number> {
    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    // 使用直接的 RPC 调用避免 ENS 解析
    const chainIdHex = await this.provider.send('eth_chainId', []);
    return parseInt(chainIdHex, 16);
  }

  getProvider(): ethers.BrowserProvider | null {
    return this.provider;
  }

  getSigner(): ethers.JsonRpcSigner | null {
    return this.signer;
  }

  getCurrentAccount(): string | null {
    return this.currentAccount;
  }

  async getBalance(): Promise<string> {
    if (!this.provider || !this.currentAccount) {
      return '0';
    }

    const balance = await this.provider.getBalance(this.currentAccount);
    return ethers.formatEther(balance);
  }

  onAccountsChanged(callback: (accounts: string[]) => void): void {
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', callback);
    }
  }

  onChainChanged(callback: (chainId: string) => void): void {
    if (window.ethereum) {
      window.ethereum.on('chainChanged', callback);
    }
  }

  removeAllListeners(): void {
    if (window.ethereum) {
      window.ethereum.removeAllListeners('accountsChanged');
      window.ethereum.removeAllListeners('chainChanged');
    }
  }
}