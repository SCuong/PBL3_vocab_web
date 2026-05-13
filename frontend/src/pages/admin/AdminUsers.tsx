import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import {
    AlertTriangle,
    Eye, EyeOff, Loader2, Pencil, Plus,
    RefreshCw, Search, Trash2,
} from 'lucide-react';
import { Button } from '../../components/ui';
import { DataTable, ErrorNotice, FilterBar, IconButton, Input, Modal, Pagination, Select, adminInputClass, adminLabelClass } from '../../components/admin/ui';
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
    const passwordId = useId();
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
    const inputClass = adminInputClass;
    const labelClass = adminLabelClass;

    return (
        <Modal title={isEdit ? 'Edit User' : 'Create New User'} onClose={onClose}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Input
                            label="Username"
                            type="text"
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
                            Password{' '}
                            {isEdit && (
                                <span className="text-text-muted font-normal">
                                    (leave blank to keep current)
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
                                placeholder={isEdit ? '••••••••' : `Min ${PASSWORD_MIN_LENGTH} characters`}
                                disabled={saving}
                            />
                            <button
                                type="button"
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
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
                                label="Role"
                                value={form.role}
                                onChange={setField('role')}
                                disabled={saving}
                            >
                                <option value="LEARNER">LEARNER</option>
                                <option value="ADMIN">ADMIN</option>
                            </Select>
                        </div>
                        <div>
                            <Select
                                label="Status"
                                value={form.status}
                                onChange={setField('status')}
                                disabled={saving}
                            >
                                <option value="ACTIVE">ACTIVE</option>
                                <option value="INACTIVE">INACTIVE</option>
                            </Select>
                        </div>
                    </div>

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
    <Modal title="Delete User" onClose={onClose} size="sm">
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
    </Modal>
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
            <FilterBar
                actions={
                    <Button variant="primary" onClick={openCreate}>
                        <Plus size={16} /> Add User
                    </Button>
                }
            >
                <div className="relative">
                    <Search
                        size={15}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none"
                    />
                    <Input
                        aria-label="Search users"
                        type="text"
                        placeholder="Search username or email…"
                        className="pl-10 rounded-pill"
                        value={search}
                        onChange={e => { setSearch(e.target.value); resetPage(); }}
                    />
                </div>

                    <Select
                        aria-label="Filter users by role"
                        className="rounded-pill"
                        value={roleFilter}
                        onChange={e => { setRoleFilter(e.target.value); resetPage(); }}
                    >
                        <option value="">All Roles</option>
                        <option value="ADMIN">ADMIN</option>
                        <option value="LEARNER">LEARNER</option>
                    </Select>

                    <Select
                        aria-label="Filter users by status"
                        className="rounded-pill"
                        value={statusFilter}
                        onChange={e => { setStatusFilter(e.target.value); resetPage(); }}
                    >
                        <option value="">All Status</option>
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="INACTIVE">INACTIVE</option>
                        <option value="DELETED">DELETED</option>
                    </Select>
            </FilterBar>

            {/* Table */}
            <DataTable headers={[]}>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-primary/10">
                                {['ID', 'Username', 'Email', 'Role', 'Status', 'Login', 'Created', ''].map(h => (
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
                                                        aria-label="Password login enabled"
                                                        className="text-xs bg-surface border border-border rounded px-1.5 py-0.5 text-text-muted"
                                                    >
                                                        PW
                                                    </span>
                                                )}
                                                {user.hasGoogleLogin && (
                                                    <span
                                                        aria-label="Google login enabled"
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
                                                    <IconButton
                                                        onClick={() => openEdit(user)}
                                                        aria-label={`Edit ${user.username}`}
                                                        title="Edit user"
                                                        tone="primary"
                                                        icon={<Pencil size={14} />}
                                                    />
                                                    <IconButton
                                                        onClick={() => openDelete(user)}
                                                        aria-label={`Delete ${user.username}`}
                                                        title="Delete user"
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
                    summary={`${(page - 1) * PAGE_SIZE + 1}-${Math.min(page * PAGE_SIZE, filtered.length)} of ${filtered.length} users`}
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
