import { motion } from 'framer-motion';
import { BookOpen, Brain, BarChart3, ChevronRight } from 'lucide-react';
import { Badge, Button } from '../components/ui';

const ChibiMascot = () => (
    <motion.div
        animate={{ y: [0, -15, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="relative w-72 h-72 flex items-center justify-center"
    >
        <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-2xl">
            <circle cx="100" cy="100" r="70" fill="#FFF" stroke="#CC99FF" strokeWidth="4" />
            <circle cx="75" cy="90" r="8" fill="#3D1A6E" />
            <circle cx="125" cy="90" r="8" fill="#3D1A6E" />
            <circle cx="78" cy="87" r="3" fill="#FFF" />
            <circle cx="128" cy="87" r="3" fill="#FFF" />
            <circle cx="60" cy="115" r="8" fill="#FFBBFF" opacity="0.6" />
            <circle cx="140" cy="115" r="8" fill="#FFBBFF" opacity="0.6" />
            <path d="M 85 130 Q 100 145 115 130" fill="none" stroke="#3D1A6E" strokeWidth="4" strokeLinecap="round" />
            <path d="M 50 60 L 100 30 L 150 60 L 100 90 Z" fill="#CC99FF" stroke="#3D1A6E" strokeWidth="3" />
            <rect x="95" y="15" width="10" height="20" fill="#3D1A6E" />
            <circle cx="160" cy="75" r="6" fill="#99FFFF" />
            <path d="M 150 60 Q 160 65 160 75" fill="none" stroke="#3D1A6E" strokeWidth="2" />
            <rect x="75" y="145" width="50" height="35" rx="5" fill="#FFBBFF" stroke="#3D1A6E" strokeWidth="3" />
            <line x1="85" y1="155" x2="115" y2="155" stroke="#FFF" strokeWidth="2" strokeLinecap="round" />
            <line x1="85" y1="165" x2="115" y2="165" stroke="#FFF" strokeWidth="2" strokeLinecap="round" />
        </svg>

        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-48 h-6 bg-primary/10 blur-md rounded-full" />
    </motion.div>
);

const Home = ({ onNavigate }: any) => (
    <div className="max-w-7xl mx-auto px-6 py-12 md:py-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
            <motion.div
                initial={{ opacity: 0, x: -50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
            >
                <h1 className="text-5xl md:text-7xl font-extrabold leading-tight mb-6">
                    Master English <br />
                    <span className="bg-linear-to-r from-cyan via-purple to-pink bg-clip-text text-transparent">Vocabulary</span>
                </h1>
                <p className="text-xl text-text-secondary mb-10 max-w-lg">
                    Learn smarter with spaced repetition — 10 words at a time. Aesthetic, effective, and fun.
                </p>
                <div className="flex flex-wrap gap-4">
                    <Button variant="primary" className="text-lg px-10" onClick={() => onNavigate('learning-topics')}>
                        Bắt đầu học <ChevronRight size={20} />
                    </Button>
                    <Button variant="secondary" className="text-lg px-10" onClick={() => onNavigate('vocabulary')}>
                        Xem từ vựng
                    </Button>
                </div>
                <div className="mt-16 flex items-center gap-8 text-text-muted">
                    <div>
                        <div className="text-2xl font-bold text-text-primary">2,400+</div>
                        <div className="text-sm">Từ vựng</div>
                    </div>
                    <div className="w-px h-10 bg-purple/20" />
                    <div>
                        <div className="text-2xl font-bold text-text-primary">6</div>
                        <div className="text-sm">CEFR Levels</div>
                    </div>
                    <div className="w-px h-10 bg-purple/20" />
                    <div>
                        <div className="text-2xl font-bold text-text-primary">∞</div>
                        <div className="text-sm">Spaced review</div>
                    </div>
                </div>
            </motion.div>
            <div className="relative flex justify-center">
                <ChibiMascot />
                <div className="mesh-orb w-64 h-64 bg-accent top-0 -right-10 opacity-30" />
                <div className="mesh-orb w-48 h-48 bg-secondary bottom-0 -left-10 opacity-30" />
            </div>
        </div>

        <div className="mt-32 grid md:grid-cols-3 gap-8">
            {[
                { icon: <BookOpen className="text-cyan" />, title: 'Học theo Flashcard', desc: 'Flip card trực quan, audio phát âm chuẩn bản xứ.' },
                { icon: <Brain className="text-purple" />, title: 'Spaced Repetition', desc: 'Ôn đúng lúc bạn sắp quên để ghi nhớ lâu dài.' },
                { icon: <BarChart3 className="text-pink" />, title: 'Theo dõi tiến độ', desc: 'Biết chính xác bao nhiêu từ đã thuộc mỗi ngày.' }
            ].map((feat, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.2 }}
                    viewport={{ once: true }}
                    className="glass-card p-8 hover:translate-y-[-8px] transition-transform duration-300"
                >
                    <div className="w-12 h-12 rounded-2xl bg-white shadow-sm flex items-center justify-center mb-6">
                        {feat.icon}
                    </div>
                    <h3 className="text-xl mb-3">{feat.title}</h3>
                    <p className="text-text-secondary leading-relaxed">{feat.desc}</p>
                </motion.div>
            ))}
        </div>

        <div className="mt-40 text-center">
            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
            >
                <Badge variant="purple" className="mb-4">CEFR Framework</Badge>
                <h2 className="text-4xl md:text-5xl mb-16">Từ Newbie đến Master</h2>
                <div className="flex flex-wrap justify-center gap-4">
                    {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map((lvl, i) => (
                        <motion.div
                            key={lvl}
                            initial={{ opacity: 0, y: 10 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            viewport={{ once: true }}
                            className="w-20 h-20 md:w-28 md:h-28 rounded-3xl bg-white border-2 border-primary/10 shadow-sm flex items-center justify-center text-2xl md:text-3xl font-display font-bold text-primary hover:border-primary hover:bg-primary/5 transition-all cursor-default"
                        >
                            {lvl}
                        </motion.div>
                    ))}
                </div>
            </motion.div>
        </div>
    </div>
);

export default Home;
