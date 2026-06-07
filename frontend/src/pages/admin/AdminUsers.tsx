import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import {
    AlertTriangle,
    BarChart3, BookOpen, CalendarClock, Eye, EyeOff, Flame, Loader2, Pencil, Plus,
    RefreshCw, Search, Trash2, Trophy,
} from 'lucide-react';
import { Button } from '../../components/ui';
import { DataTable, ErrorNotice, FilterBar, IconButton, Input, Modal, Pagination, Select, TextArea, adminInputClass, adminLabelClass } from '../../components/admin/ui';
import { useAppContext } from '../../context/AppContext';
import {
    checkPasswordPolicy,
    isPasswordPolicyValid,
    PASSWORD_MAX_LENGTH,
    PASSWORD_MIN_LENGTH,
    PASSWORD_POLICY_LABELS,
} from '../../utils/passwordPolicy';
import {
    adminApi,
    type AdminLearnerDetail,
    type AdminTopic,
    type AdminUser,
    type AdminCreateUserPayload,
    type AdminUpdateUserPayload,
} from '../../services/adminApi';

// ── Types ─────────────────────────────────────────────────────────────────────

type ModalState =
    | { mode: 'create' }
    | { mode: 'edit'; user: AdminUser };

type LearningAction = 'xp' | 'reset' | 'delete-data' | 'leaderboard';

interface UserFormData {
    username: string;
    email: string;
    password: string;
    role: 'ADMIN' | 'LEARNER';
    status: 'ACTIVE' | 'INACTIVE';
}

const EMPTY_FORM: UserFormData = {
    username: '',
    email: '',
    password: '',
    role: 'LEARNER',
    status: 'ACTIVE',
};

const PAGE_SIZE = 15;

// ── Sub-components ────────────────────────────────────────────────────────────

const RoleBadge = ({ role }: { role: string }) => {
    const isAdmin = role.toUpperCase() === 'ADMIN';
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
            isAdmin
                ? 'bg-primary/10 text-primary border-primary/30'
                : 'bg-cyan/10 text-cyan border-cyan/30'
        }`}>
            {isAdmin ? 'Quản trị' : 'Người học'}
        </span>
    );
};

const StatusBadge = ({ status, isDeleted }: { status: string; isDeleted: boolean }) => {
    if (isDeleted) {
        return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-500 border border-red-200">
                Đã xóa
            </span>
        );
    }
    const isActive = status.toUpperCase() === 'ACTIVE';
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
            isActive
                ? 'bg-green-50 text-green-600 border-green-200'
                : 'bg-amber-50 text-amber-600 border-amber-200'
        }`}>
            {isActive ? 'Hoạt động' : 'Tạm khóa'}
        </span>
    );
};

// ── UserFormModal ─────────────────────────────────────────────────────────────

interface UserFormModalProps {
    modalState: ModalState;
    onClose: () => void;
    onSubmit: (data: UserFormData) => Promise<void>;
    saving: boolean;
    error: string | null;
    currentUserId?: number;
}

