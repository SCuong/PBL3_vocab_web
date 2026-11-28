import { useEffect, useRef, useState } from 'react';
import { Award, Flame, LogOut, Settings, Shield, User } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { DropdownMenu, type DropdownMenuOption } from '@astryxdesign/core/DropdownMenu';
import { Avatar } from '@astryxdesign/core/Avatar';
import { loadProfilePreferences } from '../../utils/profilePreferences';
import { normalizeAvatarUrl } from '../../utils/avatarPresets';
import { captureAvatarHeroOrigin } from '../../utils/avatarHeroTransition';
import { useAppContext } from '../../context/AppContext';
import { ProfileFrameOverlay } from '../profile/ProfileFrameOverlay';
import { LearningSettingsModal } from './LearningSettingsModal';
import { PATHS } from '../../routes/paths';

type UserWidgetProps = {
    user: any;
    gameData: any;
    onStreakClick: () => void;
    onLogout: () => void | Promise<void>;
};

export const UserWidget = ({ user, gameData, onStreakClick, onLogout }: UserWidgetProps) => {
    const navigate = useNavigate();
    const location = useLocation();
    const avatarOriginRef = useRef<HTMLSpanElement | null>(null);
    const { learnerAnalytics, profileFrameKey } = useAppContext();
    const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const isAdmin = user?.role?.toUpperCase() === 'ADMIN';
    // Prefer backend analytics (same source as dashboard/profile); fall back to local game data.
    const streakValue = learnerAnalytics?.streak ?? Number(gameData?.streak ?? 0);
    const xpValue = learnerAnalytics?.xp.totalXp ?? Number(gameData?.xp ?? 0);

    useEffect(() => {
        if (!user?.userId) {
            setAvatarUrl(undefined);
            return;
        }
        const preferences = loadProfilePreferences(user.userId);
        setAvatarUrl(normalizeAvatarUrl(preferences.avatarUrl));
    }, [user]);

    const handleLogout = async () => {
        await onLogout();
        navigate(PATHS.home);
    };

    const items: DropdownMenuOption[] = [
        {
            type: 'section',
            title: user.email || user.username,
            items: [
                {
                    label: 'Hồ sơ cá nhân',
                    icon: <User size={16} />,
                    onClick: () => {
                        if (location.pathname !== PATHS.profile) {
                            captureAvatarHeroOrigin(avatarOriginRef.current);
                        }
                        navigate(PATHS.profile);
                    },
                },
                { label: 'Cài đặt', icon: <Settings size={16} />, onClick: () => setIsSettingsOpen(true) },
            ],
        },
        ...(isAdmin
            ? [{ label: 'Quản trị', icon: <Shield size={16} />, onClick: () => navigate(PATHS.admin) }]
            : []),
        { type: 'divider' },
        { label: 'Đăng xuất', icon: <LogOut size={16} />, variant: 'destructive', onClick: handleLogout },
    ];

    return (
        <div className="flex items-center gap-1">
            <button
                type="button"
                onClick={onStreakClick}
                className="inline-flex h-10 items-center gap-1.5 rounded-[var(--radius-element)] px-3 text-sm font-semibold tabular-nums text-text-primary transition-colors hover:bg-surface-hover"
                aria-label={`Chuỗi ${streakValue} ngày. Xem lịch học`}
            >
                <Flame size={17} className={`text-warning-color ${streakValue > 0 ? 'flame-pulse' : ''}`} aria-hidden />
                {streakValue}
            </button>
            <span
                className="hidden h-10 items-center gap-1.5 px-3 text-sm font-semibold tabular-nums text-text-primary sm:inline-flex"
                aria-label={`${xpValue} XP`}
            >
                <Award size={17} className="text-primary" aria-hidden />
                {xpValue.toLocaleString('vi-VN')}
            </span>

            <DropdownMenu
                items={items}
                alignment="end"
                presentation="adaptive"
                renderTrigger={triggerProps => (
                    <button
                        {...triggerProps}
                        type="button"
                        className="relative ml-1 inline-flex h-10 w-10 items-center justify-center rounded-full outline-offset-2"
                        aria-label="Mở menu tài khoản"
                    >
                        <span
                            ref={avatarOriginRef}
                            className="relative inline-flex h-8 w-8 items-center justify-center"
                        >
                            <Avatar src={avatarUrl} name={user.username} size={32} />
                            <ProfileFrameOverlay frameKey={profileFrameKey} />
                        </span>
                    </button>
                )}
            />
            <LearningSettingsModal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
            />
        </div>
    );
};
