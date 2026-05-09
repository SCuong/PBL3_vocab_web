import { useEffect, useState } from 'react';
import { Button } from '../components/ui';
import { authApi } from '../services/authApi';

type AuthMode = 'login' | 'register';

type AuthProps = {
    onLogin: (user: any) => void;
    onAddToast?: (message: string, type?: string) => void;
    initialMode?: AuthMode;
};

const Auth = ({ onLogin, onAddToast, initialMode = 'login' }: AuthProps) => {
    const [isLogin, setIsLogin] = useState(initialMode !== 'register');
    const [isForgotPasswordMode, setIsForgotPasswordMode] = useState(false);
    const [isResetPasswordMode, setIsResetPasswordMode] = useState(false);
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
    const [errorMessage, setErrorMessage] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    // 'idle' | 'active' | 'close' — mirrors the sample's container class
    const [flipState, setFlipState] = useState<'idle' | 'active' | 'close'>(
        initialMode === 'register' ? 'active' : 'idle'
    );

    const resetForgotPasswordState = () => {
        setForgotPasswordSent(false);
        setForgotPasswordInboxUrl('https://mail.google.com');
        setForgotPasswordResetLink('');
        setForgotPasswordUsedFallback(false);
    };

    useEffect(() => {
        const nextLogin = initialMode !== 'register';
        setIsLogin(nextLogin);
        setFlipState(nextLogin ? 'idle' : 'active');
        resetForgotPasswordState();
        setIsForgotPasswordMode(false);
        setIsResetPasswordMode(false);
        setErrorMessage('');
        setSuccessMessage('');
    }, [initialMode]);

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const mode = (params.get('mode') || '').toLowerCase();

        if (mode === 'reset') {
            setIsLogin(true);
            setFlipState('idle');
            setIsForgotPasswordMode(false);
            setIsResetPasswordMode(true);
            resetForgotPasswordState();
            setForgotEmail(params.get('email') || '');
            setResetToken(params.get('token') || '');
        }
    }, []);

    const goBackToLogin = () => {
        setIsForgotPasswordMode(false);
        setIsResetPasswordMode(false);
        setIsLogin(true);
        setFlipState('idle');
        setErrorMessage('');
        setSuccessMessage('');
        resetForgotPasswordState();
        setResetToken('');
        setConfirmPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        window.history.replaceState({}, document.title, window.location.pathname);
    };

    const passwordPolicy = {
        minLength: password.length >= 8,
        maxLength: password.length <= 15,
        hasLowercase: /[a-z]/.test(password),
        hasUppercase: /[A-Z]/.test(password),
        hasNumber: /[0-9]/.test(password),
        hasSpecial: /[^A-Za-z0-9]/.test(password),
    };

    const isPasswordValid = Object.values(passwordPolicy).every(Boolean);

    const handleSubmit = async () => {
        if (isSubmitting) return;
        setErrorMessage('');
        setSuccessMessage('');
        setIsSubmitting(true);

        try {
            if (isLogin) {
                const user = await authApi.login({ usernameOrEmail, password, rememberMe: true });
                onLogin(user);
                onAddToast?.('Đăng nhập thành công!', 'success');
            } else {
                if (!isPasswordValid) {
                    setErrorMessage('Mật khẩu chưa đúng định dạng yêu cầu.');
                    return;
                }
                if (password !== confirmPassword) {
                    setErrorMessage('Xác nhận mật khẩu không khớp.');
                    return;
                }
                const user = await authApi.register({ name, email, password });
                onLogin(user);
                onAddToast?.('Đăng ký thành công!', 'success');
            }
        } catch (error: any) {
            const message = error?.message || 'Không thể kết nối tới hệ thống xác thực.';
            setErrorMessage(message);
            onAddToast?.(message, 'info');
        } finally {
            setIsSubmitting(false);
        }
    };

    const switchToRegister = () => {
        setIsLogin(false);
        setFlipState('active');
        setErrorMessage('');
        setSuccessMessage('');
    };

    const switchToLogin = () => {
        setIsLogin(true);
        setFlipState('close');
        setErrorMessage('');
        setSuccessMessage('');
        setConfirmPassword('');
        setShowConfirmPassword(false);
    };

    const handleForgotPasswordSubmit = async () => {
        if (isSubmitting) return;
        if (!forgotEmail.trim()) { setErrorMessage('Vui lòng nhập email.'); return; }
        setErrorMessage(''); setSuccessMessage(''); setIsSubmitting(true);
        try {
            const result = await authApi.forgotPassword({ email: forgotEmail.trim() });
            setForgotPasswordSent(true);
            setForgotPasswordInboxUrl(result.inboxUrl);
            setForgotPasswordResetLink(result.resetLink);
            setForgotPasswordUsedFallback(result.usedFallbackLink);
            setSuccessMessage(result.message);
            onAddToast?.(result.message, result.usedFallbackLink ? 'info' : 'success');
        } catch (error: any) {
            const message = error?.message || 'Không thể gửi yêu cầu quên mật khẩu.';
            setErrorMessage(message);
            onAddToast?.(message, 'info');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResetPasswordSubmit = async () => {
        if (isSubmitting) return;
        if (!forgotEmail.trim() || !resetToken.trim() || !newPassword || !confirmNewPassword) {
            setErrorMessage('Vui lòng nhập đầy đủ email, mã xác thực và mật khẩu mới.');
            return;
        }
        if (newPassword !== confirmNewPassword) { setErrorMessage('Xác nhận mật khẩu không khớp.'); return; }
        setErrorMessage(''); setSuccessMessage(''); setIsSubmitting(true);
        try {
            const message = await authApi.resetPassword({ email: forgotEmail.trim(), token: resetToken.trim(), newPassword, confirmNewPassword });
            onAddToast?.(message, 'success');
            goBackToLogin();
            setSuccessMessage('Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.');
        } catch (error: any) {
            const message = error?.message || 'Đặt lại mật khẩu thất bại.';
            setErrorMessage(message);
            onAddToast?.(message, 'info');
        } finally {
            setIsSubmitting(false);
        }
    };

    // ─── Forgot / Reset Password screens (unchanged layout) ─────────────────────
    if (isForgotPasswordMode || isResetPasswordMode) {
        const title = isResetPasswordMode ? 'Đặt lại mật khẩu' : 'Quên mật khẩu';
        return (
            <div className="min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden">
                <div className="absolute -top-40 -left-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl animate-pulse-soft -z-10" />
                <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-accent/20 rounded-full blur-3xl -z-10" style={{ animationDelay: '0.5s' }} />
                <div className="max-w-md w-full">
                    <div className="glass-card p-8 md:p-10 rounded-2xl md:rounded-3xl">
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/15 mb-4">
                                <span className="text-2xl">{isForgotPasswordMode ? '🔐' : '🔑'}</span>
                            </div>
                            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-2">{title}</h2>
                            <p className="text-text-secondary text-sm">
                                {isForgotPasswordMode ? 'Nhập email của bạn để nhận liên kết đặt lại mật khẩu' : 'Nhập thông tin để đặt lại mật khẩu mới'}
                            </p>
                        </div>
                        <div className="space-y-4 mb-8">
                            {isForgotPasswordMode ? (
                                !forgotPasswordSent ? (
                                    <input type="email" placeholder="Email tài khoản"
                                        className="auth-input"
                                        value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} />
                                ) : (
                                    <div className="space-y-3 rounded-xl border-2 border-accent/30 bg-white/70 px-4 py-4 text-sm text-center">
                                        <p className="text-accent font-semibold flex items-center justify-center gap-2"><span>✓</span>Email đã được gửi!</p>
                                        <p className="text-text-secondary text-xs">
                                            {forgotPasswordUsedFallback
                                                ? 'Môi trường hiện tại chưa gửi được email thật. Bạn có thể mở trực tiếp trang đặt lại mật khẩu ở nút bên dưới.'
                                                : 'Vui lòng kiểm tra hộp thư, mục Spam hoặc Promotions để tìm email từ chúng tôi.'}
                                        </p>
                                        <p className="text-text-primary font-medium break-all">{forgotEmail}</p>
                                    </div>
                                )
                            ) : (
                                <>
                                    <input type="email" placeholder="Email tài khoản" className="auth-input"
                                        value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} readOnly />
                                    <input type="text" placeholder="Mã xác thực" className="auth-input"
                                        value={resetToken} onChange={(e) => setResetToken(e.target.value)} />
                                    <div className="relative">
                                        <input type={showNewPassword ? 'text' : 'password'} placeholder="Mật khẩu mới"
                                            className="auth-input pr-12"
                                            value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                                        <button type="button" className="auth-eye-btn"
                                            onClick={() => setShowNewPassword((p) => !p)}
                                            aria-label={showNewPassword ? 'Ẩn mật khẩu mới' : 'Hiện mật khẩu mới'}>
                                            {showNewPassword ? '🙈' : '👁'}
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <input type={showConfirmNewPassword ? 'text' : 'password'} placeholder="Xác nhận mật khẩu mới"
                                            className="auth-input pr-12"
                                            value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} />
                                        <button type="button" className="auth-eye-btn"
                                            onClick={() => setShowConfirmNewPassword((p) => !p)}
                                            aria-label={showConfirmNewPassword ? 'Ẩn xác nhận' : 'Hiện xác nhận'}>
                                            {showConfirmNewPassword ? '🙈' : '👁'}
                                        </button>
                                    </div>
                                </>
                            )}
                            {errorMessage && <div className="auth-error">{errorMessage}</div>}
                            {successMessage && <div className="auth-success">{successMessage}</div>}
                        </div>
                        <div className="space-y-3">
                            {isForgotPasswordMode ? (
                                <>
                                    {!forgotPasswordSent ? (
                                        <Button variant="primary" className="w-full" onClick={handleForgotPasswordSubmit} disabled={isSubmitting}>
                                            {isSubmitting ? 'Đang gửi...' : 'Gửi liên kết đặt lại'}
                                        </Button>
                                    ) : forgotPasswordUsedFallback && forgotPasswordResetLink ? (
                                        <a href={forgotPasswordResetLink} className="block">
                                            <Button variant="primary" className="w-full">Mở trang đặt lại mật khẩu</Button>
                                        </a>
                                    ) : (
                                        <a href={forgotPasswordInboxUrl} target="_blank" rel="noreferrer" className="block">
                                            <Button variant="primary" className="w-full">Mở hộp thư</Button>
                                        </a>
                                    )}
                                    <Button variant="ghost" className="w-full" onClick={goBackToLogin}>Quay lại đăng nhập</Button>
                                </>
                            ) : (
                                <>
                                    <Button variant="primary" className="w-full" onClick={handleResetPasswordSubmit} disabled={isSubmitting || !resetToken}>
                                        {isSubmitting ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
                                    </Button>
                                    <Button variant="ghost" className="w-full" onClick={goBackToLogin}>Quay lại đăng nhập</Button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ─── Main Login / Register Flip Layout ───────────────────────────────────────
    //
    // Pattern from sample (CSSStyling.css):
    //   #container  → .auth-flip-root        (perspective wrapper, preserve-3d)
    //   .login       → .auth-panel-login      (left, white bg, z-0)
    //   .register    → .auth-panel-register   (right, white bg, z-1)
    //   .page.front  → .auth-page-front       (right, gradient, z-3, flips OUT on .active)
    //   .page.back   → .auth-page-back        (right, gradient, z-2, flips IN  on .active)
    //   class on container: '' | 'active' | 'close'

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden">
            {/* Background orbs */}
            <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse-soft -z-10" />
            <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-accent/20 rounded-full blur-3xl -z-10" style={{ animationDelay: '0.5s' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-secondary/15 rounded-full blur-[80px] -z-10" />

            {/* Root flip container */}
            <div className={`auth-flip-root ${flipState}`}>

                {/* ── Login panel (LEFT) ─────────────────────────────────── */}
                <div className="auth-panel auth-panel-login">
                    <div className="auth-panel-content">
                        <div className="text-center mb-6">
                            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/15 mb-3">
                                <span className="text-2xl">👤</span>
                            </div>
                            <h2 className="text-3xl font-bold text-text-primary">Đăng nhập</h2>
                            <p className="text-text-secondary text-sm mt-1">Tiếp tục hành trình học của bạn</p>
                        </div>

                        <div className="space-y-3 w-full">
                            <input
                                type="text"
                                placeholder="Tên đăng nhập hoặc email"
                                className="auth-input"
                                value={usernameOrEmail}
                                onChange={(e) => setUsernameOrEmail(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                            />
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Mật khẩu"
                                    className="auth-input pr-12"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                                />
                                <button type="button" className="auth-eye-btn"
                                    onClick={() => setShowPassword((p) => !p)}
                                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
                                    {showPassword ? '🙈' : '👁'}
                                </button>
                            </div>

                            {errorMessage && isLogin && <div className="auth-error">{errorMessage}</div>}
                            {successMessage && isLogin && <div className="auth-success">{successMessage}</div>}

                            <Button variant="primary" className="w-full mt-2" onClick={handleSubmit} disabled={isSubmitting}>
                                {isSubmitting ? 'Đang xử lý...' : 'Vào học ngay'}
                            </Button>

                            <button
                                type="button"
                                className="w-full text-primary text-sm font-semibold py-2 px-4 rounded-lg hover:bg-primary/10 transition-colors"
                                onClick={() => {
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

                        {/* Mobile-only switch to register */}
                        <p className="auth-mobile-switch">
                            Chưa có tài khoản?{' '}
                            <button type="button" className="text-primary font-bold hover:underline" onClick={switchToRegister}>
                                Đăng ký ngay
                            </button>
                        </p>
                    </div>
                </div>

                {/* ── Register panel (RIGHT) ─────────────────────────────── */}
                <div className="auth-panel auth-panel-register">
                    <div className="auth-panel-content">
                        <div className="text-center mb-6">
                            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/15 mb-3">
                                <span className="text-2xl">✨</span>
                            </div>
                            <h2 className="text-3xl font-bold text-text-primary">Đăng ký</h2>
                            <p className="text-text-secondary text-sm mt-1">Bắt đầu học từ vựng mới</p>
                        </div>

                        <div className="space-y-3 w-full">
                            <input type="text" placeholder="Tên hiển thị"
                                className="auth-input"
                                value={name} onChange={(e) => setName(e.target.value)} />
                            <input type="email" placeholder="Email"
                                className="auth-input"
                                value={email} onChange={(e) => setEmail(e.target.value)} />
                            <div className="relative">
                                <input type={showPassword ? 'text' : 'password'} placeholder="Mật khẩu"
                                    className="auth-input pr-12"
                                    value={password} onChange={(e) => setPassword(e.target.value)} />
                                <button type="button" className="auth-eye-btn"
                                    onClick={() => setShowPassword((p) => !p)}
                                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
                                    {showPassword ? '🙈' : '👁'}
                                </button>
                            </div>
                            <div className="relative">
                                <input type={showConfirmPassword ? 'text' : 'password'} placeholder="Xác nhận mật khẩu"
                                    className="auth-input pr-12"
                                    value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                                <button type="button" className="auth-eye-btn"
                                    onClick={() => setShowConfirmPassword((p) => !p)}
                                    aria-label={showConfirmPassword ? 'Ẩn xác nhận' : 'Hiện xác nhận'}>
                                    {showConfirmPassword ? '🙈' : '👁'}
                                </button>
                            </div>

                            {/* Password policy checklist */}
                            <div className="rounded-xl border border-primary/15 bg-white/70 px-4 py-3 text-xs text-text-secondary space-y-1.5 text-left">
                                <p className="font-semibold text-text-primary mb-1">Yêu cầu mật khẩu:</p>
                                {[
                                    [passwordPolicy.minLength, 'Tối thiểu 8 ký tự'],
                                    [passwordPolicy.maxLength, 'Tối đa 15 ký tự'],
                                    [passwordPolicy.hasLowercase, 'Có ít nhất 1 chữ thường'],
                                    [passwordPolicy.hasUppercase, 'Có ít nhất 1 chữ in hoa'],
                                    [passwordPolicy.hasNumber, 'Có ít nhất 1 chữ số'],
                                    [passwordPolicy.hasSpecial, 'Có ít nhất 1 ký tự đặc biệt'],
                                ].map(([ok, label]) => (
                                    <p key={label as string} className={`flex items-center gap-2 ${ok ? 'text-green-700' : ''}`}>
                                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${ok ? 'bg-green-200 text-green-700' : 'bg-gray-200'}`}>
                                            {ok ? '✓' : ''}
                                        </span>
                                        {label as string}
                                    </p>
                                ))}
                            </div>

                            {errorMessage && !isLogin && <div className="auth-error">{errorMessage}</div>}
                            {successMessage && !isLogin && <div className="auth-success">{successMessage}</div>}

                            <Button variant="primary" className="w-full mt-2" onClick={handleSubmit} disabled={isSubmitting}>
                                {isSubmitting ? 'Đang xử lý...' : 'Tạo tài khoản'}
                            </Button>
                        </div>

                        {/* Mobile-only switch to login */}
                        <p className="auth-mobile-switch">
                            Đã có tài khoản?{' '}
                            <button type="button" className="text-primary font-bold hover:underline" onClick={switchToLogin}>
                                Đăng nhập
                            </button>
                        </p>
                    </div>
                </div>

                {/* ── Front page overlay (RIGHT side, gradient — visible by default) ── */}
                {/* Flips OUT (rotateY -180°) when .active, flips back IN when .close   */}
                <div className="auth-page auth-page-front">
                    <div className="auth-page-content">
                        <span className="auth-page-icon animate-float">📚</span>
                        <h3 className="text-4xl font-bold mb-3">Xin chào!</h3>
                        <p className="text-white/90 text-sm leading-relaxed text-center">
                            Tạo tài khoản để bắt đầu hành trình học từ vựng tiếng Anh của bạn.
                        </p>
                        <button type="button" className="auth-page-btn" onClick={switchToRegister}>
                            Đăng ký <span className="ml-1">→</span>
                        </button>
                    </div>
                </div>

                {/* ── Back page overlay (RIGHT side, gradient — hidden behind front) ── */}
                {/* Flips IN (rotateY -180°) when .active, flips back OUT when .close   */}
                <div className="auth-page auth-page-back">
                    <div className="auth-page-content auth-page-back-content">
                        <span className="auth-page-icon animate-float">🚀</span>
                        <h3 className="text-4xl font-bold mb-3">Chào mừng trở lại!</h3>
                        <p className="text-white/90 text-sm leading-relaxed text-center">
                            Đăng nhập để tiếp tục bài học và nâng cao kỹ năng của bạn.
                        </p>
                        <button type="button" className="auth-page-btn" onClick={switchToLogin}>
                            <span className="mr-1">←</span> Đăng nhập
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default Auth;
