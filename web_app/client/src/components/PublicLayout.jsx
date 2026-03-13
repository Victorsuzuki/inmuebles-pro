import React from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Minimal layout for public-facing pages (no login required).
 * Simple header + centered content, no admin sidebar.
 */
const PublicLayout = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
            {/* Header */}
            <header className="bg-white border-b border-slate-200 shadow-sm relative z-30">
                <div className="container mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                            </svg>
                        </div>
                        <span className="text-xl font-bold text-slate-800 tracking-tight">Inmuebles Pro</span>
                    </Link>
                    <nav className="hidden md:flex items-center gap-6">
                        {(!user || user.role === 'SUPERVISOR' || user.role === 'OPERATOR' || user.role === 'CLIENTE') && (
                            <Link to="/" className="text-sm text-slate-600 hover:text-emerald-600 font-medium transition-colors">
                                Propiedades
                            </Link>
                        )}
                        {(user?.role === 'SUPERVISOR' || user?.role === 'OPERATOR' || user?.role === 'LIMPIADOR') && (
                            <Link to="/portal/limpieza" className="text-sm text-slate-600 hover:text-emerald-600 font-medium transition-colors">
                                Limpieza
                            </Link>
                        )}
                        {(user?.role === 'SUPERVISOR' || user?.role === 'OPERATOR' || user?.role === 'PROPIETARIO') && (
                            <Link to="/portal/propietarios" className="text-sm text-slate-600 hover:text-emerald-600 font-medium transition-colors">
                                Propietarios
                            </Link>
                        )}
                    </nav>
                    <div className="flex items-center gap-4">
                        {user ? (
                            <div className="flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                                <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 uppercase">
                                    {user.name?.charAt(0) || 'U'}
                                </div>
                                <span className="text-xs font-semibold text-slate-700 max-w-[100px] truncate">{user.name}</span>
                                <button
                                    onClick={handleLogout}
                                    className="text-slate-400 hover:text-red-500 transition-colors ml-1"
                                    title="Cerrar sesión"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7" /></svg>
                                </button>
                            </div>
                        ) : (
                            <Link to="/login" className="text-sm bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg font-medium transition-colors">
                                Acceso Admin
                            </Link>
                        )}
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className="container mx-auto max-w-7xl px-6 py-8">
                <Outlet />
            </main>

            {/* Footer */}
            <footer className="border-t border-slate-200 bg-white mt-auto">
                <div className="container mx-auto max-w-7xl px-6 py-4 text-center text-xs text-slate-400">
                    © 2026 Inmuebles Pro — Gestión de Propiedades
                </div>
            </footer>
        </div>
    );
};

export default PublicLayout;
