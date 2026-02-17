import React, { useState, useEffect, useCallback } from 'react';
import Timeline, { TodayMarker } from 'react-calendar-timeline';
import "react-calendar-timeline/dist/style.css";
import moment from 'moment';
import 'moment/locale/es';
import api from '../services/api';

moment.locale('es');

const EVENT_COLORS = {
    Alquiler: { bg: '#3b82f6', border: '#2563eb', text: 'white' },
    Mantenimiento: { bg: '#f59e0b', border: '#d97706', text: 'white' },
    Visita: { bg: '#10b981', border: '#059669', text: 'white' },
};

const Dashboard = () => {
    const [events, setEvents] = useState([]);
    const [groups, setGroups] = useState([]);
    const [visibleTimeStart, setVisibleTimeStart] = useState(moment().startOf('month').valueOf());
    const [visibleTimeEnd, setVisibleTimeEnd] = useState(moment().add(2, 'months').endOf('month').valueOf());
    const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, data: null });

    useEffect(() => {
        fetchData();
    }, []);

    // Close tooltip on scroll/click outside
    useEffect(() => {
        const hide = () => setTooltip(t => t.visible ? { ...t, visible: false } : t);
        window.addEventListener('scroll', hide, true);
        return () => window.removeEventListener('scroll', hide, true);
    }, []);

    const handleTimeChange = (start, end, update) => {
        setVisibleTimeStart(start);
        setVisibleTimeEnd(end);
        update(start, end);
    };

    const changeView = (view) => {
        let start, end;
        switch (view) {
            case 'day':
                start = moment().startOf('day');
                end = moment().endOf('day');
                break;
            case 'week':
                start = moment().startOf('week');
                end = moment().endOf('week');
                break;
            case 'month':
            default:
                start = moment().startOf('month');
                end = moment().add(2, 'month').endOf('month');
        }
        setVisibleTimeStart(start.valueOf());
        setVisibleTimeEnd(end.valueOf());
    };

    const fetchData = async () => {
        try {
            const [eventsRes, propertiesRes, clientsRes] = await Promise.all([
                api.get('/events'),
                api.get('/properties'),
                api.get('/clients')
            ]);

            const propertiesMap = {};
            propertiesRes.data.forEach(p => { propertiesMap[p.id] = p; });

            const clientsMap = {};
            clientsRes.data.forEach(c => { clientsMap[c.id] = c; });

            const timelineGroups = propertiesRes.data.map(p => ({
                id: p.id,
                title: p.address || `Propiedad ${p.id}`,
            }));
            setGroups(timelineGroups);

            const timelineItems = eventsRes.data.map(ev => {
                const property = propertiesMap[ev.propertyId] || {};
                const client = clientsMap[ev.clientId] || {};
                const colors = EVENT_COLORS[ev.type] || EVENT_COLORS.Alquiler;

                return {
                    id: ev.id,
                    group: ev.propertyId,
                    title: ev.type,
                    start_time: moment(ev.startDate),
                    end_time: moment(ev.endDate).add(1, 'day'),
                    canMove: false,
                    canResize: false,
                    canChangeGroup: false,
                    // Extra data for tooltip
                    _property: property,
                    _client: client,
                    _event: ev,
                    _colors: colors,
                    itemProps: {
                        className: 'rct-custom-item',
                        style: {
                            background: colors.bg,
                            borderColor: colors.border,
                            color: colors.text,
                            borderRadius: '6px',
                            borderWidth: '1px',
                            borderStyle: 'solid',
                            fontSize: '11px',
                            fontWeight: '600',
                            overflow: 'hidden',
                        }
                    }
                };
            });
            setEvents(timelineItems);

        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        }
    };

    const showTooltip = useCallback((e, item) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setTooltip({
            visible: true,
            x: rect.left + rect.width / 2,
            y: rect.top,
            data: item,
        });
    }, []);

    const hideTooltip = useCallback(() => {
        setTooltip(t => ({ ...t, visible: false }));
    }, []);

    const itemRenderer = ({ item, itemContext, getItemProps }) => {
        const props = getItemProps(item.itemProps);
        return (
            <div
                {...props}
                onMouseEnter={(e) => showTooltip(e, item)}
                onMouseLeave={hideTooltip}
            >
                <div style={{
                    padding: '0 8px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    lineHeight: `${itemContext.dimensions.height}px`,
                }}>
                    {itemContext.title}
                </div>
            </div>
        );
    };

    return (
        <div className="container mx-auto max-w-7xl h-full flex flex-col">
            <div className="mb-6 flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Timeline</h2>
                    <p className="text-slate-500 mt-1">Vista cronológica por propiedad</p>
                </div>
                <div className="flex items-center space-x-4">
                    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-1 flex space-x-1">
                        <button onClick={() => changeView('day')} className="px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded transition-colors">Día</button>
                        <button onClick={() => changeView('week')} className="px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded transition-colors">Semana</button>
                        <button onClick={() => changeView('month')} className="px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded transition-colors">Meses</button>
                    </div>
                    <div className="flex space-x-2">
                        <span className="flex items-center text-xs font-semibold text-slate-500 bg-white px-3 py-1 rounded-full shadow-sm border border-slate-200">
                            <span className="w-2 h-2 rounded-full bg-blue-500 mr-2"></span> Alquiler
                        </span>
                        <span className="flex items-center text-xs font-semibold text-slate-500 bg-white px-3 py-1 rounded-full shadow-sm border border-slate-200">
                            <span className="w-2 h-2 rounded-full bg-amber-500 mr-2"></span> Mantenimiento
                        </span>
                        <span className="flex items-center text-xs font-semibold text-slate-500 bg-white px-3 py-1 rounded-full shadow-sm border border-slate-200">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></span> Visita
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex-1 bg-white p-4 rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col relative">
                <style>{`
                    .react-calendar-timeline .rct-header-root { background: #f8fafc; border-bottom: 1px solid #e2e8f0; font-family: 'Inter'; font-weight: 600; color: #475569; }
                    .react-calendar-timeline .rct-calendar-header { border: none; }
                    .react-calendar-timeline .rct-date-header { background: #f1f5f9; border-left: 1px solid #e2e8f0; color: #64748b; }
                    .react-calendar-timeline .rct-sidebar-header { background: #f8fafc; color: #475569; font-weight: 700; border-right: 1px solid #e2e8f0; }
                    .react-calendar-timeline .rct-sidebar-row { background: white; border-bottom: 1px solid #f1f5f9; color: #334155; padding-left: 10px; font-weight: 500; }
                    .react-calendar-timeline .rct-sidebar-row.rct-sidebar-row-odd { background: #fafafa; }
                    .react-calendar-timeline .rct-horizontal-lines .rct-hl-even, 
                    .react-calendar-timeline .rct-horizontal-lines .rct-hl-odd { border-bottom: 1px solid #f1f5f9; background: transparent; }
                    .react-calendar-timeline .rct-vertical-lines .rct-vl { border-left: 1px solid #f1f5f9; background: transparent; }
                `}</style>
                {groups.length > 0 ? (
                    <Timeline
                        groups={groups}
                        items={events}
                        visibleTimeStart={visibleTimeStart}
                        visibleTimeEnd={visibleTimeEnd}
                        onTimeChange={handleTimeChange}
                        sidebarWidth={200}
                        lineHeight={50}
                        itemHeightRatio={0.75}
                        canMove={false}
                        canResize={false}
                        itemRenderer={itemRenderer}
                    >
                        <TodayMarker interval={1000 * 60 * 60 * 24}>
                            {({ styles, date }) => (
                                <div style={{ ...styles, backgroundColor: 'red', width: '2px', opacity: 0.5 }} />
                            )}
                        </TodayMarker>
                    </Timeline>
                ) : (
                    <div className="flex items-center justify-center h-full text-slate-400">
                        Cargando propiedades o no hay datos...
                    </div>
                )}

                {/* Tooltip */}
                {tooltip.visible && tooltip.data && (
                    <div
                        className="fixed z-[9999] pointer-events-none"
                        style={{
                            left: tooltip.x,
                            top: tooltip.y - 8,
                            transform: 'translate(-50%, -100%)',
                        }}
                    >
                        <div className="bg-slate-800 text-white rounded-xl shadow-xl px-4 py-3 text-xs max-w-xs"
                            style={{ backdropFilter: 'blur(8px)', minWidth: '220px' }}>
                            {/* Header con tipo de evento */}
                            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-600">
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tooltip.data._colors.bg }}></span>
                                <span className="font-bold text-sm">{tooltip.data._event.type}</span>
                                {tooltip.data._event.status && (
                                    <span className="ml-auto bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded text-[10px]">
                                        {tooltip.data._event.status}
                                    </span>
                                )}
                            </div>

                            {/* Property info */}
                            <div className="space-y-1.5">
                                {tooltip.data._property.address && (
                                    <div className="flex justify-between gap-3">
                                        <span className="text-slate-400">Dirección</span>
                                        <span className="font-medium text-right">{tooltip.data._property.address}</span>
                                    </div>
                                )}
                                {tooltip.data._property.city && (
                                    <div className="flex justify-between gap-3">
                                        <span className="text-slate-400">Ciudad</span>
                                        <span className="font-medium">{tooltip.data._property.city}</span>
                                    </div>
                                )}
                                {tooltip.data._property.price && (
                                    <div className="flex justify-between gap-3">
                                        <span className="text-slate-400">Precio</span>
                                        <span className="font-medium text-emerald-400">{Number(tooltip.data._property.price).toLocaleString('es-ES')} €</span>
                                    </div>
                                )}
                                {tooltip.data._property.type && (
                                    <div className="flex justify-between gap-3">
                                        <span className="text-slate-400">Tipo inmueble</span>
                                        <span className="font-medium">{tooltip.data._property.type}</span>
                                    </div>
                                )}
                                {tooltip.data._client.name && (
                                    <div className="flex justify-between gap-3">
                                        <span className="text-slate-400">Cliente</span>
                                        <span className="font-medium">{tooltip.data._client.name}</span>
                                    </div>
                                )}
                            </div>

                            {/* Dates */}
                            <div className="mt-2 pt-2 border-t border-slate-600 flex justify-between gap-3">
                                <span className="text-slate-400">Fechas</span>
                                <span className="font-medium">
                                    {moment(tooltip.data._event.startDate).format('DD MMM YY')} — {moment(tooltip.data._event.endDate).format('DD MMM YY')}
                                </span>
                            </div>

                            {/* Description */}
                            {tooltip.data._event.description && (
                                <div className="mt-2 pt-2 border-t border-slate-600">
                                    <span className="text-slate-400 block mb-0.5">Descripción</span>
                                    <span className="text-slate-200">{tooltip.data._event.description}</span>
                                </div>
                            )}

                            {/* Tooltip arrow */}
                            <div className="absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 bg-slate-800 rotate-45 rounded-sm"></div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Dashboard;
