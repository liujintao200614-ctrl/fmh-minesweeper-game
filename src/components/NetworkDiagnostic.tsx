import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { ethers } from 'ethers';

const DiagnosticPanel = styled.div`
  position: fixed;
  top: 20px;
  right: 20px;
  background: #1a1a1a;
  color: white;
  padding: 15px;
  border-radius: 8px;
  max-width: 400px;
  font-family: monospace;
  font-size: 12px;
  z-index: 9999;
  border: 1px solid #333;
  max-height: 80vh;
  overflow-y: auto;
`;

const StatusItem = styled.div<{ status: 'success' | 'error' | 'warning' | 'loading' }>`
  margin: 5px 0;
  padding: 5px;
  border-radius: 4px;
  background: ${props => {
    switch (props.status) {
      case 'success': return '#1a5b1a';
      case 'error': return '#5b1a1a';
      case 'warning': return '#5b5b1a';
      case 'loading': return '#1a1a5b';
      default: return 'transparent';
    }
  }};
`;

const CloseButton = styled.button`
  position: absolute;
  top: 5px;
  right: 5px;
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  font-size: 16px;
`;

interface DiagnosticResult {
  metaMaskDetected: boolean;
  connected: boolean;
  currentChainId: number | null;
  targetChainId: number;
  isCorrectNetwork: boolean;
  rpcConnectivity: boolean;
  balance: string | null;
  contractsExist: {
    minesweeper: boolean;
    token: boolean;
  };
  error: string | null;
}

