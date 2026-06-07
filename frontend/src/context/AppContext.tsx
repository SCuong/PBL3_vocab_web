import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authApi, type AuthenticatedUser } from '../services/authApi';
import { learningProgressApi, type LearningProgressState } from '../services/learningProgressApi';
import { vocabularyApi, type VocabularyTopicItem } from '../services/vocabularyApi';
import { dashboardApi, type LearnerDashboard } from '../services/dashboardApi';
import { EMPTY_CURRENT_USER_GAME_DATA } from '../constants/appConstants';
import { buildLearningTopicGroups } from '../utils/learningTopicGroups';
import { loadCurrentUserGameData, saveCurrentUserGameData } from '../utils/gameDataStorage';
import { profileFrameStorageKey } from '../utils/profileFrames';
import { useToasts } from '../hooks/useToasts';
import { useGameProgress, type XpFloatItem } from '../hooks/useGameProgress';
import {
    appendStudyDate,
    appendStudySessionDetail,
    getTodayStudyDate,
    type StudySessionRecordInput,
} from '../utils/studyHistory';
import { type ToastItem } from '../hooks/useToasts';

interface AppContextValue {
    currentUser: AuthenticatedUser | null;
    syncUserGameData: (user: AuthenticatedUser | null) => void;
    handleLogout: () => Promise<void>;
    handleUserUpdated: (user: AuthenticatedUser) => void;
    addToast: (message: string, type?: string) => void;
    removeToast: (id: number) => void;
    toasts: ToastItem[];
    gameData: any;
    fullGameData: any;
    addXP: (amount: number) => void;
    triggerStreakCheck: () => void;
    xpFloats: XpFloatItem[];
    learningProgressState: LearningProgressState | null;
    learningTopicGroups: any[];
    topicFilters: VocabularyTopicItem[];
    learnedWordIds: number[];
    totalReviewCount: number;
    learnerAnalytics: LearnerDashboard | null;
    profileFrameKey: string | null;
    setProfileFrame: (key: string | null) => void;
    applyLearningProgress: (state: LearningProgressState) => void;
    refreshLearnerAnalytics: () => Promise<LearnerDashboard | null>;
    handleWordsLearned: (topicId: number, wordIds: number[]) => Promise<void>;
    handleRecordStudyHistory: (sessionInput: StudySessionRecordInput) => void;
    showStreakModal: boolean;
    setShowStreakModal: (show: boolean) => void;
    isLoading: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

export const useAppContext = () => {
    const ctx = useContext(AppContext);
    if (!ctx) throw new Error('useAppContext must be used inside AppProvider');
    return ctx;
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
    const [currentUser, setCurrentUser] = useState<AuthenticatedUser | null>(null);
    const [showStreakModal, setShowStreakModal] = useState(false);
    const [learningProgressState, setLearningProgressState] = useState<LearningProgressState | null>(null);
    const [topicFilters, setTopicFilters] = useState<VocabularyTopicItem[]>([]);
    const [learnerAnalytics, setLearnerAnalytics] = useState<LearnerDashboard | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const { toasts, addToast, removeToast } = useToasts();
    const { gameData, setGameData, xpFloats, addXP, triggerStreakCheck } = useGameProgress(addToast);

    // Selected cosmetic profile frame (local-only, per user). Shared app-wide so
    // Profile / Navbar / Leaderboard all show the same frame and react to changes.
    const [profileFrameKey, setProfileFrameKey] = useState<string | null>(null);

    useEffect(() => {
        if (!currentUser?.userId) {
            setProfileFrameKey(null);
            return;
        }
        try {
            const stored = localStorage.getItem(profileFrameStorageKey(currentUser.userId));
            setProfileFrameKey(stored && stored.trim() ? stored : null);
        } catch {
            setProfileFrameKey(null);
        }
    }, [currentUser?.userId]);

    const setProfileFrame = useCallback((key: string | null) => {
        setProfileFrameKey(key);
        const id = currentUser?.userId;
        if (!id) return;
        try {
            if (key) localStorage.setItem(profileFrameStorageKey(id), key);
            else localStorage.removeItem(profileFrameStorageKey(id));
        } catch {
            /* ignore storage errors */
        }
    }, [currentUser?.userId]);

    const syncUserGameData = useCallback((user: AuthenticatedUser | null) => {
        setCurrentUser(user);
        setGameData(prev => ({
            ...prev,
            currentUser: user
                ? loadCurrentUserGameData(user.userId)
                : { ...EMPTY_CURRENT_USER_GAME_DATA },
        }));
    }, [setGameData]);

    const loadTopics = useCallback(async () => {
        try {
            const topics = await vocabularyApi.getTopics();
            setTopicFilters(topics);
        } catch {
            setTopicFilters([]);
        }
    }, []);

    const refreshLearningProgress = useCallback(async () => {
        if (!currentUser?.userId) {
            setLearningProgressState(null);
            return;
        }
        try {
            const nextState = await learningProgressApi.getState();
            setLearningProgressState(nextState);
        } catch {
            setLearningProgressState(null);
        }
    }, [currentUser?.userId]);

    const applyLearningProgress = useCallback((state: LearningProgressState) => {
        setLearningProgressState(state);
    }, []);

    const refreshLearnerAnalytics = useCallback(async (): Promise<LearnerDashboard | null> => {
        if (!currentUser?.userId) {
            setLearnerAnalytics(null);
            return null;
        }

        try {
            const data = await dashboardApi.getLearnerDashboard();
            setLearnerAnalytics(data);
            return data;
        } catch {
            // Preserve current analytics when a background refresh fails.
            return null;
        }
    }, [currentUser?.userId]);

    const handleWordsLearned = useCallback(async (topicId: number, wordIds: number[]) => {
        if (!currentUser?.userId || topicId <= 0 || wordIds.length === 0) return;
        try {
            const nextState = await learningProgressApi.markWordsLearned(topicId, wordIds);
            setLearningProgressState(nextState);
        } catch {
            addToast('Không thể cập nhật tiến độ học lúc này.', 'info');
        }
    }, [currentUser?.userId, addToast]);

    const handleRecordStudyHistory = useCallback((sessionInput: StudySessionRecordInput) => {
        if (!sessionInput || !Array.isArray(sessionInput.words) || sessionInput.words.length === 0) return;
        const today = getTodayStudyDate();
        setGameData(prev => ({
            ...prev,
            currentUser: {
                ...prev.currentUser,
                studyHistory: appendStudyDate(prev.currentUser.studyHistory, today),
                studyHistoryDetails: appendStudySessionDetail(prev.currentUser.studyHistoryDetails, today, sessionInput),
            },
        }));
    }, [setGameData]);

    const handleLogout = useCallback(async () => {
        try {
            await authApi.logout();
        } finally {
            syncUserGameData(null);
            addToast('Đã đăng xuất.');
        }
    }, [syncUserGameData, addToast]);

    const handleUserUpdated = useCallback((updatedUser: AuthenticatedUser) => {
        setCurrentUser(prev => prev ? { ...prev, ...updatedUser } : updatedUser);
    }, []);

    useEffect(() => {
        let disposed = false;
        const bootstrap = async () => {
            const [session] = await Promise.all([authApi.me(), loadTopics()]);
            if (!disposed && session?.succeeded && session.user) {
                syncUserGameData(session.user);
            }
            if (!disposed) setIsLoading(false);
        };
        void bootstrap();
        return () => { disposed = true; };
    }, [loadTopics, syncUserGameData]);

    useEffect(() => {
        if (!currentUser?.userId) return;
        saveCurrentUserGameData(currentUser.userId, gameData.currentUser);
    }, [currentUser?.userId, gameData.currentUser]);

    useEffect(() => {
        void refreshLearningProgress();
    }, [refreshLearningProgress]);

    // Shared learner analytics (streak, XP, mastery, etc.) — single app-wide fetch
    // so the navbar and any consumer use the same backend source as the dashboard.
    useEffect(() => {
        if (!currentUser?.userId) {
            setLearnerAnalytics(null);
            return;
        }
        let disposed = false;
        dashboardApi.getLearnerDashboard()
            .then((data) => { if (!disposed) setLearnerAnalytics(data); })
            .catch(() => { if (!disposed) setLearnerAnalytics(null); });
        return () => { disposed = true; };
    }, [currentUser?.userId]);

    const learningTopicGroups = useMemo(
        () => buildLearningTopicGroups(topicFilters, learningProgressState),
        [topicFilters, learningProgressState],
    );

    const learnedWordIds = useMemo(
        () => Array.isArray(learningProgressState?.topics)
            ? Array.from(new Set(
                learningProgressState.topics
                    .flatMap((t: any) => Array.isArray(t.learnedWordIds) ? t.learnedWordIds : [])
                    .filter((id: any) => Number.isFinite(id) && id > 0),
            ))
            : [],
        [learningProgressState?.topics],
    );

    const totalReviewCount = useMemo(() => {
        if (!currentUser) return 0;
        return learningTopicGroups.reduce(
            (sum: number, cat: any) =>
                sum + cat.topics.reduce((s: number, t: any) => s + (t.stats?.review || 0), 0),
            0,
        );
    }, [learningTopicGroups, currentUser]);

    const value = useMemo<AppContextValue>(() => ({
        currentUser, syncUserGameData, handleLogout, handleUserUpdated,
        addToast, removeToast, toasts,
        gameData: gameData.currentUser,
        fullGameData: gameData,
        addXP, triggerStreakCheck, xpFloats,
        learningProgressState, learningTopicGroups, topicFilters, learnedWordIds,
        totalReviewCount,
        learnerAnalytics,
        profileFrameKey, setProfileFrame,
        applyLearningProgress, refreshLearnerAnalytics,
        handleWordsLearned, handleRecordStudyHistory,
        showStreakModal, setShowStreakModal,
        isLoading,
    }), [
        currentUser, syncUserGameData, handleLogout, handleUserUpdated,
        addToast, removeToast, toasts,
        gameData,
        addXP, triggerStreakCheck, xpFloats,
        learningProgressState, learningTopicGroups, topicFilters, learnedWordIds,
        totalReviewCount,
        learnerAnalytics,
        profileFrameKey, setProfileFrame,
        applyLearningProgress, refreshLearnerAnalytics,
        handleWordsLearned, handleRecordStudyHistory,
        showStreakModal,
        isLoading,
    ]);

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    );
};
