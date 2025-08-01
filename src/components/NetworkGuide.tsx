import React, { useState } from 'react';
import styled from 'styled-components';

const GuideContainer = styled.div`
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 4px;
  padding: 8px 12px;
  margin: 5px 0;
  font-size: 12px;
`;

const GuideTitle = styled.div`
  color: #856404;
  margin: 0 0 6px 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-weight: bold;
  font-size: 13px;
`;

const StepContainer = styled.div`
  margin: 15px 0;
`;

const StepTitle = styled.h4`
  color: #495057;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ConfigBox = styled.div`
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 10px;
  font-family: 'Courier New', Courier, monospace;
  font-size: 14px;
  margin: 10px 0;
`;

const ConfigRow = styled.div`
  margin: 5px 0;
`;

const CopyButton = styled.button`
  background: #007bff;
  color: white;
  border: none;
  border-radius: 3px;
  padding: 2px 6px;
  font-size: 12px;
  cursor: pointer;
  margin-left: 8px;
  
  &:hover {
    background: #0056b3;
  }
`;

const CollapseButton = styled.button`
  background: none;
  border: none;
  color: #007bff;
  cursor: pointer;
  font-size: 11px;
  text-decoration: underline;
  padding: 0;
  
  &:hover {
    color: #0056b3;
  }
`;

const NetworkGuide: React.FC = () => {
  const [isExpanded, setIsExpanded] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('已复制到剪贴板');
    }).catch(() => {
      alert('复制失败，请手动复制');
    });
  };

  const networkConfig = {
    networkName: 'Monad Testnet',
    rpcUrl: 'https://testnet-rpc.monad.xyz',
    chainId: '10143',
    chainIdHex: '0x279f',
    symbol: 'MON',
    explorerUrl: 'https://testnet-explorer.monad.xyz'
  };

  return (
    <GuideContainer>
      <GuideTitle>
        <span>⚠️ 网络切换失败？</span>
        <CollapseButton onClick={() => setIsExpanded(!isExpanded)}>
          {isExpanded ? '隐藏配置' : '手动配置'}
        </CollapseButton>
      </GuideTitle>

      {isExpanded && (
        <div style={{ marginTop: '8px', fontSize: '11px', lineHeight: '1.4' }}>
          <div style={{ marginBottom: '6px' }}>
            <strong>Monad 测试网配置：</strong>
          </div>
          <div style={{ background: '#f8f9fa', padding: '6px', borderRadius: '3px', marginBottom: '6px' }}>
            网络名称: {networkConfig.networkName}<br/>
            RPC URL: {networkConfig.rpcUrl}<br/>
            链ID: {networkConfig.chainId}<br/>
            符号: {networkConfig.symbol}
          </div>
          <div style={{ color: '#666' }}>
            在MetaMask中手动添加网络 → 设置 → 网络 → 添加网络
          </div>
        </div>
      )}
    </GuideContainer>
  );
};

export default NetworkGuide;