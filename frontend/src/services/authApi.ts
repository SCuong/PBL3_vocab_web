import { apiFetch } from './apiClient';

export type AuthenticatedUser = {
    userId: number;
    username: string;
    email: string;
    createdAt: string;
    role: string;
    status: string;
    hasGoogleLogin: boolean;
    hasLocalPassword: boolean;
    isEmailVerified: boolean;
};

export type AuthApiResponse = {
    succeeded: boolean;
    message?: string;
    user?: AuthenticatedUser;
    emailSent?: boolean;
    usedFallbackLink?: boolean;
    resetLink?: string;
    verificationLink?: string;
    inboxUrl?: string;
};

export type ForgotPasswordResult = {
    message: string;
    emailSent: boolean;
    usedFallbackLink: boolean;
    resetLink: string;
    inboxUrl: string;
};

const readAuthResponse = async (response: Response): Promise<AuthApiResponse> => {
    if (response.status === 204) {
        return { succeeded: response.ok };
    }

    const text = await response.text();
    if (!text.trim()) {
        return {
            succeeded: false,
            message: response.status === 401 ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' : undefined
        };
    }

    return JSON.parse(text) as AuthApiResponse;
};

export const authApi = {
    me: async (): Promise<AuthApiResponse | null> => {
        try {
            const response = await apiFetch('/api/auth/me');

            if (response.status === 401) {
                return null;
            }

            const data = await readAuthResponse(response);
            return response.ok ? data : null;
        } catch {
            return null;
        }
    },

    login: async (payload: { usernameOrEmail: string; password: string; rememberMe: boolean }) => {
        const response = await apiFetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await readAuthResponse(response);
        if (!response.ok || !data.succeeded || !data.user) {
            throw new Error(data.message || 'Đăng nhập thất bại.');
        }

        return data.user;
    },

    register: async (payload: { name: string; email: string; password: string; confirmPassword: string }) => {
        const response = await apiFetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await readAuthResponse(response);
        if (!response.ok || !data.succeeded) {
            throw new Error(data.message || 'Đăng ký thất bại.');
        }

        return data;
    },

    verifyEmail: async (payload: { token: string }) => {
        const response = await apiFetch('/api/auth/verify-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await readAuthResponse(response);
        if (!response.ok || !data.succeeded) {
            throw new Error(data.message || 'Xác minh email thất bại.');
        }

        return data.message || 'Email verified successfully. You can now log in.';
    },

    resendVerification: async (payload: { email: string }) => {
        const response = await apiFetch('/api/auth/resend-verification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await readAuthResponse(response);
        if (!response.ok || !data.succeeded) {
            throw new Error(data.message || 'Không thể gửi lại email xác minh.');
        }

        return data;
    },

    googleLogin: async (payload: { idToken: string }) => {
        const response = await apiFetch('/api/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await readAuthResponse(response);
        if (!response.ok || !data.succeeded || !data.user) {
            throw new Error(data.message || 'Đăng nhập Google thất bại.');
        }

        return data.user;
    },

    forgotPassword: async (payload: { email: string }): Promise<ForgotPasswordResult> => {
        const response = await apiFetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await readAuthResponse(response);
        if (!response.ok || !data.succeeded) {
            throw new Error(data.message || 'Không thể gửi yêu cầu quên mật khẩu.');
        }

        return {
            message: data.message || 'Nếu email tồn tại, hệ thống đã gửi liên kết đặt lại mật khẩu.',
            emailSent: Boolean(data.emailSent),
            usedFallbackLink: Boolean(data.usedFallbackLink),
            resetLink: data.resetLink || '',
            inboxUrl: data.inboxUrl || 'https://mail.google.com'
        };
    },

    resetPassword: async (payload: {
        email: string;
        token: string;
        newPassword: string;
        confirmNewPassword: string;
    }) => {
        const response = await apiFetch('/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await readAuthResponse(response);
        if (!response.ok || !data.succeeded) {
            throw new Error(data.message || 'Đặt lại mật khẩu thất bại.');
        }

        return data.message || 'Đặt lại mật khẩu thành công.';
    },

    updateProfile: async (payload: { username: string; email: string }) => {
        const response = await apiFetch('/api/account/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await readAuthResponse(response);
        if (!response.ok || !data.succeeded || !data.user) {
            throw new Error(data.message || 'Cập nhật hồ sơ thất bại.');
        }

        return data.user;
    },

    changePassword: async (payload: { currentPassword: string; newPassword: string; confirmNewPassword: string }) => {
        const response = await apiFetch('/api/account/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await readAuthResponse(response);
        if (!response.ok || !data.succeeded) {
            throw new Error(data.message || 'Đổi mật khẩu thất bại.');
        }
    },

    logout: async () => {
        await apiFetch('/api/auth/logout', {
            method: 'POST'
        });
    },

    deleteAccount: async (payload: { password: string }) => {
        const response = await apiFetch('/api/account/delete', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await readAuthResponse(response);
        if (!response.ok || !data.succeeded) {
            throw new Error(data.message || 'Không thể xoá tài khoản.');
        }

        return data.message || 'Tài khoản đã bị xoá thành công.';
    }
};
