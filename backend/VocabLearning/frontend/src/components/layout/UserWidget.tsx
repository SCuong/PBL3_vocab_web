import { useEffect, useState } from 'react';
import { Award, Flame } from 'lucide-react';
import { loadProfilePreferences } from '../../utils/profilePreferences';
import { normalizeAvatarUrl } from '../../utils/avatarPresets';

type UserWidgetProps = {
    user: any;
    gameData: any;
    onNavigate: (page: string) => void;
    onStreakClick: () => void;
};

export const UserWidget = ({ user, gameData, onNavigate, onStreakClick }: UserWidgetProps) => {
    const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);

    useEffect(() => {
        if (!user?.userId) {
            setAvatarUrl(undefined);
            return;
        }

        const preferences = loadProfilePreferences(user.userId);
        setAvatarUrl(normalizeAvatarUrl(preferences.avatarUrl));
    }, [user?.userId]);

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
            <div
                className="w-8 h-8 rounded-full bg-linear-to-br from-accent to-secondary flex items-center justify-center text-text-primary font-bold cursor-pointer text-xs overflow-hidden"
                onClick={() => onNavigate('profile')}
            >
                {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                    user.username[0].toUpperCase()
                )}
            </div>
        </div>
    );
};
