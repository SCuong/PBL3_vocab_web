import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { PATHS } from '../paths';

export const PublicOnlyRoute = ({ children }: { children: ReactNode }) => {
    const { currentUser } = useAppContext();
    const location = useLocation();

    if (currentUser) {
        const from = (location.state as { from?: { pathname?: string; search?: string } } | null)?.from;
        const fromPath = from?.pathname;
        if (
            fromPath &&
            fromPath !== '/' &&
            fromPath !== PATHS.home &&
            fromPath !== PATHS.login &&
            fromPath !== PATHS.register &&
            fromPath !== PATHS.forgotPassword
        ) {
            return <Navigate to={`${fromPath}${from?.search ?? ''}`} replace />;
        }
        const defaultTarget =
            currentUser.role?.toUpperCase() === 'ADMIN' ? PATHS.adminOverview : PATHS.learning;
        return <Navigate to={defaultTarget} replace />;
    }
    return <>{children}</>;
};
