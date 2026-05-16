import React, { useEffect, useMemo, useState } from 'react';
import { X, Check, Circle } from 'lucide-react';
import { Button } from '../ui';
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
    const [confirmPasswordError, setConfirmPasswordError] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[800] flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div
                className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-[#E5D9F2] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#EFE4FA]">
                    <h3 className="font-bold text-text-primary">Đổi mật khẩu</h3>
                    <button
                        type="button"
                        aria-label="Đóng"
                        className="w-9 h-9 rounded-full hover:bg-primary/10 flex items-center justify-center cursor-pointer"
                        onClick={onClose}
                    >
                        <X size={18} />
                    </button>
                </div>
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                    <input
                        type="password"
                        className="profile-input"
                        placeholder="Mật khẩu hiện tại"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        autoComplete="current-password"
                    />
                    <input
                        type="password"
                        className="profile-input"
                        placeholder="Mật khẩu mới"
                        value={newPassword}
                        maxLength={PASSWORD_MAX_LENGTH}
                        autoComplete="new-password"
                        onChange={(e) => {
                            const next = e.target.value;
                            setNewPassword(next);
                            if (!confirmNewPassword) {
                                setConfirmPasswordError('');
                                return;
                            }
                            setConfirmPasswordError(
                                next === confirmNewPassword
                                    ? ''
                                    : 'Mật khẩu xác nhận không khớp với mật khẩu mới.'
                            );
                        }}
                    />
                    <div className="rounded-2xl border border-[#EFE4FA] bg-[#F7F0FF]/60 px-4 py-3 text-xs text-text-secondary space-y-1.5">
                        <p className="font-semibold text-text-primary mb-1">Yêu cầu mật khẩu:</p>
                        {PASSWORD_POLICY_LABELS.map(([key, label]) => {
                            const ok = newPasswordPolicy[key];
                            return (
                                <p key={key} className={`flex items-center gap-2 transition-colors ${ok ? 'text-green-700 font-semibold' : 'text-text-muted'}`}>
                                    {ok ? (
                                        <span className="w-4 h-4 rounded-full bg-green-500 text-white flex items-center justify-center shrink-0">
                                            <Check size={12} strokeWidth={3} />
                                        </span>
                                    ) : (
                                        <span className="w-4 h-4 rounded-full border-2 border-[#E5D9F2] flex items-center justify-center shrink-0">
                                            <Circle size={6} className="text-[#E5D9F2] fill-current" />
                                        </span>
                                    )}
                                    {label}
                                </p>
                            );
                        })}
                    </div>
                    <input
                        type="password"
                        className={`profile-input${confirmPasswordError ? ' is-invalid' : ''}`}
                        placeholder="Xác nhận mật khẩu mới"
                        value={confirmNewPassword}
                        maxLength={PASSWORD_MAX_LENGTH}
                        autoComplete="new-password"
                        onChange={(e) => {
                            const next = e.target.value;
                            setConfirmNewPassword(next);
                            setConfirmPasswordError(
                                next === newPassword
                                    ? ''
                                    : 'Mật khẩu xác nhận không khớp với mật khẩu mới.'
                            );
                        }}
                    />
                    {confirmPasswordError && (
                        <p className="text-sm text-red-500 -mt-1">{confirmPasswordError}</p>
                    )}
                </div>
                <div className="px-6 py-4 border-t border-[#EFE4FA] flex items-center justify-end gap-2">
                    <Button variant="ghost" onClick={onClose} disabled={isSaving}>
                        Hủy
                    </Button>
                    <Button variant="primary" onClick={handleSubmit} disabled={isSaving}>
                        {isSaving ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ChangePasswordModal;
