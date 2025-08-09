import React, { Component, ErrorInfo, ReactNode } from 'react';
import styled from 'styled-components';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

const ErrorContainer = styled.div`
  min-height: 400px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #f8f9fa;
  border: 2px solid #dc3545;
  border-radius: 8px;
  padding: 40px 20px;
  margin: 20px 0;
`;

const ErrorTitle = styled.h2`
  color: #dc3545;
  margin-bottom: 20px;
  text-align: center;
`;

const RetryButton = styled.button`
  background: #007bff;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 16px;
  margin: 20px 10px;
  transition: background-color 0.2s;

  &:hover {
    background: #0056b3;
  }
`;

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🚫 Error Boundary caught an error:', error, errorInfo);
    this.setState({ error });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <ErrorContainer>
          <ErrorTitle>🚫 应用程序遇到错误</ErrorTitle>
          <div style={{ textAlign: 'center', marginBottom: '20px' }}>
            <p>很抱歉，FMH 扫雷游戏遇到了一个意外错误。</p>
            <p>请尝试刷新页面。</p>
          </div>
          <RetryButton onClick={this.handleRetry}>
            🔄 重试
          </RetryButton>
        </ErrorContainer>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;