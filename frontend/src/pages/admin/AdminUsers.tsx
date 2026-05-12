import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    AlertTriangle, ChevronLeft, ChevronRight,
    Eye, EyeOff, Loader2, Pencil, Plus,
    RefreshCw, Search, Trash2, X,
} from 'lucide-react';
import { Button } from '../../components/ui';
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
    type AdminUser,
    type AdminCreateUserPayload,
    type AdminUpdateUserPayload,
} from '../../services/adminApi';

// ── Types ─────────────────────────────────────────────────────────────────────

type ModalState =
    | { mode: 'create' }
    | { mode: 'edit'; user: AdminUser };

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
            {role}
        </span>
    );
};

const StatusBadge = ({ status, isDeleted }: { status: string; isDeleted: boolean }) => {
    if (isDeleted) {
        return (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-50 text-red-500 border border-red-200">
                DELETED
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
            {status}
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
}

const UserFormModal = ({ modalState, onClose, onSubmit, saving, error }: UserFormModalProps) => {
    const [form, setForm] = useState<UserFormData>(EMPTY_FORM);
    const [showPassword, setShowPassword] = useState(false);
    const isEdit = modalState.mode === 'edit';
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

    const inputClass =
        'w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-sm text-text-primary focus:outline-none focus:border-primary transition-colors disabled:opacity-60';
    const labelClass = 'block text-xs font-display font-bold text-text-muted mb-1.5';

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="glass-card w-full max-w-md p-8 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-display font-bold text-text-primary">
                        {isEdit ? 'Edit User' : 'Create New User'}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={saving}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-primary/10 text-text-muted hover:text-primary transition-colors disabled:opacity-40"
                    >
                        <X size={16} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className={labelClass}>Username</label>
                        <input
                            type="text"
                            className={inputClass}
                            value={form.username}
                            onChange={setField('username')}
                            required
                            minLength={3}
                            maxLength={50}
                            placeholder="e.g. john_doe"
                            disabled={saving}
                        />
                    </div>

                    <div>
                        <label className={labelClass}>Email</label>
                        <input
                            type="email"
                            className={inputClass}
                            value={form.email}
                            onChange={setField('email')}
                            required
                            maxLength={255}
                            placeholder="john@example.com"
                            disabled={saving}
                        />
                    </div>

                    <div>
                        <label className={labelClass}>
                            Password{' '}
                            {isEdit && (
                                <span className="text-text-muted font-normal">
                                    (leave blank to keep current)
                                </span>
                            )}
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                className={`${inputClass} pr-10`}
                                value={form.password}
                                onChange={setField('password')}
                                required={!isEdit}
                                minLength={PASSWORD_MIN_LENGTH}
                                maxLength={PASSWORD_MAX_LENGTH}
                                placeholder={isEdit ? '••••••••' : `Min ${PASSWORD_MIN_LENGTH} characters`}
                                disabled={saving}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(v => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-primary transition-colors"
                                tabIndex={-1}
                            >
                                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                        {(!isEdit || form.password) && (
                            <div className="mt-2 rounded-xl border border-primary/15 bg-white/70 px-4 py-3 text-xs text-text-secondary space-y-1 text-left">
                                <p className="font-semibold text-text-primary mb-1">Yêu cầu mật khẩu:</p>
                                {PASSWORD_POLICY_LABELS.map(([key, label]) => {
                                    const ok = passwordPolicy[key];
                                    return (
                                        <p key={key} className={`flex items-center gap-2 ${ok ? 'text-green-700' : ''}`}>
                                            <span className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${ok ? 'bg-green-200 text-green-700' : 'bg-gray-200'}`}>
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
                            <label className={labelClass}>Role</label>
                            <select
                                className={inputClass}
                                value={form.role}
                                onChange={setField('role')}
                                disabled={saving}
                            >
                                <option value="LEARNER">LEARNER</option>
                                <option value="ADMIN">ADMIN</option>
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Status</label>
                            <select
                                className={inputClass}
                                value={form.status}
                                onChange={setField('status')}
                                disabled={saving}
                            >
                                <option value="ACTIVE">ACTIVE</option>
                                <option value="INACTIVE">INACTIVE</option>
                            </select>
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
                            <AlertTriangle size={14} className="shrink-0" />
                            {error}
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <Button
                            type="button"
                            variant="secondary"
                            className="flex-1"
                            onClick={onClose}
                            disabled={saving}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="primary"
                            className="flex-1"
                            disabled={saving}
                        >
                            {saving ? (
                                <>
                                    <Loader2 size={16} className="animate-spin" /> Saving…
                                </>
                            ) : isEdit ? (
                                'Update User'
                            ) : (
                                'Create User'
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="glass-card w-full max-w-sm p-8 shadow-2xl">
            <div className="flex flex-col items-center text-center gap-4">
                <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
                    <AlertTriangle size={28} className="text-red-500" />
                </div>
                <div>
                    <h2 className="text-xl font-display font-bold text-text-primary mb-1">
                        Delete User
                    </h2>
                    <p className="text-sm text-text-muted">
                        Delete{' '}
                        <span className="font-bold text-text-primary">{user.username}</span>?{' '}
                        This action cannot be undone.
                    </p>
                </div>

                {error && (
                    <div className="w-full flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
                        <AlertTriangle size={14} className="shrink-0" />
                        {error}
                    </div>
                )}

                <div className="flex gap-3 w-full">
                    <Button
                        variant="secondary"
                        className="flex-1"
                        onClick={onClose}
                        disabled={deleting}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="danger"
                        className="flex-1"
                        onClick={onConfirm}
                        disabled={deleting}
                    >
                        {deleting ? (
                            <>
                                <Loader2 size={16} className="animate-spin" /> Deleting…
                            </>
                        ) : (
                            'Delete'
                        )}
                    </Button>
                </div>
            </div>
        </div>
    </div>
);

// ── AdminUsers ────────────────────────────────────────────────────────────────

const AdminUsers = () => {
    const { addToast } = useAppContext();

    const [users, setUsers] = useState<AdminUser[]>([]);
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

    const loadUsers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setUsers(await adminApi.getUsers());
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load users');
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

    const handleSubmit = async (form: UserFormData) => {
        setSaving(true);
        setFormError(null);
        try {
            const shouldValidatePassword = modalState?.mode === 'create' || Boolean(form.password);
            if (shouldValidatePassword && !isPasswordPolicyValid(checkPasswordPolicy(form.password))) {
                setFormError('Password must be at least 5 characters and include one lowercase letter and one digit.');
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
                addToast('User created successfully.', 'success');
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
                addToast('User updated successfully.', 'success');
            }
        } catch (e) {
            setFormError(e instanceof Error ? e.message : 'Operation failed');
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
            addToast('User deleted.', 'success');
        } catch (e) {
            setDeleteError(e instanceof Error ? e.message : 'Delete failed');
        } finally {
            setDeleting(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-32 gap-3 text-text-muted">
                <Loader2 size={24} className="animate-spin text-primary" />
                <span className="font-display font-bold">Loading users…</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
                <AlertTriangle size={40} className="text-red-400" />
                <p className="font-bold text-red-500">{error}</p>
                <Button variant="secondary" onClick={loadUsers}>
                    <RefreshCw size={16} /> Retry
                </Button>
            </div>
        );
    }

    return (
        <div>
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <div className="relative flex-1">
                    <Search
                        size={15}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
                    />
                    <input
                        type="text"
                        placeholder="Search username or email…"
                        className="w-full pl-10 pr-4 py-2.5 rounded-pill border border-border bg-surface text-sm focus:outline-none focus:border-primary transition-colors"
                        value={search}
                        onChange={e => { setSearch(e.target.value); resetPage(); }}
                    />
                </div>

                <div className="flex gap-2 flex-wrap">
                    <select
                        className="px-3 py-2.5 rounded-pill border border-border bg-surface text-sm text-text-muted focus:outline-none focus:border-primary transition-colors cursor-pointer"
                        value={roleFilter}
                        onChange={e => { setRoleFilter(e.target.value); resetPage(); }}
                    >
                        <option value="">All Roles</option>
                        <option value="ADMIN">ADMIN</option>
                        <option value="LEARNER">LEARNER</option>
                    </select>

                    <select
                        className="px-3 py-2.5 rounded-pill border border-border bg-surface text-sm text-text-muted focus:outline-none focus:border-primary transition-colors cursor-pointer"
                        value={statusFilter}
                        onChange={e => { setStatusFilter(e.target.value); resetPage(); }}
                    >
                        <option value="">All Status</option>
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="INACTIVE">INACTIVE</option>
                        <option value="DELETED">DELETED</option>
                    </select>

                    <Button variant="primary" onClick={openCreate}>
                        <Plus size={16} /> Add User
                    </Button>
                </div>
            </div>

            {/* Table */}
            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-primary/10">
                                {['ID', 'Username', 'Email', 'Role', 'Status', 'Login', 'Created', ''].map(h => (
                                    <th
                                        key={h}
                                        className={`px-4 py-3.5 text-xs font-display font-bold text-text-muted uppercase tracking-wider ${h === '' ? 'text-right' : 'text-left'}`}
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
                                            ? 'No users match your filters.'
                                            : 'No users found.'}
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
                                                        title="Password login"
                                                        className="text-xs bg-surface border border-border rounded px-1.5 py-0.5 text-text-muted"
                                                    >
                                                        PW
                                                    </span>
                                                )}
                                                {user.hasGoogleLogin && (
                                                    <span
                                                        title="Google login"
                                                        className="text-xs bg-surface border border-border rounded px-1.5 py-0.5 text-text-muted"
                                                    >
                                                        G
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3.5 text-xs text-text-muted whitespace-nowrap">
                                            {new Date(user.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3.5">
                                            {!user.isDeleted && (
                                                <div className="flex gap-1 justify-end">
                                                    <button
                                                        onClick={() => openEdit(user)}
                                                        title="Edit user"
                                                        className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-primary hover:bg-primary/10 transition-colors"
                                                    >
                                                        <Pencil size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => openDelete(user)}
                                                        title="Delete user"
                                                        className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-red-500 hover:bg-red-50 transition-colors"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t border-primary/10">
                        <span className="text-xs text-text-muted">
                            {(page - 1) * PAGE_SIZE + 1}–
                            {Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}{' '}
                            users
                        </span>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-primary hover:bg-primary/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <span className="px-3 text-sm font-display font-bold text-text-primary">
                                {page} / {totalPages}
                            </span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-primary hover:bg-primary/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            {modalState && (
                <UserFormModal
                    modalState={modalState}
                    onClose={closeModal}
                    onSubmit={handleSubmit}
                    saving={saving}
                    error={formError}
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
        </div>
    );
};

export default AdminUsers;
