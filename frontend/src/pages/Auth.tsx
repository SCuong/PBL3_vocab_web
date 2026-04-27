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

    const resetForgotPasswordState = () => {
        setForgotPasswordSent(false);
        setForgotPasswordInboxUrl('https://mail.google.com');
        setForgotPasswordResetLink('');
        setForgotPasswordUsedFallback(false);
    };

    useEffect(() => {
        setIsLogin(initialMode !== 'register');
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
        hasSpecial: /[^A-Za-z0-9]/.test(password)
    };

    const isPasswordValid = Object.values(passwordPolicy).every(Boolean);

    const handleSubmit = async () => {
        if (isSubmitting) {
            return;
        }

        setErrorMessage('');
        setSuccessMessage('');
        setIsSubmitting(true);

        try {
            if (isLogin) {
                const user = await authApi.login({
                    usernameOrEmail,
                    password,
                    rememberMe: true
                });
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

                const user = await authApi.register({
                    name,
                    email,
                    password
                });
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

    const switchAuthMode = (loginMode: boolean) => {
        setIsLogin(loginMode);
        setErrorMessage('');
        setSuccessMessage('');

        if (loginMode) {
            setConfirmPassword('');
            setShowConfirmPassword(false);
        }
    };

    const handleForgotPasswordSubmit = async () => {
        if (isSubmitting) {
            return;
        }

        if (!forgotEmail.trim()) {
            setErrorMessage('Vui lòng nhập email.');
            return;
        }

        setErrorMessage('');
        setSuccessMessage('');
        setIsSubmitting(true);

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
        if (isSubmitting) {
            return;
        }

        if (!forgotEmail.trim() || !resetToken.trim() || !newPassword || !confirmNewPassword) {
            setErrorMessage('Vui lòng nhập đầy đủ email, mã xác thực và mật khẩu mới.');
            return;
        }

        if (newPassword !== confirmNewPassword) {
            setErrorMessage('Xác nhận mật khẩu không khớp.');
            return;
        }

        setErrorMessage('');
        setSuccessMessage('');
        setIsSubmitting(true);

        try {
            const message = await authApi.resetPassword({
                email: forgotEmail.trim(),
                token: resetToken.trim(),
                newPassword,
                confirmNewPassword
            });

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

    const title = isResetPasswordMode
        ? 'Đặt lại mật khẩu'
        : isForgotPasswordMode
            ? 'Quên mật khẩu'
            : isLogin
                ? 'Đăng nhập'
                : 'Đăng ký';

    if (isForgotPasswordMode || isResetPasswordMode) {
        return (
            <div className="min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden">
                {/* Gradient Background Orbs */}
                <div className="absolute -top-40 -left-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl animate-pulse-soft -z-10" />
                <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-accent/20 rounded-full blur-3xl -z-10" style={{animationDelay: '0.5s'}} />

                <div className="max-w-md w-full">
                    <div className="glass-card p-8 md:p-10 rounded-2xl md:rounded-3xl">
                        {/* Header */}
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary/15 mb-4">
                                <span className="text-2xl">{isForgotPasswordMode ? '🔐' : '🔑'}</span>
                            </div>
                            <h2 className="text-3xl md:text-4xl font-bold text-text-primary mb-2">{title}</h2>
                            <p className="text-text-secondary text-sm">
                                {isForgotPasswordMode ? 'Nhập email của bạn để nhận liên kết đặt lại mật khẩu' : 'Nhập thông tin để đặt lại mật khẩu mới'}
                            </p>
                        </div>

                        {/* Form Content */}
                        <div className="space-y-4 mb-8">
                            {isForgotPasswordMode ? (
                                !forgotPasswordSent ? (
                                    <input
                                        type="email"
                                        placeholder="Email tài khoản"
                                        className="w-full px-4 py-3 rounded-xl border-2 border-primary/10 bg-white/50 focus:border-primary/30 focus:bg-white transition-all outline-none"
                                        value={forgotEmail}
                                        onChange={(e) => setForgotEmail(e.target.value)}
                                    />
                                ) : (
                                    <div className="space-y-3 rounded-xl border-2 border-accent/30 bg-white/70 px-4 py-4 text-sm text-center">
                                        <p className="text-accent font-semibold flex items-center justify-center gap-2">
                                            <span>✓</span>
                                            Email đã được gửi!
                                        </p>
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
                                    <input
                                        type="email"
                                        placeholder="Email tài khoản"
                                        className="w-full px-4 py-3 rounded-xl border-2 border-primary/10 bg-white/50 focus:border-primary/30 focus:bg-white transition-all outline-none"
                                        value={forgotEmail}
                                        onChange={(e) => setForgotEmail(e.target.value)}
                                        readOnly
                                    />
                                    <input
                                        type="text"
                                        placeholder="Mã xác thực"
                                        className="w-full px-4 py-3 rounded-xl border-2 border-primary/10 bg-white/50 focus:border-primary/30 focus:bg-white transition-all outline-none"
                                        value={resetToken}
                                        onChange={(e) => setResetToken(e.target.value)}
                                    />
                                    <div className="relative">
                                        <input
                                            type={showNewPassword ? 'text' : 'password'}
                                            placeholder="Mật khẩu mới"
                                            className="w-full px-4 py-3 pr-12 rounded-xl border-2 border-primary/10 bg-white/50 focus:border-primary/30 focus:bg-white transition-all outline-none"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                        />
                                        <button
                                            type="button"
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-lg hover:scale-110 transition-transform"
                                            onClick={() => setShowNewPassword((prev) => !prev)}
                                            aria-label={showNewPassword ? 'Ẩn mật khẩu mới' : 'Hiện mật khẩu mới'}
                                        >
                                            {showNewPassword ? '🙈' : '👁'}
                                        </button>
                                    </div>
                                    <div className="relative">
                                        <input
                                            type={showConfirmNewPassword ? 'text' : 'password'}
                                            placeholder="Xác nhận mật khẩu mới"
                                            className="w-full px-4 py-3 pr-12 rounded-xl border-2 border-primary/10 bg-white/50 focus:border-primary/30 focus:bg-white transition-all outline-none"
                                            value={confirmNewPassword}
                                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                                        />
                                        <button
                                            type="button"
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-lg hover:scale-110 transition-transform"
                                            onClick={() => setShowConfirmNewPassword((prev) => !prev)}
                                            aria-label={showConfirmNewPassword ? 'Ẩn xác nhận mật khẩu mới' : 'Hiện xác nhận mật khẩu mới'}
                                        >
                                            {showConfirmNewPassword ? '🙈' : '👁'}
                                        </button>
                                    </div>
                                </>
                            )}

                            {errorMessage && (
                                <div className="text-sm text-red-500 font-medium bg-red-50/70 rounded-lg p-3 border border-red-200/50">
                                    {errorMessage}
                                </div>
                            )}
                            {successMessage && (
                                <div className="text-sm text-green-600 font-medium bg-green-50/70 rounded-lg p-3 border border-green-200/50">
                                    {successMessage}
                                </div>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-3">
                            {isForgotPasswordMode ? (
                                <>
                                    {!forgotPasswordSent ? (
                                        <Button variant="primary" className="w-full" onClick={handleForgotPasswordSubmit} disabled={isSubmitting}>
                                            {isSubmitting ? 'Đang gửi...' : 'Gửi liên kết đặt lại'}
                                        </Button>
                                    ) : forgotPasswordUsedFallback && forgotPasswordResetLink ? (
                                        <a href={forgotPasswordResetLink} className="block">
                                            <Button variant="primary" className="w-full">
                                                Mở trang đặt lại mật khẩu
                                            </Button>
                                        </a>
                                    ) : (
                                        <a href={forgotPasswordInboxUrl} target="_blank" rel="noreferrer" className="block">
                                            <Button variant="primary" className="w-full">
                                                Mở hộp thư
                                            </Button>
                                        </a>
                                    )}
                                    <Button variant="ghost" className="w-full" onClick={goBackToLogin}>
                                        Quay lại đăng nhập
                                    </Button>
                                </>
                            ) : (
                                <>
                                    <Button 
                                        variant="primary" 
                                        className="w-full" 
                                        onClick={handleResetPasswordSubmit} 
                                        disabled={isSubmitting || !resetToken}
                                    >
                                        {isSubmitting ? 'Đang xử lý...' : 'Đặt lại mật khẩu'}
                                    </Button>
                                    <Button variant="ghost" className="w-full" onClick={goBackToLogin}>
                                        Quay lại đăng nhập
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden">
            {/* Gradient Background Orbs */}
            <div className="absolute -top-40 -left-40 w-80 h-80 bg-primary/20 rounded-full blur-3xl animate-pulse-soft -z-10" />
            <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-accent/20 rounded-full blur-3xl -z-10" style={{animationDelay: '0.5s'}} />

            <div className="auth-flip-container">
                <div className={`auth-flip-book ${!isLogin ? 'is-register' : ''}`}>
                    {/* Login Page - Front Left */}
                    <div className="auth-flip-page auth-flip-login">
                        <div className="text-center mb-8 lg:mb-10">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/15 mb-4">
                                <span className="text-3xl">👤</span>
                            </div>
                            <h2 className="text-3xl md:text-4xl font-bold text-text-primary">Đăng nhập</h2>
                            <p className="text-text-secondary text-sm mt-2">Tiếp tục hành trình học của bạn</p>
                        </div>

                        <div className="space-y-4 w-full">
                            <input
                                type="text"
                                placeholder="Tên đăng nhập hoặc email"
                                className="w-full px-4 py-3 rounded-xl border-2 border-primary/10 bg-white/50 focus:border-primary/30 focus:bg-white transition-all outline-none"
                                value={usernameOrEmail}
                                onChange={(e) => setUsernameOrEmail(e.target.value)}
                            />
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Mật khẩu"
                                    className="w-full px-4 py-3 pr-12 rounded-xl border-2 border-primary/10 bg-white/50 focus:border-primary/30 focus:bg-white transition-all outline-none"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-lg hover:scale-110 transition-transform"
                                    onClick={() => setShowPassword((prev) => !prev)}
                                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                                >
                                    {showPassword ? '🙈' : '👁'}
                                </button>
                            </div>

                            {errorMessage && isLogin && (
                                <div className="text-sm text-red-500 font-medium bg-red-50/70 rounded-lg p-3 border border-red-200/50">
                                    {errorMessage}
                                </div>
                            )}
                            {successMessage && isLogin && (
                                <div className="text-sm text-green-600 font-medium bg-green-50/70 rounded-lg p-3 border border-green-200/50">
                                    {successMessage}
                                </div>
                            )}

                            <Button variant="primary" className="w-full mt-6" onClick={handleSubmit} disabled={isSubmitting}>
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
                    </div>

                    {/* Register Page - Back Right (Flipped) */}
                    <div className="auth-flip-page auth-flip-register">
                        <div className="text-center mb-8 lg:mb-10">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/15 mb-4">
                                <span className="text-3xl">✨</span>
                            </div>
                            <h2 className="text-3xl md:text-4xl font-bold text-text-primary">Đăng ký</h2>
                            <p className="text-text-secondary text-sm mt-2">Bắt đầu học từ vựng mới</p>
                        </div>

                        <div className="space-y-4 w-full">
                            <input
                                type="text"
                                placeholder="Tên hiển thị"
                                className="w-full px-4 py-3 rounded-xl border-2 border-primary/10 bg-white/50 focus:border-primary/30 focus:bg-white transition-all outline-none"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                            <input
                                type="email"
                                placeholder="Email"
                                className="w-full px-4 py-3 rounded-xl border-2 border-primary/10 bg-white/50 focus:border-primary/30 focus:bg-white transition-all outline-none"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Mật khẩu"
                                    className="w-full px-4 py-3 pr-12 rounded-xl border-2 border-primary/10 bg-white/50 focus:border-primary/30 focus:bg-white transition-all outline-none"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-lg hover:scale-110 transition-transform"
                                    onClick={() => setShowPassword((prev) => !prev)}
                                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                                >
                                    {showPassword ? '🙈' : '👁'}
                                </button>
                            </div>
                            <div className="relative">
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    placeholder="Xác nhận mật khẩu"
                                    className="w-full px-4 py-3 pr-12 rounded-xl border-2 border-primary/10 bg-white/50 focus:border-primary/30 focus:bg-white transition-all outline-none"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-lg hover:scale-110 transition-transform"
                                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                                    aria-label={showConfirmPassword ? 'Ẩn xác nhận mật khẩu' : 'Hiện xác nhận mật khẩu'}
                                >
                                    {showConfirmPassword ? '🙈' : '👁'}
                                </button>
                            </div>

                            {/* Password Requirements */}
                            <div className="rounded-xl border border-primary/15 bg-white/70 px-4 py-3 text-xs md:text-sm text-text-secondary space-y-1.5 text-left">
                                <p className="font-semibold text-text-primary mb-2">Yêu cầu mật khẩu:</p>
                                <p className={`flex items-center gap-2 ${passwordPolicy.minLength ? 'text-green-700' : ''}`}>
                                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${passwordPolicy.minLength ? 'bg-green-200 text-green-700' : 'bg-gray-200'}`}>
                                        {passwordPolicy.minLength ? '✓' : ''}
                                    </span>
                                    Tối thiểu 8 ký tự
                                </p>
                                <p className={`flex items-center gap-2 ${passwordPolicy.maxLength ? 'text-green-700' : ''}`}>
                                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${passwordPolicy.maxLength ? 'bg-green-200 text-green-700' : 'bg-gray-200'}`}>
                                        {passwordPolicy.maxLength ? '✓' : ''}
                                    </span>
                                    Tối đa 15 ký tự
                                </p>
                                <p className={`flex items-center gap-2 ${passwordPolicy.hasLowercase ? 'text-green-700' : ''}`}>
                                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${passwordPolicy.hasLowercase ? 'bg-green-200 text-green-700' : 'bg-gray-200'}`}>
                                        {passwordPolicy.hasLowercase ? '✓' : ''}
                                    </span>
                                    Có ít nhất 1 chữ thường
                                </p>
                                <p className={`flex items-center gap-2 ${passwordPolicy.hasUppercase ? 'text-green-700' : ''}`}>
                                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${passwordPolicy.hasUppercase ? 'bg-green-200 text-green-700' : 'bg-gray-200'}`}>
                                        {passwordPolicy.hasUppercase ? '✓' : ''}
                                    </span>
                                    Có ít nhất 1 chữ in hoa
                                </p>
                                <p className={`flex items-center gap-2 ${passwordPolicy.hasNumber ? 'text-green-700' : ''}`}>
                                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${passwordPolicy.hasNumber ? 'bg-green-200 text-green-700' : 'bg-gray-200'}`}>
                                        {passwordPolicy.hasNumber ? '✓' : ''}
                                    </span>
                                    Có ít nhất 1 chữ số
                                </p>
                                <p className={`flex items-center gap-2 ${passwordPolicy.hasSpecial ? 'text-green-700' : ''}`}>
                                    <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${passwordPolicy.hasSpecial ? 'bg-green-200 text-green-700' : 'bg-gray-200'}`}>
                                        {passwordPolicy.hasSpecial ? '✓' : ''}
                                    </span>
                                    Có ít nhất 1 ký tự đặc biệt
                                </p>
                            </div>

                            {errorMessage && !isLogin && (
                                <div className="text-sm text-red-500 font-medium bg-red-50/70 rounded-lg p-3 border border-red-200/50">
                                    {errorMessage}
                                </div>
                            )}
                            {successMessage && !isLogin && (
                                <div className="text-sm text-green-600 font-medium bg-green-50/70 rounded-lg p-3 border border-green-200/50">
                                    {successMessage}
                                </div>
                            )}

                            <Button variant="primary" className="w-full mt-6" onClick={handleSubmit} disabled={isSubmitting}>
                                {isSubmitting ? 'Đang xử lý...' : 'Tạo tài khoản'}
                            </Button>
                        </div>
                    </div>

                    {/* Flip Overlay - Animates between login/register */}
                    <div className="auth-flip-overlay">
                        <div className="auth-flip-page-face auth-flip-page-front">
                            <div className="text-center space-y-6">
                                <div className="text-6xl animate-float">📚</div>
                                <div>
                                    <h3 className="text-4xl font-bold mb-3">Xin chào!</h3>
                                    <p className="text-white/90 text-sm md:text-base leading-relaxed">
                                        Tạo tài khoản để bắt đầu hành trình học từ vựng tiếng Anh của bạn.
                                    </p>
                                </div>
                                <button 
                                    type="button" 
                                    className="auth-flip-overlay-btn" 
                                    onClick={() => switchAuthMode(false)}
                                >
                                    Đăng ký
                                    <span className="ml-2">→</span>
                                </button>
                            </div>
                        </div>

                        <div className="auth-flip-page-face auth-flip-page-back">
                            <div className="text-center space-y-6">
                                <div className="text-6xl animate-float">🚀</div>
                                <div>
                                    <h3 className="text-4xl font-bold mb-3">Chào mừng trở lại!</h3>
                                    <p className="text-white/90 text-sm md:text-base leading-relaxed">
                                        Đăng nhập để tiếp tục bài học của bạn và nâng cao kỹ năng.
                                    </p>
                                </div>
                                <button 
                                    type="button" 
                                    className="auth-flip-overlay-btn" 
                                    onClick={() => switchAuthMode(true)}
                                >
                                    <span className="mr-2">←</span>
                                    Đăng nhập
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Auth;
