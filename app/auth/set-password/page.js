'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../lib/supabase'
import { useRouter } from 'next/navigation'

export default function SetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm,  setConfirm]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')
  const [ready,    setReady]    = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
      else setError('Link inv\u00e1lido o expirado. Pide al administrador que te reenv\u00ede la invitaci\u00f3n.')
    })
  }, [])

  async function handleSubmit() {
    if (password.length < 8)  return setError('La contrase\u00f1a debe tener al menos 8 caracteres.')
    if (password !== confirm)  return setError('Las contrase\u00f1as no coinciden.')
    setLoading(true); setError('')
    const { error: err } = await supabase.auth.updateUser({ password })
    if (err) { setError(err.message); setLoading(false); return }
    router.push('/admin')
  }

  const iS = { width: '100%', background: '#0d1220', border: '1px solid #1e2a45', color: '#f1f5f9', fontSize: 14, padding: '10px 12px', borderRadius: 8, outline: 'none', fontFamily: 'inherit' }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0a0e1a', fontFamily: "'DM Sans', sans-serif", padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <img src="/logo.jpeg" style={{ width: 52, height: 52, borderRadius: 12, marginBottom: 12 }} alt="GM" />
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#f1f5f9', margin: 0 }}>Crear contrase\u00f1a</h1>
          <p style={{ fontSize: 13, color: '#8892a8', marginTop: 6 }}>Bienvenido a G.Montalvo \u2014 elige una contrase\u00f1a para tu cuenta.</p>
        </div>

        <div style={{ background: '#111827', border: '1px solid #1e2a45', borderRadius: 14, padding: 28 }}>
          {error && (
            <div style={{ background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.25)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#ef4444', marginBottom: 18 }}>
              {error}
            </div>
          )}

          {!ready && !error && (
            <div style={{ textAlign: 'center', color: '#8892a8', fontSize: 13, padding: 20 }}>Verificando link...</div>
          )}

          {ready && (
            <>
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#8892a8', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.5px' }}>Nueva contrase\u00f1a</label>
                <input type='password' value={password} onChange={e => setPassword(e.target.value)} placeholder='M\u00ednimo 8 caracteres' style={iS} />
              </div>

              <div style={{ marginBottom: 22 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#8892a8', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.5px' }}>Confirmar contrase\u00f1a</label>
                <input type='password' value={confirm} onChange={e => setConfirm(e.target.value)} placeholder='Repite la contrase\u00f1a' style={iS} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
              </div>

              <button onClick={handleSubmit} disabled={loading || !password || !confirm} style={{ width: '100%', padding: '12px 16px', borderRadius: 8, border: 'none', background: loading || !password || !confirm ? '#1e2a45' : '#3b82f6', color: '#fff', fontSize: 14, fontWeight: 600, cursor: loading || !password || !confirm ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                {loading ? 'Guardando...' : 'Guardar contrase\u00f1a y entrar'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
