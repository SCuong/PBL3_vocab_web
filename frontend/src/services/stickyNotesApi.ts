export type StickyNoteItem = {
    stickyNoteId: number;
    content: string;
    color: 'yellow' | 'blue' | 'green' | 'pink' | 'purple';
    isPinned: boolean;
    createdAt: string;
    updatedAt: string;
};

type CreateStickyNotePayload = {
    content?: string;
    color?: StickyNoteItem['color'];
};

type UpdateStickyNotePayload = {
    content?: string;
    color?: StickyNoteItem['color'];
    isPinned?: boolean;
};

export const stickyNotesApi = {
    getAll: async (): Promise<StickyNoteItem[]> => {
        const response = await fetch('/api/sticky-notes', {
            credentials: 'include',
        });

        if (!response.ok) {
            throw new Error('Không thể tải sticky notes.');
        }

        return (await response.json()) as StickyNoteItem[];
    },

    create: async (payload: CreateStickyNotePayload): Promise<StickyNoteItem> => {
        const response = await fetch('/api/sticky-notes', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error('Không thể tạo sticky note.');
        }

        return (await response.json()) as StickyNoteItem;
    },

    update: async (stickyNoteId: number, payload: UpdateStickyNotePayload): Promise<StickyNoteItem> => {
        const response = await fetch(`/api/sticky-notes/${stickyNoteId}`, {
            method: 'PUT',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error('Không thể cập nhật sticky note.');
        }

        return (await response.json()) as StickyNoteItem;
    },

    remove: async (stickyNoteId: number): Promise<void> => {
        const response = await fetch(`/api/sticky-notes/${stickyNoteId}`, {
            method: 'DELETE',
            credentials: 'include',
        });

        if (!response.ok) {
            throw new Error('Không thể xóa sticky note.');
        }
    },
};
