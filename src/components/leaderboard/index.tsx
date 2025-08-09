import React, { useState } from 'react';
import styled from 'styled-components';
import { useLeaderboard } from '../../hooks/useLeaderboard';
import LeaderboardControls from './LeaderboardControls';
import PlayerStats from './PlayerStats';
import LeaderboardTable from './LeaderboardTable';

interface LeaderboardProps {
  isVisible: boolean;
  onClose: () => void;
}

const LeaderboardContainer = styled.div<{ $isVisible: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: ${(props: { $isVisible: boolean }) => props.$isVisible ? 'flex' : 'none'};
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const LeaderboardModal = styled.div`
  background: #f0f0f0;
  border: 3px outset #c0c0c0;
  border-radius: 8px;
  padding: 20px;
  max-width: 900px;
  max-height: 80vh;
  overflow-y: auto;
  width: 90%;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 2px inset #c0c0c0;
`;

const Title = styled.h2`
  margin: 0;
  color: #333;
  font-size: 24px;
`;

const CloseButton = styled.button`
  padding: 8px 16px;
  background: #ff6b6b;
  color: white;
  border: 2px outset #ff6b6b;
  border-radius: 4px;
  cursor: pointer;
  
  &:hover {
    background: #ff5252;
  }
  
  &:active {
    border: 2px inset #ff6b6b;
  }
`;

const LoadingDiv = styled.div`
  text-align: center;
  padding: 40px;
  color: #666;
  font-size: 16px;
`;

const ErrorDiv = styled.div`
  text-align: center;
  padding: 40px;
  color: #ff6b6b;
  font-size: 16px;
  background: #ffe6e6;
  border: 1px solid #ffcccc;
  border-radius: 4px;
`;

const EmptyDiv = styled.div`
  text-align: center;
  padding: 40px;
  color: #999;
  font-size: 16px;
`;

const Leaderboard: React.FC<LeaderboardProps> = ({ isVisible, onClose }) => {
  const [leaderboardType, setLeaderboardType] = useState('wins');
  const [difficulty, setDifficulty] = useState('all');
  const [timeframe, setTimeframe] = useState('all_time');

  const { 
    leaderboard, 
    loading, 
    error, 
    meta,
    getTypeDisplayName,
    getTimeframeDisplayName,
    formatRankingValue
  } = useLeaderboard(leaderboardType, {
    difficulty,
    timeframe,
    limit: 20
  });

  return (
    <LeaderboardContainer $isVisible={isVisible}>
      <LeaderboardModal>
        <Header>
          <Title>🏆 游戏排行榜</Title>
          <CloseButton onClick={onClose}>关闭</CloseButton>
        </Header>

        <LeaderboardControls
          leaderboardType={leaderboardType}
          difficulty={difficulty}
          timeframe={timeframe}
          onTypeChange={setLeaderboardType}
          onDifficultyChange={setDifficulty}
          onTimeframeChange={setTimeframe}
        />

        <PlayerStats
          meta={meta}
          leaderboardType={leaderboardType}
          timeframe={timeframe}
          getTypeDisplayName={getTypeDisplayName}
          getTimeframeDisplayName={getTimeframeDisplayName}
        />

        {loading && <LoadingDiv>📊 加载排行榜数据...</LoadingDiv>}
        
        {error && <ErrorDiv>❌ 加载失败: {error}</ErrorDiv>}
        
        {!loading && !error && leaderboard.length === 0 && (
          <EmptyDiv>📭 暂无排行榜数据</EmptyDiv>
        )}

        {!loading && !error && leaderboard.length > 0 && (
          <LeaderboardTable
            leaderboard={leaderboard}
            leaderboardType={leaderboardType}
            getTypeDisplayName={getTypeDisplayName}
            formatRankingValue={formatRankingValue}
          />
        )}
      </LeaderboardModal>
    </LeaderboardContainer>
  );
};

export default Leaderboard;