import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, BookOpen, BookText, Users } from 'lucide-react';
import { PATHS } from '../routes/paths';
import AdminOverview from './admin/AdminOverview';
import AdminUsers from './admin/AdminUsers';
import AdminTopics from './admin/AdminTopics';
import AdminVocabulary from './admin/AdminVocabulary';

const NAV_ITEMS = [
    { path: PATHS.adminOverview, label: 'Tổng quan', icon: BarChart3 },
    { path: PATHS.adminUsers, label: 'Người dùng', icon: Users },
    { path: PATHS.adminTopics, label: 'Chủ đề', icon: BookOpen },
    { path: PATHS.adminVocabulary, label: 'Từ vựng', icon: BookText },
] as const;

const AdminDashboard = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const active = NAV_ITEMS.find(item => location.pathname.startsWith(item.path))?.path ?? PATHS.adminOverview;

    return (
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
            <header className="mb-5">
                <h1 className="text-[1.75rem] font-bold leading-tight tracking-[-0.02em] text-text-primary">Quản trị</h1>
                <p className="mt-1 text-sm text-text-muted">Người dùng, chủ đề, từ vựng và số liệu học tập.</p>
            </header>

            <nav className="mb-6 border-b border-border" aria-label="Khu vực quản trị">
                <div className="-mb-px flex items-center gap-1 overflow-x-auto no-scrollbar">
                    {NAV_ITEMS.map(({ path, label, icon: Icon }) => {
                        const isActive = active === path;
                        return (
                            <button
                                key={path}
                                type="button"
                                onClick={() => navigate(path)}
                                aria-current={isActive ? 'page' : undefined}
                                className={`inline-flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm font-semibold transition-colors cursor-pointer ${
                                    isActive
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-text-muted hover:border-border-emphasized hover:text-text-primary'
                                }`}
                            >
                                <Icon size={16} aria-hidden />
                                <span>{label}</span>
                            </button>
                        );
                    })}
                </div>
            </nav>

            <Routes>
                <Route index element={<Navigate to="overview" replace />} />
                <Route path="overview" element={<AdminOverview />} />
                <Route path="users" element={<AdminUsers />} />
                <Route path="topics" element={<AdminTopics />} />
                <Route path="vocabulary" element={<AdminVocabulary />} />
            </Routes>
        </div>
    );
};

export default AdminDashboard;
