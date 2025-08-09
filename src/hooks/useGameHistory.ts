import { useState, useCallback } from 'react';

interface GameData {
    walletAddress: string;
    gameId: number;
    gameWidth: number;
    gameHeight: number;
    mineCount: number;
    isWon: boolean;
    finalScore: number;
    gameDuration: number;
    cellsRevealed: number;
    flagsUsed: number;
    rewardAmount: number;
    rewardClaimed: boolean;
    startTxHash: string | null;
    completeTxHash: string | null;
    gameFee: number;
}

interface SaveResult {
    success: boolean;
    gameSessionId?: number;
    error?: string;
}

interface Achievement {
    id: number;
    name: string;
    description: string;
    icon: string;
}

interface CompleteGameResult {
    gameSaved: boolean;
    gameSessionId: number | null;
    achievements: Achievement[];
    error: string | null;
}

interface UseGameHistoryReturn {
    saving: boolean;
    error: string | null;
    saveGameRecord: (gameData: GameData) => Promise<SaveResult>;
    checkAchievements: (userId: number, gameSessionId: number) => Promise<Achievement[]>;
    completeGame: (gameData: GameData, userId?: number) => Promise<CompleteGameResult>;
}

export function useGameHistory(): UseGameHistoryReturn {
    const [saving, setSaving] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // 保存游戏记录
    const saveGameRecord = useCallback(async (gameData: GameData): Promise<SaveResult> => {
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
        } catch (error: any) {
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
    const checkAchievements = useCallback(async (userId: number, gameSessionId: number): Promise<Achievement[]> => {
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
        } catch (error: any) {
            console.error('❌ Achievement check error:', error);
            return [];
        }
    }, []);

    // 完整的游戏完成流程
    const completeGame = useCallback(async (gameData: GameData, userId?: number): Promise<CompleteGameResult> => {
        const results: CompleteGameResult = {
            gameSaved: false,
            gameSessionId: null,
            achievements: [],
            error: null
        };

        try {
            // 1. 保存游戏记录
            const saveResult = await saveGameRecord(gameData);
            if (!saveResult.success) {
                results.error = saveResult.error || 'Failed to save game';
                return results;
            }

            results.gameSaved = true;
            results.gameSessionId = saveResult.gameSessionId || null;

            // 2. 检查成就（只有胜利时才检查）
            if (gameData.isWon && userId && results.gameSessionId) {
                const achievements = await checkAchievements(userId, results.gameSessionId);
                results.achievements = achievements;
            }

            console.log('🎮 Game completion process finished:', results);
            return results;

        } catch (error: any) {
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