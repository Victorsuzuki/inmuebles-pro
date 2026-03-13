import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Timeline, { TodayMarker } from 'react-calendar-timeline';
import "react-calendar-timeline/dist/style.css";
import moment from 'moment';
import 'moment/locale/es';

moment.locale('es');

const EVENT_COLORS = {
    Alquiler: { bg: '#3b82f6', border: '#2563eb', text: 'white' },
    Mantenimiento: { bg: '#f59e0b', border: '#d97706', text: 'white' },
    Visita: { bg: '#10b981', border: '#059669', text: 'white' },
};

const OwnerView = () => {
    const { user } = useAuth();
    const [properties, setProperties] = useState([]);
    const [ownerFilter, setOwnerFilter] = useState('');
    const [owners, setOwners] = useState([]);
    const [selectedProp, setSelectedProp] = useState(null);
    const [propEvents, setPropEvents] = useState([]);
    const [propPayments, setPropPayments] = useState([]);

    // Timeline state
    const [timelineGroups, setTimelineGroups] = useState([]);
    const [timelineItems, setTimelineItems] = useState([]);
    const [visibleTimeStart, setVisibleTimeStart] = useState(moment().startOf('month').valueOf());
    const [visibleTimeEnd, setVisibleTimeEnd] = useState(moment().add(2, 'months').endOf('month').valueOf());
    const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, data: null });

    useEffect(() => { fetchProperties(); }, []);
    useEffect(() => { fetchTimelineData(); }, [ownerFilter, properties]);

    // Close tooltip on scroll/click outside
    useEffect(() => {
        const hide = () => setTooltip(t => t.visible ? { ...t, visible: false } : t);
        window.addEventListener('scroll', hide, true);
        return () => window.removeEventListener('scroll', hide, true);
    }, []);

    const fetchTimelineData = async () => {
        if (!ownerFilter || properties.length === 0) return;
        try {
            const [eventsRes, clientsRes] = await Promise.all([
                api.get('/events'),
                api.get('/clients')
            ]);

            const ownerProps = properties.filter(p => p.owner === ownerFilter);
            const propsMap = {};
            ownerProps.forEach(p => propsMap[p.id] = p);

            const clientsMap = {};
            clientsRes.data.forEach(c => clientsMap[c.id] = c);

            const groups = ownerProps.map(p => ({
                id: p.id,
                title: p.address || `Propiedad ${p.id}`
            }));
            setTimelineGroups(groups);

            const items = eventsRes.data
                .filter(ev => propsMap[ev.propertyId]) // Only current owner's events
                .map(ev => {
                    const colors = EVENT_COLORS[ev.type] || EVENT_COLORS.Alquiler;
                    return {
                        id: ev.id,
                        group: ev.propertyId,
                        title: ev.type,
                        start_time: moment(ev.startDate),
                        end_time: moment(ev.endDate).add(1, 'day'),
                        canMove: false,
                        canResize: false,
                        _property: propsMap[ev.propertyId],
                        _client: clientsMap[ev.clientId] || {},
                        _event: ev,
                        _colors: colors,
                        itemProps: {
                            style: {
                                background: colors.bg,
                                borderColor: colors.border,
                                color: colors.text,
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: '600'
                            }
                        }
                    };
                });
            setTimelineItems(items);
        } catch (err) { console.error('Timeline error:', err); }
    };

    const handleTimeChange = (start, end, update) => {
        setVisibleTimeStart(start);
        setVisibleTimeEnd(end);
        update(start, end);
    };

    const showTooltip = useCallback((e, item) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setTooltip({ visible: true, x: rect.left + rect.width / 2, y: rect.top, data: item });
    }, []);

    const hideTooltip = useCallback(() => setTooltip(t => ({ ...t, visible: false })), []);

    const itemRenderer = ({ item, itemContext, getItemProps }) => {
        const { key, ...props } = getItemProps(item.itemProps);
        return (
            <div key={key} {...props} onMouseEnter={(e) => showTooltip(e, item)} onMouseLeave={hideTooltip}>
                <div style={{ padding: '0 8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: `${itemContext.dimensions.height}px` }}>
                    {itemContext.title}
                </div>
            </div>
        );
    };

    // Auto-filter by owner name if logged in as PROPIETARIO
    useEffect(() => {
        if (user?.role === 'PROPIETARIO' && user.name) {
            setOwnerFilter(user.name);
        }
    }, [user]);

    const fetchProperties = async () => {
        try {
            const res = await api.get('/properties');
            setProperties(res.data);
            const uniqueOwners = [...new Set(res.data.map(p => p.owner).filter(Boolean))];
            setOwners(uniqueOwners.sort());
        } catch (err) { console.error(err); }
    };

    const filtered = ownerFilter
        ? properties.filter(p => p.owner === ownerFilter)
        : properties;

    const handleSelectProperty = async (prop) => {
        setSelectedProp(prop);
        try {
            const [evRes, payRes] = await Promise.all([
                api.get('/events'),
                api.get('/payments')
            ]);
            setPropEvents(evRes.data.filter(e => e.propertyId === prop.id));
            setPropPayments(payRes.data.filter(p => p.propertyId === prop.id));
        } catch (err) { console.error(err); }
    };

    const isAutoFiltered = user?.role === 'PROPIETARIO' && ownerFilter;

    return (
        <div className="container mx-auto max-w-7xl">
            <div className="mb-8">
                <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Vista de Propietarios</h2>
                <p className="text-slate-500 mt-1">
                    {isAutoFiltered ? `Bienvenido/a, ${user.name}. Aquí tienes tus propiedades.` : 'Consulta las propiedades por propietario'}
                </p>
            </div>

            {/* Owner Selector (Hidden if auto-filtered) */}
            {!isAutoFiltered && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-8">
                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-2">Filtrar por Propietario</label>
                    <select value={ownerFilter} onChange={e => setOwnerFilter(e.target.value)} className="w-full max-w-md border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500 text-lg">
                        <option value="">— Todos los propietarios —</option>
                        {owners.map(o => (
                            <option key={o} value={o}>{o} ({properties.filter(p => p.owner === o).length} propiedades)</option>
                        ))}
                    </select>
                </div>
            )}

            {/* Summary cards */}
            {ownerFilter && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <p className="text-blue-500 font-medium text-sm uppercase">Total</p>
                        <p className="text-3xl font-bold text-slate-800 mt-1">{filtered.length}</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <p className="text-emerald-500 font-medium text-sm uppercase">Disponibles</p>
                        <p className="text-3xl font-bold text-slate-800 mt-1">{filtered.filter(p => p.status === 'Disponible').length}</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <p className="text-amber-500 font-medium text-sm uppercase">Alquilados</p>
                        <p className="text-3xl font-bold text-slate-800 mt-1">{filtered.filter(p => p.status === 'Alquilado').length}</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <p className="text-slate-500 font-medium text-sm uppercase">Archivados</p>
                        <p className="text-3xl font-bold text-slate-800 mt-1">{filtered.filter(p => p.archived === 'true').length}</p>
                    </div>
                </div>
            )}

            {/* Timeline View */}
            {ownerFilter && timelineGroups.length > 0 && (
                <div className="mb-8">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-slate-800">Calendario de Propiedades</h3>
                        <div className="flex gap-2">
                            {Object.keys(EVENT_COLORS).map(type => (
                                <span key={type} className="flex items-center text-[10px] font-bold text-slate-500 bg-white px-2 py-1 rounded-full border border-slate-100 shadow-sm">
                                    <span className="w-2 h-2 rounded-full mr-1.5" style={{ background: EVENT_COLORS[type].bg }}></span> {type}
                                </span>
                            ))}
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 relative min-h-[300px]">
                        <style>{`
                            .react-calendar-timeline .rct-header-root { background: #f8fafc; border-bottom: 1px solid #e2e8f0; font-family: 'Inter'; font-weight: 600; color: #475569; }
                            .react-calendar-timeline .rct-date-header { background: #f1f5f9; color: #64748b; }
                            .react-calendar-timeline .rct-sidebar-header { background: #f8fafc; font-weight: 700; border-right: 1px solid #e2e8f0; }
                            .react-calendar-timeline .rct-sidebar-row { background: white; border-bottom: 1px solid #f1f5f9; color: #334155; font-size: 12px; }
                        `}</style>
                        <Timeline
                            groups={timelineGroups}
                            items={timelineItems}
                            visibleTimeStart={visibleTimeStart}
                            visibleTimeEnd={visibleTimeEnd}
                            onTimeChange={handleTimeChange}
                            sidebarWidth={180}
                            lineHeight={45}
                            itemHeightRatio={0.7}
                            itemRenderer={itemRenderer}
                        >
                            <TodayMarker />
                        </Timeline>

                        {/* Tooltip (reused style) */}
                        {tooltip.visible && tooltip.data && (
                            <div className="fixed z-[9999] pointer-events-none" style={{ left: tooltip.x, top: tooltip.y - 8, transform: 'translate(-50%, -100%)' }}>
                                <div className="bg-slate-800 text-white rounded-xl shadow-xl px-4 py-3 text-[10px] min-w-[200px]" style={{ backdropFilter: 'blur(8px)' }}>
                                    <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-600">
                                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tooltip.data._colors.bg }}></span>
                                        <span className="font-bold">{tooltip.data._event.type}</span>
                                        <span className="ml-auto opacity-60">{tooltip.data._event.status}</span>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex justify-between"><span>Propiedad</span><span className="font-medium">{tooltip.data._property.address}</span></div>
                                        {tooltip.data._client.name && <div className="flex justify-between"><span>Cliente</span><span className="font-medium">{tooltip.data._client.name}</span></div>}
                                        <div className="flex justify-between pt-1 border-t border-slate-600"><span>Fechas</span><span>{moment(tooltip.data._event.startDate).format('DD/MM')} - {moment(tooltip.data._event.endDate).format('DD/MM')}</span></div>
                                    </div>
                                    <div className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 bg-slate-800 rotate-45 rounded-sm"></div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Properties Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Propiedad</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Propietario</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Estado</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Precio</th>
                                <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Detalles</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filtered.length === 0 ? (
                                <tr><td colSpan="6" className="px-6 py-12 text-center text-slate-400">
                                    Selecciona un propietario para ver sus propiedades
                                </td></tr>
                            ) : filtered.map(prop => (
                                <tr key={prop.id} className={`hover:bg-slate-50/50 transition-colors ${prop.archived === 'true' ? 'opacity-50' : ''}`}>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-semibold text-slate-900">{prop.address}</div>
                                        <div className="text-xs text-slate-500">{prop.type} • {prop.city}</div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-700">{prop.owner}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                            ${prop.status === 'Disponible' ? 'bg-emerald-100 text-emerald-800' :
                                                prop.status === 'Alquilado' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
                                            {prop.status}
                                        </span>
                                        {prop.archived === 'true' && <span className="ml-1 px-1.5 py-0.5 bg-slate-200 text-slate-500 rounded text-[10px]">ARCH.</span>}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600 font-medium">€{prop.price}/mes</td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1 text-[10px]">
                                            {prop.bedrooms && <span className="bg-slate-100 px-1.5 py-0.5 rounded-full">{prop.bedrooms}hab</span>}
                                            {prop.sqMeters && <span className="bg-slate-100 px-1.5 py-0.5 rounded-full">{prop.sqMeters}m²</span>}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => handleSelectProperty(prop)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                                            Ver detalle →
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Property Detail Modal */}
            {selectedProp && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[1000] p-4" onClick={() => setSelectedProp(null)}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8" onClick={e => e.stopPropagation()}>
                        <h3 className="text-2xl font-bold text-slate-800 mb-1">{selectedProp.address}</h3>
                        <p className="text-slate-500 mb-6">{selectedProp.city} | {selectedProp.type} | Propietario: {selectedProp.owner}</p>

                        <div className="grid grid-cols-3 gap-4 mb-6">
                            <div className="bg-slate-50 p-4 rounded-xl text-center">
                                <p className="text-xs text-slate-500 uppercase">Precio</p>
                                <p className="text-xl font-bold text-slate-800">€{selectedProp.price}</p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-xl text-center">
                                <p className="text-xs text-slate-500 uppercase">Estado</p>
                                <p className="text-xl font-bold text-slate-800">{selectedProp.status}</p>
                            </div>
                            <div className="bg-slate-50 p-4 rounded-xl text-center">
                                <p className="text-xs text-slate-500 uppercase">Superficie</p>
                                <p className="text-xl font-bold text-slate-800">{selectedProp.sqMeters || '—'} m²</p>
                            </div>
                        </div>

                        {/* Events */}
                        <div className="mb-6">
                            <h4 className="text-sm font-bold text-slate-800 uppercase mb-2">Eventos ({propEvents.length})</h4>
                            {propEvents.length === 0 ? (
                                <p className="text-sm text-slate-400">Sin eventos</p>
                            ) : (
                                <div className="space-y-2">
                                    {propEvents.slice(0, 5).map(ev => (
                                        <div key={ev.id} className="flex items-center justify-between bg-slate-50 rounded-lg p-3">
                                            <div>
                                                <span className="text-xs font-medium text-slate-600">{ev.type}</span>
                                                <span className="text-xs text-slate-400 ml-2">{ev.startDate} → {ev.endDate}</span>
                                            </div>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${ev.status === 'Confirmado' ? 'bg-emerald-100 text-emerald-700' : ev.status === 'Cancelado' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                                                {ev.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Payments */}
                        <div className="mb-6">
                            <h4 className="text-sm font-bold text-slate-800 uppercase mb-2">Pagos ({propPayments.length})</h4>
                            {propPayments.length === 0 ? (
                                <p className="text-sm text-slate-400">Sin pagos registrados</p>
                            ) : (
                                <div className="space-y-2">
                                    {propPayments.slice(0, 5).map(pay => (
                                        <div key={pay.id} className="flex items-center justify-between bg-slate-50 rounded-lg p-3">
                                            <div>
                                                <span className="text-sm font-medium text-slate-700">€{pay.amount}</span>
                                                <span className="text-xs text-slate-400 ml-2">{pay.date} — {pay.type}</span>
                                            </div>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${pay.status === 'Pagado' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                {pay.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <button onClick={() => setSelectedProp(null)} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 rounded-xl transition-all">
                            Cerrar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OwnerView;
