// src/pages/TrackingPage.jsx
// Live vehicle tracking map with Socket.IO real-time updates.
// Includes a SIMULATE DISPATCH demo mode that moves vehicles
// smoothly toward their assigned incident locations.

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { io } from 'socket.io-client';
import { dispatchAPI, incidentAPI } from '../services/api';
import { RefreshCw, Radio, Square, Truck, Flame, Stethoscope, Shield, Car, Signal } from 'lucide-react';
import toast from 'react-hot-toast';

// ── Custom coloured vehicle markers ───────────────────────────
const makeIcon = (color, isMoving = false) => L.divIcon({
  className: '',
  html: `
    <div style="position:relative; width:40px; height:40px;">
      ${isMoving ? `
        <div style="
          position:absolute; inset:-6px;
          border-radius:50%;
          border:2px solid ${color};
          animation:ripple 1.2s ease-out infinite;
          opacity:0.6;
        "></div>
      ` : ''}
      <div style="
        width:34px; height:34px;
        background:${color};
        border:2.5px solid rgba(255,255,255,0.85);
        border-radius:50%;
        display:flex; align-items:center; justify-content:center;
        font-size:15px;
        box-shadow: 0 0 14px ${color}90;
        transition: transform 0.3s;
        position:relative; z-index:1;
      "></div>
    </div>
  `,
  iconSize:   [40, 40],
  iconAnchor: [20, 20],
  popupAnchor:[0, -22],
});

const SERVICE_META = {
  fire:      { color:'#e63946', Icon:Flame,       label:'Fire'      },
  ambulance: { color:'#4cc9f0', Icon:Stethoscope, label:'Ambulance' },
  police:    { color:'#7b5ea7', Icon:Shield,      label:'Police'    },
  rescue:    { color:'#06d6a0', Icon:Truck,       label:'Rescue'    },
};

// Fit map bounds to show all vehicles
function MapFitter({ vehicles }) {
  const map = useMap();
  useEffect(() => {
    const pts = vehicles
      .filter(v => v.current_latitude && v.current_longitude)
      .map(v => [+v.current_latitude, +v.current_longitude]);
    if (pts.length > 0) {
      try { map.fitBounds(pts, { padding:[50,50], maxZoom:11 }); } catch {}
    }
  }, []);
  return null;
}

// ── Linear interpolation helper ───────────────────────────────
const lerp = (a, b, t) => a + (b - a) * t;

