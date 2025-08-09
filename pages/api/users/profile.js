const { getDatabase } = require('../../../lib/database');

export default async function handler(req, res) {
    try {
        const { walletAddress } = req.query;

        if (!walletAddress) {
            return res.status(400).json({ error: 'Wallet address is required' });
        }

        const db = await getDatabase();

        if (req.method === 'GET') {
            // 获取用户详细信息
            const userProfile = await db.get(`
                SELECT 
                    u.*,
                    COUNT(gs.id) as total_sessions,
                    COUNT(CASE WHEN gs.is_won = 1 THEN 1 END) as actual_wins,
                    AVG(CASE WHEN gs.is_won = 1 THEN gs.game_duration END) as avg_win_time,
                    MAX(gs.final_score) as highest_score,
                    MIN(CASE WHEN gs.is_won = 1 THEN gs.game_duration END) as fastest_win,
                    COUNT(ua.id) as achievement_count_actual,
                    SUM(gs.reward_amount) as total_rewards_actual
                FROM users u
                LEFT JOIN game_sessions gs ON u.id = gs.user_id
                LEFT JOIN user_achievements ua ON u.id = ua.user_id
                WHERE u.wallet_address = ?
                GROUP BY u.id
            `, [walletAddress]);

            if (!userProfile) {
                return res.status(404).json({ error: 'User not found' });
            }

            // 获取用户成就
            const achievements = await db.all(`
                SELECT 
                    a.achievement_key,
                    a.name,
                    a.description,
                    a.icon_url,
                    a.tier,
                    a.rarity,
                    ua.earned_at
                FROM user_achievements ua
                JOIN achievements a ON ua.achievement_id = a.id
                WHERE ua.user_id = ?
                ORDER BY ua.earned_at DESC
            `, [userProfile.id]);

            // 获取最近游戏记录
            const recentGames = await db.all(`
                SELECT 
                    game_id,
                    difficulty,
                    is_won,
                    final_score,
                    game_duration,
                    reward_amount,
                    played_at
                FROM game_sessions
                WHERE user_id = ?
                ORDER BY played_at DESC
                LIMIT 10
            `, [userProfile.id]);

            return res.status(200).json({
                success: true,
                profile: {
                    ...userProfile,
                    achievements,
                    recentGames
                }
            });

        } else if (req.method === 'PUT') {
            // 更新用户信息
            const { username, email, avatar_url } = req.body;

            const user = await db.get('SELECT id FROM users WHERE wallet_address = ?', [walletAddress]);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            await db.run(`
                UPDATE users 
                SET username = ?, email = ?, avatar_url = ?, updated_at = CURRENT_TIMESTAMP
                WHERE wallet_address = ?
            `, [username || null, email || null, avatar_url || null, walletAddress]);

            // 记录系统日志
            await db.run(`
                INSERT INTO system_logs (log_type, user_id, wallet_address, action, message, ip_address, user_agent)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                'user_action',
                user.id,
                walletAddress,
                'profile_update',
                'User profile updated',
                req.headers['x-forwarded-for'] || req.connection.remoteAddress,
                req.headers['user-agent']
            ]);

            return res.status(200).json({
                success: true,
                message: 'Profile updated successfully'
            });

        } else {
            return res.status(405).json({ error: 'Method not allowed' });
        }

    } catch (error) {
        console.error('❌ User profile error:', error);
        return res.status(500).json({
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}