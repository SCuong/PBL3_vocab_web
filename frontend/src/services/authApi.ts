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

    register: async (payload: { name: string; email: string; password: string; confirmPassword: string }) => {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload)
        });

        const data = (await response.json()) as AuthApiResponse;
        if (!response.ok || !data.succeeded) {
            throw new Error(data.message || 'Đăng ký thất bại.');
        }

        return data;
    },

    verifyEmail: async (payload: { token: string }) => {
        const response = await fetch('/api/auth/verify-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload)
        });

        const data = (await response.json()) as AuthApiResponse;
        if (!response.ok || !data.succeeded) {
            throw new Error(data.message || 'Xác minh email thất bại.');
        }

        return data.message || 'Email verified successfully. You can now log in.';
    },

    resendVerification: async (payload: { email: string }) => {
        const response = await fetch('/api/auth/resend-verification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload)
        });

        const data = (await response.json()) as AuthApiResponse;
        if (!response.ok || !data.succeeded) {
            throw new Error(data.message || 'Không thể gửi lại email xác minh.');
        }

        return data;
    },

    googleLogin: async (payload: { idToken: string }) => {
        const response = await fetch('/api/auth/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload)
        });

        const data = (await response.json()) as AuthApiResponse;
        if (!response.ok || !data.succeeded || !data.user) {
            throw new Error(data.message || 'Đăng nhập Google thất bại.');
        }

        return data.user;
    },

    forgotPassword: async (payload: { email: string }): Promise<ForgotPasswordResult> => {
        const response = await fetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload)
        });

        const data = (await response.json()) as AuthApiResponse;
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
        const response = await fetch('/api/auth/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload)
        });

        const data = (await response.json()) as AuthApiResponse;
        if (!response.ok || !data.succeeded) {
            throw new Error(data.message || 'Đặt lại mật khẩu thất bại.');
        }

        return data.message || 'Đặt lại mật khẩu thành công.';
    },

    updateProfile: async (payload: { username: string; email: string }) => {
        const response = await fetch('/api/account/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload)
        });

        const data = (await response.json()) as AuthApiResponse;
        if (!response.ok || !data.succeeded || !data.user) {
            throw new Error(data.message || 'Cập nhật hồ sơ thất bại.');
        }

        return data.user;
    },

    changePassword: async (payload: { currentPassword?: string; newPassword: string; confirmNewPassword: string }) => {
        const response = await fetch('/api/account/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload)
        });

        const data = (await response.json()) as AuthApiResponse;
        if (!response.ok || !data.succeeded) {
            throw new Error(data.message || 'Đổi mật khẩu thất bại.');
        }

        return data;
    },

    logout: async () => {
        await fetch('/api/auth/logout', {
            method: 'POST',
            credentials: 'include'
        });
    },

    deleteAccount: async (payload: { password: string }) => {
        const response = await fetch('/api/account/delete', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(payload)
        });

        const data = (await response.json()) as AuthApiResponse;
        if (!response.ok || !data.succeeded) {
            throw new Error(data.message || 'Không thể xoá tài khoản.');
        }

        return data.message || 'Tài khoản đã bị xoá thành công.';
    }
};
