import { useLocation } from 'react-router-dom';
import { Button } from '../components/ui';

type VerifyEmailSentState = {
    email?: string;
};

const readEmailFromState = (state: unknown) => {
    const email = (state as VerifyEmailSentState | null)?.email;
    return typeof email === 'string' && email.trim().length > 0 ? email.trim() : '';
};

const VerifyEmailSent = () => {
    const location = useLocation();
    const email = readEmailFromState(location.state);
    const displayEmail = email || 'email bạn đã đăng ký';

    const openEmail = () => {
        window.open('https://mail.google.com/', '_blank', 'noopener,noreferrer');
    };

    return (
        <div className="flex h-[calc(100dvh-65px)] items-center justify-center overflow-hidden bg-bg-light px-4 py-4 text-text-primary sm:py-6">
            <div className="mx-auto flex w-full max-w-2xl items-center justify-center">
                <section className="w-full rounded-[28px] border border-border bg-surface px-7 py-8 text-center shadow-[0_24px_70px_-36px_rgba(45,40,70,0.35)] sm:px-10 sm:py-10">
                    <h1 className="font-display text-4xl font-bold leading-tight tracking-normal text-text-primary md:text-5xl">
                        Đã gửi email xác nhận
                    </h1>
                    <p className="mx-auto mt-5 max-w-[62ch] text-base leading-relaxed text-text-secondary">
                        Chúng tôi đã gửi liên kết xác minh đến{' '}
                        <span className="font-bold text-text-primary">{displayEmail}</span>. Vui lòng mở email và bấm Xác minh email để kích hoạt tài khoản.
                    </p>

                    <div className="mt-8 flex justify-center">
                        <Button
                            type="button"
                            variant="primary"
                            className="min-h-12 px-7"
                            onClick={openEmail}
                        >
                            Mở email
                        </Button>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default VerifyEmailSent;
