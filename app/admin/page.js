'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'

const stLbl = { on_time: 'Puntual', tolerancia: 'Tolerancia', late: 'Retardo', absent: 'Falta' }
const stClr = { on_time: '#10b981', tolerancia: '#f59e0b', late: '#ef4444', absent: '#ef4444' }
const stBg  = { on_time: 'rgba(16,185,129,.12)', tolerancia: 'rgba(245,158,11,.12)', late: 'rgba(239,68,68,.12)', absent: 'rgba(239,68,68,.12)' }

const MAX_SALE = 9999999

function fmtTime(ts, tz) {
  if (!ts) return '-'
  return new Date(ts).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz || 'America/Cancun' })
}

function fmtHours(h) {
  if (!h || h <= 0) return '–'
  const totalMins = Math.round(h * 60)
  const hrs = Math.floor(totalMins / 60)
  const mins = totalMins % 60
  if (mins === 0) return `${hrs}h`
  return `${hrs}h ${mins}m`
}

function fmtDate(d) {
  if (!d) return '-'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function getWeekStart(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  return d
}

function dateStr(d) {
  return d.toLocaleDateString('en-CA', { timeZone: 'America/Cancun' })
}

function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

const DAY_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export default function AdminPage() {
  const router = useRouter()
  const [authUser,  setAuthUser]  = useState(null)
  const [adminUser, setAdminUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  const [sites, setSites]     = useState([])
  const [emps, setEmps]       = useState([])
  const [att, setAtt]         = useState([])
  const [schedules, setSchedules] = useState([])
  const [adminUsers, setAdminUsers] = useState([])
  const [goals, setGoals]     = useState([])
  const [tab, setTab]         = useState('dashboard')
  const [modal, setModal]     = useState(null)
  const [sideEmp, setSideEmp] = useState(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast]     = useState(null)

  const [filterEmp,    setFilterEmp]    = useState('')
  const [filterSite,   setFilterSite]   = useState('')
  const [filterFrom,   setFilterFrom]   = useState('')
  const [filterTo,     setFilterTo]     = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const [sidebarOpen, setSidebarOpen] = useState(true)

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Cancun' })

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) { router.push('/admin/login'); return }
      setAuthUser(user)
      const { data: au } = await supabase.from('admin_users').select('*').eq('id', user.id).single()
      setAdminUser(au)
      setAuthLoading(false)
    })
  }, [])

  const isSuperAdmin = adminUser?.role === 'superadmin'

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  const load = useCallback(async () => {
    if (!adminUser) return
    let sitesQuery = supabase.from('sites').select('*').eq('active', true).order('name')

    if (!isSuperAdmin) {
      const { data: perms } = await supabase.from('admin_site_permissions').select('site_id').eq('admin_user_id', adminUser.id)
      const permSiteIds = (perms || []).map(p => p.site_id)
      if (permSiteIds.length === 0) { setSites([]); setEmps([]); setAtt([]); setSchedules([]); setLoading(false); return }
      sitesQuery = sitesQuery.in('id', permSiteIds)
    }

    const [s, e, a, sc, g] = await Promise.all([
      sitesQuery,
      supabase.from('employees').select('*').eq('active', true).order('name'),
      supabase.from('attendance').select('*').order('date', { ascending: false }),
      supabase.from('schedules').select('*'),
      supabase.from('employee_goals').select('*'),
    ])
    setSites(s.data || [])
    setEmps(e.data || [])
    setAtt(a.data || [])
    setSchedules(sc.data || [])
    setGoals(g.data || [])

    if (isSuperAdmin) {
      const { data: au } = await supabase.from('admin_users').select('*, admin_site_permissions(site_id)').order('created_at')
      setAdminUsers(au || [])
    }

    setLoading(false)
  }, [adminUser, isSuperAdmin])

  useEffect(() => { if (adminUser) load() }, [adminUser, load])
  useEffect(() => {
    if (toast) { const t = setTimeout(() => setToast(null), 2500); return () => clearTimeout(t) }
  }, [toast])
  useEffect(() => { if (adminUser) load() }, [tab])

  if (authLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0e1a', color: '#8892a8', fontFamily: "'DM Sans'" }}>Cargando...</div>
  )

  const todaySchedules = schedules.filter(s => s.date === today)
  const todayAtt       = att.filter(r => r.date === today)

  const dashRows = todaySchedules.map(sc => {
    const emp     = emps.find(e => e.id === sc.employee_id)
    const site    = sites.find(s => s.id === sc.site_id)
    const record  = todayAtt.find(r => r.employee_id === sc.employee_id)
    const now     = new Date()
    const tz      = site?.timezone || 'America/Cancun'
    const nowTime = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz })

    let color, bg, statusLabel
    if (record?.check_out) {
      color = '#3b82f6'; bg = 'rgba(59,130,246,.12)'; statusLabel = 'Completó turno'
    } else if (record?.check_in) {
      color = stClr[record.status] || '#10b981'; bg = stBg[record.status] || 'rgba(16,185,129,.12)'; statusLabel = stLbl[record.status] || 'Activo'
    } else {
      const grace = site?.grace_mins || 5; const absent = site?.absent_mins || 15; const start = sc.start_time?.slice(0, 5)
      if (start) {
        const [sh, sm] = start.split(':').map(Number); const [nh, nm] = nowTime.split(':').map(Number)
        const diffMins = (nh * 60 + nm) - (sh * 60 + sm)
        if (diffMins < 0) { color = '#8892a8'; bg = 'rgba(136,146,168,.1)'; statusLabel = 'Esperado' }
        else if (diffMins <= grace) { color = '#f59e0b'; bg = 'rgba(245,158,11,.12)'; statusLabel = 'En tolerancia' }
        else if (diffMins <= absent) { color = '#f59e0b'; bg = 'rgba(245,158,11,.12)'; statusLabel = 'Tolerancia vencida' }
        else { color = '#ef4444'; bg = 'rgba(239,68,68,.12)'; statusLabel = 'No se presentó' }
      } else { color = '#8892a8'; bg = 'rgba(136,146,168,.1)'; statusLabel = 'Esperado' }
    }
    return { sc, emp, site, record, color, bg, statusLabel }
  })

  const scheduledEmpIds = new Set(todaySchedules.map(s => s.employee_id))
  const unscheduledAtt  = todayAtt.filter(r => !scheduledEmpIds.has(r.employee_id))

  const statOnTime  = dashRows.filter(r => r.record && !r.record.check_out && r.record.status === 'on_time').length
  const statTol     = dashRows.filter(r => r.record && !r.record.check_out && (r.record.status === 'tolerancia' || r.record.status === 'late')).length
  const statDone    = dashRows.filter(r => r.record?.check_out).length + unscheduledAtt.filter(r => r.check_out).length
  const statMissing = dashRows.filter(r => !r.record && r.statusLabel === 'No se presentó').length
  const statPending = dashRows.filter(r => !r.record && r.statusLabel !== 'No se presentó').length

  const filteredAtt = att.filter(r => {
    if (filterEmp    && r.employee_id !== filterEmp)   return false
    if (filterSite   && r.site_id !== filterSite)       return false
    if (filterFrom   && r.date < filterFrom)            return false
    if (filterTo     && r.date > filterTo)              return false
    if (filterStatus && r.status !== filterStatus)      return false
    return true
  })

  async function saveSite(data) {
    if (data.id) { await supabase.from('sites').update(data).eq('id', data.id) }
    else { delete data.id; await supabase.from('sites').insert(data) }
    setToast('Sitio guardado'); setModal(null); load()
  }

  async function saveEmp(data, weeklyGoal) {
    let empId = data.id
    if (empId) { await supabase.from('employees').update(data).eq('id', empId) }
    else {
      delete data.id
      const { data: newEmp } = await supabase.from('employees').insert(data).select().single()
      empId = newEmp?.id
    }
    if (empId) {
      if (weeklyGoal && parseFloat(weeklyGoal) > 0) {
        await supabase.from('employee_goals').upsert({ employee_id: empId, weekly_goal: parseFloat(weeklyGoal) }, { onConflict: 'employee_id' })
      } else {
        await supabase.from('employee_goals').delete().eq('employee_id', empId)
      }
    }
    setToast('Empleado guardado'); setModal(null); load()
  }

  async function delEmp(id) { await supabase.from('employees').update({ active: false }).eq('id', id); setToast('Empleado eliminado'); setModal(null); load() }
  async function delSite(id) { await supabase.from('sites').update({ active: false }).eq('id', id); setToast('Sitio eliminado'); setModal(null); load() }

  function getSiteUrl(code) {
    if (typeof window === 'undefined') return ''
    return `${window.location.origin}/checkin/${code}`
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0e1a', color: '#8892a8', fontFamily: "'DM Sans'" }}>Cargando...</div>
  )

  const inputStyle = { width: '100%', background: '#0d1220', border: '1px solid #1e2a45', color: '#f1f5f9', fontSize: 12, padding: '7px 10px', borderRadius: 6, outline: 'none', fontFamily: 'inherit' }
  const selectStyle = { ...inputStyle }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: "'DM Sans', sans-serif", background: '#0a0e1a', color: '#f1f5f9' }}>
      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ display: 'none', position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 99 }} className="sidebar-overlay" />}

      <div style={{ width: sidebarOpen ? 210 : 0, minWidth: sidebarOpen ? 210 : 0, background: '#111827', borderRight: sidebarOpen ? '1px solid #1e2a45' : 'none', display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden', transition: 'width .2s ease, min-width .2s ease', position: 'relative', zIndex: 100 }}>
        <div style={{ width: 210, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ padding: 16, borderBottom: '1px solid #1e2a45', display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/logo.jpeg" style={{ width: 32, height: 32, borderRadius: 8 }} alt="GM" />
            <div><div style={{ fontSize: 13, fontWeight: 700 }}>G.Montalvo</div><div style={{ fontSize: 9, color: '#8892a8' }}>Control de Asistencia</div></div>
          </div>
          <nav style={{ flex: 1, padding: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: '#4a5568', padding: '8px 8px 4px' }}>Principal</div>
            {[{ id: 'dashboard', lb: 'Dashboard' }, { id: 'attendance', lb: 'Asistencia' }].map(n => (
              <button key={n.id} onClick={() => { setTab(n.id); if (window.innerWidth < 768) setSidebarOpen(false) }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500, color: tab === n.id ? '#3b82f6' : '#8892a8', background: tab === n.id ? 'rgba(59,130,246,.12)' : 'transparent', border: 'none', width: '100%', textAlign: 'left', fontFamily: 'inherit' }}>{n.lb}</button>
            ))}
            <div style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: '#4a5568', padding: '12px 8px 4px' }}>Gestión</div>
            {[{ id: 'employees', lb: 'Empleados' }, { id: 'sites', lb: 'Sitios' }].map(n => (
              <button key={n.id} onClick={() => { setTab(n.id); if (window.innerWidth < 768) setSidebarOpen(false) }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500, color: tab === n.id ? '#3b82f6' : '#8892a8', background: tab === n.id ? 'rgba(59,130,246,.12)' : 'transparent', border: 'none', width: '100%', textAlign: 'left', fontFamily: 'inherit' }}>{n.lb}</button>
            ))}
            {isSuperAdmin && <>
              <div style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: '#4a5568', padding: '12px 8px 4px' }}>Admin</div>
              <button onClick={() => { setTab('users'); if (window.innerWidth < 768) setSidebarOpen(false) }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500, color: tab === 'users' ? '#3b82f6' : '#8892a8', background: tab === 'users' ? 'rgba(59,130,246,.12)' : 'transparent', border: 'none', width: '100%', textAlign: 'left', fontFamily: 'inherit' }}>Usuarios</button>
            </>}
          </nav>
          <div style={{ padding: '12px 8px', borderTop: '1px solid #1e2a45' }}>
            <div style={{ fontSize: 10, color: '#4a5568', padding: '0 8px 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{adminUser?.name || authUser?.email}</div>
            <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, color: '#ef4444', background: 'transparent', border: 'none', width: '100%', textAlign: 'left', fontFamily: 'inherit' }}>Cerrar sesión</button>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 22px', borderBottom: '1px solid #1e2a45', background: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => setSidebarOpen(o => !o)} style={{ background: 'none', border: '1px solid #1e2a45', borderRadius: 6, color: '#8892a8', cursor: 'pointer', padding: '5px 9px', fontSize: 16, lineHeight: 1, fontFamily: 'inherit' }}>☰</button>
            <div>
              <h1 style={{ fontSize: 17, fontWeight: 700 }}>{{ dashboard: 'Dashboard', attendance: 'Asistencia', employees: 'Empleados', sites: 'Sitios', users: 'Usuarios' }[tab]}</h1>
              <p style={{ fontSize: 11, color: '#8892a8', marginTop: 1 }}>{new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Cancun' })}</p>
            </div>
          </div>
          {tab === 'employees' && <button onClick={() => setModal({ type: 'emp', data: null })} style={{ padding: '7px 14px', borderRadius: 7, border: 'none', background: '#3b82f6', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>+ Nuevo Empleado</button>}
          {tab === 'sites'     && <button onClick={() => setModal({ type: 'site', data: null })} style={{ padding: '7px 14px', borderRadius: 7, border: 'none', background: '#3b82f6', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>+ Nuevo Sitio</button>}
          {tab === 'users'     && isSuperAdmin && <button onClick={() => setModal({ type: 'adminUser', data: null })} style={{ padding: '7px 14px', borderRadius: 7, border: 'none', background: '#3b82f6', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>+ Nuevo Usuario</button>}
        </div>

        <div style={{ flex: 1, padding: '18px 22px', overflow: 'auto' }}>

          {tab === 'dashboard' && <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 18 }}>
              {[['Puntuales',statOnTime,'#10b981'],['Con retardo',statTol,'#f59e0b'],['Completaron',statDone,'#3b82f6'],['No llegaron',statMissing,'#ef4444'],['Por llegar',statPending,'#8892a8']].map(([l,v,c]) => (
                <div key={l} style={{ background: '#1a2035', border: '1px solid #1e2a45', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 10, color: '#8892a8', marginBottom: 4 }}>{l}</div>
                  <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "'JetBrains Mono'", color: c }}>{v}</div>
                </div>
              ))}
            </div>
            {sites.map(site => {
              const siteRows = dashRows.filter(r => r.sc.site_id === site.id)
              const siteUnscheduled = unscheduledAtt.filter(r => r.site_id === site.id)
              if (siteRows.length === 0 && siteUnscheduled.length === 0) return null
              const totalCount = siteRows.length + siteUnscheduled.length
              return (
                <div key={site.id} style={{ background: '#1a2035', border: '1px solid #1e2a45', borderRadius: 10, overflow: 'hidden', marginBottom: 14 }}>
                  <div style={{ padding: '10px 16px', borderBottom: '1px solid #1e2a45', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{site.name}</div>
                    <div style={{ fontSize: 10, color: '#4a5568' }}>{totalCount} empleado{totalCount !== 1 ? 's' : ''} hoy</div>
                  </div>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead><tr>{['Empleado','Horario','Entrada','Salida','Estado'].map(h => (
                      <th key={h} style={{ textAlign: 'left', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.6px', color: '#4a5568', padding: '8px 16px', borderBottom: '1px solid #1e2a45' }}>{h}</th>
                    ))}</tr></thead>
                    <tbody>
                      {siteRows.map(({ sc, emp, record, color, bg, statusLabel }) => (
                        <tr key={sc.id} style={{ borderBottom: '1px solid rgba(30,42,69,.3)' }}>
                          <td style={{ padding: '10px 16px' }}>
                            <button onClick={() => setSideEmp(emp)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: '#3b82f6', textDecoration: 'underline', textDecorationColor: 'rgba(59,130,246,.3)' }}>{emp?.name || '?'}</div>
                              <div style={{ fontSize: 10, color: '#4a5568' }}>{emp?.role}</div>
                            </button>
                          </td>
                          <td style={{ padding: '10px 16px', fontSize: 11, fontFamily: "'JetBrains Mono'", color: '#8892a8' }}>{sc.start_time?.slice(0,5)} – {sc.end_time?.slice(0,5)}</td>
                          <td style={{ padding: '10px 16px', fontSize: 11, fontFamily: "'JetBrains Mono'" }}>{record?.check_in ? fmtTime(record.check_in, site.timezone) : '–'}</td>
                          <td style={{ padding: '10px 16px', fontSize: 11, fontFamily: "'JetBrains Mono'" }}>{record?.check_out ? fmtTime(record.check_out, site.timezone) : '–'}</td>
                          <td style={{ padding: '10px 16px' }}><span style={{ padding: '3px 10px', borderRadius: 5, fontSize: 10, fontWeight: 600, color, background: bg }}>{statusLabel}</span></td>
                        </tr>
                      ))}
                      {siteUnscheduled.map(r => {
                        const emp = emps.find(e => e.id === r.employee_id)
                        const color = r.check_out ? '#3b82f6' : '#10b981'; const bg = r.check_out ? 'rgba(59,130,246,.12)' : 'rgba(16,185,129,.12)'; const label = r.check_out ? 'Completó turno' : 'Activo'
                        return (
                          <tr key={r.id} style={{ borderBottom: '1px solid rgba(30,42,69,.3)', background: 'rgba(16,185,129,.03)' }}>
                            <td style={{ padding: '10px 16px' }}>
                              <button onClick={() => setSideEmp(emp)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: '#3b82f6', textDecoration: 'underline', textDecorationColor: 'rgba(59,130,246,.3)' }}>{emp?.name || '?'}</div>
                                <div style={{ fontSize: 10, color: '#4a5568' }}>{emp?.role}</div>
                              </button>
                            </td>
                            <td style={{ padding: '10px 16px', fontSize: 10, color: '#4a5568', fontStyle: 'italic' }}>Sin horario</td>
                            <td style={{ padding: '10px 16px', fontSize: 11, fontFamily: "'JetBrains Mono'" }}>{fmtTime(r.check_in, site.timezone)}</td>
                            <td style={{ padding: '10px 16px', fontSize: 11, fontFamily: "'JetBrains Mono'" }}>{r.check_out ? fmtTime(r.check_out, site.timezone) : '–'}</td>
                            <td style={{ padding: '10px 16px' }}><span style={{ padding: '3px 10px', borderRadius: 5, fontSize: 10, fontWeight: 600, color, background: bg }}>{label}</span></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )
            })}
            {dashRows.length === 0 && unscheduledAtt.length === 0 && (
              <div style={{ padding: 32, textAlign: 'center', color: '#4a5568', fontSize: 13, background: '#1a2035', borderRadius: 10, border: '1px solid #1e2a45' }}>No hay horarios cargados para hoy.</div>
            )}
          </>}

          {tab === 'attendance' && <>
            <div style={{ background: '#1a2035', border: '1px solid #1e2a45', borderRadius: 10, padding: '14px 16px', marginBottom: 14, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
              {[['Empleado', filterEmp, setFilterEmp, emps.map(e => [e.id, e.name])],['Sucursal', filterSite, setFilterSite, sites.map(s => [s.id, s.name])]].map(([l, val, set, opts]) => (
                <div key={l}>
                  <div style={{ fontSize: 10, color: '#4a5568', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>{l}</div>
                  <select value={val} onChange={e => set(e.target.value)} style={selectStyle}>
                    <option value=''>Todo{l === 'Sucursal' ? 's' : 's'}</option>
                    {opts.map(([v, n]) => <option key={v} value={v}>{n}</option>)}
                  </select>
                </div>
              ))}
              {[['Desde', filterFrom, setFilterFrom], ['Hasta', filterTo, setFilterTo]].map(([l, val, set]) => (
                <div key={l}>
                  <div style={{ fontSize: 10, color: '#4a5568', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>{l}</div>
                  <input type='date' value={val} onChange={e => set(e.target.value)} style={inputStyle} />
                </div>
              ))}
              <div>
                <div style={{ fontSize: 10, color: '#4a5568', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>Estado</div>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selectStyle}>
                  <option value=''>Todos</option>
                  <option value='on_time'>Puntual</option><option value='tolerancia'>Tolerancia</option><option value='late'>Retardo</option><option value='absent'>Falta</option>
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, color: '#8892a8' }}>{filteredAtt.length} registro{filteredAtt.length !== 1 ? 's' : ''} encontrado{filteredAtt.length !== 1 ? 's' : ''}</span>
              <button onClick={() => { setFilterEmp(''); setFilterSite(''); setFilterFrom(''); setFilterTo(''); setFilterStatus('') }} style={{ background: (filterEmp||filterSite||filterFrom||filterTo||filterStatus) ? 'rgba(59,130,246,.12)' : 'transparent', border: '1px solid '+((filterEmp||filterSite||filterFrom||filterTo||filterStatus)?'#3b82f6':'#1e2a45'), borderRadius: 5, color: (filterEmp||filterSite||filterFrom||filterTo||filterStatus)?'#3b82f6':'#4a5568', fontSize: 10, padding: '4px 12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Limpiar filtros</button>
            </div>
            <div style={{ background: '#1a2035', border: '1px solid #1e2a45', borderRadius: 10, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>{['Fecha','Empleado','Sucursal','Entrada','Salida','Horas','Ventas','Estado'].map(h => (
                  <th key={h} style={{ textAlign: 'left', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.6px', color: '#4a5568', padding: '9px 16px', borderBottom: '1px solid #1e2a45' }}>{h}</th>
                ))}</tr></thead>
                <tbody>
                  {filteredAtt.slice(0, 300).map(r => {
                    const emp = emps.find(e => e.id === r.employee_id); const site = sites.find(s => s.id === r.site_id)
                    return (
                      <tr key={r.id} style={{ borderBottom: '1px solid rgba(30,42,69,.3)' }}>
                        <td style={{ padding: '9px 16px', fontSize: 11, fontFamily: "'JetBrains Mono'" }}>{fmtDate(r.date)}</td>
                        <td style={{ padding: '9px 16px' }}><button onClick={() => setSideEmp(emp)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}><span style={{ fontSize: 12, fontWeight: 600, color: '#3b82f6', textDecoration: 'underline', textDecorationColor: 'rgba(59,130,246,.3)' }}>{emp?.name || '?'}</span></button></td>
                        <td style={{ padding: '9px 16px', fontSize: 11, color: '#8892a8' }}>{site?.name || '?'}</td>
                        <td style={{ padding: '9px 16px', fontSize: 11, fontFamily: "'JetBrains Mono'" }}>{fmtTime(r.check_in, site?.timezone)}</td>
                        <td style={{ padding: '9px 16px', fontSize: 11, fontFamily: "'JetBrains Mono'" }}>{fmtTime(r.check_out, site?.timezone)}</td>
                        <td style={{ padding: '9px 16px', fontSize: 11, fontFamily: "'JetBrains Mono'" }}>{fmtHours(r.hours_worked)}</td>
                        <td style={{ padding: '9px 16px', fontSize: 11, fontFamily: "'JetBrains Mono'", color: r.sales_amount > 0 ? '#10b981' : '#4a5568' }}>{r.sales_amount > 0 ? '$'+Number(r.sales_amount).toLocaleString('es-MX') : '–'}</td>
                        <td style={{ padding: '9px 16px' }}><span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, color: stClr[r.status]||'#8892a8', background: stBg[r.status]||'rgba(136,146,168,.1)' }}>{stLbl[r.status]||r.status||'–'}</span></td>
                      </tr>
                    )
                  })}
                  {filteredAtt.length === 0 && <tr><td colSpan={8} style={{ padding: 24, textAlign: 'center', color: '#4a5568', fontSize: 12 }}>Sin registros con los filtros seleccionados</td></tr>}
                </tbody>
              </table>
            </div>
          </>}

          {tab === 'employees' && (
            <div style={{ background: '#1a2035', border: '1px solid #1e2a45', borderRadius: 10, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>{['Empleado','Email','Rol','Meta semanal','Próx. turno',''].map(h => (
                  <th key={h} style={{ textAlign: 'left', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.6px', color: '#4a5568', padding: '9px 16px', borderBottom: '1px solid #1e2a45' }}>{h}</th>
                ))}</tr></thead>
                <tbody>
                  {emps.map(emp => {
                    const empScheds = schedules.filter(s => s.employee_id === emp.id && s.date >= today).sort((a,b) => a.date.localeCompare(b.date))
                    const nextSched = empScheds[0]; const nextSite = nextSched ? sites.find(s => s.id === nextSched.site_id) : null
                    const goal = goals.find(g => g.employee_id === emp.id)
                    return (
                      <tr key={emp.id} style={{ borderBottom: '1px solid rgba(30,42,69,.3)' }}>
                        <td style={{ padding: '9px 16px' }}>
                          <button onClick={() => setSideEmp(emp)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#3b82f6', textDecoration: 'underline', textDecorationColor: 'rgba(59,130,246,.3)' }}>{emp.name}</div>
                            <div style={{ fontSize: 10, color: '#4a5568' }}>{emp.phone || ''}</div>
                          </button>
                        </td>
                        <td style={{ padding: '9px 16px', fontSize: 11, color: '#8892a8' }}>{emp.email}</td>
                        <td style={{ padding: '9px 16px' }}>
                          <span style={{ fontSize: 11, color: '#8892a8' }}>{emp.role}</span>
                          {emp.free_roam && <span style={{ marginLeft: 6, color: '#10b981', fontSize: 9, fontWeight: 600, background: 'rgba(16,185,129,.12)', padding: '1px 6px', borderRadius: 3 }}>Libre</span>}
                        </td>
                        <td style={{ padding: '9px 16px' }}>
                          {goal ? <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono'", color: '#10b981', fontWeight: 600 }}>${Number(goal.weekly_goal).toLocaleString('es-MX')}</span>
                                : <span style={{ fontSize: 10, color: '#4a5568' }}>Sin meta</span>}
                        </td>
                        <td style={{ padding: '9px 16px' }}>
                          {nextSched ? (
                            <div>
                              <div style={{ fontSize: 11, color: '#f1f5f9', fontWeight: 600 }}>{fmtDate(nextSched.date)}{nextSched.date === today ? <span style={{ marginLeft: 6, fontSize: 9, color: '#10b981', fontWeight: 700 }}>HOY</span> : ''}</div>
                              <div style={{ fontSize: 10, color: '#4a5568', fontFamily: "'JetBrains Mono'" }}>{nextSched.start_time?.slice(0,5)} – {nextSched.end_time?.slice(0,5)} · {nextSite?.name}</div>
                            </div>
                          ) : <span style={{ fontSize: 10, color: '#f59e0b' }}>Sin turno próximo</span>}
                        </td>
                        <td style={{ padding: '9px 16px' }}>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <button onClick={() => setSideEmp(emp)} style={{ padding: '4px 10px', borderRadius: 5, border: '1px solid rgba(16,185,129,.25)', background: 'rgba(16,185,129,.1)', color: '#10b981', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Historial</button>
                            <button onClick={() => setModal({ type: 'schedule', data: emp })} style={{ padding: '4px 10px', borderRadius: 5, border: '1px solid rgba(59,130,246,.25)', background: 'rgba(59,130,246,.12)', color: '#3b82f6', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Horarios</button>
                            <button onClick={() => setModal({ type: 'emp', data: { emp, goal } })} style={{ background: 'none', border: 'none', color: '#8892a8', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>Editar</button>
                            <button onClick={() => { if (confirm('Eliminar ' + emp.name + '?')) delEmp(emp.id) }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>Eliminar</button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {emps.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: '#4a5568', fontSize: 12 }}>No hay empleados. Agrega el primero.</div>}
            </div>
          )}

          {tab === 'sites' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sites.map(site => (
                <div key={site.id} style={{ background: '#1a2035', border: '1px solid #1e2a45', borderRadius: 10, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{site.name}</div>
                    <div style={{ fontSize: 11, color: '#8892a8' }}>{site.address}</div>
                    <div style={{ fontSize: 9, color: '#4a5568', marginTop: 4 }}>Tolerancia: {site.grace_mins}min · Radio GPS: {site.radius_m}m</div>
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
            </div>
          )}

          {tab === 'users' && isSuperAdmin && (
            <div style={{ background: '#1a2035', border: '1px solid #1e2a45', borderRadius: 10, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>{['Usuario','Email','Rol','Sucursales',''].map(h => (
                  <th key={h} style={{ textAlign: 'left', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.6px', color: '#4a5568', padding: '9px 16px', borderBottom: '1px solid #1e2a45' }}>{h}</th>
                ))}</tr></thead>
                <tbody>
                  {adminUsers.map(au => {
                    const auSites = (au.admin_site_permissions || []).map(p => sites.find(s => s.id === p.site_id)?.name).filter(Boolean)
                    return (
                      <tr key={au.id} style={{ borderBottom: '1px solid rgba(30,42,69,.3)' }}>
                        <td style={{ padding: '9px 16px' }}><div style={{ fontSize: 12, fontWeight: 600 }}>{au.name}</div></td>
                        <td style={{ padding: '9px 16px', fontSize: 11, color: '#8892a8' }}>{au.email}</td>
                        <td style={{ padding: '9px 16px' }}><span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, color: au.role === 'superadmin' ? '#3b82f6' : '#10b981', background: au.role === 'superadmin' ? 'rgba(59,130,246,.12)' : 'rgba(16,185,129,.12)' }}>{au.role === 'superadmin' ? 'Super Admin' : 'Gerente'}</span></td>
                        <td style={{ padding: '9px 16px', fontSize: 11, color: '#8892a8' }}>{au.role === 'superadmin' ? <span style={{ color: '#4a5568' }}>Todas</span> : auSites.length > 0 ? auSites.join(', ') : <span style={{ color: '#ef4444' }}>Sin asignar</span>}</td>
                        <td style={{ padding: '9px 16px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => setModal({ type: 'adminUser', data: au })} style={{ background: 'none', border: 'none', color: '#8892a8', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>Editar</button>
                            {au.id !== authUser?.id && <button onClick={async () => { if (confirm('Desactivar ' + au.name + '?')) { await supabase.from('admin_users').update({ active: false }).eq('id', au.id); load(); setToast('Usuario desactivado') } }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>Desactivar</button>}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {adminUsers.length === 0 && <tr><td colSpan={5} style={{ padding: 24, textAlign: 'center', color: '#4a5568', fontSize: 12 }}>No hay usuarios admin.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {sideEmp && <EmpSidePanel emp={sideEmp} att={att.filter(r => r.employee_id === sideEmp.id)} sites={sites} onClose={() => setSideEmp(null)} />}

      {modal?.type === 'emp'       && <EmpModal       data={modal.data?.emp || null} currentGoal={modal.data?.goal?.weekly_goal || ''} onSave={saveEmp} onClose={() => setModal(null)} />}
      {modal?.type === 'site'      && <SiteModal      data={modal.data} onSave={saveSite} onClose={() => setModal(null)} />}
      {modal?.type === 'qr'        && <QrModal        site={modal.data} url={getSiteUrl(modal.data.code)} onClose={() => setModal(null)} />}
      {modal?.type === 'schedule'  && <ScheduleModal  emp={modal.data} sites={sites} schedules={schedules.filter(s => s.employee_id === modal.data.id)} onSave={async () => { await load(); setToast('Horarios guardados'); setModal(null) }} onClose={() => setModal(null)} />}
      {modal?.type === 'adminUser' && <AdminUserModal data={modal.data} sites={sites} onSave={async () => { await load(); setToast('Usuario guardado'); setModal(null) }} onClose={() => setModal(null)} />}

      {toast && <div style={{ position: 'fixed', bottom: 20, right: 20, background: '#1a2035', border: '1px solid rgba(16,185,129,.25)', borderRadius: 8, padding: '10px 16px', fontSize: 12, fontWeight: 500, zIndex: 200, color: '#10b981' }}>{toast}</div>}
    </div>
  )
}

const ALL_COLS = [
  { key: 'date', label: 'Fecha' }, { key: 'site', label: 'Sucursal' }, { key: 'checkin', label: 'Entrada' },
  { key: 'checkout', label: 'Salida' }, { key: 'hours', label: 'Horas' }, { key: 'time_out', label: 'T. Fuera' },
  { key: 'sales', label: 'Venta' }, { key: 'photo_in', label: 'Foto In' }, { key: 'photo_out', label: 'Foto Out' },
  { key: 'gps', label: 'GPS' }, { key: 'status', label: 'Estado' },
]

function EmpSidePanel({ emp, att, sites, onClose }) {
  const [from, setFrom] = useState('')
  const [to,   setTo]   = useState('')
  const [visibleCols, setVisibleCols] = useState(['date','site','checkin','checkout','hours','time_out','sales','photo_in','photo_out','gps','status'])
  const [showColPicker, setShowColPicker] = useState(false)

  const filtered = att.filter(r => {
    if (from && r.date < from) return false
    if (to   && r.date > to)   return false
    return true
  }).sort((a, b) => b.date.localeCompare(a.date))

  const totalHours = filtered.reduce((s, r) => s + (r.hours_worked || 0), 0)
  const totalSales = filtered.reduce((s, r) => s + (r.sales_amount || 0), 0)
  const onTime = filtered.filter(r => r.status === 'on_time').length
  const late   = filtered.filter(r => r.status === 'late').length
  const absent = filtered.filter(r => r.status === 'absent').length

  const iS = { background: '#1a2035', border: '1px solid #2d3d5a', color: '#f1f5f9', fontSize: 11, padding: '7px 10px', borderRadius: 6, outline: 'none', fontFamily: 'inherit', colorScheme: 'dark' }

  return (
    <div style={{ position: 'fixed', top: 0, right: 0, width: 480, height: '100vh', background: '#111827', borderLeft: '1px solid #1e2a45', display: 'flex', flexDirection: 'column', zIndex: 150, boxShadow: '-8px 0 32px rgba(0,0,0,.4)' }}>
      <div style={{ padding: '18px 20px', borderBottom: '1px solid #1e2a45', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{emp.name}</div>
          <div style={{ fontSize: 11, color: '#8892a8', marginTop: 2 }}>{emp.email} · {emp.role}</div>
        </div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowColPicker(p => !p)} style={{ background: showColPicker ? 'rgba(59,130,246,.12)' : 'none', border: '1px solid '+(showColPicker?'#3b82f6':'#1e2a45'), borderRadius: 6, color: showColPicker?'#3b82f6':'#8892a8', fontSize: 11, cursor: 'pointer', padding: '4px 10px', fontFamily: 'inherit' }}>Columnas</button>
            {showColPicker && (
              <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', right: 0, top: 34, background: '#1a2035', border: '1px solid #1e2a45', borderRadius: 10, padding: 12, zIndex: 10, minWidth: 160, boxShadow: '0 8px 24px rgba(0,0,0,.4)' }}>
                {ALL_COLS.map(c => (
                  <label key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer', color: '#f1f5f9', padding: '4px 0' }}>
                    <input type='checkbox' checked={visibleCols.includes(c.key)} onChange={() => setVisibleCols(p => p.includes(c.key) ? p.filter(k => k !== c.key) : [...p, c.key])} style={{ accentColor: '#3b82f6' }} />
                    {c.label}
                  </label>
                ))}
              </div>
            )}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid #1e2a45', borderRadius: 6, color: '#8892a8', fontSize: 18, cursor: 'pointer', padding: '2px 10px', lineHeight: 1 }}>×</button>
        </div>
      </div>
      <div style={{ padding: '12px 20px', borderBottom: '1px solid #1e2a45', display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9, color: '#4a5568', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 3 }}>Desde</div>
          <input type='date' value={from} onChange={e => setFrom(e.target.value)} style={{ ...iS, width: '100%' }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9, color: '#4a5568', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 3 }}>Hasta</div>
          <input type='date' value={to} onChange={e => setTo(e.target.value)} style={{ ...iS, width: '100%' }} />
        </div>
        {(from || to) && <button onClick={() => { setFrom(''); setTo('') }} style={{ background: 'none', border: '1px solid #1e2a45', borderRadius: 5, color: '#8892a8', fontSize: 10, padding: '5px 10px', cursor: 'pointer', fontFamily: 'inherit', marginTop: 14 }}>Limpiar</button>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', borderBottom: '1px solid #1e2a45', flexShrink: 0 }}>
        {[['Registros',filtered.length,'#3b82f6'],['Puntuales',onTime,'#10b981'],['Retardos',late,'#f59e0b'],['Faltas',absent,'#ef4444'],['Horas',fmtHours(totalHours),'#8892a8']].map(([l,v,c],i) => (
          <div key={l} style={{ padding: '10px 14px', borderRight: i < 4 ? '1px solid #1e2a45' : 'none' }}>
            <div style={{ fontSize: 9, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 3 }}>{l}</div>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'JetBrains Mono'", color: c }}>{v}</div>
          </div>
        ))}
      </div>
      {totalSales > 0 && (
        <div style={{ padding: '10px 20px', borderBottom: '1px solid #1e2a45', display: 'flex', gap: 20, flexShrink: 0 }}>
          <div><span style={{ fontSize: 10, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '.5px', marginRight: 8 }}>Ventas</span><span style={{ fontSize: 14, fontWeight: 700, fontFamily: "'JetBrains Mono'", color: '#10b981' }}>${Number(totalSales).toLocaleString('es-MX')}</span></div>
          <div><span style={{ fontSize: 10, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '.5px', marginRight: 8 }}>Prom. diario</span><span style={{ fontSize: 13, fontWeight: 600, fontFamily: "'JetBrains Mono'", color: '#10b981' }}>${Number(totalSales / Math.max(filtered.filter(r => r.sales_amount > 0).length, 1)).toLocaleString('es-MX', { maximumFractionDigits: 0 })}</span></div>
        </div>
      )}
      <div style={{ flex: 1, overflowY: 'auto' }} onClick={() => showColPicker && setShowColPicker(false)}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ position: 'sticky', top: 0, background: '#111827', zIndex: 1 }}>
            <tr>{ALL_COLS.filter(c => visibleCols.includes(c.key)).map(c => (
              <th key={c.key} style={{ textAlign: 'left', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.6px', color: '#4a5568', padding: '8px 14px', borderBottom: '1px solid #1e2a45', whiteSpace: 'nowrap' }}>{c.label}</th>
            ))}</tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={visibleCols.length} style={{ padding: 24, textAlign: 'center', color: '#4a5568', fontSize: 12 }}>Sin registros</td></tr>}
            {filtered.map(r => {
              const site = sites.find(s => s.id === r.site_id)
              const lunchMins = r.lunch_start && r.lunch_end ? Math.round((new Date(r.lunch_end)-new Date(r.lunch_start))/60000) : 0
              const breakMins = r.break_start && r.break_end ? Math.round((new Date(r.break_end)-new Date(r.break_start))/60000) : 0
              const tom = lunchMins + breakMins
              const tomLabel = tom > 0 ? `${Math.floor(tom/60)>0?Math.floor(tom/60)+'h ':''}${tom%60>0?tom%60+'m':''}`.trim() : '–'
              const gpsLabel = r.gps_lat && r.gps_lng ? `${r.gps_distance_m??'?'}m` : '–'
              const gpsLink  = r.gps_lat && r.gps_lng ? `https://maps.google.com/?q=${r.gps_lat},${r.gps_lng}` : null
              return (
                <tr key={r.id} style={{ borderBottom: '1px solid rgba(30,42,69,.3)' }}>
                  {visibleCols.includes('date')      && <td style={{ padding: '8px 14px', fontSize: 11, fontFamily: "'JetBrains Mono'", whiteSpace: 'nowrap' }}>{fmtDate(r.date)}</td>}
                  {visibleCols.includes('site')      && <td style={{ padding: '8px 14px', fontSize: 11, color: '#8892a8', whiteSpace: 'nowrap' }}>{site?.name||'?'}</td>}
                  {visibleCols.includes('checkin')   && <td style={{ padding: '8px 14px', fontSize: 11, fontFamily: "'JetBrains Mono'", whiteSpace: 'nowrap' }}>{fmtTime(r.check_in, site?.timezone)}</td>}
                  {visibleCols.includes('checkout')  && <td style={{ padding: '8px 14px', fontSize: 11, fontFamily: "'JetBrains Mono'", whiteSpace: 'nowrap' }}>{fmtTime(r.check_out, site?.timezone)}</td>}
                  {visibleCols.includes('hours')     && <td style={{ padding: '8px 14px', fontSize: 11, fontFamily: "'JetBrains Mono'", whiteSpace: 'nowrap' }}>{fmtHours(r.hours_worked)}</td>}
                  {visibleCols.includes('time_out')  && <td style={{ padding: '8px 14px', fontSize: 11, fontFamily: "'JetBrains Mono'", color: tom>0?'#f59e0b':'#4a5568', whiteSpace: 'nowrap' }}>{tomLabel}</td>}
                  {visibleCols.includes('sales')     && <td style={{ padding: '8px 14px', fontSize: 11, fontFamily: "'JetBrains Mono'", color: r.sales_amount>0?'#10b981':'#4a5568', whiteSpace: 'nowrap' }}>{r.sales_amount>0?'$'+Number(r.sales_amount).toLocaleString('es-MX'):'–'}</td>}
                  {visibleCols.includes('photo_in')  && <td style={{ padding: '8px 14px' }}>{r.photo_url?<a href={r.photo_url} target='_blank' rel='noopener noreferrer'><img src={r.photo_url} alt='in' style={{ width:32,height:32,borderRadius:6,objectFit:'cover',display:'block',border:'1px solid #1e2a45' }} /></a>:<span style={{ fontSize:10,color:'#4a5568' }}>–</span>}</td>}
                  {visibleCols.includes('photo_out') && <td style={{ padding: '8px 14px' }}>{r.photo_url_out?<a href={r.photo_url_out} target='_blank' rel='noopener noreferrer'><img src={r.photo_url_out} alt='out' style={{ width:32,height:32,borderRadius:6,objectFit:'cover',display:'block',border:'1px solid #1e2a45' }} /></a>:<span style={{ fontSize:10,color:'#4a5568' }}>–</span>}</td>}
                  {visibleCols.includes('gps')       && <td style={{ padding: '8px 14px', fontSize: 11, whiteSpace: 'nowrap' }}>{gpsLink?<a href={gpsLink} target='_blank' rel='noopener noreferrer' style={{ color:'#3b82f6',textDecoration:'none',fontFamily:"'JetBrains Mono'" }}>{gpsLabel} ↗</a>:<span style={{ color:'#4a5568' }}>–</span>}</td>}
                  {visibleCols.includes('status')    && <td style={{ padding: '8px 14px' }}>{r.status?<span style={{ padding:'2px 8px',borderRadius:4,fontSize:10,fontWeight:600,color:stClr[r.status]||'#8892a8',background:stBg[r.status]||'rgba(136,146,168,.1)',whiteSpace:'nowrap' }}>{stLbl[r.status]||r.status}</span>:<span style={{ fontSize:10,color:'#4a5568' }}>–</span>}</td>}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Emp Modal ────────────────────────────────────────────────────────────────
function EmpModal({ data, currentGoal, onSave, onClose }) {
  const [f, setF] = useState(data || { name: '', email: '', phone: '', role: 'Vendedor(a)', skip_sales: false, skip_photo: false })
  const [weeklyGoal, setWeeklyGoal] = useState(currentGoal ? String(currentGoal) : '')
  const [goalErr, setGoalErr] = useState('')
  const upd = (k, v) => setF(p => ({ ...p, [k]: v }))
  const valid = f.name?.trim() && f.email?.trim()
  const isVendor = !f.skip_sales

  function handleSave() {
    setGoalErr('')
    if (weeklyGoal !== '') {
      const g = parseFloat(weeklyGoal)
      if (isNaN(g) || g <= 0) { setGoalErr('Ingresa un número mayor a 0'); return }
      if (g > MAX_SALE) { setGoalErr(`El máximo es $${MAX_SALE.toLocaleString('es-MX')}`); return }
    }
    onSave(f, weeklyGoal)
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#1a2035', border: '1px solid #1e2a45', borderRadius: 12, padding: 22, width: '100%', maxWidth: 440, maxHeight: '85vh', overflow: 'auto' }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>{data ? 'Editar Empleado' : 'Nuevo Empleado'}</h3>
        {[['Nombre','name','text'],['Email','email','email'],['Teléfono','phone','tel']].map(([l,k,t]) => (
          <div key={k} style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 10, fontWeight: 600, color: '#8892a8', display: 'block', marginBottom: 4 }}>{l}</label>
            <input type={t} value={f[k]||''} onChange={e => upd(k, e.target.value)} style={{ width:'100%',background:'#0d1220',border:'1px solid #1e2a45',color:'#f1f5f9',fontSize:12,padding:'8px 10px',borderRadius:6,outline:'none',fontFamily:'inherit' }} />
          </div>
        ))}
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 10, fontWeight: 600, color: '#8892a8', display: 'block', marginBottom: 4 }}>Rol</label>
          <select value={f.role||'Vendedor(a)'} onChange={e => upd('role', e.target.value)} style={{ width:'100%',background:'#0d1220',border:'1px solid #1e2a45',color:'#f1f5f9',fontSize:12,padding:'8px 10px',borderRadius:6,fontFamily:'inherit' }}>
            <option>Vendedor(a)</option><option>Encargado(a)</option><option>Gerente Regional</option><option>Supervisor(a)</option>
          </select>
        </div>

        {/* Meta semanal */}
        <div style={{ marginBottom: 14, background: 'rgba(16,185,129,.05)', border: `1px solid ${goalErr ? 'rgba(239,68,68,.4)' : 'rgba(16,185,129,.15)'}`, borderRadius: 8, padding: '12px 14px' }}>
          <label style={{ fontSize: 10, fontWeight: 600, color: '#10b981', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.5px' }}>Meta de ventas semanal</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 14, fontWeight: 700, color: '#4a5568', pointerEvents: 'none' }}>$</span>
            <input
              type='number' inputMode='decimal' placeholder='Sin meta (dejar vacío)'
              value={weeklyGoal}
              onChange={e => { setWeeklyGoal(e.target.value); setGoalErr('') }}
              style={{ width:'100%',background:'#0d1220',border:`1px solid ${goalErr?'#ef4444':'#1e2a45'}`,color:'#f1f5f9',fontSize:14,fontWeight:700,padding:'10px 10px 10px 26px',borderRadius:8,outline:'none',fontFamily:"'JetBrains Mono', monospace",boxSizing:'border-box' }}
            />
          </div>
          {goalErr && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 6, fontWeight: 600 }}>⚠ {goalErr}</div>}
          {!goalErr && <div style={{ fontSize: 10, color: '#4a5568', marginTop: 6 }}>Máximo ${MAX_SALE.toLocaleString('es-MX')}. Deja vacío para no asignar meta.</div>}
        </div>

        <div style={{ borderTop: '1px solid #1e2a45', paddingTop: 12, marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}>Comportamiento</div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer', color: '#f1f5f9' }}>
            <input type='checkbox' checked={isVendor} onChange={e => upd('skip_sales', !e.target.checked)} />
            Vendedor — pedir monto de ventas al hacer Check Out
          </label>
          <div style={{ fontSize: 10, color: '#4a5568', marginTop: 4, marginLeft: 20 }}>Desmarca si es bodega, admin u otro rol sin ventas directas</div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer', color: '#f1f5f9', marginTop: 10 }}>
            <input type='checkbox' checked={!f.skip_photo} onChange={e => upd('skip_photo', !e.target.checked)} />
            Pedir foto al hacer Check In y Check Out
          </label>
          <div style={{ fontSize: 10, color: '#4a5568', marginTop: 4, marginLeft: 20 }}>Desmarca si no quieres solicitar foto a este empleado</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button disabled={!valid} onClick={handleSave} style={{ flex:1,padding:'10px 16px',borderRadius:7,border:'none',background:valid?'#3b82f6':'#1e2a45',color:'#fff',fontSize:12,fontWeight:600,cursor:valid?'pointer':'not-allowed',fontFamily:'inherit' }}>Guardar</button>
          <button onClick={onClose} style={{ padding:'10px 16px',borderRadius:7,border:'1px solid #1e2a45',background:'transparent',color:'#8892a8',fontSize:12,cursor:'pointer',fontFamily:'inherit' }}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}

// ─── Site Modal ───────────────────────────────────────────────────────────────
function SiteModal({ data, onSave, onClose }) {
  const [f, setF] = useState(data || { name: '', code: '', address: '', grace_mins: 5, absent_mins: 15, lat: '', lng: '', radius_m: 150 })
  const upd = (k, v) => setF(p => ({ ...p, [k]: v }))
  const valid = f.name?.trim() && f.code?.trim()
  const hasGps = f.lat !== '' && f.lng !== '' && parseFloat(f.lat) !== 0 && parseFloat(f.lng) !== 0
  return (
    <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#1a2035', border: '1px solid #1e2a45', borderRadius: 12, padding: 22, width: '100%', maxWidth: 440, maxHeight: '85vh', overflow: 'auto' }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>{data ? 'Editar Sitio' : 'Nuevo Sitio'}</h3>
        {[['Nombre','name'],['Código QR','code'],['Dirección','address']].map(([l,k]) => (
          <div key={k} style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 10, fontWeight: 600, color: '#8892a8', display: 'block', marginBottom: 4 }}>{l}</label>
            <input value={f[k]||''} onChange={e => upd(k, k==='code'?e.target.value.toUpperCase():e.target.value)} style={{ width:'100%',background:'#0d1220',border:'1px solid #1e2a45',color:'#f1f5f9',fontSize:12,padding:'8px 10px',borderRadius:6,outline:'none',fontFamily:k==='code'?"'JetBrains Mono'":'inherit' }} />
          </div>
        ))}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 4 }}>
          {[['Latitud','lat'],['Longitud','lng'],['Radio (m)','radius_m']].map(([l,k]) => (
            <div key={k}>
              <label style={{ fontSize: 10, fontWeight: 600, color: '#8892a8', display: 'block', marginBottom: 4 }}>{l}</label>
              <input type='number' step='any' value={f[k]??''} placeholder={k==='radius_m'?'150':'Opcional'} onChange={e => upd(k, e.target.value===''?'':parseFloat(e.target.value))} style={{ width:'100%',background:'#0d1220',border:'1px solid #1e2a45',color:'#f1f5f9',fontSize:12,padding:'8px 10px',borderRadius:6,outline:'none',fontFamily:'inherit' }} />
            </div>
          ))}
        </div>
        <div style={{ fontSize: 10, color: '#4a5568', marginBottom: 10, padding: '6px 10px', background: hasGps?'rgba(16,185,129,.06)':'rgba(245,158,11,.06)', border: '1px solid '+(hasGps?'rgba(16,185,129,.2)':'rgba(245,158,11,.2)'), borderRadius: 6 }}>
          {hasGps ? '📍 GPS activo — se validará la ubicación al hacer Check In' : '⚠️ Sin GPS — empleados podrán hacer Check In desde cualquier lugar'}
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 10, fontWeight: 600, color: '#8892a8', display: 'block', marginBottom: 4 }}>Tolerancia (minutos después de la hora de entrada)</label>
          <input type='number' value={f.grace_mins||0} onChange={e => upd('grace_mins', parseInt(e.target.value)||0)} style={{ width:'100%',background:'#0d1220',border:'1px solid #1e2a45',color:'#f1f5f9',fontSize:12,padding:'8px 10px',borderRadius:6,outline:'none',fontFamily:'inherit' }} />
          <div style={{ fontSize: 9, color: '#4a5568', marginTop: 4 }}>Ej: Entrada 10:00, tolerancia 15min → hasta 10:15 = Tolerancia, 10:16+ = Retardo</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button disabled={!valid} onClick={() => onSave(f)} style={{ flex:1,padding:'10px 16px',borderRadius:7,border:'none',background:valid?'#3b82f6':'#1e2a45',color:'#fff',fontSize:12,fontWeight:600,cursor:valid?'pointer':'not-allowed',fontFamily:'inherit' }}>Guardar</button>
          <button onClick={onClose} style={{ padding:'10px 16px',borderRadius:7,border:'1px solid #1e2a45',background:'transparent',color:'#8892a8',fontSize:12,cursor:'pointer',fontFamily:'inherit' }}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}

function QrModal({ site, url, onClose }) {
  const qrImgUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`
  function printQR() {
    const w = window.open('', '_blank')
    w.document.write(`<html><head><title>QR - ${site.name}</title><style>body{font-family:Arial,sans-serif;text-align:center;padding:40px;}img{width:300px;height:300px;margin:20px 0;}h1{font-size:24px;margin-bottom:4px;}.code{font-family:monospace;font-size:20px;letter-spacing:3px;font-weight:bold;margin:10px 0;}.addr{color:#666;font-size:14px;}.url{color:#999;font-size:10px;margin-top:10px;word-break:break-all;}@media print{button{display:none;}}</style></head><body><h1>${site.name}</h1><div class="addr">${site.address||''}</div><img src="${qrImgUrl}" alt="QR Code"/><div class="code">${site.code}</div><div>Escanea para registrar asistencia</div><div class="url">${url}</div><br><button onclick="window.print()" style="padding:10px 30px;font-size:16px;cursor:pointer">Imprimir</button></body></html>`)
    w.document.close()
  }
  return (
    <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(4px)' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#1a2035', border: '1px solid #1e2a45', borderRadius: 14, padding: 24, width: '100%', maxWidth: 380, textAlign: 'center' }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{site.name}</h3>
        <p style={{ fontSize: 12, color: '#8892a8', marginBottom: 16 }}>{site.address}</p>
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, display: 'inline-block', marginBottom: 16 }}>
          <img src={qrImgUrl} alt='QR Code' style={{ width: 220, height: 220, display: 'block' }} />
        </div>
        <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 18, fontWeight: 700, letterSpacing: 3, marginBottom: 4 }}>{site.code}</div>
        <div style={{ fontSize: 11, color: '#4a5568', marginBottom: 16, wordBreak: 'break-all' }}>{url}</div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button onClick={printQR} style={{ padding:'10px 20px',borderRadius:7,border:'none',background:'#3b82f6',color:'#fff',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit' }}>Imprimir QR</button>
          <button onClick={() => navigator.clipboard.writeText(url)} style={{ padding:'10px 20px',borderRadius:7,border:'1px solid #1e2a45',background:'transparent',color:'#8892a8',fontSize:12,cursor:'pointer',fontFamily:'inherit' }}>Copiar URL</button>
          <button onClick={onClose} style={{ padding:'10px 20px',borderRadius:7,border:'1px solid #1e2a45',background:'transparent',color:'#8892a8',fontSize:12,cursor:'pointer',fontFamily:'inherit' }}>Cerrar</button>
        </div>
      </div>
    </div>
  )
}

function ScheduleModal({ emp, sites, schedules, onSave, onClose }) {
  const todayDate = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Cancun' })
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()))
  const [week, setWeek] = useState({})
  const [saving, setSaving] = useState(false)

  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i); return { date: dateStr(d), label: DAY_NAMES[i], d }
  })

  useEffect(() => {
    const w = {}
    weekDates.forEach(({ date }) => {
      const existing = schedules.find(s => s.date === date)
      w[date] = existing
        ? { on: true, site_id: existing.site_id, start_time: existing.start_time?.slice(0,5)||'10:00', end_time: existing.end_time?.slice(0,5)||'19:00', lunch_mins: existing.lunch_mins??60 }
        : { on: false, site_id: sites[0]?.id||'', start_time: '10:00', end_time: '19:00', lunch_mins: 60 }
    })
    setWeek(w)
  }, [weekStart, schedules])

  const toggle = (date) => setWeek(p => ({ ...p, [date]: { ...p[date], on: !p[date].on } }))
  const upd    = (date, key, val) => setWeek(p => ({ ...p, [date]: { ...p[date], [key]: val } }))
  const copyToAll = (srcDate) => {
    const src = week[srcDate]; if (!src?.on) return
    setWeek(p => { const nw = {...p}; weekDates.forEach(({date}) => { if (nw[date]?.on && date !== srcDate) nw[date] = {...nw[date], site_id: src.site_id, start_time: src.start_time, end_time: src.end_time, lunch_mins: src.lunch_mins} }); return nw })
  }

  const save = async () => {
    setSaving(true)
    const dates = weekDates.map(d => d.date)
    await supabase.from('schedules').delete().eq('employee_id', emp.id).in('date', dates)
    const inserts = []
    weekDates.forEach(({ date }) => {
      const day = week[date]
      if (day?.on && day.site_id) inserts.push({ employee_id: emp.id, date, site_id: day.site_id, start_time: day.start_time||'10:00', end_time: day.end_time||'19:00', lunch_mins: day.lunch_mins??60 })
    })
    if (inserts.length > 0) await supabase.from('schedules').insert(inserts)
    setSaving(false); onSave()
  }

  const weekLabel = (() => {
    const s = weekDates[0].d; const e = weekDates[6].d
    return `${s.getDate()} ${s.toLocaleDateString('es-MX',{month:'short'})} – ${e.getDate()} ${e.toLocaleDateString('es-MX',{month:'short',year:'numeric'})}`
  })()

  const iS = { width:'100%',background:'#0d1220',border:'1px solid #1e2a45',color:'#f1f5f9',fontSize:11,padding:'6px 8px',borderRadius:5,outline:'none',fontFamily:'inherit' }

  return (
    <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(4px)' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#1a2035', border: '1px solid #1e2a45', borderRadius: 12, padding: 22, width: '100%', maxWidth: 640, maxHeight: '92vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700 }}>Horarios — {emp.name}</h3>
          {!emp.fixed_week && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#0d1220', border: '1px solid #1e2a45', borderRadius: 8, padding: '4px 6px' }}>
              <button onClick={() => setWeekStart(d => addDays(d,-7))} style={{ background:'rgba(59,130,246,.15)',border:'none',borderRadius:5,color:'#3b82f6',padding:'5px 12px',cursor:'pointer',fontFamily:'inherit',fontSize:15,fontWeight:700,lineHeight:1 }}>‹</button>
              <span style={{ fontSize:12,color:'#f1f5f9',fontWeight:600,minWidth:170,textAlign:'center' }}>{weekLabel}</span>
              <button onClick={() => setWeekStart(d => addDays(d,7))} style={{ background:'rgba(59,130,246,.15)',border:'none',borderRadius:5,color:'#3b82f6',padding:'5px 12px',cursor:'pointer',fontFamily:'inherit',fontSize:15,fontWeight:700,lineHeight:1 }}>›</button>
            </div>
          )}
          {emp.fixed_week && <span style={{ fontSize:10,color:'#f59e0b',background:'rgba(245,158,11,.1)',border:'1px solid rgba(245,158,11,.25)',borderRadius:5,padding:'3px 10px' }}>Semana fija</span>}
        </div>
        <p style={{ fontSize: 11, color: '#8892a8', marginBottom: 16 }}>Activa los días que trabaja. Cada día puede tener diferente sucursal y horario.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {weekDates.map(({ date, label }) => {
            const day = week[date] || {}; const isOn = day.on; const isPast = date < todayDate
            return (
              <div key={date} style={{ background: isOn?'#0d1220':'transparent', border:'1px solid '+(isOn?'#1e2a45':'rgba(30,42,69,.3)'), borderRadius:8, padding: isOn?'10px 12px':'8px 12px', opacity: isPast?0.55:1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button onClick={() => toggle(date)} style={{ width:22,height:22,borderRadius:6,flexShrink:0,cursor:'pointer',border:'2px solid '+(isOn?'#10b981':'#4a5568'),background:isOn?'#10b981':'transparent',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:12,fontWeight:700 }}>{isOn?'✓':''}</button>
                  <span style={{ fontSize:12,fontWeight:600,width:34,flexShrink:0,color:date===todayDate?'#3b82f6':'#f1f5f9' }}>{label}</span>
                  {!emp.fixed_week && <span style={{ fontSize:10,color:'#4a5568',fontFamily:"'JetBrains Mono'",width:70,flexShrink:0 }}>{date.slice(5).replace('-','/')}</span>}
                  {isOn ? (
                    <div style={{ display:'flex',alignItems:'center',gap:6,flex:1,flexWrap:'wrap' }}>
                      <select value={day.site_id||''} onChange={e => upd(date,'site_id',e.target.value)} style={{ ...iS,flex:'1 1 120px',minWidth:100,padding:'6px 8px' }}>
                        {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                      <select value={day.start_time||'10:00'} onChange={e => upd(date,'start_time',e.target.value)} style={{ ...iS,width:80,padding:'6px 6px',fontFamily:"'JetBrains Mono', monospace" }}>
                        {Array.from({length:24},(_,h)=>['00','30'].map(m=>`${String(h).padStart(2,'0')}:${m}`)).flat().map(t=><option key={t} value={t}>{t}</option>)}
                      </select>
                      <span style={{ fontSize:11,color:'#4a5568' }}>a</span>
                      <select value={day.end_time||'19:00'} onChange={e => upd(date,'end_time',e.target.value)} style={{ ...iS,width:80,padding:'6px 6px',fontFamily:"'JetBrains Mono', monospace" }}>
                        {Array.from({length:24},(_,h)=>['00','30'].map(m=>`${String(h).padStart(2,'0')}:${m}`)).flat().map(t=><option key={t} value={t}>{t}</option>)}
                      </select>
                      <select value={day.lunch_mins??60} onChange={e => upd(date,'lunch_mins',parseInt(e.target.value))} style={{ ...iS,width:'auto',padding:'6px 8px' }}>
                        <option value={0}>Sin comida</option><option value={30}>30m</option><option value={45}>45m</option><option value={60}>60m</option><option value={90}>90m</option>
                      </select>
                      <button onClick={() => copyToAll(date)} style={{ background:'none',border:'1px solid #1e2a45',borderRadius:4,color:'#8892a8',fontSize:9,padding:'3px 8px',cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap' }}>Copiar a todos</button>
                    </div>
                  ) : <span style={{ fontSize:11,color:'#4a5568' }}>Descansa</span>}
                </div>
              </div>
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button disabled={saving} onClick={save} style={{ flex:1,padding:'11px 16px',borderRadius:7,border:'none',background:'#3b82f6',color:'#fff',fontSize:13,fontWeight:600,cursor:saving?'wait':'pointer',fontFamily:'inherit' }}>{saving?'Guardando...':'Guardar Semana'}</button>
          <button onClick={onClose} style={{ padding:'11px 16px',borderRadius:7,border:'1px solid #1e2a45',background:'transparent',color:'#8892a8',fontSize:12,cursor:'pointer',fontFamily:'inherit' }}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}

function AdminUserModal({ data, sites, onSave, onClose }) {
  const [name, setName]     = useState(data?.name || '')
  const [email, setEmail]   = useState(data?.email || '')
  const [role, setRole]     = useState(data?.role || 'manager')
  const [selSites, setSelSites] = useState((data?.admin_site_permissions || []).map(p => p.site_id))
  const [saving, setSaving] = useState(false)
  const [err, setErr]       = useState('')
  const valid = name.trim() && email.trim()

  async function handleSave() {
    setSaving(true); setErr('')
    try {
      if (data?.id) {
        await supabase.from('admin_users').update({ name, role }).eq('id', data.id)
        await supabase.from('admin_site_permissions').delete().eq('admin_user_id', data.id)
        if (role !== 'superadmin' && selSites.length > 0) await supabase.from('admin_site_permissions').insert(selSites.map(site_id => ({ admin_user_id: data.id, site_id })))
      } else {
        const res = await fetch('/api/admin/invite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim().toLowerCase(), name, role, site_ids: selSites }) })
        const json = await res.json()
        if (!res.ok) { setErr(json.error || 'Error al invitar usuario'); setSaving(false); return }
      }
      onSave()
    } catch (e) { setErr('Error inesperado. Intenta de nuevo.'); setSaving(false) }
  }

  const iS = { width:'100%',background:'#0d1220',border:'1px solid #1e2a45',color:'#f1f5f9',fontSize:12,padding:'8px 10px',borderRadius:6,outline:'none',fontFamily:'inherit' }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#1a2035', border: '1px solid #1e2a45', borderRadius: 12, padding: 22, width: '100%', maxWidth: 460, maxHeight: '85vh', overflow: 'auto' }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>{data ? 'Editar Usuario' : 'Invitar Usuario Admin'}</h3>
        {err && <div style={{ background:'rgba(239,68,68,.1)',border:'1px solid rgba(239,68,68,.25)',borderRadius:7,padding:'10px 14px',fontSize:12,color:'#ef4444',marginBottom:14 }}>{err}</div>}
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize:10,fontWeight:600,color:'#8892a8',display:'block',marginBottom:4 }}>Nombre</label>
          <input value={name} onChange={e => setName(e.target.value)} style={iS} />
        </div>
        {!data && (
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize:10,fontWeight:600,color:'#8892a8',display:'block',marginBottom:4 }}>Email</label>
            <input type='email' value={email} onChange={e => setEmail(e.target.value)} style={iS} />
            <div style={{ fontSize:10,color:'#4a5568',marginTop:4 }}>Recibirá un email para crear su contraseña</div>
          </div>
        )}
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize:10,fontWeight:600,color:'#8892a8',display:'block',marginBottom:4 }}>Rol</label>
          <select value={role} onChange={e => setRole(e.target.value)} style={iS}>
            <option value='manager'>Gerente</option><option value='superadmin'>Super Admin</option>
          </select>
        </div>
        {role !== 'superadmin' && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize:10,fontWeight:600,color:'#8892a8',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:8 }}>Sucursales que puede ver</div>
            <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
              {sites.map(s => (
                <label key={s.id} style={{ display:'flex',alignItems:'center',gap:8,fontSize:12,cursor:'pointer',color:'#f1f5f9',padding:'6px 10px',borderRadius:6,background:selSites.includes(s.id)?'rgba(59,130,246,.1)':'transparent',border:'1px solid '+(selSites.includes(s.id)?'rgba(59,130,246,.3)':'#1e2a45') }}>
                  <input type='checkbox' checked={selSites.includes(s.id)} onChange={() => setSelSites(p => p.includes(s.id)?p.filter(x=>x!==s.id):[...p,s.id])} style={{ accentColor:'#3b82f6' }} />
                  {s.name}
                </label>
              ))}
            </div>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button disabled={!valid||saving} onClick={handleSave} style={{ flex:1,padding:'10px 16px',borderRadius:7,border:'none',background:valid&&!saving?'#3b82f6':'#1e2a45',color:'#fff',fontSize:12,fontWeight:600,cursor:valid&&!saving?'pointer':'not-allowed',fontFamily:'inherit' }}>
            {saving?'Guardando...':data?'Guardar':'Enviar invitación'}
          </button>
          <button onClick={onClose} style={{ padding:'10px 16px',borderRadius:7,border:'1px solid #1e2a45',background:'transparent',color:'#8892a8',fontSize:12,cursor:'pointer',fontFamily:'inherit' }}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}
