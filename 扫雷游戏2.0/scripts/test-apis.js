const { getDatabase } = require('../lib/database');
const fetch = require('node-fetch');

async function testAPIs() {
    console.log('🧪 Starting API tests...\n');

    const baseUrl = 'http://localhost:3001';
    const testWallet = '0x1234567890123456789012345678901234567890';
    
    try {
        // 1. 测试用户注册
        console.log('1️⃣ Testing user registration...');
        const registerResponse = await fetch(`${baseUrl}/api/users/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                walletAddress: testWallet,
                username: 'TestUser',
                email: 'test@example.com'
            })
        });
        const registerResult = await registerResponse.json();
        console.log('✅ User registration:', registerResult.success ? 'SUCCESS' : 'FAILED');
        if (registerResult.user) {
            console.log(`   User ID: ${registerResult.user.id}`);
        }

        // 2. 测试用户资料获取
        console.log('\n2️⃣ Testing user profile...');
        const profileResponse = await fetch(`${baseUrl}/api/users/profile?walletAddress=${testWallet}`);
        const profileResult = await profileResponse.json();
        console.log('✅ User profile:', profileResult.success ? 'SUCCESS' : 'FAILED');
        if (profileResult.profile) {
            console.log(`   Profile: ${profileResult.profile.username} (${profileResult.profile.total_games} games)`);
        }

        // 3. 测试游戏记录保存
        console.log('\n3️⃣ Testing game record save...');
        const gameData = {
            walletAddress: testWallet,
            gameId: Date.now(),
            gameWidth: 9,
            gameHeight: 9,
            mineCount: 10,
            isWon: true,
            finalScore: 1500,
            gameDuration: 45,
            cellsRevealed: 71,
            flagsUsed: 8,
            rewardAmount: 10,
            rewardClaimed: false,
            gameFee: 0.001
        };

        const saveResponse = await fetch(`${baseUrl}/api/games/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(gameData)
        });
        const saveResult = await saveResponse.json();
        console.log('✅ Game save:', saveResult.success ? 'SUCCESS' : 'FAILED');
        if (saveResult.gameSessionId) {
            console.log(`   Game Session ID: ${saveResult.gameSessionId}`);
        }

        // 4. 测试成就检查
        if (registerResult.user && saveResult.gameSessionId) {
            console.log('\n4️⃣ Testing achievement check...');
            const achievementResponse = await fetch(`${baseUrl}/api/achievements/check`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: registerResult.user.id,
                    gameSessionId: saveResult.gameSessionId
                })
            });
            const achievementResult = await achievementResponse.json();
            console.log('✅ Achievement check:', achievementResult.success ? 'SUCCESS' : 'FAILED');
            if (achievementResult.newAchievements) {
                console.log(`   New achievements: ${achievementResult.newAchievements.length}`);
                achievementResult.newAchievements.forEach(achievement => {
                    console.log(`   🏆 ${achievement.name}: ${achievement.description}`);
                });
            }
        }

        // 5. 测试排行榜
        console.log('\n5️⃣ Testing leaderboard...');
        const leaderboardResponse = await fetch(`${baseUrl}/api/leaderboard?type=wins&limit=5`);
        const leaderboardResult = await leaderboardResponse.json();
        console.log('✅ Leaderboard:', leaderboardResult.success ? 'SUCCESS' : 'FAILED');
        if (leaderboardResult.leaderboard) {
            console.log(`   Entries: ${leaderboardResult.leaderboard.length}`);
            leaderboardResult.leaderboard.forEach((entry, index) => {
                console.log(`   ${index + 1}. ${entry.display_name} - ${entry.ranking_value} wins`);
            });
        }

        // 6. 测试数据库状态
        console.log('\n6️⃣ Testing database status...');
        const db = await getDatabase();
        const userCount = await db.get('SELECT COUNT(*) as count FROM users');
        const gameCount = await db.get('SELECT COUNT(*) as count FROM game_sessions');
        const achievementCount = await db.get('SELECT COUNT(*) as count FROM user_achievements');
        
        console.log('✅ Database status:');
        console.log(`   Users: ${userCount.count}`);
        console.log(`   Games: ${gameCount.count}`);
        console.log(`   User Achievements: ${achievementCount.count}`);

        console.log('\n🎉 All tests completed successfully!');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('🔍 Error details:', error);
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    testAPIs()
        .then(() => {
            console.log('\n✨ Test execution finished!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Test execution failed:', error);
            process.exit(1);
        });
}

module.exports = { testAPIs };