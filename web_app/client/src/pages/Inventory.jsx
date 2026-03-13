import React, { useState, useEffect } from 'react';
import api from '../services/api';

const Inventory = () => {
    const [properties, setProperties] = useState([]);
    const [selectedProperty, setSelectedProperty] = useState('');
    const [items, setItems] = useState([]);
    const [incidents, setIncidents] = useState([]);
    const [activeTab, setActiveTab] = useState('items'); // items | incidents
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // Item form
    const [itemForm, setItemForm] = useState({ category: 'General', item: '', quantity: '1', size: '', condition: 'Bueno', notes: '' });
    const [editingItemId, setEditingItemId] = useState(null);

    // Incident form
    const [incidentDesc, setIncidentDesc] = useState('');
    const [incidentItemId, setIncidentItemId] = useState('');
    const [resolveNotes, setResolveNotes] = useState('');
    const [incidentFilter, setIncidentFilter] = useState('');

    // View mode: 'all' to see incidents across all properties
    const [viewAllIncidents, setViewAllIncidents] = useState(false);
    const [allIncidents, setAllIncidents] = useState([]);

    useEffect(() => { fetchProperties(); }, []);
    useEffect(() => { if (selectedProperty) { fetchItems(); fetchIncidents(); } }, [selectedProperty]);

    const fetchProperties = async () => {
        try {
            const res = await api.get('/properties');
            setProperties(res.data);
        } catch (err) { console.error(err); }
    };

    const fetchItems = async () => {
        try {
            const res = await api.get(`/inventory/property/${selectedProperty}`);
            setItems(res.data);
        } catch (err) { console.error(err); }
    };

    const fetchIncidents = async () => {
        try {
            const params = incidentFilter ? `?status=${incidentFilter}` : '';
            const res = await api.get(`/inventory/incidents/property/${selectedProperty}${params}`);
            setIncidents(res.data);
        } catch (err) { console.error(err); }
    };

    const fetchAllIncidents = async () => {
        try {
            const params = incidentFilter ? `?status=${incidentFilter}` : '';
            const res = await api.get(`/inventory/incidents${params}`);
            setAllIncidents(res.data);
        } catch (err) { console.error(err); }
    };

    useEffect(() => { if (viewAllIncidents) fetchAllIncidents(); }, [viewAllIncidents, incidentFilter]);
    useEffect(() => { if (selectedProperty && activeTab === 'incidents') fetchIncidents(); }, [incidentFilter]);

    const handleItemSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        try {
            if (editingItemId) {
                await api.put(`/inventory/${editingItemId}`, itemForm);
                setSuccess('Artículo actualizado');
            } else {
                await api.post(`/inventory/property/${selectedProperty}`, itemForm);
                setSuccess('Artículo añadido');
            }
            setTimeout(() => setSuccess(null), 3000);
            setItemForm({ category: 'General', item: '', quantity: '1', size: '', condition: 'Bueno', notes: '' });
            setEditingItemId(null);
            fetchItems();
        } catch (err) { setError(err.response?.data?.message || 'Error'); }
    };

    const handleEditItem = (item) => {
        setItemForm({ category: item.category, item: item.item, quantity: item.quantity, size: item.size || '', condition: item.condition, notes: item.notes || '' });
        setEditingItemId(item.id);
    };

    const handleDeleteItem = async (id) => {
        if (!window.confirm('¿Eliminar este artículo y sus incidencias?')) return;
        try {
            await api.delete(`/inventory/${id}`);
            fetchItems(); fetchIncidents();
        } catch (err) { setError('Error eliminando'); }
    };

    const handleCreateIncident = async (e) => {
        e.preventDefault();
        setError(null);
        try {
            await api.post('/inventory/incidents', {
                inventoryId: incidentItemId || '',
                propertyId: selectedProperty,
                description: incidentDesc
            });
            setIncidentDesc('');
            setIncidentItemId('');
            setSuccess('Incidencia creada');
            setTimeout(() => setSuccess(null), 3000);
            fetchIncidents();
        } catch (err) { setError(err.response?.data?.message || 'Error'); }
    };

    const handleResolve = async (id) => {
        try {
            await api.put(`/inventory/incidents/${id}/resolve`, { resolutionNotes: resolveNotes });
            setResolveNotes('');
            setSuccess('Incidencia solventada');
            setTimeout(() => setSuccess(null), 3000);
            fetchIncidents();
            if (viewAllIncidents) fetchAllIncidents();
        } catch (err) { setError('Error'); }
    };

    const categories = ['General', 'Ropa de cama', 'Toallas', 'Cocina', 'Baño', 'Electrónica', 'Mobiliario', 'Decoración', 'Limpieza', 'Otro'];
    const getPropertyAddress = (id) => properties.find(p => p.id === id)?.address || '—';

    return (
        <div className="container mx-auto max-w-7xl">
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Inventario</h2>
                <p className="text-slate-500 mt-1">Gestión detallada del inventario por propiedad e incidencias</p>
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

            {/* Property Selector + All Incidents Toggle */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-8 flex flex-wrap items-end gap-4">
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Propiedad</label>
                    <select value={selectedProperty} onChange={e => { setSelectedProperty(e.target.value); setViewAllIncidents(false); }} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 text-lg">
                        <option value="">— Seleccionar propiedad —</option>
                        {properties.map(p => (
                            <option key={p.id} value={p.id}>{p.address} ({p.type})</option>
                        ))}
                    </select>
                </div>
                <button onClick={() => setViewAllIncidents(!viewAllIncidents)}
                    className={`px-5 py-2.5 rounded-xl font-medium text-sm transition-all ${viewAllIncidents ? 'bg-amber-500 text-white shadow-lg' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                    {viewAllIncidents ? '← Volver a Propiedad' : '📋 Ver Todas las Incidencias'}
                </button>
            </div>

            {/* ===== ALL INCIDENTS VIEW ===== */}
            {viewAllIncidents && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-slate-800">Todas las Incidencias</h3>
                        <select value={incidentFilter} onChange={e => setIncidentFilter(e.target.value)} className="border-slate-200 rounded-lg text-sm focus:ring-amber-500 focus:border-amber-500">
                            <option value="">Todos los estados</option>
                            <option value="Pendiente">Pendiente</option>
                            <option value="Solventado">Solventado</option>
                        </select>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Fecha</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Propiedad</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Artículo</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Descripción</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Estado</th>
                                    <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {allIncidents.length === 0 ? (
                                    <tr><td colSpan="6" className="px-6 py-8 text-center text-slate-400 text-sm">Sin incidencias</td></tr>
                                ) : allIncidents.map(inc => (
                                    <tr key={inc.id} className="hover:bg-slate-50/50">
                                        <td className="px-6 py-3 text-sm text-slate-600">{inc.createdDate}</td>
                                        <td className="px-6 py-3 text-sm font-medium text-slate-900">{inc.propertyAddress}</td>
                                        <td className="px-6 py-3 text-sm text-slate-600">{inc.itemName}</td>
                                        <td className="px-6 py-3 text-sm text-slate-700 max-w-xs">{inc.description}</td>
                                        <td className="px-6 py-3">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${inc.status === 'Pendiente' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                {inc.status}
                                            </span>
                                            {inc.status === 'Solventado' && (
                                                <div className="text-[10px] text-slate-400 mt-0.5">{inc.resolvedDate} por {inc.resolvedBy}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                            {inc.status === 'Pendiente' && (
                                                <div className="flex items-center justify-end gap-1">
                                                    <input value={resolveNotes} onChange={e => setResolveNotes(e.target.value)} placeholder="Notas..." className="border-slate-200 rounded text-xs w-28 px-2 py-1 focus:ring-emerald-500" />
                                                    <button onClick={() => handleResolve(inc.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded-lg text-xs font-medium transition-all">
                                                        Solventar
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ===== PROPERTY-SPECIFIC VIEW ===== */}
            {selectedProperty && !viewAllIncidents && (
                <>
                    {/* Sub-tabs */}
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-1 flex space-x-1 mb-8 w-fit">
                        {[
                            { key: 'items', label: 'Artículos', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
                            { key: 'incidents', label: 'Incidencias', icon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z' },
                        ].map(tab => (
                            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                                className={`px-5 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === tab.key ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}>
                                <span className="flex items-center">
                                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} /></svg>
                                    {tab.label}
                                    {tab.key === 'incidents' && incidents.filter(i => i.status === 'Pendiente').length > 0 && (
                                        <span className="ml-2 w-5 h-5 bg-amber-500 text-white rounded-full text-[10px] flex items-center justify-center">
                                            {incidents.filter(i => i.status === 'Pendiente').length}
                                        </span>
                                    )}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* ========== ITEMS TAB ========== */}
                    {activeTab === 'items' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Items table */}
                            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                                <div className="p-6 border-b border-slate-100">
                                    <h3 className="text-lg font-bold text-slate-800">Inventario de {getPropertyAddress(selectedProperty)}</h3>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Categoría</th>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Artículo</th>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Cant.</th>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Tamaño</th>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Estado</th>
                                                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {items.length === 0 ? (
                                                <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-400">
                                                    <svg className="w-10 h-10 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                                                    Sin artículos aún
                                                </td></tr>
                                            ) : items.map(it => (
                                                <tr key={it.id} className="hover:bg-slate-50/50">
                                                    <td className="px-6 py-3">
                                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">{it.category}</span>
                                                    </td>
                                                    <td className="px-6 py-3">
                                                        <div className="text-sm font-medium text-slate-900">{it.item}</div>
                                                        {it.notes && <div className="text-[11px] text-slate-400 mt-0.5">{it.notes}</div>}
                                                    </td>
                                                    <td className="px-6 py-3 text-sm text-slate-600 font-medium">{it.quantity}</td>
                                                    <td className="px-6 py-3 text-sm text-slate-500">{it.size || '—'}</td>
                                                    <td className="px-6 py-3">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${it.condition === 'Bueno' ? 'bg-emerald-100 text-emerald-700' : it.condition === 'Regular' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                                                            {it.condition}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-3 text-right">
                                                        <button onClick={() => handleEditItem(it)} className="text-slate-400 hover:text-blue-500 p-1.5 hover:bg-blue-50 rounded-lg transition-colors mr-1">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                        </button>
                                                        <button onClick={() => handleDeleteItem(it.id)} className="text-slate-400 hover:text-red-500 p-1.5 hover:bg-red-50 rounded-lg transition-colors">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Add/Edit Item Form */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-fit sticky top-6">
                                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center justify-between">
                                    {editingItemId ? 'Editar Artículo' : 'Añadir Artículo'}
                                    {editingItemId && <button onClick={() => { setEditingItemId(null); setItemForm({ category: 'General', item: '', quantity: '1', size: '', condition: 'Bueno', notes: '' }); }}
                                        className="text-xs text-slate-500 hover:text-slate-800">Cancelar</button>}
                                </h3>
                                <form onSubmit={handleItemSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Categoría</label>
                                        <select value={itemForm.category} onChange={e => setItemForm(f => ({ ...f, category: e.target.value }))} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500">
                                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Artículo</label>
                                        <input value={itemForm.item} onChange={e => setItemForm(f => ({ ...f, item: e.target.value }))} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500" placeholder="Ej: Toalla grande" required />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Cantidad</label>
                                            <input type="number" min="0" value={itemForm.quantity} onChange={e => setItemForm(f => ({ ...f, quantity: e.target.value }))} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Tamaño</label>
                                            <input value={itemForm.size} onChange={e => setItemForm(f => ({ ...f, size: e.target.value }))} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500" placeholder="Grande, 50x70cm…" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Condición</label>
                                        <select value={itemForm.condition} onChange={e => setItemForm(f => ({ ...f, condition: e.target.value }))} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500">
                                            <option>Bueno</option><option>Regular</option><option>Malo</option><option>Nuevo</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Notas</label>
                                        <textarea value={itemForm.notes} onChange={e => setItemForm(f => ({ ...f, notes: e.target.value }))} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500" rows="2" placeholder="Observaciones..."></textarea>
                                    </div>
                                    <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 rounded-xl transition-all shadow-lg">
                                        {editingItemId ? 'Actualizar' : 'Añadir al Inventario'}
                                    </button>
                                </form>
                            </div>
                        </div>
                    )}

                    {/* ========== INCIDENTS TAB ========== */}
                    {activeTab === 'incidents' && (
                        <div className="space-y-8">
                            {/* Create incident */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                                <h3 className="text-lg font-bold text-slate-800 mb-4">Nueva Incidencia</h3>
                                <form onSubmit={handleCreateIncident} className="flex flex-wrap gap-4 items-end">
                                    <div className="flex-1 min-w-[200px]">
                                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Artículo (opcional)</label>
                                        <select value={incidentItemId} onChange={e => setIncidentItemId(e.target.value)} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500">
                                            <option value="">General (sin artículo)</option>
                                            {items.map(it => <option key={it.id} value={it.id}>{it.category}: {it.item}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex-[2] min-w-[300px]">
                                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Descripción</label>
                                        <input value={incidentDesc} onChange={e => setIncidentDesc(e.target.value)} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500" placeholder="Describe la incidencia..." required />
                                    </div>
                                    <button type="submit" className="bg-amber-500 hover:bg-amber-600 text-white font-medium px-6 py-2.5 rounded-xl shadow-lg transition-all">
                                        Crear Incidencia
                                    </button>
                                </form>
                            </div>

                            {/* Filter */}
                            <div className="flex items-center gap-3">
                                <label className="text-xs font-semibold text-slate-500 uppercase">Filtrar:</label>
                                <select value={incidentFilter} onChange={e => setIncidentFilter(e.target.value)} className="border-slate-200 rounded-lg text-sm focus:ring-amber-500 focus:border-amber-500">
                                    <option value="">Todos</option>
                                    <option>Pendiente</option>
                                    <option>Solventado</option>
                                </select>
                            </div>

                            {/* Incidents list */}
                            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Fecha</th>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Descripción</th>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Creado por</th>
                                                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Estado</th>
                                                <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Acción</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {incidents.length === 0 ? (
                                                <tr><td colSpan="5" className="px-6 py-8 text-center text-slate-400 text-sm">Sin incidencias</td></tr>
                                            ) : incidents.map(inc => (
                                                <tr key={inc.id} className="hover:bg-slate-50/50">
                                                    <td className="px-6 py-3 text-sm text-slate-600">{inc.createdDate}</td>
                                                    <td className="px-6 py-3 text-sm text-slate-700">{inc.description}</td>
                                                    <td className="px-6 py-3 text-sm text-slate-500">{inc.createdBy}</td>
                                                    <td className="px-6 py-3">
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${inc.status === 'Pendiente' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                            {inc.status}
                                                        </span>
                                                        {inc.status === 'Solventado' && (
                                                            <div className="text-[10px] text-slate-400 mt-0.5">
                                                                {inc.resolvedDate} por {inc.resolvedBy}
                                                                {inc.resolutionNotes && ` — ${inc.resolutionNotes}`}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-3 text-right">
                                                        {inc.status === 'Pendiente' && (
                                                            <div className="flex items-center justify-end gap-1">
                                                                <input value={resolveNotes} onChange={e => setResolveNotes(e.target.value)} placeholder="Notas solución..." className="border-slate-200 rounded text-xs w-32 px-2 py-1.5 focus:ring-emerald-500" />
                                                                <button onClick={() => handleResolve(inc.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-all">
                                                                    ✓ Solventar
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default Inventory;
