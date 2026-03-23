// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

// ── Role permission map ───────────────────────────────────────
// Hospital Admin now covers both hospital capacity AND ambulance/medical incidents.
// There is no separate ambulance_admin role — ambulances are attached to hospitals.
export const ROLE_PERMISSIONS = {
  system_admin: {
    pages:   ['dashboard', 'incidents', 'tracking', 'hospitals', 'analytics'],
    default: '/dashboard',
    label:   'System Admin',
  },
  hospital_admin: {
    // Hospital admins manage bed capacity, ambulance availability,
    // and can view/dispatch medical incidents
    pages:          ['dashboard', 'incidents', 'tracking', 'hospitals', 'analytics'],
    default:        '/hospitals',
    label:          'Hospital Admin',
    incidentFilter: 'medical',   // sees medical incidents only
  },
  police_admin: {
    pages:          ['dashboard', 'incidents', 'tracking', 'analytics'],
    default:        '/incidents',
    label:          'Police Admin',
    incidentFilter: 'crime',
  },
  fire_admin: {
    pages:          ['dashboard', 'incidents', 'tracking', 'analytics'],
    default:        '/incidents',
    label:          'Fire Admin',
    incidentFilter: 'fire',
  },
  // ambulance_admin is kept as an alias for hospital_admin
  // so existing database accounts still work
  ambulance_admin: {
    pages:          ['dashboard', 'incidents', 'tracking', 'hospitals', 'analytics'],
    default:        '/hospitals',
    label:          'Hospital Admin',
    incidentFilter: 'medical',
  },
};

export const canAccess = (role, page) => {
  const perms = ROLE_PERMISSIONS[role];
  if (!perms) return false;
  return perms.pages.includes(page);
};

export const defaultRoute = (role) => {
  return ROLE_PERMISSIONS[role]?.default || '/dashboard';
};

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token    = localStorage.getItem('access_token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      try { setUser(JSON.parse(userData)); }
      catch { localStorage.clear(); }
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    const res = await authAPI.login({ email, password });
    const { accessToken, refreshToken, user: userData } = res.data;
    localStorage.setItem('access_token',  accessToken);
    localStorage.setItem('refresh_token', refreshToken);
    localStorage.setItem('user',          JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
