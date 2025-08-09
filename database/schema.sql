-- FMH 扫雷游戏数据库结构设计
-- 创建时间: 2025-01-01
-- 版本: v2.0 - V2.0奖励系统升级

-- 1. 用户表 - 存储用户基本信息
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    wallet_address TEXT UNIQUE NOT NULL,           -- 钱包地址（主要标识）
    username TEXT,                                 -- 用户昵称（可选）
    email TEXT,                                    -- 邮箱（可选）
    avatar_url TEXT,                               -- 头像URL（可选）
    
    -- 游戏统计
    total_games INTEGER DEFAULT 0,                 -- 总游戏局数
    total_wins INTEGER DEFAULT 0,                  -- 总胜利局数
    total_score INTEGER DEFAULT 0,                 -- 累计得分
    best_score INTEGER DEFAULT 0,                  -- 最高分记录
    best_time INTEGER DEFAULT 0,                   -- 最佳时间记录（秒）
    
    -- 奖励统计
    total_rewards_earned DECIMAL(18, 8) DEFAULT 0, -- 累计获得FMH代币
    total_fees_paid DECIMAL(18, 8) DEFAULT 0,      -- 累计支付费用
    
    -- 成就统计
    achievement_count INTEGER DEFAULT 0,           -- 获得成就数量
    
    -- 系统字段
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_played_at TIMESTAMP,                      -- 最后游戏时间
    is_active BOOLEAN DEFAULT TRUE,                -- 是否活跃用户
    
    -- 索引
    INDEX idx_wallet_address (wallet_address),
    INDEX idx_total_wins (total_wins DESC),
    INDEX idx_best_score (best_score DESC),
    INDEX idx_created_at (created_at)
);

-- 2. 游戏记录表 - 存储每局游戏详细信息
CREATE TABLE game_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id INTEGER NOT NULL,                      -- 链上游戏ID
    user_id INTEGER NOT NULL,                      -- 关联用户ID
    wallet_address TEXT NOT NULL,                  -- 钱包地址（冗余，便于查询）
    
    -- 游戏配置
    game_width INTEGER NOT NULL,                   -- 游戏宽度
    game_height INTEGER NOT NULL,                  -- 游戏高度  
    mine_count INTEGER NOT NULL,                   -- 地雷数量
    difficulty TEXT NOT NULL,                      -- 难度等级：easy/medium/hard/custom
    
    -- 游戏结果
    is_won BOOLEAN NOT NULL,                       -- 是否胜利
    final_score INTEGER DEFAULT 0,                 -- 最终得分
    game_duration INTEGER NOT NULL,                -- 游戏时长（秒）
    cells_revealed INTEGER DEFAULT 0,              -- 揭开格子数
    flags_used INTEGER DEFAULT 0,                  -- 使用旗帜数
    
    -- 奖励信息
    reward_amount DECIMAL(18, 8) DEFAULT 0,        -- 获得奖励数量
    reward_claimed BOOLEAN DEFAULT FALSE,          -- 是否已领取奖励
    reward_tx_hash TEXT,                           -- 奖励交易哈希
    
    -- 链上数据
    start_tx_hash TEXT,                            -- 开始游戏交易哈希
    complete_tx_hash TEXT,                         -- 完成游戏交易哈希
    game_fee_paid DECIMAL(18, 8) DEFAULT 0,        -- 支付的游戏费用
    
    -- 验证信息
    server_signature TEXT,                         -- 服务器签名
    nonce BIGINT,                                  -- 防重放随机数
    signature_deadline TIMESTAMP,                  -- 签名截止时间
    
    -- V2.0 新增字段
    game_config TEXT,                              -- 游戏配置JSON
    client_info TEXT,                              -- 客户端信息JSON (IP, 指纹等)
    fmh_earned REAL DEFAULT 0,                     -- 实际获得的FMH数量
    
    -- 系统字段
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- 游戏进行时间
    
    -- 外键约束
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- 索引
    INDEX idx_game_id (game_id),
    INDEX idx_user_id (user_id),
    INDEX idx_wallet_address (wallet_address),
    INDEX idx_is_won (is_won),
    INDEX idx_final_score (final_score DESC),
    INDEX idx_game_duration (game_duration ASC),
    INDEX idx_difficulty (difficulty),
    INDEX idx_played_at (played_at DESC),
    UNIQUE INDEX idx_game_id_unique (game_id)
);

