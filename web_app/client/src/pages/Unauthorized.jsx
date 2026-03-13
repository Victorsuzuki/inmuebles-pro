import React from 'react';
import { Link } from 'react-router-dom';

const Unauthorized = () => {
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
            <h1 className="text-4xl font-bold text-red-600">403 - No Autorizado</h1>
            <p className="mt-4 text-gray-600">No tienes permisos para ver esta página.</p>
            <Link to="/" className="mt-6 text-blue-500 hover:underline">Volver al Inicio</Link>
        </div>
    );
};

export default Unauthorized;
