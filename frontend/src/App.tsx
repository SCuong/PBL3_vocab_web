import React, { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Link as RouterLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Theme } from '@astryxdesign/core/theme';
import { ToastViewport } from '@astryxdesign/core/Toast';
import { LinkProvider } from '@astryxdesign/core/Link';
import { InternationalizationProvider } from '@astryxdesign/core/i18n';
import viVN from '@astryxdesign/core/locales/vi-VN.generated.js';
import { AnimatePresence, motion } from 'framer-motion';
import { AppProvider, useAppContext } from './context/AppContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { primeAntiforgery } from './services/apiClient';
import { PATHS } from './routes/paths';
import { AdminRoute } from './routes/guards/AdminRoute';
import { ProtectedRoute } from './routes/guards/ProtectedRoute';
import { PublicOnlyRoute } from './routes/guards/PublicOnlyRoute';
import { AuthNavbar, Footer, Navbar, StickyNotesProvider, StickyNotesWidget } from './components/layout';
import { LumoCompanion } from './components/layout/LumoCompanion';
import { StreakModal } from './components/learning/streak';
import { useTheme } from './hooks/useTheme';
import { vocabTheme } from './theme/vocabTheme';
import { Logo } from './assets/Logo';
import Home from './pages/Home';
import { attachGlobalTactileTap } from './utils/sound';

// Route-level code splitting: keep Home (landing/LCP) eager, lazy-load the rest
// and prefetch the primary navigation tabs on idle so tab switching is instant.
const importVocabulary = () => import('./pages/Vocabulary');
const importGames = () => import('./pages/Games');
const importFlashcards = () => import('./pages/Flashcards');
const importLearningTopics = () =>
    import('./components/learning/LearningTopics').then(m => ({ default: m.LearningTopics }));
const importAuth = () => import('./pages/Auth');

