'use client'
import { useState } from 'react'
import { supabase } from '../../../lib/supabase'

export default function LoginPage() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPw,   setShowPw]   = useState(false)
  const [err,      setErr]      = useState('')
  const [loading,  setLoading]  = useState(false)
  const [mode,     setMode]     = useState('login')   // 'login' | 'reset'
  const [resetSent, setResetSent] = useState(false)

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

  async function handleReset() {
    if (!email.trim()) { setErr('Escribe tu email primero.'); return }
    setErr(''); setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: 'https://gmontalvo-asistencia.vercel.app/auth/set-password',
    })
    setLoading(false)
    if (error) { setErr(error.message); return }
    setResetSent(true)
  }

  const S = {
    page:  { minHeight: '100vh', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", padding: 16 },
    card:  { background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 32, width: '100%', maxWidth: 380 },
    label: { fontSize: 10, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.5px' },
    input: { width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#0f172a', fontSize: 14, padding: '11px 14px', borderRadius: 8, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' },
    btn:   (ok) => ({ width: '100%', padding: '13px', borderRadius: 9, border: 'none', background: ok ? '#3b82f6' : '#e2e8f0', color: '#fff', fontSize: 14, fontWeight: 700, cursor: ok ? 'pointer' : 'not-allowed', fontFamily: 'inherit', marginTop: 8 }),
    err:   { background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.25)', borderRadius: 7, padding: '10px 14px', fontSize: 12, color: '#ef4444', marginBottom: 14 },
    link:  { background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', padding: 0, textDecoration: 'underline' },
  }

  const validLogin = email.trim() && password.length >= 6

  return (
    <div style={S.page}>
      <div style={S.card}>
        <a href="https://worktic.app" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28, textDecoration: 'none' }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f8fafc', border: '1.5px solid #1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: '#1D9E75', fontFamily: 'Georgia, serif', flexShrink: 0 }}>W</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Worktic</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>Panel de Administración</div>
          </div>
        </a>

        {mode === 'login' ? (
          <>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>Iniciar sesión</div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 24 }}>Acceso exclusivo para administradores.</div>

            {err && <div style={S.err}>{err}</div>}

            <div style={{ marginBottom: 14 }}>
              <label style={S.label}>Email</label>
              <input
                style={S.input} type='email' value={email} placeholder='tu@email.com'
                onChange={e => { setEmail(e.target.value); setErr('') }}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
              />
            </div>
            <div style={{ marginBottom: 8 }}>
              <label style={S.label}>Contraseña</label>
              <div style={{ position: 'relative' }}>
                <input
                  style={{ ...S.input, paddingRight: 44 }} type={showPw ? 'text' : 'password'} value={password} placeholder='••••••••'
                  onChange={e => { setPassword(e.target.value); setErr('') }}
                  onKeyDown={e => e.key === 'Enter' && handleLogin()}
                />
                <button onClick={() => setShowPw(p => !p)} type='button' style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0 }}>
                  {showPw ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            <div style={{ textAlign: 'right', marginBottom: 14 }}>
              <button onClick={() => { setMode('reset'); setErr('') }} style={S.link}>
                Olvidé mi contraseña
              </button>
            </div>

            <button onClick={handleLogin} disabled={!validLogin || loading} style={S.btn(validLogin && !loading)}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </>
        ) : (
          <>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>Recuperar contraseña</div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 24 }}>Te mandamos un link a tu correo para que puedas crear una nueva contraseña.</div>

            {err && <div style={S.err}>{err}</div>}

            {resetSent ? (
              <div style={{ background: 'rgba(16,185,129,.08)', border: '1px solid rgba(16,185,129,.2)', borderRadius: 10, padding: '16px 18px', textAlign: 'center' }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>📧</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#10b981', marginBottom: 6 }}>¡Listo! Revisa tu correo</div>
                <div style={{ fontSize: 11, color: '#64748b' }}>Mandamos el link a <strong style={{ color: '#0f172a' }}>{email}</strong>. Ábrelo desde Chrome (no desde Gmail).</div>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 20 }}>
                  <label style={S.label}>Email</label>
                  <input
                    style={S.input} type='email' value={email} placeholder='tu@email.com'
                    onChange={e => { setEmail(e.target.value); setErr('') }}
                    onKeyDown={e => e.key === 'Enter' && handleReset()}
                  />
                </div>
                <button onClick={handleReset} disabled={!email.trim() || loading} style={S.btn(!!email.trim() && !loading)}>
                  {loading ? 'Enviando...' : 'Enviar link de recuperación'}
                </button>
              </>
            )}

            <button onClick={() => { setMode('login'); setErr(''); setResetSent(false) }} style={{ ...S.link, display: 'block', textAlign: 'center', marginTop: 16 }}>
              ← Volver al login
            </button>
          </>
        )}
      </div>
    </div>
  )
}
