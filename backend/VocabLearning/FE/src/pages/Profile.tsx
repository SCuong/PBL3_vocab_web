import { Award, BookOpen, Flame, UserPlus, Users } from 'lucide-react';
import { Button } from '../components/ui';
import { StreakHeatmap } from '../components/streak';

const Profile = ({ user, onLogout, onOpenStreak }: any) => (
    <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid md:grid-cols-3 gap-8">
            <div className="space-y-8">
                <div className="glass-card p-10 text-center">
                    <div className="w-32 h-32 rounded-full bg-linear-to-br from-primary to-secondary mx-auto mb-6 flex items-center justify-center text-5xl font-display text-white shadow-xl">{user.username[0]}</div>
                    <h2 className="text-3xl mb-1">{user.username}</h2>
                    <p className="text-text-muted mb-8">{user.email}</p>
                    <div className="space-y-3">
                        <Button variant="ghost" className="w-full">Edit Profile</Button>
                        <Button variant="danger" className="w-full" onClick={onLogout}>Logout</Button>
                    </div>
                </div>
                <div className="glass-card p-8 bg-linear-to-br from-accent/20 to-secondary/20 border-accent/30">
                    <h3 className="font-bold mb-4 flex items-center gap-2"><Users size={18} className="text-primary" /> Nhóm Streak</h3>
                    <p className="text-sm text-text-muted mb-6">Mời thêm bạn bè để cùng nhau nhận Group Bonus XP!</p>
                    <Button variant="primary" className="w-full" onClick={onOpenStreak}><UserPlus size={18} /> Mời bạn tham gia</Button>
                </div>
            </div>
            <div className="md:col-span-2 space-y-8">
                <div className="grid grid-cols-3 gap-4">
                    {[
                        { label: 'Words', value: user.learnedWords || 0, icon: <BookOpen className="text-cyan" /> },
                        { label: 'Streak', value: user.streak || 0, icon: <Flame className="text-orange-500" /> },
                        { label: 'XP', value: user.xp || 0, icon: <Award className="text-pink" /> }
                    ].map((s, i) => (
                        <div key={i} className="glass-card p-6 text-center">
                            <div className="flex justify-center mb-2">{s.icon}</div>
                            <div className="text-3xl font-bold">{s.value}</div>
                            <div className="text-xs uppercase tracking-widest text-text-muted">{s.label}</div>
                        </div>
                    ))}
                </div>
                <div className="glass-card p-8">
                    <h3 className="text-xl mb-6">Study History (30 Days)</h3>
                    <StreakHeatmap history={user.studyHistory} />
                </div>
            </div>
        </div>
    </div>
);

export default Profile;
