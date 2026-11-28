import type { ReactNode } from 'react';
import { Dialog, DialogHeader } from '@astryxdesign/core/Dialog';

type AppDialogProps = {
    isOpen: boolean;
    onClose: () => void;
    title: ReactNode;
    subtitle?: ReactNode;
    children: ReactNode;
    footer?: ReactNode;
    width?: number;
    /** 'form' keeps typed input safe from stray backdrop clicks. */
    purpose?: 'info' | 'form' | 'required';
};

/** House dialog: Astryx Dialog (focus trap, Escape, scroll lock) with a title row, body and action row. */
export const AppDialog = ({ isOpen, onClose, title, subtitle, children, footer, width = 440, purpose = 'form' }: AppDialogProps) => {
    const onOpenChange = (open: boolean) => {
        if (!open) onClose();
    };
    return (
        <Dialog isOpen={isOpen} onOpenChange={onOpenChange} width={width} purpose={purpose} maxHeight="88dvh">
            <div className="shrink-0">
                <DialogHeader title={title} subtitle={subtitle} onOpenChange={onOpenChange} />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto no-scrollbar py-4">{children}</div>
            {footer && <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">{footer}</div>}
        </Dialog>
    );
};
