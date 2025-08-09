const { getDatabase } = require('../../lib/database');

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      success: false, 
      leaderboard: [],
      error: 'Method not allowed' 
    });
  }

  try {
    const { 
      type = 'wins',
      difficulty = 'all', 
      limit = '10',
      timeframe = 'all_time'
    } = req.query;

    // 参数验证
    const limitNum = parseInt(limit);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        success: false,
        leaderboard: [],
        error: 'Invalid limit parameter (1-100)'
      });
    }

    const validTypes = ['wins', 'score', 'time', 'rewards'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        leaderboard: [],
        error: 'Invalid type parameter'
      });
    }

    const validDifficulties = ['all', 'easy', 'medium', 'hard', 'custom'];
    if (!validDifficulties.includes(difficulty)) {
      return res.status(400).json({
        success: false,
        leaderboard: [],
        error: 'Invalid difficulty parameter'
      });
    }

    // 获取数据库连接
    const db = await getDatabase();

    // 构建查询
    let whereClause = 'WHERE gs.is_won = 1';
    const params = [];
    
    if (difficulty !== 'all') {
      const difficultyParam = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
      whereClause += ' AND gs.difficulty = ?';
      params.push(difficultyParam);
    }

    const sql = `
      SELECT 
        u.wallet_address as playerAddress,
        u.username,
        MAX(gs.final_score) as bestScore,
        MIN(CASE WHEN gs.is_won = 1 THEN gs.game_duration END) as bestTime,
        COUNT(gs.id) as totalGames,
        COUNT(CASE WHEN gs.is_won = 1 THEN 1 END) as totalWins,
        AVG(gs.final_score) as averageScore,
        MAX(gs.created_at) as lastPlayed
      FROM users u
      LEFT JOIN game_sessions gs ON u.id = gs.user_id
      ${whereClause}
      GROUP BY u.id, u.wallet_address
      HAVING totalWins > 0
      ORDER BY bestScore DESC, bestTime ASC
      LIMIT ?
    `;
    
    params.push(limitNum);
    
    console.log('🔍 Leaderboard query:', sql);
    console.log('📝 Parameters:', params);

    const leaderboard = await db.all(sql, params);
    
    console.log('📊 Leaderboard results:', leaderboard.length, 'entries');

    // 格式化数据
    const formattedLeaderboard = leaderboard.map((entry, index) => ({
      rank: index + 1,
      wallet_address: entry.playerAddress,
      display_name: entry.username || `${entry.playerAddress.slice(0, 6)}...${entry.playerAddress.slice(-4)}`,
      ranking_value: type === 'wins' ? entry.totalWins : 
                     type === 'score' ? entry.bestScore :
                     type === 'time' ? entry.bestTime :
                     type === 'rewards' ? (entry.totalRewards || 0) : entry.totalWins,
      total_games: entry.totalGames || 0,
      win_rate: entry.totalGames > 0 ? Math.round((entry.totalWins / entry.totalGames) * 100) : 0,
      last_active: entry.lastPlayed || Date.now(),
      best_score: entry.bestScore || 0,
      best_time: entry.bestTime || 0
    }));

    const response = {
      success: true,
      leaderboard: formattedLeaderboard,
      meta: {
        totalEntries: formattedLeaderboard.length,
        type: type,
        difficulty: difficulty,
        timeframe: timeframe
      }
    };

    console.log('✅ Leaderboard API success:', response.meta);

    res.status(200).json(response);

  } catch (error) {
    console.error('❌ Leaderboard API error:', error);
    console.error('🔍 Error stack:', error.stack);
    
    res.status(500).json({
      success: false,
      leaderboard: [],
      error: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}