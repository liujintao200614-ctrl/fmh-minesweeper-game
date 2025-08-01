const { ethers } = require('ethers');

// 验证游戏结果合理性
function validateGameResult(gameData) {
    const { game_width, game_height, mine_count, game_duration, final_score, is_won, cells_revealed, flags_used } = gameData;

    // 基础验证
    if (game_width < 5 || game_width > 30) return { valid: false, error: 'Invalid game width' };
    if (game_height < 5 || game_height > 30) return { valid: false, error: 'Invalid game height' };
    if (mine_count < 1 || mine_count >= game_width * game_height) return { valid: false, error: 'Invalid mine count' };
    if (game_duration < 1) return { valid: false, error: 'Invalid game duration' };

    // 胜利游戏的额外验证
    if (is_won) {
        const totalCells = game_width * game_height;
        const expectedRevealed = totalCells - mine_count;
        
        // 检查揭开的格子数是否合理
        if (cells_revealed < expectedRevealed * 0.8) {
            return { valid: false, error: 'Suspicious cells revealed count' };
        }

        // 检查游戏时间是否过快
        if (game_duration < 3) {
            return { valid: false, error: 'Game completed too quickly' };
        }

        // 检查分数是否合理
        const maxPossibleScore = expectedRevealed * 10; // 假设每个格子最多10分
        if (final_score > maxPossibleScore) {
            return { valid: false, error: 'Score too high' };
        }

        // 检查效率是否过高
        const efficiency = final_score / game_duration;
        if (efficiency > 200) { // 每秒超过200分可能有问题
            return { valid: false, error: 'Suspicious game efficiency' };
        }
    }

    return { valid: true };
}

// 计算难度等级
function calculateDifficulty(width, height, mines) {
    const totalCells = width * height;
    const mineRatio = mines / totalCells;

    if (width === 9 && height === 9 && mines === 10) return 'easy';
    if (width === 16 && height === 16 && mines === 40) return 'medium';
    if (width === 30 && height === 16 && mines === 99) return 'hard';
    
    // 自定义难度判断
    if (mineRatio < 0.15) return 'easy';
    if (mineRatio < 0.20) return 'medium';
    return 'hard';
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const {
            walletAddress,
            gameId,
            gameWidth,
            gameHeight,
            mineCount,
            isWon,
            finalScore,
            gameDuration,
            cellsRevealed,
            flagsUsed,
            rewardAmount,
            rewardClaimed,
            rewardTxHash,
            startTxHash,
            completeTxHash,
            gameFee,
            serverSignature,
            nonce,
            signatureDeadline
        } = req.body;

        // 验证必需参数
        if (!walletAddress || !ethers.isAddress(walletAddress)) {
            return res.status(400).json({ error: 'Valid wallet address is required' });
        }

        if (!gameId || gameId < 0) {
            return res.status(400).json({ error: 'Valid game ID is required' });
        }

        const { getDatabase } = require('../../lib/database');
        const db = await getDatabase();

        // 检查用户是否存在，不存在则创建
        let user = await db.get('SELECT id FROM users WHERE wallet_address = ?', [walletAddress]);
        if (!user) {
            const result = await db.run(
                'INSERT INTO users (wallet_address) VALUES (?)',
                [walletAddress]
            );
            user = { id: result.id };
            console.log(`📝 Auto-created user for address: ${walletAddress}`);
        }

        // 检查游戏记录是否已存在
        const existingGame = await db.get('SELECT id FROM game_sessions WHERE game_id = ?', [gameId]);
        if (existingGame) {
            return res.status(400).json({ error: 'Game record already exists' });
        }

        // 准备游戏数据
        const gameData = {
            game_width: gameWidth,
            game_height: gameHeight,
            mine_count: mineCount,
            game_duration: gameDuration,
            final_score: finalScore || 0,
            is_won: isWon,
            cells_revealed: cellsRevealed || 0,
            flags_used: flagsUsed || 0
        };

        // 验证游戏结果
        const validation = validateGameResult(gameData);
        if (!validation.valid) {
            console.warn(`⚠️ Game validation failed: ${validation.error}`, gameData);
            return res.status(400).json({ error: validation.error });
        }

        const difficulty = calculateDifficulty(gameWidth, gameHeight, mineCount);

        // 保存游戏记录
        const gameResult = await db.run(`
            INSERT INTO game_sessions (
                game_id, user_id, wallet_address, game_width, game_height, mine_count,
                difficulty, is_won, final_score, game_duration, cells_revealed, flags_used,
                reward_amount, reward_claimed, reward_tx_hash, start_tx_hash, complete_tx_hash,
                game_fee_paid, server_signature, nonce, signature_deadline
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            gameId, user.id, walletAddress, gameWidth, gameHeight, mineCount,
            difficulty, isWon ? 1 : 0, finalScore || 0, gameDuration, cellsRevealed || 0, flagsUsed || 0,
            rewardAmount || 0, rewardClaimed ? 1 : 0, rewardTxHash, startTxHash, completeTxHash,
            gameFee || 0, serverSignature, nonce, signatureDeadline
        ]);

        // 记录系统日志
        await db.run(`
            INSERT INTO system_logs (log_type, user_id, wallet_address, action, message, game_session_id, tx_hash)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
            'user_action',
            user.id,
            walletAddress,
            'game_save',
            `Game ${isWon ? 'won' : 'lost'}: ${finalScore} points in ${gameDuration}s`,
            gameResult.id,
            startTxHash
        ]);

        console.log(`🎮 Game saved: ${walletAddress} - Game ${gameId} (${isWon ? 'WON' : 'LOST'}) - ${finalScore} points`);

        return res.status(201).json({
            success: true,
            gameSessionId: gameResult.id,
            message: 'Game record saved successfully'
        });

    } catch (error) {
        console.error('❌ Game save error:', error);
        return res.status(500).json({
            error: 'Internal server error',
            details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}