export const NetworkDiagnostic: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [diagnostic, setDiagnostic] = useState<DiagnosticResult>({
    metaMaskDetected: false,
    connected: false,
    currentChainId: null,
    targetChainId: 10143,
    isCorrectNetwork: false,
    rpcConnectivity: false,
    balance: null,
    contractsExist: {
      minesweeper: false,
      token: false,
    },
    error: null,
  });
  
  const [isRunning, setIsRunning] = useState(false);

  const runDiagnostic = async () => {
    setIsRunning(true);
    const result: DiagnosticResult = {
      metaMaskDetected: false,
      connected: false,
      currentChainId: null,
      targetChainId: 10143,
      isCorrectNetwork: false,
      rpcConnectivity: false,
      balance: null,
      contractsExist: {
        minesweeper: false,
        token: false,
      },
      error: null,
    };

    try {
      // 1. 检测MetaMask
      const ethereum = (window as any).ethereum;
      result.metaMaskDetected = !!ethereum;

      if (!ethereum) {
        result.error = 'MetaMask not detected';
        setDiagnostic(result);
        setIsRunning(false);
        return;
      }

      // 2. 检查连接状态
      try {
        const accounts = await ethereum.request({ method: 'eth_accounts' });
        result.connected = accounts && accounts.length > 0;
      } catch (error) {
        console.error('Failed to get accounts:', error);
      }

      // 3. 获取当前链ID
      try {
        const chainId = await ethereum.request({ method: 'eth_chainId' });
        result.currentChainId = parseInt(chainId, 16);
        result.isCorrectNetwork = result.currentChainId === result.targetChainId;
      } catch (error) {
        console.error('Failed to get chain ID:', error);
      }

      // 4. 测试RPC连接
      try {
        const provider = new ethers.JsonRpcProvider('https://testnet-rpc.monad.xyz');
        const blockNumber = await provider.getBlockNumber();
        result.rpcConnectivity = blockNumber > 0;
      } catch (error) {
        console.error('RPC connectivity test failed:', error);
      }

      // 5. 获取余额（如果连接）
      if (result.connected && result.isCorrectNetwork) {
        try {
          const provider = new ethers.BrowserProvider(ethereum);
          const signer = await provider.getSigner();
          const address = await signer.getAddress();
          const balance = await provider.getBalance(address);
          result.balance = ethers.formatEther(balance);
        } catch (error) {
          console.error('Failed to get balance:', error);
        }
      }

      // 6. 检查合约存在性
      try {
        const provider = new ethers.JsonRpcProvider('https://testnet-rpc.monad.xyz');
        
        const minesweeperCode = await provider.getCode(
          process.env.NEXT_PUBLIC_MINESWEEPER_CONTRACT || '0x4bE377d2bf2b3412b6eBF1b179314fd90adf9C27'
        );
        result.contractsExist.minesweeper = minesweeperCode !== '0x';

        const tokenCode = await provider.getCode(
          process.env.NEXT_PUBLIC_FMH_TOKEN_CONTRACT || '0x83aB028468ef2a5495Cc7964B3266437956231E2'
        );
        result.contractsExist.token = tokenCode !== '0x';
      } catch (error) {
        console.error('Failed to check contracts:', error);
      }

    } catch (error: any) {
      result.error = error.message;
    }

    setDiagnostic(result);
    setIsRunning(false);
  };

  const addMonadNetwork = async () => {
    const ethereum = (window as any).ethereum;
    if (!ethereum) return;

    try {
      await ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: '0x279f',
          chainName: 'Monad Testnet',
          nativeCurrency: {
            name: 'MON',
            symbol: 'MON',
            decimals: 18,
          },
          rpcUrls: ['https://testnet-rpc.monad.xyz'],
          blockExplorerUrls: ['https://testnet-explorer.monad.xyz'],
        }],
      });
      runDiagnostic(); // 重新运行诊断
    } catch (error) {
      console.error('Failed to add network:', error);
    }
  };

  const switchNetwork = async () => {
    const ethereum = (window as any).ethereum;
    if (!ethereum) return;

    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x279f' }],
      });
      runDiagnostic(); // 重新运行诊断
    } catch (error: any) {
      if (error.code === 4902) {
        // 网络不存在，添加它
        addMonadNetwork();
      } else {
        console.error('Failed to switch network:', error);
      }
    }
  };

  useEffect(() => {
    runDiagnostic();
  }, []);

  const getStatusIcon = (status: boolean | null) => {
    if (status === null) return '⏳';
    return status ? '✅' : '❌';
  };

  return (
    <DiagnosticPanel>
      <CloseButton onClick={onClose}>×</CloseButton>
      <h3>🔍 网络诊断</h3>
      
      <StatusItem status={diagnostic.metaMaskDetected ? 'success' : 'error'}>
        {getStatusIcon(diagnostic.metaMaskDetected)} MetaMask检测
      </StatusItem>
      
      <StatusItem status={diagnostic.connected ? 'success' : 'warning'}>
        {getStatusIcon(diagnostic.connected)} 钱包连接
      </StatusItem>
      
      <StatusItem status={diagnostic.isCorrectNetwork ? 'success' : 'error'}>
        {getStatusIcon(diagnostic.isCorrectNetwork)} 网络正确性
        <div>当前: {diagnostic.currentChainId || '未知'} | 目标: {diagnostic.targetChainId}</div>
      </StatusItem>
      
      <StatusItem status={diagnostic.rpcConnectivity ? 'success' : 'error'}>
        {getStatusIcon(diagnostic.rpcConnectivity)} RPC连接
      </StatusItem>
      
      <StatusItem status={diagnostic.contractsExist.minesweeper ? 'success' : 'warning'}>
        {getStatusIcon(diagnostic.contractsExist.minesweeper)} Minesweeper合约
      </StatusItem>
      
      <StatusItem status={diagnostic.contractsExist.token ? 'success' : 'warning'}>
        {getStatusIcon(diagnostic.contractsExist.token)} FMH Token合约
      </StatusItem>
      
      {diagnostic.balance && (
        <StatusItem status="success">
          💰 余额: {parseFloat(diagnostic.balance).toFixed(4)} MON
        </StatusItem>
      )}
      
      {diagnostic.error && (
        <StatusItem status="error">
          ❌ 错误: {diagnostic.error}
        </StatusItem>
      )}

      <div style={{ marginTop: '10px', display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
        <button onClick={runDiagnostic} disabled={isRunning} style={{ fontSize: '10px', padding: '5px' }}>
          {isRunning ? '运行中...' : '重新检测'}
        </button>
        
        {!diagnostic.isCorrectNetwork && diagnostic.metaMaskDetected && (
          <button onClick={switchNetwork} style={{ fontSize: '10px', padding: '5px' }}>
            切换网络
          </button>
        )}
        
        {!diagnostic.metaMaskDetected && (
          <a 
            href="https://metamask.io/download/" 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ fontSize: '10px', padding: '5px', color: '#4CAF50' }}
          >
            安装MetaMask
          </a>
        )}
      </div>
    </DiagnosticPanel>
  );
};