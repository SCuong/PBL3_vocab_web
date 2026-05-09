import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    AlertTriangle, ChevronLeft, ChevronRight,
    Loader2, Pencil, Plus, RefreshCw, Search, Trash2, X,
} from 'lucide-react';
import { Button } from '../../components/ui';
import { useAppContext } from '../../context/AppContext';
import {
    adminApi,
    type AdminTopic,
    type AdminCreateTopicPayload,
    type AdminUpdateTopicPayload,
} from '../../services/adminApi';

// ── Types ─────────────────────────────────────────────────────────────────────

type ModalState =
    | { mode: 'create' }
    | { mode: 'edit'; topic: AdminTopic };

interface TopicFormData {
    name: string;
    description: string;
    parentTopicId: string;
}

const EMPTY_FORM: TopicFormData = {
    name: '',
    description: '',
    parentTopicId: '',
};

const PAGE_SIZE = 15;

// ── TopicFormModal ────────────────────────────────────────────────────────────

interface TopicFormModalProps {
    modalState: ModalState;
    allTopics: AdminTopic[];
    onClose: () => void;
    onSubmit: (data: TopicFormData) => Promise<void>;
    saving: boolean;
    error: string | null;
}

const TopicFormModal = ({
    modalState,
    allTopics,
    onClose,
    onSubmit,
    saving,
    error,
}: TopicFormModalProps) => {
    const [form, setForm] = useState<TopicFormData>(EMPTY_FORM);
    const isEdit = modalState.mode === 'edit';

    useEffect(() => {
        if (modalState.mode === 'edit') {
            const t = modalState.topic;
            setForm({
                name: t.name,
                description: t.description,
                parentTopicId: t.parentTopicId != null ? String(t.parentTopicId) : '',
            });
        } else {
            setForm(EMPTY_FORM);
        }
    }, [modalState]);

    const setField =
        (key: keyof TopicFormData) =>
        (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
            setForm(prev => ({ ...prev, [key]: e.target.value }));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        void onSubmit(form);
    };

    const currentId = isEdit ? modalState.topic.topicId : null;
    const parentOptions = allTopics.filter(t => t.topicId !== currentId);

    const inputClass =
        'w-full px-4 py-2.5 rounded-xl border border-border bg-surface text-sm text-text-primary focus:outline-none focus:border-primary transition-colors disabled:opacity-60';
    const labelClass = 'block text-xs font-display font-bold text-text-muted mb-1.5';

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="glass-card w-full max-w-md p-8 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-display font-bold text-text-primary">
                        {isEdit ? 'Edit Topic' : 'Create New Topic'}
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
                        <label className={labelClass}>Topic Name</label>
                        <input
                            type="text"
                            className={inputClass}
                            value={form.name}
                            onChange={setField('name')}
                            required
                            maxLength={100}
                            placeholder="e.g. Business English"
                            disabled={saving}
                        />
                    </div>

                    <div>
                        <label className={labelClass}>Description</label>
                        <textarea
                            className={`${inputClass} resize-none`}
                            rows={3}
                            value={form.description}
                            onChange={setField('description')}
                            required
                            maxLength={500}
                            placeholder="Brief description of this topic…"
                            disabled={saving}
                        />
                    </div>

                    <div>
                        <label className={labelClass}>
                            Parent Topic{' '}
                            <span className="text-text-muted font-normal">(optional)</span>
                        </label>
                        <select
                            className={inputClass}
                            value={form.parentTopicId}
                            onChange={setField('parentTopicId')}
                            disabled={saving}
                        >
                            <option value="">— No parent (top-level) —</option>
                            {parentOptions.map(t => (
                                <option key={t.topicId} value={String(t.topicId)}>
                                    {t.name}
                                </option>
                            ))}
                        </select>
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
                                'Update Topic'
                            ) : (
                                'Create Topic'
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ── DeleteTopicConfirm ────────────────────────────────────────────────────────

interface DeleteConfirmProps {
    topic: AdminTopic;
    onClose: () => void;
    onConfirm: () => void;
    deleting: boolean;
    error: string | null;
}

const DeleteTopicConfirm = ({ topic, onClose, onConfirm, deleting, error }: DeleteConfirmProps) => (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="glass-card w-full max-w-sm p-8 shadow-2xl">
            <div className="flex flex-col items-center text-center gap-4">
                <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
                    <AlertTriangle size={28} className="text-red-500" />
                </div>
                <div>
                    <h2 className="text-xl font-display font-bold text-text-primary mb-1">
                        Delete Topic
                    </h2>
                    <p className="text-sm text-text-muted">
                        Delete{' '}
                        <span className="font-bold text-text-primary">{topic.name}</span>?{' '}
                        All child topics must be re-parented or deleted first.
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

// ── AdminTopics ───────────────────────────────────────────────────────────────

const AdminTopics = () => {
    const { addToast } = useAppContext();

    const [topics, setTopics] = useState<AdminTopic[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);

    const [modalState, setModalState] = useState<ModalState | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<AdminTopic | null>(null);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const loadTopics = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setTopics(await adminApi.getTopics());
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load topics');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void loadTopics(); }, [loadTopics]);

    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        if (!q) return topics;
        return topics.filter(
            t =>
                t.name.toLowerCase().includes(q) ||
                t.description.toLowerCase().includes(q) ||
                (t.parentTopicName ?? '').toLowerCase().includes(q)
        );
    }, [topics, search]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const openCreate = () => { setFormError(null); setModalState({ mode: 'create' }); };
    const openEdit = (topic: AdminTopic) => { setFormError(null); setModalState({ mode: 'edit', topic }); };
    const closeModal = () => setModalState(null);
    const openDelete = (topic: AdminTopic) => { setDeleteError(null); setDeleteTarget(topic); };
    const closeDelete = () => setDeleteTarget(null);

    const handleSubmit = async (form: TopicFormData) => {
        setSaving(true);
        setFormError(null);
        try {
            const parentId = form.parentTopicId ? Number(form.parentTopicId) : undefined;
            if (modalState?.mode === 'create') {
                const payload: AdminCreateTopicPayload = {
                    name: form.name.trim(),
                    description: form.description.trim(),
                    parentTopicId: parentId,
                };
                const created = await adminApi.createTopic(payload);
                setTopics(prev => [...prev, created]);
                closeModal();
                addToast('Topic created successfully.', 'success');
            } else if (modalState?.mode === 'edit') {
                const payload: AdminUpdateTopicPayload = {
                    name: form.name.trim(),
                    description: form.description.trim(),
                    parentTopicId: parentId,
                };
                await adminApi.updateTopic(modalState.topic.topicId, payload);
                await loadTopics();
                closeModal();
                addToast('Topic updated successfully.', 'success');
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
            await adminApi.deleteTopic(deleteTarget.topicId);
            setTopics(prev => prev.filter(t => t.topicId !== deleteTarget.topicId));
            closeDelete();
            addToast('Topic deleted.', 'success');
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
                <span className="font-display font-bold">Loading topics…</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-32 gap-4">
                <AlertTriangle size={40} className="text-red-400" />
                <p className="font-bold text-red-500">{error}</p>
                <Button variant="secondary" onClick={loadTopics}>
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
                        placeholder="Search name, description or parent…"
                        className="w-full pl-10 pr-4 py-2.5 rounded-pill border border-border bg-surface text-sm focus:outline-none focus:border-primary transition-colors"
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                    />
                </div>
                <Button variant="primary" onClick={openCreate}>
                    <Plus size={16} /> Add Topic
                </Button>
            </div>

            {/* Table */}
            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-primary/10">
                                {['ID', 'Name', 'Description', 'Parent', ''].map(h => (
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
                                        colSpan={5}
                                        className="px-4 py-16 text-center text-text-muted text-sm"
                                    >
                                        {topics.length > 0
                                            ? 'No topics match your search.'
                                            : 'No topics found.'}
                                    </td>
                                </tr>
                            ) : (
                                paged.map(topic => (
                                    <tr
                                        key={topic.topicId}
                                        className="border-b border-primary/5 hover:bg-primary/[0.03] transition-colors"
                                    >
                                        <td className="px-4 py-3.5 text-xs text-text-muted font-mono">
                                            {topic.topicId}
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <span className="text-sm font-display font-bold text-text-primary">
                                                {topic.name}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5 text-sm text-text-muted max-w-[280px]">
                                            <span className="line-clamp-2">{topic.description}</span>
                                        </td>
                                        <td className="px-4 py-3.5">
                                            {topic.parentTopicName ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                                                    {topic.parentTopicName}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-text-muted italic">
                                                    top-level
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <div className="flex gap-1 justify-end">
                                                <button
                                                    onClick={() => openEdit(topic)}
                                                    title="Edit topic"
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-primary hover:bg-primary/10 transition-colors"
                                                >
                                                    <Pencil size={14} />
                                                </button>
                                                <button
                                                    onClick={() => openDelete(topic)}
                                                    title="Delete topic"
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted hover:text-red-500 hover:bg-red-50 transition-colors"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
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
                            topics
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
                <TopicFormModal
                    modalState={modalState}
                    allTopics={topics}
                    onClose={closeModal}
                    onSubmit={handleSubmit}
                    saving={saving}
                    error={formError}
                />
            )}
            {deleteTarget && (
                <DeleteTopicConfirm
                    topic={deleteTarget}
                    onClose={closeDelete}
                    onConfirm={() => { void handleDelete(); }}
                    deleting={deleting}
                    error={deleteError}
                />
            )}
        </div>
    );
};

export default AdminTopics;
