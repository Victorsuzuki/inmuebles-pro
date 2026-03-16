import React, { useState, useEffect } from 'react';
import api from '../services/api';

const Clients = () => {
    const [clients, setClients] = useState([]);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        dni: '',
        status: 'Activo',
        notes: '',
        nationality: '',
        passport: '',
        address: ''
    });
    const [selectedId, setSelectedId] = useState(null);

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        try {
            const response = await api.get('/clients');
            setClients(response.data);
        } catch (error) { console.error('Error fetching clients', error); }
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (selectedId) {
                await api.put(`/clients/${selectedId}`, formData);
            } else {
                await api.post('/clients', formData);
            }
            setFormData({ name: '', email: '', phone: '', dni: '', status: 'Activo', notes: '', nationality: '', passport: '', address: '' });
            setSelectedId(null);
            fetchClients();
        } catch (error) { console.error('Error saving client', error); }
    };

    const handleEdit = (client) => {
        setFormData({
            name: client.name,
            email: client.email,
            phone: client.phone,
            dni: client.dni,
            status: client.status,
            notes: client.notes,
            nationality: client.nationality || '',
            passport: client.passport || '',
            address: client.address || ''
        });
        setSelectedId(client.id);
    };

    const handleCancel = () => {
        setFormData({ name: '', email: '', phone: '', dni: '', status: 'Activo', notes: '', nationality: '', passport: '', address: '' });
        setSelectedId(null);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Eliminar cliente?')) return;
        try {
            await api.delete(`/clients/${id}`);
            fetchClients();
        } catch (error) { console.error('Error deleting client', error); }
    };

    return (
        <div className="container mx-auto max-w-7xl">
            <h2 className="text-3xl font-bold text-slate-800 tracking-tight mb-8">Clientes e Inquilinos</h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Lista */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b border-slate-100">
                        <h3 className="text-lg font-bold text-slate-800">Cartera de Clientes</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Nombre / DNI</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Pasaporte / Nac.</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Contacto</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Estado</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {clients.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-12 text-center text-slate-400">
                                            <svg className="w-10 h-10 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                            No hay clientes registrados todavía
                                        </td>
                                    </tr>
                                ) : clients.map(client => (
                                    <tr key={client.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-slate-900">{client.name}</div>
                                            <div className="text-xs text-slate-500">{client.dni}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-slate-700">{client.passport || '—'}</div>
                                            <div className="text-xs text-slate-500">{client.nationality || '—'}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-slate-600">{client.email}</div>
                                            <div className="text-xs text-slate-500">{client.phone}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                                                ${client.status === 'Activo' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-800'}`}>
                                                {client.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button onClick={() => handleEdit(client)} className="text-slate-400 hover:text-blue-500 mr-2">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                            </button>
                                            <button onClick={() => handleDelete(client.id)} className="text-slate-400 hover:text-red-500">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Formulario */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-fit">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex justify-between items-center">
                        {selectedId ? 'Editar Cliente' : 'Nuevo Cliente'}
                        {selectedId && <button onClick={handleCancel} className="text-xs text-slate-500">Cancelar</button>}
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Nombre Completo</label>
                            <input name="name" value={formData.name} onChange={handleInputChange} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500" required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">DNI / ID</label>
                                <input name="dni" value={formData.dni} onChange={handleInputChange} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Pasaporte</label>
                                <input name="passport" value={formData.passport} onChange={handleInputChange} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500" />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Nacionalidad</label>
                                <input name="nationality" value={formData.nationality} onChange={handleInputChange} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Teléfono</label>
                                <input name="phone" value={formData.phone} onChange={handleInputChange} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500" />
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Domicilio</label>
                            <input name="address" value={formData.address} onChange={handleInputChange} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500" placeholder="Dirección completa..." />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Email</label>
                            <input name="email" type="email" value={formData.email} onChange={handleInputChange} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500" required />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Estado</label>
                            <select name="status" value={formData.status} onChange={handleInputChange} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500">
                                <option value="Activo">Activo</option>
                                <option value="Inactivo">Inactivo</option>
                                <option value="Potencial">Potencial (Lead)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Notas</label>
                            <textarea name="notes" value={formData.notes} onChange={handleInputChange} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500" rows="3"></textarea>
                        </div>
                        <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 rounded-xl transition-all shadow-lg hover:shadow-xl mt-2">
                            {selectedId ? 'Actualizar' : 'Guardar Cliente'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Clients;
