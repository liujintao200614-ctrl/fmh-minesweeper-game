
// 成就检查逻辑
class AchievementChecker {
    constructor(db) {
        this.db = db;
    }

    // 检查单局分数成就
    async checkScoreAchievements(userId, gameData) {
        const achievements = [];
        const { final_score } = gameData;

        const scoreAchievements = [
            { key: 'score_1000', threshold: 1000 },
            { key: 'score_5000', threshold: 5000 },
            { key: 'score_10000', threshold: 10000 }
        ];

        for (const achievement of scoreAchievements) {
            if (final_score >= achievement.threshold) {
                const exists = await this.db.get(`
                    SELECT 1 FROM user_achievements ua
                    JOIN achievements a ON ua.achievement_id = a.id
                    WHERE ua.user_id = ? AND a.achievement_key = ?
                `, [userId, achievement.key]);

                if (!exists) {
                    achievements.push(achievement.key);
                }
            }
        }

        return achievements;
    }

    // 检查速度成就
    async checkSpeedAchievements(userId, gameData) {
        const achievements = [];
        const { game_duration, is_won } = gameData;

        if (!is_won) return achievements;

        const speedAchievements = [
            { key: 'speed_30s', threshold: 30 },
            { key: 'speed_15s', threshold: 15 },
            { key: 'speed_10s', threshold: 10 }
        ];

        for (const achievement of speedAchievements) {
            if (game_duration <= achievement.threshold) {
                const exists = await this.db.get(`
                    SELECT 1 FROM user_achievements ua
                    JOIN achievements a ON ua.achievement_id = a.id
                    WHERE ua.user_id = ? AND a.achievement_key = ?
                `, [userId, achievement.key]);

                if (!exists) {
                    achievements.push(achievement.key);
                }
            }
        }

        return achievements;
    }

    // 检查胜利次数成就
    async checkWinAchievements(userId) {
        const achievements = [];
        
        const user = await this.db.get('SELECT total_wins FROM users WHERE id = ?', [userId]);
        if (!user) return achievements;

        const winAchievements = [
            { key: 'first_win', threshold: 1 },
            { key: 'ten_wins', threshold: 10 },
            { key: 'hundred_wins', threshold: 100 },
            { key: 'thousand_wins', threshold: 1000 }
        ];

        for (const achievement of winAchievements) {
            if (user.total_wins >= achievement.threshold) {
                const exists = await this.db.get(`
                    SELECT 1 FROM user_achievements ua
                    JOIN achievements a ON ua.achievement_id = a.id
                    WHERE ua.user_id = ? AND a.achievement_key = ?
                `, [userId, achievement.key]);

                if (!exists) {
                    achievements.push(achievement.key);
                }
            }
        }

        return achievements;
    }

    // 检查连胜成就
    async checkStreakAchievements(userId) {
        const achievements = [];

        // 计算当前连胜
        const recentGames = await this.db.all(`
            SELECT is_won FROM game_sessions 
            WHERE user_id = ? 
            ORDER BY played_at DESC 
            LIMIT 25
        `, [userId]);

        let currentStreak = 0;
        for (const game of recentGames) {
            if (game.is_won) {
                currentStreak++;
            } else {
                break;
            }
        }

        const streakAchievements = [
            { key: 'streak_3', threshold: 3 },
            { key: 'streak_10', threshold: 10 },
            { key: 'streak_25', threshold: 25 }
        ];

        for (const achievement of streakAchievements) {
            if (currentStreak >= achievement.threshold) {
                const exists = await this.db.get(`
                    SELECT 1 FROM user_achievements ua
                    JOIN achievements a ON ua.achievement_id = a.id
                    WHERE ua.user_id = ? AND a.achievement_key = ?
                `, [userId, achievement.key]);

                if (!exists) {
                    achievements.push(achievement.key);
                }
            }
        }

        return achievements;
    }

    // 检查难度成就
    async checkDifficultyAchievements(userId, gameData) {
        const achievements = [];
        const { difficulty, is_won } = gameData;

        if (!is_won) return achievements;

        const difficultyAchievements = {
            'easy': 'easy_master',
            'medium': 'medium_master', 
            'hard': 'hard_master'
        };

        const achievementKey = difficultyAchievements[difficulty];
        if (!achievementKey) return achievements;

        // 计算该难度的胜利次数
        const winCount = await this.db.get(`
            SELECT COUNT(*) as count FROM game_sessions 
            WHERE user_id = ? AND difficulty = ? AND is_won = 1
        `, [userId, difficulty]);

        if (winCount.count >= 50) {
            const exists = await this.db.get(`
                SELECT 1 FROM user_achievements ua
                JOIN achievements a ON ua.achievement_id = a.id
                WHERE ua.user_id = ? AND a.achievement_key = ?
            `, [userId, achievementKey]);

            if (!exists) {
                achievements.push(achievementKey);
            }
        }

        return achievements;
    }

