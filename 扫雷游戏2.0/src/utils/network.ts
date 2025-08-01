// 网络配置工具
interface NetworkConfig {
  chainId: string;
  chainName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls: string[];
}

export const MONAD_TESTNET_CONFIG: NetworkConfig = {
  chainId: '0x279f', // 10143 in hex (实际验证的Chain ID)
  chainName: 'Monad Testnet',
  nativeCurrency: {
    name: 'MON',
    symbol: 'MON',
    decimals: 18,
  },
  rpcUrls: ['https://testnet-rpc.monad.xyz'],
  blockExplorerUrls: ['https://testnet-explorer.monad.xyz'],
};

export class NetworkManager {
  private static ethereum = typeof window !== 'undefined' ? (window as any).ethereum : null;

  // 添加Monad测试网到MetaMask
  static async addMonadTestnet(): Promise<boolean> {
    if (!this.ethereum) {
      throw new Error('MetaMask not found');
    }

    try {
      await this.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [MONAD_TESTNET_CONFIG],
      });

      return true;
    } catch (error: any) {
      // 用户拒绝添加网络
      if (error.code === 4001) {
        return false;
      }
      
      throw error;
    }
  }

  // 切换到Monad测试网
  static async switchToMonadTestnet(): Promise<boolean> {
    if (!this.ethereum) {
      throw new Error('MetaMask not found');
    }

    try {
      await this.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: MONAD_TESTNET_CONFIG.chainId }],
      });

      return true;
    } catch (error: any) {
      // 网络不存在，尝试添加
      if (error.code === 4902) {
        return await this.addMonadTestnet();
      }
      
      // 用户拒绝切换网络
      if (error.code === 4001) {
        return false;
      }
      
      throw error;
    }
  }

  // 检查当前网络是否为Monad测试网
  static async isOnMonadTestnet(): Promise<boolean> {
    if (!this.ethereum) {
      return false;
    }

    try {
      const chainId = await this.ethereum.request({
        method: 'eth_chainId',
      });
      
      return chainId === MONAD_TESTNET_CONFIG.chainId;
    } catch (error) {
      return false;
    }
  }

  // 确保用户在正确的网络上
  static async ensureCorrectNetwork(): Promise<boolean> {
    const isCorrectNetwork = await this.isOnMonadTestnet();
    
    if (!isCorrectNetwork) {
      return await this.switchToMonadTestnet();
    }
    
    return true;
  }

  // 获取网络信息
  static getNetworkInfo() {
    return {
      chainId: parseInt(MONAD_TESTNET_CONFIG.chainId, 16),
      chainIdHex: MONAD_TESTNET_CONFIG.chainId,
      chainName: MONAD_TESTNET_CONFIG.chainName,
      rpcUrl: MONAD_TESTNET_CONFIG.rpcUrls[0],
      explorerUrl: MONAD_TESTNET_CONFIG.blockExplorerUrls[0],
    };
  }
}

// React钩子
export const useNetwork = () => {
  return {
    addMonadTestnet: NetworkManager.addMonadTestnet,
    switchToMonadTestnet: NetworkManager.switchToMonadTestnet,
    isOnMonadTestnet: NetworkManager.isOnMonadTestnet,
    ensureCorrectNetwork: NetworkManager.ensureCorrectNetwork,
    networkInfo: NetworkManager.getNetworkInfo(),
  };
};