export default function TrackingPage() {
  const [vehicles,     setVehicles]     = useState([]);
  const [incidents,    setIncidents]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [connected,    setConnected]    = useState(false);
  const [filter,       setFilter]       = useState('all');
  const [lastUpdate,   setLastUpdate]   = useState(null);
  const [simRunning,   setSimRunning]   = useState(false);
  const [simProgress,  setSimProgress]  = useState({}); // vehicleId → 0..1
  const [movingVehicles, setMovingVehicles] = useState(new Set());

  const socketRef  = useRef(null);
  const simRef     = useRef(null);   // interval handle
  const startPos   = useRef({});     // vehicleId → { lat, lng } at sim start
  const targetPos  = useRef({});     // vehicleId → { lat, lng } of incident

  useEffect(() => {
    loadData();
    connectSocket();
    return () => {
      socketRef.current?.disconnect();
      clearInterval(simRef.current);
    };
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [vRes, iRes] = await Promise.all([
        dispatchAPI.getVehicles(),
        incidentAPI.getOpen(),
      ]);
      setVehicles(vRes.data.vehicles   || []);
      setIncidents(iRes.data.incidents || []);
    } catch { toast.error('Failed to load tracking data'); }
    finally  { setLoading(false); }
  };

  const connectSocket = () => {
    const token  = localStorage.getItem('access_token');
    const socket = io('http://localhost:3003', {
      transports: ['websocket'],
      auth: { token },
    });
    socket.on('connect',    () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('vehicle:location_update', ({ vehicleId, latitude, longitude }) => {
      setVehicles(prev => prev.map(v =>
        v.vehicle_id === vehicleId
          ? { ...v, current_latitude: +latitude, current_longitude: +longitude, last_updated: new Date().toISOString() }
          : v
      ));
      setLastUpdate(new Date().toLocaleTimeString());
    });
    socket.on('vehicle:status_update', ({ vehicleId, status }) => {
      setVehicles(prev => prev.map(v =>
        v.vehicle_id === vehicleId ? { ...v, status } : v
      ));
    });
    socketRef.current = socket;
  };

  // ── DEMO SIMULATION ────────────────────────────────────────
  const startSimulation = useCallback(() => {
    if (simRunning) {
      clearInterval(simRef.current);
      setSimRunning(false);
      setMovingVehicles(new Set());
      setSimProgress({});
      toast('Simulation stopped');
      return;
    }

    // Find dispatched/on_scene vehicles that have an assigned incident
    const dispatched = vehicles.filter(v =>
      (v.status === 'dispatched' || v.status === 'on_scene') &&
      v.assigned_incident
    );

    // Also include ANY vehicle with coordinates if none are dispatched yet
    // so the demo always works
    const candidates = dispatched.length > 0
      ? dispatched
      : vehicles.filter(v => v.current_latitude && v.current_longitude).slice(0, 3);

    if (candidates.length === 0) {
      toast.error('No vehicles with GPS coordinates found. Check that Docker is running.');
      return;
    }

    const starts  = {};
    const targets = {};
    const moving  = new Set();

    candidates.forEach((v, idx) => {
      // If vehicle has an assigned incident, drive toward it
      const incident = incidents.find(i => i.incident_id === v.assigned_incident);
      const targetLat = incident?.latitude  ? +incident.latitude  : 5.6037 + (idx * 0.08);
      const targetLng = incident?.longitude ? +incident.longitude : -0.1870 + (idx * 0.08);

      // Always start vehicles far enough away to show visible movement.
      // Offset ~0.4 degrees (~44km) in a direction based on vehicle index
      // so multiple vehicles come from different directions.
      const angles   = [225, 45, 315, 135, 180, 0]; // degrees
      const angle    = (angles[idx % angles.length] * Math.PI) / 180;
      const distance = 0.4; // degrees offset (~44km)
      const startLat = targetLat + Math.cos(angle) * distance;
      const startLng = targetLng + Math.sin(angle) * distance;

      starts[v.vehicle_id]  = { lat: startLat, lng: startLng };
      targets[v.vehicle_id] = { lat: targetLat, lng: targetLng };
      moving.add(v.vehicle_id);
    });

    // Immediately teleport vehicles to start positions so movement is visible
    setVehicles(prev => prev.map(v => {
      if (!starts[v.vehicle_id]) return v;
      return { ...v, current_latitude: starts[v.vehicle_id].lat, current_longitude: starts[v.vehicle_id].lng };
    }));

    startPos.current  = starts;
    targetPos.current = targets;
    setMovingVehicles(moving);
    setSimProgress(Object.fromEntries(Object.keys(starts).map(id => [id, 0])));
    setSimRunning(true);
    toast.success(`${moving.size} vehicle${moving.size > 1 ? 's' : ''} dispatched — watch the map!`);

    // Animate — 0.5% per 80ms tick = ~16 seconds total journey
    // Slow enough to clearly see movement across the map
    const STEP = 0.005;
    simRef.current = setInterval(() => {
      setSimProgress(prev => {
        const next = { ...prev };
        let allDone = true;

        Object.keys(starts).forEach(vehicleId => {
          const t = Math.min((prev[vehicleId] || 0) + STEP, 1);
          next[vehicleId] = t;
          if (t < 1) allDone = false;

          const s   = starts[vehicleId];
          const g   = targets[vehicleId];
          const lat = lerp(s.lat, g.lat, t);
          const lng = lerp(s.lng, g.lng, t);

          // Update local state — key change forces Leaflet marker to move
          setVehicles(vList => vList.map(v =>
            v.vehicle_id === vehicleId
              ? { ...v, current_latitude: lat, current_longitude: lng }
              : v
          ));

          // Also push via Socket.IO for real-time broadcast to other clients
          if (socketRef.current?.connected) {
            socketRef.current.emit('vehicle:update_location', {
              vehicleId, latitude: lat, longitude: lng,
            });
          }
        });

        if (allDone) {
          clearInterval(simRef.current);
          setSimRunning(false);
          setMovingVehicles(new Set());
          toast.success('All vehicles arrived on scene!');
        }

        return next;
      });
    }, 80);
  }, [vehicles, incidents, simRunning]);

  // ── Render ─────────────────────────────────────────────────
  const displayed = filter === 'all'
    ? vehicles
    : vehicles.filter(v => v.service_type === filter);

  const mapped = displayed.filter(v => v.current_latitude && v.current_longitude);

  const counts = Object.fromEntries(
    Object.keys(SERVICE_META).map(k => [k, vehicles.filter(v => v.service_type === k).length])
  );

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header} className="animate-fade-in">
        <div>
          <div style={styles.breadcrumb}>
            COMMAND CENTER / <span style={{color:'var(--accent-red)'}}>LIVE TRACKING</span>
          </div>
          <h1 style={styles.title}>Fleet Tracking</h1>
        </div>
        <div style={styles.headerRight}>
          {/* Live badge */}
          <div style={styles.liveChip}>
            <div style={{
              ...styles.liveDot,
              background: connected ? 'var(--accent-green)' : 'var(--accent-red)',
            }} className="animate-pulse" />
            <span style={{fontFamily:'var(--font-mono)', fontSize:11, letterSpacing:1.5}}>
              {connected ? 'LIVE' : 'OFFLINE'}
            </span>
          </div>

          {lastUpdate && (
            <span style={{fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-muted)'}}>
              Updated {lastUpdate}
            </span>
          )}

          <button className="btn btn-secondary btn-sm" onClick={loadData}><RefreshCw size={12}/> REFRESH</button>

          {/* ── SIMULATE DISPATCH BUTTON ── */}
          <button
            className={simRunning ? 'btn btn-warning' : 'btn btn-primary'}
            style={simRunning ? styles.simBtnActive : styles.simBtn}
            onClick={startSimulation}
          >
            {simRunning ? (
              <><Square size={13} style={{animation:"pulse 0.6s ease infinite"}}/> STOP SIMULATION</>
            ) : (
              <>SIMULATE DISPATCH</>
            )}
          </button>
        </div>
      </div>

      {/* Simulation info banner */}
      {simRunning && (
        <div style={styles.simBanner} className="animate-fade-in">
          <div style={styles.simBannerIcon}><Signal size={28} color="var(--accent-red)"/></div>
          <div>
            <div style={styles.simBannerTitle}>LIVE SIMULATION ACTIVE</div>
            <div style={styles.simBannerSub}>
              {movingVehicles.size} vehicle{movingVehicles.size > 1 ? 's are' : ' is'} driving toward assigned incident locations in real time via Socket.IO
            </div>
          </div>
          {/* Progress bars for each vehicle */}
          <div style={styles.simProgressList}>
            {[...movingVehicles].map(vid => {
              const v    = vehicles.find(x => x.vehicle_id === vid);
              const meta = SERVICE_META[v?.service_type] || {};
              const pct  = Math.round((simProgress[vid] || 0) * 100);
              return (
                <div key={vid} style={styles.simProgressItem}>
                  <span style={{fontSize:12, minWidth:120}}>{meta.Icon ? React.createElement(meta.Icon, {size:16, color:meta.color}) : null} {v?.name || vid}</span>
                  <div style={styles.simBar}>
                    <div style={{...styles.simBarFill, width:`${pct}%`, background: meta.color || '#e63946'}} />
                  </div>
                  <span style={{fontFamily:'var(--font-mono)', fontSize:11, minWidth:36, color: meta.color}}>{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={styles.body}>
        {/* Left panel */}
        <div style={styles.leftPanel}>
          {/* Compact fleet summary strip */}
          <div className="card" style={styles.legend}>
            <div style={styles.legendTitle}>FLEET SUMMARY</div>
            {/* Service type counts — horizontal */}
            <div style={styles.legendServiceRow}>
              {Object.entries(SERVICE_META).map(([key, meta]) => (
                <div key={key} style={styles.legendServiceItem}>
                  <div style={{...styles.legendDot, background:meta.color, boxShadow:`0 0 6px ${meta.color}60`}}/>
                  <span style={{...styles.legendCount, color:meta.color, fontSize:20}}>{counts[key]||0}</span>
                  <span style={styles.legendServiceLabel}>{meta.label}</span>
                </div>
              ))}
            </div>
            {/* Status counts — horizontal */}
            <div style={styles.legendStatusRow}>
              {[
                ['Avail',  'available',  'var(--accent-green)'],
                ['Enroute','dispatched', 'var(--accent-yellow)'],
                ['Scene',  'on_scene',   'var(--accent-red)'],
                ['Return', 'returning',  'var(--accent-blue)'],
              ].map(([lbl, key, color]) => (
                <div key={key} style={styles.legendStatusItem}>
                  <span style={{...styles.legendCount, color, fontSize:18}}>
                    {vehicles.filter(v=>v.status===key).length}
                  </span>
                  <span style={{...styles.legendServiceLabel, color:'var(--text-muted)'}}>{lbl}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Type filter */}
          <div style={styles.filterRow}>
            {['all', ...Object.keys(SERVICE_META)].map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                style={{
                  ...styles.filterBtn,
                  ...(filter===s ? {
                    background:`rgba(230,57,70,0.12)`,
                    borderColor:`rgba(230,57,70,0.3)`,
                    color:`var(--accent-red)`,
                  } : {}),
                }}
              >
                {s === 'all'
                  ? 'ALL'
                  : (() => {
                      const { Icon, color } = SERVICE_META[s];
                      return Icon
                        ? <Icon size={15} color={filter===s ? color : 'var(--text-muted)'} strokeWidth={1.8}/>
                        : s;
                    })()}
              </button>
            ))}
          </div>

          {/* Vehicle list */}
          <div style={styles.vehicleList}>
            {loading ? (
              <div className="loading-center"><div className="spinner"/></div>
            ) : displayed.map(v => {
              const meta        = SERVICE_META[v.service_type] || {};
              const isMoving    = movingVehicles.has(v.vehicle_id);
              const progress    = simProgress[v.vehicle_id];
              const statusColor = {
                available:'var(--accent-green)',
                dispatched:'var(--accent-yellow)',
                on_scene:'var(--accent-red)',
                returning:'var(--accent-blue)',
                maintenance:'var(--text-muted)',
              }[v.status] || 'var(--text-muted)';

              return (
                <div key={v.vehicle_id} className="card" style={{...styles.vehicleCard, ...(isMoving ? {borderColor:`${meta.color}50`} : {})}}>
                  <div style={{display:'flex', alignItems:'center', gap:10}}>
                    <div style={{
                      ...styles.vIcon,
                      background:`${meta.color}18`,
                      border:`1px solid ${meta.color}40`,
                      ...(isMoving ? {animation:'glowPulse 1s ease infinite'} : {}),
                    }}>
                      <span style={{fontSize:16}}>{meta.Icon ? React.createElement(meta.Icon, {size:16, color:meta.color}) : null}</span>
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:600, fontSize:13}}>{v.name}</div>
                      <div style={{fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-muted)'}}>{v.vehicle_id}</div>
                    </div>
                    <div style={{...styles.statusDot, background:statusColor, ...(isMoving?{boxShadow:`0 0 8px ${meta.color}`}:{})}} />
                  </div>

                  <div style={{marginTop:8, display:'flex', gap:8, flexWrap:'wrap'}}>
                    <span style={{...styles.vMeta, color:statusColor}}>{v.status?.replace('_',' ')}</span>
                    {isMoving && (
                      <span style={{...styles.vMeta, color:meta.color, fontFamily:'var(--font-mono)'}}>
                        EN ROUTE {Math.round((progress||0)*100)}%
                      </span>
                    )}
                    {v.current_latitude && !isMoving && (
                      <span style={{...styles.vMeta, fontFamily:'var(--font-mono)', fontSize:10}}>
                        {Number(v.current_latitude).toFixed(3)}, {Number(v.current_longitude).toFixed(3)}
                      </span>
                    )}
                  </div>

                  {/* Progress bar when moving */}
                  {isMoving && progress !== undefined && (
                    <div style={styles.vProgressBar}>
                      <div style={{...styles.vProgressFill, width:`${progress*100}%`, background:meta.color}} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Map */}
        <div style={styles.mapWrap} className="animate-fade-in">
          <MapContainer
            center={[7.9465, -1.0232]}
            zoom={7}
            style={{height:'100%', width:'100%'}}
          >
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>
            {!loading && <MapFitter vehicles={vehicles}/>}

            {/* Vehicle markers — key includes rounded coords to force re-render on move */}
            {mapped.map(v => {
              const meta     = SERVICE_META[v.service_type] || {color:'#888', Icon:Truck, label:'Vehicle'};
              const isMoving = movingVehicles.has(v.vehicle_id);
              const lat      = +v.current_latitude;
              const lng      = +v.current_longitude;
              // Including coordinates in key forces Leaflet to re-mount marker
              // when position changes, making movement visible on the map
              const markerKey = `${v.vehicle_id}-${lat.toFixed(4)}-${lng.toFixed(4)}`;
              return (
                <Marker
                  key={markerKey}
                  position={[lat, lng]}
                  icon={makeIcon(meta.color, isMoving)}
                >
                  <Popup>
                    <div style={{fontFamily:'var(--font-body)', padding:4, minWidth:180}}>
                      <strong style={{color:meta.color, fontSize:14}}>{meta.Icon ? React.createElement(meta.Icon, {size:16, color:meta.color}) : null} {v.name}</strong>
                      <div style={{fontSize:11, color:'#aaa', marginTop:4}}>{v.vehicle_id} · {v.service_type}</div>
                      <div style={{fontSize:11, color:'#aaa'}}>{v.status?.replace('_',' ')}</div>
                      {v.assigned_incident && (() => {
                        const inc = incidents.find(i => i.incident_id === v.assigned_incident);
                        return (
                          <div style={{marginTop:6, padding:'4px 6px', background:'rgba(255,209,102,0.1)', borderRadius:4, border:'1px solid rgba(255,209,102,0.3)'}}>
                            <div style={{fontSize:11, color:'#ffd166', fontWeight:600}}>
                              Incident #{v.assigned_incident}
                            </div>
                            {inc && <div style={{fontSize:10, color:'#aaa', marginTop:2}}>{inc.citizen_name} — {inc.incident_type}</div>}
                          </div>
                        );
                      })()}
                      {movingVehicles.has(v.vehicle_id) && (
                        <div style={{marginTop:6, padding:'4px 6px', background:'rgba(230,57,70,0.1)', borderRadius:4}}>
                          <div style={{fontSize:11, color:meta.color, fontWeight:700}}>
                            EN ROUTE — {Math.round((simProgress[v.vehicle_id]||0)*100)}%
                          </div>
                          <div style={{fontSize:10, color:'#aaa', marginTop:2}}>
                            {lat.toFixed(4)}, {lng.toFixed(4)}
                          </div>
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>

          {/* Vehicle count badge */}
          <div style={styles.countBadge}>
            {mapped.length} of {vehicles.length} vehicles tracked
            {simRunning && <span style={{color:'var(--accent-yellow)', marginLeft:10}}>SIMULATION ACTIVE</span>}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page:       { padding:28, height:'calc(100vh)', display:'flex', flexDirection:'column', overflow:'hidden' },
  header:     { display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16, flexShrink:0 },
  breadcrumb: { fontFamily:'var(--font-mono)', fontSize:10, letterSpacing:1.5, color:'var(--text-muted)', marginBottom:6 },
  title:      { fontFamily:'var(--font-display)', fontSize:32, fontWeight:700, letterSpacing:1 },
  headerRight:{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap' },
  liveChip:   { display:'flex', alignItems:'center', gap:7, background:'rgba(6,214,160,0.08)', border:'1px solid rgba(6,214,160,0.2)', borderRadius:20, padding:'5px 12px' },
  liveDot:    { width:8, height:8, borderRadius:'50%' },
  simBtn:     { background:'linear-gradient(135deg, #e63946, #ff6b6b)', border:'none', boxShadow:'0 4px 16px rgba(230,57,70,0.35)', letterSpacing:0.5 },
  simBtnActive:{ letterSpacing:0.5 },
  simPulse:   { animation:'pulse 0.6s ease infinite', color:'var(--accent-yellow)' },

  simBanner:  {
    background:'rgba(230,57,70,0.06)',
    border:'1px solid rgba(230,57,70,0.25)',
    borderRadius:10,
    padding:'14px 18px',
    marginBottom:16,
    display:'flex', alignItems:'flex-start', gap:14,
    flexShrink:0,
    flexWrap:'wrap',
  },
  simBannerIcon:  { fontSize:28, flexShrink:0 },
  simBannerTitle: { fontFamily:'var(--font-display)', fontSize:14, fontWeight:700, letterSpacing:1.5, color:'var(--accent-red)' },
  simBannerSub:   { fontSize:12, color:'var(--text-secondary)', marginTop:3 },
  simProgressList:{ display:'flex', flexDirection:'column', gap:6, marginTop:4, flex:1, minWidth:200 },
  simProgressItem:{ display:'flex', alignItems:'center', gap:10 },
  simBar:         { flex:1, height:6, background:'rgba(74,96,122,0.2)', borderRadius:3, overflow:'hidden' },
  simBarFill:     { height:'100%', borderRadius:3, transition:'width 0.1s linear' },

  body:       { flex:1, display:'grid', gridTemplateColumns:'280px 1fr', gap:20, overflow:'hidden' },
  leftPanel:  { display:'flex', flexDirection:'column', gap:12, overflow:'hidden' },
  legend:            { padding:'10px 12px', flexShrink:0 },
  legendTitle:       { fontFamily:'var(--font-display)', fontSize:10, letterSpacing:2, color:'var(--text-muted)', marginBottom:8 },
  legendServiceRow:  { display:'flex', justifyContent:'space-between', marginBottom:8 },
  legendServiceItem: { display:'flex', flexDirection:'column', alignItems:'center', gap:2, flex:1 },
  legendStatusRow:   { display:'flex', justifyContent:'space-between', borderTop:'1px solid var(--border)', paddingTop:8 },
  legendStatusItem:  { display:'flex', flexDirection:'column', alignItems:'center', gap:1, flex:1 },
  legendDot:         { width:8, height:8, borderRadius:'50%', flexShrink:0 },
  legendServiceLabel:{ fontSize:9, letterSpacing:0.5, color:'var(--text-muted)', fontFamily:'var(--font-display)', textTransform:'uppercase' },
  legendCount:       { fontFamily:'var(--font-display)', fontWeight:700 },
  filterRow:  { display:'flex', gap:6, flexShrink:0 },
  filterBtn:  { flex:1, padding:'6px', background:'rgba(74,96,122,0.1)', border:'1px solid var(--border)', color:'var(--text-muted)', borderRadius:6, fontFamily:'var(--font-display)', fontSize:11, cursor:'pointer', transition:'all 0.2s', textAlign:'center' },
  vehicleList:{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:8 },
  vehicleCard:{ padding:12, cursor:'default', transition:'border-color 0.3s' },
  vIcon:      { width:36, height:36, borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all 0.3s' },
  statusDot:  { width:8, height:8, borderRadius:'50%', transition:'box-shadow 0.3s' },
  vMeta:      { fontSize:11, background:'rgba(74,96,122,0.1)', borderRadius:4, padding:'2px 8px' },
  vProgressBar:{ height:3, background:'rgba(74,96,122,0.15)', borderRadius:2, overflow:'hidden', marginTop:8 },
  vProgressFill:{ height:'100%', borderRadius:2, transition:'width 0.1s linear' },
  mapWrap:    { position:'relative', borderRadius:12, overflow:'hidden', border:'1px solid var(--border)' },
  countBadge: { position:'absolute', bottom:16, left:'50%', transform:'translateX(-50%)', background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:20, padding:'6px 16px', fontFamily:'var(--font-display)', fontSize:12, fontWeight:600, boxShadow:'0 4px 12px rgba(0,0,0,0.3)', zIndex:999, whiteSpace:'nowrap' },
};
