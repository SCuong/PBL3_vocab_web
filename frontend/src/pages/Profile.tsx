import { useEffect, useMemo, useState } from 'react';
import { Award, BookOpen, Flame, StickyNote, UserPlus, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button, typography } from '../components/ui';
import { StreakHeatmap } from '../components/learning/streak';
import { DeleteAccountModal } from '../components/account';
import EditProfileModal from '../components/profile/EditProfileModal';
import { type AuthenticatedUser } from '../services/authApi';
import { stickyNotesApi, type StickyNoteItem } from '../services/stickyNotesApi';
import { vocabularyApi, type VocabularyListItem } from '../services/vocabularyApi';
import { loadProfilePreferences } from '../utils/profilePreferences';
import { normalizeAvatarUrl } from '../utils/avatarPresets';
import { buildStudyDaySummary } from '../utils/studyHistory';
import { useAppContext } from '../context/AppContext';
import { PATHS } from '../routes/paths';

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
    const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
    const [showLearnedWords, setShowLearnedWords] = useState(false);
    const [learnedWordsList, setLearnedWordsList] = useState<VocabularyListItem[]>([]);
    const [isLoadingLearnedWords, setIsLoadingLearnedWords] = useState(false);
    const [selectedStudyDate, setSelectedStudyDate] = useState<string | null>(null);
    const [stickyNotes, setStickyNotes] = useState<StickyNoteItem[]>([]);
    const [isLoadingStickyNotes, setIsLoadingStickyNotes] = useState(false);
    const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = useState(false);

    useEffect(() => {
        if (!user?.userId) {
            setAvatarUrl(undefined);
            return;
        }

        const preferences = loadProfilePreferences(user.userId);
        setAvatarUrl(normalizeAvatarUrl(preferences.avatarUrl));
    }, [user?.userId]);

    const handleProfileSaved = (updatedUser: AuthenticatedUser, nextAvatarUrl: string | undefined) => {
        setAvatarUrl(nextAvatarUrl);
        onUserUpdated(updatedUser);
    };

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
                return 'bg-[var(--sticky-note-blue-bg)] border-[var(--sticky-note-blue-border)]';
            case 'green':
                return 'bg-[var(--sticky-note-green-bg)] border-[var(--sticky-note-green-border)]';
            case 'pink':
                return 'bg-[var(--sticky-note-pink-bg)] border-[var(--sticky-note-pink-border)]';
            case 'purple':
                return 'bg-[var(--sticky-note-purple-bg)] border-[var(--sticky-note-purple-border)]';
            default:
                return 'bg-[var(--sticky-note-yellow-bg)] border-[var(--sticky-note-yellow-border)]';
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

    return (
        <div className="max-w-6xl mx-auto px-6 py-12">
            <div className="grid md:grid-cols-3 gap-8">
                <div className="space-y-8">
                    <div className="profile-card overflow-hidden">
                        <div className="h-20 bg-linear-to-br from-primary/40 via-accent/30 to-secondary/30" />
                        <div className="px-8 pb-8 -mt-12 text-center">
                            {avatarUrl ? (
                                <img
                                    src={avatarUrl}
                                    alt="Avatar"
                                    className="w-24 h-24 rounded-full object-cover mx-auto mb-4 border-4 border-surface shadow-lg"
                                />
                            ) : (
                                <div className="w-24 h-24 rounded-full bg-linear-to-br from-primary to-secondary mx-auto mb-4 flex items-center justify-center text-4xl font-display text-text-on-accent border-4 border-surface shadow-lg">
                                    {initials}
                                </div>
                            )}
                            <h2 className={`${typography.sectionTitle} mb-1`}>{user.username}</h2>
                            <p className="text-sm text-text-muted mb-6">{user.email}</p>
                            <div className="space-y-2">
                                <Button variant="ghost" className="w-full" onClick={() => setIsEditing(true)}>Chỉnh sửa hồ sơ</Button>
                                <Button variant="danger" className="w-full" onClick={onLogout}>Đăng xuất</Button>
                                <Button variant="danger" className="w-full opacity-80" onClick={() => setIsDeleteAccountModalOpen(true)}>Xóa tài khoản</Button>
                            </div>
                        </div>
                    </div>
                    <div className="profile-card-tinted p-7">
                        <h3 className="font-bold mb-3 flex items-center gap-2"><Users size={18} className="text-primary" /> Nhóm Streak</h3>
                        <p className="text-sm text-text-muted mb-5">Mời thêm bạn bè để cùng nhau nhận Group Bonus XP!</p>
                        <Button variant="primary" className="w-full" onClick={onOpenStreak}><UserPlus size={18} /> Mời bạn tham gia</Button>
                    </div>
                </div>
                <div className="md:col-span-2 space-y-8">
                    <div className="grid grid-cols-3 gap-4">
                        {[
                            { label: 'Từ đã học', value: user.learnedWords || 0, icon: <BookOpen size={20} />, tone: 'bg-cyan/15 text-cyan' },
                            { label: 'Streak', value: user.streak || 0, icon: <Flame size={20} />, tone: 'bg-orange-100 text-orange-500' },
                            { label: 'XP', value: user.xp || 0, icon: <Award size={20} />, tone: 'bg-pink/15 text-pink' }
                        ].map((s, i) => (
                            <div key={i} className="profile-stat">
                                <div className={`w-10 h-10 mx-auto mb-3 rounded-xl flex items-center justify-center ${s.tone}`}>
                                    {s.icon}
                                </div>
                                <div className="text-3xl font-bold">{s.value}</div>
                                <div className="text-xs uppercase tracking-wide text-text-muted mt-1">{s.label}</div>
                            </div>
                        ))}
                    </div>
                    <div className="profile-card p-6 sm:p-7">
                        <h3 className="text-xl font-bold mb-1">Lịch sử học</h3>
                        <p className="text-xs text-text-muted mb-5">Mỗi ô là một ngày — bấm để xem chi tiết.</p>
                        <StreakHeatmap
                            history={studyHistoryDates}
                            startDate={accountCreatedDate}
                            selectedDate={selectedStudyDate}
                            onSelectDate={setSelectedStudyDate}
                        />
                        <div className="mt-5 p-4 rounded-2xl border border-primary/15 bg-primary/[0.04]">
                            <p className="text-sm font-bold capitalize">{selectedStudyDateLabel}</p>
                            {selectedStudyDate ? (
                                <>
                                    <p className={`text-sm mt-1 ${hasStudiedOnSelectedDate ? 'text-green-700' : 'text-text-muted'}`}>
                                        {hasStudiedOnSelectedDate
                                            ? 'Bạn có học trong ngày này.'
                                            : 'Không có hoạt động học trong ngày này.'}
                                    </p>

                                    {hasStudiedOnSelectedDate && (
                                        <div className="mt-3 space-y-3">
                                            <div className="grid grid-cols-2 gap-2 text-xs">
                                                <div className="rounded-xl border border-primary/15 bg-surface p-2.5 text-center">
                                                    <div className="text-text-muted uppercase tracking-wide">Từ đã học</div>
                                                    <div className="text-base font-bold mt-0.5">{selectedStudySummary.totalWords}</div>
                                                </div>
                                                <div className="rounded-xl border border-primary/15 bg-surface p-2.5 text-center">
                                                    <div className="text-text-muted uppercase tracking-wide">XP</div>
                                                    <div className="text-base font-bold mt-0.5">+{selectedStudySummary.totalXp}</div>
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
                    <div className="profile-card p-6 sm:p-7 profile-defer">
                        <div className="flex items-start justify-between gap-4 mb-4">
                            <h3 className="text-xl font-bold">Từ đã học</h3>
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
                    <div className="profile-card p-6 sm:p-7 profile-defer">
                        <div className="flex items-start justify-between gap-4 mb-4">
                            <div>
                                <h3 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                                    <StickyNote size={18} className="text-primary" /> Danh sách ghi chú
                                </h3>
                                <p className="mt-1 text-xs text-text-muted">
                                    {sortedStickyNotes.length} ghi chú · ghim hiển thị trước
                                </p>
                            </div>
                            <Button
                                variant="ghost"
                                className="px-4 py-2 shrink-0"
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
                            <div className="max-h-[28rem] overflow-y-auto pr-1 rounded-2xl">
                                <div className="grid sm:grid-cols-2 gap-3">
                                    {sortedStickyNotes.map((note) => (
                                        <div
                                            key={note.stickyNoteId}
                                            className={`rounded-xl border p-3 text-text-primary ${getNoteColorClass(note.color)}`}
                                        >
                                            <div className="text-[11px] uppercase tracking-wide text-text-muted mb-1.5 flex items-center justify-between gap-3">
                                                <span>{note.isPinned ? 'Đã ghim' : 'Ghi chú'}</span>
                                                <span className="shrink-0">{new Date(note.updatedAt).toLocaleDateString('vi-VN')}</span>
                                            </div>
                                            <p className="max-h-24 overflow-y-auto pr-1 text-sm leading-relaxed whitespace-pre-line">
                                                {note.content || 'Ghi chú trống'}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <EditProfileModal
                isOpen={isEditing}
                onClose={() => setIsEditing(false)}
                userId={user?.userId}
                initialUsername={user.username || ''}
                initialEmail={user.email || ''}
                initialAvatarUrl={avatarUrl}
                onProfileSaved={handleProfileSaved}
                onAddToast={onAddToast}
            />

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