const UserFormModal = ({ modalState, onClose, onSubmit, saving, error, currentUserId }: UserFormModalProps) => {
    const [form, setForm] = useState<UserFormData>(EMPTY_FORM);
    const [showPassword, setShowPassword] = useState(false);
    const passwordId = useId();
    const isEdit = modalState.mode === 'edit';
    const editingUser = modalState.mode === 'edit' ? modalState.user : null;
    // No SUPER_ADMIN role -> role/status of an admin account (or your own) must
    // not be editable from here. Username/email/password stay editable.
    const lockSensitive = editingUser != null
        && (editingUser.role.toUpperCase() === 'ADMIN' || editingUser.userId === currentUserId);
    const passwordPolicy = checkPasswordPolicy(form.password);

    useEffect(() => {
        if (modalState.mode === 'edit') {
            const u = modalState.user;
            setForm({
                username: u.username,
                email: u.email,
                password: '',
                role: u.role.toUpperCase() === 'ADMIN' ? 'ADMIN' : 'LEARNER',
                status: u.status.toUpperCase() === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
            });
        } else {
            setForm(EMPTY_FORM);
        }
        setShowPassword(false);
    }, [modalState]);

    const setField =
        (key: keyof UserFormData) =>
        (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
            setForm(prev => ({ ...prev, [key]: e.target.value }));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        void onSubmit(form);
    };
    const inputClass = adminInputClass;
    const labelClass = adminLabelClass;

    return (
        <Modal title={isEdit ? 'Chỉnh sửa người dùng' : 'Thêm người dùng'} onClose={onClose}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Input
                            label="Tên đăng nhập"
                            type="text"
                            value={form.username}
                            onChange={setField('username')}
                            required
                            minLength={3}
                            maxLength={50}
                            placeholder="Ví dụ: john_doe"
                            disabled={saving}
                        />
                    </div>

                    <div>
                        <Input
                            label="Email"
                            type="email"
                            value={form.email}
                            onChange={setField('email')}
                            required
                            maxLength={255}
                            placeholder="john@example.com"
                            disabled={saving}
                        />
                    </div>

                    <div>
                        <label htmlFor={passwordId} className={labelClass}>
                            Mật khẩu{' '}
                            {isEdit && (
                                <span className="text-text-muted font-normal">
                                    (để trống để giữ mật khẩu hiện tại)
                                </span>
                            )}
                        </label>
                        <div className="relative">
                            <input
                                id={passwordId}
                                type={showPassword ? 'text' : 'password'}
                                className={`${inputClass} pr-10`}
                                value={form.password}
                                onChange={setField('password')}
                                required={!isEdit}
                                minLength={PASSWORD_MIN_LENGTH}
                                maxLength={PASSWORD_MAX_LENGTH}
                                placeholder={isEdit ? '••••••••' : `Tối thiểu ${PASSWORD_MIN_LENGTH} ký tự`}
                                disabled={saving}
                            />
                            <button
                                type="button"
                                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                                aria-pressed={showPassword}
                                aria-controls={passwordId}
                                onClick={() => setShowPassword(v => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg text-text-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary transition-colors"
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                        {(!isEdit || form.password) && (
                            <div className="mt-2 rounded-xl border border-primary/15 bg-surface/70 px-4 py-3 text-xs text-text-secondary space-y-1 text-left">
                                <p className="font-semibold text-text-primary mb-1">Yêu cầu mật khẩu:</p>
                                {PASSWORD_POLICY_LABELS.map(([key, label]) => {
                                    const ok = passwordPolicy[key];
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
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Select
                                label="Vai trò"
                                value={form.role}
                                onChange={setField('role')}
                                disabled={saving || lockSensitive}
                            >
                                <option value="LEARNER">Người học</option>
                                <option value="ADMIN">Quản trị</option>
                            </Select>
                        </div>
                        <div>
                            <Select
                                label="Trạng thái"
                                value={form.status}
                                onChange={setField('status')}
                                disabled={saving || lockSensitive}
                            >
                                <option value="ACTIVE">Hoạt động</option>
                                <option value="INACTIVE">Tạm khóa</option>
                            </Select>
                        </div>
                    </div>
                    {lockSensitive && (
                        <p className="text-xs text-text-muted">
                            Không thể thay đổi quyền hoặc trạng thái của tài khoản quản trị.
                        </p>
                    )}

                    {error && (
                        <ErrorNotice>
                            <AlertTriangle size={14} className="shrink-0" />
                            {error}
                        </ErrorNotice>
                    )}

                    <div className="flex gap-3 pt-2">
                        <Button
                            type="button"
                            variant="secondary"
                            className="flex-1"
                            onClick={onClose}
                            disabled={saving}
                        >
                            Hủy
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            className="flex-1"
                            disabled={saving}
                        >
                            {saving ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" /> Đang lưu...
                                </>
                            ) : isEdit ? (
                                'Cập nhật'
                            ) : (
                                'Thêm người dùng'
                            )}
                        </Button>
                    </div>
                </form>
        </Modal>
    );
};

// ── DeleteUserConfirm ─────────────────────────────────────────────────────────

interface DeleteConfirmProps {
    user: AdminUser;
    onClose: () => void;
    onConfirm: () => void;
    deleting: boolean;
    error: string | null;
}

const DeleteUserConfirm = ({ user, onClose, onConfirm, deleting, error }: DeleteConfirmProps) => (
    <Modal title="Xóa người dùng" onClose={onClose} size="sm">
            <div className="flex flex-col items-center text-center gap-4">
                <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
                    <AlertTriangle size={28} className="text-red-500" />
                </div>
                <div>
                    <h2 className="text-xl font-display font-bold text-text-primary mb-1">
                        Xóa người dùng
                    </h2>
                    <p className="text-sm text-text-muted">
                        Xóa{' '}
                        <span className="font-bold text-text-primary">{user.username}</span>?{' '}
                        Thao tác này không thể hoàn tác.
                    </p>
                </div>

                {error && (
                    <ErrorNotice>
                        <AlertTriangle size={14} className="shrink-0" />
                        {error}
                    </ErrorNotice>
                )}

                <div className="flex gap-3 w-full">
                    <Button
                        variant="secondary"
                        className="flex-1"
                        onClick={onClose}
                        disabled={deleting}
                    >
                        Hủy
                    </Button>
                    <Button
                        variant="danger"
                        className="flex-1"
                        onClick={onConfirm}
                        disabled={deleting}
                    >
                        {deleting ? (
                            <>
                                <Loader2 size={16} className="animate-spin" /> Đang xóa...
                            </>
                        ) : (
                            'Xóa'
                        )}
                    </Button>
                </div>
            </div>
    </Modal>
);

// ── AdminUsers ────────────────────────────────────────────────────────────────

const LearnerDetailModal = ({
    detail,
    loading,
    error,
    onClose,
    onAction,
}: {
    detail: AdminLearnerDetail | null;
    loading: boolean;
    error: string | null;
    onClose: () => void;
    onAction: (action: LearningAction) => void;
}) => (
    <Modal title="Chi tiết học tập" onClose={onClose} size="lg">
        {loading ? (
            <div className="flex items-center justify-center gap-3 py-16 text-text-muted">
                <Loader2 size={20} className="animate-spin text-primary" /> Đang tải chi tiết...
            </div>
        ) : error || !detail ? (
            <ErrorNotice><AlertTriangle size={15} /> {error ?? 'Không có dữ liệu học tập.'}</ErrorNotice>
        ) : (
            <div className="space-y-6">
                <div>
                    <p className="font-display text-lg font-bold text-text-primary">{detail.user.username}</p>
                    <p className="text-sm text-text-muted">{detail.user.email}</p>
                    <div className="mt-2 flex gap-2">
                        <RoleBadge role={detail.user.role} />
                        <StatusBadge status={detail.user.status} isDeleted={detail.user.isDeleted} />
                        {detail.user.isHiddenFromLeaderboard && (
                            <span className="inline-flex items-center rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700">
                                Đang ẩn khỏi bảng xếp hạng
                            </span>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                        ['Tổng XP', detail.learning.xp.totalXp.toLocaleString('vi-VN'), <BarChart3 size={16} />],
                        ['Cấp độ', detail.learning.xp.level, <BookOpen size={16} />],
                        ['Chuỗi ngày học', detail.learning.streak, <Flame size={16} />],
                        ['Đã học', detail.learning.masteryProgress.learnedWords, <BookOpen size={16} />],
                        ['Đã thành thạo', detail.learning.masteryProgress.masteredWords, <BookOpen size={16} />],
                        ['Ôn hôm nay', detail.learning.reviewForecast.dueToday, <CalendarClock size={16} />],
                        ['Ôn ngày mai', detail.learning.reviewForecast.dueTomorrow, <CalendarClock size={16} />],
                        ['Ôn tuần này', detail.learning.reviewForecast.dueThisWeek, <CalendarClock size={16} />],
                    ].map(([label, value, icon]) => (
                        <div key={String(label)} className="rounded-xl border border-border bg-surface p-3">
                            <div className="mb-2 text-primary">{icon}</div>
                            <p className="text-xs text-text-muted">{label}</p>
                            <p className="mt-1 font-display text-lg font-bold text-text-primary">{value}</p>
                        </div>
                    ))}
                </div>

                <div>
                    <h3 className="mb-3 font-display font-bold text-text-primary">Hoạt động gần đây</h3>
                    {detail.learning.recentActivity.length === 0 ? (
                        <p className="rounded-xl border border-border bg-surface p-4 text-sm text-text-muted">Chưa có hoạt động học tập.</p>
                    ) : (
                        <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
                            {detail.learning.recentActivity.map((activity, index) => (
                                <div key={`${activity.sessionId ?? 'activity'}-${index}`} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-text-primary">{activity.topicName || 'Hoạt động học tập'}</p>
                                        <p className="text-xs text-text-muted">{activity.activityType} · {activity.wordsStudied} từ</p>
                                    </div>
                                    <time className="shrink-0 text-xs text-text-muted">{new Date(activity.date).toLocaleDateString('vi-VN')}</time>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div>
                    <h3 className="mb-3 font-display font-bold text-text-primary">Công cụ quản trị</h3>
                    <div className="grid gap-2 sm:grid-cols-2">
                        <Button variant="secondary" className="justify-start" disabled={detail.user.role.toUpperCase() !== 'LEARNER' || detail.user.isDeleted} onClick={() => onAction('xp')}>Đặt XP</Button>
                        <Button variant="secondary" className="justify-start" disabled={detail.user.role.toUpperCase() !== 'LEARNER' || detail.user.isDeleted} onClick={() => onAction('reset')}>Reset tiến độ</Button>
                        <Button variant="danger" className="justify-start" disabled={detail.user.role.toUpperCase() !== 'LEARNER' || detail.user.isDeleted} onClick={() => onAction('delete-data')}>Xóa dữ liệu học</Button>
                        <Button variant="secondary" className="justify-start" disabled={detail.user.role.toUpperCase() !== 'LEARNER' || detail.user.isDeleted} onClick={() => onAction('leaderboard')}>
                            <Trophy size={16} />
                            {detail.user.isHiddenFromLeaderboard ? 'Hiện trên bảng xếp hạng' : 'Ẩn trên bảng xếp hạng'}
                        </Button>
                    </div>
                </div>
            </div>
        )}
    </Modal>
);

const LearningActionModal = ({
    action,
    detail,
    topics,
    saving,
    error,
    onClose,
    onSubmit,
}: {
    action: LearningAction;
    detail: AdminLearnerDetail;
    topics: AdminTopic[];
    saving: boolean;
    error: string | null;
    onClose: () => void;
    onSubmit: (values: { targetTotalXp: number; reason: string; scope: 'all' | 'topic'; topicId?: number; confirmationText: string }) => void;
}) => {
    const [targetTotalXp, setTargetTotalXp] = useState(detail.learning.xp.totalXp);
    const [reason, setReason] = useState('');
    const [scope, setScope] = useState<'all' | 'topic'>('all');
    const [topicId, setTopicId] = useState('');
    const [confirmationText, setConfirmationText] = useState('');
    const hidden = detail.user.isHiddenFromLeaderboard;
    const title = action === 'xp'
        ? 'Đặt XP người học'
        : action === 'reset'
            ? 'Reset tiến độ'
            : action === 'delete-data'
                ? 'Xóa dữ liệu học'
                : hidden ? 'Hiện trên bảng xếp hạng' : 'Ẩn trên bảng xếp hạng';
    const destructive = action === 'reset' || action === 'delete-data';
    const canSubmit = reason.trim().length > 0
        && (action !== 'xp' || (targetTotalXp >= 0 && targetTotalXp <= 1_000_000))
        && (action !== 'reset' || scope === 'all' || Boolean(topicId))
        && (action !== 'delete-data'
            || confirmationText.trim().toLowerCase() === detail.user.username.toLowerCase()
            || confirmationText.trim().toLowerCase() === detail.user.email.toLowerCase());

    return (
        <Modal title={title} onClose={onClose}>
            <div className="space-y-4">
                {action === 'xp' && (
                    <div className="space-y-2">
                        <p className="text-sm text-text-muted">
                            XP hiện tại: <strong className="text-text-primary">{detail.learning.xp.totalXp.toLocaleString('vi-VN')}</strong>
                        </p>
                        <Input
                            label="Tổng XP mong muốn"
                            type="number"
                            min={0}
                            max={1_000_000}
                            value={String(targetTotalXp)}
                            onChange={event => setTargetTotalXp(Number(event.target.value))}
                            placeholder="Từ 0 đến 1.000.000"
                        />
                    </div>
                )}
                {action === 'reset' && (
                    <>
                        <Select label="Phạm vi" value={scope} onChange={event => setScope(event.target.value as 'all' | 'topic')}>
                            <option value="all">Toàn bộ tiến độ</option>
                            <option value="topic">Một chủ đề</option>
                        </Select>
                        {scope === 'topic' && (
                            <Select label="Chủ đề" value={topicId} onChange={event => setTopicId(event.target.value)}>
                                <option value="">Chọn chủ đề</option>
                                {topics.map(topic => <option key={topic.topicId} value={topic.topicId}>{topic.name}</option>)}
                            </Select>
                        )}
                    </>
                )}
                {action === 'delete-data' && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                        Thao tác xóa toàn bộ dữ liệu học nhưng giữ tài khoản. Nhập <strong>{detail.user.username}</strong> hoặc email để xác nhận.
                    </div>
                )}
                {action === 'delete-data' && (
                    <Input label="Nội dung xác nhận" value={confirmationText} onChange={event => setConfirmationText(event.target.value)} />
                )}
                <TextArea label="Lý do" value={reason} onChange={event => setReason(event.target.value)} rows={3} required />
                {error && <ErrorNotice><AlertTriangle size={15} /> {error}</ErrorNotice>}
                <div className="flex gap-3">
                    <Button variant="secondary" className="flex-1" onClick={onClose} disabled={saving}>Hủy</Button>
                    <Button
                        variant={destructive ? 'danger' : 'primary'}
                        className="flex-1"
                        disabled={!canSubmit || saving}
                        onClick={() => onSubmit({ targetTotalXp, reason, scope, topicId: topicId ? Number(topicId) : undefined, confirmationText })}
                    >
                        {saving ? <><Loader2 size={16} className="animate-spin" /> Đang xử lý...</> : 'Xác nhận'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

const AdminUsers = () => {
    const { addToast, currentUser } = useAppContext();

    const [users, setUsers] = useState<AdminUser[]>([]);
    const [topics, setTopics] = useState<AdminTopic[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);

    const [modalState, setModalState] = useState<ModalState | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [detail, setDetail] = useState<AdminLearnerDetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailError, setDetailError] = useState<string | null>(null);
    const [learningAction, setLearningAction] = useState<LearningAction | null>(null);
    const [actionSaving, setActionSaving] = useState(false);
    const [actionError, setActionError] = useState<string | null>(null);

    const loadUsers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [userRows, topicRows] = await Promise.all([adminApi.getUsers(), adminApi.getTopics()]);
            setUsers(userRows);
            setTopics(topicRows);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Không thể tải danh sách người dùng.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void loadUsers(); }, [loadUsers]);

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return users.filter(u => {
            if (q && !u.username.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
            if (roleFilter && u.role.toUpperCase() !== roleFilter) return false;
            if (statusFilter === 'DELETED') return u.isDeleted;
            if (statusFilter) return !u.isDeleted && u.status.toUpperCase() === statusFilter;
            return true;
        });
    }, [users, search, roleFilter, statusFilter]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const resetPage = () => setPage(1);

    const openCreate = () => { setFormError(null); setModalState({ mode: 'create' }); };
    const openEdit = (user: AdminUser) => { setFormError(null); setModalState({ mode: 'edit', user }); };
    const closeModal = () => setModalState(null);
    const openDelete = (user: AdminUser) => { setDeleteError(null); setDeleteTarget(user); };
    const closeDelete = () => setDeleteTarget(null);
    const openDetail = async (user: AdminUser) => {
        setDetailOpen(true);
        setDetail(null);
        setDetailError(null);
        setDetailLoading(true);
        try {
            setDetail(await adminApi.getLearnerDetail(user.userId));
        } catch (detailLoadError) {
            setDetailError(detailLoadError instanceof Error ? detailLoadError.message : 'Không thể tải chi tiết học tập.');
        } finally {
            setDetailLoading(false);
        }
    };

    const refreshDetail = async () => {
        if (!detail) return;
        setDetail(await adminApi.getLearnerDetail(detail.user.userId));
        await loadUsers();
    };

    const handleLearningAction = async (values: {
        targetTotalXp: number;
        reason: string;
        scope: 'all' | 'topic';
        topicId?: number;
        confirmationText: string;
    }) => {
        if (!detail || !learningAction) return;
        setActionSaving(true);
        setActionError(null);
        try {
            if (learningAction === 'xp') {
                const message = await adminApi.setXpTarget(detail.user.userId, {
                    targetTotalXp: values.targetTotalXp,
                    reason: values.reason,
                });
                addToast(message, 'success');
            } else if (learningAction === 'reset') {
                await adminApi.resetProgress(detail.user.userId, {
                    scope: values.scope,
                    topicId: values.topicId,
                    reason: values.reason,
                });
                addToast('Đã reset tiến độ học tập.', 'success');
            } else if (learningAction === 'delete-data') {
                await adminApi.deleteLearningData(detail.user.userId, {
                    reason: values.reason,
                    confirmationText: values.confirmationText,
                });
                addToast('Đã xóa dữ liệu học tập.', 'success');
            } else {
                await adminApi.setLeaderboardVisibility(detail.user.userId, {
                    hidden: !detail.user.isHiddenFromLeaderboard,
                    reason: values.reason,
                });
                addToast(detail.user.isHiddenFromLeaderboard ? 'Đã hiện người học trên bảng xếp hạng.' : 'Đã ẩn người học khỏi bảng xếp hạng.', 'success');
            }
            setLearningAction(null);
            await refreshDetail();
        } catch (actionFailure) {
            setActionError(actionFailure instanceof Error ? actionFailure.message : 'Thao tác thất bại. Vui lòng thử lại.');
        } finally {
            setActionSaving(false);
        }
    };

    const handleSubmit = async (form: UserFormData) => {
        setSaving(true);
        setFormError(null);
        try {
            const shouldValidatePassword = modalState?.mode === 'create' || Boolean(form.password);
            if (shouldValidatePassword && !isPasswordPolicyValid(checkPasswordPolicy(form.password))) {
                setFormError('Mật khẩu phải có ít nhất 5 ký tự, gồm một chữ thường và một chữ số.');
                return;
            }

            if (modalState?.mode === 'create') {
                const payload: AdminCreateUserPayload = {
                    username: form.username.trim(),
                    email: form.email.trim(),
                    password: form.password,
                    role: form.role,
                    status: form.status,
                };
                const created = await adminApi.createUser(payload);
                setUsers(prev => [...prev, created]);
                closeModal();
                addToast('Đã thêm người dùng.', 'success');
            } else if (modalState?.mode === 'edit') {
                const payload: AdminUpdateUserPayload = {
                    username: form.username.trim(),
                    email: form.email.trim(),
                    password: form.password || undefined,
                    role: form.role,
                    status: form.status,
                };
                await adminApi.updateUser(modalState.user.userId, payload);
                await loadUsers();
                closeModal();
                addToast('Đã cập nhật người dùng.', 'success');
            }
        } catch (e) {
            setFormError(e instanceof Error ? e.message : 'Thao tác thất bại.');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        setDeleteError(null);
        try {
            await adminApi.deleteUser(deleteTarget.userId);
            setUsers(prev => prev.filter(u => u.userId !== deleteTarget.userId));
            closeDelete();
            addToast('Đã xóa người dùng.', 'success');
        } catch (e) {
            setDeleteError(e instanceof Error ? e.message : 'Xóa người dùng thất bại.');
        } finally {
            setDeleting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-32 gap-3 text-text-muted">
                <Loader2 size={24} className="animate-spin text-primary" />
                <span className="font-display font-bold">Đang tải người dùng...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
                <AlertTriangle size={40} className="text-red-400" />
                <p className="font-bold text-red-500">{error}</p>
                <Button variant="secondary" onClick={loadUsers}>
                    <RefreshCw size={16} /> Thử lại
                </Button>
            </div>
        );
    }

    return (
        <div>
            {/* Toolbar */}
            <FilterBar
                actions={
                    <Button variant="primary" onClick={openCreate}>
                        <Plus size={16} /> Thêm người dùng
                    </Button>
                }
            >
                <div className="relative">
                    <Search
                        size={15}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
                    />
                    <Input
                        aria-label="Tìm người dùng"
                        type="text"
                        placeholder="Tìm tên đăng nhập hoặc email..."
                        className="pl-10 rounded-pill"
                        value={search}
                        onChange={e => { setSearch(e.target.value); resetPage(); }}
                    />
                </div>

                <Select
                    aria-label="Lọc theo vai trò"
                    className="rounded-pill"
                    value={roleFilter}
                    onChange={e => { setRoleFilter(e.target.value); resetPage(); }}
                >
                    <option value="">Tất cả vai trò</option>
                    <option value="ADMIN">Quản trị</option>
                    <option value="LEARNER">Người học</option>
                </Select>

                <Select
                    aria-label="Lọc theo trạng thái"
                    className="rounded-pill"
                    value={statusFilter}
                    onChange={e => { setStatusFilter(e.target.value); resetPage(); }}
                >
                    <option value="">Tất cả trạng thái</option>
                    <option value="ACTIVE">Hoạt động</option>
                    <option value="INACTIVE">Tạm khóa</option>
                    <option value="DELETED">Đã xóa</option>
                </Select>
            </FilterBar>

            {/* Table */}
            <DataTable headers={[]}>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-primary/10">
                                {['ID', 'Tên đăng nhập', 'Email', 'Vai trò', 'Trạng thái', 'Đăng nhập', 'Ngày tạo', ''].map(h => (
                                    <th
                                        key={h}
                                        className={`px-4 py-3.5 text-xs font-display font-bold text-text-muted uppercase tracking-wide ${h === '' ? 'text-right' : 'text-left'}`}
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {paged.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan={8}
                                        className="px-4 py-16 text-center text-text-muted text-sm"
                                    >
                                        {users.length > 0
                                            ? 'Không có người dùng phù hợp bộ lọc.'
                                            : 'Chưa có người dùng.'}
                                    </td>
                                </tr>
                            ) : (
                                paged.map(user => (
                                    <tr
                                        key={user.userId}
                                        className={`border-b border-primary/5 transition-colors ${
                                            user.isDeleted
                                                ? 'opacity-50'
                                                : 'hover:bg-primary/[0.03]'
                                        }`}
                                    >
                                        <td className="px-4 py-3.5 text-xs text-text-muted font-mono">
                                            {user.userId}
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <span
                                                className={`text-sm font-display font-bold text-text-primary ${
                                                    user.isDeleted ? 'line-through' : ''
                                                }`}
                                            >
                                                {user.username}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5 text-sm text-text-muted max-w-[180px] truncate">
                                            {user.email}
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <RoleBadge role={user.role} />
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <StatusBadge
                                                status={user.status}
                                                isDeleted={user.isDeleted}
                                            />
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <div className="flex gap-1">
                                                {user.hasLocalPassword && (
                                                    <span
                                                        aria-label="Có đăng nhập mật khẩu"
                                                        className="text-xs bg-surface border border-border rounded px-1.5 py-0.5 text-text-muted"
                                                    >
                                                        PW
                                                    </span>
                                                )}
                                                {user.hasGoogleLogin && (
                                                    <span
                                                        aria-label="Có đăng nhập Google"
                                                        className="text-xs bg-surface border border-border rounded px-1.5 py-0.5 text-text-muted"
                                                    >
                                                        G
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3.5 text-xs text-text-muted whitespace-nowrap">
                                            {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                                        </td>
                                        <td className="px-4 py-3.5">
                                            {!user.isDeleted && (
                                                <div className="flex gap-1 justify-end">
                                                    <IconButton
                                                        onClick={() => void openDetail(user)}
                                                        aria-label={`Chi tiết học tập của ${user.username}`}
                                                        title="Chi tiết học tập"
                                                        tone="primary"
                                                        icon={<BarChart3 size={14} />}
                                                    />
                                                    <IconButton
                                                        onClick={() => openEdit(user)}
                                                        aria-label={`Chỉnh sửa ${user.username}`}
                                                        title="Chỉnh sửa người dùng"
                                                        tone="primary"
                                                        icon={<Pencil size={14} />}
                                                    />
                                                    <IconButton
                                                        onClick={() => {
                                                            if (user.role.toUpperCase() === 'ADMIN' || currentUser?.userId === user.userId) return;
                                                            openDelete(user);
                                                        }}
                                                        aria-label={`Xóa ${user.username}`}
                                                        disabled={user.role.toUpperCase() === 'ADMIN' || currentUser?.userId === user.userId}
                                                        title={
                                                            currentUser?.userId === user.userId
                                                                ? 'Không thể xóa chính bạn'
                                                                : user.role.toUpperCase() === 'ADMIN'
                                                                    ? 'Không thể xóa tài khoản quản trị'
                                                                    : 'Xóa người dùng'
                                                        }
                                                        tone="danger"
                                                        icon={<Trash2 size={14} />}
                                                    />
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <Pagination
                    page={page}
                    totalPages={totalPages}
                    onPageChange={setPage}
                    summary={`${(page - 1) * PAGE_SIZE + 1}-${Math.min(page * PAGE_SIZE, filtered.length)} trong ${filtered.length} người dùng`}
                />
            </DataTable>

            {/* Modals */}
            {modalState && (
                <UserFormModal
                    modalState={modalState}
                    onClose={closeModal}
                    onSubmit={handleSubmit}
                    saving={saving}
                    error={formError}
                    currentUserId={currentUser?.userId}
                />
            )}
            {deleteTarget && (
                <DeleteUserConfirm
                    user={deleteTarget}
                    onClose={closeDelete}
                    onConfirm={() => { void handleDelete(); }}
                    deleting={deleting}
                    error={deleteError}
                />
            )}
            {detailOpen && (
                <LearnerDetailModal
                    detail={detail}
                    loading={detailLoading}
                    error={detailError}
                    onClose={() => setDetailOpen(false)}
                    onAction={action => { setActionError(null); setLearningAction(action); }}
                />
            )}
            {learningAction && detail && (
                <LearningActionModal
                    action={learningAction}
                    detail={detail}
                    topics={topics}
                    saving={actionSaving}
                    error={actionError}
                    onClose={() => setLearningAction(null)}
                    onSubmit={values => { void handleLearningAction(values); }}
                />
            )}
        </div>
    );
};

export default AdminUsers;
