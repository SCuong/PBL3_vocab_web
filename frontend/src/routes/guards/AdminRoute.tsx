import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { PATHS } from '../paths';

export const AdminRoute = ({ children }: { children: ReactNode }) => {
    const { currentUser, isLoading } = useAppContext();

    if (isLoading) return null;
    if (!currentUser || currentUser.role?.toUpperCase() !== 'ADMIN') {
        return <Navigate to={PATHS.home} replace />;
    }
    return <>{children}</>;
};
