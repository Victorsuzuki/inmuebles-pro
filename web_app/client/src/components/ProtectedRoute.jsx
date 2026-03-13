import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Portal-role users should never see admin, redirect them to their portal
const PORTAL_REDIRECTS = {
    LIMPIADOR: '/portal/limpieza',
    CLIENTE: '/portal/propiedades',
    PROPIETARIO: '/portal/propietarios'
};

const ProtectedRoute = ({ children, roles }) => {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return <div>Loading...</div>;
    }

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // If this user has a portal role and is trying to access admin, redirect to their portal
    if (PORTAL_REDIRECTS[user.role] && !roles) {
        return <Navigate to={PORTAL_REDIRECTS[user.role]} replace />;
    }

    if (roles && !roles.includes(user.role)) {
        return <Navigate to="/unauthorized" replace />;
    }

    return children;
};

export default ProtectedRoute;
