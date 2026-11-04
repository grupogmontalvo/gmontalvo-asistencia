'use client'
import { useCallback, useEffect, useState } from 'react'

const money = n => '$' + Math.round(n || 0).toLocaleString('es-MX')
const pct = (a, b) => (b > 0 ? Math.round(((a - b) / b) * 100) : null)

function Delta({ actual, base, label }) {
  const p = pct(actual, base)
  return (
    <div style={{ background: '#111827', borderRadius: 12, padding: '12px 14px', flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.5px' }}>{label}</div>
      <div style={{ fontSize: 17, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>{money(base)}</div>
      {p !== null && (
        <div style={{ fontSize: 11, marginTop: 2, color: p >= 0 ? '#10b981' : '#ef4444' }}>
          {p >= 0 ? '▲' : '▼'} {Math.abs(p)}% hoy
        </div>
      )}
    </div>
  )
}

export default function VentasView({ token }) {
  const [d, setD] = useState(null)
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const r = await fetch(`/api/widget/ventas?t=${encodeURIComponent(token)}`, { cache: 'no-store' })
      const j = await r.json()
      if (!r.ok) throw new Error(j.error || 'Error')
      setD(j); setErr('')
    } catch (e) {
      setErr(e.message === 'Failed to fetch' ? 'Sin conexión' : e.message)
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    load()
    const id = setInterval(load, 5 * 60 * 1000)
    const onVis = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVis)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVis) }
  }, [load])

  const fecha = d ? new Date(d.fecha + 'T12:00:00').toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }) : ''
  const max = Math.max(1, ...(d?.por_sucursal || []).map(s => s.hoy))

  return (
    <main style={{ minHeight: '100dvh', background: '#0a0e1a', color: '#f1f5f9', fontFamily: "'DM Sans', system-ui, sans-serif", padding: 'max(env(safe-area-inset-top), 20px) 16px 32px', boxSizing: 'border-box' }}>
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 12, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.6px', fontWeight: 600 }}>Ventas hoy</div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{fecha.charAt(0).toUpperCase() + fecha.slice(1)}</div>
          </div>
          <button onClick={load} disabled={loading} aria-label='Actualizar'
            style={{ background: '#111827', border: '1px solid #1f2937', color: '#94a3b8', borderRadius: 999, width: 38, height: 38, fontSize: 18, cursor: 'pointer' }}>
            <span style={{ display: 'inline-block', animation: loading ? 'spin 1s linear infinite' : 'none' }}>↻</span>
          </button>
        </div>

        {err && <div style={{ marginTop: 16, padding: 12, borderRadius: 10, background: 'rgba(239,68,68,.12)', color: '#fca5a5', fontSize: 13 }}>{err}</div>}

        {d && <>
          <div style={{ fontSize: 'clamp(40px, 14vw, 64px)', fontWeight: 700, color: '#10b981', fontFamily: "'JetBrains Mono', monospace", margin: '18px 0 2px', letterSpacing: '-1px' }}>{money(d.hoy)}</div>
          <div style={{ fontSize: 12, color: '#64748b' }}>{d.ventas_hoy} cierre{d.ventas_hoy === 1 ? '' : 's'} con venta registrado{d.ventas_hoy === 1 ? '' : 's'}</div>

          <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
            <Delta label='Ayer' actual={d.hoy} base={d.ayer} />
            <Delta label='Mismo día sem. pasada' actual={d.hoy} base={d.mismo_dia_semana_pasada} />
          </div>
          <div style={{ background: '#111827', borderRadius: 12, padding: '12px 14px', marginTop: 10 }}>
            <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.5px' }}>Semana (lun–hoy)</div>
            <div style={{ fontSize: 17, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>{money(d.semana)}</div>
          </div>

          <div style={{ marginTop: 22, fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.5px', fontWeight: 600 }}>Por sucursal</div>
          {d.por_sucursal.length === 0 && <div style={{ fontSize: 13, color: '#64748b', marginTop: 8 }}>Aún no hay ventas registradas hoy.</div>}
          {d.por_sucursal.map(s => (
            <div key={s.nombre} style={{ marginTop: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, gap: 10 }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.nombre}</span>
                <span style={{ fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>{money(s.hoy)}</span>
              </div>
              <div style={{ height: 6, background: '#1f2937', borderRadius: 3, marginTop: 4 }}>
                <div style={{ height: '100%', width: `${(s.hoy / max) * 100}%`, background: '#10b981', borderRadius: 3 }} />
              </div>
            </div>
          ))}
          <div style={{ fontSize: 11, color: '#475569', marginTop: 24, textAlign: 'center' }}>
            Actualizado {new Date(d.actualizado).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} · se refresca solo cada 5 min
          </div>
        </>}
        {!d && !err && <div style={{ marginTop: 40, textAlign: 'center', color: '#64748b' }}>Cargando…</div>}
      </div>
      <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
    </main>
  )
}
