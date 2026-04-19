import { useState } from 'react';
import { authApi } from '../services/authApi';
import { Button } from '../components/ui';

const Auth = ({ onLogin, onAddToast }: any) => {
    const [isLogin, setIsLogin] = useState(true);
    const [name, setName] = useState('');
    const [usernameOrEmail, setUsernameOrEmail] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');

    const handleSubmit = async () => {
        if (isSubmitting) {
            return;
        }

        setErrorMessage('');
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

    return (
        <div className="max-w-md mx-auto px-6 py-24">
            <div className="glass-card p-10">
                <h2 className="text-3xl text-center mb-8">{isLogin ? 'Đăng nhập' : 'Đăng ký'}</h2>
                <div className="space-y-4 mb-8">
                    {!isLogin && (
                        <input
                            type="text"
                            placeholder="Tên hiển thị"
                            className="w-full px-4 py-3 rounded-xl border-2 border-primary/10"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    )}

                    {isLogin ? (
                        <input
                            type="text"
                            placeholder="Tên đăng nhập hoặc email"
                            className="w-full px-4 py-3 rounded-xl border-2 border-primary/10"
                            value={usernameOrEmail}
                            onChange={(e) => setUsernameOrEmail(e.target.value)}
                        />
                    ) : (
                        <input
                            type="email"
                            placeholder="Email"
                            className="w-full px-4 py-3 rounded-xl border-2 border-primary/10"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    )}

                    <input
                        type="password"
                        placeholder="Mật khẩu"
                        className="w-full px-4 py-3 rounded-xl border-2 border-primary/10"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />

                    {errorMessage && (
                        <div className="text-sm text-red-500 font-medium">{errorMessage}</div>
                    )}

                    <Button variant="primary" className="w-full" onClick={handleSubmit} disabled={isSubmitting}>
                        {isLogin ? 'Vào học ngay' : 'Tạo tài khoản'}
                    </Button>
                </div>
                <p className="text-center text-text-secondary text-sm">
                    {isLogin ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}
                    <button
                        className="text-primary font-bold ml-2 underline"
                        onClick={() => {
                            setIsLogin(!isLogin);
                            setErrorMessage('');
                        }}
                    >
                        {isLogin ? 'Đăng ký' : 'Đăng nhập'}
                    </button>
                </p>
            </div>
        </div>
    );
};

export default Auth;
