// src/pages/IncidentsPage.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  Flame, Stethoscope, Shield, Car, Cloud, HelpCircle,
  RefreshCw, Plus, Send, X, MapPin, ChevronRight,
  Truck, Navigation, UserCheck, Calendar, AlertTriangle
} from 'lucide-react';
import { incidentAPI, dispatchAPI } from '../services/api';
import { useAuth, ROLE_PERMISSIONS } from '../context/AuthContext';
import toast from 'react-hot-toast';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:      'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const TYPES = ['fire','medical','crime','accident','natural_disaster','other'];
const TYPE_META = {
  fire:             { Icon: Flame,       color:'var(--fire-color)'    },
  medical:          { Icon: Stethoscope, color:'var(--medical-color)' },
  crime:            { Icon: Shield,      color:'var(--police-color)'  },
  accident:         { Icon: Car,         color:'var(--accent-orange)' },
  natural_disaster: { Icon: Cloud,       color:'var(--accent-yellow)' },
  other:            { Icon: HelpCircle,  color:'var(--text-muted)'    },
};
const STATUS_CLASS = { created:'badge-created', dispatched:'badge-dispatched', in_progress:'badge-in_progress', resolved:'badge-resolved' };
const STATUSES     = ['created','dispatched','in_progress','resolved'];

function LocationPicker({ onPick }) {
  useMapEvents({ click(e) { onPick(e.latlng); } });
  return null;
}

