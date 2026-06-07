import React, { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { AppProvider, useAppContext } from './context/AppContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { primeAntiforgery } from './services/apiClient';
import { PATHS } from './routes/paths';
import { AdminRoute } from './routes/guards/AdminRoute';
import { ProtectedRoute } from './routes/guards/ProtectedRoute';
import { PublicOnlyRoute } from './routes/guards/PublicOnlyRoute';
import { AuthNavbar, Footer, Navbar, StickyNotesProvider, StickyNotesWidget } from './components/layout';
import { LearningTopics } from './components/learning/LearningTopics';
import { StudySession } from './components/learning/StudySession';
import { StreakModal } from './components/learning/streak';
import { Button, Toast } from './components/ui';
import { Logo } from './assets/Logo';
import { AdminDashboard, Auth, Home, LearnerDashboard, Leaderboard, MinitestResult, MinitestReview, Profile, VerifyEmail, VerifyEmailSent, Vocabulary } from './pages';

const AUTH_PATHS: string[] = [PATHS.login, PATHS.register, PATHS.verifyEmail, PATHS.verifyEmailSent];

const AppShell = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const {
        currentUser,
        gameData,
        fullGameData,
        addToast,
        removeToast,
        toasts,
        xpFloats,
        handleLogout,
        showStreakModal,
        setShowStreakModal,
        totalReviewCount,
        isLoading,
    } = useAppContext();

    const isAuthPage = AUTH_PATHS.includes(location.pathname);

    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }, [location.pathname]);

    return (
        <div className="min-h-screen bg-bg-light text-text-primary">
            <AnimatePresence>
                {isLoading && (
                    <motion.div
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[1000] bg-bg-primary flex flex-col items-center justify-center p-6 text-center"
                    >
                        <motion.div
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1.1 }}
                            transition={{ repeat: Infinity, duration: 1, repeatType: 'reverse' }}
                        >
                            <Logo size={100} />
                        </motion.div>
                        <div className="font-display font-bold text-2xl text-cyan tracking-wide">
                            VocabLearning
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

            <main className={isAuthPage ? '' : 'pb-24'}>
                <AnimatePresence mode="wait">
                    <motion.div
                        key={location.pathname}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="w-full"
                    >
                        <Routes>
                            <Route path="/" element={<Navigate to={PATHS.home} replace />} />
                            <Route path={PATHS.home} element={<Home />} />
                            <Route
                                path={PATHS.login}
                                element={<PublicOnlyRoute><Auth /></PublicOnlyRoute>}
                            />
                            <Route
                                path={PATHS.register}
                                element={<PublicOnlyRoute><Auth /></PublicOnlyRoute>}
                            />
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
                                element={<ProtectedRoute><LearnerDashboard /></ProtectedRoute>}
                            />
                            <Route path={PATHS.vocabulary} element={<Vocabulary />} />
                            <Route path={PATHS.learning} element={<LearningTopics />} />
                            <Route
                                path={PATHS.learningStudy}
                                element={<ProtectedRoute><StudySession /></ProtectedRoute>}
                            />
                            <Route
                                path={PATHS.learningResult}
                                element={<ProtectedRoute><MinitestResult /></ProtectedRoute>}
                            />
                            <Route
                                path={PATHS.learningReview}
                                element={<ProtectedRoute><MinitestReview /></ProtectedRoute>}
                            />
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
                            <Route path="*" element={<Navigate to={PATHS.home} replace />} />
                        </Routes>
                    </motion.div>
                </AnimatePresence>

                {!currentUser && location.pathname === PATHS.home && (
                    <motion.div
                        initial={{ y: 100 }}
                        animate={{ y: 0 }}
                        className="fixed bottom-3 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-1.5rem)] max-w-2xl bg-surface/95 backdrop-blur-xl border-2 border-primary/30 p-3 rounded-card shadow-2xl flex items-center justify-between gap-2 sm:bottom-8 sm:w-[90%] sm:gap-6 sm:p-6"
                    >
                        <div className="flex items-center gap-3 sm:gap-4">
                            <div className="hidden w-14 h-14 rounded-full bg-linear-to-br from-primary to-secondary items-center justify-center text-text-on-accent text-3xl shadow-lg sm:flex">
                                🎁
                            </div>
                            <div>
                                <h4 className="signup-banner-title text-xs font-bold text-text-primary sm:mb-1 sm:text-xl">
                                    Đăng ký để lưu tiến độ!
                                </h4>
                                <p className="hidden text-sm text-text-muted sm:block">
                                    Nhận ngay +100 XP thưởng và mở khóa Streak 🔥
                                </p>
                            </div>
                        </div>
                        <Button
                            variant="primary"
                            className="signup-banner-button shrink-0 justify-center px-4 text-xs sm:px-8 sm:text-base"
                            onClick={() => navigate(PATHS.register)}
                        >
                            Tham gia Ngay <ChevronRight size={18} />
                        </Button>
                    </motion.div>
                )}
            </main>

            {/* Footer only on the public landing page; hidden across the logged-in app. */}
            {location.pathname === PATHS.home && <Footer />}

            <div className="toast-container fixed top-24 right-6 z-[500] pointer-events-none">
                <AnimatePresence>
                    {toasts.map(toast => (
                        <Toast
                            key={toast.id}
                            message={toast.message}
                            type={toast.type}
                            onClose={() => removeToast(toast.id)}
                        />
                    ))}
                </AnimatePresence>
            </div>

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
                        className="fixed left-1/2 -translate-x-1/2 z-[600] pointer-events-none font-display font-extrabold text-primary text-2xl drop-shadow-md"
                    >
                        +{f.amount} XP
                    </motion.div>
                ))}
            </AnimatePresence>

            <StickyNotesWidget
                isVisible={Boolean(currentUser) && !isAuthPage}
                onNotify={addToast}
            />
        </div>
    );
};

export default function App() {
    React.useEffect(() => {
        primeAntiforgery().catch(() => {});
    }, []);

    return (
        <ErrorBoundary>
            <BrowserRouter>
                <AppProvider>
                    <StickyNotesProvider>
                        <AppShell />
                    </StickyNotesProvider>
                </AppProvider>
            </BrowserRouter>
        </ErrorBoundary>
    );
}