const Auth = lazy(importAuth);
const Games = lazy(importGames);
const Flashcards = lazy(importFlashcards);
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const MinitestResult = lazy(() => import('./pages/MinitestResult'));
const MinitestReview = lazy(() => import('./pages/MinitestReview'));
const Profile = lazy(() => import('./pages/Profile'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const VerifyEmailSent = lazy(() => import('./pages/VerifyEmailSent'));
const Vocabulary = lazy(importVocabulary);
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const Privacy = lazy(() => import('./pages/Privacy'));
const NotFound = lazy(() => import('./pages/NotFound'));
const LearningTopics = lazy(importLearningTopics);
const StudySession = lazy(() =>
    import('./components/learning/StudySession').then(m => ({ default: m.StudySession })),
);

const AUTH_PATHS: string[] = [PATHS.login, PATHS.register, PATHS.forgotPassword, PATHS.verifyEmail, PATHS.verifyEmailSent];
const PROTECTED_PREFIXES: string[] = [PATHS.dashboard, PATHS.profile, PATHS.leaderboard, PATHS.admin];

const ROUTE_TITLES: Record<string, string> = {
    [PATHS.home]: 'VocabLearning — Học từ vựng tiếng Anh nhớ lâu mỗi ngày',
    [PATHS.vocabulary]: 'Kho từ vựng · VocabLearning',
    [PATHS.learning]: 'Học tập · VocabLearning',
    [PATHS.learningStudy]: 'Phiên học từ vựng · VocabLearning',
    [PATHS.learningResult]: 'Kết quả kiểm tra · VocabLearning',
    [PATHS.learningReview]: 'Xem lại bài làm · VocabLearning',
    [PATHS.games]: 'Trò chơi Tiếng Anh 1 · VocabLearning',
    [PATHS.flashcards]: 'Thẻ từ ôn nhanh · VocabLearning',
    [PATHS.dashboard]: 'Tổng quan · VocabLearning',
    [PATHS.profile]: 'Hồ sơ cá nhân · VocabLearning',
    [PATHS.leaderboard]: 'Bảng xếp hạng · VocabLearning',
    [PATHS.login]: 'Đăng nhập · VocabLearning',
    [PATHS.register]: 'Đăng ký · VocabLearning',
    [PATHS.forgotPassword]: 'Quên mật khẩu · VocabLearning',
    [PATHS.verifyEmail]: 'Xác minh email · VocabLearning',
    [PATHS.verifyEmailSent]: 'Đã gửi email xác minh · VocabLearning',
    [PATHS.privacy]: 'Chính sách bảo mật · VocabLearning',
};

const getDocumentTitle = (pathname: string) => {
    if (pathname.startsWith(PATHS.admin)) return 'Quản trị · VocabLearning';
    return ROUTE_TITLES[pathname] ?? 'Không tìm thấy trang · VocabLearning';
};

const AppShell = () => {
    const location = useLocation();
    const {
        currentUser,
        gameData,
        fullGameData,
        addToast,
        xpFloats,
        handleLogout,
        showStreakModal,
        setShowStreakModal,
        totalReviewCount,
        isLoading,
    } = useAppContext();

    const isAuthPage = AUTH_PATHS.includes(location.pathname);
    const isProtectedPage = PROTECTED_PREFIXES.some(prefix => location.pathname.startsWith(prefix));

    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        document.title = getDocumentTitle(location.pathname);
    }, [location.pathname]);

    return (
        <div
            className={
                isAuthPage
                    ? 'flex h-dvh flex-col overflow-hidden bg-bg-light text-text-primary'
                    : 'min-h-screen bg-bg-light text-text-primary'
            }
        >
            <AnimatePresence>
                {isLoading && isProtectedPage && (
                    <motion.div
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 z-[1000] bg-bg-primary flex flex-col items-center justify-center gap-4 p-6 text-center"
                        role="status"
                        aria-label="Đang tải VocabLearning"
                    >
                        <Logo size={72} />
                        <div className="h-1 w-24 overflow-hidden rounded-full bg-bg-secondary">
                            <div className="h-full w-1/2 rounded-full bg-primary motion-safe:animate-[loader-slide_1s_var(--ease-in-out)_infinite]" />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {isAuthPage ? (
                <AuthNavbar />
            ) : (
                <Navbar
                    currentUser={currentUser}
                    gameData={gameData}
                    onLogout={handleLogout}
                    onStreakClick={() => setShowStreakModal(true)}
                    reviewCount={totalReviewCount}
                />
            )}

            <main
                className={
                    isAuthPage
                        ? 'min-h-0 flex-1 overflow-y-auto no-scrollbar'
                        : location.pathname === PATHS.home
                          ? ''
                          : location.pathname === PATHS.vocabulary
                            ? 'pb-24 lg:pb-0'
                            : 'pb-24 lg:pb-8'
                }
            >
                <Suspense
                    fallback={
                        <div className="flex min-h-[45vh] items-center justify-center" role="status" aria-label="Đang chuyển trang">
                            <div className="h-1 w-20 overflow-hidden rounded-full bg-bg-secondary">
                                <div className="h-full w-1/2 rounded-full bg-primary motion-safe:animate-[loader-slide_1s_var(--ease-in-out)_infinite]" />
                            </div>
                        </div>
                    }
                >
                    <Routes>
                        <Route
                            path="/"
                            element={
                                <Navigate
                                    to={
                                        currentUser
                                            ? currentUser.role?.toUpperCase() === 'ADMIN'
                                                ? PATHS.adminOverview
                                                : PATHS.learning
                                            : PATHS.home
                                    }
                                    replace
                                />
                            }
                        />
                        <Route path={PATHS.home} element={<PublicOnlyRoute><Home /></PublicOnlyRoute>} />
                        <Route path={PATHS.home2026} element={<Navigate to={PATHS.home} replace />} />
                        <Route path={PATHS.privacy} element={<Privacy />} />
                        <Route
                            path={PATHS.login}
                            element={<PublicOnlyRoute><Auth /></PublicOnlyRoute>}
                        />
                        <Route
                            path={PATHS.register}
                            element={<PublicOnlyRoute><Auth /></PublicOnlyRoute>}
                        />
                        <Route
                            path={PATHS.forgotPassword}
                            element={<PublicOnlyRoute><Auth /></PublicOnlyRoute>}
                        />
                        <Route path="/topics" element={<Navigate to={PATHS.learning} replace />} />
                        <Route path="/learn" element={<Navigate to={PATHS.learning} replace />} />
                        <Route
                            path={PATHS.verifyEmail}
                            element={<PublicOnlyRoute><VerifyEmail /></PublicOnlyRoute>}
                        />
                        <Route
                            path={PATHS.verifyEmailSent}
                            element={<PublicOnlyRoute><VerifyEmailSent /></PublicOnlyRoute>}
                        />
                        <Route
                            path={PATHS.dashboard}
                            element={<ProtectedRoute><Navigate to={PATHS.profile} replace /></ProtectedRoute>}
                        />
                        <Route path={PATHS.vocabulary} element={<Vocabulary />} />
                        <Route path={PATHS.games} element={<Games />} />
                        <Route path={PATHS.flashcards} element={<Flashcards />} />
                        <Route path={PATHS.skills} element={<Navigate to={PATHS.games} replace />} />
                        <Route path={PATHS.learning} element={<LearningTopics />} />
                        <Route path={PATHS.learningStudy} element={<StudySession />} />
                        <Route path={PATHS.learningResult} element={<MinitestResult />} />
                        <Route path={PATHS.learningReview} element={<MinitestReview />} />
                        <Route
                            path={PATHS.profile}
                            element={<ProtectedRoute><Profile /></ProtectedRoute>}
                        />
                        <Route
                            path={PATHS.leaderboard}
                            element={<ProtectedRoute><Leaderboard /></ProtectedRoute>}
                        />
                        <Route
                            path={`${PATHS.admin}/*`}
                            element={<AdminRoute><AdminDashboard /></AdminRoute>}
                        />
                        <Route path="*" element={<NotFound />} />
                    </Routes>
                </Suspense>
            </main>

            {/* Footer on the public landing & legal pages; hidden across the logged-in app. */}
            {(location.pathname === PATHS.home || location.pathname === PATHS.privacy) && <Footer />}

            <AnimatePresence>
                {showStreakModal && (
                    <StreakModal
                        isOpen={showStreakModal}
                        onClose={() => setShowStreakModal(false)}
                        gameData={fullGameData}
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {xpFloats.map(f => (
                    <motion.div
                        key={f.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: -100 }}
                        exit={{ opacity: 0 }}
                        className="fixed left-1/2 top-1/3 -translate-x-1/2 z-[600] pointer-events-none rounded-full bg-primary px-4 py-1.5 text-lg font-bold text-text-on-accent tabular-nums"
                    >
                        +{f.amount} XP
                    </motion.div>
                ))}
            </AnimatePresence>

            <StickyNotesWidget
                isVisible={Boolean(currentUser) && !isAuthPage && !location.pathname.startsWith(PATHS.admin)}
                onNotify={addToast}
            />

            <LumoCompanion
                isVisible={!isAuthPage && location.pathname !== PATHS.home && !location.pathname.startsWith(PATHS.admin)}
            />
        </div>
    );
};

type RouterLinkAdapterProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };
const RouterLinkAdapter = React.forwardRef<HTMLAnchorElement, RouterLinkAdapterProps>(
    ({ href, ...rest }, ref) => <RouterLink ref={ref} to={href} {...rest} />,
);

// Astryx's own labels (close, clear, pagination…) in Vietnamese.
const ASTRYX_MESSAGES = { 'vi-VN': viVN };

const ThemedApp = ({ children }: { children: React.ReactNode }) => {
    const { theme } = useTheme();
    return (
        <InternationalizationProvider locale="vi-VN" messages={ASTRYX_MESSAGES}>
            <Theme theme={vocabTheme} mode={theme}>
                <ToastViewport position="topEnd" inset={{ top: 68, end: 16 }}>
                    <LinkProvider component={RouterLinkAdapter}>{children}</LinkProvider>
                </ToastViewport>
            </Theme>
        </InternationalizationProvider>
    );
};

export default function App() {
    React.useEffect(() => {
        const detachTap = attachGlobalTactileTap();
        primeAntiforgery().catch(() => {});
        const warmNavChunks = () => {
            void importVocabulary();
            void importGames();
            void importFlashcards();
            void importLearningTopics();
            void importAuth();
        };
        const ric = (window as unknown as { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback;
        if (ric) {
            const id = ric(warmNavChunks);
            return () => {
                detachTap();
                (window as unknown as { cancelIdleCallback?: (id: number) => void }).cancelIdleCallback?.(id);
            };
        }
        const timer = window.setTimeout(warmNavChunks, 350);
        return () => {
            detachTap();
            window.clearTimeout(timer);
        };
    }, []);

    return (
        <ErrorBoundary>
            <BrowserRouter>
                <ThemedApp>
                    <AppProvider>
                        <StickyNotesProvider>
                            <AppShell />
                        </StickyNotesProvider>
                    </AppProvider>
                </ThemedApp>
            </BrowserRouter>
        </ErrorBoundary>
    );
}
