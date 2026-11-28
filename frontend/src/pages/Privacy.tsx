import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui';
import { PATHS } from '../routes/paths';

const SECTIONS = [
    {
        title: '1. Dữ liệu chúng tôi thu thập',
        body: 'VocabLearning chỉ lưu những thông tin cần thiết để đồng bộ tiến độ học tập của bạn: tên hiển thị, địa chỉ email (khi đăng ký trực tiếp hoặc đăng nhập bằng Google), lịch sử ôn tập SM-2, điểm XP, chuỗi ngày học và tuỳ chọn giao diện (avatar, khung hồ sơ, ghi chú cá nhân).',
    },
    {
        title: '2. Cách sử dụng thông tin',
        body: 'Dữ liệu học tập được dùng duy nhất để tính lịch ôn tập ngắt quãng (SM-2), lưu thành tích cá nhân, hiển thị bảng xếp hạng người học và gửi email xác minh hoặc đặt lại mật khẩu khi bạn chủ động yêu cầu. Chúng tôi không bán hoặc chia sẻ dữ liệu cá nhân cho bên thứ ba phục vụ quảng cáo.',
    },
    {
        title: '3. Đăng nhập bằng Google & Bảo mật phiên',
        body: 'Khi chọn Đăng nhập bằng Google, hệ thống chỉ xác thực danh tính cơ bản (email và tên hiển thị) từ Google Identity Services. Phiên đăng nhập được bảo vệ bằng cookie HttpOnly, HTTPS/HSTS, kiểm soát CSRF và giới hạn tần suất yêu cầu ở máy chủ.',
    },
    {
        title: '4. Quyền kiểm soát & Xoá tài khoản',
        body: 'Bạn có thể cập nhật tên hiển thị, đổi mật khẩu hoặc xoá vĩnh viễn tài khoản cùng toàn bộ dữ liệu học tập bất cứ lúc nào ngay trong trang Hồ sơ cá nhân. Mọi thắc mắc vui lòng liên hệ nhóm phát triển qua email ở chân trang.',
    },
];

const Privacy = () => {
    const navigate = useNavigate();

    return (
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
            <Button variant="ghost" className="mb-6" onClick={() => navigate(-1)}>
                <ArrowLeft size={16} aria-hidden /> Quay lại
            </Button>

            <article className="glass-card p-6 sm:p-10">
                <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border-2 border-primary/25 bg-primary-light text-primary">
                        <ShieldCheck size={22} aria-hidden />
                    </span>
                    <div>
                        <h1 className="text-2xl font-extrabold tracking-[-0.02em] text-text-primary sm:text-[1.85rem]">
                            Chính sách bảo mật
                        </h1>
                        <p className="mt-0.5 text-xs font-medium text-text-muted">
                            Cập nhật gần nhất: 2026 · VocabLearning
                        </p>
                    </div>
                </div>

                <div className="mt-8 space-y-6">
                    {SECTIONS.map((section) => (
                        <section key={section.title} className="space-y-2 border-t border-border pt-5 first:border-t-0 first:pt-0">
                            <h2 className="text-base font-bold text-text-primary sm:text-lg">{section.title}</h2>
                            <p className="text-sm leading-relaxed text-text-secondary sm:text-[15px]">
                                {section.body}
                            </p>
                        </section>
                    ))}
                </div>

                <div className="mt-8 flex flex-wrap gap-3 border-t border-border pt-6">
                    <Button variant="primary" onClick={() => navigate(PATHS.home)}>
                        Về trang chủ
                    </Button>
                    <Button variant="secondary" onClick={() => navigate(PATHS.learning)}>
                        Bắt đầu học
                    </Button>
                </div>
            </article>
        </div>
    );
};

export default Privacy;
