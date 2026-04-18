export type AuthenticatedUser = {
    userId: number;
    username: string;
    email: string;
    role: string;
    status: string;
    hasGoogleLogin: boolean;
    hasLocalPassword: boolean;
};

export type AuthApiResponse = {
    succeeded: boolean;
    message?: string;
    user?: AuthenticatedUser;
};

export const authApi = {
    me: async (): Promise<AuthApiResponse | null> => {
        try {
            const response = await fetch('/api/auth/me', {
                credentials: 'include'
            });

            if (response.status === 401) {
                return null;
            }

            const data = (await response.json()) as AuthApiResponse;
            return response.ok ? data : null;
        } catch {
            return null;
        }
    },

    login: async (payload: { usernameOrEmail: string; password: string; rememberMe: boolean }) => {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload)
        });

        const data = (await response.json()) as AuthApiResponse;
        if (!response.ok || !data.succeeded || !data.user) {
            throw new Error(data.message || 'Đăng nhập thất bại.');
        }

        return data.user;
    },

    register: async (payload: { name: string; email: string; password: string }) => {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload)
        });

        const data = (await response.json()) as AuthApiResponse;
        if (!response.ok || !data.succeeded || !data.user) {
            throw new Error(data.message || 'Đăng ký thất bại.');
        }

        return data.user;
    },

    logout: async () => {
        await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });
    }
};
