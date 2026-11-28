import { useLayoutEffect, useRef, useState } from 'react';
import { BookOpen, Gamepad2, GraduationCap, Layers, Menu, Shield, Trophy, User, X } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button as AstryxButton } from '@astryxdesign/core/Button';
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

const navLinks: Array<{ path: string; label: string; authOnly?: boolean; guestOnly?: boolean }> = [
    { path: PATHS.home, label: 'Trang chủ', guestOnly: true },
    { path: PATHS.learning, label: 'Hành trình' },
    { path: PATHS.games, label: 'Trò chơi' },
    { path: PATHS.flashcards, label: 'Thẻ từ' },
    { path: PATHS.vocabulary, label: 'Từ điển' },
    { path: PATHS.leaderboard, label: 'Xếp hạng', authOnly: true },
];

/** Phone tab bar for signed-in learners: the study loop stays one tap away. */
const tabLinks = [
    { path: PATHS.learning, label: 'Hành trình', icon: GraduationCap },
    { path: PATHS.games, label: 'Trò chơi', icon: Gamepad2 },
    { path: PATHS.flashcards, label: 'Thẻ từ', icon: Layers },
    { path: PATHS.vocabulary, label: 'Từ điển', icon: BookOpen },
    { path: PATHS.profile, label: 'Hồ sơ', icon: User },
];

const CountBadge = ({ count }: { count: number }) => (
    <span className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold leading-none tabular-nums text-text-on-accent">
        {count > 99 ? '99+' : count}
    </span>
);

