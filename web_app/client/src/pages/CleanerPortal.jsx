import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const CleanerPortal = () => {
    const { user } = useAuth();
    const [schedule, setSchedule] = useState([]);
    const [logs, setLogs] = useState([]);
    const [properties, setProperties] = useState([]);
    const [activeLog, setActiveLog] = useState(null);
    const [exitObservations, setExitObservations] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    useEffect(() => {
        if (user?.id) {
            fetchData();
        }
    }, [user]);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [scheduleRes, logsRes, propertiesRes] = await Promise.all([
                api.get('/cleaning-schedule'),
                api.get('/cleaning-logs'),
                api.get('/properties')
            ]);

            // Filter by current technician user.id
            const mySchedule = scheduleRes.data.filter(s => s.cleanerId === user.id);
            const myLogs = logsRes.data.filter(l => l.cleanerId === user.id);

            setSchedule(mySchedule);
            setLogs(myLogs);
            setProperties(propertiesRes.data);

            // Check for active log
            const active = myLogs.find(l => !l.exitTime || l.status === 'Iniciado' || l.status === 'En curso');
            setActiveLog(active || null);
        } catch (err) {
            console.error('Error fetching portal data:', err);
            setError('Error al cargar los datos del portal.');
        } finally {
            setLoading(false);
        }
    };

    const handleEntry = async (item) => {
        setError(null);
        try {
            const now = new Date();
            const logData = {
                id: Date.now().toString(),
                scheduleId: item.id,
                cleanerId: user.id,
                propertyId: item.propertyId,
                date: now.toISOString().split('T')[0],
                entryTime: now.toTimeString().split(' ')[0],
                status: 'En curso'
            };
            await api.post('/cleaning-logs/entry', logData);
            setSuccess('Entrada registrada correctamente');
            setTimeout(() => setSuccess(null), 3000);
            fetchData();
        } catch (err) {
            setError(err.response?.data?.message || 'Error registrando entrada');
        }
    };

    const handleExit = async () => {
        if (!activeLog) return;
        setError(null);
        try {
            const now = new Date();
            await api.put(`/cleaning-logs/${activeLog.id}/exit`, {
                exitTime: now.toTimeString().split(' ')[0],
                observations: exitObservations,
                status: 'Completado'
            });
            setExitObservations('');
            setSuccess('Salida registrada correctamente');
            setTimeout(() => setSuccess(null), 3000);
            fetchData();
        } catch (err) {
            setError(err.response?.data?.message || 'Error registrando salida');
        }
    };

    const getPropertyAddress = (id) => properties.find(p => p.id === id)?.address || 'Propiedad desconocida';

    if (loading) return <div className="p-12 text-center text-slate-500 font-medium">Cargando tu agenda personal...</div>;

    const today = new Date().toISOString().split('T')[0];
    const todayLogs = logs.filter(l => l.date === today);

    return (
        <div className="container mx-auto max-w-7xl">
            <header className="mb-10">
                <h2 className="text-4xl font-black text-slate-900 tracking-tight">Portal de Limpieza</h2>
                <p className="text-slate-500 font-medium mt-1 uppercase tracking-wider text-sm flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
                    Sesión de: {user?.name}
                </p>
            </header>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm mb-6 flex items-center">
                    <svg className="w-5 h-5 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                    {error}
                </div>
            )}
            {success && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-sm mb-6 flex items-center">
                    <svg className="w-5 h-5 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    {success}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Schedule */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="p-6 border-b border-slate-50 bg-slate-50/50 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-slate-800">Mi Agenda Semanal</h3>
                            <button onClick={fetchData} className="text-xs font-bold text-cyan-600 hover:text-cyan-700 uppercase tracking-widest">Actualizar</button>
                        </div>
                        <div className="divide-y divide-slate-50">
                            {schedule.length === 0 ? (
                                <div className="p-12 text-center text-slate-400 font-medium italic">
                                    No tienes asignaciones de limpieza todavía.
                                </div>
                            ) : schedule.map(item => {
                                const property = properties.find(p => p.id === item.propertyId);
                                const isCurrentActive = activeLog?.scheduleId === item.id;
                                const alreadyWorked = todayLogs.some(l => l.propertyId === item.propertyId && l.status === 'Completado');

                                return (
                                    <div key={item.id} className="p-6 hover:bg-slate-50 transition-colors group">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <div className="flex items-center gap-3 mb-1">
                                                    <span className="bg-cyan-50 text-cyan-700 text-[10px] font-black uppercase px-2 py-0.5 rounded-md tracking-widest">
                                                        {item.frequency}
                                                    </span>
                                                    <span className="text-slate-400 text-sm font-bold">{item.dayOfWeek}</span>
                                                </div>
                                                <h4 className="text-lg font-bold text-slate-800 group-hover:text-cyan-600 transition-colors">
                                                    {property?.address || 'Propiedad'}
                                                </h4>
                                                <p className="text-slate-500 text-sm font-medium">{property?.city || '—'}</p>
                                            </div>

                                            {alreadyWorked ? (
                                                <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-100 text-emerald-700">
                                                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                    Completado hoy
                                                </span>
                                            ) : !activeLog ? (
                                                <button
                                                    onClick={() => handleEntry(item)}
                                                    className="bg-slate-900 hover:bg-cyan-600 text-white font-bold py-2.5 px-6 rounded-2xl transition-all shadow-md hover:shadow-cyan-200/50 flex items-center gap-2 group/btn"
                                                >
                                                    FICHAR ENTRADA
                                                    <svg className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                                                </button>
                                            ) : isCurrentActive ? (
                                                <span className="bg-emerald-50 text-emerald-600 text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2 border border-emerald-100">
                                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                                    TRABAJANDO AQUÍ
                                                </span>
                                            ) : (
                                                <span className="text-xs text-slate-400">En otra propiedad</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Today's History */}
                    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                        <div className="p-6 border-b border-slate-50">
                            <h3 className="text-xl font-bold text-slate-800">Mi Actividad Hoy</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-widest">Propiedad</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-widest">Entrada/Salida</th>
                                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-widest">Estado</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {todayLogs.length === 0 ? (
                                        <tr><td colSpan="3" className="px-6 py-8 text-center text-slate-400 text-sm font-medium">Sin registros hoy</td></tr>
                                    ) : todayLogs.map(l => (
                                        <tr key={l.id}>
                                            <td className="px-6 py-4 text-sm font-bold text-slate-900">{getPropertyAddress(l.propertyId)}</td>
                                            <td className="px-6 py-4 text-sm text-slate-600 font-mono text-xs">
                                                {l.entryTime} → {l.exitTime || '—'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${l.status === 'Completado' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                    {l.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Right: Active Session Banner */}
                <div className="lg:col-span-1 space-y-6">
                    {activeLog ? (
                        <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl shadow-xl p-8 text-white sticky top-6">
                            <div className="flex items-center mb-6">
                                <span className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse mr-3"></span>
                                <span className="text-xs font-black uppercase tracking-[0.2em] text-emerald-400">Sesión Activa</span>
                            </div>

                            <h4 className="text-2xl font-black mb-1 leading-tight">{getPropertyAddress(activeLog.propertyId)}</h4>
                            <p className="text-slate-400 text-sm font-bold flex items-center gap-2 mb-8">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                Iniciado a las {activeLog.entryTime}h
                            </p>

                            <div className="space-y-4">
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500">Observaciones</label>
                                <textarea
                                    value={exitObservations}
                                    onChange={e => setExitObservations(e.target.value)}
                                    placeholder="¿Alguna novedad o algo roto?..."
                                    className="w-full text-white border-0 rounded-2xl text-sm p-4 bg-slate-700/50 placeholder-slate-500 focus:ring-2 focus:ring-emerald-500 transition-all"
                                    rows="4"
                                ></textarea>
                                <button
                                    onClick={handleExit}
                                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-4 rounded-2xl transition-all shadow-lg shadow-emerald-500/20 uppercase tracking-widest text-sm"
                                >
                                    Fichar Salida
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-slate-100 rounded-3xl p-8 text-center border-2 border-dashed border-slate-200 sticky top-6">
                            <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
                            </div>
                            <h4 className="text-lg font-bold text-slate-800 mb-2">Sin sesión activa</h4>
                            <p className="text-sm text-slate-500 font-medium">Selecciona una propiedad de tu agenda para empezar a trabajar.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CleanerPortal;
