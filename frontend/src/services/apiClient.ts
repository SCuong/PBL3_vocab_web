const ANTIFORGERY_PATH = '/api/auth/antiforgery';
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const DEFAULT_XSRF_HEADER_NAME = 'X-XSRF-TOKEN';

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

// ASP.NET antiforgery uses two distinct tokens: a cookie token (stored in the
// XSRF-TOKEN cookie) and a request token returned in the response body. The
// header must carry the request token, not the cookie value. We cache the
// request token in memory and refresh it when the server rejects a request.
let cachedRequestToken: string | null = null;
let cachedHeaderName: string = DEFAULT_XSRF_HEADER_NAME;
let antiforgeryPrimer: Promise<void> | null = null;

async function fetchAntiforgeryToken(): Promise<void> {
    try {
        const res = await fetch(buildApiUrl(ANTIFORGERY_PATH), { credentials: 'include' });
        if (!res.ok) return;
        const data = await res.json() as { token?: string; headerName?: string };
        if (data?.token) {
            cachedRequestToken = data.token;
            cachedHeaderName = data.headerName || DEFAULT_XSRF_HEADER_NAME;
        }
    } catch {
        // Swallow: a missing antiforgery prime surfaces later as a 400 from the
        // server, which apiFetch handles by retrying after a fresh prime.
    }
}

export function primeAntiforgery(): Promise<void> {
    if (cachedRequestToken) return Promise.resolve();
    if (!antiforgeryPrimer) {
        antiforgeryPrimer = fetchAntiforgeryToken().finally(() => { antiforgeryPrimer = null; });
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

async function doFetch(path: string, options: RequestInit, method: string): Promise<Response> {
    let headers = options.headers;
    if (MUTATING_METHODS.has(method) && cachedRequestToken) {
        headers = mergeHeaders(headers, { [cachedHeaderName]: cachedRequestToken });
    }
    return fetch(buildApiUrl(path), {
        ...options,
        headers,
        credentials: options.credentials ?? 'include'
    });
}

export const apiFetch = async (path: string, options: RequestInit = {}) => {
    const method = (options.method ?? 'GET').toUpperCase();

    if (MUTATING_METHODS.has(method)) {
        await primeAntiforgery();
    }

    const response = await doFetch(path, options, method);

    // Retry once on antiforgery rejection: token may have rotated after sign-in
    // or been evicted server-side. Antiforgery failures surface as a 400 with
    // a problem-details body; application-level 400s return plain JSON, so the
    // content-type lets us distinguish without consuming the body.
    if (
        response.status === 400
        && MUTATING_METHODS.has(method)
        && response.headers.get('Content-Type')?.includes('application/problem+json')
    ) {
        cachedRequestToken = null;
        await primeAntiforgery();
        if (cachedRequestToken) {
            return doFetch(path, options, method);
        }
    }

    return response;
};
