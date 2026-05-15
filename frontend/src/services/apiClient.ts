const ANTIFORGERY_PATH = '/api/auth/antiforgery';
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const XSRF_COOKIE_NAME = 'XSRF-TOKEN';
const XSRF_HEADER_NAME = 'X-XSRF-TOKEN';

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

function readCookie(name: string): string | null {
    if (typeof document === 'undefined' || !document.cookie) return null;
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${escaped}=([^;]+)`));
    return match ? decodeURIComponent(match[1]) : null;
}

let antiforgeryPrimer: Promise<void> | null = null;

export function primeAntiforgery(): Promise<void> {
    if (readCookie(XSRF_COOKIE_NAME)) return Promise.resolve();
    if (!antiforgeryPrimer) {
        antiforgeryPrimer = fetch(buildApiUrl(ANTIFORGERY_PATH), {
            credentials: 'include'
        })
            .then(() => undefined)
            .catch(() => undefined)
            .finally(() => { antiforgeryPrimer = null; });
    }
    return antiforgeryPrimer;
}

function mergeHeaders(base: HeadersInit | undefined, extra: Record<string, string>): HeadersInit {
    if (base instanceof Headers) {
        const merged = new Headers(base);
        for (const [k, v] of Object.entries(extra)) merged.set(k, v);
        return merged;
    }
    if (Array.isArray(base)) {
        return [...base, ...Object.entries(extra)];
    }
    return { ...(base ?? {}), ...extra };
}

export const apiFetch = async (path: string, options: RequestInit = {}) => {
    const method = (options.method ?? 'GET').toUpperCase();
    let headers = options.headers;

    if (MUTATING_METHODS.has(method)) {
        await primeAntiforgery();
        const token = readCookie(XSRF_COOKIE_NAME);
        if (token) {
            headers = mergeHeaders(headers, { [XSRF_HEADER_NAME]: token });
        }
    }

    return fetch(buildApiUrl(path), {
        ...options,
        headers,
        credentials: options.credentials ?? 'include'
    });
};
