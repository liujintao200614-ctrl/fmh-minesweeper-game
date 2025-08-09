import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { useNetwork } from '../utils/network';

const StatusContainer = styled.div`
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  padding: 8px 12px;
  margin: 5px 0;
  border-radius: 4px;
  font-size: 13px;
`;

const StatusItem = styled.div<{ $status: 'success' | 'warning' | 'error' }>`
  margin: 2px 0;
  padding: 3px 6px;
  border-radius: 3px;
  font-size: 12px;
  display: inline-block;
  margin-right: 8px;
  background: ${props => {
    switch (props.$status) {
      case 'success': return '#d1ecf1';
      case 'warning': return '#fff3cd';
      case 'error': return '#f8d7da';
      default: return 'transparent';
    }
  }};
  color: ${props => {
    switch (props.$status) {
      case 'success': return '#0c5460';
      case 'warning': return '#856404';
      case 'error': return '#721c24';
      default: return '#000';
    }
  }};
`;

const ActionButton = styled.button`
  padding: 4px 8px;
  margin: 2px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 11px;
  
  &:hover {
    background: #0056b3;
  }
  
  &:disabled {
    background: #6c757d;
    cursor: not-allowed;
  }
`;

const NetworkStatus: React.FC = () => {
  const [isOnCorrectNetwork, setIsOnCorrectNetwork] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [currentChainId, setCurrentChainId] = useState<string>('');
  const { isOnMonadTestnet, switchToMonadTestnet, networkInfo } = useNetwork();

  const checkNetwork = async () => {
    setIsChecking(true);
    try {
      // 检查是否在浏览器环境且有ethereum对象
      if (typeof window === 'undefined' || !(window as any).ethereum) {
        setIsOnCorrectNetwork(false);
        setIsChecking(false);
        return;
      }
      
      const correct = await isOnMonadTestnet();
      setIsOnCorrectNetwork(correct);
      
      // 获取当前链ID
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        const chainId = await (window as any).ethereum.request({
          method: 'eth_chainId',
        });
        setCurrentChainId(chainId);
      }
    } catch (error) {
      console.error('Failed to check network:', error);
      setIsOnCorrectNetwork(false);
    } finally {
      setIsChecking(false);
    }
  };

  const handleSwitchNetwork = async () => {
    setIsChecking(true);
    try {
      await switchToMonadTestnet();
      await checkNetwork();
    } catch (error) {
      console.error('Failed to switch network:', error);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    // 延迟检查，确保MetaMask已注入
    const delayedCheck = setTimeout(() => {
      checkNetwork();
    }, 1000);

    // 监听网络变化
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      const handleChainChanged = () => {
        checkNetwork();
      };

      (window as any).ethereum.on('chainChanged', handleChainChanged);
      return () => {
        clearTimeout(delayedCheck);
        (window as any).ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }

    return () => {
      clearTimeout(delayedCheck);
    };
  }, []);

  return (
    <StatusContainer>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontWeight: 'bold', fontSize: '12px' }}>🌐 网络:</span>
          {currentChainId && (
            <StatusItem $status={isOnCorrectNetwork ? "success" : "warning"}>
              {currentChainId} {isOnCorrectNetwork ? '✅' : '⚠️'}
            </StatusItem>
          )}
          <StatusItem $status="success">
            目标: {networkInfo.chainName}
          </StatusItem>
        </div>
        
        <div style={{ display: 'flex', gap: '4px' }}>
          <ActionButton onClick={checkNetwork} disabled={isChecking}>
            {isChecking ? '检查中' : '检查'}
          </ActionButton>
          
          {isOnCorrectNetwork === false && (
            <ActionButton onClick={handleSwitchNetwork} disabled={isChecking}>
              {isChecking ? '切换中' : '切换网络'}
            </ActionButton>
          )}
        </div>
      </div>
      
      {isOnCorrectNetwork === false && (
        <div style={{ marginTop: '4px', fontSize: '11px', color: '#721c24' }}>
          ⚠️ 请切换到Monad测试网以使用游戏功能
        </div>
      )}
    </StatusContainer>
  );
};

export default NetworkStatus;