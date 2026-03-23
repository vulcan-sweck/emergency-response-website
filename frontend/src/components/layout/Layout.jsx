// src/components/layout/Layout.jsx
import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function Layout() {
  return (
    <div style={styles.root}>
      <Sidebar />
      <main style={styles.main}>
        <Outlet />
      </main>
    </div>
  );
}

const styles = {
  root: {
    display: 'flex',
    height: '100vh',      // full viewport — no overflow on root
    overflow: 'hidden',   // sidebar stays fixed, never scrolls away
  },
  main: {
    flex: 1,
    overflowY: 'auto',    // only the page content scrolls
    background: 'var(--bg-primary)',
  },
};
