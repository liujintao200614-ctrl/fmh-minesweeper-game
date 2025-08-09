import React from 'react';
import styled from 'styled-components';

interface LeaderboardControlsProps {
  leaderboardType: string;
  difficulty: string;
  timeframe: string;
  onTypeChange: (type: string) => void;
  onDifficultyChange: (difficulty: string) => void;
  onTimeframeChange: (timeframe: string) => void;
}

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

const LeaderboardControls: React.FC<LeaderboardControlsProps> = ({
  leaderboardType,
  difficulty,
  timeframe,
  onTypeChange,
  onDifficultyChange,
  onTimeframeChange
}) => {
  return (
    <Controls>
      <ControlGroup>
        <Label>排行类型</Label>
        <Select 
          value={leaderboardType} 
          onChange={(e) => onTypeChange(e.target.value)}
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
          onChange={(e) => onDifficultyChange(e.target.value)}
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
          onChange={(e) => onTimeframeChange(e.target.value)}
        >
          <option value="all_time">历史记录</option>
          <option value="monthly">本月</option>
          <option value="weekly">本周</option>
          <option value="daily">今日</option>
        </Select>
      </ControlGroup>
    </Controls>
  );
};

export default LeaderboardControls;