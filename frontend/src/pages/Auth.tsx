import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, Check, CheckCircle2, Flame, Sparkles } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, FloatingField } from '../components/ui';
import { authApi } from '../services/authApi';
import { useAppContext } from '../context/AppContext';
import { PATHS } from '../routes/paths';
import {
    checkPasswordPolicy,
    isPasswordPolicyValid,
    PASSWORD_MAX_LENGTH,
    PASSWORD_POLICY_LABELS,
    type PasswordPolicyResult,
} from '../utils/passwordPolicy';

type GoogleCredentialResponse = {
    credential?: string;
};

declare global {
    interface Window {
        google?: {
            accounts: {
                id: {
                    initialize: (options: {
                        client_id: string;
                        callback: (response: GoogleCredentialResponse) => void;
                        auto_select?: boolean;
                        cancel_on_tap_outside?: boolean;
                        itp_support?: boolean;
                        use_fedcm_for_button?: boolean;
                    }) => void;
                    renderButton: (
                        parent: HTMLElement,
                        options: {
                            theme?: 'outline' | 'filled_blue' | 'filled_black';
                            size?: 'large' | 'medium' | 'small';
                            type?: 'standard' | 'icon';
                            text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
                            shape?: 'rectangular' | 'pill' | 'circle' | 'square';
                            width?: number;
                        }
                    ) => void;
                    disableAutoSelect?: () => void;
                };
            };
        };
    }
}

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? '';
const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 30;
const EMAIL_VERIFICATION_REQUIRED_MESSAGES = new Set([
    'Please verify your email before logging in.',
    'Vui lòng xác minh email trước khi đăng nhập.',
]);
const REGISTER_EMAIL_FORMAT_MESSAGE = 'Email không đúng định dạng.';
const ALLOWED_EMAIL_TLDS = new Set([
    'com', 'net', 'org', 'edu', 'gov', 'vn', 'com.vn', 'edu.vn', 'gov.vn', 'net.vn',
    'info', 'io', 'co', 'dev', 'app', 'me', 'biz'
]);

const normalizeSignupEmail = (value: string) => value.trim().toLowerCase();
const normalizeDisplayName = (value: string) => value.trim().replace(/\s+/g, ' ');

const isValidSignupEmail = (value: string) => {
    const email = normalizeSignupEmail(value);
    if (!/^[^\s@]+@[^\s@]+\.[A-Za-z]{2,24}$/.test(email)) {
        return false;
    }

    const domainParts = email.split('@')[1]?.split('.').filter(Boolean) ?? [];
    if (domainParts.length < 2) {
        return false;
    }

    const topLevelDomain = domainParts[domainParts.length - 1];
    const twoPartTopLevelDomain = domainParts.length >= 2
        ? `${domainParts[domainParts.length - 2]}.${topLevelDomain}`
        : topLevelDomain;

    return ALLOWED_EMAIL_TLDS.has(topLevelDomain) || ALLOWED_EMAIL_TLDS.has(twoPartTopLevelDomain);
};

const isValidDisplayName = (value: string) => {
    const normalized = normalizeDisplayName(value);
    const readableCharacters = normalized.replace(/[^\p{L}\p{N}]/gu, '');

    return normalized.length >= USERNAME_MIN_LENGTH
        && normalized.length <= USERNAME_MAX_LENGTH
        && /\p{L}/u.test(normalized)
        && readableCharacters.length >= USERNAME_MIN_LENGTH;
};

