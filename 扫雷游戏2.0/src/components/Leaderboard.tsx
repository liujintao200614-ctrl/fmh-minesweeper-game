import React, { useState } from 'react';
import styled from 'styled-components';
import { useLeaderboard } from '@/hooks/useLeaderboard';

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

const Controls = styled.div`
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
  flex-wrap: wrap;
  align-items: center;
`;

const ControlGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
`;

const Label = styled.label`
  font-weight: bold;
  font-size: 14px;
  color: #333;
`;

const Select = styled.select`
  padding: 6px 12px;
  border: 2px inset #c0c0c0;
  border-radius: 4px;
  background: white;
  font-size: 14px;
`;

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

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  background: white;
  border: 2px inset #c0c0c0;
`;

const TableHeader = styled.th`
  background: #d0d0d0;
  padding: 12px 8px;
  text-align: left;
  border: 1px solid #999;
  font-weight: bold;
  font-size: 14px;
  color: #333;
`;

const TableRow = styled.tr<{ $isEven?: boolean }>`
  background: ${props => props.$isEven ? '#f8f8f8' : 'white'};
  
  &:hover {
    background: #e8f4fd;
  }
`;

const TableCell = styled.td`
  padding: 10px 8px;
  border: 1px solid #ddd;
  font-size: 14px;
  
  &.rank {
    font-weight: bold;
    text-align: center;
    width: 50px;
  }
  
  &.address {
    font-family: monospace;
    font-size: 12px;
  }
  
  &.number {
    text-align: right;
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

  const formatAddress = (address: string): string => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getRankIcon = (rank: number): string => {
    switch (rank) {
      case 1: return '🥇';
      case 2: return '🥈'; 
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  };

  return (
    <LeaderboardContainer $isVisible={isVisible}>
      <LeaderboardModal>
        <Header>
          <Title>🏆 游戏排行榜</Title>
          <CloseButton onClick={onClose}>关闭</CloseButton>
        </Header>

        <Controls>
          <ControlGroup>
            <Label>排行类型</Label>
            <Select 
              value={leaderboardType} 
              onChange={(e) => setLeaderboardType(e.target.value)}
            >
              <option value="wins">胜利次数</option>
              <option value="score">最高分数</option>
              <option value="time">最快时间</option>
              <option value="rewards">获得奖励</option>
            </Select>
          </ControlGroup>

          <ControlGroup>
            <Label>难度等级</Label>
            <Select 
              value={difficulty} 
              onChange={(e) => setDifficulty(e.target.value)}
            >
              <option value="all">所有难度</option>
              <option value="easy">简单</option>
              <option value="medium">中等</option>
              <option value="hard">困难</option>
            </Select>
          </ControlGroup>

          <ControlGroup>
            <Label>时间范围</Label>
            <Select 
              value={timeframe} 
              onChange={(e) => setTimeframe(e.target.value)}
            >
              <option value="all_time">历史记录</option>
              <option value="monthly">本月</option>
              <option value="weekly">本周</option>
              <option value="daily">今日</option>
            </Select>
          </ControlGroup>
        </Controls>

        {meta && (
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
        )}

        {loading && <LoadingDiv>📊 加载排行榜数据...</LoadingDiv>}
        
        {error && <ErrorDiv>❌ 加载失败: {error}</ErrorDiv>}
        
        {!loading && !error && leaderboard.length === 0 && (
          <EmptyDiv>📭 暂无排行榜数据</EmptyDiv>
        )}

        {!loading && !error && leaderboard.length > 0 && (
          <Table>
            <thead>
              <tr>
                <TableHeader>排名</TableHeader>
                <TableHeader>玩家</TableHeader>
                <TableHeader>用户名</TableHeader>
                <TableHeader>{getTypeDisplayName(leaderboardType)}</TableHeader>
                <TableHeader>总胜利</TableHeader>
                <TableHeader>最高分</TableHeader>
                <TableHeader>成就数</TableHeader>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((entry, index) => (
                <TableRow key={entry.id} $isEven={index % 2 === 0}>
                  <TableCell className="rank">
                    {getRankIcon(entry.rank)}
                  </TableCell>
                  <TableCell className="address">
                    {formatAddress(entry.wallet_address)}
                  </TableCell>
                  <TableCell>
                    {entry.display_name}
                  </TableCell>
                  <TableCell className="number">
                    {formatRankingValue(entry, leaderboardType)}
                  </TableCell>
                  <TableCell className="number">
                    {entry.total_wins}
                  </TableCell>
                  <TableCell className="number">
                    {entry.best_score?.toLocaleString() || 0}
                  </TableCell>
                  <TableCell className="number">
                    {entry.achievement_count || 0}
                  </TableCell>
                </TableRow>
              ))}
            </tbody>
          </Table>
        )}
      </LeaderboardModal>
    </LeaderboardContainer>
  );
};

export default Leaderboard;