export default function IncidentsPage() {
  const { user } = useAuth();
  const roleFilter  = ROLE_PERMISSIONS[user?.role]?.incidentFilter || null;
  const myAdminId   = user?.userId;  // used to highlight incidents this admin logged

  const [incidents,    setIncidents]    = useState([]);
  const [vehicles,     setVehicles]     = useState([]);
  const [filter,       setFilter]       = useState('all');
  const [loading,      setLoading]      = useState(true);
  const [selected,     setSelected]     = useState(null);
  const [showCreate,   setShowCreate]   = useState(false);
  const [showDispatch, setShowDispatch] = useState(false);
  const [form,         setForm]         = useState({ citizenName:'', incidentType: roleFilter||'fire', region:'', notes:'' });
  const [pickedLoc,    setPickedLoc]    = useState(null);
  const [submitting,   setSubmitting]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [inc, veh] = await Promise.all([incidentAPI.getOpen(), dispatchAPI.getVehicles()]);
      const all = inc.data.incidents || [];
      setIncidents(roleFilter ? all.filter(i => i.incident_type === roleFilter) : all);
      setVehicles(veh.data.vehicles || []);
    } catch { toast.error('Failed to load'); }
    finally  { setLoading(false); }
  }, [roleFilter]);

  useEffect(() => { load(); }, [load]);

  const filtered = filter === 'all' ? incidents : incidents.filter(i => i.status === filter);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!pickedLoc) return toast.error('Please tap the map to set location');
    setSubmitting(true);
    try {
      await incidentAPI.create({ ...form, latitude: pickedLoc.lat, longitude: pickedLoc.lng });
      toast.success('Incident created');
      setShowCreate(false);
      setForm({ citizenName:'', incidentType: roleFilter||'fire', region:'', notes:'' });
      setPickedLoc(null);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to create'); }
    finally { setSubmitting(false); }
  };

  const handleStatus = async (id, status) => {
    try {
      await incidentAPI.updateStatus(id, status);
      toast.success(`Status → ${status.replace('_',' ')}`);
      load();
      if (selected?.incident_id === id) setSelected(p => ({ ...p, status }));
    } catch { toast.error('Update failed'); }
  };

  const handleAssign = async (incident, vehicleId) => {
    try {
      await incidentAPI.assignUnit(incident.incident_id, vehicleId);
      toast.success(`Unit ${vehicleId} dispatched`);
      setShowDispatch(false);
      load();
    } catch { toast.error('Assignment failed'); }
  };

  const availableVehicles = vehicles.filter(v => v.status === 'available');

  const svcColor = t => ({ fire:'var(--fire-color)', ambulance:'var(--medical-color)', police:'var(--police-color)', rescue:'var(--accent-green)' }[t] || 'var(--text-muted)');

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header} className="animate-fade-in">
        <div>
          <div style={styles.breadcrumb}>COMMAND CENTER / <span style={{color:'var(--accent-red)'}}>INCIDENTS</span></div>
          <h1 style={styles.title}>Incident Management</h1>
          {roleFilter && (
            <div style={styles.roleNotice}>
              <Shield size={12} /> Showing <strong>{roleFilter.replace('_',' ').toUpperCase()}</strong> incidents only
            </div>
          )}
        </div>
        <div style={{display:'flex', gap:8}}>
          <button className="btn btn-secondary btn-sm" onClick={load}><RefreshCw size={12}/> REFRESH</button>
          {user?.role === 'system_admin' && (
            <button className="btn btn-primary" onClick={() => setShowCreate(true)}><Plus size={14}/> LOG INCIDENT</button>
          )}
        </div>
      </div>

      {/* Filter chips */}
      <div style={styles.filters} className="animate-fade-in">
        {['all',...STATUSES].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            style={{...styles.filterChip, ...(filter===s ? styles.filterActive : {})}}>
            {s.replace('_',' ').toUpperCase()}
            <span style={styles.filterCount}>
              {s==='all' ? incidents.length : incidents.filter(i=>i.status===s).length}
            </span>
          </button>
        ))}
      </div>

      <div style={styles.content}>
        {/* Table */}
        <div style={styles.tableWrap} className="card">
          {loading ? <div className="loading-center"><div className="spinner"/></div> : (
            <table className="data-table">
              <thead>
                <tr><th>ID</th><th>TYPE</th><th>CITIZEN</th><th>REGION</th><th>LOGGED BY</th><th>UNIT</th><th>STATUS</th><th>ACTION</th></tr>
              </thead>
              <tbody>
                {filtered.map(inc => {
                  const meta = TYPE_META[inc.incident_type] || TYPE_META.other;
                  const { Icon: TypeIcon } = meta;
                  return (
                    <tr key={inc.incident_id} onClick={() => setSelected(inc)}>
                      <td><span style={{fontFamily:'var(--font-mono)', color:'var(--text-muted)', fontSize:11}}>#{inc.incident_id}</span></td>
                      <td>
                        <span style={{color:meta.color, fontWeight:600, display:'flex', alignItems:'center', gap:5}}>
                          <TypeIcon size={13} strokeWidth={2}/>
                          {inc.incident_type.replace('_',' ').toUpperCase()}
                        </span>
                      </td>
                      <td style={{fontWeight:500}}>{inc.citizen_name}</td>
                      <td style={{color:'var(--text-secondary)'}}>{inc.region||'—'}</td>
                      <td>
                        <span style={{
                          fontFamily:'var(--font-mono)', fontSize:11,
                          color: myAdminId == inc.created_by_admin
                            ? 'var(--accent-green)'
                            : 'var(--text-muted)',
                          display:'flex', alignItems:'center', gap:4,
                        }}>
                          <UserCheck size={11}/>
                          {myAdminId == inc.created_by_admin
                            ? (user?.name?.split(' ')[0] || `#${inc.created_by_admin}`)
                            : `Admin #${inc.created_by_admin}`}
                        </span>
                      </td>
                      <td>
                        {inc.assigned_unit
                          ? <span style={styles.unitBadge}>{inc.assigned_unit}</span>
                          : <span style={{color:'var(--text-muted)',fontSize:12}}>—</span>}
                      </td>
                      <td><span className={`badge ${STATUS_CLASS[inc.status]||''}`}>{inc.status?.replace('_',' ')}</span></td>
                      <td onClick={e => e.stopPropagation()}>
                        <button className="btn btn-secondary btn-sm"
                          onClick={() => { setSelected(inc); setShowDispatch(true); }}>
                          <Navigation size={11}/> DISPATCH
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} style={{textAlign:'center', color:'var(--text-muted)', padding:40}}>No incidents found</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div style={styles.detail} className="card animate-slide-in">
            <div style={styles.detailHeader}>
              <h3 style={styles.detailTitle}>INCIDENT #{selected.incident_id}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}><X size={14}/></button>
            </div>
            <div style={styles.detailMeta}>
              {(() => {
                const m = TYPE_META[selected.incident_type] || TYPE_META.other;
                return <span style={{color:m.color, fontFamily:'var(--font-display)', fontWeight:600, fontSize:15, display:'flex', alignItems:'center', gap:6}}>
                  <m.Icon size={15} strokeWidth={2}/> {selected.incident_type.replace('_',' ').toUpperCase()}
                </span>;
              })()}
              <span className={`badge ${STATUS_CLASS[selected.status]||''}`}>{selected.status?.replace('_',' ')}</span>
            </div>
            {[
              ['Citizen',   selected.citizen_name],
              ['Region',    selected.region || '—'],
              ['Unit',      selected.assigned_unit || 'Unassigned'],
              ['Lat / Lng', `${Number(selected.latitude).toFixed(4)}, ${Number(selected.longitude).toFixed(4)}`],
            ].map(([k,v]) => (
              <div key={k} style={styles.detailRow}>
                <span style={styles.detailKey}>{k}</span>
                <span style={styles.detailVal}>{v}</span>
              </div>
            ))}
            {/* Logged By — shows the admin who created this report */}
            <div style={styles.detailRow}>
              <span style={styles.detailKey}>Logged By</span>
              <span style={{
                ...styles.detailVal,
                display: 'flex', alignItems: 'center', gap: 4,
                color: myAdminId == selected.created_by_admin
                  ? 'var(--accent-green)'
                  : 'var(--text-secondary)',
              }}>
                <UserCheck size={12} strokeWidth={2}/>
                {myAdminId == selected.created_by_admin
                  ? user?.name || `Admin #${selected.created_by_admin}`
                  : `Admin #${selected.created_by_admin}`}
              </span>
            </div>
            {/* Reported At */}
            <div style={styles.detailRow}>
              <span style={styles.detailKey}>Reported</span>
              <span style={{...styles.detailVal, display:'flex', alignItems:'center', gap:4, color:'var(--text-muted)', fontSize:12}}>
                <Calendar size={11}/>
                {new Date(selected.created_at).toLocaleString()}
              </span>
            </div>
            {selected.notes && <div style={styles.notesBox}>{selected.notes}</div>}
            <div className="divider"/>
            <div style={{...styles.detailKey, marginBottom:8}} className="form-label">UPDATE STATUS</div>
            <div style={styles.statusBtns}>
              {STATUSES.map(s => (
                <button key={s} onClick={() => handleStatus(selected.incident_id, s)}
                  disabled={selected.status===s}
                  style={{...styles.statusBtn, opacity:selected.status===s?0.4:1,
                    borderColor:selected.status===s?'var(--accent-green)':'var(--border)'}}>
                  {s.replace('_',' ')}
                </button>
              ))}
            </div>
            <button className="btn btn-primary"
              style={{width:'100%', justifyContent:'center', marginTop:12}}
              onClick={() => setShowDispatch(true)}>
              <Send size={13}/> DISPATCH UNIT
            </button>
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setShowCreate(false)}>
          <div className="modal" style={{maxWidth:660}}>
            <div className="modal-header">
              <h2 className="modal-title" style={{display:'flex', alignItems:'center', gap:8}}>
                <AlertTriangle size={20} color="var(--accent-red)"/> LOG NEW INCIDENT
              </h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowCreate(false)}><X size={14}/></button>
            </div>
            <form onSubmit={handleCreate}>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px'}}>
                <div className="form-group">
                  <label className="form-label">Citizen Name *</label>
                  <input className="form-input" required value={form.citizenName}
                    onChange={e=>setForm(p=>({...p,citizenName:e.target.value}))} placeholder="John Mensah"/>
                </div>
                <div className="form-group">
                  <label className="form-label">Incident Type *</label>
                  <select className="form-select" value={form.incidentType}
                    onChange={e=>setForm(p=>({...p,incidentType:e.target.value}))}>
                    {TYPES.map(t=><option key={t} value={t}>{t.replace('_',' ').toUpperCase()}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Region / District</label>
                  <input className="form-input" value={form.region}
                    onChange={e=>setForm(p=>({...p,region:e.target.value}))} placeholder="Accra Central"/>
                </div>
                <div className="form-group">
                  <label className="form-label">Coordinates</label>
                  <input className="form-input" readOnly
                    value={pickedLoc ? `${pickedLoc.lat.toFixed(5)}, ${pickedLoc.lng.toFixed(5)}` : 'Tap map to set'}
                    style={{color:pickedLoc?'var(--accent-green)':'var(--text-muted)'}}/>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Notes</label>
                <textarea className="form-textarea" value={form.notes}
                  onChange={e=>setForm(p=>({...p,notes:e.target.value}))}
                  placeholder="Describe the situation..." style={{minHeight:80}}/>
              </div>
              <div className="form-group">
                <label className="form-label" style={{display:'flex', alignItems:'center', gap:6}}>
                  <MapPin size={12}/> TAP MAP TO SET LOCATION *
                </label>
                <div style={{height:260, borderRadius:10, overflow:'hidden', border:'1px solid var(--border)'}}>
                  <MapContainer center={[5.6037,-0.1870]} zoom={11} style={{height:'100%',width:'100%'}}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
                    <LocationPicker onPick={setPickedLoc}/>
                    {pickedLoc && <Marker position={pickedLoc}/>}
                  </MapContainer>
                </div>
              </div>
              <div style={{display:'flex', gap:10, justifyContent:'flex-end', marginTop:8}}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>CANCEL</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  <Send size={13}/> {submitting ? 'SUBMITTING...' : 'SUBMIT REPORT'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Dispatch modal */}
      {showDispatch && selected && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setShowDispatch(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title" style={{display:'flex', alignItems:'center', gap:8}}>
                <Truck size={18} color="var(--accent-yellow)"/> DISPATCH UNIT
              </h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowDispatch(false)}><X size={14}/></button>
            </div>
            <p style={{color:'var(--text-secondary)', marginBottom:20, fontSize:13}}>
              Select an available unit for Incident #{selected.incident_id} — {selected.citizen_name}
            </p>
            {availableVehicles.length === 0 ? (
              <div style={{textAlign:'center', color:'var(--text-muted)', padding:40}}>No available units at this time</div>
            ) : (
              <div style={{display:'flex', flexDirection:'column', gap:8}}>
                {availableVehicles.map(v => (
                  <div key={v.vehicle_id} style={styles.vehicleRow} onClick={() => handleAssign(selected, v.vehicle_id)}>
                    <Truck size={16} color={svcColor(v.service_type)}/>
                    <div>
                      <div style={{fontWeight:600}}>{v.name}</div>
                      <div style={{fontSize:11, color:'var(--text-muted)'}}>{v.vehicle_id} · {v.service_type}</div>
                    </div>
                    <span className="badge badge-resolved" style={{marginLeft:'auto'}}>AVAILABLE</span>
                    <ChevronRight size={14} color="var(--text-muted)"/>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page:        { padding:28, maxWidth:1400 },
  header:      { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 },
  breadcrumb:  { fontFamily:'var(--font-mono)', fontSize:10, letterSpacing:1.5, color:'var(--text-muted)', marginBottom:6 },
  title:       { fontFamily:'var(--font-display)', fontSize:32, fontWeight:700, letterSpacing:1 },
  roleNotice:  { marginTop:6, fontSize:12, color:'var(--accent-yellow)', background:'rgba(255,209,102,0.08)', border:'1px solid rgba(255,209,102,0.2)', borderRadius:6, padding:'4px 10px', display:'inline-flex', alignItems:'center', gap:6 },
  filters:     { display:'flex', gap:8, marginBottom:20, flexWrap:'wrap' },
  filterChip:  { background:'rgba(74,96,122,0.1)', border:'1px solid var(--border)', color:'var(--text-muted)', borderRadius:20, padding:'5px 14px', fontFamily:'var(--font-display)', fontSize:11, fontWeight:600, letterSpacing:1, cursor:'pointer', display:'flex', gap:6, alignItems:'center', transition:'all 0.2s' },
  filterActive:{ background:'rgba(230,57,70,0.12)', borderColor:'rgba(230,57,70,0.4)', color:'var(--accent-red)' },
  filterCount: { background:'rgba(255,255,255,0.08)', borderRadius:10, padding:'1px 7px', fontSize:10 },
  content:     { display:'grid', gridTemplateColumns:'1fr auto', gap:20 },
  tableWrap:   { overflow:'auto' },
  unitBadge:   { fontFamily:'var(--font-mono)', fontSize:11, background:'rgba(76,201,240,0.1)', color:'var(--accent-blue)', padding:'2px 8px', borderRadius:4 },
  detail:      { width:300, padding:20, height:'fit-content', position:'sticky', top:20 },
  detailHeader:{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 },
  detailTitle: { fontFamily:'var(--font-display)', fontSize:16, fontWeight:700, letterSpacing:1 },
  detailMeta:  { display:'flex', alignItems:'center', gap:10, marginBottom:16 },
  detailRow:   { display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid rgba(74,96,122,0.1)' },
  detailKey:   { fontSize:11, color:'var(--text-muted)', fontFamily:'var(--font-display)', letterSpacing:0.5 },
  detailVal:   { fontSize:13, fontWeight:500, textAlign:'right', maxWidth:160 },
  notesBox:    { background:'rgba(74,96,122,0.1)', borderRadius:8, padding:12, fontSize:12, color:'var(--text-secondary)', marginTop:12, fontStyle:'italic' },
  statusBtns:  { display:'grid', gridTemplateColumns:'1fr 1fr', gap:6, marginTop:8 },
  statusBtn:   { background:'rgba(74,96,122,0.08)', border:'1px solid var(--border)', color:'var(--text-secondary)', borderRadius:6, padding:'7px', fontFamily:'var(--font-display)', fontSize:11, fontWeight:600, letterSpacing:0.5, cursor:'pointer', transition:'all 0.2s', textTransform:'uppercase' },
  vehicleRow:  { display:'flex', alignItems:'center', gap:12, padding:14, background:'rgba(74,96,122,0.08)', borderRadius:8, border:'1px solid var(--border)', cursor:'pointer', transition:'all 0.15s' },
};