    // 检查特殊成就
    async checkSpecialAchievements(userId, gameData) {
        const achievements = [];
        const { game_duration, final_score, is_won, flags_used } = gameData;

        if (!is_won) return achievements;

        // 完美游戏：60秒内高分完成
        if (game_duration <= 60 && final_score >= 1000) {
            const exists = await this.db.get(`
                SELECT 1 FROM user_achievements ua
                JOIN achievements a ON ua.achievement_id = a.id
                WHERE ua.user_id = ? AND a.achievement_key = 'perfect_game'
            `, [userId]);

            if (!exists) {
                achievements.push('perfect_game');
            }
        }

        // 无旗胜利
        if (flags_used === 0) {
            const exists = await this.db.get(`
                SELECT 1 FROM user_achievements ua
                JOIN achievements a ON ua.achievement_id = a.id
                WHERE ua.user_id = ? AND a.achievement_key = 'no_flags'
            `, [userId]);

            if (!exists) {
                achievements.push('no_flags');
            }
        }

        return achievements;
    }

    // 检查代币收集成就
    async checkTokenAchievements(userId) {
        const achievements = [];
        
        const user = await this.db.get('SELECT total_rewards_earned FROM users WHERE id = ?', [userId]);
        if (!user) return achievements;

        if (user.total_rewards_earned >= 1000) {
            const exists = await this.db.get(`
                SELECT 1 FROM user_achievements ua
                JOIN achievements a ON ua.achievement_id = a.id
                WHERE ua.user_id = ? AND a.achievement_key = 'token_collector'
            `, [userId]);

            if (!exists) {
                achievements.push('token_collector');
            }
        }

        return achievements;
    }

    // 检查所有成就
    async checkAllAchievements(userId, gameData, gameSessionId) {
        const allAchievements = [];

        // 检查各类成就
        const scoreAchievements = await this.checkScoreAchievements(userId, gameData);
        const speedAchievements = await this.checkSpeedAchievements(userId, gameData);
        const winAchievements = await this.checkWinAchievements(userId);
        const streakAchievements = await this.checkStreakAchievements(userId);
        const difficultyAchievements = await this.checkDifficultyAchievements(userId, gameData);
        const specialAchievements = await this.checkSpecialAchievements(userId, gameData);
        const tokenAchievements = await this.checkTokenAchievements(userId);

        allAchievements.push(
            ...scoreAchievements,
            ...speedAchievements,
            ...winAchievements,
            ...streakAchievements,
            ...difficultyAchievements,
            ...specialAchievements,
            ...tokenAchievements
        );

        // 保存新获得的成就
        for (const achievementKey of allAchievements) {
            await this.awardAchievement(userId, achievementKey, gameSessionId);
        }

        return allAchievements;
    }

    // 授予成就
    async awardAchievement(userId, achievementKey, gameSessionId = null) {
        try {
            const achievement = await this.db.get(
                'SELECT id FROM achievements WHERE achievement_key = ?',
                [achievementKey]
            );

            if (!achievement) {
                console.warn(`⚠️ Achievement not found: ${achievementKey}`);
                return false;
            }

            await this.db.run(`
                INSERT INTO user_achievements (user_id, achievement_id, game_session_id)
                VALUES (?, ?, ?)
            `, [userId, achievement.id, gameSessionId]);

            console.log(`🏆 Achievement unlocked: ${achievementKey} for user ${userId}`);
            return true;

        } catch (error) {
            console.error(`❌ Error awarding achievement ${achievementKey}:`, error);
            return false;
        }
    }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { getDatabase } = require('../../../lib/database');
        const { userId, gameSessionId } = req.body;

        if (!userId || !gameSessionId) {
            return res.status(400).json({ error: 'User ID and game session ID are required' });
        }

        const db = await getDatabase();

        // 获取游戏数据
        const gameSession = await db.get(`
            SELECT * FROM game_sessions WHERE id = ? AND user_id = ?
        `, [gameSessionId, userId]);

        if (!gameSession) {
            return res.status(404).json({ error: 'Game session not found' });
        }

        // 检查成就
        const checker = new AchievementChecker(db);
        const newAchievements = await checker.checkAllAchievements(userId, gameSession, gameSessionId);

        // 获取新成就的详细信息
        const achievementDetails = [];
        for (const achievementKey of newAchievements) {
            const achievement = await db.get(`
                SELECT achievement_key, name, description, tier, rarity, reward_amount
                FROM achievements WHERE achievement_key = ?
            `, [achievementKey]);
            
            if (achievement) {
                achievementDetails.push(achievement);
            }
        }

        // 记录系统日志
        if (newAchievements.length > 0) {
            await db.run(`
                INSERT INTO system_logs (log_type, user_id, action, message, game_session_id, data)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                'achievement',
                userId,
                'achievements_earned',
                `Earned ${newAchievements.length} achievements`,
                gameSessionId,
                JSON.stringify(newAchievements)
            ]);
        }

        return res.status(200).json({
            success: true,
            newAchievements: achievementDetails,
            message: `Checked achievements, ${newAchievements.length} new achievements unlocked`
        });

    } catch (error) {
        console.error('❌ Achievement check error:', error);
        return res.status(500).json({
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}