-- 3. 成就定义表 - 预定义的成就类型
CREATE TABLE achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    achievement_key TEXT UNIQUE NOT NULL,          -- 成就唯一标识
    name TEXT NOT NULL,                            -- 成就名称
    description TEXT NOT NULL,                     -- 成就描述
    icon_url TEXT,                                 -- 成就图标URL
    
    -- 成就条件
    condition_type TEXT NOT NULL,                  -- 条件类型：wins/score/time/streak等
    condition_value INTEGER DEFAULT 0,             -- 条件数值
    condition_params TEXT,                         -- 额外条件参数（JSON格式）
    
    -- 成就等级
    tier INTEGER DEFAULT 1,                        -- 成就等级（1-5）
    rarity TEXT DEFAULT 'common',                  -- 稀有度：common/rare/epic/legendary
    
    -- 奖励信息
    reward_type TEXT DEFAULT 'badge',              -- 奖励类型：badge/token/nft
    reward_amount DECIMAL(18, 8) DEFAULT 0,        -- 奖励数量
    
    -- 系统字段
    is_active BOOLEAN DEFAULT TRUE,                -- 是否激活
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 索引
    INDEX idx_achievement_key (achievement_key),
    INDEX idx_condition_type (condition_type),
    INDEX idx_tier (tier)
);

-- 4. 用户成就表 - 用户获得的成就记录
CREATE TABLE user_achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,                      -- 用户ID
    achievement_id INTEGER NOT NULL,               -- 成就ID
    
    -- 获得信息
    earned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- 获得时间
    game_session_id INTEGER,                       -- 触发成就的游戏记录ID（可选）
    
    -- 奖励状态
    reward_claimed BOOLEAN DEFAULT FALSE,          -- 是否已领取奖励
    reward_tx_hash TEXT,                           -- 奖励交易哈希
    
    -- 系统字段
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 外键约束
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (achievement_id) REFERENCES achievements(id) ON DELETE CASCADE,
    FOREIGN KEY (game_session_id) REFERENCES game_sessions(id) ON DELETE SET NULL,
    
    -- 防重复约束
    UNIQUE INDEX idx_user_achievement (user_id, achievement_id),
    
    -- 索引
    INDEX idx_user_id (user_id),
    INDEX idx_achievement_id (achievement_id),
    INDEX idx_earned_at (earned_at DESC)
);

-- 5. 排行榜快照表 - 定期生成的排行榜快照
CREATE TABLE leaderboard_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_type TEXT NOT NULL,                   -- 快照类型：daily/weekly/monthly/all_time
    user_id INTEGER NOT NULL,                      -- 用户ID
    wallet_address TEXT NOT NULL,                  -- 钱包地址
    username TEXT,                                 -- 用户昵称
    
    -- 排行数据
    rank_position INTEGER NOT NULL,               -- 排名位置
    total_wins INTEGER DEFAULT 0,                 -- 总胜利数
    best_score INTEGER DEFAULT 0,                 -- 最高分
    best_time INTEGER DEFAULT 0,                  -- 最佳时间
    total_rewards DECIMAL(18, 8) DEFAULT 0,       -- 总奖励
    
    -- 快照时间
    snapshot_date DATE NOT NULL,                  -- 快照日期
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 外键约束
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    
    -- 索引
    INDEX idx_snapshot_type_date (snapshot_type, snapshot_date),
    INDEX idx_rank_position (rank_position),
    UNIQUE INDEX idx_unique_snapshot (snapshot_type, snapshot_date, user_id)
);

-- 6. 系统日志表 - 记录重要操作
CREATE TABLE system_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    log_type TEXT NOT NULL,                       -- 日志类型：user_action/reward/error/achievement
    user_id INTEGER,                              -- 用户ID（可选）
    wallet_address TEXT,                          -- 钱包地址（可选）
    
    -- 日志内容
    action TEXT NOT NULL,                         -- 操作类型
    message TEXT,                                 -- 日志消息
    data TEXT,                                    -- 额外数据（JSON格式）
    
    -- 关联信息
    game_session_id INTEGER,                      -- 关联游戏记录
    tx_hash TEXT,                                 -- 交易哈希（如有）
    
    -- 系统字段
    ip_address TEXT,                              -- IP地址
    user_agent TEXT,                              -- 用户代理
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- 外键约束
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (game_session_id) REFERENCES game_sessions(id) ON DELETE SET NULL,
    
    -- 索引
    INDEX idx_log_type (log_type),
    INDEX idx_user_id (user_id),
    INDEX idx_created_at (created_at DESC),
    INDEX idx_action (action)
);

