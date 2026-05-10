"use client"
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/auth/admin-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al iniciar sesión');
      router.push('/admin');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={{ marginBottom: '32px', textAlign: 'center' }}>
          <h1 style={titleStyle}>KENZLY ADMIN</h1>
          <p style={subtitleStyle}>PANEL DE ADMINISTRACIÓN</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={labelStyle}>CONTRASEÑA</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoFocus
              style={inputStyle}
            />
          </div>

          {error && <p style={errorStyle}>{error}</p>}

          <button type="submit" disabled={loading || !password} style={btnStyle(loading || !password)}>
            {loading ? 'VERIFICANDO...' : 'INGRESAR AL PANEL'}
          </button>
        </form>
      </div>
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
  backgroundColor: '#0f172a', fontFamily: 'system-ui, sans-serif'
};
const cardStyle: React.CSSProperties = {
  backgroundColor: '#1e293b', borderRadius: '24px', padding: '48px',
  width: '100%', maxWidth: '380px', border: '1px solid #334155'
};
const titleStyle: React.CSSProperties = {
  fontSize: '24px', fontWeight: '900', color: '#f8fafc', letterSpacing: '-1px', margin: 0
};
const subtitleStyle: React.CSSProperties = {
  fontSize: '10px', fontWeight: '800', color: '#94a3b8', letterSpacing: '3px', margin: '8px 0 0'
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '10px', fontWeight: '800',
  color: '#64748b', letterSpacing: '1.5px', marginBottom: '8px'
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '14px 16px', backgroundColor: '#0f172a',
  border: '1px solid #334155', borderRadius: '12px', color: '#f8fafc',
  fontSize: '16px', outline: 'none', boxSizing: 'border-box', letterSpacing: '4px'
};
const btnStyle = (disabled: boolean): React.CSSProperties => ({
  width: '100%', padding: '14px', backgroundColor: disabled ? '#334155' : '#6366f1',
  color: disabled ? '#64748b' : 'white', border: 'none', borderRadius: '12px',
  fontWeight: '900', fontSize: '12px', letterSpacing: '2px',
  cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all 0.2s'
});
const errorStyle: React.CSSProperties = {
  fontSize: '11px', color: '#f87171', backgroundColor: '#450a0a',
  padding: '10px 14px', borderRadius: '8px', border: '1px solid #7f1d1d'
};
