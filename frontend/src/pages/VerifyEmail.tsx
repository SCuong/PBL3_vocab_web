import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Button, typography } from '../components/ui';
import { authApi } from '../services/authApi';
import { PATHS } from '../routes/paths';

const VerifyEmail = () => {
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
            .then((resultMessage) => {
                if (isCancelled) return;
                setStatus('success');
                setMessage(resultMessage);
            })
            .catch((error: any) => {
                if (isCancelled) return;
                setStatus('error');
                setMessage(error?.message || 'Xác minh email thất bại.');
            });

        return () => {
            isCancelled = true;
        };
    }, [searchParams]);

    return (
        <div className="min-h-screen flex items-center justify-center px-4 py-8">
            <div className="glass-card max-w-md w-full rounded-3xl p-8 text-center">
                <div className="mb-4 text-4xl">
                    {status === 'loading' ? '...' : status === 'success' ? '✓' : '!'}
                </div>
                <h1 className={`${typography.pageTitle} mb-3`}>Xác minh email</h1>
                <p className="text-text-secondary mb-6">{message}</p>
                <Link to={PATHS.login}>
                    <Button variant="primary" className="w-full">
                        Đăng nhập
                    </Button>
                </Link>
            </div>
        </div>
    );
};

export default VerifyEmail;
