// src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth, canAccess, defaultRoute } from './context/AuthContext';
import Layout from './components/layout/Layout';
import LoginPage     from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import IncidentsPage from './pages/IncidentsPage';
import TrackingPage  from './pages/TrackingPage';
import HospitalsPage from './pages/HospitalsPage';
import AnalyticsPage from './pages/AnalyticsPage';

// Redirects to login if not authenticated
function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="loading-center" style={{ minHeight:'100vh' }}>
      <div className="spinner" />
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
}

// Redirects to role default page if the user lacks permission for this page
function RequirePage({ page, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!canAccess(user.role, page)) {
    return <Navigate to={defaultRoute(user.role)} replace />;
  }
  return children;
}

// Shows a friendly access denied card inline (used for any direct URL attempts)
function AccessDenied() {
  const { user } = useAuth();
  return (
    <div style={{ padding:60, textAlign:'center' }}>
      <div style={{ fontSize:64, marginBottom:16 }}>🔒</div>
      <h2 style={{ fontFamily:'var(--font-display)', fontSize:28, color:'var(--accent-red)', marginBottom:8 }}>
        ACCESS DENIED
      </h2>
      <p style={{ color:'var(--text-secondary)', marginBottom:24 }}>
        Your role ({user?.role?.replace(/_/g,' ')}) does not have permission to access this page.
      </p>
      <Navigate to={defaultRoute(user?.role)} replace />
    </div>
  );
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={
        user ? <Navigate to={defaultRoute(user.role)} replace /> : <LoginPage />
      }/>

      {/* Protected layout */}
      <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={
          user ? <Navigate to={defaultRoute(user.role)} replace /> : <Navigate to="/login" replace />
        }/>

        {/* Each route is guarded by the page name matching ROLE_PERMISSIONS */}
        <Route path="dashboard" element={
          <RequirePage page="dashboard"><DashboardPage /></RequirePage>
        }/>
        <Route path="incidents" element={
          <RequirePage page="incidents"><IncidentsPage /></RequirePage>
        }/>
        <Route path="incidents/new" element={
          <RequirePage page="incidents"><IncidentsPage openCreate={true} /></RequirePage>
        }/>
        <Route path="tracking" element={
          <RequirePage page="tracking"><TrackingPage /></RequirePage>
        }/>
        <Route path="hospitals" element={
          <RequirePage page="hospitals"><HospitalsPage /></RequirePage>
        }/>
        <Route path="analytics" element={
          <RequirePage page="analytics"><AnalyticsPage /></RequirePage>
        }/>
      </Route>

      {/* Catch all */}
      <Route path="*" element={
        user ? <Navigate to={defaultRoute(user.role)} replace /> : <Navigate to="/login" replace />
      }/>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'var(--bg-card)',
              color:      'var(--text-primary)',
              border:     '1px solid var(--border-bright)',
              fontFamily: 'var(--font-body)',
              fontSize:   13,
            },
            success: { iconTheme: { primary:'#06d6a0', secondary:'#000' } },
            error:   { iconTheme: { primary:'#e63946', secondary:'#fff' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}
