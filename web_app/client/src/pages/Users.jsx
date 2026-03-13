import React, { useState, useEffect } from 'react';
import api from '../services/api';

const Users = () => {
    const [users, setUsers] = useState([]);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'OPERATOR'
    });
    const [selectedId, setSelectedId] = useState(null);
    const [feedback, setFeedback] = useState({ type: '', message: '' });

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        if (feedback.message) {
            const timer = setTimeout(() => setFeedback({ type: '', message: '' }), 4000);
            return () => clearTimeout(timer);
        }
    }, [feedback]);

    const fetchUsers = async () => {
        try {
            const response = await api.get('/users');
            setUsers(response.data);
        } catch (error) {
            console.error('Error fetching users', error);
            setFeedback({ type: 'error', message: 'Error al cargar los usuarios' });
        }
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (selectedId) {
                await api.put(`/users/${selectedId}`, formData);
                setFeedback({ type: 'success', message: 'Usuario actualizado correctamente' });
            } else {
                await api.post('/users', formData);
                setFeedback({ type: 'success', message: 'Usuario creado correctamente' });
            }
            setFormData({ name: '', email: '', password: '', role: 'OPERATOR' });
            setSelectedId(null);
            fetchUsers();
        } catch (error) {
            console.error('Error saving user', error);
            const msg = error.response?.data?.message || 'Error al guardar el usuario';
            setFeedback({ type: 'error', message: msg });
        }
    };

    const handleEdit = (user) => {
        setFormData({
            name: user.name,
            email: user.email,
            password: '', // Don't populate password
            role: user.role
        });
        setSelectedId(user.id);
        setFeedback({ type: '', message: '' });
    };

    const handleCancel = () => {
        setFormData({ name: '', email: '', password: '', role: 'OPERATOR' });
        setSelectedId(null);
        setFeedback({ type: '', message: '' });
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Eliminar usuario?')) return;
        try {
            await api.delete(`/users/${id}`);
            setFeedback({ type: 'success', message: 'Usuario eliminado correctamente' });
            fetchUsers();
        } catch (error) {
            console.error('Error deleting user', error);
            const msg = error.response?.data?.message || 'Error al eliminar el usuario';
            setFeedback({ type: 'error', message: msg });
        }
    };

    return (
        <div className="container mx-auto max-w-7xl">
            <h2 className="text-3xl font-bold text-slate-800 tracking-tight mb-8">Administración de Usuarios</h2>

            {feedback.message && (
                <div className={`mb-6 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${feedback.type === 'error'
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-green-50 text-green-700 border border-green-200'
                    }`}>
                    <span>{feedback.type === 'error' ? '⚠️' : '✅'}</span>
                    <span>{feedback.message}</span>
                    <button onClick={() => setFeedback({ type: '', message: '' })} className="ml-auto text-current opacity-60 hover:opacity-100">✕</button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b border-slate-100">
                        <h3 className="text-lg font-bold text-slate-800">Equipo y Usuarios</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Nombre</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Email</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Rol</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {users.length === 0 ? (
                                    <tr><td colSpan="4" className="px-6 py-12 text-center text-slate-400">No hay usuarios registrados todavía</td></tr>
                                ) : users.map(user => (
                                    <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 text-sm font-medium text-slate-900">{user.name}</td>
                                        <td className="px-6 py-4 text-sm text-slate-600">{user.email}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                                                ${user.role === 'SUPERVISOR' ? 'bg-purple-100 text-purple-800' :
                                                    user.role === 'OPERATOR' ? 'bg-blue-100 text-blue-800' :
                                                        user.role === 'LIMPIADOR' ? 'bg-cyan-100 text-cyan-800' :
                                                            user.role === 'CLIENTE' ? 'bg-emerald-100 text-emerald-800' :
                                                                user.role === 'PROPIETARIO' ? 'bg-amber-100 text-amber-800' :
                                                                    'bg-slate-100 text-slate-800'}`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button onClick={() => handleEdit(user)} className="text-slate-400 hover:text-blue-500 mr-2"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                                            <button onClick={() => handleDelete(user.id)} className="text-slate-400 hover:text-red-500"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-fit">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex justify-between items-center">
                        {selectedId ? 'Editar Usuario' : 'Nuevo Usuario'}
                        {selectedId && <button onClick={handleCancel} className="text-xs text-slate-500">Cancelar</button>}
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Nombre</label>
                            <input name="name" value={formData.name} onChange={handleInputChange} className="w-full border-slate-200 rounded-lg focus:ring-purple-500 focus:border-purple-500 shadow-sm transition-all" required />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Email</label>
                            <input name="email" type="email" value={formData.email} onChange={handleInputChange} className="w-full border-slate-200 rounded-lg focus:ring-purple-500 focus:border-purple-500 shadow-sm transition-all" required />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Contraseña</label>
                            <input name="password" type="password" value={formData.password} onChange={handleInputChange} className="w-full border-slate-200 rounded-lg focus:ring-purple-500 focus:border-purple-500 shadow-sm transition-all" placeholder={selectedId ? '(Sin cambios)' : ''} required={!selectedId} />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Rol</label>
                            <select name="role" value={formData.role} onChange={handleInputChange} className="w-full border-slate-200 rounded-lg focus:ring-purple-500 focus:border-purple-500 shadow-sm transition-all">
                                <optgroup label="Administración">
                                    <option value="OPERATOR">Operador</option>
                                    <option value="SUPERVISOR">Supervisor</option>
                                </optgroup>
                                <optgroup label="Portales">
                                    <option value="LIMPIADOR">Limpiador</option>
                                    <option value="CLIENTE">Cliente</option>
                                    <option value="PROPIETARIO">Propietario</option>
                                </optgroup>
                            </select>
                        </div>
                        <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-xl transition-all shadow-lg hover:shadow-xl mt-2 uppercase tracking-widest text-sm">
                            {selectedId ? 'Actualizar' : 'Crear Usuario'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Users;
