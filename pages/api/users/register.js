import { getDatabase } from '../../../lib/database';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { walletAddress, username, email, avatar_url } = req.body;

        // 验证必需参数
        if (!walletAddress) {
            return res.status(400).json({ error: 'Wallet address is required' });
        }

        // 验证钱包地址格式
        if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
            return res.status(400).json({ error: 'Invalid wallet address format' });
        }

        const db = await getDatabase();

        // 检查用户是否已存在
        const existingUser = await db.get(
            'SELECT id, wallet_address, username FROM users WHERE wallet_address = ?',
            [walletAddress]
        );

        if (existingUser) {
            // 用户已存在，返回现有用户信息
            return res.status(200).json({
                success: true,
                user: existingUser,
                message: 'User already registered'
            });
        }

        // 创建新用户
        const result = await db.run(`
            INSERT INTO users (wallet_address, username, email, avatar_url)
            VALUES (?, ?, ?, ?)
        `, [walletAddress, username || null, email || null, avatar_url || null]);

        // 获取创建的用户信息
        const newUser = await db.get(
            'SELECT * FROM users WHERE id = ?',
            [result.id]
        );

        // 记录系统日志
        await db.run(`
            INSERT INTO system_logs (log_type, user_id, wallet_address, action, message, ip_address, user_agent)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            'user_action',
            result.id,
            walletAddress,
            'user_register',
            `New user registered: ${username || 'Anonymous'}`,
            req.headers['x-forwarded-for'] || req.connection.remoteAddress,
            req.headers['user-agent']
        ]);

        console.log(`✅ New user registered: ${walletAddress} (${username || 'Anonymous'})`);

        return res.status(201).json({
            success: true,
            user: newUser,
            message: 'User registered successfully'
        });

    } catch (error) {
        console.error('❌ User registration error:', error);
        return res.status(500).json({
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}