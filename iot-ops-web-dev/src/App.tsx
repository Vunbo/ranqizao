import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { DeviceList } from './pages/DeviceList';
import { DeviceDetail } from './pages/DeviceDetail';
import { AlertCenter } from './pages/AlertCenter';
import { CommandAudit } from './pages/CommandAudit';
import { UserManagement } from './pages/UserManagement';
import { SystemConfig } from './pages/SystemConfig';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const getToken = () => {
    try {
      return localStorage.getItem('token');
    } catch (e) {
      return null;
    }
  };
  const token = getToken();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return <Layout>{children}</Layout>;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        
        <Route path="/devices" element={
          <ProtectedRoute>
            <DeviceList />
          </ProtectedRoute>
        } />

        <Route path="/devices/:id" element={
          <ProtectedRoute>
            <DeviceDetail />
          </ProtectedRoute>
        } />

        <Route path="/alerts" element={
          <ProtectedRoute>
            <AlertCenter />
          </ProtectedRoute>
        } />

        <Route path="/commands" element={
          <ProtectedRoute>
            <CommandAudit />
          </ProtectedRoute>
        } />

        <Route path="/users" element={
          <ProtectedRoute>
            <UserManagement />
          </ProtectedRoute>
        } />

        <Route path="/configs" element={
          <ProtectedRoute>
            <SystemConfig />
          </ProtectedRoute>
        } />

        {/* Default Redirect */}
        <Route path="/" element={
          localStorage.getItem('token') 
            ? <Navigate to="/dashboard" replace /> 
            : <Navigate to="/login" replace />
        } />
      </Routes>
    </Router>
  );
}

export default App;
