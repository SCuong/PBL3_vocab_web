import React, { useEffect, useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { AppDialog, Button, FloatingField } from '../ui';
import { authApi } from '../../services/authApi';
import {
    checkPasswordPolicy,
    isPasswordPolicyValid,
    PASSWORD_MAX_LENGTH,
    PASSWORD_POLICY_LABELS,
} from '../../utils/passwordPolicy';

type ToastFn = (message: string, kind?: 'success' | 'info' | 'error') => void;

type ChangePasswordModalProps = {
    isOpen: boolean;
    onClose: () => void;
    onAddToast?: ToastFn;
};

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose, onAddToast }) => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [confirmPasswordError, setConfirmPasswordError] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        setShowCurrent(false);
        setShowNew(false);
        setShowConfirm(false);
        setConfirmPasswordError('');
    }, [isOpen]);

    const newPasswordPolicy = useMemo(() => checkPasswordPolicy(newPassword), [newPassword]);
    const isNewPasswordValid = isPasswordPolicyValid(newPasswordPolicy);

    const handleSubmit = async () => {
        if (isSaving) return;

        if (!currentPassword) {
            setConfirmPasswordError('Vui lòng nhập mật khẩu hiện tại.');
            return;
        }
        if (!isNewPasswordValid) {
            setConfirmPasswordError('Mật khẩu mới chưa đạt yêu cầu.');
            return;
        }
        if (newPassword !== confirmNewPassword) {
            setConfirmPasswordError('Mật khẩu xác nhận không khớp với mật khẩu mới.');
            return;
        }

        setConfirmPasswordError('');
        setIsSaving(true);
        try {
            await authApi.changePassword({ currentPassword, newPassword, confirmNewPassword });
            onAddToast?.('Đổi mật khẩu thành công.', 'success');
            onClose();
        } catch (error: any) {
            onAddToast?.(error?.message || 'Không thể đổi mật khẩu.', 'info');
        } finally {
            setIsSaving(false);
        }
    };

    const mismatch = 'Mật khẩu xác nhận không khớp với mật khẩu mới.';

    return (
        <AppDialog
            isOpen={isOpen}
            onClose={onClose}
            title="Đổi mật khẩu"
            footer={(
                <>
                    <Button variant="ghost" onClick={onClose} disabled={isSaving}>Hủy</Button>
                    <Button onClick={handleSubmit} isLoading={isSaving}>Cập nhật mật khẩu</Button>
                </>
            )}
        >
            <div className="space-y-4">
                <FloatingField
                    label="Mật khẩu hiện tại"
                    value={currentPassword}
                    onChange={setCurrentPassword}
                    autoComplete="current-password"
                    disabled={isSaving}
                    isPassword
                    shown={showCurrent}
                    onToggleShown={() => setShowCurrent((v) => !v)}
                />
                <FloatingField
                    label="Mật khẩu mới"
                    value={newPassword}
                    autoComplete="new-password"
                    maxLength={PASSWORD_MAX_LENGTH}
                    disabled={isSaving}
                    isPassword
                    shown={showNew}
                    onToggleShown={() => setShowNew((v) => !v)}
                    onChange={(value) => {
                        const next = value.slice(0, PASSWORD_MAX_LENGTH);
                        setNewPassword(next);
                        setConfirmPasswordError(confirmNewPassword && next !== confirmNewPassword ? mismatch : '');
                    }}
                />
                <ul className="space-y-1 text-sm" aria-label="Yêu cầu mật khẩu">
                    {PASSWORD_POLICY_LABELS.map(([key, label]) => {
                        const ok = newPasswordPolicy[key];
                        return (
                            <li key={key} className={`flex items-center gap-2 ${ok ? 'text-success-color' : 'text-text-muted'}`}>
                                <span
                                    className={`flex h-4 w-4 items-center justify-center rounded-full ${ok ? 'bg-success-color text-text-on-accent' : 'border border-border-emphasized'}`}
                                    aria-hidden
                                >
                                    {ok && <Check size={11} strokeWidth={3} />}
                                </span>
                                {label}
                            </li>
                        );
                    })}
                </ul>
                <FloatingField
                    label="Xác nhận mật khẩu mới"
                    value={confirmNewPassword}
                    autoComplete="new-password"
                    maxLength={PASSWORD_MAX_LENGTH}
                    disabled={isSaving}
                    isPassword
                    shown={showConfirm}
                    onToggleShown={() => setShowConfirm((v) => !v)}
                    error={confirmPasswordError}
                    onChange={(value) => {
                        const next = value.slice(0, PASSWORD_MAX_LENGTH);
                        setConfirmNewPassword(next);
                        setConfirmPasswordError(next === newPassword ? '' : mismatch);
                    }}
                    onEnter={handleSubmit}
                />
            </div>
        </AppDialog>
    );
};

export default ChangePasswordModal;
