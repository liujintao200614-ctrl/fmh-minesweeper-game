import React from 'react';
import styled from 'styled-components';

interface LeaderboardEntry {
  id: number;
  rank: number;
  wallet_address: string;
  display_name: string;
  total_wins: number;
  best_score?: number;
  achievement_count?: number;
}

interface LeaderboardTableProps {
  leaderboard: LeaderboardEntry[];
  leaderboardType: string;
  getTypeDisplayName: (type: string) => string;
  formatRankingValue: (entry: LeaderboardEntry, type: string) => string;
}

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

const LeaderboardTable: React.FC<LeaderboardTableProps> = ({
  leaderboard,
  leaderboardType,
  getTypeDisplayName,
  formatRankingValue
}) => {
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
  );
};

export default LeaderboardTable;