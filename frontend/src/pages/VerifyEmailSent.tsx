import { useLocation, useNavigate } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { Button } from '../components/ui';
import { PATHS } from '../routes/paths';

type VerifyEmailSentState = {
    email?: string;
};

const readEmailFromState = (state: unknown) => {
    const email = (state as VerifyEmailSentState | null)?.email;
    return typeof email === 'string' && email.trim().length > 0 ? email.trim() : '';
};

const VerifyEmailSent = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const email = readEmailFromState(location.state);
    const displayEmail = email || 'email bạn đã đăng ký';

    const openEmail = () => {
        window.open('https://mail.google.com/', '_blank', 'noopener,noreferrer');
    };

    return (
        <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center px-4 py-8">
            <section className="w-full max-w-[460px] rounded-[var(--radius-container)] border-2 border-border bg-surface p-6 text-center sm:p-8">
                <span className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-primary-light text-primary" aria-hidden>
                    <MailCheck size={22} />
                </span>
                <h1 className="text-2xl font-bold tracking-[-0.02em] text-text-primary">Kiểm tra email của bạn</h1>
                <p className="mx-auto mt-3 max-w-[40ch] text-sm leading-relaxed text-text-muted">
                    Chúng tôi đã gửi liên kết xác minh đến{' '}
                    <span className={`${email ? 'break-all' : 'break-words'} font-semibold text-text-primary`}>{displayEmail}</span>.
                    Mở email và bấm <span className="font-medium text-text-primary">Xác minh email</span> để kích hoạt tài khoản.
                </p>
                <div className="mt-6 space-y-2.5">
                    <Button fullWidth onClick={openEmail}>Mở Gmail</Button>
                    <Button fullWidth variant="secondary" onClick={() => navigate(PATHS.login, { state: { verifiedEmail: email } })}>
                        Về trang đăng nhập
                    </Button>
                </div>
                <p className="mt-4 text-xs text-text-muted">Không thấy email? Hãy xem mục Spam hoặc Quảng cáo.</p>
            </section>
        </div>
    );
};

export default VerifyEmailSent;
