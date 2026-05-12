import { useEffect, useMemo, useState } from 'react';
import { MessageCircle, Pin, PinOff, Plus, Trash2, X } from 'lucide-react';
import { stickyNotesApi, type StickyNoteItem } from '../../services/stickyNotesApi';

type StickyNotesWidgetProps = {
    isVisible: boolean;
    onNotify: (message: string, type?: string) => void;
};

const noteBgByColor: Record<StickyNoteItem['color'], string> = {
    yellow: 'bg-amber-100 border-amber-200',
    blue: 'bg-sky-100 border-sky-200',
    green: 'bg-emerald-100 border-emerald-200',
    pink: 'bg-rose-100 border-rose-200',
    purple: 'bg-violet-100 border-violet-200',
};

const colorOptions: StickyNoteItem['color'][] = ['yellow', 'blue', 'green', 'pink', 'purple'];

export const StickyNotesWidget = ({ isVisible, onNotify }: StickyNotesWidgetProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [notes, setNotes] = useState<StickyNoteItem[]>([]);

    const sortedNotes = useMemo(
        () => [...notes].sort((a, b) => Number(b.isPinned) - Number(a.isPinned)),
        [notes],
    );

    useEffect(() => {
        if (!isVisible) {
            setIsOpen(false);
            setNotes([]);
            return;
        }

        const loadNotes = async () => {
            setIsLoading(true);
            try {
                const data = await stickyNotesApi.getAll();
                setNotes(data);
            } catch {
                onNotify('Không thể tải sticky notes.', 'info');
            } finally {
                setIsLoading(false);
            }
        };

        void loadNotes();
    }, [isVisible, onNotify]);

    if (!isVisible) {
        return null;
    }

    const handleCreate = async () => {
        try {
            const next = await stickyNotesApi.create({ content: '', color: 'yellow' });
            setNotes(prev => [next, ...prev]);
        } catch {
            onNotify('Không thể tạo note mới.', 'info');
        }
    };

    const handleChangeContent = async (note: StickyNoteItem, content: string) => {
        const previous = notes;
        setNotes(prev => prev.map(item => item.stickyNoteId === note.stickyNoteId ? { ...item, content } : item));
        try {
            const updated = await stickyNotesApi.update(note.stickyNoteId, { content });
            setNotes(prev => prev.map(item => item.stickyNoteId === note.stickyNoteId ? updated : item));
        } catch {
            setNotes(previous);
            onNotify('Không thể lưu nội dung note.', 'info');
        }
    };

    const handleTogglePin = async (note: StickyNoteItem) => {
        try {
            const updated = await stickyNotesApi.update(note.stickyNoteId, { isPinned: !note.isPinned });
            setNotes(prev => prev.map(item => item.stickyNoteId === note.stickyNoteId ? updated : item));
        } catch {
            onNotify('Không thể cập nhật trạng thái ghim.', 'info');
        }
    };

    const handleChangeColor = async (note: StickyNoteItem, color: StickyNoteItem['color']) => {
        try {
            const updated = await stickyNotesApi.update(note.stickyNoteId, { color });
            setNotes(prev => prev.map(item => item.stickyNoteId === note.stickyNoteId ? updated : item));
        } catch {
            onNotify('Không thể đổi màu note.', 'info');
        }
    };

    const handleDelete = async (note: StickyNoteItem) => {
        try {
            await stickyNotesApi.remove(note.stickyNoteId);
            setNotes(prev => prev.filter(item => item.stickyNoteId !== note.stickyNoteId));
        } catch {
            onNotify('Không thể xóa note.', 'info');
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-[450]">
            <button
                onClick={() => setIsOpen(prev => !prev)}
                className="h-14 w-14 rounded-full bg-primary text-white shadow-lg hover:bg-primary-hover transition-colors cursor-pointer flex items-center justify-center"
                aria-label="Mở sticky notes"
            >
                {isOpen ? <X size={20} /> : <MessageCircle size={20} />}
            </button>

            {isOpen && (
                <div className="mt-3 w-[92vw] max-w-[380px] max-h-[70vh] overflow-hidden rounded-2xl border border-border bg-white shadow-2xl">
                    <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                        <p className="text-sm font-bold text-text-primary">Sticky Notes</p>
                        <button
                            onClick={handleCreate}
                            className="inline-flex items-center gap-1 rounded-full bg-primary-light text-primary text-xs font-bold px-3 py-1.5 hover:bg-primary/20 transition-colors cursor-pointer"
                        >
                            <Plus size={14} /> Note mới
                        </button>
                    </div>

                    <div className="p-3 space-y-3 overflow-y-auto max-h-[58vh]">
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
                                    onChange={event => handleChangeContent(note, event.target.value)}
                                    placeholder="Ghi chú nhanh của bạn..."
                                    className="w-full min-h-24 resize-y bg-transparent outline-none text-sm text-slate-700 placeholder:text-slate-500"
                                />

                                <div className="mt-2 flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1">
                                        {colorOptions.map(color => (
                                            <button
                                                key={`${note.stickyNoteId}-${color}`}
                                                onClick={() => handleChangeColor(note, color)}
                                                className={`h-4 w-4 rounded-full border border-slate-300 cursor-pointer ${
                                                    color === 'yellow' ? 'bg-amber-300' :
                                                    color === 'blue' ? 'bg-sky-300' :
                                                    color === 'green' ? 'bg-emerald-300' :
                                                    color === 'pink' ? 'bg-rose-300' :
                                                    'bg-violet-300'
                                                } ${note.color === color ? 'ring-2 ring-slate-500' : ''}`}
                                                aria-label={`Đổi màu ${color}`}
                                            />
                                        ))}
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => handleTogglePin(note)}
                                            className="p-1.5 rounded-md hover:bg-white/70 transition-colors cursor-pointer"
                                            aria-label={note.isPinned ? 'Bỏ ghim note' : 'Ghim note'}
                                        >
                                            {note.isPinned ? <Pin size={15} className="text-slate-700" /> : <PinOff size={15} className="text-slate-700" />}
                                        </button>
                                        <button
                                            onClick={() => handleDelete(note)}
                                            className="p-1.5 rounded-md hover:bg-white/70 transition-colors cursor-pointer"
                                            aria-label="Xóa note"
                                        >
                                            <Trash2 size={15} className="text-red-600" />
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
