import { useState, useEffect, useCallback } from 'react';
import { Web3ProviderManager, MONAD_TESTNET_CONFIG } from '../services/web3/provider';

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

export const useWeb3 = () => {
  const [state, setState] = useState<Web3State>({
    isConnected: false,
    account: null,
    chainId: null,
    balance: '0',
    isCorrectNetwork: false,
    isLoading: false,
    error: null,
    hasMetaMask: false
  });

  const providerManager = Web3ProviderManager.getInstance();

  // 检查 MetaMask 是否可用
  const checkMetaMask = useCallback(async () => {
    try {
      const provider = await providerManager.detectProvider();
      setState(prev => ({ ...prev, hasMetaMask: !!provider }));
      return !!provider;
    } catch (error) {
      setState(prev => ({ ...prev, hasMetaMask: false, error: 'MetaMask not detected' }));
      return false;
    }
  }, [providerManager]);

  // 连接钱包
  const connectWallet = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const hasMetaMask = await checkMetaMask();
      if (!hasMetaMask) {
        throw new Error('Please install MetaMask');
      }

      const accounts = await providerManager.connect();
      const chainId = await providerManager.getCurrentChainId();
      const balance = await providerManager.getBalance();

      setState(prev => ({
        ...prev,
        isConnected: true,
        account: accounts[0] || null,
        chainId,
        balance,
        isCorrectNetwork: chainId === MONAD_TESTNET_CONFIG.chainId,
        isLoading: false
      }));

      return accounts[0];
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to connect wallet'
      }));
      throw error;
    }
  }, [checkMetaMask, providerManager]);

  // 切换到 Monad 测试网
  const switchToMonadTestnet = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      await providerManager.switchToMonadTestnet();
      const chainId = await providerManager.getCurrentChainId();
      
      setState(prev => ({
        ...prev,
        chainId,
        isCorrectNetwork: chainId === MONAD_TESTNET_CONFIG.chainId,
        isLoading: false
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error.message || 'Failed to switch network'
      }));
      throw error;
    }
  }, [providerManager]);

  // 断开连接
  const disconnect = useCallback(() => {
    setState({
      isConnected: false,
      account: null,
      chainId: null,
      balance: '0',
      isCorrectNetwork: false,
      isLoading: false,
      error: null,
      hasMetaMask: state.hasMetaMask
    });
    providerManager.removeAllListeners();
  }, [state.hasMetaMask, providerManager]);

  // 刷新余额
  const refreshBalance = useCallback(async () => {
    if (!state.isConnected) return;

    try {
      const balance = await providerManager.getBalance();
      setState(prev => ({ ...prev, balance }));
    } catch (error: any) {
      console.error('Failed to refresh balance:', error);
    }
  }, [state.isConnected, providerManager]);

  // 监听账户和网络变化
  useEffect(() => {
    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect();
      } else {
        setState(prev => ({ ...prev, account: accounts[0] }));
        refreshBalance();
      }
    };

    const handleChainChanged = (chainIdHex: string) => {
      const chainId = parseInt(chainIdHex, 16);
      setState(prev => ({
        ...prev,
        chainId,
        isCorrectNetwork: chainId === MONAD_TESTNET_CONFIG.chainId
      }));
    };

    providerManager.onAccountsChanged(handleAccountsChanged);
    providerManager.onChainChanged(handleChainChanged);

    return () => {
      providerManager.removeAllListeners();
    };
  }, [disconnect, refreshBalance, providerManager]);

  // 初始化检查
  useEffect(() => {
    checkMetaMask();
  }, [checkMetaMask]);

  return {
    ...state,
    connectWallet,
    switchToMonadTestnet,
    disconnect,
    refreshBalance,
    provider: providerManager.getProvider(),
    signer: providerManager.getSigner()
  };
};