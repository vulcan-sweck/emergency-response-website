// src/components/layout/Sidebar.jsx
// Navigation sidebar — fixed height, never scrolls off screen.
// Uses Lucide React icons throughout for a clean professional look.

import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, AlertTriangle, Radio,
  Building2, BarChart3, Layers, LogOut
} from 'lucide-react';
import { useAuth, canAccess, ROLE_PERMISSIONS } from '../../context/AuthContext';
import toast from 'react-hot-toast';

// Nav items using Lucide icon components
const ALL_NAV = [
  { to: '/dashboard', page: 'dashboard', Icon: LayoutDashboard, label: 'DASHBOARD'  },
  { to: '/incidents',  page: 'incidents', Icon: AlertTriangle,   label: 'INCIDENTS'  },
  { to: '/tracking',   page: 'tracking',  Icon: Radio,           label: 'LIVE TRACK' },
  { to: '/hospitals',  page: 'hospitals', Icon: Building2,       label: 'HOSPITALS'  },
  { to: '/analytics',  page: 'analytics', Icon: BarChart3,       label: 'ANALYTICS'  },
];

const ROLE_COLORS = {
  system_admin:    '#e63946',
  hospital_admin:  '#06d6a0',
  police_admin:    '#7b5ea7',
  fire_admin:      '#f4845f',
  ambulance_admin: '#4cc9f0',
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate         = useNavigate();
  const role      = user?.role || 'system_admin';
  const roleColor = ROLE_COLORS[role] || '#e63946';
  const roleLabel = ROLE_PERMISSIONS[role]?.label || role;

  const visibleNav = ALL_NAV.filter(item => canAccess(role, item.page));

  const handleLogout = () => {
    logout();
    toast.success('Logged out');
    navigate('/login');
  };

  return (
    <aside style={styles.sidebar}>

      {/* Logo */}
      <div style={styles.logo}>
        <div style={{
          ...styles.logoIcon,
          boxShadow: `0 0 16px ${roleColor}50`,
          borderColor: `${roleColor}60`,
        }}>
          <Layers size={20} color={roleColor} />
        </div>
        <div>
          <div style={styles.logoTitle}>ERP</div>
          <div style={styles.logoSub}>COMMAND</div>
        </div>
      </div>

      {/* Role badge */}
      <div style={{
        ...styles.roleBadge,
        background: `${roleColor}15`,
        borderColor: `${roleColor}30`,
        color: roleColor,
      }}>
        <div style={{ ...styles.roleDot, background: roleColor }} />
        {roleLabel.toUpperCase()}
      </div>

      {/* Nav links filtered by role */}
      <nav style={styles.nav}>
        {visibleNav.map(({ to, Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => ({
              ...styles.navItem,
              ...(isActive ? {
                color:        'var(--text-primary)',
                background:   `${roleColor}15`,
                borderLeftColor: roleColor,
              } : {}),
            })}
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={16}
                  style={{ flexShrink: 0 }}
                  color={isActive ? roleColor : 'var(--text-muted)'}
                  strokeWidth={isActive ? 2.5 : 1.8}
                />
                <span style={{
                  ...styles.navLabel,
                  color: isActive ? 'var(--text-primary)' : 'var(--text-muted)',
                }}>
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User info + logout */}
      <div style={styles.userSection}>
        <div style={styles.userCard}>
          <div style={{ ...styles.avatar, background: roleColor }}>
            {user?.name?.[0]?.toUpperCase() || 'A'}
          </div>
          <div style={styles.userInfo}>
            <div style={styles.userName}>{user?.name || 'Admin'}</div>
            <div style={{ ...styles.userRole, color: roleColor }}>{roleLabel}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          style={{
            ...styles.logoutBtn,
            borderColor: `${roleColor}30`,
            color:       roleColor,
            background:  `${roleColor}08`,
          }}
        >
          <LogOut size={13} />
          LOGOUT
        </button>
      </div>

    </aside>
  );
}

const styles = {
  sidebar: {
    width: 220, height: '100vh', flexShrink: 0, overflowY: 'auto',
    background: 'var(--bg-sidebar)',
    borderRight: '1px solid var(--border)',
    display: 'flex', flexDirection: 'column',
    padding: '0 0 20px',
    position: 'sticky', top: 0, alignSelf: 'flex-start',
  },
  logo: {
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '24px 20px',
    borderBottom: '1px solid var(--border)',
    marginBottom: 12,
    flexShrink: 0,
  },
  logoIcon: {
    width: 42, height: 42, borderRadius: 10,
    background: 'rgba(230,57,70,0.12)',
    border: '1px solid rgba(230,57,70,0.3)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.3s',
  },
  logoTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: 20, fontWeight: 700, letterSpacing: 3, lineHeight: 1,
  },
  logoSub: { fontSize: 8, letterSpacing: 3, color: 'var(--text-muted)', marginTop: 2 },
  roleBadge: {
    margin: '0 12px 12px',
    padding: '6px 12px',
    borderRadius: 20,
    border: '1px solid',
    fontFamily: 'var(--font-display)',
    fontSize: 10, fontWeight: 700, letterSpacing: 1.5,
    display: 'flex', alignItems: 'center', gap: 6,
    flexShrink: 0,
  },
  roleDot: { width: 6, height: 6, borderRadius: '50%' },
  nav: {
    flex: 1,
    display: 'flex', flexDirection: 'column',
    padding: '0 12px', gap: 2,
  },
  navItem: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px 12px',
    borderRadius: 'var(--radius-sm)',
    borderLeft: '3px solid transparent',
    textDecoration: 'none',
    fontFamily: 'var(--font-display)',
    fontSize: 12, fontWeight: 600, letterSpacing: 1,
    transition: 'all 0.18s',
  },
  navLabel: { flex: 1, transition: 'color 0.18s' },
  userSection: {
    padding: '16px 12px 0',
    borderTop: '1px solid var(--border)',
    marginTop: 'auto',
    display: 'flex', flexDirection: 'column', gap: 10,
    flexShrink: 0,
  },
  userCard: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '10px',
    background: 'rgba(74,96,122,0.1)',
    borderRadius: 'var(--radius-sm)',
  },
  avatar: {
    width: 34, height: 34, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: '#fff',
    flexShrink: 0,
  },
  userInfo:  { overflow: 'hidden' },
  userName:  {
    fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600,
    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
  },
  userRole:  { fontSize: 9, letterSpacing: 1, marginTop: 1, fontFamily: 'var(--font-display)', fontWeight: 600 },
  logoutBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    border: '1px solid',
    borderRadius: 'var(--radius-sm)',
    padding: '8px',
    fontFamily: 'var(--font-display)',
    fontSize: 11, fontWeight: 600, letterSpacing: 1,
    cursor: 'pointer', transition: 'all 0.2s', width: '100%',
  },
};
