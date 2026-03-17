'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'

const DAYS = ['Dom','Lun','Mar','Mie','Jue','Vie','Sab']
const stLbl = { on_time: 'Puntual', tolerancia: 'Tolerancia', late: 'Retardo', absent: 'Falta' }
const stClr = { on_time: '#10b981', tolerancia: '#06b6d4', late: '#f59e0b', absent: '#ef4444' }

export default function AdminPage() {
  const [sites, setSites] = useState([])
  const [emps, setEmps] = useState([])
  const [att, setAtt] = useState([])
  const [tab, setTab] = useState('dashboard')
  const [modal, setModal] = useState(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)

  const [schedules, setSchedules] = useState([])

  const today = new Date().toISOString().split('T')[0]

  const load = useCallback(async () => {
    const [s, e, a, sc] = await Promise.all([
      supabase.from('sites').select('*').eq('active', true).order('name'),
      supabase.from('employees').select('*').eq('active', true).order('name'),
      supabase.from('attendance').select('*').order('date', { ascending: false }).limit(200),
      supabase.from('schedules').select('*'),
    ])
    setSites(s.data || [])
    setEmps(e.data || [])
    setAtt(a.data || [])
    setSchedules(sc.data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 2500); return () => clearTimeout(t) } }, [toast])

  const todayRecs = att.filter(r => r.date === today)
  const onTime = todayRecs.filter(r => r.status === 'on_time').length
  const tol = todayRecs.filter(r => r.status === 'tolerancia').length
  const late = todayRecs.filter(r => r.status === 'late').length
  const absent = todayRecs.filter(r => r.status === 'absent').length

  async function saveSite(data) {
    if (data.id) {
      await supabase.from('sites').update(data).eq('id', data.id)
    } else {
      delete data.id
      await supabase.from('sites').insert(data)
    }
    setToast('Sitio guardado')
    setModal(null)
    load()
  }

  async function saveEmp(data) {
    if (data.id) {
      await supabase.from('employees').update(data).eq('id', data.id)
    } else {
      delete data.id
      await supabase.from('employees').insert(data)
    }
    setToast('Empleado guardado')
    setModal(null)
    load()
  }

  async function delEmp(id) {
    await supabase.from('employees').update({ active: false }).eq('id', id)
    setToast('Empleado eliminado')
    setModal(null)
    load()
  }

  async function delSite(id) {
    await supabase.from('sites').update({ active: false }).eq('id', id)
    setToast('Sitio eliminado')
    setModal(null)
    load()
  }

  function getSiteUrl(code) {
    if (typeof window === 'undefined') return ''
    return `${window.location.origin}/checkin/${code}`
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0e1a', color: '#8892a8', fontFamily: "'DM Sans'" }}>Cargando...</div>

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: "'DM Sans', sans-serif", background: '#0a0e1a', color: '#f1f5f9' }}>
      {/* Sidebar */}
      <div style={{ width: 210, background: '#111827', borderRight: '1px solid #1e2a45', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: 16, borderBottom: '1px solid #1e2a45', display: 'flex', alignItems: 'center', gap: 10 }}>
          <img src="/logo.jpeg" style={{ width: 32, height: 32, borderRadius: 8 }} alt="GM" />
          <div><div style={{ fontSize: 13, fontWeight: 700 }}>G.Montalvo</div><div style={{ fontSize: 9, color: '#8892a8' }}>Control de Asistencia</div></div>
        </div>
        <nav style={{ flex: 1, padding: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: '#4a5568', padding: '8px 8px 4px' }}>Principal</div>
          {[{ id: 'dashboard', lb: 'Dashboard' }, { id: 'attendance', lb: 'Asistencia' }].map(n => (
            <button key={n.id} onClick={() => setTab(n.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500, color: tab === n.id ? '#3b82f6' : '#8892a8', background: tab === n.id ? 'rgba(59,130,246,.12)' : 'transparent', border: 'none', width: '100%', textAlign: 'left', fontFamily: 'inherit' }}>{n.lb}</button>
          ))}
          <div style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: '#4a5568', padding: '12px 8px 4px' }}>Gestion</div>
          {[{ id: 'employees', lb: 'Empleados' }, { id: 'sites', lb: 'Sitios' }].map(n => (
            <button key={n.id} onClick={() => setTab(n.id)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500, color: tab === n.id ? '#3b82f6' : '#8892a8', background: tab === n.id ? 'rgba(59,130,246,.12)' : 'transparent', border: 'none', width: '100%', textAlign: 'left', fontFamily: 'inherit' }}>{n.lb}</button>
          ))}
        </nav>
      </div>

      {/* Main */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 22px', borderBottom: '1px solid #1e2a45', background: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: 17, fontWeight: 700 }}>{{ dashboard: 'Dashboard', attendance: 'Asistencia', employees: 'Empleados', sites: 'Sitios' }[tab]}</h1>
            <p style={{ fontSize: 11, color: '#8892a8', marginTop: 1 }}>{new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
          {tab === 'employees' && <button onClick={() => setModal({ type: 'emp', data: null })} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 7, border: 'none', background: '#3b82f6', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>+ Nuevo Empleado</button>}
          {tab === 'sites' && <button onClick={() => setModal({ type: 'site', data: null })} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 7, border: 'none', background: '#3b82f6', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>+ Nuevo Sitio</button>}
        </div>

        <div style={{ flex: 1, padding: '18px 22px', overflow: 'auto' }}>
          {/* Dashboard */}
          {tab === 'dashboard' && <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 18 }}>
              {[['Puntuales', onTime, '#10b981'], ['Tolerancia', tol, '#06b6d4'], ['Retardos', late, '#f59e0b'], ['Faltas', absent, '#ef4444'], ['Registrados', todayRecs.length, '#3b82f6']].map(([l, v, c]) => (
                <div key={l} style={{ background: '#1a2035', border: '1px solid #1e2a45', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 10, color: '#8892a8', marginBottom: 4 }}>{l}</div>
                  <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "'JetBrains Mono'", color: c }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ background: '#1a2035', border: '1px solid #1e2a45', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e2a45', fontWeight: 600, fontSize: 12 }}>Registros de Hoy</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>{['Empleado', 'Sitio', 'Entrada', 'Salida', 'Horas', 'Estado'].map(h => <th key={h} style={{ textAlign: 'left', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.6px', color: '#4a5568', padding: '9px 16px', borderBottom: '1px solid #1e2a45' }}>{h}</th>)}</tr></thead>
                <tbody>{todayRecs.map(r => {
                  const emp = emps.find(e => e.id === r.employee_id)
                  const site = sites.find(s => s.id === r.site_id)
                  return <tr key={r.id} style={{ borderBottom: '1px solid rgba(30,42,69,.3)' }}>
                    <td style={{ padding: '9px 16px', fontSize: 12, fontWeight: 600 }}>{emp?.name || '?'}</td>
                    <td style={{ padding: '9px 16px', fontSize: 11, color: '#8892a8' }}>{site?.name || '?'}</td>
                    <td style={{ padding: '9px 16px', fontSize: 11, fontFamily: "'JetBrains Mono'" }}>{r.check_in ? new Date(r.check_in).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false }) : '-'}</td>
                    <td style={{ padding: '9px 16px', fontSize: 11, fontFamily: "'JetBrains Mono'" }}>{r.check_out ? new Date(r.check_out).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false }) : '-'}</td>
                    <td style={{ padding: '9px 16px', fontSize: 11, fontFamily: "'JetBrains Mono'" }}>{r.hours_worked > 0 ? r.hours_worked + 'h' : '-'}</td>
                    <td style={{ padding: '9px 16px' }}><span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, color: stClr[r.status] || '#8892a8', background: (stClr[r.status] || '#8892a8') + '1f' }}>{stLbl[r.status] || r.status}</span></td>
                  </tr>
                })}</tbody>
              </table>
              {todayRecs.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: '#4a5568', fontSize: 12 }}>Aun no hay registros hoy</div>}
            </div>
          </>}

          {/* Attendance History */}
          {tab === 'attendance' && <div style={{ background: '#1a2035', border: '1px solid #1e2a45', borderRadius: 10, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #1e2a45', fontWeight: 600, fontSize: 12 }}>Historial ({att.length} registros)</div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>{['Fecha', 'Empleado', 'Sitio', 'Entrada', 'Salida', 'Horas', 'Estado'].map(h => <th key={h} style={{ textAlign: 'left', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.6px', color: '#4a5568', padding: '9px 16px', borderBottom: '1px solid #1e2a45' }}>{h}</th>)}</tr></thead>
              <tbody>{att.slice(0, 100).map(r => {
                const emp = emps.find(e => e.id === r.employee_id)
                const site = sites.find(s => s.id === r.site_id)
                return <tr key={r.id} style={{ borderBottom: '1px solid rgba(30,42,69,.3)' }}>
                  <td className="mono" style={{ padding: '9px 16px', fontSize: 11 }}>{r.date}</td>
                  <td style={{ padding: '9px 16px', fontSize: 12, fontWeight: 600 }}>{emp?.name || '?'}</td>
                  <td style={{ padding: '9px 16px', fontSize: 11, color: '#8892a8' }}>{site?.name || '?'}</td>
                  <td className="mono" style={{ padding: '9px 16px', fontSize: 11 }}>{r.check_in ? new Date(r.check_in).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false }) : '-'}</td>
                  <td className="mono" style={{ padding: '9px 16px', fontSize: 11 }}>{r.check_out ? new Date(r.check_out).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false }) : '-'}</td>
                  <td className="mono" style={{ padding: '9px 16px', fontSize: 11 }}>{r.hours_worked > 0 ? r.hours_worked + 'h' : '-'}</td>
                  <td style={{ padding: '9px 16px' }}><span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, color: stClr[r.status] || '#8892a8', background: (stClr[r.status] || '#8892a8') + '1f' }}>{stLbl[r.status] || r.status}</span></td>
                </tr>
              })}</tbody>
            </table>
          </div>}

          {/* Employees */}
          {tab === 'employees' && <div style={{ background: '#1a2035', border: '1px solid #1e2a45', borderRadius: 10, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>{['Empleado', 'Email', 'Rol', 'Horario', ''].map(h => <th key={h} style={{ textAlign: 'left', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.6px', color: '#4a5568', padding: '9px 16px', borderBottom: '1px solid #1e2a45' }}>{h}</th>)}</tr></thead>
              <tbody>{emps.map(emp => {
                const empScheds = schedules.filter(s => s.employee_id === emp.id)
                const daysOn = empScheds.length
                const schedSummary = daysOn > 0 
                  ? empScheds.sort((a,b) => a.day_of_week - b.day_of_week).map(s => ['Dom','Lun','Mar','Mie','Jue','Vie','Sab'][s.day_of_week]).join(', ')
                  : null
                return (
                <tr key={emp.id} style={{ borderBottom: '1px solid rgba(30,42,69,.3)' }}>
                  <td style={{ padding: '9px 16px' }}>
                    <div style={{ fontSize: 12, fontWeight: 600 }}>{emp.name}</div>
                    <div style={{ fontSize: 10, color: '#4a5568' }}>{emp.phone || ''}</div>
                  </td>
                  <td style={{ padding: '9px 16px', fontSize: 11, color: '#8892a8' }}>{emp.email}</td>
                  <td style={{ padding: '9px 16px' }}>
                    <span style={{ fontSize: 11, color: '#8892a8' }}>{emp.role}</span>
                    {emp.free_roam && <span style={{ marginLeft: 6, color: '#10b981', fontSize: 9, fontWeight: 600, background: 'rgba(16,185,129,.12)', padding: '1px 6px', borderRadius: 3 }}>Libre</span>}
                  </td>
                  <td style={{ padding: '9px 16px' }}>
                    {daysOn > 0 ? (
                      <div>
                        <div style={{ fontSize: 10, color: '#3b82f6', fontWeight: 600 }}>{daysOn} dias/semana</div>
                        <div style={{ fontSize: 9, color: '#4a5568' }}>{schedSummary}</div>
                      </div>
                    ) : (
                      <span style={{ fontSize: 10, color: '#f59e0b' }}>Sin horario</span>
                    )}
                  </td>
                  <td style={{ padding: '9px 16px' }}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => setModal({ type: 'schedule', data: emp })} style={{ padding: '4px 10px', borderRadius: 5, border: '1px solid rgba(59,130,246,.25)', background: 'rgba(59,130,246,.12)', color: '#3b82f6', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Horarios</button>
                      <button onClick={() => setModal({ type: 'emp', data: emp })} style={{ background: 'none', border: 'none', color: '#8892a8', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>Editar</button>
                      <button onClick={() => { if (confirm('Eliminar ' + emp.name + '?')) delEmp(emp.id) }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              )})}</tbody>
            </table>
            {emps.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: '#4a5568', fontSize: 12 }}>No hay empleados. Agrega el primero.</div>}
          </div>}

          {/* Sites */}
          {tab === 'sites' && <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sites.map(site => (
              <div key={site.id} style={{ background: '#1a2035', border: '1px solid #1e2a45', borderRadius: 10, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{site.name}</div>
                  <div style={{ fontSize: 11, color: '#8892a8' }}>{site.address}</div>
                  <div style={{ fontSize: 9, color: '#4a5568', marginTop: 4 }}>Tolerancia: {site.grace_mins}min | Radio GPS: {site.radius_m}m</div>
                  <div style={{ fontSize: 10, color: '#3b82f6', marginTop: 4, wordBreak: 'break-all' }}>QR: {getSiteUrl(site.code)}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 11, color: '#3b82f6', background: 'rgba(59,130,246,.12)', padding: '3px 8px', borderRadius: 4, fontWeight: 600 }}>{site.code}</span>
                  <button onClick={() => { navigator.clipboard.writeText(getSiteUrl(site.code)); setToast('URL copiada') }} style={{ padding: '5px 10px', borderRadius: 5, border: '1px solid #1e2a45', background: 'transparent', color: '#8892a8', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit' }}>Copiar URL</button>
                  <button onClick={() => setModal({ type: 'qr', data: site })} style={{ padding: '5px 10px', borderRadius: 5, border: '1px solid rgba(59,130,246,.25)', background: 'rgba(59,130,246,.12)', color: '#3b82f6', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Ver QR</button>
                  <button onClick={() => setModal({ type: 'site', data: site })} style={{ background: 'none', border: 'none', color: '#8892a8', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>Editar</button>
                  <button onClick={() => { if (confirm('Eliminar ' + site.name + '?')) delSite(site.id) }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>Eliminar</button>
                </div>
              </div>
            ))}
            {sites.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: '#4a5568', fontSize: 12, background: '#1a2035', borderRadius: 10, border: '1px solid #1e2a45' }}>No hay sitios. Agrega el primero.</div>}
          </div>}
        </div>
      </div>

      {/* Modals */}
      {modal?.type === 'emp' && <EmpModal data={modal.data} sites={sites} onSave={saveEmp} onClose={() => setModal(null)} />}
      {modal?.type === 'site' && <SiteModal data={modal.data} onSave={saveSite} onClose={() => setModal(null)} />}
      {modal?.type === 'qr' && <QrModal site={modal.data} url={getSiteUrl(modal.data.code)} onClose={() => setModal(null)} />}
      {modal?.type === 'schedule' && <ScheduleModal emp={modal.data} sites={sites} schedules={schedules.filter(s => s.employee_id === modal.data.id)} onSave={async () => { await load(); setToast('Horarios guardados'); setModal(null) }} onClose={() => setModal(null)} />}

      {/* Toast */}
      {toast && <div style={{ position: 'fixed', bottom: 20, right: 20, background: '#1a2035', border: '1px solid rgba(16,185,129,.25)', borderRadius: 8, padding: '10px 16px', fontSize: 12, fontWeight: 500, zIndex: 200, color: '#10b981' }}>{toast}</div>}
    </div>
  )
}

function EmpModal({ data, sites, onSave, onClose }) {
  const [f, setF] = useState(data || { name: '', email: '', phone: '', role: 'Vendedor(a)', free_roam: false })
  const upd = (k, v) => setF(p => ({ ...p, [k]: v }))
  const valid = f.name?.trim() && f.email?.trim()
  return (
    <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#1a2035', border: '1px solid #1e2a45', borderRadius: 12, padding: 22, width: '100%', maxWidth: 440, maxHeight: '85vh', overflow: 'auto' }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>{data ? 'Editar Empleado' : 'Nuevo Empleado'}</h3>
        {[['Nombre', 'name', 'text'], ['Email', 'email', 'email'], ['Telefono', 'phone', 'tel']].map(([l, k, t]) => (
          <div key={k} style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 10, fontWeight: 600, color: '#8892a8', display: 'block', marginBottom: 4 }}>{l}</label>
            <input type={t} value={f[k] || ''} onChange={e => upd(k, e.target.value)} style={{ width: '100%', background: '#0d1220', border: '1px solid #1e2a45', color: '#f1f5f9', fontSize: 12, padding: '8px 10px', borderRadius: 6, outline: 'none', fontFamily: 'inherit' }} />
          </div>
        ))}
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 10, fontWeight: 600, color: '#8892a8', display: 'block', marginBottom: 4 }}>Rol</label>
          <select value={f.role || 'Vendedor(a)'} onChange={e => upd('role', e.target.value)} style={{ width: '100%', background: '#0d1220', border: '1px solid #1e2a45', color: '#f1f5f9', fontSize: 12, padding: '8px 10px', borderRadius: 6, fontFamily: 'inherit' }}>
            <option>Vendedor(a)</option><option>Encargado(a)</option><option>Gerente Regional</option><option>Supervisor(a)</option>
          </select>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer', marginBottom: 14 }}>
          <input type="checkbox" checked={!!f.free_roam} onChange={e => upd('free_roam', e.target.checked)} /> Acceso libre a cualquier sucursal
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          <button disabled={!valid} onClick={() => onSave(f)} style={{ flex: 1, padding: '10px 16px', borderRadius: 7, border: 'none', background: valid ? '#3b82f6' : '#1e2a45', color: '#fff', fontSize: 12, fontWeight: 600, cursor: valid ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>Guardar</button>
          <button onClick={onClose} style={{ padding: '10px 16px', borderRadius: 7, border: '1px solid #1e2a45', background: 'transparent', color: '#8892a8', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}

function SiteModal({ data, onSave, onClose }) {
  const [f, setF] = useState(data || { name: '', code: '', address: '', grace_mins: 5, absent_mins: 15, lat: 0, lng: 0, radius_m: 150 })
  const upd = (k, v) => setF(p => ({ ...p, [k]: v }))
  const valid = f.name?.trim() && f.code?.trim()
  return (
    <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#1a2035', border: '1px solid #1e2a45', borderRadius: 12, padding: 22, width: '100%', maxWidth: 440, maxHeight: '85vh', overflow: 'auto' }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>{data ? 'Editar Sitio' : 'Nuevo Sitio'}</h3>
        {[['Nombre', 'name'], ['Codigo QR', 'code'], ['Direccion', 'address']].map(([l, k]) => (
          <div key={k} style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 10, fontWeight: 600, color: '#8892a8', display: 'block', marginBottom: 4 }}>{l}</label>
            <input value={f[k] || ''} onChange={e => upd(k, k === 'code' ? e.target.value.toUpperCase() : e.target.value)} style={{ width: '100%', background: '#0d1220', border: '1px solid #1e2a45', color: '#f1f5f9', fontSize: 12, padding: '8px 10px', borderRadius: 6, outline: 'none', fontFamily: k === 'code' ? "'JetBrains Mono'" : 'inherit' }} />
          </div>
        ))}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
          {[['Latitud', 'lat'], ['Longitud', 'lng'], ['Radio (m)', 'radius_m']].map(([l, k]) => (
            <div key={k}><label style={{ fontSize: 10, fontWeight: 600, color: '#8892a8', display: 'block', marginBottom: 4 }}>{l}</label>
              <input type="number" step="any" value={f[k] || 0} onChange={e => upd(k, parseFloat(e.target.value) || 0)} style={{ width: '100%', background: '#0d1220', border: '1px solid #1e2a45', color: '#f1f5f9', fontSize: 12, padding: '8px 10px', borderRadius: 6, outline: 'none', fontFamily: 'inherit' }} />
            </div>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8, marginBottom: 14 }}>
          <div><label style={{ fontSize: 10, fontWeight: 600, color: '#8892a8', display: 'block', marginBottom: 4 }}>Tolerancia (minutos despues de la hora de entrada)</label>
            <input type="number" value={f.grace_mins || 0} onChange={e => upd('grace_mins', parseInt(e.target.value) || 0)} style={{ width: '100%', background: '#0d1220', border: '1px solid #1e2a45', color: '#f1f5f9', fontSize: 12, padding: '8px 10px', borderRadius: 6, outline: 'none', fontFamily: 'inherit' }} />
            <div style={{ fontSize: 9, color: '#4a5568', marginTop: 4 }}>Ej: Si la entrada es 10:00 y tolerancia 15min, llegar hasta 10:15 = Tolerancia, 10:16+ = Retardo</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button disabled={!valid} onClick={() => onSave(f)} style={{ flex: 1, padding: '10px 16px', borderRadius: 7, border: 'none', background: valid ? '#3b82f6' : '#1e2a45', color: '#fff', fontSize: 12, fontWeight: 600, cursor: valid ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>Guardar</button>
          <button onClick={onClose} style={{ padding: '10px 16px', borderRadius: 7, border: '1px solid #1e2a45', background: 'transparent', color: '#8892a8', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}

function QrModal({ site, url, onClose }) {
  const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`
  
  function printQR() {
    const w = window.open('', '_blank')
    w.document.write(`
      <html><head><title>QR - ${site.name}</title>
      <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 40px; }
        img { width: 300px; height: 300px; margin: 20px 0; }
        h1 { font-size: 24px; margin-bottom: 4px; }
        .code { font-family: monospace; font-size: 20px; letter-spacing: 3px; font-weight: bold; margin: 10px 0; }
        .addr { color: #666; font-size: 14px; }
        .url { color: #999; font-size: 10px; margin-top: 10px; word-break: break-all; }
        .logo { width: 60px; margin-bottom: 10px; }
        @media print { button { display: none; } }
      </style></head><body>
        <img class="logo" src="/logo.jpeg" alt="GM" />
        <h1>${site.name}</h1>
        <div class="addr">${site.address || ''}</div>
        <img src="${qrImgUrl}" alt="QR Code" />
        <div class="code">${site.code}</div>
        <div>Escanea para registrar asistencia</div>
        <div class="url">${url}</div>
        <br><button onclick="window.print()" style="padding:10px 30px;font-size:16px;cursor:pointer">Imprimir</button>
      </body></html>
    `)
    w.document.close()
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(4px)' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#1a2035', border: '1px solid #1e2a45', borderRadius: 14, padding: 24, width: '100%', maxWidth: 380, textAlign: 'center' }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{site.name}</h3>
        <p style={{ fontSize: 12, color: '#8892a8', marginBottom: 16 }}>{site.address}</p>
        
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, display: 'inline-block', marginBottom: 16 }}>
          <img src={qrImgUrl} alt="QR Code" style={{ width: 220, height: 220, display: 'block' }} />
        </div>
        
        <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 700, letterSpacing: 3, marginBottom: 4 }}>{site.code}</div>
        <div style={{ fontSize: 11, color: '#4a5568', marginBottom: 16, wordBreak: 'break-all' }}>{url}</div>
        
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button onClick={printQR} style={{ padding: '10px 20px', borderRadius: 7, border: 'none', background: '#3b82f6', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Imprimir QR</button>
          <button onClick={() => { navigator.clipboard.writeText(url); }} style={{ padding: '10px 20px', borderRadius: 7, border: '1px solid #1e2a45', background: 'transparent', color: '#8892a8', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Copiar URL</button>
          <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: 7, border: '1px solid #1e2a45', background: 'transparent', color: '#8892a8', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Cerrar</button>
        </div>
      </div>
    </div>
  )
}

function ScheduleModal({ emp, sites, schedules, onSave, onClose }) {
  const DAYS = [
    { num: 1, name: 'Lunes' },
    { num: 2, name: 'Martes' },
    { num: 3, name: 'Miercoles' },
    { num: 4, name: 'Jueves' },
    { num: 5, name: 'Viernes' },
    { num: 6, name: 'Sabado' },
    { num: 0, name: 'Domingo' },
  ]

  // Build initial state from existing schedules
  const buildInitial = () => {
    const w = {}
    DAYS.forEach(d => {
      const existing = schedules.find(s => s.day_of_week === d.num)
      if (existing) {
        w[d.num] = { on: true, site_id: existing.site_id, start_time: existing.start_time?.slice(0, 5) || '10:00', end_time: existing.end_time?.slice(0, 5) || '19:00', lunch_mins: existing.lunch_mins || 60 }
      } else {
        w[d.num] = { on: false, site_id: sites[0]?.id || '', start_time: '10:00', end_time: '19:00', lunch_mins: 60 }
      }
    })
    return w
  }

  const [week, setWeek] = useState(buildInitial)
  const [saving, setSaving] = useState(false)

  const toggle = (dayNum) => {
    setWeek(prev => ({
      ...prev,
      [dayNum]: { ...prev[dayNum], on: !prev[dayNum].on }
    }))
  }

  const upd = (dayNum, key, val) => {
    setWeek(prev => ({
      ...prev,
      [dayNum]: { ...prev[dayNum], [key]: val }
    }))
  }

  const copyToAll = (srcDay) => {
    const src = week[srcDay]
    if (!src?.on) return
    setWeek(prev => {
      const nw = { ...prev }
      DAYS.forEach(d => {
        if (nw[d.num]?.on && d.num !== srcDay) {
          nw[d.num] = { ...nw[d.num], site_id: src.site_id, start_time: src.start_time, end_time: src.end_time, lunch_mins: src.lunch_mins }
        }
      })
      return nw
    })
  }

  const save = async () => {
    setSaving(true)
    // Delete all existing schedules for this employee
    await supabase.from('schedules').delete().eq('employee_id', emp.id)

    // Insert active days
    const inserts = []
    DAYS.forEach(d => {
      const day = week[d.num]
      if (day?.on && day.site_id) {
        inserts.push({
          employee_id: emp.id,
          day_of_week: d.num,
          site_id: day.site_id,
          start_time: day.start_time || '10:00',
          end_time: day.end_time || '19:00',
          lunch_mins: day.lunch_mins ?? 60,
        })
      }
    })

    if (inserts.length > 0) {
      await supabase.from('schedules').insert(inserts)
    }

    setSaving(false)
    onSave()
  }

  const iS = { width: '100%', background: '#0d1220', border: '1px solid #1e2a45', color: '#f1f5f9', fontSize: 11, padding: '6px 8px', borderRadius: 5, outline: 'none', fontFamily: 'inherit' }
  const iSm = { ...iS, width: 75, textAlign: 'center', fontFamily: "'JetBrains Mono', monospace" }

  return (
    <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(4px)' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#1a2035', border: '1px solid #1e2a45', borderRadius: 12, padding: 22, width: '100%', maxWidth: 600, maxHeight: '90vh', overflow: 'auto' }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Horarios - {emp.name}</h3>
        <p style={{ fontSize: 11, color: '#8892a8', marginBottom: 16 }}>Palomea los dias que trabaja. Cada dia puede tener diferente sucursal y horario.</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {DAYS.map(d => {
            const day = week[d.num]
            const isOn = day?.on
            return (
              <div key={d.num} style={{
                background: isOn ? '#0d1220' : 'transparent',
                border: '1px solid ' + (isOn ? '#1e2a45' : 'rgba(30,42,69,.3)'),
                borderRadius: 8,
                padding: isOn ? '10px 12px' : '8px 12px',
                opacity: isOn ? 1 : 0.5,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {/* Checkbox */}
                  <button onClick={() => toggle(d.num)} style={{
                    width: 22, height: 22, borderRadius: 6, flexShrink: 0, cursor: 'pointer',
                    border: '2px solid ' + (isOn ? '#10b981' : '#4a5568'),
                    background: isOn ? '#10b981' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 12, fontWeight: 700,
                  }}>
                    {isOn ? '✓' : ''}
                  </button>

                  <span style={{ fontSize: 12, fontWeight: 600, width: 70, flexShrink: 0 }}>{d.name}</span>

                  {isOn ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, flexWrap: 'wrap' }}>
                      <select value={day.site_id || ''} onChange={e => upd(d.num, 'site_id', e.target.value)} style={{ ...iS, width: 'auto', flex: '1 1 120px', minWidth: 100, padding: '6px 24px 6px 8px' }}>
                        {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                      <input type="time" value={day.start_time || '10:00'} onChange={e => upd(d.num, 'start_time', e.target.value)} style={iSm} />
                      <span style={{ fontSize: 11, color: '#4a5568' }}>a</span>
                      <input type="time" value={day.end_time || '19:00'} onChange={e => upd(d.num, 'end_time', e.target.value)} style={iSm} />
                      <select value={day.lunch_mins ?? 60} onChange={e => upd(d.num, 'lunch_mins', parseInt(e.target.value))} style={{ ...iS, width: 'auto', padding: '6px 20px 6px 6px' }}>
                        <option value={0}>Sin comida</option>
                        <option value={30}>30m</option>
                        <option value={45}>45m</option>
                        <option value={60}>60m</option>
                        <option value={90}>90m</option>
                      </select>
                      <button onClick={() => copyToAll(d.num)} title="Copiar este horario a todos los dias activos" style={{
                        background: 'none', border: '1px solid #1e2a45', borderRadius: 4,
                        color: '#8892a8', fontSize: 9, padding: '3px 8px', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap'
                      }}>Copiar a todos</button>
                    </div>
                  ) : (
                    <span style={{ fontSize: 11, color: '#4a5568' }}>Descansa</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button disabled={saving} onClick={save} style={{
            flex: 1, padding: '11px 16px', borderRadius: 7, border: 'none',
            background: '#3b82f6', color: '#fff', fontSize: 13, fontWeight: 600,
            cursor: saving ? 'wait' : 'pointer', fontFamily: 'inherit',
          }}>
            {saving ? 'Guardando...' : 'Guardar Horarios'}
          </button>
          <button onClick={onClose} style={{ padding: '11px 16px', borderRadius: 7, border: '1px solid #1e2a45', background: 'transparent', color: '#8892a8', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}
