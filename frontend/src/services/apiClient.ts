const DEFAULT_PRODUCTION_API_URL = 'https://pbl3-vocab-api.azurewebsites.net';

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();

export const API_BASE_URL = (configuredApiUrl || DEFAULT_PRODUCTION_API_URL).replace(/\/+$/, '');

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
