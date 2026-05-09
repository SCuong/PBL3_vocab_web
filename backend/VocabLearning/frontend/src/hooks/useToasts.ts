import { useCallback, useState } from 'react';

export type ToastItem = {
    id: number;
    message: string;
    type?: string;
};

export const useToasts = () => {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const addToast = useCallback((message: string, type: string = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(toast => toast.id !== id));
        }, 4000);
    }, []);

    const removeToast = useCallback((id: number) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    }, []);

    return {
        toasts,
        addToast,
        removeToast
    };
};
