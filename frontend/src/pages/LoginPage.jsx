// src/pages/LoginPage.jsx
import React, { useState } from 'react';
import { Layers, Mail, Lock, Eye, EyeOff, LogIn } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [showPass, setShowPass] = useState(false);
  const { login } = useAuth();
  const navigate  = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Access granted');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.root}>
      {/* Animated grid background */}
      <div style={styles.grid} />
      {/* Radial glow */}
      <div style={styles.glow} />

      {/* Scan line effect */}
      <div style={styles.scanContainer}>
        <div style={styles.scanLine} />
      </div>

      <div style={styles.container}>
        {/* Logo / Branding */}
        <div style={styles.brand} className="animate-fade-in">
          <div style={styles.logoRing}>
            <div style={styles.logoInner}>
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#e63946" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                <path d="M2 17l10 5 10-5"/>
                <path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
          </div>
          <div style={styles.brandText}>
            <h1 style={styles.brandTitle}>ERP COMMAND</h1>
            <p style={styles.brandSub}>NATIONAL EMERGENCY RESPONSE PLATFORM</p>
          </div>
        </div>

        {/* Login card */}
        <div style={styles.card} className="animate-fade-in">
          <div style={styles.cardHeader}>
            <div style={styles.statusDot} className="animate-pulse" />
            <span style={styles.statusText}>SECURE ACCESS TERMINAL</span>
          </div>

          <h2 style={styles.title}>ADMINISTRATOR LOGIN</h2>
          <p style={styles.subtitle}>Authorized personnel only. All access is logged and monitored.</p>

          <form onSubmit={handleSubmit} style={styles.form}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div style={styles.inputWrap}>
                <Mail size={16} color="var(--text-muted)" style={styles.inputIcon} />
                <input
                  type="email"
                  className="form-input"
                  style={styles.input}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@ercplatform.gov"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div style={styles.inputWrap}>
                <Lock size={16} color="var(--text-muted)" style={styles.inputIcon} />
                <input
                  type={showPass ? 'text' : 'password'}
                  className="form-input"
                  style={styles.input}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                />
                <button type="button" style={styles.eyeBtn} onClick={() => setShowPass(p => !p)}>
                  {showPass ? <EyeOff size={16} color="var(--text-muted)" /> : <Eye size={16} color="var(--text-muted)" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={styles.submitBtn}
              disabled={loading}
            >
              {loading ? (
                <><div className="spinner" style={{width:18,height:18,borderWidth:2}} /> AUTHENTICATING...</>
              ) : (
                <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/>
                </svg> AUTHENTICATE</>
              )}
            </button>
          </form>

          <div style={styles.footer}>
            <span style={{color: 'var(--text-muted)', fontSize: 11}}>
              256-bit encrypted · JWT secured · Access logged
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}

const styles = {
  root: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--bg-primary)',
    position: 'relative',
    overflow: 'hidden',
  },
  grid: {
    position: 'absolute', inset: 0,
    backgroundImage: `
      linear-gradient(rgba(74,96,122,0.08) 1px, transparent 1px),
      linear-gradient(90deg, rgba(74,96,122,0.08) 1px, transparent 1px)
    `,
    backgroundSize: '40px 40px',
    pointerEvents: 'none',
  },
  glow: {
    position: 'absolute',
    top: '50%', left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 600, height: 600,
    background: 'radial-gradient(circle, rgba(230,57,70,0.08) 0%, transparent 70%)',
    pointerEvents: 'none',
  },
  scanContainer: {
    position: 'absolute', inset: 0,
    overflow: 'hidden', pointerEvents: 'none',
  },
  scanLine: {
    position: 'absolute', left: 0, right: 0,
    height: 2,
    background: 'linear-gradient(transparent, rgba(230,57,70,0.15), transparent)',
    animation: 'scanLine 6s linear infinite',
  },
  container: {
    position: 'relative', zIndex: 10,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', gap: 28,
    width: '100%', maxWidth: 480,
    padding: '0 20px',
  },
  brand: {
    display: 'flex', alignItems: 'center', gap: 16,
  },
  logoRing: {
    width: 64, height: 64,
    borderRadius: '50%',
    border: '2px solid var(--accent-red)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 0 20px rgba(230,57,70,0.3)',
    animation: 'glowPulse 3s ease infinite',
  },
  logoInner: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
  brandText: { display: 'flex', flexDirection: 'column' },
  brandTitle: {
    fontFamily: 'var(--font-display)',
    fontSize: 28, fontWeight: 700,
    letterSpacing: 4, color: 'var(--text-primary)',
    lineHeight: 1,
  },
  brandSub: {
    fontSize: 9, letterSpacing: 2.5,
    color: 'var(--text-muted)', marginTop: 4,
  },
  card: {
    width: '100%',
    background: 'var(--bg-card)',
    border: '1px solid var(--border-bright)',
    borderRadius: 'var(--radius-lg)',
    padding: '32px',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(230,57,70,0.1)',
  },
  cardHeader: {
    display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20,
  },
  statusDot: {
    width: 8, height: 8, borderRadius: '50%',
    background: 'var(--accent-green)',
    boxShadow: '0 0 8px var(--accent-green)',
  },
  statusText: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10, letterSpacing: 2,
    color: 'var(--accent-green)',
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontSize: 26, fontWeight: 700, letterSpacing: 2,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 12, color: 'var(--text-muted)', marginBottom: 28,
  },
  form: { display: 'flex', flexDirection: 'column', gap: 4 },
  inputWrap: { position: 'relative' },
  inputIcon: {
    position: 'absolute', left: 12, top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--text-muted)', pointerEvents: 'none',
  },
  input: { paddingLeft: 38 },
  eyeBtn: {
    position: 'absolute', right: 12, top: '50%',
    transform: 'translateY(-50%)',
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 16, color: 'var(--text-muted)',
  },
  submitBtn: { width: '100%', marginTop: 8, justifyContent: 'center' },
  footer: {
    marginTop: 24, textAlign: 'center',
  },
  hint: { opacity: 0.6 },
};
