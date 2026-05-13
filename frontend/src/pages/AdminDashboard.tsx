import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { BarChart3, BookOpen, BookText, Shield, Users } from 'lucide-react';
import { PageHeader } from '../components/ui';
import { PATHS } from '../routes/paths';
import AdminOverview from './admin/AdminOverview';
import AdminUsers from './admin/AdminUsers';
import AdminTopics from './admin/AdminTopics';
import AdminVocabulary from './admin/AdminVocabulary';

const NAV_ITEMS = [
    { path: PATHS.adminOverview, label: 'Overview', icon: BarChart3 },
    { path: PATHS.adminUsers, label: 'Users', icon: Users },
    { path: PATHS.adminTopics, label: 'Topics', icon: BookOpen },
    { path: PATHS.adminVocabulary, label: 'Vocabulary', icon: BookText },
] as const;

const AdminDashboard = () => (
    <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <PageHeader
            className="mb-8"
            title="Admin Control Center"
            description="Manage users, topics and learning data"
            icon={(
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-linear-to-br from-primary to-accent">
                    <Shield size={20} className="text-text-on-accent" />
                </div>
            )}
        />

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-8 p-1 glass-card rounded-pill w-fit">
            {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
                <NavLink
                    key={path}
                    to={path}
                    className={({ isActive }) =>
                        `flex items-center gap-2 px-5 py-2.5 rounded-pill text-sm font-display font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-primary ${
                            isActive
                                ? 'text-text-on-accent bg-linear-to-br from-primary to-accent shadow-[0_2px_12px_var(--shadow-color)]'
                                : 'text-text-muted hover:text-primary'
                        }`
                    }
                >
                    <Icon size={15} />
                    {label}
                </NavLink>
            ))}
        </div>

        {/* Content */}
        <Routes>
            <Route index element={<Navigate to="overview" replace />} />
            <Route path="overview" element={<AdminOverview />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="topics" element={<AdminTopics />} />
            <Route path="vocabulary" element={<AdminVocabulary />} />
        </Routes>
    </div>
);

export default AdminDashboard;
