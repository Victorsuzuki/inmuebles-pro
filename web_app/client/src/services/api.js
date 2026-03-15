import axios from 'axios';

const getBaseURL = () => {
    const rawURL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
    // Remove trailing slashes and normalize /api suffix
    let normalized = rawURL.replace(/\/+$/, '');
    if (!normalized.endsWith('/api')) {
        normalized += '/api';
    }
    return normalized;
};

const api = axios.create({
    baseURL: getBaseURL(),
});

// Adjuntar token de autenticación a cada request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Manejar respuestas 401 (token expirado o inválido)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            // Solo redirigir si no estamos ya en /login
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;
