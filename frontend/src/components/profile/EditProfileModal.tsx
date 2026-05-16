import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { Button, typography } from '../ui';
import { authApi, type AuthenticatedUser } from '../../services/authApi';
import { AVATAR_PRESETS, normalizeAvatarUrl } from '../../utils/avatarPresets';
import { saveProfilePreferences } from '../../utils/profilePreferences';
import {
    checkPasswordPolicy,
    isPasswordPolicyValid,
    PASSWORD_MAX_LENGTH,
    PASSWORD_POLICY_LABELS,
} from '../../utils/passwordPolicy';

type ToastFn = (message: string, kind?: 'success' | 'info' | 'error') => void;

type EditProfileModalProps = {
    isOpen: boolean;
    onClose: () => void;
    userId: number | undefined;
    initialUsername: string;
    initialEmail: string;
    initialAvatarUrl: string | undefined;
    onProfileSaved: (user: AuthenticatedUser, avatarUrl: string | undefined) => void;
    onAddToast?: ToastFn;
};

// Modal owns every draft field locally so typing never rerenders the parent
// Profile page. The parent only learns about changes after Save succeeds.
const EditProfileModal: React.FC<EditProfileModalProps> = ({
    isOpen,
    onClose,
    userId,
    initialUsername,
    initialEmail,
    initialAvatarUrl,
    onProfileSaved,
    onAddToast,
}) => {
    const [username, setUsername] = useState(initialUsername);
    const [email, setEmail] = useState(initialEmail);
    const [avatarUrl, setAvatarUrl] = useState<string | undefined>(initialAvatarUrl);
    const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [confirmPasswordError, setConfirmPasswordError] = useState('');

    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isSavingPassword, setIsSavingPassword] = useState(false);

    // `active` drives the .is-open class on the overlay one frame after mount,
    // so the CSS transition fires from opacity:0 → 1 instead of skipping.
    const [active, setActive] = useState(false);

    useEffect(() => {
        if (!isOpen) {
            setActive(false);
            return;
        }
        setUsername(initialUsername);
        setEmail(initialEmail);
        setAvatarUrl(initialAvatarUrl);
        setIsAvatarPickerOpen(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        setConfirmPasswordError('');
        const id = requestAnimationFrame(() => setActive(true));
        return () => cancelAnimationFrame(id);
    }, [isOpen, initialUsername, initialEmail, initialAvatarUrl]);

    const initials = useMemo(() => {
        const source = (username || '').trim();
        return source ? source[0].toUpperCase() : 'U';
    }, [username]);

    const newPasswordPolicy = useMemo(() => checkPasswordPolicy(newPassword), [newPassword]);
    const isNewPasswordValid = isPasswordPolicyValid(newPasswordPolicy);

    const handleSaveProfile = async () => {
        if (isSavingProfile) return;

        setIsSavingProfile(true);
        try {
            const updatedUser = await authApi.updateProfile({ username, email });
            if (userId) {
                saveProfilePreferences(userId, { avatarUrl });
            }
            onProfileSaved(updatedUser, avatarUrl);
            onAddToast?.('Cập nhật hồ sơ thành công.', 'success');
            onClose();
        } catch (error: any) {
            onAddToast?.(error?.message || 'Không thể cập nhật hồ sơ.', 'info');
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handleChangePassword = async () => {
        if (isSavingPassword) return;

        if (!isNewPasswordValid) {
            setConfirmPasswordError('Mật khẩu chưa đúng định dạng yêu cầu.');
            return;
        }
        if (newPassword !== confirmNewPassword) {
            setConfirmPasswordError('Mật khẩu xác nhận không khớp với mật khẩu mới.');
            return;
        }

        setConfirmPasswordError('');
        setIsSavingPassword(true);
        try {
            await authApi.changePassword({ currentPassword, newPassword, confirmNewPassword });
            setCurrentPassword('');
            setNewPassword('');
            setConfirmNewPassword('');
            setConfirmPasswordError('');
            onAddToast?.('Đổi mật khẩu thành công.', 'success');
        } catch (error: any) {
            onAddToast?.(error?.message || 'Không thể đổi mật khẩu.', 'info');
        } finally {
            setIsSavingPassword(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={`profile-modal-overlay${active ? ' is-open' : ''}`} role="dialog" aria-modal="true">
            <div className="profile-modal-card">
                <div className="profile-modal-header">
                    <h3 className={typography.modalTitle}>Chỉnh sửa hồ sơ</h3>
                    <button
                        type="button"
                        aria-label="Đóng"
                        className="w-9 h-9 rounded-full hover:bg-primary/10 flex items-center justify-center cursor-pointer"
                        onClick={onClose}
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="profile-modal-body space-y-8">
                    <section className="space-y-4">
                        <h4 className="font-bold text-sm uppercase tracking-wide text-text-muted">Thông tin tài khoản & Avatar</h4>
                        <div className="flex items-center gap-4">
                            {avatarUrl ? (
                                <img
                                    src={normalizeAvatarUrl(avatarUrl)}
                                    alt="Avatar preview"
                                    className="w-20 h-20 rounded-full object-cover border-2 border-primary/15"
                                />
                            ) : (
                                <div className="w-20 h-20 rounded-full bg-linear-to-br from-primary to-secondary flex items-center justify-center text-3xl font-display text-text-on-accent border-2 border-primary/15">
                                    {initials}
                                </div>
                            )}
                            <Button
                                type="button"
                                variant="ghost"
                                className="px-4"
                                onClick={() => setIsAvatarPickerOpen((prev) => !prev)}
                            >
                                {isAvatarPickerOpen ? 'Ẩn avatar' : 'Chọn avatar'}
                            </Button>
                        </div>

                        {isAvatarPickerOpen && (
                            <div className="grid grid-cols-5 gap-3">
                                {AVATAR_PRESETS.map((avatar) => (
                                    <button
                                        key={avatar.id}
                                        type="button"
                                        aria-label={`Chọn avatar ${avatar.id}`}
                                        className={`rounded-full border-2 p-0.5 cursor-pointer ${avatarUrl === avatar.url ? 'border-primary' : 'border-transparent hover:border-primary/40'}`}
                                        onClick={() => {
                                            setAvatarUrl(avatar.url);
                                            setIsAvatarPickerOpen(false);
                                        }}
                                    >
                                        <img src={avatar.url} alt="" className="w-14 h-14 rounded-full object-cover" />
                                    </button>
                                ))}
                            </div>
                        )}

                        <input
                            type="text"
                            className="profile-input"
                            placeholder="Tên người dùng"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                        />
                        <input
                            type="email"
                            className="profile-input"
                            placeholder="Email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        <Button className="w-full" variant="primary" onClick={handleSaveProfile} disabled={isSavingProfile}>
                            {isSavingProfile ? 'Đang lưu...' : 'Lưu hồ sơ'}
                        </Button>
                    </section>

                    <section className="space-y-4 border-t border-primary/10 pt-6">
                        <h4 className="font-bold text-sm uppercase tracking-wide text-text-muted">Đổi mật khẩu</h4>
                        <input
                            type="password"
                            className="profile-input"
                            placeholder="Mật khẩu hiện tại"
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                        />
                        <input
                            type="password"
                            className="profile-input"
                            placeholder="Mật khẩu mới"
                            value={newPassword}
                            maxLength={PASSWORD_MAX_LENGTH}
                            onChange={(e) => {
                                const nextValue = e.target.value;
                                setNewPassword(nextValue);
                                if (!confirmNewPassword) {
                                    setConfirmPasswordError('');
                                    return;
                                }
                                setConfirmPasswordError(
                                    nextValue === confirmNewPassword
                                        ? ''
                                        : 'Mật khẩu xác nhận không khớp với mật khẩu mới.'
                                );
                            }}
                        />
                        <div className="rounded-xl border border-primary/15 bg-primary/[0.04] px-4 py-3 text-xs text-text-secondary space-y-1 text-left">
                            <p className="font-semibold text-text-primary mb-1">Yêu cầu mật khẩu:</p>
                            {PASSWORD_POLICY_LABELS.map(([key, label]) => {
                                const ok = newPasswordPolicy[key];
                                return (
                                    <p key={key} className={`flex items-center gap-2 ${ok ? 'text-green-700' : ''}`}>
                                        <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${ok ? 'bg-green-200 text-green-700' : 'bg-surface-hover text-text-muted'}`}>
                                            {ok ? '✓' : '·'}
                                        </span>
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
                            onChange={(e) => {
                                const nextValue = e.target.value;
                                setConfirmNewPassword(nextValue);
                                setConfirmPasswordError(
                                    nextValue === newPassword
                                        ? ''
                                        : 'Mật khẩu xác nhận không khớp với mật khẩu mới.'
                                );
                            }}
                        />
                        {confirmPasswordError && (
                            <p className="text-sm text-red-500 -mt-2">{confirmPasswordError}</p>
                        )}
                        <Button className="w-full" variant="secondary" onClick={handleChangePassword} disabled={isSavingPassword}>
                            {isSavingPassword ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
                        </Button>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default EditProfileModal;
