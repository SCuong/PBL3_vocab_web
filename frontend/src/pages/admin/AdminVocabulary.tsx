import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    AlertTriangle, ChevronDown, ChevronRight,
    Loader2, Pencil, Plus, RefreshCw, Search, Trash2, Volume2,
} from 'lucide-react';
import { Button } from '../../components/ui';
import { DataTable, ErrorNotice, FilterBar, IconButton, Input, Modal, Pagination, Select, TextArea, adminFocusRingClass, adminInputClass, adminLabelClass } from '../../components/admin/ui';
import { useAppContext } from '../../context/AppContext';
import {
    adminApi,
    type AdminExampleItem,
    type AdminTopic,
    type AdminVocabularyItem,
    type AdminCreateVocabularyPayload,
    type AdminUpdateVocabularyPayload,
} from '../../services/adminApi';

// ── Constants ──────────────────────────────────────────────────────────────────

const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
const PAGE_SIZE = 20;

// ── Types ──────────────────────────────────────────────────────────────────────

interface VocabFormData {
    word: string;
    ipa: string;
    audioUrl: string;
    level: string;
    meaningVi: string;
    topicId: string;
}

interface ExampleFormData {
    exampleEn: string;
    exampleVi: string;
    audioUrl: string;
}

const EMPTY_VOCAB_FORM: VocabFormData = {
    word: '',
    ipa: '',
    audioUrl: '',
    level: 'B1',
    meaningVi: '',
    topicId: '',
};

const EMPTY_EXAMPLE_FORM: ExampleFormData = {
    exampleEn: '',
    exampleVi: '',
    audioUrl: '',
};

type VocabModal =
    | { type: 'create' }
    | { type: 'edit'; vocab: AdminVocabularyItem };

type DeleteTarget =
    | { type: 'vocab'; id: number; word: string }
    | { type: 'example'; id: number; vocabId: number; text: string };

type ExampleModal =
    | { type: 'create'; vocabId: number }
    | { type: 'edit'; example: AdminExampleItem };

// ── CEFR Badge ─────────────────────────────────────────────────────────────────

