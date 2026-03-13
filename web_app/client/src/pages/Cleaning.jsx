import React, { useState, useEffect } from 'react';
import api from '../services/api';

const Cleaning = () => {
    const [activeTab, setActiveTab] = useState('personal');

    // --- Personal de Limpieza state ---
    const [cleaners, setCleaners] = useState([]);
    const [users, setUsers] = useState([]);
    const [cleanerForm, setCleanerForm] = useState({ name: '', phone: '', email: '', status: 'Activo', notes: '', userId: '' });
    const [selectedCleanerId, setSelectedCleanerId] = useState(null);

    // --- Programación state ---
    const [proposal, setProposal] = useState([]);
    const [availableCleaners, setAvailableCleaners] = useState([]);
    const [schedule, setSchedule] = useState([]);
    const [properties, setProperties] = useState([]);

    // --- Edit assignment state ---
    const [editingAssignment, setEditingAssignment] = useState(null);
    const [isCreatingAssignment, setIsCreatingAssignment] = useState(false);
    const [newAssignmentForm, setNewAssignmentForm] = useState({
        propertyId: '', cleanerId: '', frequency: 'Semanal', dayOfWeek: 'Lunes',
        startDate: new Date().toISOString().split('T')[0], endDate: '', status: 'Activo', notes: ''
    });

    // --- Reports state ---
    const [reportType, setReportType] = useState('hours');
    const [reportFrom, setReportFrom] = useState('');
    const [reportTo, setReportTo] = useState('');
    const [reportFilterCleaner, setReportFilterCleaner] = useState('');
    const [hoursReport, setHoursReport] = useState([]);
    const [notesReport, setNotesReport] = useState([]);
    const [reportLoading, setReportLoading] = useState(false);

    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    useEffect(() => {
        fetchCleaners();
        fetchSchedule();
        fetchProperties();
        fetchUsers();
    }, []);

    // ===================== CLEANERS CRUD =====================

    const fetchCleaners = async () => {
        try {
            const res = await api.get('/cleaners');
            setCleaners(res.data);
        } catch (err) { console.error(err); }
    };

    const fetchUsers = async () => {
        try {
            const res = await api.get('/users');
            setUsers(res.data);
        } catch (err) { console.error(err); }
    };

    const fetchSchedule = async () => {
        try {
            const res = await api.get('/cleaning-schedule');
            setSchedule(res.data);
        } catch (err) { console.error(err); }
    };

    const fetchProperties = async () => {
        try {
            const res = await api.get('/properties');
            setProperties(res.data);
        } catch (err) { console.error(err); }
    };

    const handleCleanerInput = (e) => {
        setCleanerForm({ ...cleanerForm, [e.target.name]: e.target.value });
    };

    const handleCleanerSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        try {
            if (selectedCleanerId) {
                await api.put(`/cleaners/${selectedCleanerId}`, cleanerForm);
            } else {
                // If it's a new cleaner from a user, we might want to use the userId as the cleanerId
                // The backend cleaners controller usually generates its own ID if not provided, 
                // but for linking purposes, using the userId as the record ID is better.
                const payload = { ...cleanerForm };
                if (cleanerForm.userId) {
                    payload.id = cleanerForm.userId; // Suggest using userId as cleaner ID
                }
                await api.post('/cleaners', payload);
            }
            setCleanerForm({ name: '', phone: '', email: '', status: 'Activo', notes: '', userId: '' });
            setSelectedCleanerId(null);
            fetchCleaners();
            setSuccess('Personal guardado correctamente');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || 'Error guardando personal');
        }
    };

    const handleCleanerEdit = (c) => {
        setCleanerForm({ name: c.name, phone: c.phone || '', email: c.email || '', status: c.status || 'Activo', notes: c.notes || '' });
        setSelectedCleanerId(c.id);
        setError(null);
    };

    const handleCleanerCancel = () => {
        setCleanerForm({ name: '', phone: '', email: '', status: 'Activo', notes: '', userId: '' });
        setSelectedCleanerId(null);
        setError(null);
    };

    const handleCleanerDelete = async (id) => {
        if (!window.confirm('¿Estás seguro de eliminar esta persona?')) return;
        setError(null);
        try {
            await api.delete(`/cleaners/${id}`);
            fetchCleaners();
        } catch (err) {
            setError(err.response?.data?.message || 'Error eliminando personal');
        }
    };

    // ===================== SCHEDULE / PROPOSAL =====================

    const handleGenerateProposal = async () => {
        setError(null);
        try {
            const res = await api.post('/cleaning-schedule/generate');
            setProposal(res.data.proposal || []);
            setAvailableCleaners(res.data.cleaners || []);
            if (res.data.message && (!res.data.proposal || res.data.proposal.length === 0)) {
                setError(res.data.message);
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Error generando propuesta');
        }
    };

    const handleProposalChange = (index, field, value) => {
        const updated = [...proposal];
        updated[index] = { ...updated[index], [field]: value };
        setProposal(updated);
    };

    const handleSaveSchedule = async () => {
        setError(null);
        try {
            const res = await api.post('/cleaning-schedule/save', { assignments: proposal });
            setSuccess(res.data.message);
            setTimeout(() => setSuccess(null), 3000);
            setProposal([]);
            fetchSchedule();
        } catch (err) {
            setError(err.response?.data?.message || 'Error guardando programación');
        }
    };

    const handleDeleteAssignment = async (id) => {
        if (!window.confirm('¿Eliminar esta asignación?')) return;
        try {
            await api.delete(`/cleaning-schedule/${id}`);
            fetchSchedule();
        } catch (err) {
            setError(err.response?.data?.message || 'Error eliminando asignación');
        }
    };

    // ===================== EDIT ASSIGNMENT =====================

    const handleEditAssignment = (s) => {
        setEditingAssignment({
            id: s.id,
            propertyId: s.propertyId,
            cleanerId: s.cleanerId,
            frequency: s.frequency || 'Semanal',
            dayOfWeek: s.dayOfWeek || 'Lunes',
            startDate: s.startDate || '',
            endDate: s.endDate || '',
            status: s.status || 'Activo',
            notes: s.notes || ''
        });
        setError(null);
    };

    const handleEditChange = (field, value) => {
        setEditingAssignment({ ...editingAssignment, [field]: value });
    };

    const handleSaveEdit = async () => {
        setError(null);
        try {
            await api.put(`/cleaning-schedule/${editingAssignment.id}`, editingAssignment);
            setEditingAssignment(null);
            setSuccess('Asignación actualizada');
            setTimeout(() => setSuccess(null), 3000);
            fetchSchedule();
        } catch (err) {
            setError(err.response?.data?.message || 'Error actualizando asignación');
        }
    };

    const handleSaveNewAssignment = async () => {
        setError(null);
        try {
            await api.post('/cleaning-schedule', newAssignmentForm);
            setIsCreatingAssignment(false);
            setNewAssignmentForm({
                propertyId: '', cleanerId: '', frequency: 'Semanal', dayOfWeek: 'Lunes',
                startDate: new Date().toISOString().split('T')[0], endDate: '', status: 'Activo', notes: ''
            });
            setSuccess('Asignación creada');
            setTimeout(() => setSuccess(null), 3000);
            fetchSchedule();
        } catch (err) {
            setError(err.response?.data?.message || 'Error creando asignación');
        }
    };

    // ===================== REPORTS =====================

    const handleFetchHoursReport = async () => {
        setReportLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (reportFrom) params.append('from', reportFrom);
            if (reportTo) params.append('to', reportTo);
            const res = await api.get(`/cleaning-logs/report/hours?${params.toString()}`);
            setHoursReport(res.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Error generando reporte de horas');
        } finally { setReportLoading(false); }
    };

    const handleFetchNotesReport = async () => {
        setReportLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (reportFrom) params.append('from', reportFrom);
            if (reportTo) params.append('to', reportTo);
            if (reportFilterCleaner) params.append('cleanerId', reportFilterCleaner);
            const res = await api.get(`/cleaning-logs/report/notes?${params.toString()}`);
            setNotesReport(res.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Error generando reporte de notas');
        } finally { setReportLoading(false); }
    };

    const handleRunReport = () => {
        if (reportType === 'hours') handleFetchHoursReport();
        else handleFetchNotesReport();
    };

    // Helpers
    const getCleanerName = (id) => cleaners.find(c => c.id === id)?.name || '—';
    const getPropertyAddress = (id) => properties.find(p => p.id === id)?.address || '—';
    const activeCleanersList = cleaners.filter(c => c.status === 'Activo');
    const days = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

    // ===================== RENDER =====================

    return (
        <div className="container mx-auto max-w-7xl">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Limpieza</h2>
                    <p className="text-slate-500 mt-1">Gestión de personal y programación de limpiezas</p>
                </div>
            </div>

            {/* Messages */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm mb-6 flex items-center">
                    <svg className="w-5 h-5 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                    {error}
                </div>
            )}
            {success && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg text-sm mb-6 flex items-center">
                    <svg className="w-5 h-5 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {success}
                </div>
            )}

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-1 flex space-x-1 mb-8 w-fit">
                {[
                    { key: 'personal', label: 'Personal', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
                    { key: 'schedule', label: 'Programación', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
                    { key: 'reports', label: 'Reportes', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
                ].map(tab => (
                    <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === tab.key ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>
                        <span className="flex items-center">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} /></svg>
                            {tab.label}
                        </span>
                    </button>
                ))}
            </div>

            {/* ======================== TAB: Personal ======================== */}
            {activeTab === 'personal' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Table */}
                    <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="p-6 border-b border-slate-100">
                            <h3 className="text-lg font-bold text-slate-800">Equipo de Limpieza</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Nombre</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Contacto</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                                        <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {cleaners.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-12 text-center text-slate-400">
                                                <svg className="w-10 h-10 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                                No hay personal registrado
                                            </td>
                                        </tr>
                                    ) : cleaners.map(c => (
                                        <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center">
                                                    <div className="w-10 h-10 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center font-bold text-sm mr-3">
                                                        {c.name?.[0]?.toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-semibold text-slate-900">{c.name}</div>
                                                        {c.notes && <div className="text-xs text-slate-400">{c.notes}</div>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-slate-600">{c.phone || '—'}</div>
                                                <div className="text-xs text-slate-400">{c.email || '—'}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${c.status === 'Activo' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${c.status === 'Activo' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                                                    {c.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button onClick={() => handleCleanerEdit(c)} className="text-slate-400 hover:text-blue-500 transition-colors p-2 hover:bg-blue-50 rounded-lg mr-1">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                </button>
                                                <button onClick={() => handleCleanerDelete(c.id)} className="text-slate-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-lg">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Form */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-fit sticky top-6">
                        <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center justify-between">
                            <div className="flex items-center">
                                <div className="w-8 h-8 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center mr-3 text-sm">
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                </div>
                                {selectedCleanerId ? 'Editar Personal' : 'Nuevo Personal'}
                            </div>
                            {selectedCleanerId && (
                                <button onClick={handleCleanerCancel} className="text-xs text-slate-500 hover:text-slate-800">Cancelar</button>
                            )}
                        </h3>
                        <form onSubmit={handleCleanerSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Usuario / Nombre</label>
                                {selectedCleanerId ? (
                                    <input name="name" value={cleanerForm.name} disabled className="w-full border-slate-200 rounded-lg bg-slate-50 text-slate-500" />
                                ) : (
                                    <select
                                        name="userId"
                                        value={cleanerForm.userId}
                                        onChange={(e) => {
                                            const u = users.find(u => u.id === e.target.value);
                                            if (u) {
                                                setCleanerForm({ ...cleanerForm, userId: u.id, name: u.name, email: u.email });
                                            } else {
                                                setCleanerForm({ ...cleanerForm, userId: '', name: '', email: '' });
                                            }
                                        }}
                                        className="w-full border-slate-200 rounded-lg focus:ring-cyan-500 focus:border-cyan-500"
                                        required
                                    >
                                        <option value="">— Seleccionar Usuario —</option>
                                        {users.filter(u => u.role === 'LIMPIADOR' && !cleaners.some(c => c.id === u.id)).map(u => (
                                            <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                                        ))}
                                    </select>
                                )}
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Teléfono</label>
                                    <input name="phone" value={cleanerForm.phone} onChange={handleCleanerInput} className="w-full border-slate-200 rounded-lg focus:ring-cyan-500 focus:border-cyan-500" placeholder="600123456" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Email</label>
                                    <input name="email" type="email" value={cleanerForm.email} onChange={handleCleanerInput} className="w-full border-slate-200 rounded-lg bg-slate-50 text-slate-500" placeholder="email@ejemplo.com" readOnly />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Estado</label>
                                <select name="status" value={cleanerForm.status} onChange={handleCleanerInput} className="w-full border-slate-200 rounded-lg focus:ring-cyan-500 focus:border-cyan-500">
                                    <option value="Activo">Activo</option>
                                    <option value="Inactivo">Inactivo</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Notas</label>
                                <textarea name="notes" value={cleanerForm.notes} onChange={handleCleanerInput} className="w-full border-slate-200 rounded-lg focus:ring-cyan-500 focus:border-cyan-500" rows="2" placeholder="Observaciones..."></textarea>
                            </div>
                            <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 rounded-xl transition-all shadow-lg hover:shadow-xl mt-2">
                                {selectedCleanerId ? 'Actualizar' : 'Guardar'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* ======================== TAB: Programación ======================== */}
            {activeTab === 'schedule' && (
                <div className="space-y-8">
                    {/* New Assignment Modal */}
                    {isCreatingAssignment && (
                        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
                            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
                                <div className="p-6 border-b border-slate-100 bg-emerald-50">
                                    <h3 className="text-lg font-bold text-slate-800">Nueva Asignación</h3>
                                    <p className="text-sm text-slate-500 mt-1">Configura una limpieza manual</p>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Propiedad</label>
                                        <select value={newAssignmentForm.propertyId} onChange={e => setNewAssignmentForm({ ...newAssignmentForm, propertyId: e.target.value })} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500">
                                            <option value="">— Seleccionar Propiedad —</option>
                                            {properties.filter(p => p.archived !== 'true').map(p => (
                                                <option key={p.id} value={p.id}>{p.address}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Asignado a</label>
                                        <select value={newAssignmentForm.cleanerId} onChange={e => setNewAssignmentForm({ ...newAssignmentForm, cleanerId: e.target.value })} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500">
                                            <option value="">— Seleccionar Limpiador —</option>
                                            {activeCleanersList.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Frecuencia</label>
                                            <select value={newAssignmentForm.frequency} onChange={e => setNewAssignmentForm({ ...newAssignmentForm, frequency: e.target.value })} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500">
                                                <option value="Diario">Diario</option>
                                                <option value="Semanal">Semanal</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Día</label>
                                            {newAssignmentForm.frequency === 'Semanal' ? (
                                                <select value={newAssignmentForm.dayOfWeek} onChange={e => setNewAssignmentForm({ ...newAssignmentForm, dayOfWeek: e.target.value })} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500">
                                                    {days.map(d => <option key={d} value={d}>{d}</option>)}
                                                </select>
                                            ) : (
                                                <input value="Todos los días" disabled className="w-full border-slate-200 rounded-lg bg-slate-50 text-slate-400" />
                                            )}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Fecha Inicio</label>
                                            <input type="date" value={newAssignmentForm.startDate} onChange={e => setNewAssignmentForm({ ...newAssignmentForm, startDate: e.target.value })} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Fecha Fin</label>
                                            <input type="date" value={newAssignmentForm.endDate} onChange={e => setNewAssignmentForm({ ...newAssignmentForm, endDate: e.target.value })} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Notas</label>
                                        <textarea value={newAssignmentForm.notes} onChange={e => setNewAssignmentForm({ ...newAssignmentForm, notes: e.target.value })} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500" rows="2" placeholder="Observaciones..."></textarea>
                                    </div>
                                </div>
                                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end space-x-3">
                                    <button onClick={() => setIsCreatingAssignment(false)} className="px-4 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                                        Cancelar
                                    </button>
                                    <button onClick={handleSaveNewAssignment} className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-500/30 font-medium transition-all text-sm">
                                        Crear Asignación
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Edit Assignment Modal */}
                    {editingAssignment && (
                        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
                            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
                                <div className="p-6 border-b border-slate-100 bg-slate-50">
                                    <h3 className="text-lg font-bold text-slate-800">Editar Asignación</h3>
                                    <p className="text-sm text-slate-500 mt-1">{getPropertyAddress(editingAssignment.propertyId)}</p>
                                </div>
                                <div className="p-6 space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Asignado a</label>
                                        <select value={editingAssignment.cleanerId} onChange={e => handleEditChange('cleanerId', e.target.value)} className="w-full border-slate-200 rounded-lg focus:ring-cyan-500 focus:border-cyan-500">
                                            {activeCleanersList.map(c => (
                                                <option key={c.id} value={c.id}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Frecuencia</label>
                                            <select value={editingAssignment.frequency} onChange={e => handleEditChange('frequency', e.target.value)} className="w-full border-slate-200 rounded-lg focus:ring-cyan-500 focus:border-cyan-500">
                                                <option value="Diario">Diario</option>
                                                <option value="Semanal">Semanal</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Día</label>
                                            {editingAssignment.frequency === 'Semanal' ? (
                                                <select value={editingAssignment.dayOfWeek} onChange={e => handleEditChange('dayOfWeek', e.target.value)} className="w-full border-slate-200 rounded-lg focus:ring-cyan-500 focus:border-cyan-500">
                                                    {days.map(d => <option key={d} value={d}>{d}</option>)}
                                                </select>
                                            ) : (
                                                <input value="Todos los días" disabled className="w-full border-slate-200 rounded-lg bg-slate-50 text-slate-400" />
                                            )}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Fecha Inicio</label>
                                            <input type="date" value={editingAssignment.startDate} onChange={e => handleEditChange('startDate', e.target.value)} className="w-full border-slate-200 rounded-lg focus:ring-cyan-500 focus:border-cyan-500" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Fecha Fin <span className="text-slate-400 normal-case">(vacío = indefinido)</span></label>
                                            <input type="date" value={editingAssignment.endDate} onChange={e => handleEditChange('endDate', e.target.value)} className="w-full border-slate-200 rounded-lg focus:ring-cyan-500 focus:border-cyan-500" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Estado</label>
                                        <select value={editingAssignment.status} onChange={e => handleEditChange('status', e.target.value)} className="w-full border-slate-200 rounded-lg focus:ring-cyan-500 focus:border-cyan-500">
                                            <option value="Activo">Activo</option>
                                            <option value="Pausado">Pausado</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Notas</label>
                                        <textarea value={editingAssignment.notes} onChange={e => handleEditChange('notes', e.target.value)} className="w-full border-slate-200 rounded-lg focus:ring-cyan-500 focus:border-cyan-500" rows="2" placeholder="Observaciones..."></textarea>
                                    </div>
                                </div>
                                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end space-x-3">
                                    <button onClick={() => setEditingAssignment(null)} className="px-4 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                                        Cancelar
                                    </button>
                                    <button onClick={handleSaveEdit} className="bg-cyan-600 hover:bg-cyan-700 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-cyan-500/30 font-medium transition-all text-sm">
                                        Guardar Cambios
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Current Schedule */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-slate-800">Asignaciones Actuales</h3>
                            <div className="flex space-x-3">
                                <button onClick={() => setIsCreatingAssignment(true)} className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-5 py-2.5 rounded-xl shadow-sm flex items-center font-medium transition-all text-sm">
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                    Nueva Asignación
                                </button>
                                <button onClick={handleGenerateProposal} className="bg-cyan-600 hover:bg-cyan-700 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-cyan-500/30 flex items-center font-medium transition-all text-sm">
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                    Generar Propuesta
                                </button>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Propiedad</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Asignado a</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Frecuencia</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Periodo</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                                        <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {schedule.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-12 text-center text-slate-400">
                                                <svg className="w-10 h-10 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                No hay asignaciones. Pulsa "Generar Propuesta" para crear una.
                                            </td>
                                        </tr>
                                    ) : schedule.map(s => (
                                        <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-semibold text-slate-900">{getPropertyAddress(s.propertyId)}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center">
                                                    <div className="w-8 h-8 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center font-bold text-xs mr-2">
                                                        {getCleanerName(s.cleanerId)?.[0]?.toUpperCase()}
                                                    </div>
                                                    <span className="text-sm text-slate-700">{getCleanerName(s.cleanerId)}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.frequency === 'Diario' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                                                    {s.frequency}
                                                </span>
                                                <span className="text-xs text-slate-500 ml-1">{s.frequency === 'Semanal' ? s.dayOfWeek : ''}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-slate-600">
                                                    {s.startDate ? (
                                                        <span>{s.startDate}{s.endDate ? ` → ${s.endDate}` : ' → ∞'}</span>
                                                    ) : (
                                                        <span className="text-slate-400">Sin periodo</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.status === 'Activo' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                                                    <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${s.status === 'Activo' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                                                    {s.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button onClick={() => handleEditAssignment(s)} className="text-slate-400 hover:text-blue-500 transition-colors p-2 hover:bg-blue-50 rounded-lg mr-1" title="Editar">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                </button>
                                                <button onClick={() => handleDeleteAssignment(s.id)} className="text-slate-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-lg" title="Eliminar">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Proposal Editor */}
                    {proposal.length > 0 && (
                        <div className="bg-white rounded-2xl shadow-sm border-2 border-cyan-200 overflow-hidden">
                            <div className="p-6 border-b border-cyan-100 bg-cyan-50 flex justify-between items-center">
                                <div>
                                    <h3 className="text-lg font-bold text-cyan-900">Propuesta de Asignación</h3>
                                    <p className="text-sm text-cyan-700 mt-1">Revisa y modifica las asignaciones antes de guardar</p>
                                </div>
                                <div className="flex space-x-3">
                                    <button onClick={() => setProposal([])} className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                                        Cancelar
                                    </button>
                                    <button onClick={handleSaveSchedule} className="bg-cyan-600 hover:bg-cyan-700 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-cyan-500/30 flex items-center font-medium transition-all text-sm">
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        Guardar Programación
                                    </button>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Propiedad</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Asignar a</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Frecuencia</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Día</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Desde</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Hasta</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {proposal.map((item, idx) => (
                                            <tr key={item.id} className={`${item.isNew ? 'bg-cyan-50/50' : ''} hover:bg-slate-50/50 transition-colors`}>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm font-semibold text-slate-900">{item.propertyAddress || getPropertyAddress(item.propertyId)}</div>
                                                    {item.isNew && <span className="text-[10px] font-semibold text-cyan-600 bg-cyan-100 px-1.5 py-0.5 rounded mt-1 inline-block">NUEVA</span>}
                                                    {item.isExisting && <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded mt-1 inline-block">EXISTENTE</span>}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <select value={item.cleanerId} onChange={(e) => handleProposalChange(idx, 'cleanerId', e.target.value)} className="border-slate-200 rounded-lg text-sm focus:ring-cyan-500 focus:border-cyan-500">
                                                        {availableCleaners.map(c => (
                                                            <option key={c.id} value={c.id}>{c.name}</option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.frequency === 'Diario' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                                                        {item.frequency}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {item.frequency === 'Semanal' ? (
                                                        <select value={item.dayOfWeek} onChange={(e) => handleProposalChange(idx, 'dayOfWeek', e.target.value)} className="border-slate-200 rounded-lg text-sm focus:ring-cyan-500 focus:border-cyan-500">
                                                            {days.map(d => <option key={d} value={d}>{d}</option>)}
                                                        </select>
                                                    ) : (
                                                        <span className="text-sm text-slate-500">Todos</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <input type="date" value={item.startDate || ''} onChange={(e) => handleProposalChange(idx, 'startDate', e.target.value)} className="border-slate-200 rounded-lg text-sm focus:ring-cyan-500 focus:border-cyan-500 w-36" />
                                                </td>
                                                <td className="px-6 py-4">
                                                    <input type="date" value={item.endDate || ''} onChange={(e) => handleProposalChange(idx, 'endDate', e.target.value)} className="border-slate-200 rounded-lg text-sm focus:ring-cyan-500 focus:border-cyan-500 w-36" />
                                                </td>
                                                <td className="px-6 py-4">
                                                    <select value={item.status} onChange={(e) => handleProposalChange(idx, 'status', e.target.value)} className="border-slate-200 rounded-lg text-sm focus:ring-cyan-500 focus:border-cyan-500">
                                                        <option value="Activo">Activo</option>
                                                        <option value="Pausado">Pausado</option>
                                                    </select>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ======================== TAB: Reportes ======================== */}
            {activeTab === 'reports' && (
                <div className="space-y-8">
                    {/* Filters */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                        <h3 className="text-lg font-bold text-slate-800 mb-4">Filtros del Reporte</h3>
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Tipo</label>
                                <select value={reportType} onChange={e => setReportType(e.target.value)} className="w-full border-slate-200 rounded-lg focus:ring-cyan-500 focus:border-cyan-500">
                                    <option value="hours">Horas por Persona</option>
                                    <option value="notes">Observaciones</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Desde</label>
                                <input type="date" value={reportFrom} onChange={e => setReportFrom(e.target.value)} className="w-full border-slate-200 rounded-lg focus:ring-cyan-500 focus:border-cyan-500" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Hasta</label>
                                <input type="date" value={reportTo} onChange={e => setReportTo(e.target.value)} className="w-full border-slate-200 rounded-lg focus:ring-cyan-500 focus:border-cyan-500" />
                            </div>
                            {reportType === 'notes' && (
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Personal</label>
                                    <select value={reportFilterCleaner} onChange={e => setReportFilterCleaner(e.target.value)} className="w-full border-slate-200 rounded-lg focus:ring-cyan-500 focus:border-cyan-500">
                                        <option value="">Todos</option>
                                        {cleaners.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                            )}
                            <button onClick={handleRunReport} disabled={reportLoading} className="bg-slate-900 hover:bg-slate-800 text-white font-medium py-2.5 px-5 rounded-xl transition-all shadow-lg disabled:opacity-50">
                                {reportLoading ? 'Cargando...' : 'Generar Reporte'}
                            </button>
                        </div>
                    </div>

                    {/* Hours Report */}
                    {reportType === 'hours' && hoursReport.length > 0 && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                            <div className="p-6 border-b border-slate-100">
                                <h3 className="text-lg font-bold text-slate-800">Horas por Persona</h3>
                                <p className="text-sm text-slate-500 mt-1">{reportFrom || '∞'} → {reportTo || '∞'}</p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Persona</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Sesiones</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Total Horas</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Media Min/Sesión</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {hoursReport.map(r => (
                                            <tr key={r.cleanerId} className="hover:bg-slate-50/50">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center">
                                                        <div className="w-8 h-8 rounded-full bg-cyan-100 text-cyan-600 flex items-center justify-center font-bold text-xs mr-3">
                                                            {r.cleanerName?.[0]?.toUpperCase()}
                                                        </div>
                                                        <span className="text-sm font-semibold text-slate-900">{r.cleanerName}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-600">{r.sessions}</td>
                                                <td className="px-6 py-4">
                                                    <span className="text-lg font-bold text-slate-900">{r.totalHours}h</span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-600">{r.avgMinutesPerSession} min</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Notes Report */}
                    {reportType === 'notes' && notesReport.length > 0 && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                            <div className="p-6 border-b border-slate-100">
                                <h3 className="text-lg font-bold text-slate-800">Observaciones</h3>
                                <p className="text-sm text-slate-500 mt-1">{notesReport.length} registros encontrados</p>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="min-w-full">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Fecha</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Persona</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Propiedad</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Horario</th>
                                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Observaciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {notesReport.map(n => (
                                            <tr key={n.id} className="hover:bg-slate-50/50">
                                                <td className="px-6 py-4 text-sm text-slate-600">{n.date}</td>
                                                <td className="px-6 py-4 text-sm font-medium text-slate-900">
                                                    <div>{n.cleanerName}</div>
                                                    <div className="text-[10px] text-slate-400 font-normal">ID: {n.cleanerId}</div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-slate-600">{n.propertyAddress}</td>
                                                <td className="px-6 py-4 text-sm text-slate-600">{n.entryTime} → {n.exitTime || '—'}</td>
                                                <td className="px-6 py-4 text-sm text-slate-700 max-w-sm">{n.observations}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Empty state for reports */}
                    {((reportType === 'hours' && hoursReport.length === 0) || (reportType === 'notes' && notesReport.length === 0)) && !reportLoading && (
                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
                            <svg className="w-12 h-12 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            <p className="text-slate-400">Selecciona las fechas y pulsa "Generar Reporte"</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Cleaning;
