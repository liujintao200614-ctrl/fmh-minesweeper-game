-- FMH 扫雷游戏数据库结构设计（增强版）

-- 1. 用户表
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet_address TEXT UNIQUE NOT NULL,
    username TEXT,
    email TEXT,
    avatar_url TEXT,
    total_games INTEGER DEFAULT 0,
    total_wins INTEGER DEFAULT 0,
    total_score INTEGER DEFAULT 0,
    best_score INTEGER DEFAULT 0,
    best_time INTEGER DEFAULT 0,
    total_rewards_earned DECIMAL(18, 8) DEFAULT 0,
    total_fees_paid DECIMAL(18, 8) DEFAULT 0,
    achievement_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_played_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    CHECK (total_games >= 0),
    CHECK (total_wins >= 0),
    CHECK (total_score >= 0),
    CHECK (best_score >= 0),
    CHECK (best_time >= 0),
    CHECK (total_rewards_earned >= 0),
    CHECK (total_fees_paid >= 0),
    CHECK (achievement_count >= 0)
);

-- 2. 游戏记录表
CREATE TABLE game_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    wallet_address TEXT NOT NULL,
    game_width INTEGER NOT NULL,
    game_height INTEGER NOT NULL,
    mine_count INTEGER NOT NULL,
    difficulty TEXT NOT NULL,
    is_won BOOLEAN NOT NULL,
    final_score INTEGER DEFAULT 0,
    game_duration INTEGER NOT NULL,
    cells_revealed INTEGER DEFAULT 0,
    flags_used INTEGER DEFAULT 0,
    reward_amount DECIMAL(18, 8) DEFAULT 0,
    reward_claimed BOOLEAN DEFAULT FALSE,
    reward_tx_hash TEXT,
    start_tx_hash TEXT,
    complete_tx_hash TEXT,
    game_fee_paid DECIMAL(18, 8) DEFAULT 0,
    server_signature TEXT,
    nonce BIGINT,
    signature_deadline TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CHECK (game_width > 0),
    CHECK (game_height > 0),
    CHECK (mine_count > 0),
    CHECK (mine_count < game_width * game_height),
    CHECK (final_score >= 0),
    CHECK (game_duration >= 0),
    CHECK (cells_revealed >= 0),
    CHECK (flags_used >= 0),
    CHECK (reward_amount >= 0),
    CHECK (game_fee_paid >= 0),
    CHECK (difficulty IN ('Easy', 'Medium', 'Hard', 'Custom'))
);

-- 3. 成就定义表
CREATE TABLE achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    achievement_key TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    icon_url TEXT,
    condition_type TEXT NOT NULL,
    condition_value INTEGER DEFAULT 0,
    condition_params TEXT,
    tier INTEGER DEFAULT 1,
    rarity TEXT DEFAULT 'common',
    reward_type TEXT DEFAULT 'badge',
    reward_amount DECIMAL(18, 8) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (tier >= 1 AND tier <= 5),
    CHECK (condition_value >= 0),
    CHECK (reward_amount >= 0),
    CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
    CHECK (reward_type IN ('badge', 'token', 'nft', 'title'))
);

-- 4. 用户成就表
CREATE TABLE user_achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    achievement_id INTEGER NOT NULL,
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    game_session_id INTEGER,
    reward_claimed BOOLEAN DEFAULT FALSE,
    reward_tx_hash TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE,
    FOREIGN KEY (game_session_id) REFERENCES game_sessions(id) ON DELETE SET NULL
);

-- 5. 排行榜快照表
CREATE TABLE leaderboard_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_type TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    wallet_address TEXT NOT NULL,
    username TEXT,
    rank_position INTEGER NOT NULL,
    total_wins INTEGER DEFAULT 0,
    best_score INTEGER DEFAULT 0,
    best_time INTEGER DEFAULT 0,
    total_rewards DECIMAL(18, 8) DEFAULT 0,
    snapshot_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CHECK (rank_position > 0),
    CHECK (total_wins >= 0),
    CHECK (best_score >= 0),
    CHECK (best_time >= 0),
    CHECK (total_rewards >= 0)
);

-- 6. 系统日志表
CREATE TABLE system_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    log_type TEXT NOT NULL,
    user_id INTEGER,
    wallet_address TEXT,
    action TEXT NOT NULL,
    message TEXT,
    data TEXT,
    game_session_id INTEGER,
    tx_hash TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (game_session_id) REFERENCES game_sessions(id) ON DELETE SET NULL
);

-- 7. 游戏统计表（用于缓存）
CREATE TABLE game_stats_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stat_type TEXT NOT NULL,
    stat_key TEXT NOT NULL,
    stat_value TEXT NOT NULL,
    cache_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    UNIQUE(stat_type, stat_key)
);

-- 8. 用户会话表
CREATE TABLE user_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    session_token TEXT UNIQUE NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 创建索引（优化查询性能）

