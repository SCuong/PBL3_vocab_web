import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { AppDialog, Button, FloatingField } from '../ui';
import { authApi } from '../../services/authApi';

type DeleteAccountModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    onAddToast?: (message: string, type?: string) => void;
};

export const DeleteAccountModal = ({ isOpen, onClose, onSuccess, onAddToast }: DeleteAccountModalProps) => {
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [confirmText, setConfirmText] = useState('');

    const handleDelete = async () => {
        if (isDeleting) return;

        if (!password.trim()) {
            setError('Vui lòng nhập mật khẩu');
            return;
        }

        if (confirmText !== 'DELETE') {
            setError('Vui lòng nhập "DELETE" để xác nhận');
            return;
        }

        setError('');
        setIsDeleting(true);

        try {
            await authApi.deleteAccount({ password });
            onAddToast?.('Tài khoản đã bị xoá thành công.', 'success');
            setTimeout(() => {
                onSuccess();
            }, 1500);
        } catch (error: any) {
            setError(error?.message || 'Không thể xoá tài khoản. Vui lòng kiểm tra mật khẩu.');
            onAddToast?.(error?.message || 'Không thể xoá tài khoản.', 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleClose = () => {
        if (!isDeleting) {
            setPassword('');
            setShowPassword(false);
            setConfirmText('');
            setError('');
            onClose();
        }
    };

    return (
        <AppDialog
            isOpen={isOpen}
            onClose={handleClose}
            title="Xóa tài khoản"
            footer={(
                <>
                    <Button variant="ghost" onClick={handleClose} disabled={isDeleting}>Hủy</Button>
                    <Button
                        variant="danger"
                        onClick={handleDelete}
                        isLoading={isDeleting}
                        disabled={!password.trim() || confirmText !== 'DELETE'}
                    >
                        Xóa vĩnh viễn
                    </Button>
                </>
            )}
        >
            <div className="space-y-4">
                <div className="flex gap-3 rounded-[var(--radius-element)] bg-danger-color/10 p-4 text-sm text-text-primary">
                    <AlertTriangle size={18} className="mt-0.5 shrink-0 text-danger-color" aria-hidden />
                    <p>Tài khoản và toàn bộ tiến độ học sẽ bị xóa vĩnh viễn. Bạn không thể hoàn tác.</p>
                </div>
                <FloatingField
                    label="Mật khẩu"
                    value={password}
                    onChange={(next) => { setPassword(next); setError(''); }}
                    disabled={isDeleting}
                    autoComplete="current-password"
                    isPassword
                    shown={showPassword}
                    onToggleShown={() => setShowPassword((v) => !v)}
                />
                <FloatingField
                    label='Gõ "DELETE" để xác nhận'
                    value={confirmText}
                    onChange={(next) => { setConfirmText(next); setError(''); }}
                    disabled={isDeleting}
                    autoComplete="off"
                />
                {error && (
                    <p role="alert" className="rounded-[var(--radius-element)] bg-danger-color/10 px-3.5 py-3 text-sm text-danger-color">{error}</p>
                )}
            </div>
        </AppDialog>
    );
};
