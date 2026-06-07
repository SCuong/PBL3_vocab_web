import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { Button, typography } from '../ui';
import { authApi, type AuthenticatedUser } from '../../services/authApi';
import { AVATAR_PRESETS, normalizeAvatarUrl } from '../../utils/avatarPresets';
import { saveProfilePreferences } from '../../utils/profilePreferences';

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
    frameOptions: { key: string; label: string; img: string; unlocked: boolean }[];
    selectedFrameKey: string | null;
    onSelectFrame: (key: string | null) => void;
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
    frameOptions,
    selectedFrameKey,
    onSelectFrame,
}) => {
    const [username, setUsername] = useState(initialUsername);
    const [email, setEmail] = useState(initialEmail);
    const [avatarUrl, setAvatarUrl] = useState<string | undefined>(initialAvatarUrl);
    const [isAvatarPickerOpen, setIsAvatarPickerOpen] = useState(false);

    const [isSavingProfile, setIsSavingProfile] = useState(false);

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
        const id = requestAnimationFrame(() => setActive(true));
        return () => cancelAnimationFrame(id);
    }, [isOpen, initialUsername, initialEmail, initialAvatarUrl]);

    const initials = useMemo(() => {
        const source = (username || '').trim();
        return source ? source[0].toUpperCase() : 'U';
    }, [username]);

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
                        <h4 className="font-bold text-sm uppercase tracking-wide text-text-muted">Thông tin tài khoản &amp; hiển thị</h4>
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

                        {/* Profile frame picker (cosmetic, localStorage; unlock derived from badges) */}
                        <div className="space-y-2">
                            <h5 className="text-sm font-bold text-text-primary">Khung hồ sơ</h5>
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    type="button"
                                    onClick={() => onSelectFrame(null)}
                                    className={`flex flex-col items-center rounded-xl border-2 p-2 text-center transition-colors ${
                                        selectedFrameKey === null ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                                    }`}
                                >
                                    <span className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-dashed border-border text-text-muted">✕</span>
                                    <span className="mt-1 text-xs font-bold text-text-primary">Không khung</span>
                                    <span className="text-[10px] text-text-muted">{selectedFrameKey === null ? 'Đang dùng' : 'Mặc định'}</span>
                                </button>
                                {frameOptions.map((frame) => {
                                    const active = selectedFrameKey === frame.key;
                                    return (
                                        <button
                                            key={frame.key}
                                            type="button"
                                            disabled={!frame.unlocked}
                                            onClick={() => frame.unlocked && onSelectFrame(frame.key)}
                                            className={`flex flex-col items-center rounded-xl border-2 p-2 text-center transition-colors ${
                                                active
                                                    ? 'border-primary bg-primary/5'
                                                    : frame.unlocked
                                                        ? 'border-border hover:border-primary/30 cursor-pointer'
                                                        : 'border-border opacity-60 cursor-not-allowed'
                                            }`}
                                        >
                                            <img
                                                src={frame.img}
                                                alt=""
                                                className={`h-14 w-14 object-contain ${frame.unlocked ? '' : 'grayscale opacity-70'}`}
                                            />
                                            <span className="mt-1 text-xs font-bold text-text-primary">{frame.label}</span>
                                            <span className="text-[10px] text-text-muted">
                                                {frame.unlocked ? (active ? 'Đang dùng' : 'Đã mở khóa') : 'Chưa mở khóa'}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

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
                </div>
            </div>
        </div>
    );
};

export default EditProfileModal;
