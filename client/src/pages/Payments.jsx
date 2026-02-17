import React, { useState, useEffect } from 'react';
import api from '../services/api';

const Payments = () => {
    const [payments, setPayments] = useState([]);
    const [properties, setProperties] = useState([]);
    const [clients, setClients] = useState([]);
    const defaultForm = {
        propertyId: '',
        clientId: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        type: 'Ingreso',
        status: 'Pagado',
        description: ''
    };
    const [formData, setFormData] = useState(defaultForm);
    const [selectedId, setSelectedId] = useState(null);

    useEffect(() => {
        fetchPayments();
        fetchProperties();
        fetchClients();
    }, []);

    const fetchPayments = async () => {
        try {
            const response = await api.get('/payments');
            setPayments(response.data);
        } catch (error) { console.error(error); }
    };
    const fetchProperties = async () => {
        try {
            const response = await api.get('/properties');
            setProperties(response.data);
        } catch (error) { console.error(error); }
    };
    const fetchClients = async () => {
        try {
            const response = await api.get('/clients');
            setClients(response.data);
        } catch (error) { console.error(error); }
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (selectedId) {
                await api.put(`/payments/${selectedId}`, formData);
            } else {
                await api.post('/payments', formData);
            }
            setFormData({ ...defaultForm, date: new Date().toISOString().split('T')[0] });
            setSelectedId(null);
            fetchPayments();
        } catch (error) { console.error(error); }
    };

    const handleEdit = (payment) => {
        setFormData({
            propertyId: payment.propertyId || '',
            clientId: payment.clientId || '',
            amount: payment.amount,
            date: payment.date,
            type: payment.type,
            status: payment.status || 'Pagado',
            description: payment.description || ''
        });
        setSelectedId(payment.id);
    };

    const handleCancel = () => {
        setFormData({ ...defaultForm, date: new Date().toISOString().split('T')[0] });
        setSelectedId(null);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Borrar registro financiero?')) return;
        try {
            await api.delete(`/payments/${id}`);
            fetchPayments();
        } catch (error) { console.error(error); }
    };

    // Calculate totals
    const totalIncome = payments.filter(p => p.type === 'Ingreso' && p.status === 'Pagado').reduce((acc, curr) => acc + Number(curr.amount), 0);
    const totalExpenses = payments.filter(p => p.type === 'Gasto' && p.status === 'Pagado').reduce((acc, curr) => acc + Number(curr.amount), 0);
    const totalPending = payments.filter(p => p.status === 'Pendiente').reduce((acc, curr) => acc + Number(curr.amount), 0);

    return (
        <div className="container mx-auto max-w-7xl">
            <h2 className="text-3xl font-bold text-slate-800 tracking-tight mb-8">Finanzas & Pagos</h2>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <p className="text-slate-500 font-medium text-sm uppercase">Ingresos Totales</p>
                    <p className="text-3xl font-bold text-emerald-600 mt-1">${totalIncome.toLocaleString()}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <p className="text-slate-500 font-medium text-sm uppercase">Gastos Totales</p>
                    <p className="text-3xl font-bold text-red-500 mt-1">${totalExpenses.toLocaleString()}</p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <p className="text-slate-500 font-medium text-sm uppercase">Balance Neto</p>
                    <p className={`text-3xl font-bold mt-1 ${totalIncome - totalExpenses >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                        ${(totalIncome - totalExpenses).toLocaleString()}
                    </p>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                    <p className="text-slate-500 font-medium text-sm uppercase">Pendientes</p>
                    <p className="text-3xl font-bold text-amber-500 mt-1">${totalPending.toLocaleString()}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Tabla */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b border-slate-100">
                        <h3 className="text-lg font-bold text-slate-800">Transacciones Recientes</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Fecha</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Concepto</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Tipo</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Estado</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase">Monto</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {payments.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="px-6 py-12 text-center text-slate-400">
                                            <svg className="w-10 h-10 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            No hay transacciones registradas todavía
                                        </td>
                                    </tr>
                                ) : payments.map(p => (
                                    <tr key={p.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 text-sm text-slate-600">{p.date}</td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-slate-900">{p.description}</div>
                                            <div className="text-xs text-slate-500">
                                                {properties.find(prop => prop.id === p.propertyId)?.address}
                                                {p.clientId && ` • ${clients.find(c => c.id === p.clientId)?.name}`}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                                                ${p.type === 'Ingreso' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                                                {p.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                                ${p.status === 'Pagado' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                                {p.status || 'Pagado'}
                                            </span>
                                        </td>
                                        <td className={`px-6 py-4 text-right text-sm font-bold ${p.type === 'Ingreso' ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {p.type === 'Gasto' ? '-' : '+'}${Number(p.amount).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button onClick={() => handleEdit(p)} className="text-slate-400 hover:text-blue-500 transition-colors p-2 hover:bg-blue-50 rounded-lg mr-1">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                            </button>
                                            <button onClick={() => handleDelete(p.id)} className="text-slate-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-lg">
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
                        {selectedId ? 'Editar Transacción' : 'Registrar Transacción'}
                        {selectedId && <button onClick={handleCancel} className="text-xs text-slate-500 hover:text-slate-800">Cancelar</button>}
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Tipo</label>
                                <select name="type" value={formData.type} onChange={handleInputChange} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500">
                                    <option value="Ingreso">Ingreso</option>
                                    <option value="Gasto">Gasto</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Estado</label>
                                <select name="status" value={formData.status} onChange={handleInputChange} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500">
                                    <option value="Pagado">Pagado</option>
                                    <option value="Pendiente">Pendiente</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Fecha</label>
                                <input name="date" type="date" value={formData.date} onChange={handleInputChange} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500" required />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Monto</label>
                                <input name="amount" type="number" value={formData.amount} onChange={handleInputChange} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500" placeholder="0.00" required />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Propiedad</label>
                            <select name="propertyId" value={formData.propertyId} onChange={handleInputChange} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500">
                                <option value="">General / Ninguna</option>
                                {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Cliente</label>
                            <select name="clientId" value={formData.clientId} onChange={handleInputChange} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500">
                                <option value="">N/A</option>
                                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Concepto</label>
                            <input name="description" value={formData.description} onChange={handleInputChange} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500" placeholder="Ej: Renta Marzo" required />
                        </div>

                        <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 rounded-xl transition-all shadow-lg hover:shadow-xl mt-2">
                            {selectedId ? 'Actualizar' : 'Registrar'}
                        </button>
                    </form>
                </div>

            </div>
        </div>
    );
};

export default Payments;
