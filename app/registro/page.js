'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabase'

export default function RegistroPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', company: '', email: '', password: '' })
  const [status, setStatus] = useState('idle')
  const [err, setErr] = useState('')
  const upd = (k, v) => setForm(p => ({ ...p, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault()
    setStatus('loading'); setErr('')
    try {
      const res = await fetch('/api/registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) { setErr(json.error || 'Error al crear cuenta.'); setStatus('error'); return }

      // Sign in automatically
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: form.email.trim().toLowerCase(),
        password: form.password.trim(),
      })
      if (signInErr) { router.push('/admin/login'); return }
      router.push('/admin')
    } catch {
      setErr('Error de conexión. Intenta de nuevo.'); setStatus('error')
    }
  }

  const inp = {
    width: '100%', background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)',
    color: '#f1f5f9', fontFamily: 'inherit', fontSize: 15, padding: '13px 16px',
    borderRadius: 10, outline: 'none', boxSizing: 'border-box',
    transition: 'border-color .2s',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0e1a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&display=swap');
        input:focus { border-color: #10b981 !important; }
        a { color: #10b981; text-decoration: none; }
        a:hover { text-decoration: underline; }
      `}</style>

      {/* Logo */}
      <a href='/' style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 36, textDecoration: 'none' }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 18, color: '#fff', fontFamily: 'inherit' }}>W</div>
        <span style={{ fontSize: 18, fontWeight: 700, color: '#f1f5f9' }}>worktic</span>
      </a>

      <div style={{ width: '100%', maxWidth: 420, background: '#1a2035', border: '1px solid #1e2a45', borderRadius: 16, padding: '32px 28px' }}>
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', marginBottom: 6 }}>Crea tu cuenta gratis</h1>
          <p style={{ fontSize: 13, color: '#8892a8' }}>Sin tarjeta. Sin contratos. Beta gratuito.</p>
        </div>

        {err && (
          <div style={{ background: 'rgba(239,68,68,.12)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#ef4444', marginBottom: 18 }}>
            {err}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[
            ['Tu nombre', 'name', 'text', 'Juan Montalvo'],
            ['Nombre de tu empresa', 'company', 'text', 'Ej: Grupo Montalvo'],
            ['Correo electrónico', 'email', 'email', 'tu@empresa.com'],
            ['Contraseña', 'password', 'password', 'Mínimo 6 caracteres'],
          ].map(([label, key, type, placeholder]) => (
            <div key={key}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#8892a8', textTransform: 'uppercase', letterSpacing: '.5px', display: 'block', marginBottom: 6 }}>{label}</label>
              <input
                type={type} value={form[key]} onChange={e => upd(key, e.target.value)}
                placeholder={placeholder} required style={inp}
                minLength={key === 'password' ? 6 : undefined}
              />
            </div>
          ))}

          <button type='submit' disabled={status === 'loading'}
            style={{ marginTop: 8, width: '100%', padding: '14px', borderRadius: 10, border: 'none', background: status === 'loading' ? '#2d4a3e' : '#10b981', color: '#fff', fontSize: 15, fontWeight: 700, cursor: status === 'loading' ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'background .2s' }}>
            {status === 'loading' ? 'Creando cuenta...' : 'Crear cuenta gratis →'}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: '#8892a8' }}>
          ¿Ya tienes cuenta? <a href='/admin/login'>Inicia sesión</a>
        </div>
      </div>

      <div style={{ marginTop: 20, fontSize: 11, color: '#4a5568', textAlign: 'center' }}>
        Al registrarte aceptas que esto es una beta gratuita. <a href='/'>Volver al inicio</a>
      </div>
    </div>
  )
}
