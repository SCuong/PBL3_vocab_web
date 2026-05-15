const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();

// Empty base = relative requests. Dev: Vite proxies /api to the local .NET
// backend (vite.config.ts). Prod: frontend and API served same-origin.
export const API_BASE_URL = (configuredApiUrl ?? '').replace(/\/+$/, '');

export const buildApiUrl = (path: string) => {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    if (API_BASE_URL.endsWith('/api') && normalizedPath.startsWith('/api/')) {
        return `${API_BASE_URL}${normalizedPath.slice(4)}`;
    }

    return `${API_BASE_URL}${normalizedPath}`;
};

export const apiFetch = (path: string, options: RequestInit = {}) => {
    return fetch(buildApiUrl(path), {
        ...options,
        credentials: options.credentials ?? 'include'
    });
};
