import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MessageCircle, Pin, PinOff, Plus, Trash2, X } from 'lucide-react';
import { stickyNotesApi, type StickyNoteItem } from '../../services/stickyNotesApi';

type StickyNotesWidgetProps = {
    isVisible: boolean;
    onNotify: (message: string, type?: string) => void;
};

const noteBgByColor: Record<StickyNoteItem['color'], string> = {
    yellow: 'bg-[var(--sticky-note-yellow-bg)] border-[var(--sticky-note-yellow-border)]',
    blue: 'bg-[var(--sticky-note-blue-bg)] border-[var(--sticky-note-blue-border)]',
    green: 'bg-[var(--sticky-note-green-bg)] border-[var(--sticky-note-green-border)]',
    pink: 'bg-[var(--sticky-note-pink-bg)] border-[var(--sticky-note-pink-border)]',
    purple: 'bg-[var(--sticky-note-purple-bg)] border-[var(--sticky-note-purple-border)]',
};

const colorSwatchByColor: Record<StickyNoteItem['color'], string> = {
    yellow: 'bg-[var(--sticky-note-yellow-border)]',
    blue: 'bg-[var(--sticky-note-blue-border)]',
    green: 'bg-[var(--sticky-note-green-border)]',
    pink: 'bg-[var(--sticky-note-pink-border)]',
    purple: 'bg-[var(--sticky-note-purple-border)]',
};

const colorOptions: StickyNoteItem['color'][] = ['yellow', 'blue', 'green', 'pink', 'purple'];
const CONTENT_SAVE_DELAY_MS = 600;

