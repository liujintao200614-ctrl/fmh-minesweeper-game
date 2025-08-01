const { getDatabase } = require('../lib/database');

async function initializeDatabase() {
    console.log('🚀 Starting database initialization...');
    
    try {
        const db = await getDatabase();
        
        // 检查数据库是否已有数据
        const userCount = await db.get('SELECT COUNT(*) as count FROM users');
        console.log(`📊 Current users in database: ${userCount.count}`);
        
        const achievementCount = await db.get('SELECT COUNT(*) as count FROM achievements');
        console.log(`🏆 Current achievements in database: ${achievementCount.count}`);
        
        const gameCount = await db.get('SELECT COUNT(*) as count FROM game_sessions');
        console.log(`🎮 Current game sessions in database: ${gameCount.count}`);
        
        console.log('✅ Database initialization completed successfully!');
        console.log('📋 Database location:', require('path').join(process.cwd(), 'database', 'minesweeper.db'));
        
        // 显示成就列表
        console.log('\n🏆 Available achievements:');
        const achievements = await db.all('SELECT achievement_key, name, description, tier, rarity FROM achievements ORDER BY tier, name');
        achievements.forEach(achievement => {
            console.log(`  ${achievement.tier}⭐ [${achievement.rarity}] ${achievement.name}: ${achievement.description}`);
        });
        
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        process.exit(1);
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    initializeDatabase()
        .then(() => {
            console.log('🎉 Initialization complete!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Initialization failed:', error);
            process.exit(1);
        });
}

module.exports = { initializeDatabase };