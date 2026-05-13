export const ROUTE_PATHS: Record<string, string> = {
    home: '/',
    vocabulary: '/vocabulary',
    auth: '/login',
    register: '/register',
    'learning-topics': '/learning',
    'study-session': '/learning/study',
    'minitest-result': '/learning/result',
    profile: '/profile',
    leaderboard: '/leaderboard',
    admin: '/admin',
};

export const PAGE_NAMES: Record<string, string> = Object.fromEntries(
    Object.entries(ROUTE_PATHS).map(([key, value]) => [value, key]),
);

export function pageToPath(page: string): string {
    return ROUTE_PATHS[page] ?? '/';
}

export function pathToPage(path: string): string {
    return PAGE_NAMES[path] ?? 'home';
}
