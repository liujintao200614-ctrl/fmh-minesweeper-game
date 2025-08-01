import { useState, useEffect, useCallback } from 'react';

export function useLeaderboard(type = 'wins', options = {}) {
    const [leaderboard, setLeaderboard] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [meta, setMeta] = useState(null);

    const {
        limit = 10,
        difficulty = 'all',
        timeframe = 'all_time',
        autoRefresh = false,
        refreshInterval = 30000 // 30秒
    } = options;

    // 获取排行榜数据
    const fetchLeaderboard = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams({
                type,
                limit: limit.toString(),
                difficulty,
                timeframe
            });

            const response = await fetch(`/api/leaderboard?${params}`);
            const result = await response.json();

            if (result.success) {
                setLeaderboard(result.leaderboard);
                setMeta(result.meta);
                console.log(`📊 Leaderboard loaded (${type}):`, result.leaderboard.length, 'entries');
            } else {
                throw new Error(result.error || 'Failed to fetch leaderboard');
            }
        } catch (error) {
            console.error('❌ Leaderboard fetch error:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    }, [type, limit, difficulty, timeframe]);

    // 获取用户在排行榜中的位置
    const getUserRank = useCallback((walletAddress) => {
        if (!walletAddress || !leaderboard.length) return null;
        
        const userEntry = leaderboard.find(entry => 
            entry.wallet_address.toLowerCase() === walletAddress.toLowerCase()
        );
        
        return userEntry ? userEntry.rank : null;
    }, [leaderboard]);

    // 获取排行榜类型的显示名称
    const getTypeDisplayName = useCallback((type) => {
        const typeNames = {
            'wins': '胜利次数',
            'score': '最高分数', 
            'time': '最快时间',
            'rewards': '获得奖励'
        };
        return typeNames[type] || type;
    }, []);

    // 获取时间范围的显示名称
    const getTimeframeDisplayName = useCallback((timeframe) => {
        const timeframeNames = {
            'daily': '今日',
            'weekly': '本周',
            'monthly': '本月',
            'all_time': '历史'
        };
        return timeframeNames[timeframe] || timeframe;
    }, []);

    // 格式化排行榜数值显示
    const formatRankingValue = useCallback((entry, type) => {
        switch (type) {
            case 'wins':
                return `${entry.ranking_value} 胜`;
            case 'score':
                return `${entry.ranking_value.toLocaleString()} 分`;
            case 'time':
                return `${entry.ranking_value} 秒`;
            case 'rewards':
                return `${parseFloat(entry.ranking_value).toFixed(2)} FMH`;
            default:
                return entry.ranking_value;
        }
    }, []);

    // 初始加载
    useEffect(() => {
        fetchLeaderboard();
    }, [fetchLeaderboard]);

    // 自动刷新
    useEffect(() => {
        if (!autoRefresh) return;

        const interval = setInterval(() => {
            fetchLeaderboard();
        }, refreshInterval);

        return () => clearInterval(interval);
    }, [autoRefresh, refreshInterval, fetchLeaderboard]);

    return {
        leaderboard,
        loading,
        error,
        meta,
        fetchLeaderboard,
        getUserRank,
        getTypeDisplayName,
        getTimeframeDisplayName,
        formatRankingValue,
        // 便捷的数据访问
        topPlayer: leaderboard.length > 0 ? leaderboard[0] : null,
        hasData: leaderboard.length > 0
    };
}