export const StickyNotesWidget = ({ isVisible, onNotify }: StickyNotesWidgetProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [notes, setNotes] = useState<StickyNoteItem[]>([]);
    const [hasLoaded, setHasLoaded] = useState(false);
    const latestContentRef = useRef(new Map<number, string>());
    const saveTimersRef = useRef(new Map<number, number>());
    const composingNoteIdsRef = useRef(new Set<number>());

    const sortedNotes = useMemo(
        () => [...notes].sort((a, b) => Number(b.isPinned) - Number(a.isPinned)),
        [notes],
    );

    useEffect(() => {
        if (!isVisible) {
            setIsOpen(false);
            setNotes([]);
            setHasLoaded(false);
            latestContentRef.current.clear();
            composingNoteIdsRef.current.clear();
            saveTimersRef.current.forEach(timerId => window.clearTimeout(timerId));
            saveTimersRef.current.clear();
            return;
        }

        if (!isOpen || hasLoaded) {
            return;
        }

        const loadNotes = async () => {
            setIsLoading(true);
            try {
                const data = await stickyNotesApi.getAll();
                data.forEach(note => latestContentRef.current.set(note.stickyNoteId, note.content));
                setNotes(data);
                setHasLoaded(true);
            } catch {
                onNotify('Không thể tải sticky notes.', 'info');
            } finally {
                setIsLoading(false);
            }
        };

        void loadNotes();
    }, [hasLoaded, isOpen, isVisible, onNotify]);

    useEffect(() => {
        return () => {
            saveTimersRef.current.forEach(timerId => window.clearTimeout(timerId));
            saveTimersRef.current.clear();
        };
    }, []);

    const mergeServerNote = (updated: StickyNoteItem) => {
        setNotes(prev => prev.map(item => {
            if (item.stickyNoteId !== updated.stickyNoteId) {
                return item;
            }

            return {
                ...updated,
                content: latestContentRef.current.get(updated.stickyNoteId) ?? updated.content,
            };
        }));
    };

    const saveNoteContent = useCallback(async (stickyNoteId: number, content: string) => {
        try {
            const updated = await stickyNotesApi.update(stickyNoteId, { content });
            setNotes(prev => prev.map(item => {
                if (item.stickyNoteId !== stickyNoteId) {
                    return item;
                }

                return {
                    ...updated,
                    content: latestContentRef.current.get(stickyNoteId) ?? updated.content,
                };
            }));
        } catch {
            onNotify('Không thể lưu nội dung note.', 'info');
        }
    }, [onNotify]);

    const scheduleContentSave = useCallback((stickyNoteId: number, content: string) => {
        const existingTimer = saveTimersRef.current.get(stickyNoteId);
        if (existingTimer) {
            window.clearTimeout(existingTimer);
        }

        const nextTimer = window.setTimeout(() => {
            saveTimersRef.current.delete(stickyNoteId);
            void saveNoteContent(stickyNoteId, content);
        }, CONTENT_SAVE_DELAY_MS);

        saveTimersRef.current.set(stickyNoteId, nextTimer);
    }, [saveNoteContent]);

    const flushContentSave = (stickyNoteId: number) => {
        if (composingNoteIdsRef.current.has(stickyNoteId)) {
            return;
        }

        const existingTimer = saveTimersRef.current.get(stickyNoteId);
        if (existingTimer) {
            window.clearTimeout(existingTimer);
            saveTimersRef.current.delete(stickyNoteId);
        }

        const content = latestContentRef.current.get(stickyNoteId);
        if (content !== undefined) {
            void saveNoteContent(stickyNoteId, content);
        }
    };

    const handleCreate = async () => {
        try {
            const next = await stickyNotesApi.create({ content: '', color: 'yellow' });
            latestContentRef.current.set(next.stickyNoteId, next.content);
            setNotes(prev => [next, ...prev]);
        } catch {
            onNotify('Không thể tạo note mới.', 'info');
        }
    };

    const handleChangeContentDraft = (stickyNoteId: number, content: string) => {
        latestContentRef.current.set(stickyNoteId, content);
        setNotes(prev => prev.map(item => item.stickyNoteId === stickyNoteId ? { ...item, content } : item));

        if (!composingNoteIdsRef.current.has(stickyNoteId)) {
            scheduleContentSave(stickyNoteId, content);
        }
    };

    const handleCompositionStart = (stickyNoteId: number) => {
        composingNoteIdsRef.current.add(stickyNoteId);
    };

    const handleCompositionEnd = (stickyNoteId: number, content: string) => {
        composingNoteIdsRef.current.delete(stickyNoteId);
        latestContentRef.current.set(stickyNoteId, content);
        setNotes(prev => prev.map(item => item.stickyNoteId === stickyNoteId ? { ...item, content } : item));
        scheduleContentSave(stickyNoteId, content);
    };

    const handleTogglePin = async (note: StickyNoteItem) => {
        try {
            const updated = await stickyNotesApi.update(note.stickyNoteId, { isPinned: !note.isPinned });
            mergeServerNote(updated);
        } catch {
            onNotify('Không thể cập nhật trạng thái ghim.', 'info');
        }
    };

    const handleChangeColor = async (note: StickyNoteItem, color: StickyNoteItem['color']) => {
        try {
            const updated = await stickyNotesApi.update(note.stickyNoteId, { color });
            mergeServerNote(updated);
        } catch {
            onNotify('Không thể đổi màu note.', 'info');
        }
    };

    const handleDelete = async (note: StickyNoteItem) => {
        try {
            await stickyNotesApi.remove(note.stickyNoteId);
            latestContentRef.current.delete(note.stickyNoteId);
            composingNoteIdsRef.current.delete(note.stickyNoteId);
            const existingTimer = saveTimersRef.current.get(note.stickyNoteId);
            if (existingTimer) {
                window.clearTimeout(existingTimer);
                saveTimersRef.current.delete(note.stickyNoteId);
            }
            setNotes(prev => prev.filter(item => item.stickyNoteId !== note.stickyNoteId));
        } catch {
            onNotify('Không thể xóa note.', 'info');
        }
    };

    if (!isVisible) {
        return null;
    }

    return (
        <div className="fixed bottom-6 right-6 z-[450]">
            <button
                onClick={() => setIsOpen(prev => !prev)}
                className="h-14 w-14 rounded-full bg-primary text-text-on-accent shadow-lg shadow-[var(--shadow-color)] hover:bg-primary-hover transition-colors cursor-pointer flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary"
                aria-label="Mở sticky notes"
            >
                {isOpen ? <X size={20} /> : <MessageCircle size={20} />}
            </button>

            {isOpen && (
                <div className="mt-3 w-[92vw] max-w-[380px] max-h-[70vh] overflow-hidden rounded-2xl border border-border bg-surface text-text-primary shadow-2xl shadow-[var(--shadow-color)]">
                    <div className="px-4 py-3 border-b border-border bg-bg-secondary/80 flex items-center justify-between">
                        <p className="text-sm font-bold text-text-primary">Sticky Notes</p>
                        <button
                            onClick={handleCreate}
                            className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary-light text-primary text-xs font-bold px-3 py-1.5 hover:bg-primary/20 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                        >
                            <Plus size={14} /> Note mới
                        </button>
                    </div>

                    <div className="p-3 space-y-3 overflow-y-auto max-h-[58vh] bg-surface">
                        {isLoading && <p className="text-sm text-text-muted">Đang tải notes...</p>}
                        {!isLoading && sortedNotes.length === 0 && (
                            <p className="text-sm text-text-muted">Bạn chưa có note nào.</p>
                        )}

                        {sortedNotes.map(note => (
                            <div
                                key={note.stickyNoteId}
                                className={`rounded-xl border p-3 ${noteBgByColor[note.color]}`}
                            >
                                <textarea
                                    value={note.content}
                                    onChange={event => handleChangeContentDraft(note.stickyNoteId, event.target.value)}
                                    onCompositionStart={() => handleCompositionStart(note.stickyNoteId)}
                                    onCompositionEnd={event => handleCompositionEnd(note.stickyNoteId, event.currentTarget.value)}
                                    onBlur={() => flushContentSave(note.stickyNoteId)}
                                    placeholder="Ghi chú nhanh của bạn..."
                                    className="w-full min-h-24 resize-y rounded-lg bg-transparent px-1 py-0.5 outline-none text-sm text-text-primary placeholder:text-text-muted caret-primary focus:bg-surface/35"
                                />

                                <div className="mt-2 flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1">
                                        {colorOptions.map(color => (
                                            <button
                                                key={`${note.stickyNoteId}-${color}`}
                                                onClick={() => handleChangeColor(note, color)}
                                                className={`h-4 w-4 rounded-full border border-border cursor-pointer transition-shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 ${colorSwatchByColor[color]} ${note.color === color ? 'ring-2 ring-primary ring-offset-2 ring-offset-surface' : ''}`}
                                                aria-label={`Đổi màu ${color}`}
                                            />
                                        ))}
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => handleTogglePin(note)}
                                            className="p-1.5 rounded-md text-text-secondary hover:text-text-primary hover:bg-[var(--sticky-note-control-hover)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                                            aria-label={note.isPinned ? 'Bỏ ghim note' : 'Ghim note'}
                                        >
                                            {note.isPinned ? <Pin size={15} /> : <PinOff size={15} />}
                                        </button>
                                        <button
                                            onClick={() => handleDelete(note)}
                                            className="p-1.5 rounded-md text-danger-color hover:bg-[var(--sticky-note-control-hover)] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger-color/50"
                                            aria-label="Xóa note"
                                        >
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
