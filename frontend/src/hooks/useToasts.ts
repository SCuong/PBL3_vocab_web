import { useCallback } from 'react';
import { useToast } from '@astryxdesign/core/Toast';

/** App-wide toast helper backed by Astryx's toast viewport (stacking, auto-hide, swipe). */
export const useToasts = () => {
    const showToast = useToast();

    const addToast = useCallback((message: string, type: string = 'info') => {
        showToast({
            body: message,
            type: type === 'error' ? 'error' : 'info',
            uniqueID: message,
        });
    }, [showToast]);

    return { addToast };
};
