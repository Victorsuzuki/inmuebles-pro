import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import PublicLayout from './components/PublicLayout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Properties from './pages/Properties';
import Events from './pages/Events';
import Users from './pages/Users';
import Clients from './pages/Clients';
import Payments from './pages/Payments';
import Cleaning from './pages/Cleaning';
import Inventory from './pages/Inventory';
import CleanerPortal from './pages/CleanerPortal';
import ClientPortal from './pages/ClientPortal';
import OwnerView from './pages/OwnerView';
import Unauthorized from './pages/Unauthorized';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* ===== PUBLIC PORTALS ===== */}
          <Route path="/" element={<PublicLayout />}>
            <Route index element={<ClientPortal />} />
            <Route path="portal/propiedades" element={<ClientPortal />} />
          </Route>

          {/* ===== PROTECTED PORTALS ===== */}
          <Route element={<ProtectedRoute roles={['LIMPIADOR']}><PublicLayout /></ProtectedRoute>}>
            <Route path="/portal/limpieza" element={<CleanerPortal />} />
          </Route>
          <Route element={<ProtectedRoute roles={['PROPIETARIO']}><PublicLayout /></ProtectedRoute>}>
            <Route path="/portal/propietarios" element={<OwnerView />} />
          </Route>

          {/* ===== ADMIN (login required) ===== */}
          <Route element={<ProtectedRoute roles={['SUPERVISOR', 'OPERATOR']}><Layout /></ProtectedRoute>}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/properties" element={<Properties />} />
            <Route path="/events" element={<Events />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/payments" element={<Payments />} />
            <Route path="/cleaning" element={<Cleaning />} />
            <Route path="/inventory" element={<Inventory />} />

            <Route element={<ProtectedRoute roles={['SUPERVISOR']}><Outlet /></ProtectedRoute>}>
              <Route path="/users" element={<Users />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
