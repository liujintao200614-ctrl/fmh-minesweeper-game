import React from 'react';
import styled from 'styled-components';
import { FlexBox, Button, Text, Card } from './ResponsiveLayout';

interface GameHeaderProps {
  mineCount: number;
  flagCount: number;
  timeElapsed: number;
  gameStatus: string;
  score: number;
  onNewGame: () => void;
  onClaimReward?: () => void;
  canClaimReward?: boolean;
  onShowLeaderboard?: () => void;
  flagMode?: boolean;
  onToggleFlagMode?: () => void;
}

const HeaderContainer = styled(Card)`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(245, 248, 255, 0.95) 100%);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(102, 126, 234, 0.1);
  margin-bottom: 1rem;
  
  @media (max-width: 768px) {
    flex-direction: column;
    gap: 1rem;
    padding: 1rem;
  }
`;

const InfoPanel = styled(FlexBox)`
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
  
  @media (max-width: 768px) {
    justify-content: center;
    width: 100%;
  }
`;

const InfoItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem 0.75rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', monospace;
  font-size: 1.125rem;
  font-weight: 700;
  border-radius: 8px;
  min-width: 80px;
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
  
  @media (max-width: 768px) {
    min-width: 70px;
    padding: 0.75rem 0.5rem;
    font-size: 1rem;
  }
`;

const InfoLabel = styled(Text)`
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.75rem;
  font-weight: 500;
  margin-bottom: 0.25rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  
  @media (max-width: 768px) {
    font-size: 0.7rem;
  }
`;

const StatusPanel = styled(FlexBox)`
  direction: column;
  align: center;
  gap: 0.75rem;
  
  @media (max-width: 768px) {
    width: 100%;
  }
`;

const NewGameButton = styled(Button)`
  font-size: 1rem;
  font-weight: 600;
  
  @media (max-width: 768px) {
    width: 100%;
  }
`;

const ClaimButton = styled(Button)`
  background: linear-gradient(45deg, #4CAF50, #45a049) !important;
  font-size: 0.875rem;
  
  &:hover:not(:disabled) {
    box-shadow: 0 4px 12px rgba(76, 175, 80, 0.4) !important;
  }
  
  @media (max-width: 768px) {
    width: 100%;
  }
`;

const LeaderboardButton = styled(Button)`
  background: linear-gradient(45deg, #2196F3, #1976D2) !important;
  font-size: 0.875rem;
  
  &:hover:not(:disabled) {
    box-shadow: 0 4px 12px rgba(33, 150, 243, 0.4) !important;
  }
  
  @media (max-width: 768px) {
    width: 100%;
  }
`;

const StatusEmoji = styled.div`
  font-size: 2rem;
  
  @media (max-width: 768px) {
    font-size: 1.75rem;
  }
`;

const ScoreDisplay = styled(Text)`
  font-size: 0.875rem;
  color: #666;
  font-weight: 500;
  text-align: center;
  
  @media (max-width: 768px) {
    font-size: 0.8rem;
  }
`;

const MobileInstructions = styled(Card)`
  font-size: 0.875rem;
  color: #666;
  padding: 1rem;
  background: linear-gradient(135deg, rgba(33, 150, 243, 0.05) 0%, rgba(25, 118, 210, 0.1) 100%);
  border: 1px solid rgba(33, 150, 243, 0.2);
  text-align: center;
  line-height: 1.5;
  display: none;
  margin-top: 1rem;
  
  strong {
    color: #1976D2;
    font-weight: 600;
  }
  
  @media (max-width: 768px) {
    display: block;
  }
`;

const FlagModeButton = styled(Button)<{$active: boolean}>`
  background: ${(props) => props.$active 
    ? 'linear-gradient(45deg, #ff9800, #f57c00)' 
    : 'linear-gradient(45deg, #4CAF50, #45a049)'} !important;
  font-weight: 600;
  margin-top: 0.5rem;
  display: none;
  
  @media (max-width: 768px) {
    display: flex;
    width: 100%;
  }
  
  &:hover:not(:disabled) {
    box-shadow: ${(props) => props.$active 
      ? '0 4px 12px rgba(255, 152, 0, 0.4)' 
      : '0 4px 12px rgba(76, 175, 80, 0.4)'} !important;
  }
`;

const GameHeader: React.FC<GameHeaderProps> = ({
  mineCount,
  flagCount,
  timeElapsed,
  gameStatus,
  score,
  onNewGame,
  onClaimReward,
  canClaimReward,
  onShowLeaderboard,
  flagMode = false,
  onToggleFlagMode
}) => {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusEmoji = () => {
    switch (gameStatus) {
      case 'won': return '😎';
      case 'lost': return '😵';
      case 'playing': return '😐';
      default: return '🙂';
    }
  };

  const remainingMines = mineCount - flagCount;

  return (
    <HeaderContainer>
      <InfoPanel>
        <InfoItem>
          <InfoLabel>MINES</InfoLabel>
          <div>{remainingMines.toString().padStart(3, '0')}</div>
        </InfoItem>
        <InfoItem>
          <InfoLabel>FLAGS</InfoLabel>
          <div>{flagCount.toString().padStart(2, '0')}/{mineCount.toString().padStart(2, '0')}</div>
        </InfoItem>
        <InfoItem>
          <InfoLabel>TIME</InfoLabel>
          <div>{formatTime(timeElapsed)}</div>
        </InfoItem>
        <InfoItem>
          <InfoLabel>SCORE</InfoLabel>
          <div>{score.toString().padStart(4, '0')}</div>
        </InfoItem>
      </InfoPanel>
      
      <StatusPanel>
        <StatusEmoji>{getStatusEmoji()}</StatusEmoji>
        <NewGameButton onClick={onNewGame}>
          New Game
        </NewGameButton>
        {gameStatus === 'won' && canClaimReward && onClaimReward && (
          <ClaimButton onClick={onClaimReward}>
            Claim FMH Reward
          </ClaimButton>
        )}
        {onShowLeaderboard && (
          <LeaderboardButton onClick={onShowLeaderboard}>
            🏆 Leaderboard
          </LeaderboardButton>
        )}
        <ScoreDisplay>
          Status: {gameStatus.toUpperCase()}
        </ScoreDisplay>
        <MobileInstructions>
          📱 <strong>手机操作说明:</strong><br/>
          🚩 <strong>长按0.3秒</strong> = 插旗/取消旗子<br/>
          💣 <strong>轻点</strong> = 挖开格子<br/>
          ⚡ <strong>下方按钮</strong> = 切换操作模式<br/>
          💡 <strong>提示</strong>：使用插旗模式更简单
        </MobileInstructions>
        <FlagModeButton 
          $active={flagMode}
          onClick={onToggleFlagMode || (() => {})}
        >
          {flagMode ? '🚩 插旗模式 (点击插旗)' : '💣 挖雷模式 (长按插旗)'}
        </FlagModeButton>
      </StatusPanel>
    </HeaderContainer>
  );
};

export default GameHeader;