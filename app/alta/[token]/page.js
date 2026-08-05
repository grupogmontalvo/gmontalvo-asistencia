'use client'
import { useState, useEffect } from 'react'

const S = {
  page: { minHeight: '100vh', background: '#0c1022', display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: "'DM Sans', sans-serif", color: '#f1f5f9' },
  bar: { width: '100%', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #1e2a45', background: '#111827', gap: 10 },
  logo: { width: 28, height: 28, borderRadius: 6 },
  container: { width: '100%', maxWidth: 400, padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 14 },
  label: { fontSize: 12, color: '#8892a8', marginBottom: 6, display: 'block' },
  input: { width: '100%', background: '#0d1220', border: '1px solid #1e2a45', color: '#f1f5f9', fontFamily: "'DM Sans', sans-serif", fontSize: 16, padding: '13px 15px', borderRadius: 10, outline: 'none', boxSizing: 'border-box' },
  btn: (dis) => ({ width: '100%', padding: '15px 20px', borderRadius: 10, border: 'none', background: dis ? '#1e2a45' : '#10b981', color: '#fff', fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 700, cursor: dis ? 'not-allowed' : 'pointer' }),
  err: { background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.25)', borderRadius: 8, padding: '12px 14px', fontSize: 13, color: '#ef4444', textAlign: 'center', lineHeight: 1.5 },
  card: { background: '#1c2641', border: '1px solid #243154', borderRadius: 14, padding: 22, textAlign: 'center' },
  muted: { fontSize: 12, color: '#8892a8', lineHeight: 1.6 },
}

export default function AltaPage({ params }) {
  const token = params.token
  const [estado, setEstado] = useState('cargando') // cargando | formulario | invalido | listo
  const [info, setInfo]     = useState(null)
  const [err, setErr]       = useState('')
  const [enviando, setEnviando] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', phone: '', birth_date: '' })
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }))

  useEffect(() => {
    fetch(`/api/alta?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(j => {
        if (j.ok) { setInfo(j); setEstado('formulario') }
        else { setErr(j.error || 'Link inválido.'); setEstado('invalido') }
      })
      .catch(() => { setErr('No pudimos conectar. Revisa tu internet.'); setEstado('invalido') })
  }, [token])

  async function enviar(e) {
    e.preventDefault()
    if (enviando) return
    setEnviando(true); setErr('')
    try {
      const res = await fetch('/api/alta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, ...form }),
      })
      const j = await res.json()
      if (!res.ok) { setErr(j.error || 'No se pudo completar el registro.'); setEnviando(false); return }
      setEstado('listo')
    } catch {
      setErr('Error de conexión. Intenta de nuevo.'); setEnviando(false)
    }
  }

  const Barra = () => (
    <div style={S.bar}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src='/logo.jpeg' style={S.logo} alt='Worktic' />
      <span style={{ fontSize: 13, fontWeight: 600 }}>{info?.empresa || 'Worktic'}</span>
    </div>
  )

  if (estado === 'cargando') return (
    <div style={S.page}>
      <Barra />
      <div style={{ ...S.container, alignItems: 'center', paddingTop: 60 }}>
        <div style={S.muted}>Verificando el link...</div>
      </div>
    </div>
  )

  if (estado === 'invalido') return (
    <div style={S.page}>
      <Barra />
      <div style={{ ...S.container, paddingTop: 40 }}>
        <div style={S.card}>
          <div style={{ fontSize: 34, marginBottom: 10 }}>🔒</div>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>Link no disponible</div>
          <p style={S.muted}>{err}</p>
        </div>
      </div>
    </div>
  )

  if (estado === 'listo') return (
    <div style={S.page}>
      <Barra />
      <div style={{ ...S.container, paddingTop: 40 }}>
        <div style={S.card}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
          <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 10 }}>¡Listo, {form.name.split(' ')[0]}!</div>
          <p style={S.muted}>
            Tu registro quedó enviado. Tu administrador tiene que aprobarlo antes de que puedas registrar entrada y salida.
            <br /><br />
            Cuando te avisen que ya estás dado de alta, escanea el código QR de tu sucursal y entra con este correo:
          </p>
          <div style={{ marginTop: 14, padding: '10px 14px', background: '#0d1220', border: '1px solid #1e2a45', borderRadius: 8, fontSize: 13, fontWeight: 600, wordBreak: 'break-all' }}>
            {form.email.trim().toLowerCase()}
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div style={S.page}>
      <Barra />
      <form style={S.container} onSubmit={enviar}>
        <div style={{ textAlign: 'center', padding: '20px 0 4px' }}>
          <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 6 }}>Regístrate</div>
          <p style={S.muted}>
            Te vas a dar de alta en <strong style={{ color: '#f1f5f9' }}>{info.empresa}</strong>
            {info.sucursales?.length > 0 && <> · {info.sucursales.join(', ')}</>}
            <br />Tus datos los revisa tu administrador antes de activarte.
          </p>
        </div>

        <div>
          <label style={S.label}>Nombre completo</label>
          <input style={S.input} value={form.name} onChange={e => upd('name', e.target.value)}
                 placeholder='Como aparece en tu identificación' autoFocus required />
        </div>

        <div>
          <label style={S.label}>Correo electrónico</label>
          <input style={S.input} type='email' inputMode='email' value={form.email}
                 onChange={e => upd('email', e.target.value)} placeholder='tu@email.com' required />
          <div style={{ ...S.muted, marginTop: 6, fontSize: 11 }}>Con este correo vas a registrar tu entrada y salida.</div>
        </div>

        <div>
          <label style={S.label}>Teléfono</label>
          <input style={S.input} type='tel' inputMode='tel' value={form.phone}
                 onChange={e => upd('phone', e.target.value)} placeholder='10 dígitos' />
        </div>

        <div>
          <label style={S.label}>Fecha de nacimiento</label>
          <input style={S.input} type='date' value={form.birth_date}
                 onChange={e => upd('birth_date', e.target.value)} />
        </div>

        {err && <div style={S.err}>{err}</div>}

        <button type='submit' style={S.btn(enviando)} disabled={enviando}>
          {enviando ? 'Enviando...' : 'Enviar registro'}
        </button>

        <p style={{ ...S.muted, textAlign: 'center', fontSize: 11 }}>
          Al registrarte aceptas el <a href='/privacidad' target='_blank' rel='noopener noreferrer' style={{ color: '#3b82f6' }}>aviso de privacidad</a>.
        </p>
      </form>
    </div>
  )
}
