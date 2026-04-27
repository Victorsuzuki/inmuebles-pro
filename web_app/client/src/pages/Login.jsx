import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Role → redirect path mapping
const ROLE_REDIRECTS = {
    SUPERVISOR: '/dashboard',
    OPERATOR: '/dashboard',
    LIMPIADOR: '/portal/limpieza',
    CLIENTE: '/portal/propiedades',
    PROPIETARIO: '/portal/propietarios'
};

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login, user } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const result = await login(email, password);
        if (result) {
            // Redirect based on role
            const redirectPath = ROLE_REDIRECTS[result.role] || '/';
            navigate(redirectPath);
        } else {
            setError('Email o contraseña incorrectos');
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-900 bg-[url('https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-1.2.1&auto=format&fit=crop&w=1920&q=80')] bg-cover bg-center bg-no-repeat relative">
            <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm"></div>

            <div className="relative px-8 py-10 text-left bg-white/10 backdrop-blur-md shadow-2xl rounded-2xl w-full max-w-md border border-white/20">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold text-white tracking-tight">A&amp;E<span className="text-emerald-400"> Inmobiliere</span></h1>
                    <p className="text-slate-300 mt-2 text-sm">Sistema de Gestión Integral</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-slate-200" htmlFor="email">Correo Electrónico</label>
                        <input type="email" placeholder="nombre@empresa.com"
                            className="w-full px-4 py-3 mt-2 bg-slate-800/50 border border-slate-600 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all placeholder-slate-500"
                            value={email} onChange={(e) => setEmail(e.target.value)} required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-200">Contraseña</label>
                        <input type="password" placeholder="••••••••"
                            className="w-full px-4 py-3 mt-2 bg-slate-800/50 border border-slate-600 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all placeholder-slate-500"
                            value={password} onChange={(e) => setPassword(e.target.value)} required />
                    </div>
                    {error && (
                        <div className="p-3 rounded-lg bg-red-500/20 border border-red-500/50 text-red-200 text-sm flex items-center">
                            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                            {error}
                        </div>
                    )}

                    <button className="w-full px-6 py-3.5 text-white font-semibold bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-lg transition duration-200 hover:shadow-emerald-500/30 transform hover:-translate-y-0.5">
                        Iniciar Sesión
                    </button>
                </form>

                {/* Explore catalog button for guests */}
                <div className="mt-6">
                    <Link to="/" className="w-full flex items-center justify-center gap-2 px-6 py-3 border-2 border-white/10 text-white font-medium rounded-xl hover:bg-white/5 transition-colors">
                        <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                        Explorar Catálogo de Propiedades
                    </Link>
                </div>

                {/* Quick portal access links */}
                <div className="mt-8 pt-6 border-t border-white/10">
                    <p className="text-xs text-slate-400 text-center mb-3 uppercase tracking-wider">Acceso directo a portales</p>
                    <div className="flex gap-2">
                        {(!user || user.role === 'SUPERVISOR' || user.role === 'OPERATOR' || user.role === 'CLIENTE') && (
                            <Link to="/" className="flex-1 text-center px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium transition-colors border border-white/10">
                                🏠 Propiedades
                            </Link>
                        )}
                        {(!user || user.role === 'SUPERVISOR' || user.role === 'OPERATOR' || user.role === 'LIMPIADOR') && (
                            <Link to="/portal/limpieza" className="flex-1 text-center px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium transition-colors border border-white/10">
                                🧹 Limpieza
                            </Link>
                        )}
                        {(!user || user.role === 'SUPERVISOR' || user.role === 'OPERATOR' || user.role === 'PROPIETARIO') && (
                            <Link to="/portal/propietarios" className="flex-1 text-center px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-medium transition-colors border border-white/10">
                                👤 Propietarios
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
