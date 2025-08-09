import React from 'react';
import styled, { css } from 'styled-components';
import { ResponsiveContainer, ResponsiveButton, ResponsiveText, FlexGrid, media } from '@/styles/responsive';

interface ResponsiveGameHeaderProps {
  minesLeft: number;
  time: number;
  score: number;
  gameStatus: 'playing' | 'won' | 'lost';
  difficulty: string;
  onNewGame: () => void;
  onDifficultyChange: (difficulty: string) => void;
  onShowLeaderboard: () => void;
  isConnected: boolean;
  walletAddress?: string;
}

const HeaderContainer = styled(ResponsiveContainer)`
  background: #f0f0f0;
  border: 3px inset #c0c0c0;
  margin-bottom: 20px;
  padding: 15px 20px;

  ${media.tablet(css`
    padding: 12px 16px;
    margin-bottom: 15px;
  `)}

  ${media.mobile(css`
    padding: 10px 12px;
    margin-bottom: 10px;
  `)}
`;

const StatusRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;

  ${media.mobile(css`
    flex-direction: column;
    gap: 10px;
    margin-bottom: 10px;
  `)}
`;

const StatusItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 80px;

  ${media.mobile(css`
    min-width: 60px;
  `)}
`;

const StatusLabel = styled(ResponsiveText)`
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
  
  ${media.mobile(css`
    font-size: 11px;
  `)}
`;

const StatusValue = styled(ResponsiveText)<{ $highlight?: boolean }>`
  font-size: 18px;
  font-weight: bold;
  color: ${props => props.$highlight ? '#4CAF50' : '#333'};
  
  ${media.mobile(css`
    font-size: 16px;
  `)}
`;

const GameFace = styled.button<{ $status: string }>`
  width: 50px;
  height: 50px;
  border: 3px outset #c0c0c0;
  background: #c0c0c0;
  font-size: 24px;
  cursor: pointer;
  border-radius: 4px;
  
  &:active {
    border-style: inset;
  }

  ${media.mobile(css`
    width: 45px;
    height: 45px;
    font-size: 20px;
  `)}
`;

const ControlsRow = styled(FlexGrid)`
  grid-template-columns: 1fr auto auto;
  gap: 10px;
  align-items: center;

  ${media.mobile(css`
    grid-template-columns: 1fr;
    gap: 8px;
  `)}
`;

const DifficultySelector = styled.select`
  padding: 8px 12px;
  border: 2px inset #c0c0c0;
  background: #ffffff;
  font-size: 14px;
  border-radius: 4px;
  min-height: 44px;

  ${media.mobile(css`
    width: 100%;
    font-size: 16px; /* 防止iOS缩放 */
    padding: 12px 16px;
  `)}
`;

const WalletInfo = styled.div`
  background: rgba(76, 175, 80, 0.1);
  border: 1px solid #4CAF50;
  border-radius: 6px;
  padding: 8px 12px;
  margin-top: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;

  ${media.mobile(css`
    flex-direction: column;
    gap: 8px;
    text-align: center;
  `)}
`;

const WalletAddress = styled(ResponsiveText)`
  font-family: monospace;
  font-size: 12px;
  color: #4CAF50;
  
  ${media.mobile(css`
    font-size: 11px;
    word-break: break-all;
  `)}
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;

  ${media.mobile(css`
    width: 100%;
    
    & > * {
      flex: 1;
      min-width: 120px;
    }
  `)}
`;

export default function ResponsiveGameHeader({
  minesLeft,
  time,
  score,
  gameStatus,
  difficulty,
  onNewGame,
  onDifficultyChange,
  onShowLeaderboard,
  isConnected,
  walletAddress
}: ResponsiveGameHeaderProps) {
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getGameFaceEmoji = (): string => {
    switch (gameStatus) {
      case 'won': return '😎';
      case 'lost': return '😵';
      default: return '🙂';
    }
  };

  const formatScore = (score: number): string => {
    if (score >= 1000000) return `${(score / 1000000).toFixed(1)}M`;
    if (score >= 1000) return `${(score / 1000).toFixed(1)}K`;
    return score.toString();
  };

  const formatWalletAddress = (address: string): string => {
    if (window.innerWidth <= 480) {
      return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }
    return `${address.slice(0, 10)}...${address.slice(-8)}`;
  };

  return (
    <HeaderContainer>
      <StatusRow>
        <StatusItem>
          <StatusLabel>💣 地雷</StatusLabel>
          <StatusValue>{minesLeft}</StatusValue>
        </StatusItem>

        <GameFace
          $status={gameStatus}
          onClick={onNewGame}
          title="开始新游戏"
        >
          {getGameFaceEmoji()}
        </GameFace>

        <StatusItem>
          <StatusLabel>⏱️ 时间</StatusLabel>
          <StatusValue>{formatTime(time)}</StatusValue>
        </StatusItem>

        <StatusItem>
          <StatusLabel>🏆 分数</StatusLabel>
          <StatusValue $highlight={score > 0}>
            {formatScore(score)}
          </StatusValue>
        </StatusItem>
      </StatusRow>

      <ControlsRow>
        <DifficultySelector
          value={difficulty}
          onChange={(e) => onDifficultyChange(e.target.value)}
        >
          <option value="Easy">简单 (9×9)</option>
          <option value="Medium">中等 (16×16)</option>
          <option value="Hard">困难 (30×16)</option>
        </DifficultySelector>

        <ButtonGroup>
          <ResponsiveButton onClick={onNewGame} $primary>
            新游戏
          </ResponsiveButton>
          
          <ResponsiveButton onClick={onShowLeaderboard}>
            排行榜
          </ResponsiveButton>
        </ButtonGroup>
      </ControlsRow>

      {isConnected && walletAddress && (
        <WalletInfo>
          <div>
            <ResponsiveText $size="small" $weight="bold">
              🔗 已连接钱包
            </ResponsiveText>
            <WalletAddress>
              {formatWalletAddress(walletAddress)}
            </WalletAddress>
          </div>
          <ResponsiveText $size="small" style={{ color: '#4CAF50' }}>
            ⛓️ 区块链模式
          </ResponsiveText>
        </WalletInfo>
      )}
    </HeaderContainer>
  );
}