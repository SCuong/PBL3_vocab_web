import { Check, Calendar, XCircle, Trophy, Users, PlusCircle, Flame } from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge, Button } from '../../ui';
import { StreakHeatmap } from './StreakHeatmap';

type StreakModalProps = {
    isOpen: boolean;
    onClose: () => void;
    gameData: any;
};

export const StreakModal = ({ isOpen, onClose, gameData }: StreakModalProps) => {
    if (!isOpen) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-text-primary/40 backdrop-blur-sm"
            />
            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="glass-card w-full max-w-xl p-8 relative z-10 overflow-hidden"
            >
                <div className="absolute top-0 right-0 p-4">
                    <button onClick={onClose} className="p-2 hover:bg-purple/10 rounded-full transition-colors"><XCircle size={24} /></button>
                </div>

                <div className="text-center mb-10">
                    <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-orange-100 mb-6 shadow-glow">
                        <Flame size={48} className="text-orange-500 animate-pulse" fill="currentColor" />
                    </div>
                    <h2 className="text-4xl font-display font-bold mb-2">{gameData.currentUser.streak} Ngày Stream!</h2>
                    <p className="text-text-secondary">Bạn đang làm rất tốt, hãy duy trì phong độ nhé!</p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 mb-10">
                    <div className="bg-bg-light p-6 rounded-2xl border border-primary/10">
                        <h3 className="font-bold flex items-center gap-2 mb-4"><Calendar size={18} className="text-primary" /> Lịch sử học tập</h3>
                        <StreakHeatmap history={gameData.currentUser.studyHistory} />
                        <div className="mt-4 text-[10px] text-text-muted flex justify-between">
                            <span>30 ngày qua</span>
                            <span>Hôm nay</span>
                        </div>
                    </div>
                    <div className="bg-bg-light p-6 rounded-2xl border border-primary/10">
                        <h3 className="font-bold flex items-center gap-2 mb-4"><Trophy size={18} className="text-accent" /> Milestones</h3>
                        <div className="space-y-3">
                            {[7, 30, 100].map(m => (
                                <div key={m} className={`flex items-center gap-3 p-2 rounded-lg border ${gameData.currentUser.streak >= m ? 'bg-primary/10 border-primary/20' : 'opacity-40 border-transparent'}`}>
                                    <div className="text-xl">{m === 7 ? '🔥' : m === 30 ? '🏆' : '👑'}</div>
                                    <div className="text-sm font-bold">{m} Ngày</div>
                                    {gameData.currentUser.streak >= m && <Check size={14} className="ml-auto text-green-600" />}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="glass-card p-6 border-accent/30 bg-accent/5">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold flex items-center gap-2"><Users size={20} className="text-primary" /> Challenge Streak Nhóm</h3>
                        <Badge variant="accent">{gameData.groupStreak.length}/3 Bạn</Badge>
                    </div>

                    <div className="flex gap-4 mb-6">
                        {gameData.groupStreak.map((member: any) => (
                            <div key={member.id} className="flex-1 flex flex-col items-center gap-2">
                                <div className="relative">
                                    <div className="w-14 h-14 rounded-full bg-linear-to-br from-primary to-accent flex items-center justify-center text-2xl shadow-md border-2 border-white">
                                        {member.avatar}
                                    </div>
                                    <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center text-[10px] shadow-sm ${member.status === 'done' ? 'bg-green-500 text-white' : 'bg-orange-500 text-white'}`}>
                                        {member.status === 'done' ? '✅' : '⏳'}
                                    </div>
                                </div>
                                <div className="text-xs font-bold text-center leading-tight">
                                    {member.username}
                                    <div className="text-[10px] text-text-muted">{member.streak}d</div>
                                </div>
                            </div>
                        ))}
                        {gameData.groupStreak.length < 3 && (
                            <button className="flex-1 flex flex-col items-center gap-2 group">
                                <div className="w-14 h-14 rounded-full bg-purple/5 border-2 border-dashed border-purple/30 flex items-center justify-center text-purple group-hover:bg-purple/10 transition-colors">
                                    <PlusCircle size={24} />
                                </div>
                                <div className="text-[10px] font-bold text-text-muted">Invite</div>
                            </button>
                        )}
                    </div>

                    <Button variant="accent" className="w-full">Mời bạn tham gia +50 XP 🚀</Button>
                </div>
            </motion.div>
        </div>
    );
};