const Auth = () => {
    const { syncUserGameData, addToast } = useAppContext();
    const navigate = useNavigate();
    const location = useLocation();
    const prefersReduced = useReducedMotion();
    const [searchParams, setSearchParams] = useSearchParams();
    const locationState = location.state as {
        authNotice?: string;
        from?: { pathname?: string; search?: string };
        verifiedEmail?: string;
        autoVerifiedMessage?: string;
    } | null;
    const authRedirectNotice = locationState?.authNotice ?? '';
    const initialMode =
        location.pathname === PATHS.register
            ? 'register'
            : location.pathname === PATHS.forgotPassword
              ? 'forgot'
              : 'login';
    const [isLogin, setIsLogin] = useState(initialMode !== 'register');
    const [slideDir, setSlideDir] = useState<1 | -1>(1);
    const [isForgotPasswordMode, setIsForgotPasswordMode] = useState(initialMode === 'forgot');
    const [isResetPasswordMode, setIsResetPasswordMode] = useState(false);

    const resolvePostLoginDestination = useCallback((user: { role?: string }) => {
        const fromPath = locationState?.from?.pathname;
        if (fromPath && fromPath !== PATHS.login && fromPath !== PATHS.register) {
            return `${fromPath}${locationState?.from?.search ?? ''}`;
        }
        return user.role?.toUpperCase() === 'ADMIN' ? PATHS.adminOverview : PATHS.learning;
    }, [locationState?.from?.pathname, locationState?.from?.search]);
    const [name, setName] = useState('');
    const [usernameOrEmail, setUsernameOrEmail] = useState('');
    const [email, setEmail] = useState('');
    const [forgotEmail, setForgotEmail] = useState('');
    const [resetToken, setResetToken] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
    const [forgotPasswordSent, setForgotPasswordSent] = useState(false);
    const [forgotPasswordInboxUrl, setForgotPasswordInboxUrl] = useState('https://mail.google.com');
    const [forgotPasswordResetLink, setForgotPasswordResetLink] = useState('');
    const [forgotPasswordUsedFallback, setForgotPasswordUsedFallback] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
    const [isResendingVerification, setIsResendingVerification] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [verificationLink, setVerificationLink] = useState('');
    const [registerEmailTouched, setRegisterEmailTouched] = useState(false);
    // 'idle' | 'active' | 'close' — mirrors the sample's container class

    const resetForgotPasswordState = () => {
        setForgotPasswordSent(false);
        setForgotPasswordInboxUrl('https://mail.google.com');
        setForgotPasswordResetLink('');
        setForgotPasswordUsedFallback(false);
    };

    const registerEmailError = registerEmailTouched
        && email.trim().length > 0
        && !isValidSignupEmail(email)
        ? REGISTER_EMAIL_FORMAT_MESSAGE
        : '';

    const handleGoogleCredential = useCallback(async (response: GoogleCredentialResponse) => {
        if (isGoogleSubmitting) return;

        const idToken = response.credential?.trim();
        if (!idToken) {
            setErrorMessage('Không nhận được mã xác thực Google.');
            return;
        }

        setErrorMessage('');
        setSuccessMessage('');
        setIsGoogleSubmitting(true);

        try {
            const user = await authApi.googleLogin({ idToken });
            syncUserGameData(user);
            addToast('Đăng nhập Google thành công!', 'success');
            navigate(resolvePostLoginDestination(user), { replace: true });
        } catch (error: any) {
            const message = error?.message || 'Đăng nhập Google thất bại.';
            setErrorMessage(message);
        } finally {
            setIsGoogleSubmitting(false);
        }
    }, [addToast, isGoogleSubmitting, navigate, resolvePostLoginDestination, syncUserGameData]);

    // Keep the latest credential handler in a ref so Google Identity Services can
    // be initialized exactly once (below) while still calling the current handler.
    const googleCredentialHandlerRef = useRef(handleGoogleCredential);
    useEffect(() => {
        googleCredentialHandlerRef.current = handleGoogleCredential;
    }, [handleGoogleCredential]);
    const googleInitializedRef = useRef(false);

    useEffect(() => {
        const nextLogin = initialMode !== 'register';
        setSlideDir(nextLogin ? -1 : 1);
        setIsLogin(nextLogin);
        resetForgotPasswordState();
        setIsForgotPasswordMode(initialMode === 'forgot');
        setIsResetPasswordMode(false);
        setErrorMessage('');
        setSuccessMessage(locationState?.autoVerifiedMessage ?? '');
        if (locationState?.verifiedEmail) {
            setUsernameOrEmail(locationState.verifiedEmail);
        }
        setVerificationLink('');
        setRegisterEmailTouched(false);
    }, [initialMode, locationState?.autoVerifiedMessage, locationState?.verifiedEmail]);

    useEffect(() => {
        const mode = (searchParams.get('mode') || '').toLowerCase();
        const verified = searchParams.get('verified') === '1';
        const verifiedEmail = searchParams.get('email')?.trim() ?? '';

        if (mode === 'reset') {
            setIsLogin(true);
            setIsForgotPasswordMode(false);
            setIsResetPasswordMode(true);
            resetForgotPasswordState();
            setForgotEmail(searchParams.get('email') || '');
            setResetToken(searchParams.get('token') || '');
            return;
        }

        if (verified) {
            setIsLogin(true);
            setIsForgotPasswordMode(false);
            setIsResetPasswordMode(false);
            resetForgotPasswordState();
            setUsernameOrEmail(verifiedEmail);
            setPassword('');
            setConfirmPassword('');
            setShowPassword(false);
            setShowConfirmPassword(false);
            setErrorMessage('');
            setSuccessMessage('Email đã được xác minh. Vui lòng đăng nhập.');
            setVerificationLink('');
        }
    }, [searchParams]);

    useEffect(() => {
        if (!googleClientId || isForgotPasswordMode || isResetPasswordMode) {
            return;
        }

        let isCancelled = false;
        let resizeObserver: ResizeObserver | null = null;
        const renderGoogleButtons = () => {
            if (isCancelled || !window.google?.accounts?.id) {
                return;
            }

            if (!googleInitializedRef.current) {
                window.google.accounts.id.initialize({
                    client_id: googleClientId,
                    callback: (response) => googleCredentialHandlerRef.current(response),
                    auto_select: false,
                    cancel_on_tap_outside: true,
                    itp_support: true,
                    use_fedcm_for_button: true
                });
                googleInitializedRef.current = true;
            }

            const renderGoogleButton = (container: HTMLElement) => {
                const availableWidth = Math.floor(container.clientWidth);
                if (availableWidth < 200) {
                    return;
                }

                const buttonWidth = Math.min(400, availableWidth);
                const prevWidth = Number(container.dataset.googleRenderedWidth || '0');
                if (prevWidth > 0 && Math.abs(buttonWidth - prevWidth) < 16) {
                    return;
                }

                container.dataset.googleRenderedWidth = String(buttonWidth);
                container.replaceChildren();

                window.google?.accounts.id.renderButton(container, {
                    theme: 'outline',
                    size: 'large',
                    type: 'standard',
                    text: container.dataset.googleButtonText === 'signup_with' ? 'signup_with' : 'signin_with',
                    shape: 'rectangular',
                    width: buttonWidth
                });
            };

            const containers = document.querySelectorAll<HTMLElement>('[data-google-signin-button]');
            containers.forEach(renderGoogleButton);

            let resizeTimer: number | undefined;
            resizeObserver?.disconnect();
            resizeObserver = new ResizeObserver((entries) => {
                window.clearTimeout(resizeTimer);
                resizeTimer = window.setTimeout(() => {
                    entries.forEach(({ target }) => renderGoogleButton(target as HTMLElement));
                }, 140);
            });
            containers.forEach((container) => resizeObserver?.observe(container));
        };

        const existingScript = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');
        if (existingScript) {
            if (window.google?.accounts?.id) {
                renderGoogleButtons();
            } else {
                existingScript.addEventListener('load', renderGoogleButtons, { once: true });
            }

            return () => {
                isCancelled = true;
                resizeObserver?.disconnect();
                existingScript.removeEventListener('load', renderGoogleButtons);
            };
        }

        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = renderGoogleButtons;
        document.head.appendChild(script);

        return () => {
            isCancelled = true;
            resizeObserver?.disconnect();
        };
    }, [isForgotPasswordMode, isResetPasswordMode, isLogin]);

    const goBackToLogin = () => {
        setSlideDir(-1);
        setIsForgotPasswordMode(false);
        setIsResetPasswordMode(false);
        setIsLogin(true);
        setErrorMessage('');
        setSuccessMessage('');
        setVerificationLink('');
        resetForgotPasswordState();
        setResetToken('');
        setConfirmPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        setSearchParams({}, { replace: true });
        if (location.pathname === PATHS.forgotPassword) {
            navigate(PATHS.login, { replace: true });
        }
    };

    const passwordPolicy = checkPasswordPolicy(password);
    const resetPasswordPolicy = checkPasswordPolicy(newPassword);
    const isPasswordValid = isPasswordPolicyValid(passwordPolicy);
    const isResetPasswordValid = isPasswordPolicyValid(resetPasswordPolicy);
    const hasValidResetLink = Boolean(forgotEmail.trim() && resetToken.trim());

    const renderPasswordPolicyChecklist = (policy: PasswordPolicyResult) => (
        <ul className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs" aria-label="Yêu cầu mật khẩu">
            {PASSWORD_POLICY_LABELS.map(([key, label]) => {
                const ok = policy[key];
                return (
                    <li key={key} className={`flex items-center gap-1.5 ${ok ? 'text-success-color' : 'text-text-muted'}`}>
                        <span
                            className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full ${ok ? 'bg-success-color text-text-on-accent' : 'border border-border-emphasized'}`}
                            aria-hidden
                        >
                            {ok && <Check size={10} strokeWidth={3} />}
                        </span>
                        <span className="truncate">{label}</span>
                        <span className="sr-only">{ok ? '(đạt)' : '(chưa đạt)'}</span>
                    </li>
                );
            })}
        </ul>
    );

    const renderGoogleLoginArea = (buttonText: 'signin_with' | 'signup_with') => (
        <div className="mt-3.5 w-full space-y-2.5">
            <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-text-muted">
                <span className="h-px flex-1 bg-border" />
                <span>hoặc</span>
                <span className="h-px flex-1 bg-border" />
            </div>
            <div
                data-google-signin-button
                data-google-button-text={buttonText}
                aria-busy={isGoogleSubmitting}
                className={`flex min-h-10 w-full max-w-full min-w-0 items-center justify-center overflow-hidden ${
                    isGoogleSubmitting ? 'pointer-events-none opacity-60' : ''
                }`}
            />
        </div>
    );

    const handleSubmit = async () => {
        if (isSubmitting) return;
        setErrorMessage('');
        setSuccessMessage('');
        setVerificationLink('');
        setIsSubmitting(true);

        try {
            if (isLogin) {
                const cleanIdentifier = usernameOrEmail.trim();
                if (!cleanIdentifier || !password.trim()) {
                    setErrorMessage('Vui lòng nhập đầy đủ tên đăng nhập/email và mật khẩu.');
                    return;
                }
                const user = await authApi.login({ usernameOrEmail: cleanIdentifier, password, rememberMe: true });
                syncUserGameData(user);
                addToast('Đăng nhập thành công!', 'success');
                navigate(resolvePostLoginDestination(user), { replace: true });
            } else {
                const cleanName = normalizeDisplayName(name);
                const cleanEmail = normalizeSignupEmail(email);
                setRegisterEmailTouched(true);

                if (cleanName.length < USERNAME_MIN_LENGTH || cleanName.length > USERNAME_MAX_LENGTH) {
                    setErrorMessage(`Tên hiển thị phải từ ${USERNAME_MIN_LENGTH}-${USERNAME_MAX_LENGTH} ký tự.`);
                    return;
                }
                if (!isValidDisplayName(cleanName)) {
                    setErrorMessage('Tên hiển thị phải chứa ít nhất 3 chữ cái hoặc số hợp lệ.');
                    return;
                }
                if (!isValidSignupEmail(cleanEmail)) {
                    setErrorMessage(cleanEmail ? '' : REGISTER_EMAIL_FORMAT_MESSAGE);
                    return;
                }
                if (!isPasswordValid) {
                    setErrorMessage('Mật khẩu chưa đúng định dạng yêu cầu.');
                    return;
                }
                if (password !== confirmPassword) {
                    setErrorMessage('Xác nhận mật khẩu không khớp.');
                    return;
                }
                const result = await authApi.register({
                    name: cleanName,
                    email: cleanEmail,
                    password,
                    confirmPassword
                });
                setPassword('');
                setConfirmPassword('');
                setShowPassword(false);
                setShowConfirmPassword(false);
                setRegisterEmailTouched(false);
                const message = result.message || 'Tạo tài khoản thành công. Vui lòng kiểm tra email để xác minh trước khi đăng nhập.';
                if (result.emailSent === false) {
                    addToast(message, 'success');
                    navigate(PATHS.login, {
                        replace: true,
                        state: {
                            verifiedEmail: cleanEmail,
                            autoVerifiedMessage: message,
                        },
                    });
                    return;
                }
                addToast(message, 'success');
                navigate(PATHS.verifyEmailSent, {
                    replace: true,
                    state: { email: cleanEmail }
                });
            }
        } catch (error: any) {
            const message = error?.message || 'Không thể kết nối tới hệ thống xác thực.';
            setErrorMessage(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResendVerification = async () => {
        if (isResendingVerification) return;

        const emailToVerify = normalizeSignupEmail(usernameOrEmail);
        if (!isValidSignupEmail(emailToVerify)) {
            setErrorMessage('Vui lòng nhập email đã đăng ký để gửi lại xác minh.');
            return;
        }

        setIsResendingVerification(true);
        try {
            const result = await authApi.resendVerification({ email: emailToVerify });
            const message = result.message || 'Nếu tài khoản cần xác minh, chúng tôi đã gửi lại email mới.';
            setSuccessMessage(message);
            setVerificationLink(result.verificationLink || '');
        } catch (error: any) {
            const message = error?.message || 'Không thể gửi lại email xác minh.';
            setErrorMessage(message);
        } finally {
            setIsResendingVerification(false);
        }
    };

    const handleForgotPasswordSubmit = async () => {
        if (isSubmitting) return;
        const cleanEmail = forgotEmail.trim();
        if (!cleanEmail) {
            setErrorMessage('Vui lòng nhập email.');
            return;
        }
        if (!isValidSignupEmail(cleanEmail)) {
            setErrorMessage(REGISTER_EMAIL_FORMAT_MESSAGE);
            return;
        }
        setErrorMessage('');
        setSuccessMessage('');
        setIsSubmitting(true);
        try {
            const result = await authApi.forgotPassword({ email: cleanEmail });
            setForgotPasswordSent(true);
            setForgotPasswordInboxUrl(result.inboxUrl);
            setForgotPasswordResetLink(result.resetLink);
            setForgotPasswordUsedFallback(result.usedFallbackLink);
        } catch (error: any) {
            const message = error?.message || 'Không thể gửi yêu cầu quên mật khẩu.';
            setErrorMessage(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResetPasswordSubmit = async () => {
        if (isSubmitting) return;
        if (!hasValidResetLink) {
            setErrorMessage('Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.');
            return;
        }
        if (!newPassword || !confirmNewPassword) {
            setErrorMessage('Vui lòng nhập mật khẩu mới và xác nhận mật khẩu.');
            return;
        }
        if (!isResetPasswordValid) { setErrorMessage('Mật khẩu chưa đúng định dạng yêu cầu.'); return; }
        if (newPassword !== confirmNewPassword) { setErrorMessage('Xác nhận mật khẩu không khớp.'); return; }
        setErrorMessage(''); setSuccessMessage(''); setIsSubmitting(true);
        try {
            const message = await authApi.resetPassword({ email: forgotEmail.trim(), token: resetToken.trim(), newPassword, confirmNewPassword });
            addToast(message, 'success');
            goBackToLogin();
            setSuccessMessage('Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.');
        } catch (error: any) {
            const message = error?.message || 'Đặt lại mật khẩu thất bại.';
            setErrorMessage(message);
            addToast(message, 'info');
        } finally {
            setIsSubmitting(false);
        }
    };

    const passwordField = ({
        label,
        value,
        onChange,
        shown,
        onToggle,
        onEnter,
        autoComplete,
    }: {
        label: string;
        value: string;
        onChange: (value: string) => void;
        shown: boolean;
        onToggle: () => void;
        onEnter?: () => void;
        autoComplete: string;
    }) => (
        <FloatingField
            label={label}
            value={value}
            onChange={(next) => onChange(next.slice(0, PASSWORD_MAX_LENGTH))}
            onEnter={onEnter}
            autoComplete={autoComplete}
            maxLength={PASSWORD_MAX_LENGTH}
            isPassword
            shown={shown}
            onToggleShown={onToggle}
        />
    );

    const notice = (tone: 'error' | 'success', message: string) => (
        <div
            role={tone === 'error' ? 'alert' : 'status'}
            className={`rounded-2xl border-2 px-3.5 py-3 text-sm font-medium leading-snug break-words ${
                tone === 'error'
                    ? 'border-danger-color/30 bg-danger-color/10 text-danger-color'
                    : 'border-success-color/30 bg-success-color/10 text-success-color'
            }`}
        >
            {message}
        </div>
    );

    const activePanelKey: 'login' | 'register' | 'forgot' | 'reset' = isResetPasswordMode
        ? 'reset'
        : isForgotPasswordMode
          ? 'forgot'
          : isLogin
            ? 'login'
            : 'register';

    const panelTestId =
        activePanelKey === 'login'
            ? 'login-panel'
            : activePanelKey === 'register'
              ? 'register-panel'
              : undefined;

    const slideVariants = {
        enter: (dir: number) => (prefersReduced ? { opacity: 1, x: 0 } : { opacity: 0, x: dir * 48 }),
        center: { opacity: 1, x: 0 },
        exit: (dir: number) => (prefersReduced ? { opacity: 1, x: 0 } : { opacity: 0, x: dir * -48 }),
    };

    const renderFormBody = () => {
        if (isForgotPasswordMode || isResetPasswordMode) {
            const title = isResetPasswordMode ? 'Đặt lại mật khẩu' : 'Quên mật khẩu';
            return (
                <>
                    <h1 className="text-[1.85rem] font-extrabold tracking-[-0.025em] text-text-primary">{title}</h1>
                    <p className="mt-1.5 text-sm text-text-muted">
                        {isForgotPasswordMode
                            ? 'Nhập email tài khoản, chúng tôi sẽ gửi liên kết đặt lại mật khẩu.'
                            : 'Tạo mật khẩu mới cho tài khoản của bạn.'}
                    </p>

                    <div className="mt-6 space-y-3.5">
                        {isForgotPasswordMode ? (
                            !forgotPasswordSent ? (
                                <FloatingField
                                    type="email"
                                    label="Email"
                                    value={forgotEmail}
                                    onChange={setForgotEmail}
                                    onEnter={handleForgotPasswordSubmit}
                                    autoComplete="email"
                                />
                            ) : (
                                <div className="rounded-2xl border-2 border-success-color/30 bg-success-color/10 p-4 text-sm" role="status">
                                    <p className="flex items-center gap-2 font-semibold text-success-color">
                                        <CheckCircle2 size={16} aria-hidden /> Đã gửi email
                                    </p>
                                    <p className="mt-1.5 text-text-muted">
                                        {forgotPasswordUsedFallback
                                            ? 'Môi trường này chưa gửi được email thật. Bạn có thể mở trang đặt lại mật khẩu bằng nút bên dưới.'
                                            : 'Kiểm tra hộp thư (cả mục Spam hoặc Quảng cáo) của'}
                                    </p>
                                    <p className="mt-1 break-all font-medium text-text-primary">{forgotEmail}</p>
                                </div>
                            )
                        ) : hasValidResetLink ? (
                            <>
                                <p className="text-sm text-text-muted">
                                    Tài khoản <span className="break-all font-semibold text-text-primary">{forgotEmail}</span>
                                </p>
                                {passwordField({
                                    label: 'Mật khẩu mới',
                                    value: newPassword,
                                    onChange: setNewPassword,
                                    shown: showNewPassword,
                                    onToggle: () => setShowNewPassword((p) => !p),
                                    autoComplete: 'new-password',
                                })}
                                {passwordField({
                                    label: 'Xác nhận mật khẩu',
                                    value: confirmNewPassword,
                                    onChange: setConfirmNewPassword,
                                    shown: showConfirmNewPassword,
                                    onToggle: () => setShowConfirmNewPassword((p) => !p),
                                    onEnter: handleResetPasswordSubmit,
                                    autoComplete: 'new-password',
                                })}
                                {renderPasswordPolicyChecklist(resetPasswordPolicy)}
                            </>
                        ) : (
                            notice('error', 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.')
                        )}
                        {errorMessage && (!isResetPasswordMode || hasValidResetLink) && notice('error', errorMessage)}
                        {successMessage && notice('success', successMessage)}
                    </div>

                    <div className="mt-6 space-y-2.5">
                        {isForgotPasswordMode ? (
                            !forgotPasswordSent ? (
                                <Button fullWidth onClick={handleForgotPasswordSubmit} isLoading={isSubmitting}>
                                    Gửi liên kết đặt lại
                                </Button>
                            ) : (
                                <a
                                    href={forgotPasswordUsedFallback && forgotPasswordResetLink ? forgotPasswordResetLink : forgotPasswordInboxUrl}
                                    {...(forgotPasswordUsedFallback && forgotPasswordResetLink ? {} : { target: '_blank', rel: 'noreferrer' })}
                                    className="btn-primary w-full"
                                >
                                    {forgotPasswordUsedFallback && forgotPasswordResetLink ? 'Mở trang đặt lại mật khẩu' : 'Mở hộp thư'}
                                </a>
                            )
                        ) : (
                            <Button fullWidth onClick={handleResetPasswordSubmit} isLoading={isSubmitting} disabled={!hasValidResetLink}>
                                {isSubmitting ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
                            </Button>
                        )}
                        <Button fullWidth variant="ghost" onClick={goBackToLogin}>
                            <ArrowLeft size={16} aria-hidden /> Quay lại đăng nhập
                        </Button>
                    </div>
                </>
            );
        }

        if (isLogin) {
            return (
                <>
                    <h1 className="text-[1.85rem] font-extrabold tracking-[-0.025em] text-text-primary">Đăng nhập</h1>
                    <p className="mt-1.5 text-sm text-text-muted">Chào mừng quay lại! Tiếp tục hành trình học từ vựng của bạn.</p>

                    {authRedirectNotice && !errorMessage && !successMessage && (
                        <div
                            role="status"
                            className="mt-4 rounded-2xl border-2 border-primary/25 bg-primary-light px-3.5 py-2.5 text-sm text-text-primary"
                        >
                            {authRedirectNotice}
                        </div>
                    )}

                    <div className="mt-6 space-y-3.5">
                        <FloatingField
                            label="Tên đăng nhập hoặc email"
                            value={usernameOrEmail}
                            onChange={setUsernameOrEmail}
                            onEnter={handleSubmit}
                            autoComplete="username"
                        />
                        {passwordField({
                            label: 'Mật khẩu',
                            value: password,
                            onChange: setPassword,
                            shown: showPassword,
                            onToggle: () => setShowPassword((p) => !p),
                            onEnter: handleSubmit,
                            autoComplete: 'current-password',
                        })}
                        <div className="-mt-0.5 flex justify-end">
                            <button
                                type="button"
                                className="text-link text-sm"
                                onClick={() => {
                                    setSlideDir(1);
                                    setIsForgotPasswordMode(true);
                                    resetForgotPasswordState();
                                    setForgotEmail(usernameOrEmail.includes('@') ? usernameOrEmail : '');
                                    setErrorMessage('');
                                    setSuccessMessage('');
                                }}
                            >
                                Quên mật khẩu?
                            </button>
                        </div>

                        {errorMessage && notice('error', errorMessage)}
                        {EMAIL_VERIFICATION_REQUIRED_MESSAGES.has(errorMessage) && (
                            <Button fullWidth variant="secondary" onClick={handleResendVerification} isLoading={isResendingVerification}>
                                Gửi lại email xác minh
                            </Button>
                        )}
                        {successMessage && notice('success', successMessage)}
                        {verificationLink && (
                            <a className="text-link block text-center text-sm" href={verificationLink}>Mở liên kết xác minh</a>
                        )}

                        <Button fullWidth onClick={handleSubmit} isLoading={isSubmitting}>
                            {isSubmitting ? 'Đang xử lý...' : 'Vào học ngay'}
                        </Button>
                    </div>

                    {googleClientId && renderGoogleLoginArea('signin_with')}

                    <p className="mt-6 text-center text-sm text-text-muted">
                        Chưa có tài khoản?
                        <button
                            type="button"
                            className="text-link ml-1.5 font-semibold"
                            onClick={() => {
                                setSlideDir(1);
                                navigate(PATHS.register);
                            }}
                        >
                            Đăng ký
                        </button>
                    </p>
                </>
            );
        }

        return (
            <>
                <h1 className="text-[1.65rem] font-extrabold leading-tight tracking-[-0.025em] text-text-primary">Đăng ký</h1>
                <p className="mt-1 text-sm text-text-muted">Miễn phí. Tiến độ và chuỗi học được lưu trên mọi thiết bị.</p>

                <div className="mt-4 space-y-2.5">
                    <FloatingField
                        label="Tên hiển thị"
                        value={name}
                        onChange={setName}
                        maxLength={USERNAME_MAX_LENGTH}
                        autoComplete="nickname"
                    />
                    <FloatingField
                        type="email"
                        label="Email"
                        value={email}
                        maxLength={100}
                        onBlur={() => setRegisterEmailTouched(true)}
                        onChange={(next) => {
                            setEmail(next);
                            if (errorMessage === REGISTER_EMAIL_FORMAT_MESSAGE) setErrorMessage('');
                        }}
                        error={registerEmailError}
                        autoComplete="email"
                    />
                    {passwordField({
                        label: 'Mật khẩu',
                        value: password,
                        onChange: setPassword,
                        shown: showPassword,
                        onToggle: () => setShowPassword((p) => !p),
                        autoComplete: 'new-password',
                    })}
                    {passwordField({
                        label: 'Xác nhận mật khẩu',
                        value: confirmPassword,
                        onChange: setConfirmPassword,
                        shown: showConfirmPassword,
                        onToggle: () => setShowConfirmPassword((p) => !p),
                        onEnter: handleSubmit,
                        autoComplete: 'new-password',
                    })}

                    {renderPasswordPolicyChecklist(passwordPolicy)}

                    {errorMessage && notice('error', errorMessage)}
                    {successMessage && notice('success', successMessage)}
                    {verificationLink && (
                        <a className="text-link block text-center text-sm" href={verificationLink}>Mở liên kết xác minh</a>
                    )}

                    <Button fullWidth className="mt-1" onClick={handleSubmit} isLoading={isSubmitting}>
                        {isSubmitting ? 'Đang xử lý...' : 'Tạo tài khoản'}
                    </Button>
                </div>

                {googleClientId && renderGoogleLoginArea('signup_with')}

                <p className="mt-4 text-center text-sm text-text-muted">
                    Đã có tài khoản?{' '}
                    <button
                        type="button"
                        className="text-link font-semibold"
                        onClick={() => {
                            setSlideDir(-1);
                            navigate(PATHS.login);
                        }}
                    >
                        Đăng nhập
                    </button>
                </p>
                <p className="mt-1.5 text-center text-xs text-text-muted">
                    Khi tiếp tục, bạn đồng ý với{' '}
                    <Link to={PATHS.privacy} className="text-link">
                        Chính sách bảo mật
                    </Link>{' '}
                    của VocabLearning.
                </p>
            </>
        );
    };

    return (
        <div className="grid min-h-full w-full bg-surface lg:h-full lg:grid-cols-2 lg:overflow-hidden">
            {/* Stationary Left Illustrated Brand Stage (never slides or remounts on Login <-> Register) */}
            <aside
                aria-hidden="true"
                className="relative hidden flex-col items-center justify-center overflow-hidden rounded-r-[2.5rem] border-r-2 border-border bg-bg-secondary px-10 py-8 lg:flex"
                style={{
                    backgroundImage:
                        "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Ccircle cx='12' cy='12' r='1.1' fill='%236d28d9' fill-opacity='0.14'/%3E%3C/svg%3E\")",
                    backgroundSize: '24px 24px',
                }}
            >
                <div className="relative flex w-full max-w-[440px] flex-col items-center">
                    {/* Tactile floating vocab badges around stationary Lumo */}
                    <div className="relative flex h-[280px] w-full items-center justify-center">
                        <div className="glass-card absolute left-2 top-5 px-3.5 py-2.5 text-left">
                            <span className="block font-mono text-[11px] font-bold text-primary">A2 · Flashcard</span>
                            <strong className="block text-base font-extrabold text-text-primary">journey</strong>
                            <span className="font-mono text-xs text-text-muted">/ˈdʒɜːni/</span>
                        </div>

                        <div className="glass-card absolute right-3 top-8 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-bold text-text-primary">
                            <Flame size={16} className="text-warning-color" />
                            <span>12 ngày</span>
                        </div>

                        <motion.img
                            src="/mascot-lumo-reading.webp"
                            alt=""
                            width={220}
                            height={264}
                            animate={prefersReduced ? undefined : { y: [0, -8, 0] }}
                            transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut' }}
                            className="relative z-10 h-auto w-[212px] select-none drop-shadow-[0_18px_20px_rgba(0,0,0,0.18)]"
                        />

                        <div className="glass-card absolute -right-2 bottom-2 z-20 inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-text-primary">
                            <Sparkles size={15} className="text-primary" />
                            <span>SM-2 · +100 XP</span>
                        </div>
                    </div>

                    <div className="mt-4 text-center">
                        <h2 className="text-[1.65rem] font-extrabold leading-snug tracking-[-0.025em] text-text-primary">
                            VocabLearning — Học từ vựng
                            <br />
                            nhớ lâu mỗi ngày
                        </h2>
                        <p className="mt-2.5 text-sm font-medium text-text-muted">
                            Thẻ 3D lật mượt · Ghép từ · Lịch ôn thông minh theo trí nhớ của bạn
                        </p>
                    </div>
                </div>
            </aside>

            {/* Right Sliding Form Stage */}
            <div className="relative flex flex-col items-center overflow-x-hidden overflow-y-auto no-scrollbar bg-surface px-5 py-4 sm:px-10 lg:px-14 lg:py-4">
                <AnimatePresence mode="wait" custom={slideDir} initial={false}>
                    <motion.div
                        key={activePanelKey}
                        custom={slideDir}
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                        data-testid={panelTestId}
                        className="my-auto w-full max-w-[400px]"
                    >
                        {renderFormBody()}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};

export default Auth;
