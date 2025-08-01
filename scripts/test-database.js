const { DatabaseManager, getDatabase } = require('../lib/database');

async function testDatabase() {
    console.log('🧪 Testing database functionality...\n');
    
    try {
        // 1. 测试数据库连接
        console.log('1️⃣ Testing database connection...');
        const db = await getDatabase();
        console.log('✅ Database connection successful');
        
        // 2. 测试获取数据库统计
        console.log('\n2️⃣ Testing database stats...');
        const stats = await db.getStats();
        console.log('📊 Database stats:', stats);
        
        // 3. 测试排行榜功能
        console.log('\n3️⃣ Testing leaderboard functionality...');
        const leaderboard = await DatabaseManager.getLeaderboard('All', 10);
        console.log('🏆 Leaderboard (top 10):', leaderboard.length, 'entries');
        
        // 4. 测试游戏统计
        console.log('\n4️⃣ Testing game stats...');
        const gameStats = await DatabaseManager.getGameStats();
        console.log('📈 Game stats:', gameStats);
        
        // 5. 测试添加游戏记录
        console.log('\n5️⃣ Testing game record addition...');
        const testRecord = {
            gameId: Date.now(),
            playerAddress: '0x1234567890123456789012345678901234567890',
            score: 1000,
            timeElapsed: 60,
            width: 10,
            height: 10,
            mines: 15,
            difficulty: 'Easy',
            verified: true
        };
        
        const addedRecord = await DatabaseManager.addGameRecord(testRecord);
        console.log('✅ Game record added:', addedRecord.id);
        
        // 6. 测试获取玩家记录
        console.log('\n6️⃣ Testing player records...');
        const playerRecords = await DatabaseManager.getPlayerRecords(testRecord.playerAddress);
        console.log('👤 Player records:', playerRecords.length, 'games');
        
        // 7. 测试获取玩家排名
        console.log('\n7️⃣ Testing player rank...');
        const playerRank = await DatabaseManager.getPlayerRank(testRecord.playerAddress);
        console.log('🏅 Player rank:', playerRank);
        
        console.log('\n🎉 All database tests passed successfully!');
        
    } catch (error) {
        console.error('❌ Database test failed:', error);
        process.exit(1);
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    testDatabase()
        .then(() => {
            console.log('✅ Database test completed!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Database test failed:', error);
            process.exit(1);
        });
}

module.exports = { testDatabase }; 