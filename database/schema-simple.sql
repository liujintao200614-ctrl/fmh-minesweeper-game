-- FMH 扫雷游戏数据库结构设计（简化版）

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
    is_active BOOLEAN DEFAULT TRUE
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
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
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

-- 创建索引
CREATE INDEX idx_users_wallet_address ON users(wallet_address);
CREATE INDEX idx_users_total_wins ON users(total_wins DESC);
CREATE INDEX idx_users_best_score ON users(best_score DESC);
CREATE INDEX idx_users_created_at ON users(created_at);

CREATE INDEX idx_game_sessions_game_id ON game_sessions(game_id);
CREATE INDEX idx_game_sessions_user_id ON game_sessions(user_id);
CREATE INDEX idx_game_sessions_wallet_address ON game_sessions(wallet_address);
CREATE INDEX idx_game_sessions_is_won ON game_sessions(is_won);
CREATE INDEX idx_game_sessions_final_score ON game_sessions(final_score DESC);
CREATE INDEX idx_game_sessions_game_duration ON game_sessions(game_duration ASC);
CREATE INDEX idx_game_sessions_difficulty ON game_sessions(difficulty);
CREATE INDEX idx_game_sessions_played_at ON game_sessions(played_at DESC);
CREATE UNIQUE INDEX idx_game_sessions_game_id_unique ON game_sessions(game_id);

CREATE INDEX idx_achievements_achievement_key ON achievements(achievement_key);
CREATE INDEX idx_achievements_condition_type ON achievements(condition_type);
CREATE INDEX idx_achievements_tier ON achievements(tier);

CREATE UNIQUE INDEX idx_user_achievements_user_achievement ON user_achievements(user_id, achievement_id);
CREATE INDEX idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX idx_user_achievements_achievement_id ON user_achievements(achievement_id);
CREATE INDEX idx_user_achievements_earned_at ON user_achievements(earned_at DESC);

CREATE INDEX idx_leaderboard_snapshots_type_date ON leaderboard_snapshots(snapshot_type, snapshot_date);
CREATE INDEX idx_leaderboard_snapshots_rank_position ON leaderboard_snapshots(rank_position);
CREATE UNIQUE INDEX idx_leaderboard_snapshots_unique ON leaderboard_snapshots(snapshot_type, snapshot_date, user_id);

CREATE INDEX idx_system_logs_log_type ON system_logs(log_type);
CREATE INDEX idx_system_logs_user_id ON system_logs(user_id);
CREATE INDEX idx_system_logs_created_at ON system_logs(created_at DESC);
CREATE INDEX idx_system_logs_action ON system_logs(action);

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
('token_collector', '代币收集者', '累计获得1000 FMH代币', 'total_rewards', 1000, 3, 'rare');