export const PATHS = {
    home: '/home',
    login: '/login',
    register: '/register',
    verifyEmail: '/verify-email',
    dashboard: '/dashboard',
    vocabulary: '/vocabulary',
    learning: '/learning',
    learningStudy: '/learning/study',
    learningResult: '/learning/result',
    learningReview: '/learning/review',
    profile: '/profile',
    leaderboard: '/leaderboard',
    admin: '/admin',
    adminOverview: '/admin/overview',
    adminUsers: '/admin/users',
    adminTopics: '/admin/topics',
    adminVocabulary: '/admin/vocabulary',
} as const;

export type AppPath = typeof PATHS[keyof typeof PATHS];
