import React from 'react';
import styled, { keyframes } from 'styled-components';

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  padding: 20px;
  background: #f0f0f0;
  border: 2px inset #c0c0c0;
  border-radius: 8px;
  margin: 20px;
`;

const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 4px solid #e0e0e0;
  border-top: 4px solid #4CAF50;
  border-radius: 50%;
  animation: ${spin} 1s linear infinite;
  margin-bottom: 15px;
`;

const LoadingText = styled.p`
  color: #666;
  font-size: 16px;
  text-align: center;
  margin: 0;
`;

const SubText = styled.p`
  color: #999;
  font-size: 12px;
  text-align: center;
  margin: 5px 0 0 0;
`;

interface LoadingProps {
  message?: string;
  subMessage?: string;
}

const Loading: React.FC<LoadingProps> = ({ 
  message = "正在加载...", 
  subMessage = "首次访问可能需要更长时间" 
}) => {
  return (
    <LoadingContainer>
      <Spinner />
      <LoadingText>{message}</LoadingText>
      {subMessage && <SubText>{subMessage}</SubText>}
    </LoadingContainer>
  );
};

export default Loading;