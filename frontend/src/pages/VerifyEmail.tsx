import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AlertCircle, Check } from 'lucide-react';
import { Spinner } from '@astryxdesign/core/Spinner';
import { authApi } from '../services/authApi';
import { PATHS } from '../routes/paths';

const VerifyEmail = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('Đang xác minh email...');

    useEffect(() => {
        const token = searchParams.get('token')?.trim() ?? '';
        if (!token) {
            setStatus('error');
            setMessage('Liên kết xác minh không hợp lệ.');
            return;
        }

        let isCancelled = false;
        authApi.verifyEmail({ token })
            .then((result) => {
                if (isCancelled) return;
                const loginParams = new URLSearchParams({ verified: '1' });
                if (result.email) {
                    loginParams.set('email', result.email);
                }

                navigate(`${PATHS.login}?${loginParams.toString()}`, { replace: true });
            })
            .catch((error: any) => {
                if (isCancelled) return;
                setStatus('error');
                setMessage(error?.message || 'Xác minh email thất bại.');
            });

        return () => {
            isCancelled = true;
        };
    }, [navigate, searchParams]);

    return (
        <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center px-4 py-8">
            <section className="w-full max-w-[420px] rounded-[var(--radius-container)] border border-border bg-surface p-6 text-center sm:p-8" aria-live="polite">
                <span
                    className={`mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full ${
                        status === 'error' ? 'bg-danger-color/10 text-danger-color' : 'bg-primary-light text-primary'
                    }`}
                    aria-hidden
                >
                    {status === 'loading' ? <Spinner size="md" /> : status === 'success' ? <Check size={22} /> : <AlertCircle size={22} />}
                </span>
                <h1 className="text-2xl font-bold tracking-[-0.02em] text-text-primary">Xác minh email</h1>
                <p className="mt-2 text-sm text-text-muted">{message}</p>
                <Link to={PATHS.login} className="btn-primary mt-6 w-full">Đăng nhập</Link>
            </section>
        </div>
    );
};

export default VerifyEmail;
