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

export const useAppBootstrap = ({ addToast, syncUserGameData }: UseAppBootstrapParams) => {
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState('home');
    const [selectedWord, setSelectedWord] = useState<any>(null);
    const [vocabularyItems, setVocabularyItems] = useState<any[]>([]);
    const [topicFilters, setTopicFilters] = useState<VocabularyTopicItem[]>([]);
    const [isVocabularyLoading, setIsVocabularyLoading] = useState(false);
    const [studyTopicId, setStudyTopicId] = useState<number | null>(null);
    const [studyWords, setStudyWords] = useState<any[]>([]);
    const [testResult, setTestResult] = useState<MinitestResultState | null>(null);

    const loadVocabulary = useCallback(async () => {
        setIsVocabularyLoading(true);
        try {
            const [items, topics] = await Promise.all([
                vocabularyApi.getAll(),
                vocabularyApi.getTopics()
            ]);
            setVocabularyItems(items.map(mapVocabularyToUiModel));
            setTopicFilters(topics);
        } catch {
            setVocabularyItems([]);
            setTopicFilters([]);
            addToast('Không tải được danh sách từ vựng từ hệ thống.', 'info');
        } finally {
            setIsVocabularyLoading(false);
        }
    }, [addToast]);

    const handleStartStudy = useCallback(async (topicId: number) => {
        setStudyTopicId(topicId);
        try {
            const items = await vocabularyApi.getLearningByTopic(topicId);
            setStudyWords(items.map(mapLearningVocabularyToUiModel));
        } catch {
            setStudyWords([]);
            addToast('Không tải được dữ liệu học cho chủ đề này.', 'info');
        }

        setCurrentPage('study-session');
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
                loadVocabulary()
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
    }, [loadVocabulary, syncUserGameData]);

    return {
        isLoading,
        currentPage,
        setCurrentPage,
        selectedWord,
        vocabularyItems,
        topicFilters,
        isVocabularyLoading,
        studyTopicId,
        studyWords,
        testResult,
        handleStartStudy,
        handleSelectWord,
        handleCloseWordDetail,
        handleFinishStudy
    };
};
