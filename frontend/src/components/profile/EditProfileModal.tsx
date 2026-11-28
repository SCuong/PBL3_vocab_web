import React, { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import { TextInput } from '@astryxdesign/core/TextInput';
import { AppDialog, Button } from '../ui';
import { authApi, type AuthenticatedUser } from '../../services/authApi';
import {
    LEARNER_AVATAR_PRESETS,
    MASCOT_AVATAR_PRESETS,
    normalizeAvatarUrl,
} from '../../utils/avatarPresets';
import { ProfileFrameOverlay } from './ProfileFrameOverlay';
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

    return (
        <AppDialog
            isOpen={isOpen}
            onClose={onClose}
            title="Chỉnh sửa hồ sơ"
            width={560}
            footer={(
                <>
                    <Button variant="ghost" onClick={onClose}>Hủy</Button>
                    <Button onClick={handleSaveProfile} isLoading={isSavingProfile}>Lưu hồ sơ</Button>
                </>
            )}
        >
            <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-6 pl-6 pr-2 py-2">
                            <div className="relative h-16 w-16 shrink-0 sm:h-20 sm:w-20">
                                {avatarUrl ? (
                                    <img
                                        src={normalizeAvatarUrl(avatarUrl)}
                                        alt="Avatar preview"
                                        className="h-16 w-16 rounded-full object-cover sm:h-20 sm:w-20"
                                    />
                                ) : (
                                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-bold text-text-on-accent sm:h-20 sm:w-20 sm:text-3xl">
                                        {initials}
                                    </div>
                                )}
                                <ProfileFrameOverlay frameKey={selectedFrameKey} />
                            </div>
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => setIsAvatarPickerOpen((prev) => !prev)}
                            >
                                {isAvatarPickerOpen ? 'Ẩn bộ avatar' : 'Chọn avatar 2D'}
                            </Button>
                        </div>

                        {isAvatarPickerOpen && (
                            <div className="space-y-4 rounded-[var(--radius-element)] border-2 border-border bg-bg-secondary/50 p-3.5">
                                <div className="space-y-2">
                                    <p className="text-xs font-bold uppercase tracking-wider text-text-muted">
                                        Mascot Lumo 2D ({MASCOT_AVATAR_PRESETS.length})
                                    </p>
                                    <div className="grid grid-cols-5 justify-items-center gap-2">
                                        {MASCOT_AVATAR_PRESETS.map((avatar) => (
                                            <button
                                                key={avatar.id}
                                                type="button"
                                                aria-label={avatar.label}
                                                title={avatar.label}
                                                className={`inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 p-0.5 cursor-pointer transition-transform hover:scale-105 ${
                                                    avatarUrl === avatar.url
                                                        ? 'border-primary ring-2 ring-primary/25'
                                                        : 'border-border hover:border-primary/50'
                                                }`}
                                                onClick={() => setAvatarUrl(avatar.url)}
                                            >
                                                <img src={avatar.url} alt="" className="h-full w-full rounded-full object-cover" />
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <p className="text-xs font-bold uppercase tracking-wider text-text-muted">
                                        Nhân vật 2D ({LEARNER_AVATAR_PRESETS.length})
                                    </p>
                                    <div className="grid grid-cols-5 justify-items-center gap-2">
                                        {LEARNER_AVATAR_PRESETS.map((avatar) => (
                                            <button
                                                key={avatar.id}
                                                type="button"
                                                aria-label={avatar.label}
                                                title={avatar.label}
                                                className={`inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 p-0.5 cursor-pointer transition-transform hover:scale-105 ${
                                                    avatarUrl === avatar.url
                                                        ? 'border-primary ring-2 ring-primary/25'
                                                        : 'border-border hover:border-primary/50'
                                                }`}
                                                onClick={() => setAvatarUrl(avatar.url)}
                                            >
                                                <img src={avatar.url} alt="" className="h-full w-full rounded-full object-cover" />
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Profile frame picker (cosmetic, localStorage; unlock derived from badges) */}
                        <div className="space-y-2">
                            <h3 className="text-sm font-semibold text-text-primary">Khung hồ sơ</h3>
                            <div className="grid grid-cols-3 gap-2">
                                <button
                                    type="button"
                                    onClick={() => onSelectFrame(null)}
                                    className={`flex flex-col items-center rounded-[var(--radius-element)] border p-2 text-center transition-colors ${
                                        selectedFrameKey === null ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                                    }`}
                                >
                                    <span className="flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-border-emphasized text-text-muted"><X size={16} aria-hidden /></span>
                                    <span className="mt-1 text-xs font-bold text-text-primary">Không khung</span>
                                    <span className="text-xs text-text-muted">{selectedFrameKey === null ? 'Đang dùng' : 'Mặc định'}</span>
                                </button>
                                {frameOptions.map((frame) => {
                                    const active = selectedFrameKey === frame.key;
                                    return (
                                        <button
                                            key={frame.key}
                                            type="button"
                                            disabled={!frame.unlocked}
                                            onClick={() => frame.unlocked && onSelectFrame(frame.key)}
                                            className={`flex flex-col items-center rounded-[var(--radius-element)] border p-2 text-center transition-colors ${
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
                                                className={`h-12 w-12 object-contain ${frame.unlocked ? '' : 'grayscale opacity-70'}`}
                                            />
                                            <span className="mt-1 text-xs font-bold text-text-primary">{frame.label}</span>
                                            <span className="text-xs text-text-muted">
                                                {frame.unlocked ? (active ? 'Đang dùng' : 'Đã mở khóa') : 'Chưa mở khóa'}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                <div className="space-y-4">
                    <TextInput label="Tên người dùng" value={username} onChange={setUsername} autoComplete="nickname" size="lg" width="100%" />
                    <TextInput type="email" label="Email" value={email} onChange={setEmail} autoComplete="email" size="lg" width="100%" />
                </div>
            </div>
        </AppDialog>
    );
};

export default EditProfileModal;
