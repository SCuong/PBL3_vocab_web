import { LogOut } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../ui';
import { UserWidget } from './UserWidget';

type NavbarProps = {
    activePage: string;
    onNavigate: (page: string) => void;
    currentUser: any;
    gameData: any;
    onLogout: () => void;
    onStreakClick: () => void;
};

export const Navbar = ({ activePage, onNavigate, currentUser, gameData, onLogout, onStreakClick }: NavbarProps) => {
    const navLinks = [
        { id: 'home', label: 'Home' },
        { id: 'vocabulary', label: 'Vocabulary' },
        { id: 'learning-topics', label: 'Learning' },
        { id: 'leaderboard', label: 'Leaderboard' }
    ];

    return (
        <nav className="sticky top-0 z-50 bg-white/55 backdrop-blur-lg border-b border-purple/20 px-6 py-4 flex items-center justify-between">
            <div
                className="flex items-center gap-2 cursor-pointer"
                onClick={() => onNavigate('home')}
            >
                <span className="font-display font-extrabold text-2xl bg-linear-to-r from-cyan to-pink bg-clip-text text-transparent">VL</span>
                <span className="font-display font-bold text-xl hidden sm:inline">VocabLearning</span>
            </div>

            <div className="hidden md:flex items-center gap-8">
                {navLinks.map(link => (
                    <button
                        key={link.id}
                        onClick={() => onNavigate(link.id)}
                        className={`relative font-medium transition-colors ${activePage === link.id ? 'text-purple' : 'text-text-secondary hover:text-pink'}`}
                    >
                        {link.label}
                        {activePage === link.id && (
                            <motion.div
                                layoutId="nav-active"
                                className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-5 h-[3px] rounded-pill bg-linear-to-r from-cyan to-pink"
                            />
                        )}
                    </button>
                ))}
            </div>

            <div className="flex items-center gap-4">
                {currentUser ? (
                    <div className="flex items-center gap-3">
                        <UserWidget user={currentUser} gameData={gameData} onNavigate={onNavigate} onStreakClick={onStreakClick} />
                        <Button variant="ghost" className="hidden sm:flex" onClick={onLogout}><LogOut size={18} /></Button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" onClick={() => onNavigate('auth')}>Login</Button>
                        <Button variant="primary" onClick={() => onNavigate('register')}>Register</Button>
                    </div>
                )}
            </div>
        </nav>
    );
};