export const Navbar = ({ currentUser, gameData, onLogout, onStreakClick, reviewCount = 0 }: NavbarProps) => {
    const [mobileOpen, setMobileOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const activePath = location.pathname;

    const isAdmin = currentUser?.role?.toUpperCase() === 'ADMIN';
    const isOnAdmin = activePath.startsWith('/admin');
    const isOnLearning = activePath === PATHS.learning || activePath.startsWith(`${PATHS.learning}/`);

    // Active pill indicator: measured from layout so it glides horizontally behind the active tab.
    const visibleLinks = navLinks.filter(link => {
        if (link.authOnly && !currentUser) return false;
        if (link.guestOnly && currentUser) return false;
        return true;
    });
    const brandTarget = currentUser ? (isAdmin ? PATHS.adminOverview : PATHS.learning) : PATHS.home;
    const activeKey = isOnAdmin
        ? 'admin'
        : isOnLearning
          ? PATHS.learning
          : visibleLinks.some(l => l.path === activePath)
            ? activePath
            : null;
    const itemRefs = useRef<Record<string, HTMLButtonElement | null>>({});
    const [indicator, setIndicator] = useState({ left: 0, width: 0, ready: false });
    const [animate, setAnimate] = useState(false);

    useLayoutEffect(() => {
        const measure = () => {
            const target = activeKey ? itemRefs.current[activeKey] : null;
            if (!target || target.offsetParent === null) {
                setIndicator({ left: 0, width: 0, ready: false });
                return;
            }
            setIndicator({ left: target.offsetLeft, width: target.offsetWidth, ready: true });
        };
        measure();
        const raf = requestAnimationFrame(() => setAnimate(true));
        window.addEventListener('resize', measure);
        return () => {
            window.removeEventListener('resize', measure);
            cancelAnimationFrame(raf);
        };
    }, [activeKey, currentUser, isAdmin, reviewCount]);

    const go = (path: string) => {
        navigate(path);
        setMobileOpen(false);
    };

    const linkClass = (active: boolean) =>
        `relative z-10 inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-sm transition-colors cursor-pointer ${
            active ? 'font-semibold text-text-primary' : 'font-medium text-text-muted hover:text-text-primary'
        }`;

    return (
        <>
            <nav
                className="sticky top-0 z-50 border-b border-border/80 bg-surface/95 will-change-transform"
                aria-label="Điều hướng chính"
            >
                <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
                    <button
                        type="button"
                        onClick={() => go(brandTarget)}
                        className="flex shrink-0 items-center gap-2 rounded-[var(--radius-element)] cursor-pointer"
                        aria-label={currentUser ? 'VocabLearning, tổng quan' : 'VocabLearning, trang chủ'}
                    >
                        <Logo size={28} />
                        <span className={`text-[16px] font-bold tracking-[-0.015em] text-text-primary ${currentUser ? 'hidden sm:inline' : 'inline'}`}>
                            VocabLearning
                        </span>
                    </button>

                    {/* Desktop segmented pill navigation */}
                    <div className="relative hidden items-center rounded-full border border-border bg-bg-secondary p-1 lg:flex">
                        <span
                            aria-hidden="true"
                            className="pointer-events-none absolute inset-y-1 left-0 rounded-full border border-[light-dark(var(--border-strong),#655494)] bg-[light-dark(var(--surface),#312852)] shadow-[0_1px_3px_var(--shadow-color)]"
                            style={{
                                width: indicator.width,
                                transform: `translateX(${indicator.left}px)`,
                                opacity: indicator.ready ? 1 : 0,
                                transition: animate
                                    ? 'transform 320ms var(--ease-out), width 320ms var(--ease-out), opacity 180ms var(--ease-out)'
                                    : 'none',
                            }}
                        />
                        {visibleLinks.map(link => {
                            const isActive = activeKey === link.path;
                            return (
                                <button
                                    key={link.path}
                                    type="button"
                                    ref={el => { itemRefs.current[link.path] = el; }}
                                    onClick={() => go(link.path)}
                                    className={linkClass(isActive)}
                                    aria-current={isActive ? 'page' : undefined}
                                >
                                    {link.label}
                                    {link.path === PATHS.learning && currentUser && reviewCount > 0 && <CountBadge count={reviewCount} />}
                                </button>
                            );
                        })}
                        {isAdmin && (
                            <button
                                type="button"
                                ref={el => { itemRefs.current.admin = el; }}
                                onClick={() => go(PATHS.admin)}
                                className={linkClass(isOnAdmin)}
                                aria-current={isOnAdmin ? 'page' : undefined}
                            >
                                <Shield size={14} aria-hidden /> Quản trị
                            </button>
                        )}
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                        <ThemeToggle />
                        {currentUser ? (
                            <UserWidget user={currentUser} gameData={gameData} onStreakClick={onStreakClick} onLogout={onLogout} />
                        ) : (
                            <>
                                <div className="hidden items-center gap-1.5 lg:flex">
                                    <Button variant="ghost" size="sm" onClick={() => go(PATHS.login)}>Đăng nhập</Button>
                                    <Button size="sm" onClick={() => go(PATHS.register)}>Đăng ký</Button>
                                </div>
                                <AstryxButton
                                    className="lg:hidden"
                                    variant="ghost"
                                    size="lg"
                                    isIconOnly
                                    icon={mobileOpen ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}
                                    label={mobileOpen ? 'Đóng menu' : 'Mở menu'}
                                    aria-expanded={mobileOpen}
                                    onClick={() => setMobileOpen(open => !open)}
                                />
                            </>
                        )}
                    </div>
                </div>

                {/* Guest menu on phones */}
                {!currentUser && mobileOpen && (
                    <div className="animate-slide-down border-t border-border bg-bg-light px-4 pb-4 pt-2 lg:hidden">
                        {navLinks.filter(link => !link.authOnly).map(link => (
                            <button
                                key={link.path}
                                type="button"
                                onClick={() => go(link.path)}
                                className={`flex min-h-12 w-full items-center rounded-[var(--radius-element)] px-3 text-left text-[15px] ${
                                    activePath === link.path ? 'bg-primary-light font-semibold text-primary' : 'font-medium text-text-primary'
                                }`}
                            >
                                {link.label}
                            </button>
                        ))}
                        <div className="mt-3 grid grid-cols-2 gap-2">
                            <Button variant="secondary" fullWidth onClick={() => go(PATHS.login)}>Đăng nhập</Button>
                            <Button fullWidth onClick={() => go(PATHS.register)}>Đăng ký</Button>
                        </div>
                    </div>
                )}
            </nav>

            {currentUser && (
                <nav
                    className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
                    aria-label="Điều hướng học tập"
                >
                    <div className={`mx-auto grid h-16 max-w-lg ${isAdmin ? 'grid-cols-6' : 'grid-cols-5'}`}>
                        {[
                            ...tabLinks,
                            ...(isAdmin ? [{ path: PATHS.admin, label: 'Quản trị', icon: Shield }] : []),
                        ].map(({ path, label, icon: Icon }) => {
                            const active =
                                activePath === path ||
                                (path === PATHS.learning && activePath.startsWith('/learning')) ||
                                (path === PATHS.admin && isOnAdmin);
                            return (
                                <button
                                    key={path}
                                    type="button"
                                    onClick={() => go(path)}
                                    aria-current={active ? 'page' : undefined}
                                    className={`relative flex flex-col items-center justify-center gap-1 text-[11px] transition-colors ${
                                        active ? 'font-semibold text-primary' : 'font-medium text-text-muted'
                                    }`}
                                >
                                    <span className="relative">
                                        <Icon size={21} strokeWidth={active ? 2.25 : 1.75} aria-hidden />
                                        {path === PATHS.learning && reviewCount > 0 && (
                                            <span className="absolute -right-3 -top-1.5"><CountBadge count={reviewCount} /></span>
                                        )}
                                    </span>
                                    {label}
                                </button>
                            );
                        })}
                    </div>
                </nav>
            )}
        </>
    );
};