-- 初始化成就数据
INSERT INTO achievements (achievement_key, name, description, condition_type, condition_value, tier, rarity) VALUES
-- 基础成就
('first_win', '初战告捷', '完成第一次游戏胜利', 'wins', 1, 1, 'common'),
('ten_wins', '小有成就', '累计获得10次胜利', 'wins', 10, 2, 'common'),
('hundred_wins', '百战不殆', '累计获得100次胜利', 'wins', 100, 3, 'rare'),
('thousand_wins', '扫雷大师', '累计获得1000次胜利', 'wins', 1000, 4, 'epic'),

-- 分数成就
('score_1000', '千分达人', '单局得分达到1000分', 'single_score', 1000, 2, 'common'),
('score_5000', '高分玩家', '单局得分达到5000分', 'single_score', 5000, 3, 'rare'),
('score_10000', '分数之王', '单局得分达到10000分', 'single_score', 10000, 4, 'epic'),

-- 速度成就
('speed_30s', '闪电速度', '30秒内完成游戏', 'completion_time', 30, 2, 'common'),
('speed_15s', '超音速', '15秒内完成游戏', 'completion_time', 15, 3, 'rare'),
('speed_10s', '光速扫雷', '10秒内完成游戏', 'completion_time', 10, 4, 'epic'),

-- 连胜成就
('streak_3', '连胜开始', '连续获得3次胜利', 'win_streak', 3, 2, 'common'),
('streak_10', '连胜达人', '连续获得10次胜利', 'win_streak', 10, 3, 'rare'),
('streak_25', '不败传说', '连续获得25次胜利', 'win_streak', 25, 4, 'epic'),

-- 难度成就
('easy_master', '简单模式大师', '在简单模式获得50次胜利', 'difficulty_wins', 50, 2, 'common'),
('medium_master', '中等模式大师', '在中等模式获得50次胜利', 'difficulty_wins', 50, 3, 'rare'),
('hard_master', '困难模式大师', '在困难模式获得50次胜利', 'difficulty_wins', 50, 4, 'epic'),

-- 特殊成就
('perfect_game', '完美游戏', '在60秒内完成高分游戏', 'perfect', 1, 3, 'rare'),
('no_flags', '无旗胜利', '不使用任何旗帜完成游戏', 'no_flags', 1, 3, 'rare'),
('token_collector', '代币收集者', '累计获得1000 FMH代币', 'total_rewards', 1000, 3, 'rare');

-- 创建视图：用户详细统计
CREATE VIEW user_stats_view AS
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
GROUP BY u.id;

-- 创建视图：排行榜视图
CREATE VIEW leaderboard_view AS
SELECT 
    u.id,
    u.wallet_address,
    u.username,
    u.total_wins,
    u.best_score,
    u.best_time,
    u.total_rewards_earned,
    u.achievement_count,
    RANK() OVER (ORDER BY u.total_wins DESC) as win_rank,
    RANK() OVER (ORDER BY u.best_score DESC) as score_rank,
    RANK() OVER (ORDER BY u.best_time ASC) as time_rank
FROM users u
WHERE u.is_active = 1 AND u.total_wins > 0;

-- 创建触发器：更新用户统计
CREATE TRIGGER update_user_stats_after_game
AFTER INSERT ON game_sessions
BEGIN
    UPDATE users SET
        total_games = total_games + 1,
        total_wins = CASE WHEN NEW.is_won = 1 THEN total_wins + 1 ELSE total_wins END,
        total_score = total_score + NEW.final_score,
        best_score = CASE WHEN NEW.final_score > best_score THEN NEW.final_score ELSE best_score END,
        best_time = CASE 
            WHEN NEW.is_won = 1 AND (best_time = 0 OR NEW.game_duration < best_time) 
            THEN NEW.game_duration 
            ELSE best_time 
        END,
        total_rewards_earned = total_rewards_earned + NEW.reward_amount,
        last_played_at = NEW.played_at,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.user_id;
