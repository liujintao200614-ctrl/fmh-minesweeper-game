import { useState, useEffect, useCallback } from 'react';

interface UserProfile {
    id: number;
    wallet_address: string;
    username?: string;
    total_games: number;
    total_wins: number;
    best_score: number;
    best_time: number;
    total_rewards_earned: number;
    achievement_count: number;
    created_at: string;
    updated_at: string;
}

interface UserStats {
    totalGames: number;
    totalWins: number;
    winRate: string;
    bestScore: number;
    bestTime: number;
    totalRewards: number;
    achievementCount: number;
}

interface UseUserProfileReturn {
    profile: UserProfile | null;
    loading: boolean;
    error: string | null;
    registerUser: (userData?: Record<string, any>) => Promise<UserProfile | null>;
    fetchProfile: () => Promise<void>;
    updateProfile: (updates: Record<string, any>) => Promise<boolean>;
    stats: UserStats | null;
}

export function useUserProfile(walletAddress: string | null): UseUserProfileReturn {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // 注册用户
    const registerUser = useCallback(async (userData: Record<string, any> = {}): Promise<UserProfile | null> => {
        if (!walletAddress) return null;

        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/users/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    walletAddress,
                    ...userData
                })
            });

            const result = await response.json();

            if (result.success) {
                console.log('✅ User registered/found:', result.user);
                return result.user;
            } else {
                throw new Error(result.error || 'Failed to register user');
            }
        } catch (error: any) {
            console.error('❌ User registration error:', error);
            setError(error.message);
            return null;
        } finally {
            setLoading(false);
        }
    }, [walletAddress]);

    // 获取用户详细资料
    const fetchProfile = useCallback(async (): Promise<void> => {
        if (!walletAddress) return;

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/users/profile?walletAddress=${walletAddress}`);
            const result = await response.json();

            if (result.success) {
                setProfile(result.profile);
                console.log('📊 User profile loaded:', result.profile);
            } else if (response.status === 404) {
                // 用户不存在，自动注册
                console.log('👤 User not found, registering...');
                const newUser = await registerUser();
                if (newUser) {
                    // 注册后重新获取详细资料
                    await fetchProfile();
                }
            } else {
                throw new Error(result.error || 'Failed to fetch profile');
            }
        } catch (error: any) {
            console.error('❌ Profile fetch error:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    }, [walletAddress, registerUser]);

    // 更新用户资料
    const updateProfile = useCallback(async (updates: Record<string, any>): Promise<boolean> => {
        if (!walletAddress) return false;

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/users/profile?walletAddress=${walletAddress}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updates)
            });

            const result = await response.json();

            if (result.success) {
                console.log('✅ Profile updated successfully');
                // 重新获取更新后的资料
                await fetchProfile();
                return true;
            } else {
                throw new Error(result.error || 'Failed to update profile');
            }
        } catch (error: any) {
            console.error('❌ Profile update error:', error);
            setError(error.message);
            return false;
        } finally {
            setLoading(false);
        }
    }, [walletAddress, fetchProfile]);

    // 当钱包地址变化时自动加载资料
    useEffect(() => {
        if (walletAddress) {
            fetchProfile();
        } else {
            setProfile(null);
            setError(null);
        }
    }, [walletAddress, fetchProfile]);

    return {
        profile,
        loading,
        error,
        registerUser,
        fetchProfile,
        updateProfile,
        // 便捷的统计数据
        stats: profile ? {
            totalGames: profile.total_games || 0,
            totalWins: profile.total_wins || 0,
            winRate: profile.total_games > 0 ? (profile.total_wins / profile.total_games * 100).toFixed(1) : '0.0',
            bestScore: profile.best_score || 0,
            bestTime: profile.best_time || 0,
            totalRewards: profile.total_rewards_earned || 0,
            achievementCount: profile.achievement_count || 0
        } : null
    };
}