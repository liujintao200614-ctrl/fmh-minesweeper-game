import { useState, useCallback } from 'react';

export function useGameHistory() {
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    // 保存游戏记录
    const saveGameRecord = useCallback(async (gameData) => {
        setSaving(true);
        setError(null);

        try {
            const response = await fetch('/api/games/save', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(gameData)
            });

            const result = await response.json();

            if (result.success) {
                console.log('✅ Game record saved:', result.gameSessionId);
                return {
                    success: true,
                    gameSessionId: result.gameSessionId
                };
            } else {
                throw new Error(result.error || 'Failed to save game record');
            }
        } catch (error) {
            console.error('❌ Game save error:', error);
            setError(error.message);
            return {
                success: false,
                error: error.message
            };
        } finally {
            setSaving(false);
        }
    }, []);

    // 检查并授予成就
    const checkAchievements = useCallback(async (userId, gameSessionId) => {
        try {
            const response = await fetch('/api/achievements/check', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userId,
                    gameSessionId
                })
            });

            const result = await response.json();

            if (result.success) {
                console.log('🏆 Achievements checked:', result.newAchievements);
                return result.newAchievements;
            } else {
                console.warn('⚠️ Achievement check failed:', result.error);
                return [];
            }
        } catch (error) {
            console.error('❌ Achievement check error:', error);
            return [];
        }
    }, []);

    // 完整的游戏完成流程
    const completeGame = useCallback(async (gameData, userId) => {
        const results = {
            gameSaved: false,
            gameSessionId: null,
            achievements: [],
            error: null
        };

        try {
            // 1. 保存游戏记录
            const saveResult = await saveGameRecord(gameData);
            if (!saveResult.success) {
                results.error = saveResult.error;
                return results;
            }

            results.gameSaved = true;
            results.gameSessionId = saveResult.gameSessionId;

            // 2. 检查成就（只有胜利时才检查）
            if (gameData.isWon && userId) {
                const achievements = await checkAchievements(userId, saveResult.gameSessionId);
                results.achievements = achievements;
            }

            console.log('🎮 Game completion process finished:', results);
            return results;

        } catch (error) {
            console.error('❌ Game completion error:', error);
            results.error = error.message;
            return results;
        }
    }, [saveGameRecord, checkAchievements]);

    return {
        saving,
        error,
        saveGameRecord,
        checkAchievements,
        completeGame
    };
}