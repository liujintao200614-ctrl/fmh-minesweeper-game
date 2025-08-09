import React from 'react';
import styled from 'styled-components';

interface LeaderboardMeta {
  total_users: number;
  total_games: number;
  total_wins: number;
}

interface PlayerStatsProps {
  meta: LeaderboardMeta | null;
  leaderboardType: string;
  timeframe: string;
  getTypeDisplayName: (type: string) => string;
  getTimeframeDisplayName: (timeframe: string) => string;
}

const StatsBar = styled.div`
  background: #e0e0e0;
  padding: 10px 15px;
  border: 2px inset #c0c0c0;
  border-radius: 4px;
  margin-bottom: 15px;
  display: flex;
  justify-content: space-around;
  flex-wrap: wrap;
  gap: 10px;
`;

const StatItem = styled.div`
  text-align: center;
  
  .label {
    font-size: 12px;
    color: #666;
    margin-bottom: 2px;
  }
  
  .value {
    font-weight: bold;
    color: #333;
    font-size: 14px;
  }
`;

const PlayerStats: React.FC<PlayerStatsProps> = ({
  meta,
  leaderboardType,
  timeframe,
  getTypeDisplayName,
  getTimeframeDisplayName
}) => {
  if (!meta) return null;

  return (
    <StatsBar>
      <StatItem>
        <div className="label">总用户数</div>
        <div className="value">{meta.total_users}</div>
      </StatItem>
      <StatItem>
        <div className="label">总游戏数</div>
        <div className="value">{meta.total_games}</div>
      </StatItem>
      <StatItem>
        <div className="label">总胜利数</div>
        <div className="value">{meta.total_wins}</div>
      </StatItem>
      <StatItem>
        <div className="label">当前显示</div>
        <div className="value">
          {getTypeDisplayName(leaderboardType)} - {getTimeframeDisplayName(timeframe)}
        </div>
      </StatItem>
    </StatsBar>
  );
};

export default PlayerStats;