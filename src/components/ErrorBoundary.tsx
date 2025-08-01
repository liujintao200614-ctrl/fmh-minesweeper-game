import React, { Component, ErrorInfo, ReactNode } from 'react';
import styled from 'styled-components';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

const ErrorContainer = styled.div`
  padding: 20px;
  margin: 20px;
  border: 2px solid #ff0000;
  border-radius: 8px;
  background: #ffe6e6;
  text-align: center;
`;

const ErrorTitle = styled.h2`
  color: #cc0000;
  margin-bottom: 10px;
`;

const ErrorMessage = styled.p`
  color: #666;
  margin-bottom: 15px;
`;

const RetryButton = styled.button`
  padding: 10px 20px;
  background: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  
  &:hover {
    background: #45a049;
  }
`;

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    // 如果是 MetaMask 相关错误，不设置错误状态
    const errorStr = String(error?.message || error || '');
    const stackStr = String(error?.stack || '');
    
    if (errorStr.includes('MetaMask') || 
        errorStr.includes('ethereum') ||
        errorStr.includes('Failed to connect') ||
        errorStr.includes('chrome-extension') ||
        stackStr.includes('chrome-extension')) {
      return { hasError: false, error: null };
    }
    
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const errorStr = String(error?.message || error || '');
    const stackStr = String(error?.stack || '');
    
    // 如果是 MetaMask 相关错误，静默处理
    if (errorStr.includes('MetaMask') || 
        errorStr.includes('ethereum') ||
        errorStr.includes('Failed to connect') ||
        errorStr.includes('chrome-extension') ||
        stackStr.includes('chrome-extension')) {
      console.warn('MetaMask error caught by ErrorBoundary and suppressed:', errorStr);
      this.setState({ hasError: false, error: null });
      return;
    }
    
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      // 不显示 MetaMask 相关错误的错误页面
      if (this.state.error.message?.includes('MetaMask') || 
          this.state.error.message?.includes('ethereum') ||
          this.state.error.message?.includes('Failed to connect')) {
        return this.props.children;
      }

      return (
        <ErrorContainer>
          <ErrorTitle>Oops! Something went wrong</ErrorTitle>
          <ErrorMessage>
            We encountered an unexpected error. Please try refreshing the page.
          </ErrorMessage>
          <RetryButton onClick={this.handleRetry}>
            Try Again
          </RetryButton>
        </ErrorContainer>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;