END;

-- 创建触发器：更新成就计数
CREATE TRIGGER update_achievement_count
AFTER INSERT ON user_achievements
BEGIN
    UPDATE users SET
        achievement_count = achievement_count + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.user_id;
END;

-- 7. nonce防重放表 - 防止重复使用签名
CREATE TABLE used_nonces (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nonce_key TEXT UNIQUE NOT NULL,               -- nonce唯一标识
    player_address TEXT NOT NULL,                 -- 玩家地址
    game_id INTEGER NOT NULL,                     -- 游戏ID
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, -- 创建时间
    expires_at INTEGER NOT NULL,                  -- 过期时间戳
    
    -- 索引
    INDEX idx_nonce_key (nonce_key),
    INDEX idx_player_address (player_address),
    INDEX idx_expires_at (expires_at)
);

-- 清理过期nonce的触发器
CREATE TRIGGER cleanup_expired_nonces
AFTER INSERT ON used_nonces
BEGIN
    DELETE FROM used_nonces WHERE expires_at < strftime('%s', 'now');
END;

-- V2.0 新增表结构

-- 8. 玩家统计表 - V2.0玩家等级和统计
CREATE TABLE player_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_address TEXT UNIQUE NOT NULL,           -- 玩家钱包地址
    consecutive_wins INTEGER DEFAULT 0,            -- 当前连胜数
    today_earned REAL DEFAULT 0,                   -- 今日获得FMH
    player_level TEXT DEFAULT 'bronze',            -- 玩家等级 (bronze/silver/gold/platinum/legend)
    total_wins INTEGER DEFAULT 0,                  -- 总胜利数
    total_games INTEGER DEFAULT 0,                 -- 总游戏数
    last_play_time INTEGER DEFAULT 0,              -- 最后游戏时间戳
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- 索引
    INDEX idx_player_address (player_address),
    INDEX idx_player_level (player_level),
    INDEX idx_today_earned (today_earned),
    INDEX idx_consecutive_wins (consecutive_wins DESC)
);

-- 9. 可疑活动记录表 - 反作弊日志
CREATE TABLE suspicious_activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id TEXT NOT NULL,                         -- 游戏ID
    player_address TEXT NOT NULL,                  -- 玩家地址
    activity_type TEXT NOT NULL,                   -- 活动类型 (IMPOSSIBLE_SPEED, PATTERN_MATCH, 等)
    severity TEXT NOT NULL,                        -- 严重程度 (LOW, MEDIUM, HIGH, CRITICAL)
    description TEXT NOT NULL,                     -- 描述
    evidence TEXT,                                 -- 证据JSON
    detected_at INTEGER NOT NULL,                  -- 检测时间戳
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- 索引
    INDEX idx_player_address (player_address),
    INDEX idx_activity_type (activity_type),
    INDEX idx_severity (severity),
    INDEX idx_detected_at (detected_at DESC)
);

-- 10. 等级升级记录表
CREATE TABLE level_upgrades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_address TEXT NOT NULL,                  -- 玩家地址
    old_level TEXT,                                -- 原等级
    new_level TEXT NOT NULL,                       -- 新等级
    upgraded_at INTEGER NOT NULL,                  -- 升级时间戳
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- 索引
    INDEX idx_player_address (player_address),
    INDEX idx_new_level (new_level),
    INDEX idx_upgraded_at (upgraded_at DESC)
);

-- 11. 待发放奖励表 - 记录预分配但未发放的奖励
CREATE TABLE pending_rewards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_address TEXT NOT NULL,                  -- 玩家地址
    game_id TEXT NOT NULL,                         -- 游戏ID
    reward_amount REAL NOT NULL,                   -- 奖励数量
    status TEXT DEFAULT 'pending',                 -- 状态: pending/claimed/failed
    tx_hash TEXT,                                  -- 发放交易哈希
    created_at INTEGER NOT NULL,                   -- 创建时间戳
    claimed_at INTEGER,                            -- 领取时间戳
    
    -- 索引
    INDEX idx_player_address (player_address),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at DESC),
    UNIQUE INDEX idx_player_game (player_address, game_id)
);