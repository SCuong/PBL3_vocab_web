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

const toLocalIsoDate = (date: Date) => {
    const pad2 = (value: number) => (value < 10 ? `0${value}` : String(value));
    const year = date.getFullYear();
    const month = pad2(date.getMonth() + 1);
    const day = pad2(date.getDate());
    return `${year}-${month}-${day}`;
};

export const getTodayStudyDate = () => toLocalIsoDate(new Date());

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
        return toLocalIsoDate(d);
    });

    return Array.from(new Set(days)).sort((a, b) => a.localeCompare(b));
};

export const getLatestStudyDate = (history: unknown) => {
    const normalized = normalizeStudyHistory(history);
    return normalized.length > 0 ? normalized[normalized.length - 1] : '';
};

export const calculateStreakFromHistory = (history: unknown) => {
    const normalized = normalizeStudyHistory(history);
    if (normalized.length === 0) {
        return 0;
    }

    let streak = 1;

    for (let i = normalized.length - 1; i > 0; i -= 1) {
        const current = new Date(`${normalized[i]}T00:00:00`);
        const previous = new Date(`${normalized[i - 1]}T00:00:00`);

        if (Number.isNaN(current.getTime()) || Number.isNaN(previous.getTime())) {
            break;
        }

        const expectedPrevious = new Date(current);
        expectedPrevious.setDate(expectedPrevious.getDate() - 1);

        if (toLocalIsoDate(expectedPrevious) !== toLocalIsoDate(previous)) {
            break;
        }

        streak += 1;
    }

    return streak;
};

export const normalizeStudyHistory = (history: unknown) => (
    Array.isArray(history)
        ? Array.from(new Set(history.filter(isIsoDateString))).sort((a, b) => a.localeCompare(b))
        : []
);

export const appendStudyDate = (history: string[], date: string) => (
    history.indexOf(date) !== -1
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
    const words = sessions.reduce<StudyWordSnapshot[]>((allWords, session) => {
        if (!Array.isArray(session.words) || session.words.length === 0) {
            return allWords;
        }

        return [...allWords, ...session.words];
    }, []);

    const uniqueWordIds = new Set(
        words
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
