import React from 'react';
import { AdminDashboard, Auth, Home, Leaderboard, MinitestResult, Profile, Vocabulary, VocabDetail } from './pages';
import type { AuthenticatedUser } from './services/authApi';

type AppRoutesProps = {
    currentPage: string;
    setCurrentPage: (page: string) => void;
    handleSelectWord: (word: any) => void;
    vocabularyItems: any[];
    topicFilters: any[];
    isVocabularyLoading: boolean;
    selectedWord: any;
    syncUserGameData: (user: any) => void;
    addToast: (message: string, type?: string) => void;
    handleStartStudy: (topicId: number) => void;
    currentUser: any;
    gameData: any;
    learningTopicGroups: any[];
    learningProgressState: any;
    studyTopicId: number | null;
    studyWords: any[];
    handleFinishStudy: (score?: number, total?: number, detail?: any) => void;
    addXP: (amount: number) => void;
    triggerStreakCheck: () => void;
    handleWordsLearned: (topicId: number, wordIds: number[]) => Promise<void>;
    testResult: { score: number; total: number; detail?: any } | null;
    handleLogout: () => void;
    onOpenStreak: () => void;
    onUserUpdated: (user: AuthenticatedUser) => void;
    LearningTopicsComponent: any;
    StudySessionComponent: any;
};

export const AppRoutes = ({
    currentPage,
    setCurrentPage,
    handleSelectWord,
    vocabularyItems,
    topicFilters,
    isVocabularyLoading,
    selectedWord,
    syncUserGameData,
    addToast,
    handleStartStudy,
    currentUser,
    gameData,
    learningTopicGroups,
    learningProgressState,
    studyTopicId,
    studyWords,
    handleFinishStudy,
    addXP,
    triggerStreakCheck,
    handleWordsLearned,
    testResult,
    handleLogout,
    onOpenStreak,
    onUserUpdated,
    LearningTopicsComponent,
    StudySessionComponent
}: AppRoutesProps) => {
    const learnedWordsCount = Array.isArray(learningProgressState?.topics)
        ? new Set(
            learningProgressState.topics
                .flatMap((topic: any) => Array.isArray(topic.learnedWordIds) ? topic.learnedWordIds : [])
                .filter((wordId: any) => Number.isFinite(wordId) && wordId > 0)
        ).size
        : undefined;

    const profileUser = {
        ...currentUser,
        ...gameData.currentUser,
        learnedWords: learnedWordsCount ?? gameData.currentUser?.learnedWords ?? 0
    };

    const routeMap: Record<string, any> = {
        home: <Home onNavigate={setCurrentPage} />,
        vocabulary: <Vocabulary onNavigate={setCurrentPage} onSelectWord={handleSelectWord} items={vocabularyItems} topics={topicFilters} isLoading={isVocabularyLoading} />,
        'vocab-detail': <VocabDetail word={selectedWord} onBack={() => setCurrentPage('vocabulary')} />,
        auth: <Auth onLogin={(u: any) => {
            syncUserGameData(u);
            setCurrentPage('home');
        }} onAddToast={addToast} />,
        register: <Auth onLogin={(u: any) => {
            syncUserGameData(u);
            setCurrentPage('home');
        }} onAddToast={addToast} initialMode="register" />,
        'learning-topics': <LearningTopicsComponent onStartStudy={handleStartStudy} currentUser={currentUser} gameData={gameData.currentUser} onNavigate={setCurrentPage} topicGroups={learningTopicGroups} />,
        'study-session': <StudySessionComponent topicId={studyTopicId} studyWords={studyWords} topicGroups={learningTopicGroups} learningProgressState={learningProgressState} onFinish={handleFinishStudy} onAddXP={addXP} onStreakCheck={triggerStreakCheck} onAddToast={addToast} onWordsLearned={handleWordsLearned} />,
        'minitest-result': <MinitestResult score={testResult?.score} total={testResult?.total} detail={testResult?.detail} onBack={setCurrentPage} />,
        profile: <Profile user={profileUser} onLogout={handleLogout} onOpenStreak={onOpenStreak} onAddToast={addToast} onUserUpdated={onUserUpdated} />,
        leaderboard: <Leaderboard gameData={gameData} />,
        admin: <AdminDashboard />
    };

    return routeMap[currentPage] ?? null;
};
