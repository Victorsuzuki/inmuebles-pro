import React, { useState, useEffect } from 'react';
import api from '../services/api';

const Events = () => {
    const [events, setEvents] = useState([]);
    const [properties, setProperties] = useState([]);
    const [formData, setFormData] = useState({
        propertyId: '',
        type: 'Alquiler',
        startDate: '',
        endDate: '',
        description: '',
        status: 'Pendiente',
        clientId: '',
        priceType: 'Normal',
        rentalPeriod: 'Mensual',
        agreedPrice: '',
        totalAmount: '',
        cleaningFee: ''
    });

    const [selectedId, setSelectedId] = useState(null);
    const [error, setError] = useState(null);
    const [clients, setClients] = useState([]);

    useEffect(() => {
        fetchEvents();
        fetchProperties();
        fetchClients();
    }, []);

    const fetchEvents = async () => {
        try {
            const response = await api.get('/events');
            // Sort by start date (most recent first)
            const sorted = response.data.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
            setEvents(sorted);
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

    // Devuelve el número de períodos entre dos fechas ISO según el tipo
    const calcPeriods = (start, end, period) => {
        if (!start || !end) return null;
        const ms = new Date(end) - new Date(start);
        if (ms <= 0) return null;
        const days = ms / (1000 * 60 * 60 * 24);
        if (period === 'Diario')    return Math.round(days);
        if (period === 'Semanal')   return Math.round(days / 7);
        if (period === 'Quincenal') return Math.round(days / 15);
        if (period === 'Mensual')   return Math.round(days / 30);
        return null;
    };

    // Obtiene el precio de la propiedad según tipo de temporada y período
    const getPriceFromProperty = (prop, priceType, rentalPeriod) => {
        if (!prop) return '';
        const isHigh = priceType === 'Temporada';
        const map = {
            'Diario':    isHigh ? prop.seasonPricePerDay       : prop.pricePerDay,
            'Semanal':   isHigh ? prop.seasonPricePerWeek      : prop.pricePerWeek,
            'Quincenal': isHigh ? prop.seasonPricePerFortnight : prop.pricePerFortnight,
            'Mensual':   isHigh ? prop.seasonPrice             : prop.rentalPrice,
        };
        return map[rentalPeriod] || '';
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const next = { ...prev, [name]: value };

            // Visita: endDate always equals startDate
            if (name === 'type' && value === 'Visita') next.endDate = next.startDate;
            if (name === 'startDate' && next.type === 'Visita') next.endDate = value;

            // Auto-fill agreedPrice when property, priceType or rentalPeriod changes
            if ((name === 'propertyId' || name === 'priceType' || name === 'rentalPeriod') && next.type === 'Alquiler') {
                const prop = properties.find(p => p.id === next.propertyId);
                const price = getPriceFromProperty(prop, next.priceType, next.rentalPeriod);
                next.agreedPrice = price || '';
                // Recalculate total with new price
                const n = calcPeriods(next.startDate, next.endDate, next.rentalPeriod);
                next.totalAmount = (price && n) ? String(parseFloat(price) * n) : next.totalAmount;
            }

            // Auto-calculate totalAmount when dates or agreedPrice changes
            if ((name === 'startDate' || name === 'endDate' || name === 'agreedPrice') && next.type === 'Alquiler') {
                const n = calcPeriods(next.startDate, next.endDate, next.rentalPeriod);
                const p = parseFloat(next.agreedPrice);
                if (n && !isNaN(p)) next.totalAmount = String(p * n);
            }

            return next;
        });
        setError(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        // Validate: Alquiler requires client
        if (formData.type === 'Alquiler' && !formData.clientId) {
            setError('Un Alquiler requiere seleccionar un Cliente / Inquilino.');
            return;
        }

        // Validate: startDate <= endDate (for non-Visita)
        if (formData.type !== 'Visita' && formData.startDate && formData.endDate) {
            if (new Date(formData.startDate) > new Date(formData.endDate)) {
                setError('La fecha de inicio no puede ser posterior a la fecha de fin.');
                return;
            }
        }

        try {
            const dataToSend = { ...formData };
            // For Visita, ensure endDate = startDate
            if (dataToSend.type === 'Visita') {
                dataToSend.endDate = dataToSend.startDate;
            }

            if (selectedId) {
                await api.put(`/events/${selectedId}`, dataToSend);
            } else {
                await api.post('/events', dataToSend);
            }
            setFormData({ propertyId: '', type: 'Alquiler', startDate: '', endDate: '', description: '', status: 'Pendiente', clientId: '', priceType: 'Normal', rentalPeriod: 'Mensual', agreedPrice: '', totalAmount: '', cleaningFee: '' });
            setSelectedId(null);
            fetchEvents();
        } catch (error) {
            console.error(error);
            if (error.response && error.response.status === 409) {
                setError(error.response.data.message);
            } else if (error.response && error.response.data && error.response.data.message) {
                setError(error.response.data.message);
            } else {
                setError('Error al guardar el evento. Intente nuevamente.');
            }
        }
    };

    const handleEdit = (event) => {
        setFormData({
            propertyId: event.propertyId,
            type: event.type,
            startDate: event.startDate,
            endDate: event.endDate,
            description: event.description,
            status: event.status || 'Pendiente',
            clientId: event.clientId || '',
            priceType: event.priceType || 'Normal',
            rentalPeriod: event.rentalPeriod || 'Mensual',
            agreedPrice: event.agreedPrice || '',
            totalAmount: event.totalAmount || '',
            cleaningFee: event.cleaningFee || ''
        });
        setSelectedId(event.id);
        setError(null);
        document.getElementById('eventForm').scrollIntoView({ behavior: 'smooth' });
    };

    const handleCancel = () => {
        setFormData({ propertyId: '', type: 'Alquiler', startDate: '', endDate: '', description: '', status: 'Pendiente', clientId: '', priceType: 'Normal', rentalPeriod: 'Mensual', agreedPrice: '', totalAmount: '', cleaningFee: '' });
        setSelectedId(null);
        setError(null);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Eliminar evento?')) return;
        try {
            await api.delete(`/events/${id}`);
            fetchEvents();
        } catch (error) { console.error(error); }
    }

    const isVisita = formData.type === 'Visita';

    return (
        <div className="container mx-auto max-w-7xl">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Eventos & Reservas</h2>
                    <p className="text-slate-500 mt-1">Coordina alquileres y mantenimiento</p>
                </div>
                <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-500/30 flex items-center font-medium transition-all" onClick={() => { handleCancel(); document.getElementById('eventForm').scrollIntoView({ behavior: 'smooth' }); }}>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Nuevo Evento
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Listado Principal */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-slate-800">Próximos Eventos</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Evento</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Cliente</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Fechas</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {events.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="px-6 py-12 text-center text-slate-400">
                                            <svg className="w-10 h-10 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                            No hay eventos registrados todavía
                                        </td>
                                    </tr>
                                ) : events.map(ev => (
                                    <tr key={ev.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white mr-4
                                ${ev.type === 'Alquiler' ? 'bg-blue-500' : ev.type === 'Mantenimiento' ? 'bg-amber-500' : 'bg-emerald-500'}`}>
                                                    {ev.type === 'Alquiler' && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
                                                    {ev.type === 'Mantenimiento' && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>}
                                                    {ev.type === 'Visita' && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-semibold text-slate-900">{ev.type}</div>
                                                    <div className="text-xs text-slate-500 flex items-center gap-2">
                                                        {properties.find(p => p.id === ev.propertyId)?.address || ev.propertyId}
                                                        {ev.type === 'Alquiler' && ev.priceType && (
                                                            <span className={`px-1 rounded-[4px] text-[9px] font-bold uppercase ${ev.priceType === 'Temporada' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                                                {ev.priceType}
                                                            </span>
                                                        )}
                                                        {ev.type === 'Alquiler' && ev.rentalPeriod && (
                                                            <span className="px-1 rounded-[4px] text-[9px] font-bold uppercase bg-slate-100 text-slate-600">
                                                                {ev.rentalPeriod}
                                                            </span>
                                                        )}
                                                        {ev.type === 'Alquiler' && ev.agreedPrice && (
                                                            <span className="text-[10px] text-emerald-600 font-semibold">
                                                                €{parseFloat(ev.agreedPrice).toLocaleString('es-ES')}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-slate-700">
                                                {ev.clientId ? (clients.find(c => c.id === ev.clientId)?.name || '—') : <span className="text-slate-400">—</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {ev.type === 'Visita' ? (
                                                <div className="text-sm text-slate-900">{ev.startDate}</div>
                                            ) : (
                                                <>
                                                    <div className="text-sm text-slate-900">{ev.startDate}</div>
                                                    <div className="text-xs text-slate-500">hasta {ev.endDate}</div>
                                                </>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                                ${ev.status === 'Confirmado' ? 'bg-emerald-100 text-emerald-800' :
                                                    ev.status === 'Cancelado' ? 'bg-red-100 text-red-800' :
                                                        ev.status === 'Completado' ? 'bg-blue-100 text-blue-800' :
                                                            'bg-amber-100 text-amber-800'}`}>
                                                {ev.status || 'Pendiente'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button onClick={() => handleEdit(ev)} className="text-slate-400 hover:text-blue-500 transition-colors p-2 hover:bg-blue-50 rounded-lg mr-1">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                            </button>
                                            <button onClick={() => handleDelete(ev.id)} className="text-slate-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-lg">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Formulario Lateral */}
                <div id="eventForm" className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-fit sticky top-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center justify-between">
                        <div className="flex items-center">
                            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mr-3 text-sm">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                            </div>
                            {selectedId ? 'Editar Evento' : 'Nuevo Evento'}
                        </div>
                        {selectedId && (
                            <button onClick={handleCancel} className="text-xs text-slate-500 hover:text-slate-800">Cancelar</button>
                        )}
                    </h3>

                    {error && (
                        <div className="bg-red-50 border-1 border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm mb-4">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Propiedad</label>
                            <select name="propertyId" value={formData.propertyId} onChange={handleInputChange} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500" required>
                                <option value="">Seleccionar Propiedad</option>
                                {properties.map(p => <option key={p.id} value={p.id}>{p.address}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                                Cliente / Inquilino {formData.type === 'Alquiler' && <span className="text-red-500">*</span>}
                            </label>
                            <select name="clientId" value={formData.clientId || ''} onChange={handleInputChange} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500" required={formData.type === 'Alquiler'}>
                                <option value="">{formData.type === 'Alquiler' ? 'Seleccionar Cliente (Obligatorio)' : 'Seleccionar Cliente (Opcional)'}</option>
                                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Tipo de Evento</label>
                            <select name="type" value={formData.type} onChange={handleInputChange} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500">
                                <option value="Alquiler">Alquiler</option>
                                <option value="Mantenimiento">Mantenimiento</option>
                                <option value="Visita">Visita</option>
                            </select>
                        </div>

                        {formData.type === 'Alquiler' && (
                            <div className="space-y-4 bg-slate-50 rounded-xl p-4 border border-slate-100">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Condiciones económicas</p>
                                {/* Tipo precio */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Tipo de Precio</label>
                                    <div className="flex space-x-4 mt-1">
                                        <label className="flex items-center text-sm text-slate-700">
                                            <input type="radio" name="priceType" value="Normal" checked={formData.priceType === 'Normal'} onChange={handleInputChange} className="mr-2 text-emerald-600 focus:ring-emerald-500" />
                                            Temporada Baja
                                        </label>
                                        <label className="flex items-center text-sm text-slate-700">
                                            <input type="radio" name="priceType" value="Temporada" checked={formData.priceType === 'Temporada'} onChange={handleInputChange} className="mr-2 text-amber-500 focus:ring-amber-500" />
                                            Temporada Alta
                                        </label>
                                    </div>
                                </div>
                                {/* Tipo de alquiler (período) */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Tipo de alquiler</label>
                                    <select name="rentalPeriod" value={formData.rentalPeriod} onChange={handleInputChange} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500">
                                        <option value="Diario">Diario</option>
                                        <option value="Semanal">Semanal</option>
                                        <option value="Quincenal">Quincenal</option>
                                        <option value="Mensual">Mensual</option>
                                    </select>
                                </div>
                                {/* Precio acordado + total + limpieza */}
                                <div className="grid grid-cols-3 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                                            Precio / {formData.rentalPeriod === 'Diario' ? 'Día' : formData.rentalPeriod === 'Semanal' ? 'Semana' : formData.rentalPeriod === 'Quincenal' ? 'Quincena' : 'Mes'} €
                                        </label>
                                        <input name="agreedPrice" type="number" min="0" value={formData.agreedPrice} onChange={handleInputChange}
                                            className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 text-sm" placeholder="Auto" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Importe total €</label>
                                        <input name="totalAmount" type="number" min="0" value={formData.totalAmount} onChange={handleInputChange}
                                            className="w-full border-emerald-300 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 text-sm bg-emerald-50" placeholder="Auto" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Gasto limpieza final €</label>
                                        <input name="cleaningFee" type="number" min="0" value={formData.cleaningFee} onChange={handleInputChange}
                                            className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 text-sm" placeholder="0" />
                                    </div>
                                </div>
                                {/* Info cálculo */}
                                {formData.agreedPrice && formData.startDate && formData.endDate && (() => {
                                    const n = calcPeriods(formData.startDate, formData.endDate, formData.rentalPeriod);
                                    return n ? (
                                        <p className="text-[11px] text-slate-400">
                                            €{parseFloat(formData.agreedPrice).toLocaleString('es-ES')} × {n} {formData.rentalPeriod === 'Diario' ? 'día(s)' : formData.rentalPeriod === 'Semanal' ? 'semana(s)' : formData.rentalPeriod === 'Quincenal' ? 'quincena(s)' : 'mes(es)'} = <strong>€{(parseFloat(formData.agreedPrice) * n).toLocaleString('es-ES')}</strong>
                                        </p>
                                    ) : null;
                                })()}
                            </div>
                        )}

                        {/* Dates: 1 field for Visita, 2 for others */}
                        {isVisita ? (
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Fecha</label>
                                <input name="startDate" type="date" value={formData.startDate} onChange={handleInputChange} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500" required />
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Inicio</label>
                                    <input name="startDate" type="date" value={formData.startDate} onChange={handleInputChange} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500" required />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Fin</label>
                                    <input name="endDate" type="date" value={formData.endDate} onChange={handleInputChange} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500" required min={formData.startDate || undefined} />
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Estado</label>
                            <select name="status" value={formData.status} onChange={handleInputChange} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500">
                                <option value="Pendiente">Pendiente</option>
                                <option value="Confirmado">Confirmado</option>
                                <option value="Cancelado">Cancelado</option>
                                <option value="Completado">Completado</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Comentarios</label>
                            <textarea name="description" value={formData.description} onChange={handleInputChange} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500" rows="3" placeholder="Detalles del contrato o tarea de mantenimiento..."></textarea>
                        </div>

                        <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 rounded-xl transition-all shadow-lg hover:shadow-xl mt-2">
                            {selectedId ? 'Actualizar Evento' : 'Agendar Evento'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Events;
