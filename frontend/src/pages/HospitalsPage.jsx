// src/pages/HospitalsPage.jsx
import React, { useEffect, useState } from 'react';
import {
  RefreshCw, Pencil, X, BedDouble, Ambulance,
  Building2, CheckCircle, XCircle, Save, MapPin,
  Activity, AlertTriangle
} from 'lucide-react';
import { analyticsClient } from '../services/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function HospitalsPage() {
  const [hospitals, setHospitals] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [editing,   setEditing]   = useState(null);
  const [form,      setForm]      = useState({});
  const [saving,    setSaving]    = useState(false);
  const { user } = useAuth();

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await analyticsClient.get('/hospitals');
      setHospitals(res.data.hospitals || []);
    } catch { toast.error('Failed to load hospitals'); }
    finally  { setLoading(false); }
  };

  const openEdit = (h) => {
    setEditing(h);
    setForm({ total_beds:h.total_beds, available_beds:h.available_beds,
              available_ambulances:h.available_ambulances, emergency_capacity:h.emergency_capacity });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await analyticsClient.put(`/hospitals/${editing.hospital_id}`, form);
      toast.success('Hospital updated');
      setEditing(null);
      load();
    } catch { toast.error('Update failed'); }
    finally { setSaving(false); }
  };

  const capColor = (avail, total) => {
    if (!total) return 'var(--text-muted)';
    const pct = avail / total;
    if (pct > 0.5) return 'var(--accent-green)';
    if (pct > 0.2) return 'var(--accent-yellow)';
    return 'var(--accent-red)';
  };

  const canEdit = user?.role === 'system_admin' || user?.role === 'hospital_admin';

  const totalBeds    = hospitals.reduce((s,h) => s+(h.total_beds||0), 0);
  const availBeds    = hospitals.reduce((s,h) => s+(h.available_beds||0), 0);
  const availAmb     = hospitals.reduce((s,h) => s+(h.available_ambulances||0), 0);

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header} className="animate-fade-in">
        <div>
          <div style={styles.breadcrumb}>COMMAND CENTER / <span style={{color:'var(--accent-red)'}}>HOSPITALS</span></div>
          <h1 style={styles.title}>Hospital Capacity</h1>
          <p style={styles.subtitle}>Real-time bed availability and ambulance status across all registered hospitals.</p>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={load}><RefreshCw size={12}/> REFRESH</button>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner"/></div>
      ) : hospitals.length === 0 ? (
        <div style={styles.empty} className="card">
          <Building2 size={48} color="var(--text-muted)"/>
          <p style={{color:'var(--text-muted)', marginTop:12}}>No hospitals registered yet.</p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div style={styles.summaryRow} className="animate-fade-in">
            {[
              { label:'HOSPITALS',        value:hospitals.length, color:'var(--accent-blue)',   Icon:Building2   },
              { label:'TOTAL BEDS',       value:totalBeds,        color:'var(--text-primary)',  Icon:BedDouble   },
              { label:'AVAILABLE BEDS',   value:availBeds,        color:'var(--accent-green)',  Icon:CheckCircle },
              { label:'AMBULANCES READY', value:availAmb,         color:'var(--medical-color)', Icon:Ambulance   },
            ].map((s,i) => (
              <div key={i} className="card" style={{...styles.sumCard, borderTop:`2px solid ${s.color}`}}>
                <s.Icon size={22} color={s.color} strokeWidth={1.6}/>
                <div style={{...styles.sumValue, color:s.color}}>{s.value}</div>
                <div style={styles.sumLabel}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Hospital cards */}
          <div style={styles.grid}>
            {hospitals.map((h,i) => {
              const bedColor = capColor(h.available_beds,  h.total_beds);
              const ambColor = capColor(h.available_ambulances, h.total_ambulances);
              const bedPct   = h.total_beds ? Math.round(h.available_beds/h.total_beds*100) : 0;
              return (
                <div key={h.hospital_id} className="card animate-fade-in"
                  style={{...styles.hospCard, animationDelay:`${i*60}ms`}}>
                  <div style={styles.hospHeader}>
                    <Building2 size={28} color="var(--accent-blue)" strokeWidth={1.4}/>
                    <div style={{flex:1}}>
                      <div style={styles.hospName}>{h.name}</div>
                      <div style={styles.hospLocation}>
                        <MapPin size={11}/> {h.region||'Ghana'}
                      </div>
                    </div>
                    <div style={{...styles.statusPill,
                      background: h.accepting_patients?'rgba(6,214,160,0.1)':'rgba(230,57,70,0.1)',
                      color:      h.accepting_patients?'var(--accent-green)':'var(--accent-red)',
                      border:     `1px solid ${h.accepting_patients?'rgba(6,214,160,0.3)':'rgba(230,57,70,0.3)'}`}}>
                      {h.accepting_patients
                        ? <><CheckCircle size={11}/> ACCEPTING</>
                        : <><XCircle    size={11}/> FULL</>}
                    </div>
                  </div>

                  <div className="divider" style={{margin:'12px 0'}}/>

                  <div style={styles.statsRow}>
                    <div style={styles.statItem}>
                      <div style={{...styles.statNum, color:bedColor}}>{h.available_beds??'—'}</div>
                      <div style={styles.statLbl}><BedDouble size={11}/> Available Beds</div>
                      <div style={styles.statTotal}>of {h.total_beds??'—'}</div>
                    </div>
                    <div style={styles.statItem}>
                      <div style={{...styles.statNum, color:ambColor}}>{h.available_ambulances??'—'}</div>
                      <div style={styles.statLbl}><Ambulance size={11}/> Ambulances</div>
                      <div style={styles.statTotal}>of {h.total_ambulances??'—'}</div>
                    </div>
                    <div style={styles.statItem}>
                      <div style={{...styles.statNum, color:bedColor}}>{bedPct}%</div>
                      <div style={styles.statLbl}><Activity size={11}/> Capacity</div>
                      <div style={styles.statTotal}>available</div>
                    </div>
                  </div>

                  <div style={styles.barTrack}>
                    <div style={{...styles.barFill, width:`${bedPct}%`, background:bedColor}}/>
                  </div>

                  {h.emergency_capacity!=null && (
                    <div style={styles.emergencyRow}>
                      <span style={{fontSize:11, color:'var(--text-muted)', display:'flex', alignItems:'center', gap:4}}>
                        <AlertTriangle size={11}/> Emergency capacity:
                      </span>
                      <span style={{fontFamily:'var(--font-display)', fontSize:13, fontWeight:600, color:'var(--accent-yellow)'}}>
                        {h.emergency_capacity} beds
                      </span>
                    </div>
                  )}

                  {canEdit && (
                    <button className="btn btn-secondary btn-sm"
                      style={{width:'100%', justifyContent:'center', marginTop:12}}
                      onClick={() => openEdit(h)}>
                      <Pencil size={12}/> UPDATE CAPACITY
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setEditing(null)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title" style={{display:'flex', alignItems:'center', gap:8}}>
                <Pencil size={18}/> Update {editing.name}
              </h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditing(null)}><X size={14}/></button>
            </div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px'}}>
              {[['total_beds','Total Beds'],['available_beds','Available Beds'],
                ['available_ambulances','Available Ambulances'],['emergency_capacity','Emergency Capacity']
              ].map(([field,label]) => (
                <div key={field} className="form-group">
                  <label className="form-label">{label}</label>
                  <input type="number" className="form-input" min={0}
                    value={form[field]??''}
                    onChange={e=>setForm(p=>({...p,[field]:parseInt(e.target.value)||0}))}/>
                </div>
              ))}
            </div>
            <div style={{display:'flex', gap:10, justifyContent:'flex-end', marginTop:8}}>
              <button className="btn btn-secondary" onClick={() => setEditing(null)}>CANCEL</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                <Save size={13}/> {saving?'SAVING...':'SAVE CHANGES'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  page:        { padding:28, maxWidth:1400 },
  header:      { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 },
  breadcrumb:  { fontFamily:'var(--font-mono)', fontSize:10, letterSpacing:1.5, color:'var(--text-muted)', marginBottom:6 },
  title:       { fontFamily:'var(--font-display)', fontSize:32, fontWeight:700, letterSpacing:1 },
  subtitle:    { color:'var(--text-secondary)', fontSize:13, marginTop:4 },
  empty:       { padding:60, textAlign:'center', display:'flex', flexDirection:'column', alignItems:'center' },
  summaryRow:  { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 },
  sumCard:     { padding:20, display:'flex', flexDirection:'column', gap:6 },
  sumValue:    { fontFamily:'var(--font-display)', fontSize:36, fontWeight:700, lineHeight:1 },
  sumLabel:    { fontFamily:'var(--font-display)', fontSize:10, letterSpacing:1.5, color:'var(--text-muted)' },
  grid:        { display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px,1fr))', gap:16 },
  hospCard:    { padding:20 },
  hospHeader:  { display:'flex', alignItems:'flex-start', gap:12 },
  hospName:    { fontFamily:'var(--font-display)', fontSize:16, fontWeight:700 },
  hospLocation:{ fontSize:11, color:'var(--text-muted)', marginTop:3, display:'flex', alignItems:'center', gap:3 },
  statusPill:  { borderRadius:20, padding:'3px 10px', fontFamily:'var(--font-display)', fontSize:10, fontWeight:600, letterSpacing:0.5, flexShrink:0, display:'flex', alignItems:'center', gap:4 },
  statsRow:    { display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, textAlign:'center', marginBottom:12 },
  statItem:    {},
  statNum:     { fontFamily:'var(--font-display)', fontSize:28, fontWeight:700, lineHeight:1 },
  statLbl:     { fontSize:10, color:'var(--text-secondary)', marginTop:3, fontFamily:'var(--font-display)', letterSpacing:0.5, display:'flex', alignItems:'center', justifyContent:'center', gap:3 },
  statTotal:   { fontSize:10, color:'var(--text-muted)' },
  barTrack:    { height:6, background:'rgba(74,96,122,0.2)', borderRadius:3, overflow:'hidden', marginBottom:8 },
  barFill:     { height:'100%', borderRadius:3, transition:'width 0.5s ease' },
  emergencyRow:{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:4 },
};
