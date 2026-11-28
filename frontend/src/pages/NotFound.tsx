import { ArrowLeft, BookOpen, GraduationCap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui';
import { PATHS } from '../routes/paths';

const NotFound = () => {
    const navigate = useNavigate();

    return (
        <div className="mx-auto flex min-h-[calc(100dvh-10rem)] max-w-2xl items-center justify-center px-4 py-12">
            <section className="glass-card flex w-full flex-col items-center p-8 text-center sm:p-10">
                <img
                    src="/mascot-lumo-oops.webp"
                    alt="Lumo ngơ ngác vì không tìm thấy trang"
                    width={148}
                    height={168}
                    className="h-auto w-[136px] select-none drop-shadow-[0_14px_16px_rgba(0,0,0,0.16)] sm:w-[148px]"
                />
                <span className="mt-4 inline-flex items-center rounded-full border-2 border-primary/25 bg-primary-light px-3.5 py-1 font-mono text-xs font-extrabold tracking-widest text-primary">
                    LỖI 404
                </span>
                <h1 className="mt-4 text-2xl font-extrabold tracking-[-0.02em] text-text-primary sm:text-[1.85rem]">
                    Lumo tìm không thấy trang này
                </h1>
                <p className="mt-2.5 max-w-md text-sm leading-relaxed text-text-muted sm:text-base">
                    Đường dẫn có thể đã bị đổi tên hoặc không còn tồn tại. Bạn có thể quay về trang chủ hoặc mở thẳng phiên học mới.
                </p>

                <div className="mt-7 flex w-full flex-wrap items-center justify-center gap-3">
                    <Button variant="primary" className="shrink-0 whitespace-nowrap" onClick={() => navigate(PATHS.home)}>
                        <ArrowLeft size={16} aria-hidden /> Về trang chủ
                    </Button>
                    <Button variant="secondary" className="shrink-0 whitespace-nowrap" onClick={() => navigate(PATHS.learning)}>
                        <GraduationCap size={16} aria-hidden /> Vào học ngay
                    </Button>
                    <Button variant="ghost" className="shrink-0 whitespace-nowrap" onClick={() => navigate(PATHS.vocabulary)}>
                        <BookOpen size={16} aria-hidden /> Kho từ vựng
                    </Button>
                </div>
            </section>
        </div>
    );
};

export default NotFound;
