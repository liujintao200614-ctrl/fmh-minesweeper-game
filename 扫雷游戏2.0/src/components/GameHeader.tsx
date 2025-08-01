import React from 'react';
import styled from 'styled-components';

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

const HeaderContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: #f0f0f0;
  border: 2px inset #c0c0c0;
  margin-bottom: 20px;
`;

const InfoPanel = styled.div`
  display: flex;
  gap: 20px;
  align-items: center;
`;

const InfoItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px;
  background: #000;
  color: #ff0000;
  font-family: 'Courier New', monospace;
  font-size: 18px;
  font-weight: bold;
  border: 2px inset #c0c0c0;
  min-width: 60px;
`;

const InfoLabel = styled.div`
  color: #fff;
  font-size: 12px;
  margin-bottom: 4px;
`;

const StatusPanel = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
`;

const NewGameButton = styled.button`
  padding: 10px 20px;
  font-size: 16px;
  background: #c0c0c0;
  border: 2px outset #c0c0c0;
  cursor: pointer;
  
  &:hover {
    background: #d0d0d0;
  }
  
  &:active {
    border: 2px inset #c0c0c0;
  }
`;

const ClaimButton = styled.button`
  padding: 8px 16px;
  font-size: 14px;
  background: #4CAF50;
  color: white;
  border: 2px outset #4CAF50;
  cursor: pointer;
  border-radius: 4px;
  
  &:hover {
    background: #45a049;
  }
  
  &:active {
    border: 2px inset #4CAF50;
  }
  
  &:disabled {
    background: #cccccc;
    cursor: not-allowed;
  }
`;

const LeaderboardButton = styled.button`
  padding: 8px 16px;
  font-size: 14px;
  background: #2196F3;
  color: white;
  border: 2px outset #2196F3;
  cursor: pointer;
  border-radius: 4px;
  margin-top: 5px;
  
  &:hover {
    background: #1976D2;
  }
  
  &:active {
    border: 2px inset #2196F3;
  }
`;

const StatusEmoji = styled.div`
  font-size: 32px;
`;

const ScoreDisplay = styled.div`
  font-size: 16px;
  color: #333;
  margin-top: 5px;
`;

const MobileInstructions = styled.div`
  font-size: 14px;
  color: #333;
  margin: 10px 0;
  padding: 12px;
  background: #e3f2fd;
  border: 2px solid #2196F3;
  border-radius: 8px;
  text-align: center;
  line-height: 1.4;
  display: none; /* 默认隐藏 */
  
  strong {
    color: #1976D2;
    font-size: 16px;
  }
  
  @media (max-width: 768px) {
    display: block; /* 手机端显示 */
  }
`;

const FlagModeButton = styled.button<{$active: boolean}>`
  padding: 12px 20px;
  font-size: 16px;
  font-weight: bold;
  background: ${(props) => props.$active ? '#ff9800' : '#4CAF50'};
  color: white;
  border: 3px solid ${(props) => props.$active ? '#f57c00' : '#45a049'};
  cursor: pointer;
  border-radius: 8px;
  margin: 8px 0;
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
  transition: all 0.2s ease;
  display: none; /* 默认隐藏 */
  
  @media (max-width: 768px) {
    display: block; /* 手机端显示 */
  }
  
  &:hover {
    background: ${(props) => props.$active ? '#f57c00' : '#45a049'};
    transform: translateY(-2px);
    box-shadow: 0 6px 12px rgba(0,0,0,0.3);
  }
  
  &:active {
    transform: translateY(0);
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
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
          📱 <strong>手机操作:</strong><br/>
          🚩 长按格子 = 插旗/取消旗子<br/>
          💣 点击格子 = 挖雷
        </MobileInstructions>
        <FlagModeButton 
          $active={flagMode}
          onClick={onToggleFlagMode || (() => {})}
        >
          {flagMode ? '🚩 插旗模式' : '💣 挖雷模式'}
        </FlagModeButton>
      </StatusPanel>
    </HeaderContainer>
  );
};

export default GameHeader;