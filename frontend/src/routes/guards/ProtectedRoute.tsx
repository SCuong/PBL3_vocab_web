import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { PATHS } from '../paths';

export const ProtectedRoute = ({ children }: { children: ReactNode }) => {
    const { currentUser, isLoading } = useAppContext();
    const location = useLocation();

    if (isLoading) return null;
    if (!currentUser) {
        return <Navigate to={PATHS.login} state={{ from: location }} replace />;
    }
    return <>{children}</>;
};
