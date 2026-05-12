import { useState } from 'react';
import { LogOut, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, ThemeToggle } from '../ui';
import { UserWidget } from './UserWidget';
import { Logo } from '../../assets/Logo';
import { PATHS } from '../../routes/paths';

type NavbarProps = {
    currentUser: any;
    gameData: any;
    onLogout: () => void;
    onStreakClick: () => void;
    reviewCount?: number;
};

const navLinks = [
    { path: PATHS.home, label: 'Trang chủ' },
    { path: PATHS.dashboard, label: 'Dashboard', authOnly: true },
    { path: PATHS.vocabulary, label: 'Từ vựng' },
    { path: PATHS.learning, label: 'Học tập' },
    { path: PATHS.leaderboard, label: 'Bảng xếp hạng' },
];

export const Navbar = ({ currentUser, gameData, onLogout, onStreakClick, reviewCount = 0 }: NavbarProps) => {
    const [mobileOpen, setMobileOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const activePath = location.pathname;

    const isAdmin = currentUser?.role?.toUpperCase() === 'ADMIN';
    const isOnAdmin = activePath.startsWith('/admin');

    return (
        <nav
            className="sticky top-0 z-50 border-b border-border bg-bg-light/85 backdrop-blur-xl"
        >
            <div className="max-w-[1200px] mx-auto px-8 h-16 flex items-center gap-8">
                <button
                    onClick={() => navigate(PATHS.home)}
                    className="flex items-center gap-3 flex-shrink-0 cursor-pointer transition-all duration-200 hover:opacity-85 active:scale-95"
                    aria-label="VocabLearning home"
                >
                    <Logo size={36} />
                    <span className="font-display text-lg font-bold text-text-primary tracking-normal hidden sm:inline">
                        VocabLearning
                    </span>
                </button>

                {/* Desktop nav */}
                <div className="hidden md:flex items-center gap-1 ml-4">
                    {navLinks.filter(link => !link.authOnly || currentUser).map(link => (
                        <button
                            key={link.path}
                            onClick={() => navigate(link.path)}
                            className={`relative text-sm font-medium px-3 py-2 rounded-[0.625rem] transition-colors cursor-pointer ${
                                activePath === link.path
                                    ? 'text-primary font-semibold'
                                    : 'text-text-muted hover:text-text-primary hover:bg-primary-light'
                            }`}
                        >
                            <span className="flex items-center gap-1.5">
                                {link.label}
                                {link.path === PATHS.learning && currentUser && reviewCount > 0 && (
                                    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-purple text-text-on-accent text-[10px] font-bold leading-none">
                                        {reviewCount > 99 ? '99+' : reviewCount}
                                    </span>
                                )}
                            </span>
                            {activePath === link.path && (
                                <motion.div
                                    layoutId="nav-active"
                                    className="absolute -bottom-px left-3 right-3 h-0.5 bg-primary rounded-full"
                                />
                            )}
                        </button>
                    ))}

                    {/* Admin nav link — ADMIN role only */}
                    {isAdmin && (
                        <button
                            onClick={() => navigate(PATHS.admin)}
                            className={`relative text-sm font-medium px-3 py-2 rounded-[0.625rem] transition-colors cursor-pointer flex items-center gap-1.5 ${
                                isOnAdmin
                                    ? 'text-primary font-semibold'
                                    : 'text-text-muted hover:text-text-primary hover:bg-primary/10'
                            }`}
                        >
                            <Shield size={13} />
                            Quản trị
                            {isOnAdmin && (
                                <motion.div
                                    layoutId="nav-active"
                                    className="absolute -bottom-px left-3 right-3 h-0.5 bg-primary rounded-full"
                                />
                            )}
                        </button>
                    )}
                </div>

                {/* Desktop right side */}
                <div className="hidden md:flex items-center gap-3 ml-auto">
                    <ThemeToggle />
                    {currentUser ? (
                        <div className="flex items-center gap-3">
                            <UserWidget
                                user={currentUser}
                                gameData={gameData}
                                onStreakClick={onStreakClick}
                            />
                            <Button variant="ghost" className="!p-2 !min-w-0" onClick={onLogout}>
                                <LogOut size={18} />
                            </Button>
                        </div>
                    ) : (
                        <>
                            <button
                                onClick={() => navigate(PATHS.login)}
                                className="text-sm font-semibold text-text-muted px-4 py-2 rounded-full hover:text-text-primary hover:bg-primary-light transition-colors cursor-pointer"
                            >
                                Đăng nhập
                            </button>
                            <button
                                onClick={() => navigate(PATHS.register)}
                                className="text-sm font-bold text-text-on-accent bg-primary px-5 py-2 rounded-full transition-all hover:bg-primary-hover hover:-translate-y-px cursor-pointer shadow-[0_2px_12px_var(--shadow-color)]"
                            >
                                Đăng ký
                            </button>
                        </>
                    )}
                </div>

                <ThemeToggle className="ml-auto md:hidden" />

                {/* Mobile hamburger */}
                <button
                    className="md:hidden flex flex-col gap-[5px] p-2 cursor-pointer rounded-lg hover:bg-primary/10 transition-colors"
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
                    {navLinks.filter(link => !link.authOnly || currentUser).map(link => (
                        <button
                            key={link.path}
                            onClick={() => { navigate(link.path); setMobileOpen(false); }}
                            className={`text-left px-4 py-3 rounded-xl text-sm font-medium transition-colors cursor-pointer flex items-center gap-1.5 ${
                                activePath === link.path ? 'text-primary bg-primary-light font-semibold' : 'text-text-muted hover:bg-primary-light'
                            }`}
                        >
                            {link.label}
                            {link.path === PATHS.learning && currentUser && reviewCount > 0 && (
                                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-purple text-text-on-accent text-[10px] font-bold leading-none">
                                    {reviewCount > 99 ? '99+' : reviewCount}
                                </span>
                            )}
                        </button>
                    ))}

                    {/* Mobile admin link — ADMIN role only */}
                    {isAdmin && (
                        <>
                            <div className="mx-2 my-1 h-px bg-border" />
                            <button
                                onClick={() => { navigate(PATHS.admin); setMobileOpen(false); }}
                                className={`text-left px-4 py-3 rounded-xl text-sm font-display font-bold transition-colors cursor-pointer flex items-center gap-2 ${
                                    isOnAdmin
                                        ? 'text-primary bg-primary/10'
                                        : 'text-primary/80 hover:bg-primary/10'
                                }`}
                            >
                                <Shield size={15} />
                                Admin Dashboard
                            </button>
                        </>
                    )}

                    <div className="flex items-center gap-2 mt-2 px-4">
                        {currentUser ? (
                            <Button variant="ghost" onClick={() => { onLogout(); setMobileOpen(false); }}>
                                <LogOut size={18} /> Đăng xuất
                            </Button>
                        ) : (
                            <>
                                <button
                                    onClick={() => { navigate(PATHS.login); setMobileOpen(false); }}
                                    className="text-sm font-semibold text-text-muted px-4 py-2 rounded-full hover:bg-primary-light cursor-pointer transition-colors"
                                >
                                    Đăng nhập
                                </button>
                                <button
                                    onClick={() => { navigate(PATHS.register); setMobileOpen(false); }}
                                    className="text-sm font-bold text-text-on-accent bg-primary px-5 py-2 rounded-full cursor-pointer transition-all hover:bg-primary-hover"
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
