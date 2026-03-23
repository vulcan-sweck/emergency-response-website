// src/pages/AnalyticsPage.jsx
import React, { useEffect, useState } from 'react';
import { RefreshCw, BarChart2, Map, PieChart, Clock, Zap, Globe, Activity } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart as RechartsPie, Pie, Cell, Legend, CartesianGrid
} from 'recharts';
import { analyticsAPI } from '../services/api';
import toast from 'react-hot-toast';

const COLORS = ['#e63946','#4cc9f0','#7b5ea7','#06d6a0','#ffd166','#f4845f'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:8, padding:'10px 14px'}}>
      <p style={{fontFamily:'var(--font-display)', fontSize:12, color:'var(--text-muted)', marginBottom:4}}>{label}</p>
      {payload.map((p,i) => (
        <p key={i} style={{color:p.color||'var(--text-primary)', fontSize:13, fontWeight:600}}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

export default function AnalyticsPage() {
  const [days,          setDays]          = useState(30);
  const [responseTimes, setResponseTimes] = useState([]);
  const [regionData,    setRegionData]    = useState([]);
  const [resourceData,  setResourceData]  = useState([]);
  const [loading,       setLoading]       = useState(true);

  useEffect(() => { load(); }, [days]);

  const load = async () => {
    setLoading(true);
    try {
      const [rt, reg, res] = await Promise.all([
        analyticsAPI.getResponseTimes(days),
        analyticsAPI.getIncidentsByRegion(days),
        analyticsAPI.getResourceUtil(days),
      ]);
      setResponseTimes(rt.data.data?.map(d => ({ ...d, name:d.service_type, avgMin: Math.round(d.avg_seconds/60*10)/10 })) || []);
      setRegionData(reg.data.data || []);
      setResourceData(res.data.data?.map((d,i) => ({ ...d, name:d.service_type, value:d.total_events, color:COLORS[i] })) || []);
    } catch { toast.error('Failed to load analytics'); }
    finally  { setLoading(false); }
  };

  const totalEvents = resourceData.reduce((s,d) => s+d.total_events, 0);
  const avgResponse = responseTimes.length
    ? Math.round(responseTimes.reduce((s,d) => s+d.avg_seconds, 0) / responseTimes.length)
    : 0;

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header} className="animate-fade-in">
        <div>
          <div style={styles.breadcrumb}>COMMAND CENTER / <span style={{color:'var(--accent-red)'}}>ANALYTICS</span></div>
          <h1 style={styles.title}>Analytics & Monitoring</h1>
        </div>
        <div style={{display:'flex', gap:8, alignItems:'center'}}>
          <span style={{fontFamily:'var(--font-display)', fontSize:11, letterSpacing:1, color:'var(--text-muted)'}}>PERIOD:</span>
          {[7,30,90].map(d => (
            <button key={d} onClick={() => setDays(d)}
              style={{...styles.dayBtn, ...(days===d ? {background:'rgba(230,57,70,0.12)', borderColor:'rgba(230,57,70,0.4)', color:'var(--accent-red)'} : {})}}>
              {d}D
            </button>
          ))}
          <button className="btn btn-secondary btn-sm" onClick={load}><RefreshCw size={12}/></button>
        </div>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner"/></div>
      ) : (
        <>
          {/* Summary */}
          <div style={styles.summaryRow} className="animate-fade-in">
            {[
              { label:'TOTAL EVENTS',    value:totalEvents,          color:'var(--accent-red)',    Icon:Activity  },
              { label:'AVG RESPONSE',    value:`${avgResponse}s`,    color:'var(--accent-yellow)', Icon:Clock     },
              { label:'REGIONS COVERED', value:regionData.length,    color:'var(--accent-blue)',   Icon:Globe     },
              { label:'SERVICES ACTIVE', value:responseTimes.length, color:'var(--accent-green)',  Icon:Zap       },
            ].map((s,i) => (
              <div key={i} className="card" style={{...styles.sumCard, borderTop:`2px solid ${s.color}`}}>
                <s.Icon size={22} color={s.color} strokeWidth={1.6}/>
                <div style={{...styles.sumValue, color:s.color}}>{s.value}</div>
                <div style={styles.sumLabel}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Charts row */}
          <div style={styles.chartsRow}>
            {/* Response time bar chart */}
            <div className="card" style={styles.chartCard}>
              <div style={styles.chartHeader}>
                <h3 style={styles.chartTitle}>
                  <Clock size={14} style={{marginRight:6, verticalAlign:'middle'}}/>
                  AVG RESPONSE TIME (minutes)
                </h3>
                <span style={styles.chartSub}>From incident creation to dispatch</span>
              </div>
              {responseTimes.length === 0
                ? <div style={styles.empty}>No data yet</div>
                : <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={responseTimes} margin={{top:5,right:10,left:0,bottom:5}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(74,96,122,0.2)"/>
                      <XAxis dataKey="name" tick={{fill:'var(--text-muted)',fontSize:11,fontFamily:'var(--font-display)'}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fill:'var(--text-muted)',fontSize:10}} axisLine={false} tickLine={false}/>
                      <Tooltip content={<CustomTooltip/>}/>
                      <Bar dataKey="avgMin" name="Avg (min)" radius={[4,4,0,0]}>
                        {responseTimes.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>}
            </div>

            {/* Resource pie chart */}
            <div className="card" style={styles.chartCard}>
              <div style={styles.chartHeader}>
                <h3 style={styles.chartTitle}>
                  <PieChart size={14} style={{marginRight:6, verticalAlign:'middle'}}/>
                  RESOURCE UTILISATION
                </h3>
                <span style={styles.chartSub}>Events handled per service</span>
              </div>
              {resourceData.length === 0
                ? <div style={styles.empty}>No data yet</div>
                : <ResponsiveContainer width="100%" height={220}>
                    <RechartsPie>
                      <Pie data={resourceData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40} paddingAngle={3}>
                        {resourceData.map((d,i) => <Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                      </Pie>
                      <Tooltip content={<CustomTooltip/>}/>
                      <Legend iconType="circle" wrapperStyle={{fontSize:11,fontFamily:'var(--font-display)'}}/>
                    </RechartsPie>
                  </ResponsiveContainer>}
            </div>
          </div>

          {/* Region bar chart */}
          <div className="card" style={{...styles.chartCard, width:'100%', marginTop:20}}>
            <div style={styles.chartHeader}>
              <h3 style={styles.chartTitle}>
                <Map size={14} style={{marginRight:6, verticalAlign:'middle'}}/>
                INCIDENTS BY REGION
              </h3>
              <span style={styles.chartSub}>Total incidents per geographic area</span>
            </div>
            {regionData.length === 0
              ? <div style={styles.empty}>No data yet</div>
              : <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={regionData} margin={{top:5,right:10,left:0,bottom:40}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(74,96,122,0.2)"/>
                    <XAxis dataKey="region" tick={{fill:'var(--text-muted)',fontSize:10,fontFamily:'var(--font-display)'}} angle={-30} textAnchor="end" axisLine={false} tickLine={false}/>
                    <YAxis tick={{fill:'var(--text-muted)',fontSize:10}} axisLine={false} tickLine={false}/>
                    <Tooltip content={<CustomTooltip/>}/>
                    <Bar dataKey="incident_count" name="Incidents" radius={[4,4,0,0]}>
                      {regionData.map((_,i) => <Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>}
          </div>

          {/* Detail table */}
          <div style={{marginTop:20}} className="card">
            <div style={{padding:'16px 20px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:8}}>
              <BarChart2 size={14} color="var(--text-muted)"/>
              <h3 style={styles.chartTitle}>RESPONSE TIME BREAKDOWN</h3>
            </div>
            <table className="data-table">
              <thead><tr><th>SERVICE</th><th>AVG (s)</th><th>MIN (s)</th><th>MAX (s)</th><th>EVENTS</th><th>AVG RESOLUTION</th></tr></thead>
              <tbody>
                {resourceData.map((d,i) => {
                  const rt = responseTimes.find(r => r.service_type===d.service_type);
                  return (
                    <tr key={i}>
                      <td style={{color:COLORS[i], fontWeight:600, fontFamily:'var(--font-display)'}}>{d.service_type.toUpperCase()}</td>
                      <td>{rt?.avg_seconds??'—'}</td>
                      <td>{rt?.min_seconds??'—'}</td>
                      <td>{rt?.max_seconds??'—'}</td>
                      <td>{d.total_events}</td>
                      <td>{d.avg_resolution_minutes ? `${d.avg_resolution_minutes} min` : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

const styles = {
  page:        { padding:28, maxWidth:1400 },
  header:      { display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:24 },
  breadcrumb:  { fontFamily:'var(--font-mono)', fontSize:10, letterSpacing:1.5, color:'var(--text-muted)', marginBottom:6 },
  title:       { fontFamily:'var(--font-display)', fontSize:32, fontWeight:700, letterSpacing:1 },
  dayBtn:      { background:'rgba(74,96,122,0.1)', border:'1px solid var(--border)', color:'var(--text-muted)', borderRadius:6, padding:'5px 14px', fontFamily:'var(--font-display)', fontSize:12, fontWeight:600, cursor:'pointer', transition:'all 0.2s' },
  summaryRow:  { display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 },
  sumCard:     { padding:20, display:'flex', flexDirection:'column', gap:6 },
  sumValue:    { fontFamily:'var(--font-display)', fontSize:36, fontWeight:700, lineHeight:1 },
  sumLabel:    { fontFamily:'var(--font-display)', fontSize:10, letterSpacing:1.5, color:'var(--text-muted)' },
  chartsRow:   { display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 },
  chartCard:   { padding:20 },
  chartHeader: { marginBottom:16 },
  chartTitle:  { fontFamily:'var(--font-display)', fontSize:14, fontWeight:700, letterSpacing:1 },
  chartSub:    { fontSize:11, color:'var(--text-muted)', marginTop:3, display:'block' },
  empty:       { height:200, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--text-muted)' },
};