const CEFR_COLORS: Record<string, string> = {
    A1: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    A2: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    B1: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    B2: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
    C1: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    C2: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

const CefrBadge = ({ level }: { level?: string }) => {
    if (!level) return <span className="text-text-muted text-xs">—</span>;
    return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-display font-bold ${CEFR_COLORS[level] ?? 'bg-bg-secondary text-text-muted'}`}>
            {level}
        </span>
    );
};

// ── Shared styles ──────────────────────────────────────────────────────────────

const inputCls = adminInputClass;
const labelCls = `${adminLabelClass} mb-1.5`;

// ── VocabFormModal ─────────────────────────────────────────────────────────────

interface VocabFormModalProps {
    modal: VocabModal;
    topics: AdminTopic[];
    onClose: () => void;
    onSave: (data: VocabFormData) => Promise<void>;
}

const VocabFormModal = ({ modal, topics, onClose, onSave }: VocabFormModalProps) => {
    const isEdit = modal.type === 'edit';
    const [form, setForm] = useState<VocabFormData>(() =>
        isEdit
            ? {
                word: modal.vocab.word,
                ipa: modal.vocab.ipa ?? '',
                audioUrl: modal.vocab.audioUrl ?? '',
                level: modal.vocab.level ?? 'B1',
                meaningVi: modal.vocab.meaningVi ?? '',
                topicId: modal.vocab.topicId ? String(modal.vocab.topicId) : '',
            }
            : EMPTY_VOCAB_FORM
    );
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const set = (key: keyof VocabFormData) =>
        (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
            setForm(f => ({ ...f, [key]: e.target.value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.word.trim()) { setError('Từ vựng là bắt buộc.'); return; }
        if (!form.level) { setError('Cấp độ CEFR là bắt buộc.'); return; }
        setSaving(true);
        setError(null);
        try {
            await onSave(form);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Lưu thất bại.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal title={isEdit ? 'Chỉnh sửa từ vựng' : 'Thêm từ vựng'} onClose={onClose} size="lg">
                <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <Input label="Từ vựng" value={form.word} onChange={set('word')} placeholder="Ví dụ: eloquent" required autoFocus />
                        </div>
                        <div>
                            <Input label="IPA" className="font-ipa" value={form.ipa} onChange={set('ipa')} placeholder="/el.o.kwent/" />
                        </div>
                        <div>
                            <Select label="Cấp độ CEFR" value={form.level} onChange={set('level')} required>
                                {CEFR_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                            </Select>
                        </div>
                        <div className="col-span-2">
                            <Input label="Nghĩa tiếng Việt" value={form.meaningVi} onChange={set('meaningVi')} placeholder="Ví dụ: hùng hồn, lưu loát" />
                        </div>
                        <div className="col-span-2">
                            <Select label="Chủ đề" value={form.topicId} onChange={set('topicId')}>
                                <option value="">— Không có chủ đề —</option>
                                {topics.map(t => (
                                    <option key={t.topicId} value={String(t.topicId)}>
                                        {t.parentTopicName ? `${t.parentTopicName} › ` : ''}{t.name}
                                    </option>
                                ))}
                            </Select>
                        </div>
                        <div className="col-span-2">
                            <Input label="URL âm thanh" value={form.audioUrl} onChange={set('audioUrl')} placeholder="https://..." />
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                            <AlertTriangle size={14} className="text-red-500 shrink-0" />
                            <p className="text-sm text-red-500">{error}</p>
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>Hủy</Button>
                        <Button type="submit" variant="primary" disabled={saving}>
                            {saving && <Loader2 size={14} className="animate-spin" />}
                            {isEdit ? 'Lưu thay đổi' : 'Thêm từ vựng'}
                        </Button>
                    </div>
                </form>
        </Modal>
    );
};

// ── ExampleFormModal ───────────────────────────────────────────────────────────

interface ExampleFormModalProps {
    modal: ExampleModal;
    onClose: () => void;
    onSave: (data: ExampleFormData) => Promise<void>;
}

const ExampleFormModal = ({ modal, onClose, onSave }: ExampleFormModalProps) => {
    const isEdit = modal.type === 'edit';
    const [form, setForm] = useState<ExampleFormData>(() =>
        isEdit
            ? { exampleEn: modal.example.exampleEn, exampleVi: modal.example.exampleVi, audioUrl: modal.example.audioUrl ?? '' }
            : EMPTY_EXAMPLE_FORM
    );
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const set = (key: keyof ExampleFormData) =>
        (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
            setForm(f => ({ ...f, [key]: e.target.value }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.exampleEn.trim()) { setError('Ví dụ tiếng Anh là bắt buộc.'); return; }
        if (!form.exampleVi.trim()) { setError('Bản dịch tiếng Việt là bắt buộc.'); return; }
        setSaving(true);
        setError(null);
        try {
            await onSave(form);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Lưu thất bại.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal title={isEdit ? 'Chỉnh sửa ví dụ' : 'Thêm ví dụ'} onClose={onClose}>
                <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
                    <div>
                        <TextArea
                            label="Câu tiếng Anh"
                            rows={3}
                            value={form.exampleEn}
                            onChange={set('exampleEn')}
                            placeholder="She was eloquent in her speech..."
                            required
                            autoFocus
                        />
                    </div>
                    <div>
                        <label htmlFor="example-vi" className={labelCls}>Bản dịch tiếng Việt *</label>
                        <textarea
                            id="example-vi"
                            className={`${inputCls} resize-none`}
                            rows={3}
                            value={form.exampleVi}
                            onChange={set('exampleVi')}
                            required
                            placeholder="Cô ấy rất hùng hồn trong bài phát biểu..."
                        />
                    </div>
                    <div>
                        <Input label="URL âm thanh" value={form.audioUrl} onChange={set('audioUrl')} placeholder="https://..." />
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                            <AlertTriangle size={14} className="text-red-500 shrink-0" />
                            <p className="text-sm text-red-500">{error}</p>
                        </div>
                    )}

                    <div className="flex gap-3 pt-2">
                        <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>Hủy</Button>
                        <Button type="submit" variant="primary" disabled={saving}>
                            {saving && <Loader2 size={14} className="animate-spin" />}
                            {isEdit ? 'Lưu thay đổi' : 'Thêm ví dụ'}
                        </Button>
                    </div>
                </form>
        </Modal>
    );
};

// ── DeleteConfirmModal ─────────────────────────────────────────────────────────

interface DeleteConfirmProps {
    target: DeleteTarget;
    onClose: () => void;
    onConfirm: () => Promise<void>;
}

const DeleteConfirmModal = ({ target, onClose, onConfirm }: DeleteConfirmProps) => {
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleConfirm = async () => {
        setDeleting(true);
        setError(null);
        try {
            await onConfirm();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Xóa thất bại.');
            setDeleting(false);
        }
    };

    const label =
        target.type === 'vocab'
            ? `"${target.word}"`
            : `"${target.text.length > 60 ? target.text.slice(0, 57) + '…' : target.text}"`;

    const warning =
        target.type === 'vocab'
            ? 'Xóa vĩnh viễn từ, ví dụ, bài tập và toàn bộ tiến độ liên quan.'
            : 'Xóa vĩnh viễn câu ví dụ này.';

    return (
        <Modal title="Xác nhận xóa" onClose={onClose} size="sm">
                <div className="flex items-start gap-4 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0">
                        <Trash2 size={18} className="text-red-500" />
                    </div>
                    <div>
                        <h2 className="font-display font-bold text-text-primary mb-1">Xác nhận xóa</h2>
                        <p className="text-sm text-text-muted break-words">Xóa {label}?</p>
                        <p className="text-xs text-red-500 mt-2">{warning}</p>
                    </div>
                </div>

                {error && (
                    <div className="flex items-center gap-2 p-3 mb-4 rounded-xl bg-red-500/10 border border-red-500/20">
                        <AlertTriangle size={14} className="text-red-500 shrink-0" />
                        <p className="text-sm text-red-500">{error}</p>
                    </div>
                )}

                <div className="flex gap-3 justify-end">
                    <Button variant="ghost" onClick={onClose} disabled={deleting}>Hủy</Button>
                    <button
                        type="button"
                        onClick={() => void handleConfirm()}
                        disabled={deleting}
                        className={`px-4 py-2 rounded-pill bg-danger-color hover:bg-danger-color/90 text-text-on-accent text-sm font-display font-bold transition-colors disabled:opacity-50 flex items-center gap-2 ${adminFocusRingClass}`}
                    >
                        {deleting && <Loader2 size={14} className="animate-spin" />}
                        Xóa
                    </button>
                </div>
        </Modal>
    );
};

// ── ExamplesPanel ──────────────────────────────────────────────────────────────

interface ExamplesPanelProps {
    vocab: AdminVocabularyItem;
    panelId: string;
    onAdd: (vocabId: number) => void;
    onEdit: (example: AdminExampleItem) => void;
    onDelete: (example: AdminExampleItem) => void;
}

const ExamplesPanel = ({ vocab, panelId, onAdd, onEdit, onDelete }: ExamplesPanelProps) => (
    <tr id={panelId}>
        <td colSpan={7} className="px-4 pb-3 pt-0">
            <div className="p-4 rounded-2xl bg-primary/[0.04] border border-primary/10">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-display font-bold text-text-muted uppercase tracking-wide">
                        Ví dụ — <span className="text-primary">{vocab.word}</span>
                    </span>
                    <button
                        type="button"
                        onClick={() => onAdd(vocab.vocabId)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-display font-bold text-primary hover:bg-primary/10 transition-colors ${adminFocusRingClass}`}
                    >
                        <Plus size={12} /> Thêm ví dụ
                    </button>
                </div>

                {vocab.examples.length === 0 ? (
                    <p className="text-sm text-text-muted italic">Chưa có ví dụ. Thêm ví dụ để bật bài tập điền từ.</p>
                ) : (
                    <div className="space-y-2">
                        {vocab.examples.map(ex => (
                            <div
                                key={ex.exampleId}
                                className="flex items-start gap-3 p-3 rounded-xl bg-surface border border-border group"
                            >
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm text-text-primary">{ex.exampleEn}</p>
                                    <p className="text-xs text-text-muted mt-0.5">{ex.exampleVi}</p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
                                    {ex.audioUrl && (
                                        <a
                                            href={ex.audioUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            aria-label={`Phát âm thanh ví dụ: ${ex.exampleEn}`}
                                            className={`p-1.5 rounded-lg text-text-muted hover:text-primary hover:bg-primary/10 transition-colors ${adminFocusRingClass}`}
                                        >
                                            <Volume2 size={13} />
                                        </a>
                                    )}
                                    <IconButton
                                        onClick={() => onEdit(ex)}
                                        aria-label="Chỉnh sửa ví dụ"
                                        title="Chỉnh sửa ví dụ"
                                        tone="primary"
                                        icon={<Pencil size={13} />}
                                    />
                                    <IconButton
                                        onClick={() => onDelete(ex)}
                                        aria-label="Xóa ví dụ"
                                        title="Xóa ví dụ"
                                        tone="danger"
                                        icon={<Trash2 size={13} />}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </td>
    </tr>
);

// ── AdminVocabulary ────────────────────────────────────────────────────────────

const AdminVocabulary = () => {
    const { addToast } = useAppContext();

    const [items, setItems] = useState<AdminVocabularyItem[]>([]);
    const [pagination, setPagination] = useState({
        page: 1, totalCount: 0, totalPages: 1,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [search, setSearch] = useState('');
    const [cefrFilter, setCefrFilter] = useState('');
    const [topicFilter, setTopicFilter] = useState('');
    const [topics, setTopics] = useState<AdminTopic[]>([]);

    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [vocabModal, setVocabModal] = useState<VocabModal | null>(null);
    const [exampleModal, setExampleModal] = useState<ExampleModal | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

    const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    // Track current search/filter values for page-change calls
    const searchRef = useRef(search);
    const cefrRef = useRef(cefrFilter);
    const topicRef = useRef(topicFilter);

    useEffect(() => { searchRef.current = search; }, [search]);
    useEffect(() => { cefrRef.current = cefrFilter; }, [cefrFilter]);
    useEffect(() => { topicRef.current = topicFilter; }, [topicFilter]);

    const load = useCallback(async (page: number, searchVal: string, cefr: string, topic: string) => {
        setLoading(true);
        setError(null);
        try {
            const data = await adminApi.getVocabulary({
                page,
                pageSize: PAGE_SIZE,
                search: searchVal || undefined,
                cefr: cefr || undefined,
                topicId: topic ? Number(topic) : undefined,
            });
            setItems(data.items);
            setPagination({ page: data.page, totalCount: data.totalCount, totalPages: data.totalPages });
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Không thể tải danh sách từ vựng.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void adminApi.getTopics().then(setTopics).catch(() => { /* non-critical */ });
    }, []);

    useEffect(() => {
        void load(1, search, cefrFilter, topicFilter);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [load, cefrFilter, topicFilter]);

    const handleSearchChange = (val: string) => {
        setSearch(val);
        if (searchTimer.current) clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => {
            void load(1, val, cefrRef.current, topicRef.current);
        }, 400);
    };

    const handlePageChange = (newPage: number) => {
        void load(newPage, searchRef.current, cefrRef.current, topicRef.current);
    };

    // ── Vocab CRUD ────────────────────────────────────────────────────────────

    const handleVocabSave = async (form: VocabFormData) => {
        const payload: AdminCreateVocabularyPayload | AdminUpdateVocabularyPayload = {
            word: form.word.trim(),
            ipa: form.ipa.trim() || undefined,
            audioUrl: form.audioUrl.trim() || undefined,
            level: form.level,
            meaningVi: form.meaningVi.trim() || undefined,
            topicId: form.topicId ? Number(form.topicId) : undefined,
        };

        if (vocabModal?.type === 'create') {
            await adminApi.createVocabulary(payload as AdminCreateVocabularyPayload);
            setVocabModal(null);
            addToast(`Đã thêm "${payload.word}".`, 'success');
            void load(1, searchRef.current, cefrRef.current, topicRef.current);
        } else if (vocabModal?.type === 'edit') {
            const id = vocabModal.vocab.vocabId;
            await adminApi.updateVocabulary(id, payload as AdminUpdateVocabularyPayload);
            const topicName = payload.topicId
                ? topics.find(t => t.topicId === payload.topicId)?.name
                : undefined;
            setItems(prev => prev.map(v =>
                v.vocabId === id
                    ? { ...v, ...payload, topicName }
                    : v
            ));
            setVocabModal(null);
            addToast(`Đã cập nhật "${payload.word}".`, 'success');
        }
    };

    const handleVocabDelete = async () => {
        if (deleteTarget?.type !== 'vocab') return;
        await adminApi.deleteVocabulary(deleteTarget.id);
        setItems(prev => prev.filter(v => v.vocabId !== deleteTarget.id));
        if (expandedId === deleteTarget.id) setExpandedId(null);
        setDeleteTarget(null);
        addToast(`Đã xóa "${deleteTarget.word}".`, 'success');
    };

    // ── Example CRUD ──────────────────────────────────────────────────────────

    const handleExampleSave = async (form: ExampleFormData) => {
        const payload = {
            exampleEn: form.exampleEn.trim(),
            exampleVi: form.exampleVi.trim(),
            audioUrl: form.audioUrl.trim() || undefined,
        };

        if (exampleModal?.type === 'create') {
            const created = await adminApi.createExample(exampleModal.vocabId, payload);
            setItems(prev => prev.map(v =>
                v.vocabId === exampleModal.vocabId
                    ? { ...v, examples: [...v.examples, created] }
                    : v
            ));
            setExampleModal(null);
            addToast('Đã thêm ví dụ.', 'success');
        } else if (exampleModal?.type === 'edit') {
            const id = exampleModal.example.exampleId;
            await adminApi.updateExample(id, payload);
            setItems(prev => prev.map(v => ({
                ...v,
                examples: v.examples.map(e =>
                    e.exampleId === id ? { ...e, ...payload } : e
                ),
            })));
            setExampleModal(null);
            addToast('Đã cập nhật ví dụ.', 'success');
        }
    };

    const handleExampleDelete = async () => {
        if (deleteTarget?.type !== 'example') return;
        await adminApi.deleteExample(deleteTarget.id);
        setItems(prev => prev.map(v => ({
            ...v,
            examples: v.examples.filter(e => e.exampleId !== deleteTarget.id),
        })));
        setDeleteTarget(null);
        addToast('Đã xóa ví dụ.', 'success');
    };

    const handleDeleteConfirm = async () => {
        if (!deleteTarget) return;
        if (deleteTarget.type === 'vocab') await handleVocabDelete();
        else await handleExampleDelete();
    };

    // ── Filter bar ─────────────────────────────────────────────────────────────

    const filterInputCls = adminInputClass;
    const filterLabelCls = 'text-xs font-display font-bold text-text-muted';

    return (
        <div>
            {/* Toolbar */}
            <FilterBar
                actions={
                    <Button variant="primary" onClick={() => setVocabModal({ type: 'create' })}>
                        <Plus size={15} /> Thêm từ vựng
                    </Button>
                }
            >
                <div className="flex-1 min-w-52">
                    <label htmlFor="vocab-search" className={`${filterLabelCls} mb-1.5 block`}>Tìm kiếm</label>
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                        <input
                            id="vocab-search"
                            className={`${filterInputCls} pl-8 w-full`}
                            placeholder="Từ hoặc nghĩa..."
                            value={search}
                            onChange={e => handleSearchChange(e.target.value)}
                        />
                    </div>
                </div>
                <div>
                    <label htmlFor="vocab-cefr-filter" className={`${filterLabelCls} mb-1.5 block`}>Cấp độ CEFR</label>
                    <select
                        id="vocab-cefr-filter"
                        className={filterInputCls}
                        value={cefrFilter}
                        onChange={e => { setCefrFilter(e.target.value); }}
                    >
                        <option value="">Tất cả cấp độ</option>
                        {CEFR_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="vocab-topic-filter" className={`${filterLabelCls} mb-1.5 block`}>Chủ đề</label>
                    <select
                        id="vocab-topic-filter"
                        className={filterInputCls}
                        value={topicFilter}
                        onChange={e => { setTopicFilter(e.target.value); }}
                    >
                        <option value="">Tất cả chủ đề</option>
                        {topics.map(t => (
                            <option key={t.topicId} value={String(t.topicId)}>
                                {t.parentTopicName ? `${t.parentTopicName} › ` : ''}{t.name}
                            </option>
                        ))}
                    </select>
                </div>
            </FilterBar>

            {/* Table */}
            <DataTable headers={[]}>
                {loading ? (
                    <div className="flex items-center justify-center py-24 gap-3 text-text-muted">
                        <Loader2 size={22} className="animate-spin text-primary" />
                        <span className="font-display font-bold">Đang tải...</span>
                    </div>
                ) : error ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-4">
                        <AlertTriangle size={36} className="text-red-400" />
                        <p className="font-bold text-red-500">{error}</p>
                        <Button
                            variant="secondary"
                            onClick={() => void load(pagination.page, searchRef.current, cefrRef.current, topicRef.current)}
                        >
                            <RefreshCw size={16} /> Thử lại
                        </Button>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b border-primary/10">
                                        <th className="w-10 px-4 py-3.5" />
                                        <th className="px-4 py-3.5 text-left text-xs font-display font-bold text-text-muted uppercase tracking-wide">Từ vựng</th>
                                        <th className="px-4 py-3.5 text-left text-xs font-display font-bold text-text-muted uppercase tracking-wide">IPA</th>
                                        <th className="px-4 py-3.5 text-left text-xs font-display font-bold text-text-muted uppercase tracking-wide">Cấp độ</th>
                                        <th className="px-4 py-3.5 text-left text-xs font-display font-bold text-text-muted uppercase tracking-wide">Nghĩa</th>
                                        <th className="px-4 py-3.5 text-left text-xs font-display font-bold text-text-muted uppercase tracking-wide">Chủ đề</th>
                                        <th className="px-4 py-3.5 text-right text-xs font-display font-bold text-text-muted uppercase tracking-wide">Thao tác</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-4 py-16 text-center text-text-muted text-sm">
                                                Chưa có từ vựng.
                                            </td>
                                        </tr>
                                    ) : (
                                        items.map(vocab => {
                                            const isExpanded = expandedId === vocab.vocabId;
                                            const examplesPanelId = `vocab-${vocab.vocabId}-examples`;
                                            return (
                                                <React.Fragment key={vocab.vocabId}>
                                                    <tr className={`border-b border-primary/5 transition-colors ${isExpanded ? 'bg-primary/[0.04]' : 'hover:bg-primary/[0.03]'}`}>
                                                        <td className="px-4 py-3">
                                                            <button
                                                                type="button"
                                                                onClick={() => setExpandedId(isExpanded ? null : vocab.vocabId)}
                                                                aria-label={isExpanded ? `Thu gọn ví dụ của ${vocab.word}` : `Mở ${vocab.examples.length} ví dụ của ${vocab.word}`}
                                                                aria-expanded={isExpanded}
                                                                aria-controls={examplesPanelId}
                                                                className={`p-1 rounded-lg text-text-muted hover:text-primary hover:bg-primary/10 transition-colors ${adminFocusRingClass}`}
                                                                title={isExpanded ? 'Thu gọn' : `${vocab.examples.length} ví dụ — bấm để quản lý`}
                                                            >
                                                                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                                            </button>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-display font-bold text-sm text-text-primary">{vocab.word}</span>
                                                                {vocab.audioUrl && (
                                                                    <a
                                                                        href={vocab.audioUrl}
                                                                        target="_blank"
                                                                        rel="noreferrer"
                                                                        aria-label={`Phát âm thanh của ${vocab.word}`}
                                                                        className={`rounded text-text-muted hover:text-primary transition-colors ${adminFocusRingClass}`}
                                                                    >
                                                                        <Volume2 size={12} />
                                                                    </a>
                                                                )}
                                                                {vocab.examples.length > 0 && (
                                                                    <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold leading-none">
                                                                        {vocab.examples.length}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                                                            <td className="px-4 py-3 text-xs text-text-muted font-ipa whitespace-nowrap">
                                                            {vocab.ipa ?? '—'}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <CefrBadge level={vocab.level} />
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-text-muted max-w-[200px] truncate">
                                                            {vocab.meaningVi ?? '—'}
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-text-muted whitespace-nowrap">
                                                            {vocab.topicName ?? '—'}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center gap-1 justify-end">
                                                                <IconButton
                                                                    onClick={() => setVocabModal({ type: 'edit', vocab })}
                                                                    aria-label={`Chỉnh sửa ${vocab.word}`}
                                                                    title="Chỉnh sửa"
                                                                    tone="primary"
                                                                    icon={<Pencil size={14} />}
                                                                />
                                                                <IconButton
                                                                    onClick={() => setDeleteTarget({ type: 'vocab', id: vocab.vocabId, word: vocab.word })}
                                                                    aria-label={`Xóa ${vocab.word}`}
                                                                    title="Xóa"
                                                                    tone="danger"
                                                                    icon={<Trash2 size={14} />}
                                                                />
                                                            </div>
                                                        </td>
                                                    </tr>
                                                    {isExpanded && (
                                                        <ExamplesPanel
                                                            vocab={vocab}
                                                            panelId={examplesPanelId}
                                                            onAdd={vocabId => setExampleModal({ type: 'create', vocabId })}
                                                            onEdit={example => setExampleModal({ type: 'edit', example })}
                                                            onDelete={ex => setDeleteTarget({
                                                                type: 'example',
                                                                id: ex.exampleId,
                                                                vocabId: ex.vocabId,
                                                                text: ex.exampleEn,
                                                            })}
                                                        />
                                                    )}
                                                </React.Fragment>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        <Pagination
                            page={pagination.page}
                            totalPages={pagination.totalPages}
                            onPageChange={handlePageChange}
                            summary={`Trang ${pagination.page}/${pagination.totalPages} · ${pagination.totalCount} từ`}
                        />
                    </>
                )}
            </DataTable>

            {/* Modals */}
            {vocabModal && (
                <VocabFormModal
                    modal={vocabModal}
                    topics={topics}
                    onClose={() => setVocabModal(null)}
                    onSave={handleVocabSave}
                />
            )}
            {exampleModal && (
                <ExampleFormModal
                    modal={exampleModal}
                    onClose={() => setExampleModal(null)}
                    onSave={handleExampleSave}
                />
            )}
            {deleteTarget && (
                <DeleteConfirmModal
                    target={deleteTarget}
                    onClose={() => setDeleteTarget(null)}
                    onConfirm={handleDeleteConfirm}
                />
            )}
        </div>
    );
};

export default AdminVocabulary;
