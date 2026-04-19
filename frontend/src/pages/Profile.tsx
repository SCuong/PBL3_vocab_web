import { useEffect, useMemo, useState } from 'react';
import { Award, BookOpen, Flame, UserPlus, Users, X } from 'lucide-react';
import { Button } from '../components/ui';
import { StreakHeatmap } from '../components/streak';
import { authApi, type AuthenticatedUser } from '../services/authApi';
import { loadProfilePreferences, saveProfilePreferences } from '../utils/profilePreferences';
import { AVATAR_PRESETS, normalizeAvatarUrl } from '../utils/avatarPresets';

type ProfileProps = {
    user: any;
    onLogout: () => void;
    onOpenStreak: () => void;
    onAddToast?: (message: string, type?: string) => void;
    onUserUpdated: (user: AuthenticatedUser) => void;
};

const Profile = ({ user, onLogout, onOpenStreak, onAddToast, onUserUpdated }: ProfileProps) => {
    const [isEditing, setIsEditing] = useState(false);
    const [username, setUsername] = useState(user.username || '');
    const [email, setEmail] = useState(user.email || '');
    const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
    const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [confirmPasswordError, setConfirmPasswordError] = useState('');

    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isSavingPassword, setIsSavingPassword] = useState(false);

    useEffect(() => {
        setUsername(user.username || '');
        setEmail(user.email || '');
    }, [user.username, user.email]);

    useEffect(() => {
        if (!user?.userId) {
            setAvatarUrl(undefined);
            return;
        }

        const preferences = loadProfilePreferences(user.userId);
        setAvatarUrl(normalizeAvatarUrl(preferences.avatarUrl));
    }, [user?.userId]);

    useEffect(() => {
        if (!isEditing) {
            setIsAvatarPickerOpen(false);
        }
    }, [isEditing]);

    const initials = useMemo(() => {
        const source = (user.username || '').trim();
        if (!source) {
            return 'U';
        }

        return source[0].toUpperCase();
    }, [user.username]);

    const handleSaveProfile = async () => {
        if (isSavingProfile) {
            return;
        }

        setIsSavingProfile(true);
        try {
            const updatedUser = await authApi.updateProfile({ username, email });

            if (user?.userId) {
                saveProfilePreferences(user.userId, { avatarUrl });
            }

            onUserUpdated(updatedUser);
            onAddToast?.('Cập nhật hồ sơ thành công.', 'success');
            setIsEditing(false);
        } catch (error: any) {
            onAddToast?.(error?.message || 'Không thể cập nhật hồ sơ.', 'info');
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handleChangePassword = async () => {
        if (isSavingPassword) {
            return;
        }

        if (newPassword !== confirmNewPassword) {
            setConfirmPasswordError('Mật khẩu xác nhận không khớp với mật khẩu mới.');
            return;
        }

        setConfirmPasswordError('');

        setIsSavingPassword(true);
        try {
            await authApi.changePassword({ currentPassword, newPassword, confirmNewPassword });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmNewPassword('');
            setConfirmPasswordError('');
            onAddToast?.('Đổi mật khẩu thành công.', 'success');
        } catch (error: any) {
            onAddToast?.(error?.message || 'Không thể đổi mật khẩu.', 'info');
        } finally {
            setIsSavingPassword(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto px-6 py-12">
            <div className="grid md:grid-cols-3 gap-8">
                <div className="space-y-8">
                    <div className="glass-card p-10 text-center">
                        {avatarUrl ? (
                            <img src={avatarUrl} alt="Avatar" className="w-32 h-32 rounded-full object-cover mx-auto mb-6 shadow-xl border-2 border-white/60" />
                        ) : (
                            <div className="w-32 h-32 rounded-full bg-linear-to-br from-primary to-secondary mx-auto mb-6 flex items-center justify-center text-5xl font-display text-white shadow-xl">{initials}</div>
                        )}
                        <h2 className="text-3xl mb-1">{user.username}</h2>
                        <p className="text-text-muted mb-8">{user.email}</p>
                        <div className="space-y-3">
                            <Button variant="ghost" className="w-full" onClick={() => setIsEditing(true)}>Edit Profile</Button>
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

            {isEditing && (
                <div className="fixed inset-0 z-[700] bg-black/30 backdrop-blur-sm p-6 flex items-center justify-center">
                    <div className="glass-card w-full max-w-2xl p-8 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-2xl font-bold">Edit Profile</h3>
                            <button
                                className="w-9 h-9 rounded-full hover:bg-primary/10 flex items-center justify-center"
                                onClick={() => setIsEditing(false)}
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-8">
                            <section className="space-y-4">
                                <h4 className="font-bold">Thông tin tài khoản & Avatar</h4>
                                <div className="flex items-center gap-4">
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt="Avatar preview" className="w-20 h-20 rounded-full object-cover border border-primary/20" />
                                    ) : (
                                        <div className="w-20 h-20 rounded-full bg-linear-to-br from-primary to-secondary flex items-center justify-center text-3xl font-display text-white">{initials}</div>
                                    )}
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        className="px-4"
                                        onClick={() => setIsAvatarPickerOpen((prev) => !prev)}
                                    >
                                        {isAvatarPickerOpen ? 'Ẩn avatar' : 'Chọn avatar'}
                                    </Button>
                                </div>

                                {isAvatarPickerOpen && (
                                    <div className="grid grid-cols-5 gap-3">
                                        {AVATAR_PRESETS.map((avatar) => (
                                            <button
                                                key={avatar.id}
                                                type="button"
                                                className={`rounded-full border-2 p-0.5 transition-all ${avatarUrl === avatar.url ? 'border-primary scale-105' : 'border-transparent hover:border-primary/40'}`}
                                                onClick={() => {
                                                    setAvatarUrl(avatar.url);
                                                    setIsAvatarPickerOpen(false);
                                                }}
                                            >
                                                <img src={avatar.url} alt={avatar.id} className="w-14 h-14 rounded-full object-cover" />
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <input
                                    type="text"
                                    className="w-full px-4 py-3 rounded-xl border-2 border-primary/10"
                                    placeholder="Username"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                />
                                <input
                                    type="email"
                                    className="w-full px-4 py-3 rounded-xl border-2 border-primary/10"
                                    placeholder="Email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                                <Button className="w-full" variant="primary" onClick={handleSaveProfile} disabled={isSavingProfile}>
                                    {isSavingProfile ? 'Đang lưu...' : 'Lưu hồ sơ'}
                                </Button>
                            </section>

                            <section className="space-y-4 border-t border-primary/10 pt-6">
                                <h4 className="font-bold">Đổi mật khẩu</h4>
                                <input
                                    type="password"
                                    className="w-full px-4 py-3 rounded-xl border-2 border-primary/10"
                                    placeholder="Mật khẩu hiện tại"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                />
                                <input
                                    type="password"
                                    className="w-full px-4 py-3 rounded-xl border-2 border-primary/10"
                                    placeholder="Mật khẩu mới"
                                    value={newPassword}
                                    onChange={(e) => {
                                        const nextValue = e.target.value;
                                        setNewPassword(nextValue);

                                        if (!confirmNewPassword) {
                                            setConfirmPasswordError('');
                                            return;
                                        }

                                        setConfirmPasswordError(
                                            nextValue === confirmNewPassword
                                                ? ''
                                                : 'Mật khẩu xác nhận không khớp với mật khẩu mới.'
                                        );
                                    }}
                                />
                                <input
                                    type="password"
                                    className={`w-full px-4 py-3 rounded-xl border-2 ${confirmPasswordError ? 'border-red-400' : 'border-primary/10'}`}
                                    placeholder="Xác nhận mật khẩu mới"
                                    value={confirmNewPassword}
                                    onChange={(e) => {
                                        const nextValue = e.target.value;
                                        setConfirmNewPassword(nextValue);
                                        setConfirmPasswordError(
                                            nextValue === newPassword
                                                ? ''
                                                : 'Mật khẩu xác nhận không khớp với mật khẩu mới.'
                                        );
                                    }}
                                />
                                {confirmPasswordError && (
                                    <p className="text-sm text-red-500 -mt-2">{confirmPasswordError}</p>
                                )}
                                <Button className="w-full" variant="secondary" onClick={handleChangePassword} disabled={isSavingPassword}>
                                    {isSavingPassword ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
                                </Button>
                            </section>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Profile;
