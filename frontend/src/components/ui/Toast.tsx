import { Check, Sparkles, X } from 'lucide-react';
import { motion } from 'framer-motion';

type ToastProps = {
    message: string;
    type?: string;
    onClose: () => void;
};

export const Toast = ({ message, type = 'info', onClose }: ToastProps) => (
    <motion.div
        initial={{ x: 100, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 100, opacity: 0 }}
        className="bg-surface border-2 border-primary/30 rounded-card p-4 shadow-xl flex items-center gap-3 w-80 mb-4 pointer-events-auto"
    >
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${type === 'success' ? 'bg-green-100 text-green-600' : 'bg-primary/10 text-primary'}`}>
            {type === 'success' ? <Check size={20} /> : <Sparkles size={20} />}
        </div>
        <div className="flex-1 text-sm font-medium">{message}</div>
        <button onClick={onClose} className="text-text-muted hover:text-text-primary"><X size={18} /></button>
    </motion.div>
);
