// src/pages/DashboardPage.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, Zap, CheckCircle, AlertOctagon,
  RefreshCw, Plus, Map, Building2, BarChart3,
  ClipboardList, Flame, Stethoscope, Shield,
  Car, Cloud, HelpCircle, Clock, Truck
} from 'lucide-react';
import { incidentAPI, dispatchAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const TYPE_META = {
  fire:             { label:'Fire',             color:'var(--fire-color)',    Icon: Flame       },
  medical:          { label:'Medical',          color:'var(--medical-color)', Icon: Stethoscope },
  crime:            { label:'Crime',            color:'var(--police-color)',  Icon: Shield      },
  accident:         { label:'Accident',         color:'var(--accent-orange)', Icon: Car         },
  natural_disaster: { label:'Natural Disaster', color:'var(--accent-yellow)', Icon: Cloud       },
  other:            { label:'Other',            color:'var(--text-muted)',    Icon: HelpCircle  },
};

const STATUS_BADGE = {
  created:     'badge-created',
  dispatched:  'badge-dispatched',
  in_progress: 'badge-in_progress',
  resolved:    'badge-resolved',
};

export default function DashboardPage() {
  const [incidents, setIncidents] = useState([]);
  const [vehicles,  setVehicles]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const { user } = useAuth();
  const navigate  = useNavigate();

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [inc, veh] = await Promise.all([
        incidentAPI.getOpen(),
        dispatchAPI.getVehicles(),
      ]);
      setIncidents(inc.data.incidents || []);
      setVehicles(veh.data.vehicles   || []);
    } catch { toast.error('Failed to load dashboard data'); }
    finally  { setLoading(false); }
  };

  const openCount       = incidents.length;
  const activeCount     = incidents.filter(i => i.status === 'dispatched' || i.status === 'in_progress').length;
  const availableCount  = vehicles.filter(v => v.status === 'available').length;
  const criticalCount   = incidents.filter(i => i.incident_type === 'fire' || i.incident_type === 'medical').length;

  const stats = [
    { label:'OPEN INCIDENTS',   value: openCount,      color:'var(--accent-red)',    Icon: AlertTriangle, delay:'0ms'   },
    { label:'ACTIVE RESPONSES', value: activeCount,    color:'var(--accent-yellow)', Icon: Zap,           delay:'80ms'  },
    { label:'AVAILABLE UNITS',  value: availableCount, color:'var(--accent-green)',  Icon: CheckCircle,   delay:'160ms' },
    { label:'CRITICAL ALERTS',  value: criticalCount,  color:'var(--accent-blue)',   Icon: AlertOctagon,  delay:'240ms' },
  ];

  const allActions = [
    ...(user?.role === 'system_admin'
      ? [{ Icon: Plus,          label:'Log Incident',  desc:'Record a new emergency',      color:'var(--accent-red)',    to:'/incidents/new' }]
      : []),
    { Icon: ClipboardList,   label:'View Incidents', desc:'Manage active cases',          color:'var(--accent-yellow)', to:'/incidents'     },
    { Icon: Map,             label:'Live Tracking',  desc:'Monitor fleet in real time',   color:'var(--accent-blue)',   to:'/tracking'      },
    { Icon: Building2,       label:'Hospitals',      desc:'Check capacity & beds',        color:'var(--accent-green)',  to:'/hospitals'     },
    { Icon: BarChart3,       label:'Analytics',      desc:'Performance statistics',       color:'var(--accent-purple)', to:'/analytics'     },
  ];

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header} className="animate-fade-in">
        <div>
          <div style={styles.breadcrumb}>
            <span style={{color:'var(--text-muted)'}}>COMMAND CENTER</span>
            <span style={{color:'var(--text-muted)'}}> / </span>
            <span style={{color:'var(--accent-red)'}}>DASHBOARD</span>
          </div>
          <h1 style={styles.title}>Operations Overview</h1>
          <p style={styles.subtitle}>Welcome back, {user?.name}. Here is the current system status.</p>
        </div>
        <div style={styles.headerActions}>
          <button className="btn btn-secondary btn-sm" onClick={load}>
            <RefreshCw size={12} /> REFRESH
          </button>
          {user?.role === 'system_admin' && (
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/incidents/new')}>
              <Plus size={13} /> NEW INCIDENT
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <>
          {/* Stat cards */}
          <div style={styles.statsGrid}>
            {stats.map((s, i) => (
              <div key={i} className="card animate-count"
                style={{...styles.statCard, animationDelay:s.delay, borderTop:`2px solid ${s.color}`}}>
                <div style={styles.statTop}>
                  <s.Icon size={22} color={s.color} strokeWidth={1.8} />
                  <div style={{...styles.statGlow, background:s.color}} />
                </div>
                <div style={{...styles.statValue, color:s.color}}>{s.value}</div>
                <div style={styles.statLabel}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Quick action tiles */}
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>QUICK ACTIONS</h2>
            </div>
            <div style={{...styles.actionsGrid, gridTemplateColumns:`repeat(${allActions.length}, 1fr)`}}>
              {allActions.map((a, i) => (
                <div key={i} className="card"
                  style={{...styles.actionTile, animationDelay:`${i*60}ms`}}
                  onClick={() => navigate(a.to)}>
                  <div style={{...styles.actionIcon,
                    background:`${a.color}18`, border:`1px solid ${a.color}40`}}>
                    <a.Icon size={22} color={a.color} strokeWidth={1.6} />
                  </div>
                  <div style={styles.actionLabel}>{a.label}</div>
                  <div style={styles.actionDesc}>{a.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent incidents — display only, not clickable */}
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>RECENT INCIDENTS</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/incidents')}>
                VIEW ALL →
              </button>
            </div>
            <div className="card">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th><th>TYPE</th><th>CITIZEN</th>
                    <th>REGION</th><th>UNIT</th><th>STATUS</th><th>TIME</th>
                  </tr>
                </thead>
                <tbody>
                  {incidents.slice(0, 8).map(inc => {
                    const meta = TYPE_META[inc.incident_type] || TYPE_META.other;
                    const { Icon: TypeIcon } = meta;
                    return (
                      <tr key={inc.incident_id} style={{cursor:'default'}}>
                        <td><span style={styles.idChip}>#{inc.incident_id}</span></td>
                        <td>
                          <span style={{color:meta.color, fontWeight:600, display:'flex', alignItems:'center', gap:5}}>
                            <TypeIcon size={13} strokeWidth={2} />
                            {meta.label.toUpperCase()}
                          </span>
                        </td>
                        <td>{inc.citizen_name}</td>
                        <td style={{color:'var(--text-secondary)'}}>{inc.region || '—'}</td>
                        <td>
                          {inc.assigned_unit
                            ? <span style={styles.unitChip}>{inc.assigned_unit}</span>
                            : <span style={{color:'var(--text-muted)'}}>Unassigned</span>}
                        </td>
                        <td>
                          <span className={`badge ${STATUS_BADGE[inc.status] || ''}`}>
                            {inc.status?.replace('_',' ')}
                          </span>
                        </td>
                        <td style={{color:'var(--text-muted)', fontFamily:'var(--font-mono)', fontSize:11,
                          display:'flex', alignItems:'center', gap:4}}>
                          <Clock size={11} />
                          {new Date(inc.created_at).toLocaleTimeString()}
                        </td>
                      </tr>
                    );
                  })}
                  {incidents.length === 0 && (
                    <tr><td colSpan={7} style={{textAlign:'center', color:'var(--text-muted)', padding:40}}>
                      No open incidents
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  page:         { padding:'28px', maxWidth:1400 },
  header:       { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:28 },
  breadcrumb:   { fontFamily:'var(--font-mono)', fontSize:10, letterSpacing:1.5, marginBottom:6 },
  title:        { fontFamily:'var(--font-display)', fontSize:32, fontWeight:700, letterSpacing:1 },
  subtitle:     { color:'var(--text-secondary)', fontSize:13, marginTop:4 },
  headerActions:{ display:'flex', gap:8 },
  statsGrid:    { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:28 },
  statCard:     { padding:22, position:'relative', overflow:'hidden', cursor:'default' },
  statTop:      { display:'flex', justifyContent:'space-between', marginBottom:12 },
  statGlow:     { width:60, height:60, borderRadius:'50%', opacity:0.08, filter:'blur(12px)' },
  statValue:    { fontFamily:'var(--font-display)', fontSize:48, fontWeight:700, lineHeight:1 },
  statLabel:    { fontFamily:'var(--font-display)', fontSize:11, letterSpacing:1.5, color:'var(--text-muted)', marginTop:4 },
  section:      { marginBottom:28 },
  sectionHeader:{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 },
  sectionTitle: { fontFamily:'var(--font-display)', fontSize:14, letterSpacing:2, color:'var(--text-secondary)' },
  actionsGrid:  { display:'grid', gap:12 },
  actionTile:   { padding:18, cursor:'pointer', transition:'transform 0.2s', display:'flex', flexDirection:'column', gap:8 },
  actionIcon:   { width:46, height:46, borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center' },
  actionLabel:  { fontFamily:'var(--font-display)', fontSize:14, fontWeight:600 },
  actionDesc:   { fontSize:11, color:'var(--text-muted)', flex:1 },
  idChip:       { fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text-muted)' },
  unitChip:     { fontFamily:'var(--font-mono)', fontSize:11, background:'rgba(76,201,240,0.1)', color:'var(--accent-blue)', padding:'2px 8px', borderRadius:4 },
};