-- 用户表索引
CREATE INDEX idx_users_wallet_address ON users(wallet_address);
CREATE INDEX idx_users_total_wins ON users(total_wins DESC);
CREATE INDEX idx_users_best_score ON users(best_score DESC);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_last_played ON users(last_played_at DESC);
CREATE INDEX idx_users_achievement_count ON users(achievement_count DESC);

-- 游戏会话表索引
CREATE INDEX idx_game_sessions_game_id ON game_sessions(game_id);
CREATE INDEX idx_game_sessions_user_id ON game_sessions(user_id);
CREATE INDEX idx_game_sessions_wallet_address ON game_sessions(wallet_address);
CREATE INDEX idx_game_sessions_is_won ON game_sessions(is_won);
CREATE INDEX idx_game_sessions_final_score ON game_sessions(final_score DESC);
CREATE INDEX idx_game_sessions_game_duration ON game_sessions(game_duration ASC);
CREATE INDEX idx_game_sessions_difficulty ON game_sessions(difficulty);
CREATE INDEX idx_game_sessions_played_at ON game_sessions(played_at DESC);
CREATE INDEX idx_game_sessions_created_at ON game_sessions(created_at DESC);

-- 复合索引（优化复杂查询）
CREATE INDEX idx_game_sessions_user_difficulty ON game_sessions(user_id, difficulty);
CREATE INDEX idx_game_sessions_user_won ON game_sessions(user_id, is_won);
CREATE INDEX idx_game_sessions_score_time ON game_sessions(final_score DESC, game_duration ASC);
CREATE INDEX idx_game_sessions_difficulty_score ON game_sessions(difficulty, final_score DESC);
CREATE INDEX idx_game_sessions_user_date ON game_sessions(user_id, played_at DESC);

-- 唯一索引
CREATE UNIQUE INDEX idx_game_sessions_game_id_unique ON game_sessions(game_id);

-- 成就表索引
CREATE INDEX idx_achievements_achievement_key ON achievements(achievement_key);
CREATE INDEX idx_achievements_condition_type ON achievements(condition_type);
CREATE INDEX idx_achievements_tier ON achievements(tier);
CREATE INDEX idx_achievements_rarity ON achievements(rarity);
CREATE INDEX idx_achievements_active ON achievements(is_active);

-- 用户成就表索引
CREATE UNIQUE INDEX idx_user_achievements_user_achievement ON user_achievements(user_id, achievement_id);
CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_achievement_id ON user_achievements(achievement_id);
CREATE INDEX idx_user_achievements_earned_at ON user_achievements(earned_at DESC);
CREATE INDEX idx_user_achievements_game_session ON user_achievements(game_session_id);

-- 排行榜快照表索引
CREATE INDEX idx_leaderboard_snapshots_type_date ON leaderboard_snapshots(snapshot_type, snapshot_date);
CREATE INDEX idx_leaderboard_snapshots_rank_position ON leaderboard_snapshots(rank_position);
CREATE INDEX idx_leaderboard_snapshots_user ON leaderboard_snapshots(user_id);
CREATE UNIQUE INDEX idx_leaderboard_snapshots_unique ON leaderboard_snapshots(snapshot_type, snapshot_date, user_id);

-- 系统日志表索引
CREATE INDEX idx_system_logs_log_type ON system_logs(log_type);
CREATE INDEX idx_system_logs_user_id ON system_logs(user_id);
CREATE INDEX idx_system_logs_created_at ON system_logs(created_at DESC);
CREATE INDEX idx_system_logs_action ON system_logs(action);
CREATE INDEX idx_system_logs_wallet ON system_logs(wallet_address);
CREATE INDEX idx_system_logs_game_session ON system_logs(game_session_id);

-- 缓存表索引
CREATE INDEX idx_game_stats_cache_type_key ON game_stats_cache(stat_type, stat_key);
CREATE INDEX idx_game_stats_cache_expires ON game_stats_cache(expires_at);

-- 用户会话表索引
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);
CREATE INDEX idx_user_sessions_active ON user_sessions(is_active);

-- 创建触发器（自动更新统计信息）

-- 更新用户统计信息的触发器
CREATE TRIGGER update_user_stats_after_game
AFTER INSERT ON game_sessions
BEGIN
    UPDATE users SET
        total_games = total_games + 1,
        total_wins = total_wins + CASE WHEN NEW.is_won THEN 1 ELSE 0 END,
        total_score = total_score + NEW.final_score,
        best_score = CASE WHEN NEW.final_score > best_score THEN NEW.final_score ELSE best_score END,
        best_time = CASE 
            WHEN NEW.is_won AND (best_time = 0 OR NEW.game_duration < best_time) 
            THEN NEW.game_duration 
            ELSE best_time 
        END,
        last_played_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.user_id;
END;

-- 更新用户成就数量的触发器
CREATE TRIGGER update_achievement_count_after_achievement
AFTER INSERT ON user_achievements
BEGIN
    UPDATE users SET
        achievement_count = achievement_count + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.user_id;
END;

