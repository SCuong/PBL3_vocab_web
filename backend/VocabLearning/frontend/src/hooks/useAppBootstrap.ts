import { useCallback, useEffect, useState } from 'react';
import { authApi, type AuthenticatedUser } from '../services/authApi';
import { vocabularyApi, type VocabularyTopicItem } from '../services/vocabularyApi';
import { mapLearningVocabularyToUiModel, mapVocabularyToUiModel } from '../utils/vocabularyMapper';

type UseAppBootstrapParams = {
    addToast: (message: string, type?: string) => void;
    syncUserGameData: (user: AuthenticatedUser | null) => void;
};

export type MinitestResultState = {
    score: number;
    total: number;
    detail?: any;
};

const resolveInitialPage = () => {
    const params = new URLSearchParams(window.location.search);
    const mode = (params.get('mode') || '').toLowerCase();

    if (mode === 'reset') {
        return 'auth';
    }

    return 'home';
};

export const useAppBootstrap = ({ addToast, syncUserGameData }: UseAppBootstrapParams) => {
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(resolveInitialPage);
    const [selectedWord, setSelectedWord] = useState<any>(null);
    const [topicFilters, setTopicFilters] = useState<VocabularyTopicItem[]>([]);
    const [studyTopicId, setStudyTopicId] = useState<number | null>(null);
    const [studyWords, setStudyWords] = useState<any[]>([]);
    const [testResult, setTestResult] = useState<MinitestResultState | null>(null);

    const loadTopics = useCallback(async () => {
        try {
            const topics = await vocabularyApi.getTopics();
            setTopicFilters(topics);
        } catch {
            setTopicFilters([]);
            addToast('Không tải được danh sách chủ đề từ hệ thống.', 'info');
        }
    }, [addToast]);

    const handleStartStudy = useCallback(async (topicId: number) => {
        setStudyTopicId(topicId);
        try {
            const items = await vocabularyApi.getLearningByTopic(topicId);
            if (!items || items.length === 0) {
                addToast('Chủ đề này chưa có từ vựng.', 'info');
                return;
            }
            setStudyWords(items.map(mapLearningVocabularyToUiModel));
            setCurrentPage('study-session');
        } catch {
            setStudyWords([]);
            addToast('Không tải được dữ liệu học cho chủ đề này.', 'info');
        }
    }, [addToast]);

    const handleSelectWord = useCallback(async (word: any) => {
        try {
            const detail = await vocabularyApi.getById(word.id);
            setSelectedWord(mapVocabularyToUiModel(detail));
        } catch {
            setSelectedWord(word);
        }
    }, []);

    const handleCloseWordDetail = useCallback(() => {
        setSelectedWord(null);
    }, []);

    const handleFinishStudy = useCallback((score?: number, total?: number, detail?: any) => {
        if (score !== undefined && total !== undefined) {
            setTestResult({ score, total, detail });
            setCurrentPage('minitest-result');
            return;
        }

        setCurrentPage('learning-topics');
    }, []);

    useEffect(() => {
        let isDisposed = false;

        const bootstrap = async () => {
            const splashTimer = new Promise(resolve => setTimeout(resolve, 1200));
            const [session] = await Promise.all([
                authApi.me(),
                loadTopics()
            ]);

            if (!isDisposed && session?.succeeded && session.user) {
                syncUserGameData(session.user);
            }

            await splashTimer;
            if (!isDisposed) {
                setIsLoading(false);
            }
        };

        void bootstrap();

        return () => {
            isDisposed = true;
        };
    }, [loadTopics, syncUserGameData]);

    return {
        isLoading,
        currentPage,
        setCurrentPage,
        selectedWord,
        topicFilters,
        studyTopicId,
        studyWords,
        testResult,
        handleStartStudy,
        handleSelectWord,
        handleCloseWordDetail,
        handleFinishStudy
    };
};
