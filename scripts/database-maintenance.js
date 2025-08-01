const { getDatabase } = require('../lib/database');
const path = require('path');

class DatabaseMaintenance {
    constructor() {
        this.db = null;
    }

    async initialize() {
        this.db = await getDatabase();
        console.log('🔧 Database maintenance initialized');
    }

    // 清理过期数据
    async cleanupExpiredData() {
        console.log('🧹 Cleaning up expired data...');
        
        try {
            // 清理过期的系统日志（保留30天）
            const logResult = await this.db.run(`
                DELETE FROM system_logs 
                WHERE created_at < datetime('now', '-30 days')
            `);
            console.log(`   📝 Deleted ${logResult.changes} old system logs`);

            // 清理过期的用户会话（保留7天）
            const sessionResult = await this.db.run(`
                DELETE FROM user_sessions 
                WHERE expires_at < CURRENT_TIMESTAMP
            `);
            console.log(`   🔑 Deleted ${sessionResult.changes} expired sessions`);

            // 清理过期的缓存数据
            const cacheResult = await this.db.run(`
                DELETE FROM game_stats_cache 
                WHERE expires_at < CURRENT_TIMESTAMP
            `);
            console.log(`   💾 Deleted ${cacheResult.changes} expired cache entries`);

            // 清理过期的排行榜快照（保留90天）
            const snapshotResult = await this.db.run(`
                DELETE FROM leaderboard_snapshots 
                WHERE created_at < datetime('now', '-90 days')
            `);
            console.log(`   📊 Deleted ${snapshotResult.changes} old leaderboard snapshots`);

        } catch (error) {
            console.error('❌ Error during data cleanup:', error);
            throw error;
        }
    }

    // 优化数据库性能
    async optimizePerformance() {
        console.log('⚡ Optimizing database performance...');
        
        try {
            // 分析表结构
            await this.db.run('ANALYZE');
            console.log('   📈 Table analysis completed');

            // 清理WAL文件
            await this.db.run('PRAGMA wal_checkpoint(TRUNCATE);');
            console.log('   📄 WAL files cleaned');

            // 重新整理数据库
            await this.db.run('VACUUM');
            console.log('   🗜️ Database vacuum completed');

            // 更新统计信息
            await this.db.run('ANALYZE');
            console.log('   📊 Statistics updated');

        } catch (error) {
            console.error('❌ Error during performance optimization:', error);
            throw error;
        }
    }

    // 验证数据完整性
    async validateDataIntegrity() {
        console.log('🔍 Validating data integrity...');
        
        try {
            const issues = [];

            // 检查孤立记录
            const orphanedGames = await this.db.all(`
                SELECT COUNT(*) as count FROM game_sessions gs
                LEFT JOIN users u ON gs.user_id = u.id
                WHERE u.id IS NULL
            `);
            
            if (orphanedGames[0].count > 0) {
                issues.push(`Found ${orphanedGames[0].count} orphaned game sessions`);
            }

            // 检查数据一致性
            const inconsistentUsers = await this.db.all(`
                SELECT COUNT(*) as count FROM users u
                WHERE u.total_wins > u.total_games
            `);
            
            if (inconsistentUsers[0].count > 0) {
                issues.push(`Found ${inconsistentUsers[0].count} users with inconsistent stats`);
            }

            // 检查重复记录
            const duplicateGames = await this.db.all(`
                SELECT COUNT(*) as count FROM (
                    SELECT game_id, COUNT(*) as cnt
                    FROM game_sessions
                    GROUP BY game_id
                    HAVING cnt > 1
                )
            `);
            
            if (duplicateGames[0].count > 0) {
                issues.push(`Found ${duplicateGames[0].count} duplicate game IDs`);
            }

            if (issues.length > 0) {
                console.log('   ⚠️ Data integrity issues found:');
                issues.forEach(issue => console.log(`      - ${issue}`));
            } else {
                console.log('   ✅ Data integrity validation passed');
            }

            return issues;

        } catch (error) {
            console.error('❌ Error during data integrity validation:', error);
            throw error;
        }
    }

    // 生成统计报告
    async generateStatsReport() {
        console.log('📊 Generating statistics report...');
        
        try {
            const stats = await this.db.getStats();
            
            console.log('\n📈 Database Statistics:');
            console.log(`   👥 Total Users: ${stats.userCount}`);
            console.log(`   🎮 Total Games: ${stats.gameCount}`);
            console.log(`   🏆 Total Achievements: ${stats.achievementCount}`);
            console.log(`   🎯 User Achievements: ${stats.userAchievementCount}`);
            
            console.log('\n🔍 Query Statistics:');
            Object.entries(stats.queryStats).forEach(([query, count]) => {
                console.log(`   ${query}: ${count} queries`);
            });

            // 获取活跃用户统计
            const activeUsers = await this.db.get(`
                SELECT COUNT(*) as count FROM users 
                WHERE last_played_at > datetime('now', '-7 days')
            `);
            console.log(`\n👤 Active Users (7 days): ${activeUsers.count}`);

            // 获取游戏统计
            const gameStats = await this.db.all(`
                SELECT difficulty, COUNT(*) as total, 
                       COUNT(CASE WHEN is_won THEN 1 END) as wins,
                       AVG(final_score) as avg_score
                FROM game_sessions 
                GROUP BY difficulty
            `);
            
            console.log('\n🎮 Game Statistics by Difficulty:');
            gameStats.forEach(stat => {
                const winRate = stat.total > 0 ? ((stat.wins / stat.total) * 100).toFixed(1) : '0';
                console.log(`   ${stat.difficulty}: ${stat.total} games, ${winRate}% win rate, ${Math.round(stat.avg_score || 0)} avg score`);
            });

        } catch (error) {
            console.error('❌ Error generating stats report:', error);
            throw error;
        }
    }

    // 备份数据库
    async backupDatabase() {
        console.log('💾 Creating database backup...');
        
        try {
            const backupPath = path.join(
                process.cwd(), 
                'database', 
                `minesweeper-backup-${new Date().toISOString().split('T')[0]}.db`
            );
            
            await this.db.run(`VACUUM INTO '${backupPath}'`);
            console.log(`   ✅ Backup created: ${backupPath}`);
            
        } catch (error) {
            console.error('❌ Error creating backup:', error);
            throw error;
        }
    }

    // 运行完整维护流程
    async runFullMaintenance() {
        console.log('🚀 Starting full database maintenance...\n');
        
        try {
            await this.initialize();
            
            // 1. 验证数据完整性
            const issues = await this.validateDataIntegrity();
            
            // 2. 清理过期数据
            await this.cleanupExpiredData();
            
            // 3. 优化性能
            await this.optimizePerformance();
            
            // 4. 生成统计报告
            await this.generateStatsReport();
            
            // 5. 创建备份
            await this.backupDatabase();
            
            console.log('\n✅ Full database maintenance completed successfully!');
            
            if (issues.length > 0) {
                console.log('\n⚠️ Note: Some data integrity issues were found. Consider manual review.');
            }
            
        } catch (error) {
            console.error('\n❌ Database maintenance failed:', error);
            throw error;
        }
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    const maintenance = new DatabaseMaintenance();
    
    maintenance.runFullMaintenance()
        .then(() => {
            console.log('🎉 Maintenance complete!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Maintenance failed:', error);
            process.exit(1);
        });
}

module.exports = { DatabaseMaintenance }; 