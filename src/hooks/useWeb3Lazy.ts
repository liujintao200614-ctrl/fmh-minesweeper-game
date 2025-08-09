import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';

// 动态导入 ethers，减少初始包大小
const loadEthers = () => import('ethers').then(module => module.ethers);

interface Web3State {
  provider: any | null;
  signer: any | null;
  account: string | null;
  chainId: number | null;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
}

export const useWeb3Lazy = () => {
  const [web3State, setWeb3State] = useState<Web3State>({
    provider: null,
    signer: null,
    account: null,
    chainId: null,
    isConnected: false,
    isLoading: false,
    error: null,
  });

  const [ethers, setEthers] = useState<any>(null);

  // 延迟加载 ethers
  useEffect(() => {
    loadEthers().then((ethersModule) => {
      setEthers(ethersModule);
    }).catch((error) => {
      console.error('Failed to load ethers:', error);
    });
  }, []);

  const MONAD_TESTNET_CHAIN_ID = parseInt(import.meta.env.VITE_CHAIN_ID || '10143');

  const connectWallet = useCallback(async () => {
    if (!ethers) {
      setWeb3State(prev => ({ ...prev, error: 'Ethers library not loaded yet' }));
      return;
    }

    setWeb3State(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      if (typeof window === 'undefined') {
        throw new Error('This application must run in a browser');
      }

      const ethereum = (window as any).ethereum;
      if (!ethereum) {
        throw new Error('MetaMask not detected. Please install MetaMask browser extension.');
      }

      // 检查MetaMask是否可用
      if (!ethereum.isMetaMask) {
        throw new Error('Please use MetaMask wallet to connect.');
      }

      // 请求连接账户
      const accounts = await ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('No wallet accounts available. Please unlock your wallet.');
      }

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

      console.log('Wallet connected successfully:', {
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
      let errorMessage = 'Failed to connect wallet';
      
      // 更详细的错误处理
      if (error.code === 4001) {
        errorMessage = 'Connection request was rejected. Please try again.';
      } else if (error.code === -32002) {
        errorMessage = 'Connection request is pending. Please check MetaMask and approve the connection.';
      } else if (error.code === -32603) {
        errorMessage = 'Internal error occurred. Please try refreshing the page.';
      } else if (error.message?.includes('not detected')) {
        errorMessage = 'MetaMask not detected. Please install MetaMask browser extension.';
      } else if (error.message?.includes('unlock')) {
        errorMessage = 'Please unlock your MetaMask wallet first.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      console.error('Wallet connection failed:', error);

      setWeb3State(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, [ethers]);

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
    ethersLoaded: !!ethers,
  };
};