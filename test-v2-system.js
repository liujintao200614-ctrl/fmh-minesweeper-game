#!/usr/bin/env node

// 测试V2.0奖励系统
const { RewardSystemV2, PlayerLevel } = require('./lib/reward-system-v2.ts');

console.log('🧪 测试FMH扫雷游戏V2.0奖励系统\n');

// 模拟游戏结果
const gameResult = {
  gameId: 12345,
  playerAddress: '0x1234567890123456789012345678901234567890',
  gameConfig: {
    width: 10,
    height: 10,
    mines: 15
  },
  finalScore: 850,
  gameDuration: 45, // 45秒
  flagsUsed: 16,
  isWon: true,
  cellsRevealed: 85,
  perfectGame: true,
  difficulty: 'medium'
};

// 模拟玩家统计
const playerStats = {
  consecutiveWins: 5,
  todayEarned: 150,
  playerLevel: PlayerLevel.SILVER,
  totalWins: 75,
  totalGames: 100,
  lastPlayTime: Date.now() - 3600000 // 1小时前
};

// 今日已使用奖励池
const todayPoolUsed = 25000;

console.log('📊 游戏结果:');
console.log(`  - 游戏ID: ${gameResult.gameId}`);
console.log(`  - 分数: ${gameResult.finalScore}`);
console.log(`  - 用时: ${gameResult.gameDuration}秒`);
console.log(`  - 难度: ${gameResult.difficulty}`);
console.log(`  - 完美游戏: ${gameResult.perfectGame ? '是' : '否'}\n`);

console.log('👤 玩家统计:');
console.log(`  - 等级: ${playerStats.playerLevel}`);
console.log(`  - 连胜: ${playerStats.consecutiveWins}`);
console.log(`  - 今日已获得: ${playerStats.todayEarned} FMH`);
console.log(`  - 总胜利: ${playerStats.totalWins}/${playerStats.totalGames}\n`);

try {
  // 计算奖励
  const rewardCalculation = RewardSystemV2.calculateReward(
    gameResult,
    playerStats,
    todayPoolUsed
  );

  console.log('💰 V2.0奖励计算结果:');
  console.log(`  - 基础奖励: ${rewardCalculation.baseReward} FMH`);
  console.log(`  - 难度加成: ${rewardCalculation.breakdown.difficulty} FMH (${rewardCalculation.difficultyMultiplier}x)`);
  console.log(`  - 时间奖励: ${rewardCalculation.breakdown.time} FMH`);
  console.log(`  - 精准加成: ${rewardCalculation.breakdown.accuracy} FMH`);
  console.log(`  - 连胜加成: ${rewardCalculation.breakdown.streak} FMH`);
  console.log(`  - 等级加成: ${rewardCalculation.breakdown.level} FMH`);
  console.log(`  - 总计: ${rewardCalculation.totalFMH} FMH\n`);

  if (rewardCalculation.canClaim) {
    console.log('✅ 可以申请奖励！');
  } else {
    console.log('❌ 无法申请奖励:', rewardCalculation.reason);
  }

  // 测试等级权益
  console.log('\n🏆 等级权益:');
  const benefits = RewardSystemV2.getLevelBenefits(playerStats.playerLevel);
  benefits.forEach(benefit => console.log(`  - ${benefit}`));

} catch (error) {
  console.error('❌ 测试失败:', error.message);
}

console.log('\n🎯 V2.0系统测试完成！');