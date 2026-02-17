import React, { useState, useEffect } from 'react';
import api from '../services/api';

const Properties = () => {
    const [properties, setProperties] = useState([]);
    const [formData, setFormData] = useState({
        address: '',
        city: '',
        zip: '',
        type: 'Apartamento',
        price: '',
        owner: '',
        description: ''
    });

    const [selectedId, setSelectedId] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchProperties();
    }, []);

    const fetchProperties = async () => {
        try {
            const response = await api.get('/properties');
            setProperties(response.data);
        } catch (error) {
            console.error('Error fetching properties', error);
        }
    };

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        try {
            if (selectedId) {
                await api.put(`/properties/${selectedId}`, formData);
            } else {
                await api.post('/properties', formData);
            }
            setFormData({ address: '', city: '', zip: '', type: 'Apartamento', price: '', owner: '', description: '' });
            setSelectedId(null);
            fetchProperties();
        } catch (error) {
            console.error('Error saving property', error);
            if (error.response && error.response.data && error.response.data.message) {
                setError(error.response.data.message);
            }
        }
    };

    const handleEdit = (property) => {
        setFormData({
            address: property.address,
            city: property.city || '',
            zip: property.zip || '',
            type: property.type,
            price: property.price,
            owner: property.owner,
            description: property.description
        });
        setSelectedId(property.id);
        setError(null);
        document.getElementById('propForm').scrollIntoView({ behavior: 'smooth' });
    };

    const handleCancel = () => {
        setFormData({ address: '', city: '', zip: '', type: 'Apartamento', price: '', owner: '', description: '' });
        setSelectedId(null);
        setError(null);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Estás seguro de borrar esta propiedad?')) return;
        setError(null);
        try {
            await api.delete(`/properties/${id}`);
            fetchProperties();
        } catch (error) {
            console.error('Error deleting property', error);
            if (error.response && error.response.status === 409) {
                setError(error.response.data.message);
            } else if (error.response && error.response.data && error.response.data.message) {
                setError(error.response.data.message);
            }
        }
    };

    return (
        <div className="container mx-auto max-w-7xl">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Propiedades</h2>
                    <p className="text-slate-500 mt-1">Gestiona tu cartera de inmuebles</p>
                </div>
                <button className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl shadow-lg shadow-emerald-500/30 flex items-center font-medium transition-all" onClick={() => { handleCancel(); document.getElementById('propForm').scrollIntoView({ behavior: 'smooth' }); }}>
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    Nueva Propiedad
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                {[
                    { label: 'Total Inmuebles', value: properties.length, color: 'blue' },
                    { label: 'Disponibles', value: properties.filter(p => p.status === 'Disponible').length, color: 'emerald' },
                    { label: 'Alquilados', value: properties.filter(p => p.status === 'Alquilado').length, color: 'amber' },
                    { label: 'Mantenimiento', value: properties.filter(p => p.status === 'En Mantenimiento' || p.status === 'Mantenimiento').length, color: 'red' },
                ].map((stat, idx) => (
                    <div key={idx} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                        <p className={`text-${stat.color}-500 font-medium text-sm uppercase tracking-wider`}>{stat.label}</p>
                        <p className="text-3xl font-bold text-slate-800 mt-1">{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Error banner */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm mb-6 flex items-center">
                    <svg className="w-5 h-5 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Listado Principal */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="text-lg font-bold text-slate-800">Inventario</h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Detalle</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Precio</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {properties.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-12 text-center text-slate-400">
                                            <svg className="w-10 h-10 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                                            No hay propiedades registradas todavía
                                        </td>
                                    </tr>
                                ) : properties.map(prop => (
                                    <tr key={prop.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 mr-4">
                                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                                                </div>
                                                <div>
                                                    <div className="text-sm font-semibold text-slate-900">{prop.address}</div>
                                                    <div className="text-xs text-slate-500">{prop.type} • {prop.owner}</div>
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
                                        <td className="px-6 py-4 text-sm text-slate-600 font-medium">
                                            ${prop.price}<span className="text-xs text-slate-400 font-normal">/mes</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button onClick={() => handleEdit(prop)} className="text-slate-400 hover:text-blue-500 transition-colors p-2 hover:bg-blue-50 rounded-lg mr-1">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                            </button>
                                            <button onClick={() => handleDelete(prop.id)} className="text-slate-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-lg">
                                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Formulario Lateral — sin campo Estado */}
                <div id="propForm" className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-fit sticky top-6">
                    <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center justify-between">
                        <div className="flex items-center">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mr-3 text-sm">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                            </div>
                            {selectedId ? 'Editar Propiedad' : 'Nueva Propiedad'}
                        </div>
                        {selectedId && (
                            <button onClick={handleCancel} className="text-xs text-slate-500 hover:text-slate-800">Cancelar</button>
                        )}
                    </h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Dirección</label>
                            <input name="address" value={formData.address} onChange={handleInputChange} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500" placeholder="Ej: Av. Libertador 1234" required />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Ciudad</label>
                                <input name="city" value={formData.city} onChange={handleInputChange} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500" placeholder="Ej: Buenos Aires" />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Código Postal</label>
                                <input name="zip" value={formData.zip} onChange={handleInputChange} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500" placeholder="1425" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Tipo</label>
                                <select name="type" value={formData.type} onChange={handleInputChange} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500">
                                    <option value="Apartamento">Apartamento</option>
                                    <option value="Casa">Casa</option>
                                    <option value="Local">Local</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Precio</label>
                                <input name="price" type="number" value={formData.price} onChange={handleInputChange} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500" placeholder="0.00" required />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Propietario</label>
                            <input name="owner" value={formData.owner} onChange={handleInputChange} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500" placeholder="Nombre completo" required />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase mb-1">Descripción</label>
                            <textarea name="description" value={formData.description} onChange={handleInputChange} className="w-full border-slate-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500" rows="3" placeholder="Detalles adicionales..."></textarea>
                        </div>

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
