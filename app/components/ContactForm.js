'use client'
import { useState } from 'react'

export default function ContactForm() {
  const [form, setForm] = useState({ name: '', company: '', email: '', employees: '', message: '' })
  const [status, setStatus] = useState('idle') // idle | loading | success | error
  const [errMsg, setErrMsg] = useState('')

  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus('loading'); setErrMsg('')
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) { setErrMsg(json.error || 'Error al enviar. Intenta de nuevo.'); setStatus('error'); return }
      setStatus('success')
    } catch {
      setErrMsg('Error de conexión. Intenta de nuevo.'); setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className="contact-form" style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 10, color: '#5DCAA5' }}>¡Mensaje enviado!</div>
        <div style={{ fontSize: 15, color: 'rgba(250,250,248,0.6)', lineHeight: 1.6 }}>
          Te contactaremos en menos de 24 horas al correo <strong style={{ color: '#FAFAF8' }}>{form.email}</strong>.
        </div>
      </div>
    )
  }

  return (
    <form className="contact-form" onSubmit={handleSubmit}>
      <div className="form-title">Solicitar demo</div>
      <div className="form-subtitle">Sin compromisos. Te contactamos nosotros.</div>

      {status === 'error' && (
        <div style={{ background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#ef4444', marginBottom: 16 }}>
          {errMsg}
        </div>
      )}

      <div className="form-grid">
        <div className="form-group">
          <label className="form-label">Nombre</label>
          <input className="form-input" type="text" placeholder="Tu nombre" value={form.name} onChange={e => upd('name', e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">Empresa</label>
          <input className="form-input" type="text" placeholder="Nombre del negocio" value={form.company} onChange={e => upd('company', e.target.value)} />
        </div>
      </div>
      <div className="form-group">
        <label className="form-label">Correo electrónico</label>
        <input className="form-input" type="email" placeholder="tu@empresa.com" value={form.email} onChange={e => upd('email', e.target.value)} required />
      </div>
      <div className="form-group">
        <label className="form-label">¿Cuántos empleados tienes?</label>
        <input className="form-input" type="text" placeholder="Ej. 15 empleados en 3 sucursales" value={form.employees} onChange={e => upd('employees', e.target.value)} />
      </div>
      <div className="form-group">
        <label className="form-label">Mensaje (opcional)</label>
        <textarea className="form-input" placeholder="Cuéntanos sobre tu operación..." value={form.message} onChange={e => upd('message', e.target.value)} />
      </div>
      <button type="submit" className="btn-submit" disabled={status === 'loading'} style={{ opacity: status === 'loading' ? 0.7 : 1 }}>
        {status === 'loading' ? 'Enviando...' : 'Enviar solicitud →'}
      </button>
    </form>
  )
}
