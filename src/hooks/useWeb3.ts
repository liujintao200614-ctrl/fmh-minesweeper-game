import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { NetworkManager } from '../utils/network';
import { connectMetaMaskSafely } from '../utils/waitForEthereum';

interface Web3State {
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  account: string | null;
  chainId: number | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
}

export const useWeb3 = () => {
  const [web3State, setWeb3State] = useState<Web3State>({
    provider: null,
    signer: null,
    account: null,
    chainId: null,
    isConnected: false,
    isLoading: false,
    error: null,
  });

  const MONAD_TESTNET_CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || '10143');

  const connectWallet = useCallback(async () => {
    console.log('🔄 Starting enhanced wallet connection...');
    setWeb3State(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      if (typeof window === 'undefined') {
        throw new Error('This application must run in a browser');
      }

      // 使用新的安全连接方法
      const { ethereum, accounts } = await connectMetaMaskSafely();

      // 创建provider和signer，禁用 ENS 解析
      const provider = new ethers.BrowserProvider(ethereum, {
        name: 'Monad Testnet',
        chainId: MONAD_TESTNET_CHAIN_ID,
        ensAddress: null, // 禁用 ENS
      });
      const signer = await provider.getSigner();

      // 获取当前网络 ID
      const currentChainId = await ethereum.request({ method: 'eth_chainId' });
      const numericChainId = parseInt(currentChainId, 16);

      console.log('✅ Wallet connected successfully:', {
        account: accounts[0],
        chainId: numericChainId,
        networkName: 'Monad Testnet'
      });

      setWeb3State({
        provider,
        signer,
        account: accounts[0],
        chainId: numericChainId,
        isConnected: true,
        isLoading: false,
        error: null,
      });

    } catch (error: any) {
      console.error('🚫 Enhanced wallet connection failed:', error);

      // 使用从 waitForEthereum 传递过来的错误信息，或添加兜底处理
      let errorMessage = error.message || 'Failed to connect wallet';
      
      // 确保错误信息包含有用的指导
      if (!errorMessage.includes('MetaMask') && !errorMessage.includes('extension')) {
        errorMessage += '\n\nPlease ensure:\n• MetaMask extension is installed and enabled\n• You approve the connection request\n• Your wallet is unlocked';
      }

      setWeb3State(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, []);

  const switchToMonadTestnet = useCallback(async () => {
    try {
      const ethereum = (window as any).ethereum;
      
      if (!ethereum) {
        console.error('MetaMask not available for network switch');
        return false;
      }
      
      const hexChainId = `0x${MONAD_TESTNET_CHAIN_ID.toString(16)}`;
      console.log('Attempting to switch to network:', hexChainId);
      
      try {
        // 尝试切换到目标网络
        await ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: hexChainId }],
        });
        
        console.log('Successfully switched to Monad Testnet');
        
        // 更新状态
        const currentChainId = await ethereum.request({ method: 'eth_chainId' });
        const numericChainId = parseInt(currentChainId, 16);
        setWeb3State(prev => ({
          ...prev,
          chainId: numericChainId,
        }));
        
        return true;
      } catch (switchError: any) {
        console.log('Switch error:', switchError);
        
        // 网络不存在，尝试添加
        if (switchError.code === 4902) {
          console.log('Network not found, attempting to add...');
          try {
            await ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: hexChainId,
                  chainName: 'Monad Testnet',
                  nativeCurrency: {
                    name: 'MON',
                    symbol: 'MON',
                    decimals: 18,
                  },
                  rpcUrls: ['https://testnet-rpc.monad.xyz'],
                  blockExplorerUrls: ['https://testnet-explorer.monad.xyz'],
                },
              ],
            });
            console.log('Network added successfully');
            return true;
          } catch (addError: any) {
            console.error('Failed to add network:', addError);
            return false;
          }
        } else if (switchError.code === 4001) {
          console.log('User rejected network switch');
          return false;
        } else {
          console.error('Unexpected switch error:', switchError);
          return false;
        }
      }
    } catch (error: any) {
      console.error('Network switch failed:', error);
      return false;
    }
  }, [MONAD_TESTNET_CHAIN_ID]);

  const disconnect = useCallback(() => {
    setWeb3State({
      provider: null,
      signer: null,
      account: null,
      chainId: null,
      isConnected: false,
      isLoading: false,
      error: null,
    });
  }, []);

  const clearError = useCallback(() => {
    setWeb3State(prev => ({ ...prev, error: null }));
  }, []);

  // 检查是否已连接并自动连接 - 使用新的等待逻辑
  const checkConnection = useCallback(async () => {
    if (typeof window === 'undefined') return;
    
    try {
      // 等待 ethereum 对象注入，但设置较短的超时时间用于自动连接检查
      const { waitForEthereum } = await import('../utils/waitForEthereum');
      const ethereum = await waitForEthereum(3000); // 3秒超时
      
      const accounts = await ethereum.request({ method: 'eth_accounts' });
      if (accounts && accounts.length > 0) {
        console.log('🔄 Auto-reconnecting to existing session...');
        await connectWallet();
      }
    } catch (error) {
      // 自动连接失败不是致命错误，只记录日志
      console.log('ℹ️ Auto-connection check completed (no existing connection found)');
    }
  }, [connectWallet]);

  // 页面加载时检查连接状态
  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  // 设置事件监听器
  useEffect(() => {
    const handleAccountsChanged = (accounts: string[]) => {
      console.log('Accounts changed:', accounts);
      if (accounts.length === 0) {
        console.log('No accounts available, disconnecting...');
        disconnect();
      } else {
        console.log('Account switched to:', accounts[0]);
        setWeb3State(prev => ({
          ...prev,
          account: accounts[0],
        }));
      }
    };

    const handleChainChanged = (chainId: string) => {
      const newChainId = parseInt(chainId, 16);
      console.log('Chain changed to:', newChainId);
      setWeb3State(prev => ({
        ...prev,
        chainId: newChainId,
      }));
      
      // 刷新页面以确保状态一致性
      if (web3State.isConnected) {
        console.log('Reloading page due to network change...');
        window.location.reload();
      }
    };

    const handleConnect = (connectInfo: any) => {
      console.log('MetaMask connected:', connectInfo);
    };

    const handleDisconnect = (error: any) => {
      console.log('MetaMask disconnected:', error);
      disconnect();
    };

    // 添加事件监听器
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      const ethereum = (window as any).ethereum;
      
      try {
        ethereum.on('accountsChanged', handleAccountsChanged);
        ethereum.on('chainChanged', handleChainChanged);
        ethereum.on('connect', handleConnect);
        ethereum.on('disconnect', handleDisconnect);
        
        console.log('MetaMask event listeners added successfully');
      } catch (error) {
        console.warn('Failed to add MetaMask event listeners:', error);
      }

      // 清理函数
      return () => {
        try {
          if (ethereum) {
            ethereum.removeListener('accountsChanged', handleAccountsChanged);
            ethereum.removeListener('chainChanged', handleChainChanged);
            ethereum.removeListener('connect', handleConnect);
            ethereum.removeListener('disconnect', handleDisconnect);
            console.log('MetaMask event listeners removed');
          }
        } catch (error) {
          console.warn('Failed to remove MetaMask event listeners:', error);
        }
      };
    }
  }, [disconnect, web3State.isConnected]);

  return {
    ...web3State,
    connectWallet,
    disconnect,
    clearError,
    switchToMonadTestnet,
    isOnCorrectNetwork: web3State.chainId === MONAD_TESTNET_CHAIN_ID,
  };
};