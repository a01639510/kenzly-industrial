"use client"
import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function LoginPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [mode, setMode]       = useState<'code' | 'user'>('code');
  const [code, setCode]       = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const endpoint = mode === 'code' ? '/auth/login' : '/auth/user-login';
      const body     = mode === 'code'
        ? { slug, code }
        : { slug, username, password };
      const res  = await fetch(`${API}${endpoint}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        credentials: 'include', body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al iniciar sesión');
      router.push(`/${slug}`);
    } catch (err: any) {
      setError(err.message);
    } finally { setLoading(false); }
  };

  const canSubmit = mode === 'code' ? !!code : (!!username && !!password);

  return (
    <div style={pageStyle}>
      <div style={cardStyle} className="kenzly-login-card">
        <div style={{ marginBottom: '28px', textAlign: 'center' }}>
          <h1 style={titleStyle}>KENZLY</h1>
          <p style={subtitleStyle}>PLANTA: {slug?.toUpperCase()}</p>
        </div>

        {/* Mode toggle */}
        <div style={modeToggle}>
          <button style={modeBtn(mode === 'code')}  onClick={() => { setMode('code');  setError(''); }}>CÓDIGO</button>
          <button style={modeBtn(mode === 'user')}  onClick={() => { setMode('user');  setError(''); }}>USUARIO</button>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: 20 }}>
          {mode === 'code' ? (
            <div>
              <label style={labelStyle}>CÓDIGO DE ACCESO</label>
              <input type="password" value={code} onChange={e => setCode(e.target.value)}
                placeholder="••••••••" autoFocus style={inputStyle} />
            </div>
          ) : (
            <>
              <div>
                <label style={labelStyle}>USUARIO</label>
                <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                  placeholder="nombre.usuario" autoFocus style={inputStyle} autoCapitalize="none" />
              </div>
              <div>
                <label style={labelStyle}>CONTRASEÑA</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••" style={inputStyle} />
              </div>
            </>
          )}

          {error && <p style={errorStyle}>{error}</p>}

          <button type="submit" disabled={loading || !canSubmit} style={btnStyle(loading || !canSubmit)}>
            {loading ? 'VERIFICANDO...' : 'INGRESAR'}
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
  fontSize: '28px', fontWeight: '900', color: '#f8fafc', letterSpacing: '-1px', margin: 0
};
const subtitleStyle: React.CSSProperties = {
  fontSize: '10px', fontWeight: '800', color: '#38bdf8', letterSpacing: '3px', margin: '8px 0 0'
};
const modeToggle: React.CSSProperties = {
  display: 'flex', background: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: 3, gap: 3
};
const modeBtn = (active: boolean): React.CSSProperties => ({
  flex: 1, padding: '8px', border: 'none', borderRadius: 9, cursor: 'pointer',
  fontSize: 10, fontWeight: 900, letterSpacing: 1,
  background: active ? '#38bdf8' : 'transparent',
  color: active ? '#0f172a' : '#64748b', transition: 'all 0.2s'
});
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '10px', fontWeight: '800', color: '#64748b', letterSpacing: '1.5px', marginBottom: '8px'
};
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '14px 16px', backgroundColor: '#0f172a',
  border: '1px solid #334155', borderRadius: '12px', color: '#f8fafc',
  fontSize: '15px', outline: 'none', boxSizing: 'border-box'
};
const btnStyle = (disabled: boolean): React.CSSProperties => ({
  width: '100%', padding: '14px', backgroundColor: disabled ? '#334155' : '#38bdf8',
  color: disabled ? '#64748b' : '#0f172a', border: 'none', borderRadius: '12px',
  fontWeight: '900', fontSize: '12px', letterSpacing: '2px',
  cursor: disabled ? 'not-allowed' : 'pointer', transition: 'all 0.2s'
});
const errorStyle: React.CSSProperties = {
  fontSize: '11px', color: '#f87171', backgroundColor: '#450a0a',
  padding: '10px 14px', borderRadius: '8px', border: '1px solid #7f1d1d', margin: 0
};
