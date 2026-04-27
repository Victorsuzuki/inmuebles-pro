import React, { useState, useEffect } from 'react';
import api from '../services/api';

const emptyForm = {
    address: '', city: '', zip: '', type: 'Apartamento', price: '', owner: '', description: '',
    cleaningService: 'Ninguno', bedrooms: '', bathrooms: '', sqMeters: '', floor: '',
    hasElevator: 'false', hasParking: 'false', hasPool: 'false', hasTerrace: 'false', hasPortero: 'false',
    hasAC: 'false', hasHeating: 'false', heatingType: '', furnished: 'No amueblado',
    orientation: '', yearBuilt: '', energyCert: '',
    // Precios por período — temporada baja
    pricePerDay: '', pricePerWeek: '', pricePerFortnight: '', rentalPrice: '',
    // Precios por período — temporada alta
    seasonPricePerDay: '', seasonPricePerWeek: '', seasonPricePerFortnight: '', seasonPrice: '',
    depositMonths: '2', communityFees: ''
};

const Properties = () => {
    const [properties, setProperties] = useState([]);
    const [owners, setOwners] = useState([]);
    const [formData, setFormData] = useState({ ...emptyForm });
    const [selectedId, setSelectedId] = useState(null);
    const [showArchived, setShowArchived] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [photos, setPhotos] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [formSection, setFormSection] = useState('basic'); // basic | features | financial

    useEffect(() => {
        fetchProperties();
        fetchOwners();
    }, [showArchived]);

    const fetchProperties = async () => {
        try {
            // Always fetch all properties to calculate stats correctly
            const res = await api.get('/properties/all');
            setProperties(res.data);
        } catch (err) { console.error(err); }
    };

    const fetchOwners = async () => {
        try {
            const res = await api.get('/users');
            const ownerUsers = res.data.filter(u => u.role === 'PROPIETARIO');
            setOwners(ownerUsers);
        } catch (err) { console.error('Error fetching owners:', err); }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? (checked ? 'true' : 'false') : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        try {
            if (selectedId) {
                await api.put(`/properties/${selectedId}`, formData);
                setSuccess('Propiedad actualizada');
            } else {
                const res = await api.post('/properties', formData);
                setSelectedId(res.data.id);
                setSuccess('Propiedad creada');
            }
            setTimeout(() => setSuccess(null), 3000);
            fetchProperties();
        } catch (err) {
            setError(err.response?.data?.message || 'Error guardando propiedad');
        }
    };

    const handleEdit = (prop) => {
        const cleanNum = (val) => {
            if (val === undefined || val === null || val === '') return '';
            let clean = String(val).replace(/[^0-9.,-]/g, '');
            return clean.replace(/[.,]/g, '');
        };

        const cleanBool = (val) => {
            if (!val) return 'false';
            const s = String(val).toLowerCase().trim();
            return (s === 'true' || s === 'verdadero' || s === 'yes' || s === 'si' || s === '1') ? 'true' : 'false';
        };

        setFormData({
            address: prop.address || '', 
            city: prop.city || '', 
            zip: prop.zip || '',
            type: prop.type || 'Apartamento', 
            price: cleanNum(prop.price), 
            owner: prop.owner || '',
            description: prop.description || '', 
            cleaningService: prop.cleaningService || 'Ninguno',
            bedrooms: cleanNum(prop.bedrooms), 
            bathrooms: cleanNum(prop.bathrooms), 
            sqMeters: cleanNum(prop.sqMeters),
            floor: prop.floor || '', 
            hasElevator: cleanBool(prop.hasElevator),
            hasParking: cleanBool(prop.hasParking), 
            hasPool: cleanBool(prop.hasPool),
            hasTerrace: cleanBool(prop.hasTerrace), 
            hasPortero: cleanBool(prop.hasPortero),
            hasAC: cleanBool(prop.hasAC),
            hasHeating: cleanBool(prop.hasHeating), 
            heatingType: prop.heatingType || '',
            furnished: prop.furnished || 'No amueblado', 
            orientation: prop.orientation || '',
            yearBuilt: cleanNum(prop.yearBuilt),
            energyCert: prop.energyCert || '',
            pricePerDay: cleanNum(prop.pricePerDay),
            pricePerWeek: cleanNum(prop.pricePerWeek),
            pricePerFortnight: cleanNum(prop.pricePerFortnight),
            rentalPrice: cleanNum(prop.rentalPrice),
            seasonPricePerDay: cleanNum(prop.seasonPricePerDay),
            seasonPricePerWeek: cleanNum(prop.seasonPricePerWeek),
            seasonPricePerFortnight: cleanNum(prop.seasonPricePerFortnight),
            seasonPrice: cleanNum(prop.seasonPrice),
            depositMonths: cleanNum(prop.depositMonths),
            communityFees: cleanNum(prop.communityFees)
        });
        setSelectedId(prop.id);
        setError(null);
        fetchPhotos(prop.id);
        document.getElementById('propForm').scrollIntoView({ behavior: 'smooth' });
    };

    const handleCancel = () => {
        setFormData({ ...emptyForm });
        setSelectedId(null);
        setError(null);
        setPhotos([]);
    };

    const handleArchive = async (id) => {
        try {
            await api.put(`/properties/${id}/archive`);
            setSuccess('Propiedad archivada');
            setTimeout(() => setSuccess(null), 3000);
            fetchProperties();
        } catch (err) { setError(err.response?.data?.message || 'Error'); }
    };

    const handleUnarchive = async (id) => {
        try {
            await api.put(`/properties/${id}/unarchive`);
            setSuccess('Propiedad desarchivada');
            setTimeout(() => setSuccess(null), 3000);
            fetchProperties();
        } catch (err) { setError(err.response?.data?.message || 'Error'); }
    };

    const handleDeleteCascade = async (id) => {
        if (!window.confirm('⚠️ ATENCIÓN: Esto eliminará la propiedad y TODOS sus datos asociados (eventos, pagos, limpieza, fotos, dossier). ¿Estás seguro?')) return;
        if (!window.confirm('Esta acción es IRREVERSIBLE. ¿Confirmar eliminación?')) return;
        setError(null);
        try {
            const res = await api.delete(`/properties/${id}/cascade`);
            setSuccess(res.data.message);
            setTimeout(() => setSuccess(null), 5000);
            if (selectedId === id) handleCancel();
            fetchProperties();
        } catch (err) { setError(err.response?.data?.message || 'Error eliminando'); }
    };

    // Photos
    const fetchPhotos = async (propId) => {
        try {
            const res = await api.get(`/properties/${propId}/photos`);
            setPhotos(res.data);
        } catch (err) { console.error(err); }
    };

    const handlePhotoUpload = async (e) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0 || !selectedId) return;
        setUploading(true);
        try {
            // Step 1: Get presigned PUT URLs from backend (one per file)
            const filesMeta = files.map(f => ({ name: f.name, type: f.type }));
            const { data: urlList } = await api.get(
                `/properties/${selectedId}/photos-s3-urls`,
                { params: { files: JSON.stringify(filesMeta) } }
            );

            // Step 2: Upload each file directly to S3
            await Promise.all(urlList.map((entry, i) =>
                fetch(entry.presignedUrl, {
                    method: 'PUT',
                    headers: { 'Content-Type': files[i].type },
                    body: files[i],
                })
            ));

            // Step 3: Tell backend to save the S3 URLs in Google Sheets
            const payload = urlList.map(entry => ({
                key: entry.key,
                publicUrl: entry.publicUrl,
                mimeType: entry.mimeType,
            }));
            await api.post(`/properties/${selectedId}/photos-confirm`, payload);

            fetchPhotos(selectedId);
            setSuccess('Fotos subidas correctamente');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            console.error('Photo upload error:', err);
            setError('Error subiendo fotos: ' + err.message);
        }
        finally { setUploading(false); }
    };

    const handleDeletePhoto = async (photoId) => {
        if (!selectedId) return;
        try {
            await api.delete(`/properties/${selectedId}/photos/${photoId}`);
            fetchPhotos(selectedId);
        } catch (err) { setError('Error eliminando foto'); }
    };

    const handleSetCoverPhoto = async (photoId) => {
        if (!selectedId) return;
        try {
            await api.put(`/properties/${selectedId}/photos/${photoId}/cover`);
            fetchPhotos(selectedId);
            setSuccess('Foto portada actualizada');
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) { setError('Error actualizando foto portada'); }
    };

    const handleDossierUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !selectedId) return;
        setUploading(true);
        try {
            // Step 1: Get a presigned S3 PUT URL from backend (S3 bucket has CORS via CloudFormation)
            const { data: { presignedUrl, publicUrl, fileId } } = await api.get(`/properties/${selectedId}/dossier-s3-url`);

            // Step 2: Upload directly to S3 — no API Gateway, no size limit, CORS pre-configured
            const uploadRes = await fetch(presignedUrl, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/pdf' },
                body: file,
            });
            if (!uploadRes.ok) {
                throw new Error(`S3 upload failed: ${uploadRes.status}`);
            }

            // Step 3: Save the S3 URL in Google Sheets via backend
            await api.post(`/properties/${selectedId}/dossier-confirm`, { publicUrl, fileId });

            setSuccess('Dossier subido correctamente');
            setTimeout(() => setSuccess(null), 3000);
            fetchProperties();
        } catch (err) {
            console.error('Dossier upload error:', err);
            setError('Error subiendo dossier: ' + err.message);
        }
        finally { setUploading(false); }
    };

    const handleDeleteDossier = async () => {
        if (!selectedId || !window.confirm('¿Estás seguro de que quieres eliminar este dossier?')) return;
        try {
            await api.delete(`/properties/${selectedId}/dossier`);
            setSuccess('Dossier eliminado');
            setTimeout(() => setSuccess(null), 3000);
            fetchProperties();
        } catch (err) {
            console.error('Error deleting dossier:', err);
            setError('Error eliminando dossier');
        }
    };

    const CheckField = ({ label, name }) => (
        <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" name={name} checked={formData[name] === 'true'}
                onChange={handleInputChange}
                className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
            <span className="text-sm text-slate-700">{label}</span>
        </label>
    );

    return (
        <div className="container mx-auto max-w-7xl">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Propiedades</h2>
                    <p className="text-slate-500 mt-1">Gestiona tu cartera de inmuebles</p>
                </div>
                <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                        <input type="checkbox" checked={showArchived} onChange={e => setShowArchived(e.target.checked)}
                            className="w-4 h-4 rounded border-slate-300 text-slate-600 focus:ring-slate-500" />
                        Ver archivadas
                    </label>
                    <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-500/30 flex items-center font-medium transition-all"
                        onClick={() => { handleCancel(); document.getElementById('propForm').scrollIntoView({ behavior: 'smooth' }); }}>
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        Nueva Propiedad
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                {[
                    { label: 'Total', value: properties.filter(p => String(p.archived || '').toLowerCase() !== 'true').length, color: 'blue' },
                    { label: 'Disponibles', value: properties.filter(p => p.status === 'Disponible' && String(p.archived || '').toLowerCase() !== 'true').length, color: 'emerald' },
                    { label: 'Alquilados', value: properties.filter(p => p.status === 'Alquilado' && String(p.archived || '').toLowerCase() !== 'true').length, color: 'amber' },
                    { label: 'Archivadas', value: properties.filter(p => String(p.archived || '').toLowerCase() === 'true').length, color: 'slate' },
                ].map((s, i) => (
                    <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <p className={`text-${s.color}-500 font-medium text-sm uppercase tracking-wider`}>{s.label}</p>
                        <p className="text-3xl font-bold text-slate-800 mt-1">{s.value}</p>
                    </div>
                ))}
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Property List */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b border-slate-100">
                        <h3 className="text-lg font-bold text-slate-800">Inventario</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Detalle</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Estado</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Precios</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase">Caract.</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {properties
                                    .filter(p => showArchived || String(p.archived || '').toLowerCase() !== 'true')
                                    .length === 0 ? (
                                    <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-400">
                                        <svg className="w-10 h-10 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                        No hay propiedades registradas {showArchived ? '' : '(activas)'}
                                    </td></tr>
                                ) : properties
                                    .filter(p => showArchived || String(p.archived || '').toLowerCase() !== 'true')
                                    .map(prop => {
                                        const isArchived = String(prop.archived || '').toLowerCase() === 'true';
                                        return (
                                            <tr key={prop.id} className={`hover:bg-slate-50/50 transition-colors ${isArchived ? 'opacity-60 bg-slate-50/30' : ''}`}>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center">
                                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center mr-4 ${isArchived ? 'bg-slate-200 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                                                                {prop.address}
                                                                {isArchived && <span className="px-1.5 py-0.5 bg-slate-200 text-slate-500 rounded text-[10px] font-medium">ARCHIVADA</span>}
                                                            </div>
                                                            <div className="text-xs text-slate-500">
                                                                {prop.type} • {prop.owner}
                                                                {prop.bedrooms && ` • ${prop.bedrooms}hab`}
                                                                {prop.sqMeters && ` • ${prop.sqMeters}m²`}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                                                    ${prop.status === 'Disponible' ? 'bg-emerald-100 text-emerald-800' :
                                                            prop.status === 'Alquilado' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${prop.status === 'Disponible' ? 'bg-emerald-500' : prop.status === 'Alquilado' ? 'bg-amber-500' : 'bg-red-500'}`}></span>
                                                        {prop.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm font-medium text-slate-900">€{prop.price}<span className="text-[10px] text-slate-400 font-normal">/mes</span></div>
                                                    {prop.seasonPrice && (
                                                        <div className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded w-fit mt-1">
                                                            €{prop.seasonPrice} Temporada
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="flex flex-wrap gap-1">
                                                        {prop.dossierUrl && (
                                                            <a href={prop.dossierUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors">
                                                                PDF
                                                            </a>
                                                        )}
                                                        {prop.cleaningService && prop.cleaningService !== 'Ninguno' && (
                                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-cyan-100 text-cyan-700">
                                                                🧹 {prop.cleaningService}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button onClick={() => handleEdit(prop)} className="text-slate-400 hover:text-blue-500 transition-colors p-2 hover:bg-blue-50 rounded-lg" title="Editar">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                        </button>
                                                        {isArchived ? (
                                                            <button onClick={() => handleUnarchive(prop.id)} className="text-emerald-500 hover:text-emerald-600 transition-colors p-2 hover:bg-emerald-50 rounded-lg scale-110" title="Desarchivar">
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                                                            </button>
                                                        ) : (
                                                            <button onClick={() => handleArchive(prop.id)} className="text-slate-400 hover:text-amber-500 transition-colors p-2 hover:bg-amber-50 rounded-lg" title="Archivar">
                                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                                                            </button>
                                                        )}
                                                        <button onClick={() => handleDeleteCascade(prop.id)} className="text-slate-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-lg" title="Eliminar todo">
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Form Panel */}
                <div id="propForm" className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-fit sticky top-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center justify-between">
                        <div className="flex items-center">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mr-3 text-sm">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            </div>
                            {selectedId ? 'Editar Propiedad' : 'Nueva Propiedad'}
                        </div>
                        {selectedId && <button onClick={handleCancel} className="text-xs text-slate-500 hover:text-slate-800">Cancelar</button>}
                    </h3>

                    {/* Form section tabs */}
                    <div className="flex border-b border-slate-100 mb-4 -mx-6 px-6">
                        {[
                            { key: 'basic', label: 'Básico' },
                            { key: 'features', label: 'Características' },
                            { key: 'financial', label: 'Financiero' },
                            { key: 'visual', label: 'Info Visual' },
                        ].map(t => (
                            <button key={t.key} onClick={() => setFormSection(t.key)}
                                className={`px-4 py-2 text-xs font-semibold transition-all border-b-2 -mb-px ${formSection === t.key ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
                                {t.label}
                            </button>
                        ))}
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* === BASIC === */}
                        {formSection === 'basic' && (<>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Dirección</label>
                                <input name="address" value={formData.address} onChange={handleInputChange} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500" placeholder="Ej: Calle Gran Vía 42" required />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Ciudad</label>
                                    <input name="city" value={formData.city} onChange={handleInputChange} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">C.P.</label>
                                    <input name="zip" value={formData.zip} onChange={handleInputChange} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Tipo</label>
                                    <select name="type" value={formData.type} onChange={handleInputChange} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500">
                                        <option>Apartamento</option><option>Casa</option><option>Ático</option><option>Estudio</option><option>Dúplex</option><option>Chalet</option><option>Local</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Precio €</label>
                                    <input name="price" type="number" value={formData.price} onChange={handleInputChange} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500" required />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Propietario</label>
                                <select
                                    name="owner"
                                    value={formData.owner}
                                    onChange={handleInputChange}
                                    className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                                    required
                                >
                                    <option value="">— Seleccionar Propietario —</option>
                                    {owners.map(o => (
                                        <option key={o.id} value={o.name}>{o.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Servicio Limpieza</label>
                                <select name="cleaningService" value={formData.cleaningService} onChange={handleInputChange} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500">
                                    <option>Ninguno</option><option>Diario</option><option>Semanal</option><option>Quincenal</option><option>Mensual</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Descripción</label>
                                <textarea name="description" value={formData.description} onChange={handleInputChange} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500" rows="3" placeholder="Detalles..."></textarea>
                            </div>
                        </>)}

                        {/* === FEATURES === */}
                        {formSection === 'features' && (<>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Habitaciones</label>
                                    <input name="bedrooms" type="number" min="0" value={formData.bedrooms} onChange={handleInputChange} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Baños</label>
                                    <input name="bathrooms" type="number" min="0" value={formData.bathrooms} onChange={handleInputChange} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">m²</label>
                                    <input name="sqMeters" type="number" min="0" value={formData.sqMeters} onChange={handleInputChange} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Planta</label>
                                    <input name="floor" value={formData.floor} onChange={handleInputChange} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500" placeholder="Ej: 3ª" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Orientación</label>
                                    <select name="orientation" value={formData.orientation} onChange={handleInputChange} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500">
                                        <option value="">—</option><option>Norte</option><option>Sur</option><option>Este</option><option>Oeste</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Año construcción</label>
                                    <input name="yearBuilt" type="number" value={formData.yearBuilt} onChange={handleInputChange} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Cert. Energético</label>
                                    <select name="energyCert" value={formData.energyCert} onChange={handleInputChange} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500">
                                        <option value="">—</option><option>A</option><option>B</option><option>C</option><option>D</option><option>E</option><option>F</option><option>G</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Amueblado</label>
                                <select name="furnished" value={formData.furnished} onChange={handleInputChange} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500">
                                    <option>No amueblado</option><option>Amueblado</option><option>Semi-amueblado</option>
                                </select>
                            </div>
                            <div className="bg-slate-50 rounded-xl p-4">
                                <p className="text-xs font-semibold text-slate-500 uppercase mb-3">Extras</p>
                                <div className="grid grid-cols-2 gap-3">
                                    <CheckField name="hasElevator" label="Ascensor" />
                                    <CheckField name="hasParking" label="Garaje" />
                                    <CheckField name="hasPool" label="Piscina" />
                                    <CheckField name="hasTerrace" label="Terraza" />
                                    <CheckField name="hasAC" label="Aire Acond." />
                                    <CheckField name="hasHeating" label="Calefacción" />
                                    <CheckField name="hasPortero" label="Portero" />
                                </div>
                                {formData.hasHeating === 'true' && (
                                    <div className="mt-3">
                                        <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Tipo calefacción</label>
                                        <input name="heatingType" value={formData.heatingType} onChange={handleInputChange} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500" placeholder="Ej: Gas natural" />
                                    </div>
                                )}
                            </div>
                        </>)}

                        {/* === FINANCIAL === */}
                        {formSection === 'financial' && (<>
                            {/* Tabla de precios por período */}
                            <div className="rounded-xl border border-slate-200 overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-slate-50">
                                            <th className="px-3 py-2 text-left text-xs font-semibold text-slate-500 uppercase w-28">Período</th>
                                            <th className="px-3 py-2 text-center text-xs font-semibold text-blue-600 uppercase">Temp. Baja €</th>
                                            <th className="px-3 py-2 text-center text-xs font-semibold text-amber-600 uppercase">Temp. Alta €</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {[
                                            { label: 'Por día', low: 'pricePerDay', high: 'seasonPricePerDay' },
                                            { label: 'Por semana', low: 'pricePerWeek', high: 'seasonPricePerWeek' },
                                            { label: 'Por quincena', low: 'pricePerFortnight', high: 'seasonPricePerFortnight' },
                                            { label: 'Por mes', low: 'rentalPrice', high: 'seasonPrice' },
                                        ].map(row => (
                                            <tr key={row.low} className="hover:bg-slate-50/50">
                                                <td className="px-3 py-2 text-xs font-medium text-slate-600">{row.label}</td>
                                                <td className="px-3 py-2">
                                                    <input name={row.low} type="number" min="0" value={formData[row.low]} onChange={handleInputChange}
                                                        className="w-full border-slate-200 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-sm text-center" placeholder="—" />
                                                </td>
                                                <td className="px-3 py-2">
                                                    <input name={row.high} type="number" min="0" value={formData[row.high]} onChange={handleInputChange}
                                                        className="w-full border-slate-200 rounded-lg focus:ring-amber-500 focus:border-amber-500 text-sm text-center" placeholder="—" />
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Meses fianza</label>
                                    <input name="depositMonths" type="number" min="0" value={formData.depositMonths} onChange={handleInputChange} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500" />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Gastos comunidad €</label>
                                    <input name="communityFees" type="number" min="0" value={formData.communityFees} onChange={handleInputChange} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500" />
                                </div>
                            </div>
                        </>)}

                        {/* === INFO VISUAL === */}
                        {formSection === 'visual' && (<>
                            {/* Dossier Upload */}
                            <div className="bg-slate-50 rounded-xl p-4">
                                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Dossier PDF</p>
                                {selectedId ? (
                                    <>
                                        {properties.find(p => String(p.id).trim().toLowerCase() === String(selectedId).trim().toLowerCase())?.dossierUrl && (
                                            <div className="flex items-center gap-3 mb-2">
                                                <a href={properties.find(p => String(p.id).trim().toLowerCase() === String(selectedId).trim().toLowerCase()).dossierUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:text-blue-700 underline font-medium">
                                                    📄 Ver dossier actual
                                                </a>
                                                <button onClick={handleDeleteDossier} className="text-xs text-red-500 hover:text-red-600 font-medium">
                                                    Eliminar
                                                </button>
                                            </div>
                                        )}
                                        <input type="file" accept=".pdf" onChange={handleDossierUpload} disabled={uploading} className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100" />
                                    </>
                                ) : (
                                    <p className="text-xs text-slate-400">Guarda la propiedad primero para subir el dossier</p>
                                )}
                            </div>

                            {/* Multimedia Gallery */}
                            <div className="bg-slate-50 rounded-xl p-4">
                                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Fotos y Vídeos</p>
                                {selectedId ? (
                                    <>
                                        {photos.length > 0 && (
                                            <div className="grid grid-cols-3 gap-2 mb-3">
                                                {photos.map(p => {
                                                    const url = p.driveUrl?.toLowerCase() || '';
                                                    const isVideo = url.includes('.mp4') || url.includes('.webm') || url.includes('.ogg') || url.includes('.mov') || url.includes('.quicktime') || url.includes('.mkv');
                                                    const isCover = String(p.isCover).toLowerCase() === 'true';
                                                    return (
                                                        <div key={p.id} className="relative group aspect-video bg-black rounded-lg overflow-hidden border border-slate-200 shadow-sm">
                                                            {isVideo ? (
                                                                <video src={p.driveUrl} className="w-full h-full object-contain bg-black" controls playsInline preload="metadata" />
                                                            ) : (
                                                                <img src={p.driveUrl} alt="" className="w-full h-full object-cover" onError={(e) => { e.target.src = 'https://placehold.co/400x300?text=Error+Cargando'; }} />
                                                            )}
                                                            {/* Cover badge (always visible if cover) */}
                                                            {isCover && (
                                                                <div className="absolute top-1 right-1 bg-amber-400 text-white text-[9px] px-1.5 py-0.5 rounded shadow-sm font-bold pointer-events-none">★ Portada</div>
                                                            )}
                                                            {isVideo && <div className="absolute top-1 left-1 bg-emerald-500/80 text-white text-[9px] px-1.5 py-0.5 rounded shadow-sm pointer-events-none font-bold">VÍDEO</div>}
                                                            {/* Hover actions */}
                                                            <div className="absolute inset-x-0 bottom-0 p-1.5 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 justify-center">
                                                                {!isVideo && (
                                                                    <button
                                                                        onClick={() => handleSetCoverPhoto(p.id)}
                                                                        title="Usar como portada en el portal"
                                                                        className={`text-[10px] px-2 py-1 rounded shadow-lg transition-colors font-bold ${isCover ? 'bg-amber-400 text-white' : 'bg-white/90 text-amber-500 hover:bg-amber-400 hover:text-white'}`}
                                                                    >★</button>
                                                                )}
                                                                <button onClick={() => handleDeletePhoto(p.id)} className="bg-red-500 hover:bg-red-600 text-white text-[10px] px-2 py-1 rounded shadow-lg transition-colors">Eliminar</button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                        <input type="file" accept="image/*,video/*" multiple onChange={handlePhotoUpload} disabled={uploading} className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100" />
                                        {uploading && <p className="text-xs text-cyan-600 mt-2 flex items-center gap-2"><span className="animate-spin">⌛</span> Subiendo archivos...</p>}
                                    </>
                                ) : (
                                    <p className="text-xs text-slate-400">Guarda la propiedad primero para subir archivos multimedia</p>
                                )}
                            </div>
                        </>)}

                        <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 rounded-xl transition-all shadow-lg hover:shadow-xl mt-2">
                            {selectedId ? 'Actualizar Propiedad' : 'Guardar Propiedad'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Properties;
