'use client'
import { useState } from 'react'
import { supabase } from '../../../lib/supabase'

export default function LoginPage() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [err,      setErr]      = useState('')
  const [loading,  setLoading]  = useState(false)

  async function handleLogin() {
    setErr(''); setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
    if (error) {
      setErr('Email o contraseña incorrectos.')
      setLoading(false)
      return
    }
    window.location.href = '/admin'
  }

  const S = {
    page: { minHeight: '100vh', background: '#050810', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", padding: 16 },
    card: { background: '#111827', border: '1px solid #1e2a45', borderRadius: 16, padding: 32, width: '100%', maxWidth: 380 },
    label: { fontSize: 10, fontWeight: 600, color: '#8892a8', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.5px' },
    input: { width: '100%', background: '#0d1220', border: '1px solid #1e2a45', color: '#f1f5f9', fontSize: 14, padding: '11px 14px', borderRadius: 8, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' },
    btn: (ok) => ({ width: '100%', padding: '13px', borderRadius: 9, border: 'none', background: ok ? '#3b82f6' : '#1e2a45', color: '#fff', fontSize: 14, fontWeight: 700, cursor: ok ? 'pointer' : 'not-allowed', fontFamily: 'inherit', marginTop: 8 }),
    err: { background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.25)', borderRadius: 7, padding: '10px 14px', fontSize: 12, color: '#ef4444', marginBottom: 14 },
  }

  const valid = email.trim() && password.length >= 6

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <img src='/logo.jpeg' style={{ width: 40, height: 40, borderRadius: 10 }} alt='GM' />
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>G.Montalvo</div>
            <div style={{ fontSize: 11, color: '#8892a8' }}>Control de Asistencia</div>
          </div>
        </div>

        <div style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9', marginBottom: 6 }}>Iniciar sesión</div>
        <div style={{ fontSize: 12, color: '#8892a8', marginBottom: 24 }}>Acceso exclusivo para administradores.</div>

        {err && <div style={S.err}>{err}</div>}

        <div style={{ marginBottom: 14 }}>
          <label style={S.label}>Email</label>
          <input
            style={S.input} type='email' value={email} placeholder='tu@email.com'
            onChange={e => { setEmail(e.target.value); setErr('') }}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
          />
        </div>
        <div style={{ marginBottom: 22 }}>
          <label style={S.label}>Contraseña</label>
          <div style={{ position: 'relative' }}>
            <input
              style={{ ...S.input, paddingRight: 44 }} type={showPw ? 'text' : 'password'} value={password} placeholder='••••••••'
              onChange={e => { setPassword(e.target.value); setErr('') }}
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
            />
            <button onClick={() => setShowPw(p => !p)} type='button' style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#4a5568', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0 }}>
              {showPw ? '🙈' : '👁'}
            </button>
          </div>
        </div>

        <button onClick={handleLogin} disabled={!valid || loading} style={S.btn(valid && !loading)}>
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </div>
    </div>
  )
}
