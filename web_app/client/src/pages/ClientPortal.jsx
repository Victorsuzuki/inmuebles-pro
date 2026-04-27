import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const ClientPortal = () => {
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedProp, setSelectedProp] = useState(null);
    const [filter, setFilter] = useState({ type: '', minPrice: '', maxPrice: '', bedrooms: '' });

    // Registration form
    const [showRegister, setShowRegister] = useState(false);
    const [regForm, setRegForm] = useState({ name: '', email: '', phone: '', dni: '' });
    const [regMessage, setRegMessage] = useState(null);
    const [regError, setRegError] = useState(null);

    // Lightbox
    const [lightbox, setLightbox] = useState({ open: false, idx: 0 });
    const openLightbox = (idx) => setLightbox({ open: true, idx });
    const closeLightbox = () => setLightbox(l => ({ ...l, open: false }));
    const photos = selectedProp?.photos || [];
    const prevPhoto = useCallback(() => setLightbox(l => ({ ...l, idx: (l.idx - 1 + photos.length) % photos.length })), [photos.length]);
    const nextPhoto = useCallback(() => setLightbox(l => ({ ...l, idx: (l.idx + 1) % photos.length })), [photos.length]);

    useEffect(() => {
        if (!lightbox.open) return;
        const handler = (e) => {
            if (e.key === 'Escape') closeLightbox();
            if (e.key === 'ArrowLeft') prevPhoto();
            if (e.key === 'ArrowRight') nextPhoto();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [lightbox.open, prevPhoto, nextPhoto]);

    // Availability checker
    const [avail, setAvail] = useState({ start: '', end: '', result: null, loading: false });

    useEffect(() => { fetchProperties(); }, []);

    const fetchProperties = async () => {
        try {
            const res = await api.get('/public/properties');
            setProperties(res.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setRegError(null);
        try {
            const res = await api.post('/public/register', regForm);
            setRegMessage(res.data.message);
            setShowRegister(false);
            setRegForm({ name: '', email: '', phone: '', dni: '' });
        } catch (err) {
            setRegError(err.response?.data?.message || 'Error en el registro');
        }
    };

    const filtered = properties.filter(p => {
        if (filter.type && p.type !== filter.type) return false;
        if (filter.minPrice && Number(p.price) < Number(filter.minPrice)) return false;
        if (filter.maxPrice && Number(p.price) > Number(filter.maxPrice)) return false;
        if (filter.bedrooms && Number(p.bedrooms) < Number(filter.bedrooms)) return false;
        return true;
    });

    const types = [...new Set(properties.map(p => p.type).filter(Boolean))];
    const featLabel = (val) => val === 'true' ? '✓' : '';

    if (loading) return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
        </div>
    );

    return (
        <div className="container mx-auto max-w-7xl">
            <div className="flex justify-between items-center mb-8 flex-wrap gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Propiedades Disponibles</h2>
                    <p className="text-slate-500 mt-1">Consulta nuestro catálogo de inmuebles en alquiler</p>
                </div>
                <button onClick={() => setShowRegister(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl shadow-lg font-medium transition-all">
                    Registrarse como Cliente
                </button>
            </div>

            {/* Success/Error */}
            {regMessage && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-lg text-sm mb-6 flex items-center justify-between">
                    <span>✅ {regMessage}</span>
                    <button onClick={() => setRegMessage(null)} className="text-emerald-500">✕</button>
                </div>
            )}

            {/* Registration Modal */}
            {showRegister && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowRegister(false)}>
                    <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <h3 className="text-2xl font-bold text-slate-800 mb-6">Registro de Cliente</h3>
                        {regError && <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-lg text-sm mb-4">{regError}</div>}
                        <form onSubmit={handleRegister} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Nombre *</label>
                                <input value={regForm.name} onChange={e => setRegForm(f => ({ ...f, name: e.target.value }))} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500" required />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Email *</label>
                                <input type="email" value={regForm.email} onChange={e => setRegForm(f => ({ ...f, email: e.target.value }))} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500" required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Teléfono</label>
                                    <input value={regForm.phone} onChange={e => setRegForm(f => ({ ...f, phone: e.target.value }))} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">DNI/NIE</label>
                                    <input value={regForm.dni} onChange={e => setRegForm(f => ({ ...f, dni: e.target.value }))} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500" />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 rounded-xl transition-all shadow-lg">Registrarse</button>
                                <button type="button" onClick={() => setShowRegister(false)} className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 font-medium transition-all">Cancelar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Filters */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 mb-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Tipo</label>
                        <select value={filter.type} onChange={e => setFilter(f => ({ ...f, type: e.target.value }))} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500">
                            <option value="">Todos</option>
                            {types.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Precio mín. €</label>
                        <input type="number" value={filter.minPrice} onChange={e => setFilter(f => ({ ...f, minPrice: e.target.value }))} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Precio máx. €</label>
                        <input type="number" value={filter.maxPrice} onChange={e => setFilter(f => ({ ...f, maxPrice: e.target.value }))} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Habitaciones mín.</label>
                        <input type="number" min="0" value={filter.bedrooms} onChange={e => setFilter(f => ({ ...f, bedrooms: e.target.value }))} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500" />
                    </div>
                </div>
            </div>

            {/* Results count */}
            <p className="text-sm text-slate-500 mb-4">{filtered.length} propiedad(es) encontrada(s)</p>

            {/* Property Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map(prop => (
                    <div key={prop.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedProp(prop)}>
                        {/* Photo */}
                        <div className="h-48 bg-slate-100 relative overflow-hidden">
                            {prop.photos?.length > 0 ? (
                                (() => {
                                    const cover = prop.photos.find(ph => String(ph.isCover).toLowerCase() === 'true') || prop.photos[0];
                                    const firstMedia = cover.url || cover.driveUrl;
                                    const isVideo = firstMedia?.toLowerCase().includes('.mp4') || firstMedia?.toLowerCase().includes('.webm');
                                    return isVideo ? (
                                        <video src={firstMedia} className="w-full h-full object-cover" muted autoPlay loop />
                                    ) : (
                                        <img src={firstMedia} alt={prop.address} className="w-full h-full object-cover" />
                                    );
                                })()
                            ) : (
                                <div className="flex items-center justify-center h-full">
                                    <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                                </div>
                            )}
                            <div className="absolute top-3 right-3">
                                <span className="bg-emerald-500 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
                                    €{prop.price}/mes
                                </span>
                            </div>
                            <div className="absolute top-3 left-3">
                                <span className="bg-white/90 backdrop-blur text-slate-700 px-2 py-1 rounded-full text-xs font-medium">
                                    {prop.type}
                                </span>
                            </div>
                        </div>
                        <div className="p-5">
                            <h3 className="text-lg font-bold text-slate-800 mb-1">{prop.address}</h3>
                            <p className="text-sm text-slate-500 mb-3">{prop.city}{prop.zip ? `, ${prop.zip}` : ''}</p>
                            <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                                {prop.bedrooms && <span className="bg-slate-100 px-2 py-1 rounded-full">{prop.bedrooms} hab.</span>}
                                {prop.bathrooms && <span className="bg-slate-100 px-2 py-1 rounded-full">{prop.bathrooms} baños</span>}
                                {prop.sqMeters && <span className="bg-slate-100 px-2 py-1 rounded-full">{prop.sqMeters} m²</span>}
                                {prop.hasElevator === 'true' && <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-full">Ascensor</span>}
                                {prop.hasParking === 'true' && <span className="bg-blue-50 text-blue-600 px-2 py-1 rounded-full">Garaje</span>}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {filtered.length === 0 && (
                <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
                    <svg className="w-12 h-12 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    <p className="text-slate-400">No se encontraron propiedades con estos filtros</p>
                </div>
            )}

            {/* Property Detail Modal */}
            {selectedProp && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedProp(null)}>
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        {/* Photo Gallery */}
                        {selectedProp.photos?.length > 0 && (
                            <div className="h-64 md:h-80 overflow-hidden rounded-t-3xl bg-black">
                                {(() => {
                                    const cover = selectedProp.photos.find(ph => String(ph.isCover).toLowerCase() === 'true') || selectedProp.photos[0];
                                    const firstMedia = cover.url || cover.driveUrl;
                                    const isVideo = firstMedia?.toLowerCase().includes('.mp4') || firstMedia?.toLowerCase().includes('.webm');
                                    return isVideo ? (
                                        <video src={firstMedia} className="w-full h-full object-contain" controls autoPlay muted />
                                    ) : (
                                        <img src={firstMedia} alt="" className="w-full h-full object-cover" />
                                    );
                                })()}
                            </div>
                        )}

                        <div className="p-8">
                            <div className="flex items-start justify-between mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-800">{selectedProp.address}</h2>
                                    <p className="text-slate-500">{selectedProp.city}{selectedProp.zip ? `, ${selectedProp.zip}` : ''}</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-3xl font-bold text-emerald-600">€{selectedProp.price}</div>
                                    <div className="text-xs text-slate-400">/mes</div>
                                </div>
                            </div>

                            {selectedProp.description && (
                                <p className="text-sm text-slate-600 mb-6 leading-relaxed">{selectedProp.description}</p>
                            )}

                            {/* Characteristics grid */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                                {selectedProp.bedrooms && <div className="bg-slate-50 p-3 rounded-xl"><div className="text-xs text-slate-500 uppercase">Habitaciones</div><div className="text-lg font-bold text-slate-800">{selectedProp.bedrooms}</div></div>}
                                {selectedProp.bathrooms && <div className="bg-slate-50 p-3 rounded-xl"><div className="text-xs text-slate-500 uppercase">Baños</div><div className="text-lg font-bold text-slate-800">{selectedProp.bathrooms}</div></div>}
                                {selectedProp.sqMeters && <div className="bg-slate-50 p-3 rounded-xl"><div className="text-xs text-slate-500 uppercase">Superficie</div><div className="text-lg font-bold text-slate-800">{selectedProp.sqMeters} m²</div></div>}
                                {selectedProp.floor && <div className="bg-slate-50 p-3 rounded-xl"><div className="text-xs text-slate-500 uppercase">Planta</div><div className="text-lg font-bold text-slate-800">{selectedProp.floor}</div></div>}
                                {selectedProp.yearBuilt && <div className="bg-slate-50 p-3 rounded-xl"><div className="text-xs text-slate-500 uppercase">Año</div><div className="text-lg font-bold text-slate-800">{selectedProp.yearBuilt}</div></div>}
                                {selectedProp.energyCert && <div className="bg-slate-50 p-3 rounded-xl"><div className="text-xs text-slate-500 uppercase">Certificado</div><div className="text-lg font-bold text-slate-800">{selectedProp.energyCert}</div></div>}
                            </div>

                            {/* Features */}
                            <div className="flex flex-wrap gap-2 mb-6">
                                {selectedProp.hasElevator === 'true' && <span className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-sm font-medium">Ascensor</span>}
                                {selectedProp.hasParking === 'true' && <span className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-sm font-medium">Garaje</span>}
                                {selectedProp.hasPool === 'true' && <span className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-sm font-medium">Piscina</span>}
                                {selectedProp.hasTerrace === 'true' && <span className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-sm font-medium">Terraza</span>}
                                {selectedProp.hasAC === 'true' && <span className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-sm font-medium">Aire Acondicionado</span>}
                                {selectedProp.hasHeating === 'true' && <span className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-sm font-medium">Calefacción {selectedProp.heatingType ? `(${selectedProp.heatingType})` : ''}</span>}
                                {selectedProp.hasPortero === 'true' && <span className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-sm font-medium">Portero</span>}
                                {selectedProp.furnished && selectedProp.furnished !== 'No amueblado' && <span className="bg-purple-50 text-purple-700 px-3 py-1.5 rounded-full text-sm font-medium">{selectedProp.furnished}</span>}
                                {selectedProp.orientation && <span className="bg-amber-50 text-amber-700 px-3 py-1.5 rounded-full text-sm font-medium">Orientación {selectedProp.orientation}</span>}
                            </div>

                            {/* Financial info */}
                            <div className="bg-emerald-50 rounded-xl p-4 mb-6">
                                <div className="grid grid-cols-3 gap-4 text-center">
                                    <div><div className="text-xs text-emerald-600 uppercase">Alquiler</div><div className="text-lg font-bold text-emerald-800">€{selectedProp.rentalPrice || selectedProp.price}</div></div>
                                    {selectedProp.communityFees && <div><div className="text-xs text-emerald-600 uppercase">Comunidad</div><div className="text-lg font-bold text-emerald-800">€{selectedProp.communityFees}</div></div>}
                                    {selectedProp.depositMonths && <div><div className="text-xs text-emerald-600 uppercase">Fianza</div><div className="text-lg font-bold text-emerald-800">{selectedProp.depositMonths} mes(es)</div></div>}
                                </div>
                            </div>

                            {/* Dossier link */}
                            {selectedProp.dossierUrl && (
                                <a href={selectedProp.dossierUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 px-5 py-3 rounded-xl font-medium transition-colors mb-6">
                                    📄 Ver Dossier Completo (PDF)
                                </a>
                            )}

                            {/* Photo thumbnails — click to open lightbox */}
                            {selectedProp.photos?.length > 0 && (
                                <div className="grid grid-cols-4 gap-2 mb-6">
                                    {selectedProp.photos.map((ph, idx) => {
                                        const mediaUrl = ph.url || ph.driveUrl;
                                        const isVideo = mediaUrl?.toLowerCase().includes('.mp4') || mediaUrl?.toLowerCase().includes('.webm');
                                        return (
                                            <div key={idx} onClick={() => openLightbox(idx)}
                                                className="relative aspect-video bg-black rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity ring-2 ring-transparent hover:ring-emerald-400">
                                                {isVideo
                                                    ? <video src={mediaUrl} className="w-full h-full object-cover" muted />
                                                    : <img src={mediaUrl} alt="" className="w-full h-full object-cover" />}
                                                {isVideo && (
                                                    <div className="absolute inset-0 flex items-center justify-center">
                                                        <div className="w-6 h-6 bg-white/30 backdrop-blur rounded-full flex items-center justify-center">
                                                            <div className="w-0 h-0 border-t-[4px] border-t-transparent border-l-[7px] border-l-white border-b-[4px] border-b-transparent ml-0.5" />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Availability checker */}
                            <div className="bg-slate-50 rounded-xl p-4 mb-6 border border-slate-100">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Consultar disponibilidad</p>
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <div>
                                        <label className="block text-xs text-slate-500 mb-1">Desde</label>
                                        <input type="date" value={avail.start}
                                            onChange={e => setAvail(a => ({ ...a, start: e.target.value, result: null }))}
                                            className="w-full border-slate-200 rounded-lg text-sm focus:ring-emerald-500 focus:border-emerald-500" />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-500 mb-1">Hasta</label>
                                        <input type="date" value={avail.end} min={avail.start}
                                            onChange={e => setAvail(a => ({ ...a, end: e.target.value, result: null }))}
                                            className="w-full border-slate-200 rounded-lg text-sm focus:ring-emerald-500 focus:border-emerald-500" />
                                    </div>
                                </div>
                                <button disabled={!avail.start || !avail.end || avail.loading}
                                    onClick={async () => {
                                        setAvail(a => ({ ...a, loading: true, result: null }));
                                        try {
                                            const res = await api.get(`/public/availability?propertyId=${selectedProp.id}&start=${avail.start}&end=${avail.end}`);
                                            setAvail(a => ({ ...a, loading: false, result: res.data }));
                                        } catch { setAvail(a => ({ ...a, loading: false, result: { error: true } })); }
                                    }}
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-medium py-2 rounded-lg text-sm transition-all">
                                    {avail.loading ? 'Consultando...' : 'Consultar disponibilidad'}
                                </button>
                                {avail.result && !avail.result.error && (
                                    <div className={`mt-3 px-4 py-3 rounded-lg text-sm font-medium text-center ${
                                        avail.result.available ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
                                    }`}>
                                        {avail.result.available
                                            ? `✅ La propiedad está disponible del ${avail.start} al ${avail.end}`
                                            : `❌ La propiedad NO está disponible del ${avail.start} al ${avail.end}`}
                                    </div>
                                )}
                                {avail.result?.error && <p className="mt-2 text-xs text-red-500 text-center">Error al consultar. Inténtalo de nuevo.</p>}
                            </div>

                            <button onClick={() => setSelectedProp(null)} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 rounded-xl transition-all">
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Lightbox */}
            {lightbox.open && photos.length > 0 && (() => {
                const ph = photos[lightbox.idx];
                const mediaUrl = ph?.url || ph?.driveUrl;
                const isVideo = mediaUrl?.toLowerCase().includes('.mp4') || mediaUrl?.toLowerCase().includes('.webm');
                return (
                    <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center" onClick={closeLightbox}>
                        {/* Close */}
                        <button onClick={closeLightbox} className="absolute top-4 right-4 text-white/80 hover:text-white text-4xl leading-none z-10">✕</button>
                        {/* Counter */}
                        <span className="absolute top-4 left-1/2 -translate-x-1/2 text-white/60 text-sm">{lightbox.idx + 1} / {photos.length}</span>
                        {/* Prev */}
                        {photos.length > 1 && (
                            <button onClick={e => { e.stopPropagation(); prevPhoto(); }}
                                className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-5xl leading-none px-2 z-10">‹</button>
                        )}
                        {/* Media */}
                        <div className="max-w-5xl max-h-[85vh] w-full px-16" onClick={e => e.stopPropagation()}>
                            {isVideo
                                ? <video src={mediaUrl} className="max-h-[85vh] w-full object-contain" controls autoPlay />
                                : <img src={mediaUrl} alt="" className="max-h-[85vh] w-full object-contain" />}
                        </div>
                        {/* Next */}
                        {photos.length > 1 && (
                            <button onClick={e => { e.stopPropagation(); nextPhoto(); }}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-5xl leading-none px-2 z-10">›</button>
                        )}
                    </div>
                );
            })()}
        </div>
    );
};

export default ClientPortal;
