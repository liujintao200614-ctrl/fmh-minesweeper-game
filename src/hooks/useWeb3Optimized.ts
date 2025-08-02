// 优化版本的 Web3 钩子，专门解决连接缓慢问题
import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

interface Web3State {
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  account: string | null;
  chainId: number | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  connectionSpeed: 'fast' | 'slow' | 'unknown';
}

// 连接性能监控
class Web3PerformanceMonitor {
  private connectionTimes: number[] = [];
  
  recordConnectionTime(time: number) {
    this.connectionTimes.push(time);
    // 只保留最近10次连接记录
    if (this.connectionTimes.length > 10) {
      this.connectionTimes.shift();
    }
  }
  
  getAverageConnectionTime(): number {
    if (this.connectionTimes.length === 0) return 0;
    return this.connectionTimes.reduce((a, b) => a + b) / this.connectionTimes.length;
  }
  
  getConnectionSpeed(): 'fast' | 'slow' | 'unknown' {
    const avg = this.getAverageConnectionTime();
    if (avg === 0) return 'unknown';
    if (avg < 2000) return 'fast'; // 小于2秒
    return 'slow';
  }
}

const performanceMonitor = new Web3PerformanceMonitor();

export const useWeb3Optimized = () => {
  const [web3State, setWeb3State] = useState<Web3State>({
    provider: null,
    signer: null,
    account: null,
    chainId: null,
    isConnected: false,
    isLoading: false,
    error: null,
    connectionSpeed: 'unknown',
  });

  const MONAD_TESTNET_CHAIN_ID = 10143;

  // 快速连接方法
  const fastConnect = useCallback(async () => {
    const startTime = Date.now();
    setWeb3State(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // 第一步：快速检查 MetaMask 是否可用
      const ethereum = (window as any).ethereum;
      if (!ethereum) {
        throw new Error('MetaMask not installed');
      }

      // 第二步：检查是否已经连接
      const accounts = await ethereum.request({ method: 'eth_accounts' });
      
      if (accounts.length === 0) {
        // 需要用户授权
        const newAccounts = await ethereum.request({ 
          method: 'eth_requestAccounts',
          timeout: 10000 // 10秒超时
        });
        accounts.push(...newAccounts);
      }

      // 第三步：快速初始化 provider，禁用 ENS
      const provider = new ethers.BrowserProvider(ethereum, {
        name: 'Monad Testnet',
        chainId: MONAD_TESTNET_CHAIN_ID,
        ensAddress: null, // 禁用 ENS
      });
      
      // 第四步：并行获取必要信息
      const promises = [
        provider.getSigner(),
        ethereum.request({ method: 'eth_chainId' }) // 直接获取 chainId，比 getNetwork 快
      ];

      const [signer, chainIdHex] = await Promise.race([
        Promise.all(promises),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), 8000)
        )
      ]) as [ethers.JsonRpcSigner, string];

      const chainId = parseInt(chainIdHex, 16);
      const connectionTime = Date.now() - startTime;
      
      // 记录连接性能
      performanceMonitor.recordConnectionTime(connectionTime);

      setWeb3State({
        provider,
        signer,
        account: accounts[0],
        chainId,
        isConnected: true,
        isLoading: false,
        error: null,
        connectionSpeed: performanceMonitor.getConnectionSpeed(),
      });

      // 后台检查网络（不阻塞）
      if (chainId !== MONAD_TESTNET_CHAIN_ID) {
        switchToMonadTestnet().catch(console.warn);
      }

      return true;
    } catch (error: any) {
      const connectionTime = Date.now() - startTime;
      performanceMonitor.recordConnectionTime(connectionTime);
      
      setWeb3State(prev => ({
        ...prev,
        isLoading: false,
        error: error.message,
        connectionSpeed: performanceMonitor.getConnectionSpeed(),
      }));
      
      return false;
    }
  }, []);

  // 带重试的连接方法
  const connectWithRetry = useCallback(async (maxRetries = 3) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`Connection attempt ${attempt}/${maxRetries}`);
      
      const success = await fastConnect();
      if (success) return true;
      
      if (attempt < maxRetries) {
        // 递增延迟重试
        await new Promise(resolve => setTimeout(resolve, attempt * 1000));
      }
    }
    return false;
  }, [fastConnect]);

  const switchToMonadTestnet = useCallback(async () => {
    try {
      const ethereum = (window as any).ethereum;
      if (!ethereum) return;

      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${MONAD_TESTNET_CHAIN_ID.toString(16)}` }],
      });
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await (window as any).ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${MONAD_TESTNET_CHAIN_ID.toString(16)}`,
              chainName: 'Monad Testnet',
              nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
              rpcUrls: ['https://testnet-rpc.monad.xyz'],
              blockExplorerUrls: ['https://testnet-explorer.monad.xyz'],
            }],
          });
        } catch (addError) {
          console.error('Failed to add Monad Testnet:', addError);
        }
      }
    }
  }, []);

  const disconnect = useCallback(() => {
    setWeb3State({
      provider: null,
      signer: null,
      account: null,
      chainId: null,
      isConnected: false,
      isLoading: false,
      error: null,
      connectionSpeed: performanceMonitor.getConnectionSpeed(),
    });
  }, []);

  // 页面加载时自动尝试连接
  useEffect(() => {
    const autoConnect = async () => {
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        try {
          const accounts = await (window as any).ethereum.request({ 
            method: 'eth_accounts' 
          });
          
          if (accounts.length > 0) {
            await fastConnect();
          }
        } catch (error) {
          console.warn('Auto-connect failed:', error);
        }
      }
    };

    autoConnect();
  }, [fastConnect]);

  // 监听钱包事件
  useEffect(() => {
    if (typeof window === 'undefined' || !(window as any).ethereum) return;

    const ethereum = (window as any).ethereum;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect();
      } else {
        setWeb3State(prev => ({ ...prev, account: accounts[0] }));
      }
    };

    const handleChainChanged = (chainId: string) => {
      setWeb3State(prev => ({ ...prev, chainId: parseInt(chainId, 16) }));
    };

    ethereum.on('accountsChanged', handleAccountsChanged);
    ethereum.on('chainChanged', handleChainChanged);

    return () => {
      ethereum.removeListener('accountsChanged', handleAccountsChanged);
      ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, [disconnect]);

  return {
    ...web3State,
    connectWallet: connectWithRetry,
    fastConnect,
    disconnect,
    switchToMonadTestnet,
    isOnCorrectNetwork: web3State.chainId === MONAD_TESTNET_CHAIN_ID,
  };
};