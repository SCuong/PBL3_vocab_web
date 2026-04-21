import type {
    StudyHistoryDayDetail,
    StudyHistoryDetails,
    StudySessionSnapshot,
    StudyWordSnapshot
} from '../constants/appConstants';

export type StudySessionRecordInput = {
    topicId: number;
    topicTitle: string;
    xp: number;
    words: StudyWordSnapshot[];
    timeSpentSeconds?: number;
};

export const getTodayStudyDate = () => new Date().toISOString().split('T')[0];

export const isIsoDateString = (value: unknown): value is string => (
    typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
);

export const buildHistoryFromStreak = (lastStudyDate: string, streak: number) => {
    if (!isIsoDateString(lastStudyDate) || !Number.isFinite(streak) || streak <= 0) {
        return [] as string[];
    }

    const anchor = new Date(`${lastStudyDate}T00:00:00`);
    if (Number.isNaN(anchor.getTime())) {
        return [] as string[];
    }

    const days = Array.from({ length: streak }, (_, i) => {
        const d = new Date(anchor);
        d.setDate(d.getDate() - ((streak - 1) - i));
        return d.toISOString().split('T')[0];
    });

    return Array.from(new Set(days)).sort((a, b) => a.localeCompare(b));
};

export const normalizeStudyHistory = (history: unknown) => (
    Array.isArray(history)
        ? Array.from(new Set(history.filter(isIsoDateString))).sort((a, b) => a.localeCompare(b))
        : []
);

export const appendStudyDate = (history: string[], date: string) => (
    history.includes(date)
        ? history
        : [...history, date].sort((a, b) => a.localeCompare(b))
);

export const appendStudySessionDetail = (
    details: StudyHistoryDetails,
    date: string,
    input: StudySessionRecordInput
): StudyHistoryDetails => {
    const current = details[date];
    const nextSession: StudySessionSnapshot = {
        topicId: input.topicId,
        topicTitle: input.topicTitle,
        xp: input.xp,
        words: Array.isArray(input.words) ? input.words : [],
        timeSpentSeconds: input.timeSpentSeconds
    };

    const sessions = [...(current?.sessions ?? []), nextSession];
    const uniqueWordIds = new Set(
        sessions
            .flatMap(session => session.words)
            .map(word => word.id)
            .filter(id => Number.isFinite(id) && id > 0)
    );
    const topicTitles = Array.from(new Set(
        sessions
            .map(session => session.topicTitle)
            .filter((title): title is string => typeof title === 'string' && title.trim().length > 0)
    ));

    return {
        ...details,
        [date]: {
            date,
            sessions,
            totalXp: sessions.reduce((sum, session) => sum + (Number.isFinite(session.xp) ? session.xp : 0), 0),
            totalWords: uniqueWordIds.size,
            topicTitles
        }
    };
};

const distributeByDay = (total: number, totalDays: number, dayIndex: number) => {
    if (!Number.isFinite(total) || total <= 0 || totalDays <= 0 || dayIndex < 0 || dayIndex >= totalDays) {
        return 0;
    }

    const base = Math.floor(total / totalDays);
    const remainder = total % totalDays;
    const firstRemainderIndex = totalDays - remainder;

    return dayIndex >= firstRemainderIndex ? base + 1 : base;
};

export const buildStudyDaySummary = (
    date: string,
    historyDates: string[],
    dayDetail: StudyHistoryDayDetail | null | undefined,
    totalLearnedWords: number,
    totalXp: number
) => {
    const normalizedHistory = normalizeStudyHistory(historyDates);
    const dayIndex = normalizedHistory.indexOf(date);

    const detailWords = Number.isFinite(dayDetail?.totalWords) ? dayDetail.totalWords : 0;
    const detailXp = Number.isFinite(dayDetail?.totalXp) ? dayDetail.totalXp : 0;
    const topics = Array.isArray(dayDetail?.topicTitles) ? dayDetail.topicTitles : [];

    if (detailWords > 0 || detailXp > 0 || topics.length > 0) {
        return {
            totalWords: detailWords,
            totalXp: detailXp,
            topics
        };
    }

    if (dayIndex === -1) {
        return {
            totalWords: 0,
            totalXp: 0,
            topics: []
        };
    }

    return {
        totalWords: distributeByDay(totalLearnedWords, normalizedHistory.length, dayIndex),
        totalXp: distributeByDay(totalXp, normalizedHistory.length, dayIndex),
        topics: []
    };
};
