import React, { useEffect, useMemo, useState } from 'react';
import { Award, BookOpen, Flame, StickyNote, UserPlus, Users, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button, typography } from '../components/ui';
import { StreakHeatmap } from '../components/learning/streak';
import { DeleteAccountModal } from '../components/account';
import { authApi, type AuthenticatedUser } from '../services/authApi';
import { stickyNotesApi, type StickyNoteItem } from '../services/stickyNotesApi';
import { vocabularyApi, type VocabularyListItem } from '../services/vocabularyApi';
import { loadProfilePreferences, saveProfilePreferences } from '../utils/profilePreferences';
import { AVATAR_PRESETS, normalizeAvatarUrl } from '../utils/avatarPresets';
import { buildStudyDaySummary } from '../utils/studyHistory';
import { useAppContext } from '../context/AppContext';
import { PATHS } from '../routes/paths';
import {
    checkPasswordPolicy,
    isPasswordPolicyValid,
    PASSWORD_MAX_LENGTH,
    PASSWORD_POLICY_LABELS,
} from '../utils/passwordPolicy';

const format2Digits = (value: number) => (value < 10 ? `0${value}` : String(value));

const Profile = () => {
    const {
        currentUser,
        gameData,
        learnedWordIds,
        handleLogout,
        setShowStreakModal,
        addToast: onAddToast,
        handleUserUpdated: onUserUpdated,
    } = useAppContext();
    const navigate = useNavigate();

    const user = {
        ...currentUser!,
        ...gameData,
        learnedWords: Array.isArray(learnedWordIds) ? learnedWordIds.length : (gameData?.learnedWords ?? 0),
    };

    const onLogout = async () => { await handleLogout(); navigate(PATHS.home); };
    const onOpenStreak = () => setShowStreakModal(true);
    const [isEditing, setIsEditing] = useState(false);
    const [username, setUsername] = useState(user.username || '');
    const [email, setEmail] = useState(user.email || '');
    const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
    const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [confirmPasswordError, setConfirmPasswordError] = useState('');
    const [showLearnedWords, setShowLearnedWords] = useState(false);
    const [learnedWordsList, setLearnedWordsList] = useState<VocabularyListItem[]>([]);
    const [isLoadingLearnedWords, setIsLoadingLearnedWords] = useState(false);
    const [selectedStudyDate, setSelectedStudyDate] = useState<string | null>(null);
    const [stickyNotes, setStickyNotes] = useState<StickyNoteItem[]>([]);
    const [isLoadingStickyNotes, setIsLoadingStickyNotes] = useState(false);

    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isSavingPassword, setIsSavingPassword] = useState(false);
    const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = useState(false);

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

    const learnedWords = useMemo(
        () => (Array.isArray(learnedWordsList) ? learnedWordsList : [])
            .filter(item => item?.word)
            .sort((a, b) => String(a.word || '').localeCompare(String(b.word || ''))),
        [learnedWordsList]
    );

    useEffect(() => {
        if (!showLearnedWords) {
            return;
        }

        const normalizedIds = Array.isArray(learnedWordIds)
            ? learnedWordIds.filter((id): id is number => Number.isFinite(id) && id > 0)
            : [];

        if (normalizedIds.length === 0) {
            setLearnedWordsList([]);
            return;
        }

        let isDisposed = false;

        const loadLearnedWords = async () => {
            setIsLoadingLearnedWords(true);
            try {
                const items = await vocabularyApi.getByIds(normalizedIds);
                if (!isDisposed) {
                    setLearnedWordsList(items);
                }
            } catch (error: any) {
                if (!isDisposed) {
                    setLearnedWordsList([]);
                    onAddToast?.(error?.message || 'Không thể tải danh sách từ đã học.', 'info');
                }
            } finally {
                if (!isDisposed) {
                    setIsLoadingLearnedWords(false);
                }
            }
        };

        void loadLearnedWords();

        return () => {
            isDisposed = true;
        };
    }, [showLearnedWords, learnedWordIds, onAddToast]);

    useEffect(() => {
        if (!currentUser?.userId) {
            setStickyNotes([]);
            return;
        }

        let isDisposed = false;

        const loadStickyNotes = async () => {
            setIsLoadingStickyNotes(true);
            try {
                const items = await stickyNotesApi.getAll();
                if (!isDisposed) {
                    setStickyNotes(items);
                }
            } catch (error: any) {
                if (!isDisposed) {
                    setStickyNotes([]);
                    onAddToast?.(error?.message || 'Không thể tải danh sách ghi chú.', 'info');
                }
            } finally {
                if (!isDisposed) {
                    setIsLoadingStickyNotes(false);
                }
            }
        };

        void loadStickyNotes();

        return () => {
            isDisposed = true;
        };
    }, [currentUser?.userId, onAddToast]);

    const studyHistory = useMemo(
        () => (Array.isArray(user.studyHistory) ? user.studyHistory : [])
            .filter((day: unknown): day is string => typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day)),
        [user.studyHistory]
    );

    const studyHistoryDetails = useMemo(
        () => (user?.studyHistoryDetails && typeof user.studyHistoryDetails === 'object')
            ? user.studyHistoryDetails
            : {},
        [user?.studyHistoryDetails]
    );
    const newPasswordPolicy = checkPasswordPolicy(newPassword);
    const isNewPasswordValid = isPasswordPolicyValid(newPasswordPolicy);

    const studyHistoryDates = useMemo(() => {
        const detailDates = Object.keys(studyHistoryDetails)
            .filter((day) => /^\d{4}-\d{2}-\d{2}$/.test(day));

        return Array.from(new Set([...studyHistory, ...detailDates])).sort((a, b) => a.localeCompare(b));
    }, [studyHistory, studyHistoryDetails]);

    useEffect(() => {
        if (studyHistoryDates.length === 0) {
            setSelectedStudyDate(null);
            return;
        }

        const latestDate = studyHistoryDates[studyHistoryDates.length - 1] ?? null;
        setSelectedStudyDate(latestDate);
    }, [studyHistoryDates]);

    const selectedStudyDateLabel = useMemo(() => {
        if (!selectedStudyDate) {
            return 'Chọn một ngày để xem chi tiết học tập.';
        }

        const parsedDate = new Date(`${selectedStudyDate}T00:00:00`);
        if (Number.isNaN(parsedDate.getTime())) {
            return selectedStudyDate;
        }

        return parsedDate.toLocaleDateString('vi-VN', {
            weekday: 'long',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }, [selectedStudyDate]);

    const hasStudiedOnSelectedDate = selectedStudyDate
        ? studyHistoryDates.indexOf(selectedStudyDate) !== -1
        : false;

    const selectedStudyDetail = useMemo(
        () => (selectedStudyDate ? studyHistoryDetails[selectedStudyDate] : null),
        [selectedStudyDate, studyHistoryDetails]
    );

    const selectedStudySummary = useMemo(
        () => buildStudyDaySummary(
            selectedStudyDate || '',
            studyHistoryDates,
            selectedStudyDetail,
            Number(user.learnedWords || learnedWords.length || 0),
            Number(user.xp || 0)
        ),
        [selectedStudyDate, studyHistoryDates, selectedStudyDetail, user.learnedWords, learnedWords.length, user.xp]
    );

    const sortedStickyNotes = useMemo(
        () => [...stickyNotes].sort((a, b) => Number(b.isPinned) - Number(a.isPinned)),
        [stickyNotes],
    );

    const getNoteColorClass = (color: StickyNoteItem['color']) => {
        switch (color) {
            case 'blue':
                return 'bg-sky-100 border-sky-200 text-slate-700';
            case 'green':
                return 'bg-emerald-100 border-emerald-200 text-slate-700';
            case 'pink':
                return 'bg-rose-100 border-rose-200 text-slate-700';
            case 'purple':
                return 'bg-violet-100 border-violet-200 text-slate-700';
            default:
                return 'bg-amber-100 border-amber-200 text-slate-700';
        }
    };

    const accountCreatedDate = useMemo(() => {
        if (!user?.createdAt || typeof user.createdAt !== 'string') {
            return null;
        }

        const datePart = user.createdAt.slice(0, 10);
        if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
            return datePart;
        }

        const parsed = new Date(user.createdAt);
        if (Number.isNaN(parsed.getTime())) {
            return null;
        }

        const year = parsed.getFullYear();
        const month = format2Digits(parsed.getMonth() + 1);
        const day = format2Digits(parsed.getDate());
        return `${year}-${month}-${day}`;
    }, [user?.createdAt]);

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

        if (!isNewPasswordValid) {
            setConfirmPasswordError('Mật khẩu chưa đúng định dạng yêu cầu.');
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
                            <img src={avatarUrl} alt="Avatar" className="w-32 h-32 rounded-full object-cover mx-auto mb-6 shadow-xl border-2 border-surface/60" />
                        ) : (
                            <div className="w-32 h-32 rounded-full bg-linear-to-br from-primary to-secondary mx-auto mb-6 flex items-center justify-center text-[2.75rem] font-display text-text-on-accent shadow-xl">{initials}</div>
                        )}
                        <h2 className={`${typography.sectionTitle} mb-1`}>{user.username}</h2>
                        <p className="text-text-muted mb-8">{user.email}</p>
                        <div className="space-y-3">
                            <Button variant="ghost" className="w-full" onClick={() => setIsEditing(true)}>Chỉnh sửa hồ sơ</Button>
                            <Button variant="danger" className="w-full" onClick={onLogout}>Đăng xuất</Button>
                            <Button variant="danger" className="w-full opacity-80" onClick={() => setIsDeleteAccountModalOpen(true)}>Xóa tài khoản</Button>
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
                            { label: 'Từ đã học', value: user.learnedWords || 0, icon: <BookOpen className="text-cyan" /> },
                            { label: 'Streak', value: user.streak || 0, icon: <Flame className="text-orange-500" /> },
                            { label: 'XP', value: user.xp || 0, icon: <Award className="text-pink" /> }
                        ].map((s, i) => (
                            <div key={i} className="glass-card p-6 text-center">
                                <div className="flex justify-center mb-2">{s.icon}</div>
                                <div className="text-3xl font-bold">{s.value}</div>
                                <div className="text-xs uppercase tracking-wide text-text-muted">{s.label}</div>
                            </div>
                        ))}
                    </div>
                    <div className="glass-card p-8">
                        <h3 className="text-xl mb-6">Lịch sử học</h3>
                        <StreakHeatmap
                            history={studyHistoryDates}
                            startDate={accountCreatedDate}
                            selectedDate={selectedStudyDate}
                            onSelectDate={setSelectedStudyDate}
                        />
                        <div className="mt-5 p-4 rounded-2xl border border-primary/20 bg-surface/40">
                            <p className="text-sm font-bold capitalize">{selectedStudyDateLabel}</p>
                            {selectedStudyDate ? (
                                <>
                                    <p className={`text-sm mt-1 ${hasStudiedOnSelectedDate ? 'text-green-700' : 'text-text-muted'}`}>
                                        {hasStudiedOnSelectedDate
                                            ? 'Bạn có học trong ngày này. ✅'
                                            : 'Không có hoạt động học trong ngày này.'}
                                    </p>

                                    {hasStudiedOnSelectedDate && (
                                        <div className="mt-3 space-y-3">
                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                                <div className="rounded-xl border border-primary/20 bg-surface/70 p-2 text-center">
                                                    <div className="text-text-muted uppercase">Từ đã học</div>
                                                    <div className="text-base font-bold">{selectedStudySummary.totalWords}</div>
                                                </div>
                                                <div className="rounded-xl border border-primary/20 bg-surface/70 p-2 text-center">
                                                    <div className="text-text-muted uppercase">XP</div>
                                                    <div className="text-base font-bold">+{selectedStudySummary.totalXp}</div>
                                                </div>
                                            </div>

                                            {selectedStudySummary.topics.length > 0 && (
                                                <div className="text-xs text-text-secondary">
                                                    Chủ đề: {selectedStudySummary.topics.join(', ')}
                                                </div>
                                            )}

                                        </div>
                                    )}
                                </>
                            ) : (
                                <p className="text-sm mt-1 text-text-muted">Nhấp vào ô ngày trong heatmap để xem.</p>
                            )}
                        </div>
                    </div>
                    <div className="glass-card p-8">
                        <div className="flex items-center justify-between gap-4 mb-4">
                            <h3 className="text-xl">Từ đã học</h3>
                            <Button
                                variant="ghost"
                                className="px-4 py-2"
                                onClick={() => setShowLearnedWords((prev) => !prev)}
                            >
                                {showLearnedWords ? 'Ẩn' : 'Hiện'}
                            </Button>
                        </div>

                        {!showLearnedWords ? (
                            <p className="text-sm text-text-muted">Nhấn Hiện để xem danh sách từ đã học.</p>
                        ) : learnedWords.length === 0 ? (
                            <p className="text-sm text-text-muted">Bạn chưa có từ nào đã học.</p>
                        ) : (
                            <div className="max-h-80 overflow-auto border border-primary/10 rounded-2xl divide-y divide-primary/10">
                                {learnedWords.map((item) => (
                                    <div key={item.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                                        <div>
                                            <div className="font-bold">{item.word}</div>
                                            <div className="text-sm text-text-muted">{item.meaning}</div>
                                        </div>
                                        <div className="text-xs text-text-muted">{item.topicName || 'Chủ đề khác'}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="glass-card p-8">
                        <div className="flex items-center justify-between gap-4 mb-4">
                            <h3 className="text-xl flex items-center gap-2">
                                <StickyNote size={18} className="text-primary" /> Danh sách ghi chú
                            </h3>
                            <Button
                                variant="ghost"
                                className="px-4 py-2"
                                onClick={async () => {
                                    if (!currentUser?.userId) {
                                        setStickyNotes([]);
                                        return;
                                    }
                                    setIsLoadingStickyNotes(true);
                                    try {
                                        const items = await stickyNotesApi.getAll();
                                        setStickyNotes(items);
                                    } catch (error: any) {
                                        onAddToast?.(error?.message || 'Không thể tải danh sách ghi chú.', 'info');
                                    } finally {
                                        setIsLoadingStickyNotes(false);
                                    }
                                }}
                                disabled={isLoadingStickyNotes}
                            >
                                Làm mới
                            </Button>
                        </div>

                        {isLoadingStickyNotes ? (
                            <p className="text-sm text-text-muted">Đang tải ghi chú...</p>
                        ) : sortedStickyNotes.length === 0 ? (
                            <p className="text-sm text-text-muted">Bạn chưa có ghi chú nào.</p>
                        ) : (
                            <div className="grid sm:grid-cols-2 gap-4">
                                {sortedStickyNotes.map((note) => (
                                    <div
                                        key={note.stickyNoteId}
                                        className={`rounded-2xl border p-4 ${getNoteColorClass(note.color)}`}
                                    >
                                        <div className="text-xs uppercase tracking-widest text-slate-500 mb-2 flex items-center justify-between">
                                            <span>{note.isPinned ? 'Đã ghim' : 'Ghi chú'}</span>
                                            <span>{new Date(note.updatedAt).toLocaleDateString('vi-VN')}</span>
                                        </div>
                                        <p className="text-sm whitespace-pre-line">{note.content || 'Ghi chú trống'}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {isEditing && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[700] bg-surface/35 backdrop-blur-sm p-6 flex items-center justify-center"
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.96, y: 16 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.96, y: 16 }}
                            transition={{ duration: 0.24, ease: 'easeOut' }}
                            className="glass-card bg-surface/85 w-full max-w-2xl p-8 max-h-[90vh] overflow-y-auto"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className={typography.modalTitle}>Chỉnh sửa hồ sơ</h3>
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
                                        <div className="w-20 h-20 rounded-full bg-linear-to-br from-primary to-secondary flex items-center justify-center text-3xl font-display text-text-on-accent">{initials}</div>
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
                                    placeholder="Tên người dùng"
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
                                    maxLength={PASSWORD_MAX_LENGTH}
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
                                <div className="rounded-xl border border-primary/15 bg-surface/70 px-4 py-3 text-xs text-text-secondary space-y-1 text-left">
                                    <p className="font-semibold text-text-primary mb-1">Yêu cầu mật khẩu:</p>
                                    {PASSWORD_POLICY_LABELS.map(([key, label]) => {
                                        const ok = newPasswordPolicy[key];
                                        return (
                                            <p key={key} className={`flex items-center gap-2 ${ok ? 'text-green-700' : ''}`}>
                                                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${ok ? 'bg-green-200 text-green-700' : 'bg-surface-hover'}`}>
                                                    {ok ? '✓' : ''}
                                                </span>
                                                {label}
                                            </p>
                                        );
                                    })}
                                </div>
                                <input
                                    type="password"
                                    className={`w-full px-4 py-3 rounded-xl border-2 ${confirmPasswordError ? 'border-red-400' : 'border-primary/10'}`}
                                    placeholder="Xác nhận mật khẩu mới"
                                    value={confirmNewPassword}
                                    maxLength={PASSWORD_MAX_LENGTH}
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
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <DeleteAccountModal
                isOpen={isDeleteAccountModalOpen}
                onClose={() => setIsDeleteAccountModalOpen(false)}
                onSuccess={onLogout}
                onAddToast={onAddToast}
            />
        </div>
    );
};

export default Profile;
