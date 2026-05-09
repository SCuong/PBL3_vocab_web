import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { Button } from '../components/ui';

const MinitestResult = ({ score, total, detail, onBack }: any) => (
    <div className="max-w-4xl mx-auto px-6 py-24">
        <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="glass-card p-16 text-center shadow-2xl relative overflow-hidden"
        >
            <div className="mesh-orb w-64 h-64 bg-primary top-[-32px] right-[-32px] opacity-20" />
            <div className="relative z-10">
                <div className="text-9xl font-display font-extrabold bg-linear-to-r from-cyan via-purple to-pink bg-clip-text text-transparent mb-8">
                    {score}<span className="text-4xl text-text-muted">/{total}</span>
                </div>
                <h2 className="text-4xl mb-6 font-bold">Làm tốt lắm! 🎉</h2>

                {detail?.bonus > 0 && (
                    <div className="mb-12 inline-block px-6 py-3 bg-linear-to-r from-yellow-400 to-orange-500 rounded-pill text-white font-bold shadow-lg animate-bounce">
                        🔥 Perfect Translation Bonus: +50 XP
                    </div>
                )}

                <div className="grid grid-cols-2 gap-8 max-w-sm mx-auto mb-16">
                    <div className="p-6 bg-purple/5 rounded-2xl border border-purple/10">
                        <div className="text-text-muted text-sm uppercase font-bold mb-2">Điền Từ</div>
                        <div className="text-3xl font-bold text-primary">{detail?.fill || 0}/5</div>
                    </div>
                    <div className="p-6 bg-accent/5 rounded-2xl border border-accent/10">
                        <div className="text-text-muted text-sm uppercase font-bold mb-2">Dịch Câu</div>
                        <div className="text-3xl font-bold text-secondary">{detail?.translation || 0}/4</div>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-center gap-6">
                    <Button variant="primary" className="px-12 py-5 text-xl" onClick={() => onBack('learning-topics')}>
                        Tiếp tục lộ trình <ChevronRight size={24} />
                    </Button>
                    <Button variant="secondary" className="px-12 py-5 text-xl" onClick={() => onBack('home')}>
                        Về trang chủ
                    </Button>
                    <Button variant="outline" className="px-12 py-5 text-xl" onClick={() => onBack('minitest-review')}>
                        Xem lại đáp án 📝
                    </Button>
                </div>
            </div>
        </motion.div>
    </div>
);

export default MinitestResult;
