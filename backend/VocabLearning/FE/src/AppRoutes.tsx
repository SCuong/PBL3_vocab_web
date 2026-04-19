import { AdminDashboard, Auth, Home, Leaderboard, MinitestResult, Profile, Vocabulary, VocabDetail } from './pages';

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
    studyTopicId: number | null;
    studyWords: any[];
    handleFinishStudy: (score?: number, total?: number, detail?: any) => void;
    addXP: (amount: number) => void;
    triggerStreakCheck: () => void;
    testResult: { score: number; total: number; detail?: any } | null;
    handleLogout: () => void;
    onOpenStreak: () => void;
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
    studyTopicId,
    studyWords,
    handleFinishStudy,
    addXP,
    triggerStreakCheck,
    testResult,
    handleLogout,
    onOpenStreak,
    LearningTopicsComponent,
    StudySessionComponent
}: AppRoutesProps) => {
    const routeMap: Record<string, JSX.Element> = {
        home: <Home onNavigate={setCurrentPage} />,
        vocabulary: <Vocabulary onNavigate={setCurrentPage} onSelectWord={handleSelectWord} items={vocabularyItems} topics={topicFilters} isLoading={isVocabularyLoading} />,
        'vocab-detail': <VocabDetail word={selectedWord} onBack={() => setCurrentPage('vocabulary')} />,
        auth: <Auth onLogin={(u: any) => {
            syncUserGameData(u);
            setCurrentPage('home');
        }} onAddToast={addToast} />,
        'learning-topics': <LearningTopicsComponent onStartStudy={handleStartStudy} currentUser={currentUser} gameData={gameData.currentUser} onNavigate={setCurrentPage} topicGroups={learningTopicGroups} />,
        'study-session': <StudySessionComponent topicId={studyTopicId} studyWords={studyWords} onFinish={handleFinishStudy} onAddXP={addXP} onStreakCheck={triggerStreakCheck} onAddToast={addToast} />,
        'minitest-result': <MinitestResult score={testResult?.score} total={testResult?.total} detail={testResult?.detail} onBack={setCurrentPage} />,
        profile: <Profile user={{ ...currentUser, ...gameData.currentUser }} onLogout={handleLogout} gameData={gameData} onFreezeStreak={() => { }} onOpenStreak={onOpenStreak} />,
        leaderboard: <Leaderboard gameData={gameData} />,
        admin: <AdminDashboard />
    };

    return routeMap[currentPage] ?? null;
};
