import { useEffect, useRef, useState } from 'react';
import { Award, Flame, Shield, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { loadProfilePreferences } from '../../utils/profilePreferences';
import { normalizeAvatarUrl } from '../../utils/avatarPresets';
import { PATHS } from '../../routes/paths';

type UserWidgetProps = {
    user: any;
    gameData: any;
    onStreakClick: () => void;
};

export const UserWidget = ({ user, gameData, onStreakClick }: UserWidgetProps) => {
    const navigate = useNavigate();
    const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const isAdmin = user?.role?.toUpperCase() === 'ADMIN';

    useEffect(() => {
        if (!user?.userId) {
            setAvatarUrl(undefined);
            return;
        }
        const preferences = loadProfilePreferences(user.userId);
        setAvatarUrl(normalizeAvatarUrl(preferences.avatarUrl));
    }, [user]);

    useEffect(() => {
        if (!dropdownOpen) return;
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [dropdownOpen]);

    return (
        <div className="flex items-center gap-4 bg-white/40 backdrop-blur-md border border-primary/20 rounded-pill px-4 py-1.5 shadow-sm">
            <div
                className="flex items-center gap-1.5 text-orange-500 font-bold cursor-pointer hover:scale-105 transition-transform"
                title="Streak"
                onClick={onStreakClick}
            >
                <Flame size={18} fill="currentColor" className={gameData.streak > 0 ? 'flame-pulse' : ''} />
                <span>{gameData.streak}</span>
            </div>
            <div className="w-px h-4 bg-primary/20" />
            <div className="flex items-center gap-1.5 text-primary font-bold" title="XP">
                <Award size={18} />
                <span>{gameData.xp}</span>
            </div>
            <div className="w-px h-4 bg-primary/20" />

            {/* Avatar with dropdown */}
            <div ref={dropdownRef} className="relative">
                <div
                    className="w-8 h-8 rounded-full bg-linear-to-br from-accent to-secondary flex items-center justify-center text-text-primary font-bold cursor-pointer text-xs overflow-hidden ring-2 ring-transparent hover:ring-primary/40 transition-all"
                    onClick={() => setDropdownOpen(prev => !prev)}
                    title={user.username}
                >
                    {avatarUrl ? (
                        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                        user.username[0].toUpperCase()
                    )}
                </div>

                {dropdownOpen && (
                    <div className="absolute right-0 top-[calc(100%+8px)] w-48 glass-card py-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.15)] z-[60] border border-border rounded-2xl overflow-hidden">
                        <div className="px-4 py-2 border-b border-border/60 mb-1">
                            <p className="text-xs font-display font-bold text-text-primary truncate">{user.username}</p>
                            <p className="text-[10px] text-text-muted truncate">{user.email}</p>
                        </div>

                        <button
                            onClick={() => { navigate(PATHS.profile); setDropdownOpen(false); }}
                            className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2.5 text-text-muted hover:text-text-primary hover:bg-primary/[0.06] transition-colors"
                        >
                            <User size={14} />
                            Hồ sơ cá nhân
                        </button>

                        {isAdmin && (
                            <>
                                <div className="mx-3 my-1 h-px bg-border" />
                                <button
                                    onClick={() => { navigate(PATHS.admin); setDropdownOpen(false); }}
                                    className="w-full text-left px-4 py-2.5 text-sm flex items-center gap-2.5 font-display font-bold transition-colors"
                                    style={{ color: 'var(--color-primary)' }}
                                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(147,51,234,0.06)')}
                                    onMouseLeave={e => (e.currentTarget.style.background = '')}
                                >
                                    <Shield size={14} />
                                    Admin Dashboard
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