-- 初始化成就数据
INSERT INTO achievements (achievement_key, name, description, condition_type, condition_value, tier, rarity) VALUES
('first_win', '初战告捷', '完成第一次游戏胜利', 'wins', 1, 1, 'common'),
('ten_wins', '小有成就', '累计获得10次胜利', 'wins', 10, 2, 'common'),
('hundred_wins', '百战不殆', '累计获得100次胜利', 'wins', 100, 3, 'rare'),
('thousand_wins', '扫雷大师', '累计获得1000次胜利', 'wins', 1000, 4, 'epic'),
('score_1000', '千分达人', '单局得分达到1000分', 'single_score', 1000, 2, 'common'),
('score_5000', '高分玩家', '单局得分达到5000分', 'single_score', 5000, 3, 'rare'),
('score_10000', '分数之王', '单局得分达到10000分', 'single_score', 10000, 4, 'epic'),
('speed_30s', '闪电速度', '30秒内完成游戏', 'completion_time', 30, 2, 'common'),
('speed_15s', '超音速', '15秒内完成游戏', 'completion_time', 15, 3, 'rare'),
('speed_10s', '光速扫雷', '10秒内完成游戏', 'completion_time', 10, 4, 'epic'),
('streak_3', '连胜开始', '连续获得3次胜利', 'win_streak', 3, 2, 'common'),
('streak_10', '连胜达人', '连续获得10次胜利', 'win_streak', 10, 3, 'rare'),
('streak_25', '不败传说', '连续获得25次胜利', 'win_streak', 25, 4, 'epic'),
('easy_master', '简单模式大师', '在简单模式获得50次胜利', 'difficulty_wins', 50, 2, 'common'),
('medium_master', '中等模式大师', '在中等模式获得50次胜利', 'difficulty_wins', 50, 3, 'rare'),
('hard_master', '困难模式大师', '在困难模式获得50次胜利', 'difficulty_wins', 50, 4, 'epic'),
('perfect_game', '完美游戏', '在60秒内完成高分游戏', 'perfect', 1, 3, 'rare'),
('no_flags', '无旗胜利', '不使用任何旗帜完成游戏', 'no_flags', 1, 3, 'rare'),
('token_collector', '代币收集者', '累计获得1000 FMH代币', 'total_rewards', 1000, 3, 'rare'),
('daily_player', '每日玩家', '连续7天每天至少玩一局', 'daily_streak', 7, 2, 'common'),
('weekly_champion', '周冠军', '在一周内获得最高分', 'weekly_champion', 1, 3, 'rare'),
('monthly_legend', '月度传奇', '在一个月内获得最高分', 'monthly_legend', 1, 4, 'epic'),
('first_blood', '首杀', '第一次点击到地雷', 'first_mine', 1, 1, 'common'),
('lucky_guess', '幸运猜测', '在50%概率下猜对', 'lucky_guess', 1, 2, 'common'),
('speed_demon', '速度恶魔', '在5秒内完成简单模式', 'speed_demon', 5, 4, 'epic'),
('accuracy_master', '精确大师', '完成游戏时没有错误点击', 'perfect_accuracy', 1, 3, 'rare'),
('endurance_runner', '耐力跑者', '完成一局超过10分钟的游戏', 'long_game', 600, 2, 'common'),
('social_butterfly', '社交蝴蝶', '与10个不同玩家在同一排行榜', 'social_ranking', 10, 3, 'rare'),
('treasure_hunter', '宝藏猎人', '在一局游戏中找到所有地雷', 'all_mines', 1, 4, 'epic');

-- 创建视图（简化复杂查询）

-- 用户统计视图
CREATE VIEW user_stats_view AS
SELECT 
    u.id,
    u.wallet_address,
    u.username,
    u.total_games,
    u.total_wins,
    u.total_score,
    u.best_score,
    u.best_time,
    u.achievement_count,
    u.total_rewards_earned,
    CASE 
        WHEN u.total_games > 0 
        THEN ROUND(CAST(u.total_wins AS FLOAT) / u.total_games * 100, 2)
        ELSE 0 
    END as win_rate,
    CASE 
        WHEN u.total_games > 0 
        THEN ROUND(CAST(u.total_score AS FLOAT) / u.total_games, 2)
        ELSE 0 
    END as avg_score,
    u.created_at,
    u.last_played_at
FROM users u
WHERE u.is_active = 1;

-- 排行榜视图
CREATE VIEW leaderboard_view AS
SELECT 
    u.wallet_address,
    u.username,
    u.total_wins,
    u.best_score,
    u.best_time,
    u.total_games,
    u.achievement_count,
    ROW_NUMBER() OVER (ORDER BY u.best_score DESC, u.best_time ASC) as rank
FROM users u
WHERE u.is_active = 1 AND u.total_wins > 0;

-- 游戏统计视图
CREATE VIEW game_stats_view AS
SELECT 
    difficulty,
    COUNT(*) as total_games,
    COUNT(CASE WHEN is_won THEN 1 END) as wins,
    AVG(final_score) as avg_score,
    MAX(final_score) as max_score,
    MIN(CASE WHEN is_won THEN game_duration END) as fastest_win,
    AVG(CASE WHEN is_won THEN game_duration END) as avg_win_time
FROM game_sessions
GROUP BY difficulty;