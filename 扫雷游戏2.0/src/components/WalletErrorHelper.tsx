import React from 'react';
import styled from 'styled-components';

interface WalletErrorHelperProps {
  error: string | null;
  onRetry: () => void;
  onDismiss: () => void;
}

const ErrorContainer = styled.div`
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 8px;
  padding: 15px;
  margin: 10px 0;
  font-size: 14px;
`;

const ErrorTitle = styled.div`
  font-weight: bold;
  color: #856404;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ErrorMessage = styled.div`
  color: #856404;
  margin-bottom: 12px;
  line-height: 1.4;
`;

const SolutionBox = styled.div`
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 4px;
  padding: 10px;
  margin: 10px 0;
  font-size: 13px;
`;

const SolutionTitle = styled.div`
  font-weight: bold;
  color: #495057;
  margin-bottom: 5px;
`;

const SolutionStep = styled.div`
  margin: 3px 0;
  color: #6c757d;
  padding-left: 15px;
  position: relative;
  
  &:before {
    content: "•";
    position: absolute;
    left: 0;
    color: #007bff;
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 12px;
`;

const RetryButton = styled.button`
  background: #007bff;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  
  &:hover {
    background: #0056b3;
  }
`;

const DismissButton = styled.button`
  background: #6c757d;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  
  &:hover {
    background: #545b62;
  }
`;

const WalletErrorHelper: React.FC<WalletErrorHelperProps> = ({ error, onRetry, onDismiss }) => {
  if (!error) return null;

  const getSolutionForError = (errorMessage: string) => {
    const lowerError = errorMessage.toLowerCase();
    
    if (lowerError.includes('not detected') || lowerError.includes('not installed')) {
      return {
        title: '🦊 需要安装 MetaMask',
        steps: [
          '访问 metamask.io 下载并安装 MetaMask 浏览器扩展',
          '创建或导入你的钱包',
          '刷新此页面并重新连接'
        ]
      };
    }
    
    if (lowerError.includes('rejected') || lowerError.includes('user denied')) {
      return {
        title: '🚫 连接被拒绝',
        steps: [
          '点击 MetaMask 扩展图标',
          '选择 "连接" 或 "批准" 连接请求',
          '确保选择了正确的账户'
        ]
      };
    }
    
    if (lowerError.includes('already processing') || lowerError.includes('pending')) {
      return {
        title: '⏳ MetaMask 正在处理其他请求',
        steps: [
          '打开 MetaMask 扩展',
          '完成或取消正在等待的交易',
          '等待几秒钟后重试连接'
        ]
      };
    }
    
    if (lowerError.includes('unlock') || lowerError.includes('locked')) {
      return {
        title: '🔒 需要解锁 MetaMask',
        steps: [
          '点击 MetaMask 扩展图标',
          '输入密码解锁钱包',
          '返回此页面重新连接'
        ]
      };
    }
    
    if (lowerError.includes('network') || lowerError.includes('rpc')) {
      return {
        title: '🌐 网络连接问题',
        steps: [
          '检查互联网连接',
          '尝试切换到其他网络再切回来',
          '重启浏览器或清除缓存'
        ]
      };
    }
    
    return {
      title: '🔧 通用解决方案',
      steps: [
        '刷新页面重试',
        '重启 MetaMask 扩展',
        '检查 MetaMask 是否为最新版本',
        '清除浏览器缓存并重试'
      ]
    };
  };

  const solution = getSolutionForError(error);

  return (
    <ErrorContainer>
      <ErrorTitle>
        ⚠️ 钱包连接问题
      </ErrorTitle>
      
      <ErrorMessage>
        {error}
      </ErrorMessage>
      
      <SolutionBox>
        <SolutionTitle>{solution.title}</SolutionTitle>
        {solution.steps.map((step, index) => (
          <SolutionStep key={index}>{step}</SolutionStep>
        ))}
      </SolutionBox>
      
      <ButtonGroup>
        <RetryButton onClick={onRetry}>
          🔄 重试连接
        </RetryButton>
        <DismissButton onClick={onDismiss}>
          关闭
        </DismissButton>
      </ButtonGroup>
    </ErrorContainer>
  );
};

export default WalletErrorHelper;