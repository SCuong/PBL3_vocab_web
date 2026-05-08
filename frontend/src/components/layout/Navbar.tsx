import { useState } from 'react';
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
    reviewCount?: number;
};

export const Navbar = ({ activePage, onNavigate, currentUser, gameData, onLogout, onStreakClick, reviewCount = 0 }: NavbarProps) => {
    const [mobileOpen, setMobileOpen] = useState(false);

    const navLinks = [
        { id: 'home', label: 'Trang chủ' },
        { id: 'vocabulary', label: 'Từ vựng' },
        { id: 'learning-topics', label: 'Học tập' },
        { id: 'leaderboard', label: 'Bảng xếp hạng' }
    ];

    return (
        <nav
            className="sticky top-0 z-50 border-b border-border"
            style={{
                background: 'color-mix(in srgb, var(--color-bg-light) 85%, transparent)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
            }}
        >
            <div className="max-w-[1200px] mx-auto px-8 h-16 flex items-center gap-8">
                {/* Logo */}
                <button
                    onClick={() => onNavigate('home')}
                    className="flex items-center gap-3 flex-shrink-0 cursor-pointer transition-all duration-200 hover:opacity-85 active:scale-95"
                    aria-label="VocabLearning home"
                >
                    <span
                        className="font-display text-2xl font-extrabold leading-none"
                        style={{
                            background: 'linear-gradient(90deg, var(--color-cyan) 0%, #e879f9 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                        }}
                    >
                        VL
                    </span>
                    <span className="font-display text-lg font-bold text-text-primary tracking-tight hidden sm:inline">
                        VocabLearning
                    </span>
                </button>

                {/* Nav Links (desktop) */}
                <div className="hidden md:flex items-center gap-1 ml-4">
                    {navLinks.map(link => (
                        <button
                            key={link.id}
                            onClick={() => onNavigate(link.id)}
                            className={`relative text-sm font-medium px-3 py-2 rounded-[0.625rem] transition-colors cursor-pointer ${
                                activePage === link.id
                                    ? 'text-primary font-semibold'
                                    : 'text-text-muted hover:text-text-primary hover:bg-primary-light'
                            }`}
                        >
                            <span className="flex items-center gap-1.5">
                                {link.label}
                                {link.id === 'learning-topics' && currentUser && reviewCount > 0 && (
                                    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-purple text-white text-[10px] font-bold leading-none">
                                        {reviewCount > 99 ? '99+' : reviewCount}
                                    </span>
                                )}
                            </span>
                            {activePage === link.id && (
                                <motion.div
                                    layoutId="nav-active"
                                    className="absolute -bottom-px left-3 right-3 h-0.5 bg-primary rounded-full"
                                />
                            )}
                        </button>
                    ))}
                </div>

                {/* Right actions */}
                <div className="hidden md:flex items-center gap-3 ml-auto">
                    {currentUser ? (
                        <div className="flex items-center gap-3">
                            <UserWidget user={currentUser} gameData={gameData} onNavigate={onNavigate} onStreakClick={onStreakClick} />
                            <Button variant="ghost" className="!p-2 !min-w-0" onClick={onLogout}>
                                <LogOut size={18} />
                            </Button>
                        </div>
                    ) : (
                        <>
                            <button
                                onClick={() => onNavigate('auth')}
                                className="text-sm font-semibold text-text-muted px-4 py-2 rounded-full hover:text-text-primary hover:bg-primary-light transition-colors cursor-pointer"
                            >
                                Đăng nhập
                            </button>
                            <button
                                onClick={() => onNavigate('register')}
                                className="text-sm font-bold text-white bg-primary px-5 py-2 rounded-full transition-all hover:bg-primary-hover hover:-translate-y-px cursor-pointer"
                                style={{ boxShadow: '0 2px 12px rgba(147,51,234,0.3)' }}
                            >
                                Đăng ký
                            </button>
                        </>
                    )}
                </div>

                {/* Hamburger (mobile) */}
                <button
                    className="md:hidden flex flex-col gap-[5px] p-2 ml-auto cursor-pointer rounded-lg hover:bg-primary/10 transition-colors"
                    onClick={() => setMobileOpen(!mobileOpen)}
                    aria-label="Mở menu"
                    aria-expanded={mobileOpen}
                >
                    <span className={`block w-[22px] h-0.5 bg-text-primary rounded transition-transform ${mobileOpen ? 'rotate-45 translate-y-[7px]' : ''}`} />
                    <span className={`block w-[22px] h-0.5 bg-text-primary rounded transition-opacity ${mobileOpen ? 'opacity-0' : ''}`} />
                    <span className={`block w-[22px] h-0.5 bg-text-primary rounded transition-transform ${mobileOpen ? '-rotate-45 -translate-y-[7px]' : ''}`} />
                </button>
            </div>

            {/* Mobile menu */}
            {mobileOpen && (
                <div className="md:hidden border-t border-border bg-bg-light p-4 flex flex-col gap-2 animate-slide-down">
                    {navLinks.map(link => (
                        <button
                            key={link.id}
                            onClick={() => { onNavigate(link.id); setMobileOpen(false); }}
                            className={`text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                                activePage === link.id ? 'text-primary bg-primary-light font-semibold' : 'text-text-muted hover:bg-primary-light'
                            }`}
                        >
                            {link.label}
                            {link.id === 'learning-topics' && currentUser && reviewCount > 0 && (
                                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-purple text-white text-[10px] font-bold leading-none">
                                    {reviewCount > 99 ? '99+' : reviewCount}
                                </span>
                            )}
                        </button>
                    ))}
                    <div className="flex items-center gap-2 mt-2 px-4">
                        {currentUser ? (
                            <Button variant="ghost" onClick={() => { onLogout(); setMobileOpen(false); }}>
                                <LogOut size={18} /> Đăng xuất
                            </Button>
                        ) : (
                            <>
                                <button
                                    onClick={() => { onNavigate('auth'); setMobileOpen(false); }}
                                    className="text-sm font-semibold text-text-muted px-4 py-2 rounded-full hover:bg-primary-light cursor-pointer transition-colors"
                                >
                                    Đăng nhập
                                </button>
                                <button
                                    onClick={() => { onNavigate('register'); setMobileOpen(false); }}
                                    className="text-sm font-bold text-white bg-primary px-5 py-2 rounded-full cursor-pointer transition-all hover:bg-primary-hover"
                                >
                                    Đăng ký
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
};
