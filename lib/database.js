const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// 数据库文件路径
const DB_PATH = path.join(process.cwd(), 'database', 'minesweeper.db');

// 确保数据库目录存在
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

// 数据库监控类
class DatabaseMonitor {
    static getSlowQueryThreshold() {
        return 1000; // 1秒
    }

    static getQueries() {
        if (!this.queries) {
            this.queries = new Map();
        }
        return this.queries;
    }

    static logQuery(sql, duration, params = []) {
        const queryKey = sql.trim().split(' ')[0].toUpperCase();
        const queries = this.getQueries();
        const count = queries.get(queryKey) || 0;
        queries.set(queryKey, count + 1);

        if (duration > this.getSlowQueryThreshold()) {
            console.warn(`🐌 Slow query detected (${duration}ms):`, {
                sql: sql.substring(0, 100) + '...',
                params: params.length > 0 ? params.slice(0, 3) : [],
                duration
            });
        }
    }

    static getStats() {
        const queries = this.getQueries();
        return Object.fromEntries(queries);
    }
}

// 数据验证类
class DataValidator {
    static validateWalletAddress(address) {
        return /^0x[a-fA-F0-9]{40}$/.test(address);
    }

    static validateGameData(data) {
        const required = ['gameId', 'walletAddress', 'gameWidth', 'gameHeight', 'mineCount'];
        for (const field of required) {
            if (!data[field]) {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        if (data.gameWidth < 1 || data.gameHeight < 1 || data.mineCount < 1) {
            throw new Error('Invalid game dimensions');
        }

        if (data.mineCount >= data.gameWidth * data.gameHeight) {
            throw new Error('Too many mines for board size');
        }

        return true;
    }

    static validateUserData(data) {
        if (!data.walletAddress || !this.validateWalletAddress(data.walletAddress)) {
            throw new Error('Invalid wallet address');
        }
        return true;
    }
}

class Database {

    // 连接数据库
    async connect() {
        return new Promise((resolve, reject) => {
            this.db = new sqlite3.Database(DB_PATH, (err) => {
                if (err) {
                    console.error('❌ Error opening database:', err.message);
                    reject(err);
                } else {
                    console.log('✅ Connected to SQLite database');
                    // 启用外键支持和WAL模式
                    this.db.run('PRAGMA foreign_keys = ON;');
                    this.db.run('PRAGMA journal_mode = WAL;');
                    this.db.run('PRAGMA synchronous = NORMAL;');
                    this.db.run('PRAGMA cache_size = 10000;');
                    this.db.run('PRAGMA temp_store = MEMORY;');
                    resolve();
                }
            });
        });
    }

    // 关闭数据库连接
    async close() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                this.db.close((err) => {
                    if (err) {
                        reject(err);
                    } else {
                        console.log('📋 Database connection closed');
                        resolve();
                    }
                });
            } else {
                resolve();
            }
        });
    }

    // 初始化数据库表结构
    async initialize() {
        try {
            const schemaPath = path.join(process.cwd(), 'database', 'schema-enhanced.sql');
            const schema = fs.readFileSync(schemaPath, 'utf8');
            
            // 移除注释并清理SQL
            const cleanSql = schema
                .replace(/--.*$/gm, '') // 移除单行注释
                .replace(/\/\*[\s\S]*?\*\//g, '') // 移除多行注释
                .replace(/\s+/g, ' ') // 压缩空白字符
                .trim();
            
            // 执行整个SQL脚本
            return new Promise((resolve, reject) => {
                this.db.exec(cleanSql, (err) => {
                    if (err) {
                        console.error('❌ Error executing schema:', err.message);
                        reject(err);
                    } else {
                        console.log('✅ Database schema initialized successfully');
                        resolve();
                    }
                });
            });

        } catch (error) {
            console.error('❌ Error initializing database:', error);
            throw error;
        }
    }

    // 执行SQL语句（增删改）
    async run(sql, params = []) {
        const startTime = Date.now();
        
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                const duration = Date.now() - startTime;
                DatabaseMonitor.logQuery(sql, duration, params);
                
                if (err) {
                    console.error('❌ SQL Error:', err.message);
                    console.error('🔍 SQL:', sql);
                    console.error('📝 Params:', params);
                    reject(err);
                } else {
                    resolve({
                        id: this.lastID,
                        changes: this.changes
                    });
                }
            });
        });
    }

    // 查询单行数据
    async get(sql, params = []) {
        const startTime = Date.now();
        
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                const duration = Date.now() - startTime;
                DatabaseMonitor.logQuery(sql, duration, params);
                
                if (err) {
                    console.error('❌ SQL Error:', err.message);
                    console.error('🔍 SQL:', sql);
                    console.error('📝 Params:', params);
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    // 查询多行数据
    async all(sql, params = []) {
        const startTime = Date.now();
        
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                const duration = Date.now() - startTime;
                DatabaseMonitor.logQuery(sql, duration, params);
                
                if (err) {
                    console.error('❌ SQL Error:', err.message);
                    console.error('🔍 SQL:', sql);
                    console.error('📝 Params:', params);
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // 开始事务
    async beginTransaction() {
        return this.run('BEGIN TRANSACTION');
    }

    // 提交事务
    async commit() {
        return this.run('COMMIT');
    }

    // 回滚事务
    async rollback() {
        return this.run('ROLLBACK');
    }

    // 执行事务
    async transaction(callback) {
        try {
            await this.beginTransaction();
            const result = await callback(this);
            await this.commit();
            return result;
        } catch (error) {
            await this.rollback();
            throw error;
        }
    }

    // 预编译语句缓存
    constructor() {
        this.db = null;
        this.connectionPool = [];
        this.maxConnections = 10;
        this.activeConnections = 0;
        this.preparedStatements = new Map();
    }

    // 获取预编译语句
    async prepare(sql) {
        if (!this.preparedStatements.has(sql)) {
            const stmt = await new Promise((resolve, reject) => {
                this.db.prepare(sql, (err, stmt) => {
                    if (err) reject(err);
                    else resolve(stmt);
                });
            });
            this.preparedStatements.set(sql, stmt);
        }
        return this.preparedStatements.get(sql);
    }

    // 使用预编译语句执行
    async executePrepared(sql, params = []) {
        const stmt = await this.prepare(sql);
        return new Promise((resolve, reject) => {
            stmt.run(params, function(err) {
                if (err) reject(err);
                else resolve({ id: this.lastID, changes: this.changes });
            });
        });
    }

    // 批量插入优化
    async batchInsert(table, columns, values) {
        if (values.length === 0) return;
        
        const placeholders = values.map(() => `(${columns.map(() => '?').join(', ')})`).join(', ');
        const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${placeholders}`;
        
        const flatValues = values.flat();
        return this.run(sql, flatValues);
    }

    // 获取数据库统计信息
    async getStats() {
        const stats = await this.get(`
            SELECT 
                (SELECT COUNT(*) FROM users) as userCount,
                (SELECT COUNT(*) FROM game_sessions) as gameCount,
                (SELECT COUNT(*) FROM achievements) as achievementCount,
                (SELECT COUNT(*) FROM user_achievements) as userAchievementCount
        `);
        
        return {
            ...stats,
            queryStats: DatabaseMonitor.getStats()
        };
    }

    // 数据库维护
    async maintenance() {
        console.log('🔧 Running database maintenance...');
        
        // 分析表结构
        await this.run('ANALYZE');
        
        // 清理WAL文件
        await this.run('PRAGMA wal_checkpoint(TRUNCATE);');
        
        // 重新整理数据库
        await this.run('VACUUM');
        
        console.log('✅ Database maintenance completed');
    }
}

// 创建单例实例
let dbInstance = null;

const getDatabase = async () => {
    if (!dbInstance) {
        dbInstance = new Database();
        await dbInstance.connect();
        
        // 检查是否需要初始化表结构
        const tables = await dbInstance.all(`
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name NOT LIKE 'sqlite_%'
        `);
        
        if (tables.length === 0) {
            console.log('🏗️ No tables found, initializing database...');
            await dbInstance.initialize();
        }
    }
    return dbInstance;
};

// 数据库管理器 - 统一接口
class DatabaseManager {
    static async getInstance() {
        if (!this.instance) {
            if (!this.connectionPromise) {
                this.connectionPromise = getDatabase();
            }
            this.instance = await this.connectionPromise;
        }
        return this.instance;
    }

    static async close() {
        if (this.instance) {
            await this.instance.close();
            this.instance = null;
            this.connectionPromise = null;
        }
    }

    // 获取排行榜数据
    static async getLeaderboard(difficulty, limit = 50) {
        const db = await this.getInstance();
        
        let whereClause = 'WHERE gs.is_won = 1';
        const params = [];
        
        if (difficulty && difficulty !== 'All') {
            whereClause += ' AND gs.difficulty = ?';
            params.push(difficulty);
        }

        const sql = `
            SELECT 
                u.wallet_address as playerAddress,
                MAX(gs.final_score) as bestScore,
                MIN(CASE WHEN gs.is_won = 1 THEN gs.game_duration END) as bestTime,
                COUNT(gs.id) as totalGames,
                COUNT(CASE WHEN gs.is_won = 1 THEN 1 END) as totalWins,
                AVG(gs.final_score) as averageScore
            FROM users u
            LEFT JOIN game_sessions gs ON u.id = gs.user_id
            ${whereClause}
            GROUP BY u.id, u.wallet_address
            HAVING totalWins > 0
            ORDER BY bestScore DESC, bestTime ASC
            LIMIT ?
        `;
        
        params.push(limit);
        
        const results = await db.all(sql, params);
        
        // 添加排名
        return results.map((row, index) => ({
            ...row,
            rank: index + 1,
            averageScore: Math.round(row.averageScore || 0),
            bestTime: row.bestTime || 0
        }));
    }

    // 获取玩家排名
    static async getPlayerRank(playerAddress, difficulty) {
        const leaderboard = await this.getLeaderboard(difficulty, 1000);
        const playerEntry = leaderboard.find(
            entry => entry.playerAddress.toLowerCase() === playerAddress.toLowerCase()
        );
        
        return playerEntry ? playerEntry.rank : -1;
    }

    // 获取游戏统计信息
    static async getGameStats() {
        const db = await this.getInstance();
        
        const stats = await db.get(`
            SELECT 
                COUNT(gs.id) as totalGames,
                COUNT(DISTINCT u.id) as totalPlayers,
                AVG(gs.final_score) as averageScore,
                MAX(gs.final_score) as topScore
            FROM game_sessions gs
            JOIN users u ON gs.user_id = u.id
            WHERE gs.is_won = 1
        `);
        
        return {
            totalGames: stats.totalGames || 0,
            totalPlayers: stats.totalPlayers || 0,
            averageScore: Math.round(stats.averageScore || 0),
            topScore: stats.topScore || 0
        };
    }

    // 获取玩家游戏记录
    static async getPlayerRecords(playerAddress) {
        const db = await this.getInstance();
        
        const records = await db.all(`
            SELECT 
                gs.id,
                gs.game_id as gameId,
                gs.wallet_address as playerAddress,
                gs.final_score as score,
                gs.game_duration as timeElapsed,
                gs.game_width as width,
                gs.game_height as height,
                gs.mine_count as mines,
                gs.difficulty,
                gs.created_at as timestamp,
                gs.is_won as verified
            FROM game_sessions gs
            WHERE gs.wallet_address = ?
            ORDER BY gs.created_at DESC
        `, [playerAddress]);
        
        return records.map(record => ({
            ...record,
            id: record.id.toString(),
            timestamp: new Date(record.timestamp).getTime(),
            verified: Boolean(record.verified)
        }));
    }

    // 添加游戏记录
    static async addGameRecord(record) {
        const db = await this.getInstance();
        
        // 检查用户是否存在
        let user = await db.get('SELECT id FROM users WHERE wallet_address = ?', [record.playerAddress]);
        if (!user) {
            const result = await db.run('INSERT INTO users (wallet_address) VALUES (?)', [record.playerAddress]);
            user = { id: result.id };
        }
        
        // 插入游戏记录
        const result = await db.run(`
            INSERT INTO game_sessions (
                game_id, user_id, wallet_address, game_width, game_height, 
                mine_count, difficulty, is_won, final_score, game_duration
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            record.gameId, user.id, record.playerAddress, record.width, record.height,
            record.mines, record.difficulty, record.verified ? 1 : 0, record.score, record.timeElapsed
        ]);
        
        return {
            ...record,
            id: result.id.toString(),
            timestamp: Date.now()
        };
    }
}

module.exports = {
    Database,
    getDatabase,
    DataValidator,
    DatabaseMonitor,
    DatabaseManager
};