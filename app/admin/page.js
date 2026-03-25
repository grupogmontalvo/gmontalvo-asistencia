'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
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
function slugify(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
function autoCode(name) {
  const base = name.toUpperCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6)
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase()
  return base + rand
}
export default function AdminPage() {
  const router = useRouter()
  const [authUser,  setAuthUser]  = useState(null)
  const [adminUser, setAdminUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [sites, setSites]       = useState([])
  const [emps, setEmps]         = useState([])
  // FIX BUG 2: allEmps guarda TODOS los empleados para resolver nombres en tablas
  const [allEmps, setAllEmps]   = useState([])
  const [att, setAtt]           = useState([])
  const [schedules, setSchedules] = useState([])
  const [adminUsers, setAdminUsers] = useState([])
  const [goals, setGoals]       = useState([])
  const [companies, setCompanies] = useState([])
  const [selectedCompanyId, setSelectedCompanyId] = useState('')
  const [employeeSiteAssignments, setEmployeeSiteAssignments] = useState([])
  const [siteHours, setSiteHours] = useState([])
  const [tab, setTab]         = useState('dashboard')
  const [modal, setModal]     = useState(null)
  const [empPage, setEmpPage] = useState(null)
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
    if (typeof window !== 'undefined' && window.innerWidth < 768) setSidebarOpen(false)
  }, [])
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
  const isCompanyAdmin = adminUser?.role === 'company_admin'
  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }
  const load = useCallback(async () => {
    if (!adminUser) return
    setLoading(true)
    const companyId = isSuperAdmin ? (selectedCompanyId || null) : adminUser.company_id
    if (isSuperAdmin) {
      const { data: comps } = await supabase.from('companies').select('*').order('name')
      setCompanies(comps || [])
    } else if (isCompanyAdmin) {
      const { data: comps } = await supabase.from('companies').select('*').eq('id', adminUser.company_id)
      setCompanies(comps || [])
    }
    let sitesQuery = supabase.from('sites').select('*').eq('active', true).order('name')
    let permSiteIds = null
    if (!isSuperAdmin && !isCompanyAdmin) {
      const { data: perms } = await supabase.from('admin_site_permissions').select('site_id').eq('admin_user_id', adminUser.id)
      permSiteIds = (perms || []).map(p => p.site_id)
      if (permSiteIds.length === 0) { setSites([]); setEmps([]); setAllEmps([]); setAtt([]); setSchedules([]); setLoading(false); return }
      sitesQuery = sitesQuery.in('id', permSiteIds)
    } else if (companyId) {
      sitesQuery = sitesQuery.eq('company_id', companyId)
    }
    // emps: empleados para gestión (filtrados por sucursal asignada)
    let empsQuery = supabase.from('employees').select('*').eq('active', true).order('name')
    if (companyId) empsQuery = empsQuery.eq('company_id', companyId)
    if (!isSuperAdmin && !isCompanyAdmin && permSiteIds) {
      const { data: empAssignments } = await supabase
        .from('employee_site_assignments')
        .select('employee_id')
        .in('site_id', permSiteIds)
      const visibleEmpIds = [...new Set((empAssignments || []).map(a => a.employee_id))]
      if (visibleEmpIds.length === 0) {
        empsQuery = empsQuery.in('id', ['00000000-0000-0000-0000-000000000000'])
      } else {
        empsQuery = empsQuery.in('id', visibleEmpIds)
      }
    }
    // FIX BUG 2: allEmpsQuery carga TODOS los empleados de la empresa (para resolver nombres en attendance)
    let allEmpsQuery = supabase.from('employees').select('id, name, email, role, phone, skip_sales, skip_photo, free_roam, fixed_week').eq('active', true).order('name')
    if (companyId) allEmpsQuery = allEmpsQuery.eq('company_id', companyId)

    let attQuery = supabase.from('attendance').select('*').order('date', { ascending: false })
    if (companyId) attQuery = attQuery.eq('company_id', companyId)

    // FIX BUG 1: para gerentes, también cargamos attendance de sus sucursales (no solo de empleados asignados)
    if (!isSuperAdmin && !isCompanyAdmin && permSiteIds) {
      attQuery = attQuery.in('site_id', permSiteIds)
    }

    let scQuery = supabase.from('schedules').select('*')
    // Para gerentes: filtrar por site_id (confiable) en lugar de company_id (muchos registros no lo tienen)
    if (!isSuperAdmin && !isCompanyAdmin && permSiteIds && permSiteIds.length > 0) {
      scQuery = scQuery.in('site_id', permSiteIds)
    } else if (companyId) {
      scQuery = scQuery.eq('company_id', companyId)
    }
    const [s, e, ae, a, sc, g, esa, sh] = await Promise.all([
      sitesQuery, empsQuery, allEmpsQuery, attQuery, scQuery,
      supabase.from('employee_goals').select('*'),
      supabase.from('employee_site_assignments').select('*'),
      supabase.from('site_hours').select('*'),
    ])
    setSites(s.data || [])
    setEmps(e.data || [])
    setAllEmps(ae.data || [])
    setAtt(a.data || [])
    setSchedules(sc.data || [])
    setGoals(g.data || [])
    setEmployeeSiteAssignments(esa.data || [])
    setSiteHours(sh.data || [])
    if (isSuperAdmin) {
      const { data: au } = await supabase.from('admin_users').select('*, admin_site_permissions(site_id)').order('created_at')
      setAdminUsers(au || [])
    } else if (isCompanyAdmin) {
      const { data: au } = await supabase.from('admin_users').select('*, admin_site_permissions(site_id)').eq('company_id', adminUser.company_id).order('created_at')
      setAdminUsers(au || [])
    }
    setLoading(false)
  }, [adminUser, isSuperAdmin, isCompanyAdmin, selectedCompanyId])
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

  // FIX BUG 1: dashRows incluye empleados con schedule Y sin schedule que hicieron check-in hoy
  const dashRows = todaySchedules.map(sc => {
    // FIX BUG 1: buscar en allEmps (no solo emps) para encontrar cualquier empleado
    const emp     = allEmps.find(e => e.id === sc.employee_id)
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
  // FIX BUG 1: unscheduledAtt también resuelve nombres usando allEmps
  const unscheduledAtt  = todayAtt.filter(r => !scheduledEmpIds.has(r.employee_id))
  const sitesWorking = new Set([
    ...dashRows.filter(r => r.record && !r.record.check_out).map(r => r.sc.site_id),
    ...unscheduledAtt.filter(r => !r.check_out).map(r => r.site_id)
  ]).size
  const peopleWorking = dashRows.filter(r => r.record && !r.record.check_out).length
    + unscheduledAtt.filter(r => !r.check_out).length
  const filteredAtt = att.filter(r => {
    if (filterEmp    && r.employee_id !== filterEmp)   return false
    if (filterSite   && r.site_id !== filterSite)       return false
    if (filterFrom   && r.date < filterFrom)            return false
    if (filterTo     && r.date > filterTo)              return false
    if (filterStatus && r.status !== filterStatus)      return false
    return true
  })
  async function saveSite(data) {
    const companyId = isSuperAdmin ? (selectedCompanyId || companies[0]?.id) : adminUser.company_id
    if (!data.id) {
      delete data.id
      data.company_id = companyId
      if (!data.code) data.code = autoCode(data.name)
      await supabase.from('sites').insert(data)
    } else {
      await supabase.from('sites').update(data).eq('id', data.id)
    }
    setToast('Sitio guardado'); setModal(null); load()
  }
  async function saveEmp(data, weeklyGoal, siteIds) {
    const companyId = isSuperAdmin ? (selectedCompanyId || companies[0]?.id) : adminUser.company_id
    let empId = data.id
    if (empId) {
      await supabase.from('employees').update(data).eq('id', empId)
    } else {
      delete data.id
      data.company_id = companyId
      const { data: newEmp } = await supabase.from('employees').insert(data).select().single()
      empId = newEmp?.id
    }
    if (empId) {
      if (weeklyGoal && parseFloat(weeklyGoal) > 0) {
        await supabase.from('employee_goals').upsert({ employee_id: empId, weekly_goal: parseFloat(weeklyGoal) }, { onConflict: 'employee_id' })
      } else {
        await supabase.from('employee_goals').delete().eq('employee_id', empId)
      }
      await supabase.from('employee_site_assignments').delete().eq('employee_id', empId)
      if (siteIds && siteIds.length > 0) {
        await supabase.from('employee_site_assignments').insert(siteIds.map(site_id => ({ employee_id: empId, site_id })))
      }
    }
    setToast('Empleado guardado'); setModal(null); load()
  }
  async function saveCompany(data) {
    if (data.id) { await supabase.from('companies').update(data).eq('id', data.id) }
    else { delete data.id; await supabase.from('companies').insert(data) }
    setToast('Empresa guardada'); setModal(null); load()
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
  if (empPage) {
    const empAtt = att.filter(r => r.employee_id === empPage.id)
    return (
      <div style={{ background: '#0a0e1a', minHeight: '100vh', fontFamily: "'DM Sans', sans-serif", color: '#f1f5f9', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '12px 18px', borderBottom: '1px solid #1e2a45', background: '#111827', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <button onClick={() => setEmpPage(null)} style={{ background: 'none', border: '1px solid #1e2a45', borderRadius: 7, color: '#8892a8', cursor: 'pointer', padding: '6px 14px', fontSize: 13, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>← Volver</button>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{empPage.name}</div>
            <div style={{ fontSize: 11, color: '#8892a8' }}>{empPage.email} · {empPage.role}</div>
          </div>
        </div>
        <EmpSidePanel emp={empPage} att={empAtt} sites={sites} onClose={() => setEmpPage(null)} onRefresh={load} fullPage />
      </div>
    )
  }
  const inputStyle = { width: '100%', background: '#0d1220', border: '1px solid #1e2a45', color: '#f1f5f9', fontSize: 12, padding: '7px 10px', borderRadius: 6, outline: 'none', fontFamily: 'inherit' }
  const selectStyle = { ...inputStyle }
  const activeCompany = isSuperAdmin
    ? (selectedCompanyId ? companies.find(c => c.id === selectedCompanyId) : null)
    : companies.find(c => c.id === adminUser?.company_id)
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: "'DM Sans', sans-serif", background: '#0a0e1a', color: '#f1f5f9' }}>
      <style>{`@media(max-width:767px){.sb-overlay{display:block!important}}`}</style>
      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} className="sb-overlay" style={{ display: 'none', position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 99 }} />}
      <div style={{ width: sidebarOpen ? 210 : 0, minWidth: sidebarOpen ? 210 : 0, background: '#111827', borderRight: sidebarOpen ? '1px solid #1e2a45' : 'none', display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden', transition: 'width .2s ease, min-width .2s ease', position: 'relative', zIndex: 100 }}>
        <div style={{ width: 210, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ padding: 16, borderBottom: '1px solid #1e2a45', display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/logo.jpeg" style={{ width: 32, height: 32, borderRadius: 8 }} alt="GM" />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>G.Montalvo</div>
              <div style={{ fontSize: 9, color: '#8892a8' }}>Control de Asistencia</div>
            </div>
          </div>
          {isSuperAdmin && (
            <div style={{ padding: '8px 10px', borderBottom: '1px solid #1e2a45', background: 'rgba(59,130,246,.05)' }}>
              <div style={{ fontSize: 9, color: '#4a5568', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>Empresa</div>
              <select value={selectedCompanyId} onChange={e => setSelectedCompanyId(e.target.value)} style={{ width: '100%', background: '#0d1220', border: '1px solid #1e2a45', color: '#f1f5f9', fontSize: 11, padding: '5px 8px', borderRadius: 5, fontFamily: 'inherit' }}>
                <option value=''>Todas</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
          <nav style={{ flex: 1, padding: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: '#4a5568', padding: '8px 8px 4px' }}>Principal</div>
            {[{ id: 'dashboard', lb: 'Dashboard' }, { id: 'stores', lb: '🏪 Tiendas' }, { id: 'schedules', lb: '📅 Horarios' }, { id: 'attendance', lb: 'Asistencia' }].map(n => (
              <button key={n.id} onClick={() => { setTab(n.id); if (window.innerWidth < 768) setSidebarOpen(false) }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500, color: tab === n.id ? '#3b82f6' : '#8892a8', background: tab === n.id ? 'rgba(59,130,246,.12)' : 'transparent', border: 'none', width: '100%', textAlign: 'left', fontFamily: 'inherit' }}>{n.lb}</button>
            ))}
            <div style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: '#4a5568', padding: '12px 8px 4px' }}>Gestión</div>
            {[{ id: 'employees', lb: 'Empleados' }, { id: 'sites', lb: 'Sitios' }].map(n => (
              <button key={n.id} onClick={() => { setTab(n.id); if (window.innerWidth < 768) setSidebarOpen(false) }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500, color: tab === n.id ? '#3b82f6' : '#8892a8', background: tab === n.id ? 'rgba(59,130,246,.12)' : 'transparent', border: 'none', width: '100%', textAlign: 'left', fontFamily: 'inherit' }}>{n.lb}</button>
            ))}
            {(isSuperAdmin || isCompanyAdmin) && <>
              <div style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: '#4a5568', padding: '12px 8px 4px' }}>Admin</div>
              {[{ id: 'users', lb: 'Usuarios' }, ...(isSuperAdmin ? [{ id: 'companies', lb: 'Empresas' }] : [])].map(n => (
                <button key={n.id} onClick={() => { setTab(n.id); if (window.innerWidth < 768) setSidebarOpen(false) }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500, color: tab === n.id ? '#3b82f6' : '#8892a8', background: tab === n.id ? 'rgba(59,130,246,.12)' : 'transparent', border: 'none', width: '100%', textAlign: 'left', fontFamily: 'inherit' }}>{n.lb}</button>
              ))}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h1 style={{ fontSize: 17, fontWeight: 700 }}>{{ dashboard: 'Dashboard', stores: 'Tiendas', schedules: 'Horarios', attendance: 'Asistencia', employees: 'Empleados', sites: 'Sitios', users: 'Usuarios', companies: 'Empresas' }[tab]}</h1>
                {activeCompany && <span style={{ fontSize: 10, color: '#3b82f6', background: 'rgba(59,130,246,.1)', border: '1px solid rgba(59,130,246,.2)', borderRadius: 4, padding: '2px 8px', fontWeight: 600 }}>{activeCompany.name}</span>}
              </div>
              <p style={{ fontSize: 11, color: '#8892a8', marginTop: 1 }}>{new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Cancun' })}</p>
            </div>
          </div>
          {tab === 'employees'  && <button onClick={() => setModal({ type: 'emp', data: null })} style={{ padding: '7px 14px', borderRadius: 7, border: 'none', background: '#3b82f6', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>+ Nuevo Empleado</button>}
          {tab === 'sites'      && <button onClick={() => setModal({ type: 'site', data: null })} style={{ padding: '7px 14px', borderRadius: 7, border: 'none', background: '#3b82f6', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>+ Nuevo Sitio</button>}
          {tab === 'users'      && (isSuperAdmin || isCompanyAdmin) && <button onClick={() => setModal({ type: 'adminUser', data: null })} style={{ padding: '7px 14px', borderRadius: 7, border: 'none', background: '#3b82f6', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>+ Nuevo Usuario</button>}
          {tab === 'companies'  && isSuperAdmin && <button onClick={() => setModal({ type: 'company', data: null })} style={{ padding: '7px 14px', borderRadius: 7, border: 'none', background: '#3b82f6', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>+ Nueva Empresa</button>}
        </div>
        <div style={{ flex: 1, padding: '14px 12px', overflow: 'auto' }}>
          {tab === 'dashboard' && <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 18 }}>
              <div style={{ background: '#1a2035', border: '1px solid #1e2a45', borderRadius: 10, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ fontSize: 28 }}>🏪</div>
                <div>
                  <div style={{ fontSize: 11, color: '#8892a8', marginBottom: 4 }}>Tiendas abiertas</div>
                  <div style={{ fontSize: 36, fontWeight: 700, fontFamily: "'JetBrains Mono'", color: '#10b981', lineHeight: 1 }}>{sitesWorking}</div>
                </div>
              </div>
              <div style={{ background: '#1a2035', border: '1px solid #1e2a45', borderRadius: 10, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ fontSize: 28 }}>👥</div>
                <div>
                  <div style={{ fontSize: 11, color: '#8892a8', marginBottom: 4 }}>Personas trabajando</div>
                  <div style={{ fontSize: 36, fontWeight: 700, fontFamily: "'JetBrains Mono'", color: '#3b82f6', lineHeight: 1 }}>{peopleWorking}</div>
                </div>
              </div>
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
                  <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
                    <thead><tr>{['Empleado','Horario','Entrada','Salida','Ventas','Estado'].map(h => (
                      <th key={h} style={{ textAlign: 'left', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.6px', color: '#4a5568', padding: '8px 16px', borderBottom: '1px solid #1e2a45' }}>{h}</th>
                    ))}</tr></thead>
                    <tbody>
                      {siteRows.map(({ sc, emp, record, color, bg, statusLabel }) => (
                        <tr key={sc.id} style={{ borderBottom: '1px solid rgba(30,42,69,.3)' }}>
                          <td style={{ padding: '10px 16px' }}>
                            <button onClick={() => setEmpPage(emp)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: '#3b82f6', textDecoration: 'underline', textDecorationColor: 'rgba(59,130,246,.3)' }}>{emp?.name || '?'}</div>
                              <div style={{ fontSize: 10, color: '#4a5568' }}>{emp?.role}</div>
                            </button>
                          </td>
                          <td style={{ padding: '10px 16px', fontSize: 11, fontFamily: "'JetBrains Mono'", color: '#8892a8' }}>{sc.start_time?.slice(0,5)} – {sc.end_time?.slice(0,5)}</td>
                          <td style={{ padding: '10px 16px', fontSize: 11, fontFamily: "'JetBrains Mono'" }}>{record?.check_in ? fmtTime(record.check_in, site.timezone) : '–'}</td>
                          <td style={{ padding: '10px 16px', fontSize: 11, fontFamily: "'JetBrains Mono'" }}>{record?.check_out ? fmtTime(record.check_out, site.timezone) : '–'}</td>
                          <td style={{ padding: '10px 16px', fontSize: 11, fontFamily: "'JetBrains Mono'", color: record?.sales_amount > 0 ? '#10b981' : '#4a5568' }}>{record?.sales_amount > 0 ? '$'+Number(record.sales_amount).toLocaleString('es-MX') : '–'}</td>
                          <td style={{ padding: '10px 16px' }}><span style={{ padding: '3px 10px', borderRadius: 5, fontSize: 10, fontWeight: 600, color, background: bg }}>{statusLabel}</span></td>
                        </tr>
                      ))}
                      {siteUnscheduled.map(r => {
                        // FIX BUG 1: buscar en allEmps para encontrar cualquier empleado aunque no esté asignado
                        const emp = allEmps.find(e => e.id === r.employee_id)
                        const color = r.check_out ? '#3b82f6' : '#10b981'; const bg = r.check_out ? 'rgba(59,130,246,.12)' : 'rgba(16,185,129,.12)'; const label = r.check_out ? 'Completó turno' : 'Activo'
                        return (
                          <tr key={r.id} style={{ borderBottom: '1px solid rgba(30,42,69,.3)', background: 'rgba(16,185,129,.03)' }}>
                            <td style={{ padding: '10px 16px' }}>
                              <button onClick={() => setEmpPage(emp)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: '#3b82f6', textDecoration: 'underline', textDecorationColor: 'rgba(59,130,246,.3)' }}>{emp?.name || '?'}</div>
                                <div style={{ fontSize: 10, color: '#4a5568' }}>{emp?.role}</div>
                              </button>
                            </td>
                            <td style={{ padding: '10px 16px', fontSize: 10, color: '#4a5568', fontStyle: 'italic' }}>Sin horario</td>
                            <td style={{ padding: '10px 16px', fontSize: 11, fontFamily: "'JetBrains Mono'" }}>{fmtTime(r.check_in, site.timezone)}</td>
                            <td style={{ padding: '10px 16px', fontSize: 11, fontFamily: "'JetBrains Mono'" }}>{r.check_out ? fmtTime(r.check_out, site.timezone) : '–'}</td>
                            <td style={{ padding: '10px 16px', fontSize: 11, fontFamily: "'JetBrains Mono'", color: r.sales_amount > 0 ? '#10b981' : '#4a5568' }}>{r.sales_amount > 0 ? '$'+Number(r.sales_amount).toLocaleString('es-MX') : '–'}</td>
                            <td style={{ padding: '10px 16px' }}><span style={{ padding: '3px 10px', borderRadius: 5, fontSize: 10, fontWeight: 600, color, background: bg }}>{label}</span></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  </div>
                </div>
              )
            })}
            {dashRows.length === 0 && unscheduledAtt.length === 0 && (
              <div style={{ padding: 32, textAlign: 'center', color: '#4a5568', fontSize: 13, background: '#1a2035', borderRadius: 10, border: '1px solid #1e2a45' }}>No hay horarios cargados para hoy.</div>
            )}
          </>}
          {tab === 'attendance' && <>
            <div style={{ background: '#1a2035', border: '1px solid #1e2a45', borderRadius: 10, padding: '14px 16px', marginBottom: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
              {/* FIX BUG 2: usar allEmps para el filtro de empleados */}
              {[['Empleado', filterEmp, setFilterEmp, allEmps.map(e => [e.id, e.name])],['Sucursal', filterSite, setFilterSite, sites.map(s => [s.id, s.name])]].map(([l, val, set, opts]) => (
                <div key={l}>
                  <div style={{ fontSize: 10, color: '#4a5568', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>{l}</div>
                  <select value={val} onChange={e => set(e.target.value)} style={selectStyle}>
                    <option value=''>Todos</option>
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
              <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                <thead><tr>{['Fecha','Empleado','Sucursal','Entrada','Salida','Horas','Ventas','Estado'].map(h => (
                  <th key={h} style={{ textAlign: 'left', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.6px', color: '#4a5568', padding: '9px 16px', borderBottom: '1px solid #1e2a45' }}>{h}</th>
                ))}</tr></thead>
                <tbody>
                  {filteredAtt.slice(0, 300).map(r => {
                    // FIX BUG 2: buscar en allEmps para que siempre resuelva el nombre
                    const emp = allEmps.find(e => e.id === r.employee_id); const site = sites.find(s => s.id === r.site_id)
                    return (
                      <tr key={r.id} style={{ borderBottom: '1px solid rgba(30,42,69,.3)' }}>
                        <td style={{ padding: '9px 16px', fontSize: 11, fontFamily: "'JetBrains Mono'" }}>{fmtDate(r.date)}</td>
                        <td style={{ padding: '9px 16px' }}><button onClick={() => setEmpPage(emp)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}><span style={{ fontSize: 12, fontWeight: 600, color: '#3b82f6', textDecoration: 'underline', textDecorationColor: 'rgba(59,130,246,.3)' }}>{emp?.name || '?'}</span></button></td>
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
            </div>
          </>}
          {tab === 'stores' && <StoresDashboard sites={sites} att={todayAtt} schedules={todaySchedules} allEmps={allEmps} siteHours={siteHours} today={today} onEditSite={s => setModal({ type: 'site', data: s })} />}
          {tab === 'schedules' && <ScheduleBoard sites={sites} allEmps={allEmps} schedules={schedules} employeeSiteAssignments={employeeSiteAssignments} siteHours={siteHours} isSuperAdmin={isSuperAdmin} adminUser={adminUser} onRefresh={load} setToast={setToast} />}
          {tab === 'employees' && (
            <div style={{ background: '#1a2035', border: '1px solid #1e2a45', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                <thead><tr>{['Empleado','Email','Rol','Sucursales','Meta semanal','Próx. turno',''].map(h => (
                  <th key={h} style={{ textAlign: 'left', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.6px', color: '#4a5568', padding: '9px 16px', borderBottom: '1px solid #1e2a45' }}>{h}</th>
                ))}</tr></thead>
                <tbody>
                  {emps.map(emp => {
                    const empScheds = schedules.filter(s => s.employee_id === emp.id && s.date >= today).sort((a,b) => a.date.localeCompare(b.date))
                    const nextSched = empScheds[0]; const nextSite = nextSched ? sites.find(s => s.id === nextSched.site_id) : null
                    const goal = goals.find(g => g.employee_id === emp.id)
                    const empSiteIds = employeeSiteAssignments.filter(a => a.employee_id === emp.id).map(a => a.site_id)
                    const empSiteNames = empSiteIds.map(sid => sites.find(s => s.id === sid)?.name).filter(Boolean)
                    return (
                      <tr key={emp.id} style={{ borderBottom: '1px solid rgba(30,42,69,.3)' }}>
                        <td style={{ padding: '9px 16px' }}>
                          <button onClick={() => setEmpPage(emp)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
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
                          {empSiteNames.length > 0
                            ? <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                {empSiteNames.map(n => (
                                  <span key={n} style={{ fontSize: 10, color: '#3b82f6', background: 'rgba(59,130,246,.1)', border: '1px solid rgba(59,130,246,.2)', borderRadius: 4, padding: '1px 7px' }}>{n}</span>
                                ))}
                              </div>
                            : <span style={{ fontSize: 10, color: '#f59e0b' }}>Sin asignar</span>
                          }
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
                            <button onClick={() => setEmpPage(emp)} style={{ padding: '4px 10px', borderRadius: 5, border: '1px solid rgba(16,185,129,.25)', background: 'rgba(16,185,129,.1)', color: '#10b981', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Historial</button>
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
              </div>
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
          {tab === 'users' && (isSuperAdmin || isCompanyAdmin) && (
            <div style={{ background: '#1a2035', border: '1px solid #1e2a45', borderRadius: 10, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                <thead><tr>{['Usuario','Email','Empresa','Rol','Sucursales',''].map(h => (
                  <th key={h} style={{ textAlign: 'left', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.6px', color: '#4a5568', padding: '9px 16px', borderBottom: '1px solid #1e2a45' }}>{h}</th>
                ))}</tr></thead>
                <tbody>
                  {adminUsers.map(au => {
                    const auSites = (au.admin_site_permissions || []).map(p => sites.find(s => s.id === p.site_id)?.name).filter(Boolean)
                    const auCompany = companies.find(c => c.id === au.company_id)
                    const isActive = au.active !== false
                    return (
                      <tr key={au.id} style={{ borderBottom: '1px solid rgba(30,42,69,.3)', opacity: isActive ? 1 : 0.5 }}>
                        <td style={{ padding: '9px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: isActive ? '#10b981' : '#4a5568', flexShrink: 0 }} />
                            <div style={{ fontSize: 12, fontWeight: 600 }}>{au.name}</div>
                          </div>
                        </td>
                        <td style={{ padding: '9px 16px', fontSize: 11, color: '#8892a8' }}>{au.email}</td>
                        <td style={{ padding: '9px 16px', fontSize: 11, color: '#8892a8' }}>{au.role === 'superadmin' ? <span style={{ color: '#4a5568' }}>—</span> : (auCompany?.name || <span style={{ color: '#ef4444' }}>Sin empresa</span>)}</td>
                        <td style={{ padding: '9px 16px' }}><span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, color: au.role === 'superadmin' ? '#3b82f6' : au.role === 'company_admin' ? '#a855f7' : '#10b981', background: au.role === 'superadmin' ? 'rgba(59,130,246,.12)' : au.role === 'company_admin' ? 'rgba(168,85,247,.12)' : 'rgba(16,185,129,.12)' }}>{au.role === 'superadmin' ? 'Super Admin' : au.role === 'company_admin' ? 'Admin Empresa' : 'Gerente'}</span></td>
                        <td style={{ padding: '9px 16px', fontSize: 11, color: '#8892a8' }}>{au.role === 'superadmin' ? <span style={{ color: '#4a5568' }}>Todas</span> : au.role === 'company_admin' ? <span style={{ color: '#4a5568' }}>Empresa</span> : auSites.length > 0 ? auSites.join(', ') : <span style={{ color: '#ef4444' }}>Sin asignar</span>}</td>
                        <td style={{ padding: '9px 16px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => setModal({ type: 'adminUser', data: au })} style={{ background: 'none', border: 'none', color: '#8892a8', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>Editar</button>
                            {au.id !== authUser?.id && (
                              isActive
                                ? <button onClick={async () => { if (confirm('Desactivar a ' + au.name + '?')) { await supabase.from('admin_users').update({ active: false }).eq('id', au.id); await load(); setToast('Usuario desactivado') } }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>Desactivar</button>
                                : <button onClick={async () => { await supabase.from('admin_users').update({ active: true }).eq('id', au.id); await load(); setToast('Usuario reactivado') }} style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>Reactivar</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {adminUsers.length === 0 && <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#4a5568', fontSize: 12 }}>No hay usuarios admin.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
          {tab === 'companies' && isSuperAdmin && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {companies.map(company => {
                const compEmps  = emps.filter(e => e.company_id === company.id).length
                const compSites = sites.filter(s => s.company_id === company.id).length
                return (
                  <div key={company.id} style={{ background: '#1a2035', border: '1px solid #1e2a45', borderRadius: 10, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{company.name}</div>
                      <div style={{ fontSize: 11, color: '#4a5568', fontFamily: "'JetBrains Mono'" }}>slug: {company.slug}</div>
                      <div style={{ fontSize: 10, color: '#8892a8', marginTop: 4 }}>{compSites} sucursal{compSites !== 1 ? 'es' : ''} · {compEmps} empleado{compEmps !== 1 ? 's' : ''}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button onClick={() => setSelectedCompanyId(company.id)} style={{ padding: '5px 10px', borderRadius: 5, border: '1px solid rgba(59,130,246,.25)', background: selectedCompanyId === company.id ? 'rgba(59,130,246,.2)' : 'rgba(59,130,246,.1)', color: '#3b82f6', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Ver datos</button>
                      <button onClick={() => setModal({ type: 'company', data: company })} style={{ background: 'none', border: 'none', color: '#8892a8', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>Editar</button>
                    </div>
                  </div>
                )
              })}
              {companies.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: '#4a5568', fontSize: 12, background: '#1a2035', borderRadius: 10, border: '1px solid #1e2a45' }}>No hay empresas.</div>}
            </div>
          )}
        </div>
      </div>
      {modal?.type === 'emp' && <EmpModal
        data={modal.data?.emp || null}
        currentGoal={modal.data?.goal?.weekly_goal || ''}
        sites={sites}
        currentSiteIds={modal.data?.emp ? employeeSiteAssignments.filter(a => a.employee_id === modal.data.emp.id).map(a => a.site_id) : []}
        onSave={saveEmp}
        onClose={() => setModal(null)}
      />}
      {modal?.type === 'site'      && <SiteModal      data={modal.data} onSave={saveSite} onClose={() => setModal(null)} />}
      {modal?.type === 'qr'        && <QrModal        site={modal.data} url={getSiteUrl(modal.data.code)} onClose={() => setModal(null)} />}
      {modal?.type === 'schedule'  && <ScheduleModal  emp={modal.data} sites={sites} schedules={schedules.filter(s => s.employee_id === modal.data.id)} onSave={async () => { await load(); setToast('Horarios guardados'); setModal(null) }} onClose={() => setModal(null)} />}
      {modal?.type === 'adminUser' && <AdminUserModal data={modal.data} sites={sites} companies={companies} isSuperAdmin={isSuperAdmin} isCompanyAdmin={isCompanyAdmin} adminUser={adminUser} onSave={async () => { await load(); setToast('Usuario guardado'); setModal(null) }} onClose={() => setModal(null)} />}
      {modal?.type === 'company'   && <CompanyModal   data={modal.data} onSave={saveCompany} onClose={() => setModal(null)} />}
      {toast && <div style={{ position: 'fixed', bottom: 20, right: 20, background: '#1a2035', border: '1px solid rgba(16,185,129,.25)', borderRadius: 8, padding: '10px 16px', fontSize: 12, fontWeight: 500, zIndex: 200, color: '#10b981' }}>{toast}</div>}
    </div>
  )
}
// ─── Emp Side Panel ───────────────────────────────────────────────────────────
const ALL_COLS = [
  { key: 'date', label: 'Fecha' }, { key: 'site', label: 'Sucursal' }, { key: 'checkin', label: 'Entrada' },
  { key: 'checkout', label: 'Salida' }, { key: 'hours', label: 'Horas' }, { key: 'time_out', label: 'T. Fuera' },
  { key: 'sales', label: 'Venta' }, { key: 'photo_in', label: 'Foto In' }, { key: 'photo_out', label: 'Foto Out' },
  { key: 'gps', label: 'GPS' }, { key: 'status', label: 'Estado' },
]
function EmpSidePanel({ emp, att, sites, onClose, onRefresh, fullPage }) {
  const [from, setFrom] = useState('')
  const [to,   setTo]   = useState('')
  const [visibleCols, setVisibleCols] = useState(['date','site','checkin','checkout','hours','time_out','sales','photo_in','photo_out','gps','status'])
  const [showColPicker, setShowColPicker] = useState(false)
  const [editingSale, setEditingSale] = useState(null)
  const [saleErr, setSaleErr] = useState('')
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
  async function saveSale(attId) {
    setSaleErr('')
    const val = parseFloat(editingSale.value)
    if (isNaN(val) || val < 0) { setSaleErr('Monto inválido'); return }
    if (val > MAX_SALE) { setSaleErr(`Máx $${MAX_SALE.toLocaleString('es-MX')}`); return }
    await supabase.from('attendance').update({ sales_amount: val }).eq('id', attId)
    setEditingSale(null)
    if (onRefresh) onRefresh()
  }
  return (
    <div style={fullPage
      ? { flex: 1, background: '#111827', display: 'flex', flexDirection: 'column', overflow: 'auto' }
      : { position: 'fixed', top: 0, right: 0, width: 480, height: '100vh', background: '#111827', borderLeft: '1px solid #1e2a45', display: 'flex', flexDirection: 'column', zIndex: 150, boxShadow: '-8px 0 32px rgba(0,0,0,.4)' }}>
      {!fullPage && (
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
      )}
      {fullPage && (
        <div style={{ padding: '10px 16px', borderBottom: '1px solid #1e2a45', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
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
        </div>
      )}
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
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', borderBottom: '1px solid #1e2a45', flexShrink: 0 }}>
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
      <div style={{ flex: 1, overflowY: fullPage ? 'visible' : 'auto', overflowX: 'auto' }} onClick={() => showColPicker && setShowColPicker(false)}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 540 }}>
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
              const isEditing = editingSale?.id === r.id
              return (
                <tr key={r.id} style={{ borderBottom: '1px solid rgba(30,42,69,.3)' }}>
                  {visibleCols.includes('date')      && <td style={{ padding: '8px 14px', fontSize: 11, fontFamily: "'JetBrains Mono'", whiteSpace: 'nowrap' }}>{fmtDate(r.date)}</td>}
                  {visibleCols.includes('site')      && <td style={{ padding: '8px 14px', fontSize: 11, color: '#8892a8', whiteSpace: 'nowrap' }}>{site?.name||'?'}</td>}
                  {visibleCols.includes('checkin')   && <td style={{ padding: '8px 14px', fontSize: 11, fontFamily: "'JetBrains Mono'", whiteSpace: 'nowrap' }}>{fmtTime(r.check_in, site?.timezone)}</td>}
                  {visibleCols.includes('checkout')  && <td style={{ padding: '8px 14px', fontSize: 11, fontFamily: "'JetBrains Mono'", whiteSpace: 'nowrap' }}>{fmtTime(r.check_out, site?.timezone)}</td>}
                  {visibleCols.includes('hours')     && <td style={{ padding: '8px 14px', fontSize: 11, fontFamily: "'JetBrains Mono'", whiteSpace: 'nowrap' }}>{fmtHours(r.hours_worked)}</td>}
                  {visibleCols.includes('time_out')  && <td style={{ padding: '8px 14px', fontSize: 11, fontFamily: "'JetBrains Mono'", color: tom>0?'#f59e0b':'#4a5568', whiteSpace: 'nowrap' }}>{tomLabel}</td>}
                  {visibleCols.includes('sales') && (
                    <td style={{ padding: '8px 14px', whiteSpace: 'nowrap' }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          <input type='number' value={editingSale.value} onChange={e => { setEditingSale(p => ({ ...p, value: e.target.value })); setSaleErr('') }} onKeyDown={e => { if (e.key === 'Enter') saveSale(r.id); if (e.key === 'Escape') setEditingSale(null) }} autoFocus style={{ width: 90, background: '#0d1220', border: '1px solid '+(saleErr?'#ef4444':'#3b82f6'), color: '#f1f5f9', fontSize: 11, padding: '4px 7px', borderRadius: 5, fontFamily: "'JetBrains Mono'", outline: 'none' }} />
                          <button onClick={() => saveSale(r.id)} style={{ background: 'rgba(16,185,129,.15)', border: '1px solid rgba(16,185,129,.3)', borderRadius: 4, color: '#10b981', fontSize: 12, cursor: 'pointer', padding: '3px 7px' }}>✓</button>
                          <button onClick={() => { setEditingSale(null); setSaleErr('') }} style={{ background: 'none', border: '1px solid #1e2a45', borderRadius: 4, color: '#8892a8', fontSize: 12, cursor: 'pointer', padding: '3px 7px' }}>✕</button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono'", color: r.sales_amount > 0 ? '#10b981' : '#4a5568' }}>{r.sales_amount > 0 ? '$'+Number(r.sales_amount).toLocaleString('es-MX') : '–'}</span>
                          <button onClick={() => { setEditingSale({ id: r.id, value: r.sales_amount || 0 }); setSaleErr('') }} style={{ background: 'none', border: 'none', color: '#4a5568', cursor: 'pointer', fontSize: 11, padding: '1px 4px', borderRadius: 3, lineHeight: 1 }} title='Editar venta'>✎</button>
                        </div>
                      )}
                      {isEditing && saleErr && <div style={{ fontSize: 9, color: '#ef4444', marginTop: 2 }}>{saleErr}</div>}
                    </td>
                  )}
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
function EmpModal({ data, currentGoal, sites, currentSiteIds, onSave, onClose }) {
  const [f, setF] = useState(data || { name: '', email: '', phone: '', role: 'Vendedor(a)', skip_sales: false, skip_photo: false })
  const [weeklyGoal, setWeeklyGoal] = useState(currentGoal ? String(currentGoal) : '')
  const [goalErr, setGoalErr] = useState('')
  const [emailErr, setEmailErr] = useState('')
  const [selSites, setSelSites] = useState(currentSiteIds || [])
  const upd = (k, v) => { setF(p => ({ ...p, [k]: v })); if (k === 'email') setEmailErr('') }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const emailOk = f.email?.trim() && emailRegex.test(f.email.trim())
  const valid = f.name?.trim() && emailOk
  const isVendor = !f.skip_sales
  function handleSave() {
    setGoalErr(''); setEmailErr('')
    if (!emailOk) { setEmailErr('Ingresa un email válido (ej: nombre@correo.com)'); return }
    if (weeklyGoal !== '') {
      const g = parseFloat(weeklyGoal)
      if (isNaN(g) || g <= 0) { setGoalErr('Ingresa un número mayor a 0'); return }
      if (g > MAX_SALE) { setGoalErr(`El máximo es $${MAX_SALE.toLocaleString('es-MX')}`); return }
    }
    onSave(f, weeklyGoal, selSites)
  }
  return (
    <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#1a2035', border: '1px solid #1e2a45', borderRadius: 12, padding: 22, width: '100%', maxWidth: 440, maxHeight: '85vh', overflow: 'auto' }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>{data ? 'Editar Empleado' : 'Nuevo Empleado'}</h3>
        {[['Nombre','name','text'],['Email','email','email'],['Teléfono','phone','tel']].map(([l,k,t]) => (
          <div key={k} style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 10, fontWeight: 600, color: '#8892a8', display: 'block', marginBottom: 4 }}>{l}</label>
            <input type={t} value={f[k]||''} onChange={e => upd(k, e.target.value)} style={{ width:'100%',background:'#0d1220',border:`1px solid ${k==='email'&&emailErr?'#ef4444':'#1e2a45'}`,color:'#f1f5f9',fontSize:12,padding:'8px 10px',borderRadius:6,outline:'none',fontFamily:'inherit' }} />
            {k === 'email' && emailErr && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4, fontWeight: 600 }}>⚠ {emailErr}</div>}
          </div>
        ))}
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 10, fontWeight: 600, color: '#8892a8', display: 'block', marginBottom: 4 }}>Rol</label>
          <select value={f.role||'Vendedor(a)'} onChange={e => upd('role', e.target.value)} style={{ width:'100%',background:'#0d1220',border:'1px solid #1e2a45',color:'#f1f5f9',fontSize:12,padding:'8px 10px',borderRadius:6,fontFamily:'inherit' }}>
            <option>Vendedor(a)</option><option>Encargado(a)</option><option>Gerente Regional</option><option>Supervisor(a)</option>
          </select>
        </div>
        {sites.length > 0 && (
          <div style={{ marginBottom: 14, borderTop: '1px solid #1e2a45', paddingTop: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>Puntos de venta asignados</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {sites.map(s => (
                <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer', color: '#f1f5f9', padding: '6px 10px', borderRadius: 6, background: selSites.includes(s.id) ? 'rgba(59,130,246,.1)' : 'transparent', border: '1px solid ' + (selSites.includes(s.id) ? 'rgba(59,130,246,.3)' : '#1e2a45') }}>
                  <input type='checkbox' checked={selSites.includes(s.id)} onChange={() => setSelSites(p => p.includes(s.id) ? p.filter(x => x !== s.id) : [...p, s.id])} style={{ accentColor: '#3b82f6' }} />
                  {s.name}
                </label>
              ))}
            </div>
            <div style={{ fontSize: 10, color: '#4a5568', marginTop: 6 }}>Los gerentes de las sucursales marcadas podrán ver y asignar horarios a este empleado.</div>
          </div>
        )}
        <div style={{ marginBottom: 14, background: 'rgba(16,185,129,.05)', border: `1px solid ${goalErr ? 'rgba(239,68,68,.4)' : 'rgba(16,185,129,.15)'}`, borderRadius: 8, padding: '12px 14px' }}>
          <label style={{ fontSize: 10, fontWeight: 600, color: '#10b981', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.5px' }}>Meta de ventas semanal</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 14, fontWeight: 700, color: '#4a5568', pointerEvents: 'none' }}>$</span>
            <input type='number' inputMode='decimal' placeholder='Sin meta (dejar vacío)' value={weeklyGoal} onChange={e => { setWeeklyGoal(e.target.value); setGoalErr('') }} style={{ width:'100%',background:'#0d1220',border:`1px solid ${goalErr?'#ef4444':'#1e2a45'}`,color:'#f1f5f9',fontSize:14,fontWeight:700,padding:'10px 10px 10px 26px',borderRadius:8,outline:'none',fontFamily:"'JetBrains Mono', monospace",boxSizing:'border-box' }} />
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
// ─── Site Modal con Leaflet ───────────────────────────────────────────────────
function SiteModal({ data, onSave, onClose }) {
  const isNew = !data?.id
  const [f, setF] = useState(data || { name: '', address: '', grace_mins: 5, absent_mins: 15, lat: '', lng: '', radius_m: 150 })
  const [searchQuery, setSearchQuery] = useState(data?.address || '')
  const [searching, setSearching] = useState(false)
  const [searchErr, setSearchErr] = useState('')
  const mapRef         = useRef(null)
  const mapInstanceRef = useRef(null)
  const markerRef      = useRef(null)
  const upd = (k, v) => setF(p => ({ ...p, [k]: v }))
  const valid = f.name?.trim()
  const hasGps = f.lat !== '' && f.lng !== '' && parseFloat(f.lat) !== 0 && parseFloat(f.lng) !== 0
  useEffect(() => {
    function initMap() {
      if (!mapRef.current || mapInstanceRef.current) return
      const L = window.L
      const lat = parseFloat(f.lat) || 21.1619
      const lng = parseFloat(f.lng) || -86.8515
      const map = L.map(mapRef.current, { zoomControl: true }).setView([lat, lng], hasGps ? 16 : 13)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>' }).addTo(map)
      const marker = L.marker([lat, lng], { draggable: true }).addTo(map)
      marker.on('dragend', e => { const pos = e.target.getLatLng(); setF(p => ({ ...p, lat: parseFloat(pos.lat.toFixed(6)), lng: parseFloat(pos.lng.toFixed(6)) })) })
      mapInstanceRef.current = map; markerRef.current = marker
    }
    function loadLeaflet() {
      if (!document.querySelector('link[href*="leaflet"]')) { const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; document.head.appendChild(css) }
      if (window.L) { setTimeout(initMap, 50); return }
      if (document.querySelector('script[src*="leaflet"]')) { const ex = document.querySelector('script[src*="leaflet"]'); if (ex._loaded) setTimeout(initMap, 50); else ex.addEventListener('load', () => setTimeout(initMap, 50)); return }
      const script = document.createElement('script'); script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; script.onload = () => { script._loaded = true; setTimeout(initMap, 50) }; document.head.appendChild(script)
    }
    loadLeaflet()
    return () => { if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; markerRef.current = null } }
  }, [])
  useEffect(() => {
    if (!mapInstanceRef.current || !markerRef.current) return
    const lat = parseFloat(f.lat); const lng = parseFloat(f.lng)
    if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) markerRef.current.setLatLng([lat, lng])
  }, [f.lat, f.lng])
  async function searchLocation() {
    if (!searchQuery.trim()) return
    setSearching(true); setSearchErr('')
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=5&countrycodes=mx`)
      const results = await res.json()
      if (results.length === 0) { setSearchErr('No se encontró la ubicación.'); setSearching(false); return }
      const { lat, lon, display_name } = results[0]
      const newLat = parseFloat(parseFloat(lat).toFixed(6)); const newLng = parseFloat(parseFloat(lon).toFixed(6))
      setF(p => ({ ...p, lat: newLat, lng: newLng, address: p.address || display_name.split(',').slice(0,3).join(',').trim() }))
      if (mapInstanceRef.current && markerRef.current) { mapInstanceRef.current.setView([newLat, newLng], 17); markerRef.current.setLatLng([newLat, newLng]) }
    } catch (e) { setSearchErr('Error al buscar.') }
    setSearching(false)
  }
  return (
    <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#1a2035', border: '1px solid #1e2a45', borderRadius: 12, padding: 22, width: '100%', maxWidth: 520, maxHeight: '92vh', overflow: 'auto' }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>{isNew ? 'Nuevo Sitio' : 'Editar Sitio'}</h3>
        <div style={{ marginBottom: 10 }}><label style={{ fontSize: 10, fontWeight: 600, color: '#8892a8', display: 'block', marginBottom: 4 }}>Nombre del sitio</label><input value={f.name||''} onChange={e => upd('name', e.target.value)} style={{ width:'100%',background:'#0d1220',border:'1px solid #1e2a45',color:'#f1f5f9',fontSize:12,padding:'8px 10px',borderRadius:6,outline:'none',fontFamily:'inherit' }} placeholder='Ej: Plaza Américas Cancún' /></div>
        <div style={{ marginBottom: 6 }}><label style={{ fontSize: 10, fontWeight: 600, color: '#8892a8', display: 'block', marginBottom: 4 }}>Buscar ubicación</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchLocation()} placeholder='Ej: Plaza Américas Cancún, Quintana Roo' style={{ flex:1,background:'#0d1220',border:'1px solid #1e2a45',color:'#f1f5f9',fontSize:12,padding:'8px 10px',borderRadius:6,outline:'none',fontFamily:'inherit' }} />
            <button onClick={searchLocation} disabled={searching} style={{ padding:'8px 14px',borderRadius:6,border:'none',background:'#3b82f6',color:'#fff',fontSize:12,fontWeight:600,cursor:searching?'wait':'pointer',fontFamily:'inherit',whiteSpace:'nowrap' }}>{searching ? '...' : '🔍 Buscar'}</button>
          </div>
          {searchErr && <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 4 }}>⚠ {searchErr}</div>}
        </div>
        <div style={{ marginBottom: 10, borderRadius: 8, overflow: 'hidden', border: '1px solid #1e2a45' }}><div ref={mapRef} style={{ height: 220, width: '100%', background: '#0d1220' }} /></div>
        <div style={{ fontSize: 10, color: '#4a5568', marginBottom: 12 }}>{hasGps ? `📍 ${f.lat}, ${f.lng} — arrastra el marcador para ajustar` : '⚠️ Sin coordenadas — busca la ubicación o arrastra el marcador'}</div>
        <div style={{ marginBottom: 10 }}><label style={{ fontSize: 10, fontWeight: 600, color: '#8892a8', display: 'block', marginBottom: 4 }}>Dirección (texto)</label><input value={f.address||''} onChange={e => upd('address', e.target.value)} style={{ width:'100%',background:'#0d1220',border:'1px solid #1e2a45',color:'#f1f5f9',fontSize:12,padding:'8px 10px',borderRadius:6,outline:'none',fontFamily:'inherit' }} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
          <div><label style={{ fontSize: 10, fontWeight: 600, color: '#8892a8', display: 'block', marginBottom: 4 }}>Radio GPS (metros)</label><input type='number' value={f.radius_m??150} onChange={e => upd('radius_m', parseInt(e.target.value)||150)} style={{ width:'100%',background:'#0d1220',border:'1px solid #1e2a45',color:'#f1f5f9',fontSize:12,padding:'8px 10px',borderRadius:6,outline:'none',fontFamily:'inherit' }} /></div>
          <div><label style={{ fontSize: 10, fontWeight: 600, color: '#8892a8', display: 'block', marginBottom: 4 }}>Tolerancia (minutos)</label><input type='number' value={f.grace_mins||0} onChange={e => upd('grace_mins', parseInt(e.target.value)||0)} style={{ width:'100%',background:'#0d1220',border:'1px solid #1e2a45',color:'#f1f5f9',fontSize:12,padding:'8px 10px',borderRadius:6,outline:'none',fontFamily:'inherit' }} /></div>
        </div>
        {isNew && <div style={{ background: 'rgba(59,130,246,.06)', border: '1px solid rgba(59,130,246,.15)', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}><div style={{ fontSize: 10, color: '#3b82f6', fontWeight: 600, marginBottom: 2 }}>Código QR</div><div style={{ fontSize: 11, color: '#4a5568' }}>Se generará automáticamente al guardar.</div></div>}
        {!isNew && <div style={{ marginBottom: 14 }}><label style={{ fontSize: 10, fontWeight: 600, color: '#8892a8', display: 'block', marginBottom: 4 }}>Código QR</label><input value={f.code||''} onChange={e => upd('code', e.target.value.toUpperCase())} style={{ width:'100%',background:'#0d1220',border:'1px solid #1e2a45',color:'#f1f5f9',fontSize:12,padding:'8px 10px',borderRadius:6,outline:'none',fontFamily:"'JetBrains Mono'" }} /></div>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button disabled={!valid} onClick={() => onSave(f)} style={{ flex:1,padding:'10px 16px',borderRadius:7,border:'none',background:valid?'#3b82f6':'#1e2a45',color:'#fff',fontSize:12,fontWeight:600,cursor:valid?'pointer':'not-allowed',fontFamily:'inherit' }}>Guardar</button>
          <button onClick={onClose} style={{ padding:'10px 16px',borderRadius:7,border:'1px solid #1e2a45',background:'transparent',color:'#8892a8',fontSize:12,cursor:'pointer',fontFamily:'inherit' }}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}
// ─── QR Modal ─────────────────────────────────────────────────────────────────
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
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, display: 'inline-block', marginBottom: 16 }}><img src={qrImgUrl} alt='QR Code' style={{ width: 220, height: 220, display: 'block' }} /></div>
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
// ─── Schedule Modal ───────────────────────────────────────────────────────────
function ScheduleModal({ emp, sites, schedules, onSave, onClose }) {
  const todayDate = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Cancun' })
  const [fixedWeek, setFixedWeek] = useState(emp.fixed_week || false)
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()))
  const [week, setWeek] = useState({})
  const [saving, setSaving] = useState(false)
  const weekDates = Array.from({ length: 7 }, (_, i) => { const d = addDays(weekStart, i); return { date: dateStr(d), label: DAY_NAMES[i], d } })
  useEffect(() => {
    const w = {}
    weekDates.forEach(({ date }) => {
      const existing = schedules.find(s => s.date === date)
      const siteInList = existing ? sites.find(s => s.id === existing.site_id) : null
      const isBlocked = !!(existing && !siteInList)
      w[date] = existing
        ? { on: true, site_id: existing.site_id, start_time: existing.start_time?.slice(0,5)||'10:00', end_time: existing.end_time?.slice(0,5)||'19:00', lunch_mins: existing.lunch_mins??60, blocked: isBlocked }
        : { on: false, site_id: sites[0]?.id||'', start_time: '10:00', end_time: '19:00', lunch_mins: 60, blocked: false }
    })
    setWeek(w)
  }, [weekStart, schedules])
  const toggle = (date) => { if (week[date]?.blocked) return; setWeek(p => ({ ...p, [date]: { ...p[date], on: !p[date].on } })) }
  const upd = (date, key, val) => setWeek(p => ({ ...p, [date]: { ...p[date], [key]: val } }))
  const copyToAll = (srcDate) => {
    const src = week[srcDate]; if (!src?.on || src.blocked) return
    setWeek(p => { const nw = {...p}; weekDates.forEach(({date}) => { if (nw[date]?.on && !nw[date]?.blocked && date !== srcDate) nw[date] = {...nw[date], site_id: src.site_id, start_time: src.start_time, end_time: src.end_time, lunch_mins: src.lunch_mins} }); return nw })
  }
  const save = async () => {
    setSaving(true)
    // Guardar flag de semana fija en el empleado
    await supabase.from('employees').update({ fixed_week: fixedWeek }).eq('id', emp.id)
    const editableDates = weekDates.filter(({date}) => !week[date]?.blocked).map(d => d.date)
    if (editableDates.length > 0) await supabase.from('schedules').delete().eq('employee_id', emp.id).in('date', editableDates)
    const inserts = []
    weekDates.forEach(({ date }) => { const day = week[date]; if (day?.on && !day.blocked && day.site_id) inserts.push({ employee_id: emp.id, date, site_id: day.site_id, start_time: day.start_time||'10:00', end_time: day.end_time||'19:00', lunch_mins: day.lunch_mins??60 }) })
    if (inserts.length > 0) await supabase.from('schedules').insert(inserts)
    setSaving(false); onSave()
  }
  const weekLabel = (() => { const s = weekDates[0].d; const e = weekDates[6].d; return `${s.getDate()} ${s.toLocaleDateString('es-MX',{month:'short'})} – ${e.getDate()} ${e.toLocaleDateString('es-MX',{month:'short',year:'numeric'})}` })()
  // FIX BUG 3: estilos para cada campo de horario — cada uno en su propia línea en móvil
  const fieldStyle = { background:'#0d1220',border:'1px solid #1e2a45',color:'#f1f5f9',fontSize:11,padding:'6px 8px',borderRadius:5,outline:'none',fontFamily:'inherit',width:'100%' }
  return (
    <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(4px)' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#1a2035', border: '1px solid #1e2a45', borderRadius: 12, padding: 22, width: '100%', maxWidth: 480, maxHeight: '92vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap', gap: 8 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700 }}>Horarios — {emp.name}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Toggle semana fija */}
            <button
              onClick={() => setFixedWeek(v => !v)}
              style={{ fontSize:10, fontWeight:600, padding:'4px 10px', borderRadius:5, cursor:'pointer', fontFamily:'inherit', border:'1px solid '+(fixedWeek?'rgba(245,158,11,.5)':'#1e2a45'), background:fixedWeek?'rgba(245,158,11,.15)':'transparent', color:fixedWeek?'#f59e0b':'#4a5568', transition:'all .15s' }}
            >
              {fixedWeek ? '📌 Semana fija ON' : 'Semana fija OFF'}
            </button>
            {/* Selector de semana (solo si NO es semana fija) */}
            {!fixedWeek && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#0d1220', border: '1px solid #1e2a45', borderRadius: 8, padding: '4px 6px' }}>
                <button onClick={() => setWeekStart(d => addDays(d,-7))} style={{ background:'rgba(59,130,246,.15)',border:'none',borderRadius:5,color:'#3b82f6',padding:'5px 12px',cursor:'pointer',fontFamily:'inherit',fontSize:15,fontWeight:700,lineHeight:1 }}>‹</button>
                <span style={{ fontSize:11,color:'#f1f5f9',fontWeight:600,minWidth:140,textAlign:'center' }}>{weekLabel}</span>
                <button onClick={() => setWeekStart(d => addDays(d,7))} style={{ background:'rgba(59,130,246,.15)',border:'none',borderRadius:5,color:'#3b82f6',padding:'5px 12px',cursor:'pointer',fontFamily:'inherit',fontSize:15,fontWeight:700,lineHeight:1 }}>›</button>
              </div>
            )}
          </div>
        </div>
        <p style={{ fontSize: 11, color: '#8892a8', marginBottom: 16 }}>Activa los días que trabaja. Cada día puede tener diferente sucursal y horario.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {weekDates.map(({ date, label }) => {
            const day = week[date] || {}; const isOn = day.on; const isPast = date < todayDate; const isBlocked = day.blocked
            return (
              <div key={date} style={{ background: isBlocked ? 'rgba(245,158,11,.05)' : isOn ? '#0d1220' : 'transparent', border: '1px solid ' + (isBlocked ? 'rgba(245,158,11,.3)' : isOn ? '#1e2a45' : 'rgba(30,42,69,.3)'), borderRadius: 8, padding: '10px 12px', opacity: isPast && !isBlocked ? 0.55 : 1 }}>
                {/* Fila superior: toggle + nombre día + fecha */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: isOn && !isBlocked ? 10 : 0 }}>
                  <button onClick={() => toggle(date)} disabled={isBlocked} style={{ width:22,height:22,borderRadius:6,flexShrink:0,cursor:isBlocked?'not-allowed':'pointer',border:'2px solid '+(isBlocked?'#f59e0b':isOn?'#10b981':'#4a5568'),background:isBlocked?'rgba(245,158,11,.15)':isOn?'#10b981':'transparent',display:'flex',alignItems:'center',justifyContent:'center',color:isBlocked?'#f59e0b':'#fff',fontSize:12,fontWeight:700 }}>{isBlocked?'🔒':isOn?'✓':''}</button>
                  <span style={{ fontSize:12,fontWeight:700,color:date===todayDate?'#3b82f6':'#f1f5f9' }}>{label}</span>
                  {!fixedWeek && <span style={{ fontSize:10,color:'#4a5568',fontFamily:"'JetBrains Mono'" }}>{date.slice(5).replace('-','/')}</span>}
                  {isBlocked && <span style={{ fontSize:11,color:'#f59e0b',fontWeight:600,marginLeft:4 }}>Ocupado — otra sucursal</span>}
                  {!isOn && !isBlocked && <span style={{ fontSize:11,color:'#4a5568',marginLeft:4 }}>Descansa</span>}
                </div>
                {/* FIX BUG 3: Campos en columna vertical para móvil */}
                {isBlocked && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, paddingLeft: 30 }}>
                    <span style={{ fontSize: 10, color: '#4a5568', fontFamily: "'JetBrains Mono'" }}>{day.start_time?.slice(0,5)} – {day.end_time?.slice(0,5)}</span>
                    <span style={{ fontSize: 9, color: '#4a5568', background: 'rgba(245,158,11,.1)', border: '1px solid rgba(245,158,11,.2)', borderRadius: 4, padding: '1px 7px' }}>No editable</span>
                  </div>
                )}
                {isOn && !isBlocked && (
                  <div style={{ paddingLeft: 30, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {/* Sucursal — fila completa */}
                    <div>
                      <div style={{ fontSize: 9, color: '#4a5568', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 3 }}>Sucursal</div>
                      <select value={day.site_id||''} onChange={e => upd(date,'site_id',e.target.value)} style={fieldStyle}>
                        {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    {/* Horario — entrada y salida en fila */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 9, color: '#4a5568', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 3 }}>Entrada</div>
                        <select value={day.start_time||'10:00'} onChange={e => upd(date,'start_time',e.target.value)} style={{ ...fieldStyle, fontFamily:"'JetBrains Mono', monospace" }}>
                          {Array.from({length:24},(_,h)=>['00','30'].map(m=>`${String(h).padStart(2,'0')}:${m}`)).flat().map(t=><option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 9, color: '#4a5568', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 3 }}>Salida</div>
                        <select value={day.end_time||'19:00'} onChange={e => upd(date,'end_time',e.target.value)} style={{ ...fieldStyle, fontFamily:"'JetBrains Mono', monospace" }}>
                          {Array.from({length:24},(_,h)=>['00','30'].map(m=>`${String(h).padStart(2,'0')}:${m}`)).flat().map(t=><option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 9, color: '#4a5568', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 3 }}>Comida</div>
                        <select value={day.lunch_mins??60} onChange={e => upd(date,'lunch_mins',parseInt(e.target.value))} style={fieldStyle}>
                          <option value={0}>Sin comida</option><option value={30}>30m</option><option value={45}>45m</option><option value={60}>60m</option><option value={90}>90m</option>
                        </select>
                      </div>
                    </div>
                    {/* Copiar a todos */}
                    <button onClick={() => copyToAll(date)} style={{ background:'none',border:'1px solid #1e2a45',borderRadius:4,color:'#8892a8',fontSize:10,padding:'4px 10px',cursor:'pointer',fontFamily:'inherit',alignSelf:'flex-start' }}>Copiar a todos los días activos</button>
                  </div>
                )}
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
// ─── Admin User Modal ─────────────────────────────────────────────────────────
function AdminUserModal({ data, sites, companies, isSuperAdmin, isCompanyAdmin, adminUser, onSave, onClose }) {
  const [name, setName]         = useState(data?.name || '')
  const [email, setEmail]       = useState(data?.email || '')
  const [role, setRole]         = useState(data?.role || 'manager')
  const [companyId, setCompanyId] = useState(data?.company_id || (isCompanyAdmin ? adminUser?.company_id : companies[0]?.id) || '')
  const [selSites, setSelSites] = useState((data?.admin_site_permissions || []).map(p => p.site_id))
  const [saving, setSaving]     = useState(false)
  const [err, setErr]           = useState('')
  const [createdPwd, setCreatedPwd] = useState('')
  const [copied, setCopied]     = useState(false)
  const valid = name.trim() && email.trim()
  const companySites = companyId ? sites.filter(s => s.company_id === companyId) : sites

  async function handleSave() {
    setSaving(true); setErr('')
    try {
      if (data?.id) {
        await supabase.from('admin_users').update({ name, role, company_id: role === 'superadmin' ? null : companyId }).eq('id', data.id)
        await supabase.from('admin_site_permissions').delete().eq('admin_user_id', data.id)
        if (role !== 'superadmin' && selSites.length > 0) {
          await supabase.from('admin_site_permissions').insert(selSites.map(site_id => ({ admin_user_id: data.id, site_id })))
        }
        onSave()
      } else {
        const res = await fetch('/api/admin/invite', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim().toLowerCase(), name, role, site_ids: selSites, company_id: role === 'superadmin' ? null : companyId })
        })
        const json = await res.json()
        if (!res.ok) { setErr(json.error || 'Error al crear usuario'); setSaving(false); return }
        setCreatedPwd(json.password)
        setSaving(false)
      }
    } catch (e) { setErr('Error inesperado. Intenta de nuevo.'); setSaving(false) }
  }

  function copyCredentials() {
    const siteUrl = 'https://gmontalvo-asistencia.vercel.app/admin/login'
    navigator.clipboard.writeText(`Acceso al panel GM Asistencia:\nURL: ${siteUrl}\nEmail: ${email.trim().toLowerCase()}\nContraseña: ${createdPwd}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const iS = { width:'100%',background:'#0d1220',border:'1px solid #1e2a45',color:'#f1f5f9',fontSize:12,padding:'8px 10px',borderRadius:6,outline:'none',fontFamily:'inherit' }
  return (
    <div onClick={createdPwd ? undefined : onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#1a2035', border: '1px solid #1e2a45', borderRadius: 12, padding: 22, width: '100%', maxWidth: 460, maxHeight: '85vh', overflow: 'auto' }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>{data ? 'Editar Usuario' : 'Nuevo Usuario Admin'}</h3>
        {createdPwd ? (
          <div>
            <div style={{ background: 'rgba(16,185,129,.08)', border: '1px solid rgba(16,185,129,.2)', borderRadius: 10, padding: '16px 18px', marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#10b981', marginBottom: 8 }}>✅ Usuario creado</div>
              <div style={{ fontSize: 11, color: '#8892a8', marginBottom: 14 }}>Manda estos datos a <strong style={{ color: '#f1f5f9' }}>{name}</strong> por WhatsApp. Puede cambiar su contraseña después.</div>
              <div style={{ background: '#0d1220', border: '1px solid #1e2a45', borderRadius: 8, padding: '14px 16px', marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: '#4a5568', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>Credenciales de acceso</div>
                <div style={{ fontSize: 12, color: '#8892a8', marginBottom: 4 }}>Email: <span style={{ color: '#f1f5f9', fontFamily: "'JetBrains Mono'" }}>{email.trim().toLowerCase()}</span></div>
                <div style={{ fontSize: 12, color: '#8892a8' }}>Contraseña: <span style={{ color: '#3b82f6', fontFamily: "'JetBrains Mono'", fontWeight: 700, fontSize: 15 }}>{createdPwd}</span></div>
              </div>
              <button onClick={copyCredentials} style={{ width: '100%', padding: '11px 16px', borderRadius: 7, border: 'none', background: copied ? '#10b981' : '#3b82f6', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'background .2s' }}>
                {copied ? '¡Copiado! ✓' : '📋 Copiar para WhatsApp'}
              </button>
            </div>
            <button onClick={onSave} style={{ width: '100%', padding: '10px 16px', borderRadius: 7, border: '1px solid #1e2a45', background: 'transparent', color: '#8892a8', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
              Listo, cerrar
            </button>
          </div>
        ) : (
          <>
            {err && <div style={{ background:'rgba(239,68,68,.1)',border:'1px solid rgba(239,68,68,.25)',borderRadius:7,padding:'10px 14px',fontSize:12,color:'#ef4444',marginBottom:14 }}>{err}</div>}
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize:10,fontWeight:600,color:'#8892a8',display:'block',marginBottom:4 }}>Nombre</label>
              <input value={name} onChange={e => setName(e.target.value)} style={iS} />
            </div>
            {!data && (
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize:10,fontWeight:600,color:'#8892a8',display:'block',marginBottom:4 }}>Email</label>
                <input type='email' value={email} onChange={e => setEmail(e.target.value)} style={iS} />
                <div style={{ fontSize:10,color:'#4a5568',marginTop:4 }}>Se generará una contraseña temporal para mandar por WhatsApp</div>
              </div>
            )}
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize:10,fontWeight:600,color:'#8892a8',display:'block',marginBottom:4 }}>Rol</label>
              <select value={role} onChange={e => setRole(e.target.value)} style={iS}>
                <option value='manager'>Gerente</option>
                {isSuperAdmin && <option value='company_admin'>Admin Empresa</option>}
                {isSuperAdmin && <option value='superadmin'>Super Admin</option>}
              </select>
            </div>
            {role !== 'superadmin' && isSuperAdmin && companies.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize:10,fontWeight:600,color:'#8892a8',display:'block',marginBottom:4 }}>Empresa</label>
                <select value={companyId} onChange={e => { setCompanyId(e.target.value); setSelSites([]) }} style={iS}>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
            {role === 'manager' && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize:10,fontWeight:600,color:'#8892a8',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:8 }}>Sucursales que puede ver</div>
                {companySites.length === 0 ? (
                  <div style={{ fontSize:11,color:'#4a5568',padding:'8px 10px',background:'#0d1220',borderRadius:6 }}>No hay sucursales en esta empresa</div>
                ) : (
                  <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
                    {companySites.map(s => (
                      <label key={s.id} style={{ display:'flex',alignItems:'center',gap:8,fontSize:12,cursor:'pointer',color:'#f1f5f9',padding:'6px 10px',borderRadius:6,background:selSites.includes(s.id)?'rgba(59,130,246,.1)':'transparent',border:'1px solid '+(selSites.includes(s.id)?'rgba(59,130,246,.3)':'#1e2a45') }}>
                        <input type='checkbox' checked={selSites.includes(s.id)} onChange={() => setSelSites(p => p.includes(s.id)?p.filter(x=>x!==s.id):[...p,s.id])} style={{ accentColor:'#3b82f6' }} />
                        {s.name}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button disabled={!valid||saving} onClick={handleSave} style={{ flex:1,padding:'10px 16px',borderRadius:7,border:'none',background:valid&&!saving?'#3b82f6':'#1e2a45',color:'#fff',fontSize:12,fontWeight:600,cursor:valid&&!saving?'pointer':'not-allowed',fontFamily:'inherit' }}>
                {saving ? 'Creando...' : data ? 'Guardar' : 'Crear usuario'}
              </button>
              <button onClick={onClose} style={{ padding:'10px 16px',borderRadius:7,border:'1px solid #1e2a45',background:'transparent',color:'#8892a8',fontSize:12,cursor:'pointer',fontFamily:'inherit' }}>Cancelar</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
// ─── Stores Dashboard ─────────────────────────────────────────────────────────
function StoresDashboard({ sites, att, schedules, allEmps, siteHours, today, onEditSite }) {
  const now = new Date()
  const nowTimeStr = now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Cancun' })
  // day_of_week: 0=Lun...6=Dom; JS getDay: 0=Sun..6=Sat → convert
  const todayDate = today || new Date().toLocaleDateString('en-CA', { timeZone: 'America/Cancun' })
  const jsDow = new Date(todayDate + 'T12:00:00').getDay() // 0=Sun
  const todayDow = jsDow === 0 ? 6 : jsDow - 1 // 0=Lun..6=Dom

  function isStoreOpen(site) {
    return att.some(r => r.site_id === site.id && r.check_in && !r.check_out)
  }

  function shouldBeOpen(site) {
    const h = (siteHours || []).find(h => h.site_id === site.id && h.day_of_week === todayDow)
    return h?.is_open === true
  }

  function storeStats(site) {
    const siteAtt = att.filter(r => r.site_id === site.id)
    const siteScheds = schedules.filter(s => s.site_id === site.id)
    const activeNow = siteAtt.filter(r => r.check_in && !r.check_out).length
    const completedToday = siteAtt.filter(r => r.check_out).length
    const totalExpected = siteScheds.length
    const totalSalesToday = siteAtt.reduce((s, r) => s + (parseFloat(r.sales_amount) || 0), 0)
    const firstIn = siteAtt.filter(r => r.check_in).sort((a, b) => new Date(a.check_in) - new Date(b.check_in))[0]
    return { activeNow, completedToday, totalExpected, totalSalesToday, firstIn }
  }

  const openSites = sites.filter(s => isStoreOpen(s))
  const closedSites = sites.filter(s => !isStoreOpen(s))

  return (
    <div>
      {/* Resumen global */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
        {[
          ['Tiendas abiertas', openSites.length, '#10b981', 'rgba(16,185,129,.12)'],
          ['Tiendas sin actividad', closedSites.length, '#f59e0b', 'rgba(245,158,11,.12)'],
          ['Total sucursales', sites.length, '#3b82f6', 'rgba(59,130,246,.12)'],
        ].map(([l, v, c, bg]) => (
          <div key={l} style={{ background: bg, border: `1px solid ${c}33`, borderRadius: 10, padding: '16px 18px' }}>
            <div style={{ fontSize: 10, color: c, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 6 }}>{l}</div>
            <div style={{ fontSize: 30, fontWeight: 700, fontFamily: "'JetBrains Mono'", color: c }}>{v}</div>
          </div>
        ))}
      </div>

      {/* Tiendas ABIERTAS */}
      {openSites.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: 'pulse 2s infinite' }} />
            Abiertas ahora
          </div>
          <style>{`@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:.4 } }`}</style>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
            {openSites.map(site => {
              const { activeNow, completedToday, totalExpected, totalSalesToday, firstIn } = storeStats(site)
              const tz = site.timezone || 'America/Cancun'
              return (
                <div key={site.id} style={{ background: '#1a2035', border: '2px solid rgba(16,185,129,.35)', borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(16,185,129,.15)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{site.name}</div>
                      <div style={{ fontSize: 10, color: '#8892a8', marginTop: 1 }}>{site.address}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#10b981', background: 'rgba(16,185,129,.12)', border: '1px solid rgba(16,185,129,.3)', borderRadius: 5, padding: '2px 8px' }}>ABIERTA</span>
                      <button onClick={() => onEditSite(site)} style={{ background: 'none', border: '1px solid #1e2a45', borderRadius: 5, color: '#4a5568', fontSize: 10, padding: '2px 8px', cursor: 'pointer', fontFamily: 'inherit' }}>Editar</button>
                    </div>
                  </div>
                  <div style={{ padding: '10px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    {[['Activos', activeNow, '#10b981'], ['Completaron', completedToday, '#3b82f6'], ['Esperados', totalExpected, '#8892a8']].map(([l, v, c]) => (
                      <div key={l} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 9, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '.5px' }}>{l}</div>
                        <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'JetBrains Mono'", color: c }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  {(totalSalesToday > 0 || firstIn) && (
                    <div style={{ padding: '8px 16px', borderTop: '1px solid #1e2a45', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                      {firstIn && <span style={{ fontSize: 10, color: '#8892a8' }}>1ra entrada: <span style={{ fontFamily: "'JetBrains Mono'", color: '#f1f5f9' }}>{new Date(firstIn.check_in).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz })}</span></span>}
                      {totalSalesToday > 0 && <span style={{ fontSize: 10, color: '#10b981', fontWeight: 600 }}>Ventas: <span style={{ fontFamily: "'JetBrains Mono'" }}>${Number(totalSalesToday).toLocaleString('es-MX')}</span></span>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Tiendas SIN ACTIVIDAD */}
      {closedSites.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#4a5568', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 10 }}>Sin actividad hoy</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
            {closedSites.map(site => {
              const noApertura = shouldBeOpen(site)
              return (
                <div key={site.id} style={{ background: '#1a2035', border: `1px solid ${noApertura ? 'rgba(245,158,11,.4)' : '#1e2a45'}`, borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#8892a8' }}>{site.name}</div>
                    <div style={{ fontSize: 10, color: '#4a5568', marginTop: 1 }}>{site.address}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {noApertura && <span style={{ fontSize: 9, fontWeight: 700, color: '#f59e0b', background: 'rgba(245,158,11,.12)', border: '1px solid rgba(245,158,11,.35)', borderRadius: 5, padding: '2px 8px' }}>⚠ SIN APERTURA</span>}
                    {!noApertura && <span style={{ fontSize: 9, fontWeight: 700, color: '#4a5568', background: 'rgba(74,85,104,.1)', border: '1px solid #1e2a45', borderRadius: 5, padding: '2px 8px' }}>SIN ACTIVIDAD</span>}
                    <button onClick={() => onEditSite(site)} style={{ background: 'none', border: '1px solid #1e2a45', borderRadius: 5, color: '#4a5568', fontSize: 10, padding: '2px 8px', cursor: 'pointer', fontFamily: 'inherit' }}>Editar</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {sites.length === 0 && (
        <div style={{ padding: 32, textAlign: 'center', color: '#4a5568', fontSize: 13, background: '#1a2035', borderRadius: 10, border: '1px solid #1e2a45' }}>No hay sucursales configuradas.</div>
      )}
    </div>
  )
}
// ─── Schedule Board ───────────────────────────────────────────────────────────
function ScheduleBoard({ sites, allEmps, schedules, employeeSiteAssignments, siteHours, isSuperAdmin, adminUser, onRefresh, setToast }) {
  const [selSiteId, setSelSiteId] = useState(sites[0]?.id || '')
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()))
  const [editCell, setEditCell]   = useState(null) // { empId, date, start, end }
  const [showSiteHours, setShowSiteHours] = useState(false)
  const [saving, setSaving]       = useState(false)
  const [dragOver, setDragOver]   = useState(null) // date being dragged over

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Cancun' })
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i)
    return { date: dateStr(d), label: DAY_NAMES[i], d, isPast: dateStr(d) < today, isToday: dateStr(d) === today }
  })
  const weekLabel = `${weekDates[0].label} ${weekDates[0].date.slice(8)} – ${weekDates[6].label} ${weekDates[6].date.slice(8)} ${weekDates[0].date.slice(0,7).replace('-','/')}`

  // Employees assigned to the selected site
  const siteEmpIds = employeeSiteAssignments.filter(a => a.site_id === selSiteId).map(a => a.employee_id)
  const filteredEmps = allEmps.filter(e => siteEmpIds.includes(e.id))

  // Schedules for this site & week
  const weekSchedForSite = schedules.filter(s =>
    s.site_id === selSiteId &&
    weekDates.some(d => d.date === s.date)
  )

  function getEmpSchedule(empId, date) {
    return weekSchedForSite.find(s => s.employee_id === empId && s.date === date) || null
  }

  // day_of_week: 0=Lun...6=Dom
  function getDayHours(date) {
    const jsDow = new Date(date + 'T12:00:00').getDay()
    const dow = jsDow === 0 ? 6 : jsDow - 1
    return (siteHours || []).find(h => h.site_id === selSiteId && h.day_of_week === dow) || null
  }

  async function dropEmp(empId, date) {
    if (!selSiteId) return
    const existing = getEmpSchedule(empId, date)
    if (existing) return // already scheduled, no-op
    setSaving(true)
    const dh = getDayHours(date)
    const defaultStart = dh?.open_time?.slice(0,5) || '10:00'
    const defaultEnd   = dh?.close_time?.slice(0,5) || '19:00'
    const companyId = isSuperAdmin ? null : adminUser?.company_id
    await supabase.from('schedules').insert({
      employee_id: empId, site_id: selSiteId, date,
      start_time: defaultStart, end_time: defaultEnd,
      lunch_mins: 60,
      ...(companyId ? { company_id: companyId } : {})
    })
    setSaving(false); onRefresh()
  }

  async function removeSchedule(schedId) {
    setSaving(true)
    await supabase.from('schedules').delete().eq('id', schedId)
    setSaving(false); onRefresh()
  }

  async function saveEditCell() {
    if (!editCell) return
    setSaving(true)
    const s = getEmpSchedule(editCell.empId, editCell.date)
    if (s) {
      await supabase.from('schedules').update({ start_time: editCell.start, end_time: editCell.end }).eq('id', s.id)
    }
    setEditCell(null); setSaving(false); onRefresh()
  }

  const timeOpts = Array.from({ length: 48 }, (_, i) => {
    const h = String(Math.floor(i / 2)).padStart(2, '0')
    const m = i % 2 === 0 ? '00' : '30'
    return `${h}:${m}`
  })

  if (sites.length === 0) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#4a5568', fontSize: 13 }}>No hay sucursales configuradas.</div>
  )

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <select value={selSiteId} onChange={e => setSelSiteId(e.target.value)}
          style={{ background: '#1a2035', border: '1px solid #1e2a45', color: '#f1f5f9', fontSize: 13, fontWeight: 600, padding: '7px 12px', borderRadius: 8, fontFamily: 'inherit', cursor: 'pointer' }}>
          {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={() => setWeekStart(w => addDays(w, -7))} style={{ background: '#1a2035', border: '1px solid #1e2a45', color: '#8892a8', borderRadius: 7, padding: '6px 10px', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>‹</button>
          <span style={{ fontSize: 12, color: '#8892a8', minWidth: 170, textAlign: 'center' }}>{weekLabel}</span>
          <button onClick={() => setWeekStart(w => addDays(w, 7))} style={{ background: '#1a2035', border: '1px solid #1e2a45', color: '#8892a8', borderRadius: 7, padding: '6px 10px', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>›</button>
        </div>
        <button onClick={() => setShowSiteHours(true)}
          style={{ background: 'rgba(59,130,246,.1)', border: '1px solid rgba(59,130,246,.25)', color: '#3b82f6', borderRadius: 7, padding: '6px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit', marginLeft: 'auto' }}>
          ⏰ Horario tienda
        </button>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        {/* Left: employee chips (mobile: horizontal scroll row) */}
        <div style={{ flexShrink: 0, width: 140 }}>
          <div style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.6px', color: '#4a5568', marginBottom: 8 }}>Empleados</div>
          {filteredEmps.length === 0 && (
            <div style={{ fontSize: 11, color: '#4a5568', padding: '8px 0' }}>Sin empleados asignados a esta tienda.</div>
          )}
          {filteredEmps.map(emp => (
            <div key={emp.id} draggable
              onDragStart={e => { e.dataTransfer.setData('empId', emp.id); e.dataTransfer.effectAllowed = 'copy' }}
              style={{ background: '#1a2035', border: '1px solid #1e2a45', borderRadius: 8, padding: '8px 10px', marginBottom: 6, cursor: 'grab', userSelect: 'none', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 14, color: '#4a5568' }}>⠿</span>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.name}</span>
            </div>
          ))}
        </div>

        {/* Right: 7-day columns */}
        <div style={{ flex: 1, overflowX: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(100px, 1fr))', gap: 6, minWidth: 700 }}>
            {weekDates.map(({ date, label, isToday, isPast }) => {
              const dh = getDayHours(date)
              const dayEmps = weekSchedForSite.filter(s => s.date === date)
              const isOver = dragOver === date
              return (
                <div key={date}
                  onDragOver={e => { e.preventDefault(); setDragOver(date) }}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={e => { e.preventDefault(); setDragOver(null); dropEmp(e.dataTransfer.getData('empId'), date) }}
                  style={{ background: isOver ? 'rgba(59,130,246,.08)' : '#1a2035', border: `1px solid ${isOver ? '#3b82f6' : isToday ? 'rgba(59,130,246,.3)' : '#1e2a45'}`, borderRadius: 10, minHeight: 120, display: 'flex', flexDirection: 'column', transition: 'border-color .15s, background .15s' }}>
                  {/* Day header */}
                  <div style={{ padding: '8px 10px', borderBottom: '1px solid #1e2a45' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: isToday ? '#3b82f6' : isPast ? '#4a5568' : '#f1f5f9' }}>{label} {date.slice(8)}</div>
                    {dh ? (
                      <div style={{ fontSize: 9, color: dh.is_open ? '#10b981' : '#4a5568', marginTop: 2 }}>
                        {dh.is_open ? `${dh.open_time?.slice(0,5)}–${dh.close_time?.slice(0,5)}` : '⛔ Cerrado'}
                      </div>
                    ) : (
                      <div style={{ fontSize: 9, color: '#2d3d5a', marginTop: 2 }}>Sin horario</div>
                    )}
                  </div>
                  {/* Assigned employees */}
                  <div style={{ padding: '6px 8px', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {dayEmps.map(s => {
                      const emp = allEmps.find(e => e.id === s.employee_id)
                      const isEditing = editCell?.empId === s.employee_id && editCell?.date === date
                      const dh2 = getDayHours(date)
                      const isSetup = dh2?.is_open && s.start_time && dh2.open_time && s.start_time < dh2.open_time
                      return (
                        <div key={s.id} style={{ background: isEditing ? '#0d1220' : 'rgba(59,130,246,.1)', border: `1px solid ${isEditing ? '#3b82f6' : 'rgba(59,130,246,.2)'}`, borderRadius: 6, padding: '5px 8px', fontSize: 11 }}>
                          {isEditing ? (
                            <div>
                              <div style={{ fontSize: 11, fontWeight: 600, color: '#f1f5f9', marginBottom: 5 }}>{emp?.name}</div>
                              <div style={{ display: 'flex', gap: 4, marginBottom: 5 }}>
                                <select value={editCell.start} onChange={e => setEditCell(p => ({...p, start: e.target.value}))}
                                  style={{ flex: 1, background: '#1a2035', border: '1px solid #1e2a45', color: '#f1f5f9', fontSize: 10, padding: '3px 4px', borderRadius: 4, fontFamily: 'inherit' }}>
                                  {timeOpts.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                                <span style={{ color: '#4a5568', alignSelf: 'center', fontSize: 10 }}>–</span>
                                <select value={editCell.end} onChange={e => setEditCell(p => ({...p, end: e.target.value}))}
                                  style={{ flex: 1, background: '#1a2035', border: '1px solid #1e2a45', color: '#f1f5f9', fontSize: 10, padding: '3px 4px', borderRadius: 4, fontFamily: 'inherit' }}>
                                  {timeOpts.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                              </div>
                              <div style={{ display: 'flex', gap: 4 }}>
                                <button onClick={saveEditCell} disabled={saving} style={{ flex: 1, background: '#3b82f6', border: 'none', color: '#fff', borderRadius: 4, padding: '3px 0', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit' }}>✓ Guardar</button>
                                <button onClick={() => setEditCell(null)} style={{ background: 'none', border: '1px solid #1e2a45', color: '#8892a8', borderRadius: 4, padding: '3px 6px', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit' }}>✕</button>
                              </div>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                              <div style={{ flex: 1, overflow: 'hidden' }}>
                                <div style={{ fontWeight: 600, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp?.name || '?'}</div>
                                <div style={{ fontSize: 9, color: '#8892a8', fontFamily: "'JetBrains Mono'" }}>
                                  {s.start_time?.slice(0,5)}–{s.end_time?.slice(0,5)}
                                  {isSetup && <span style={{ marginLeft: 4, color: '#f59e0b' }}>📦</span>}
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                                <button onClick={() => setEditCell({ empId: s.employee_id, date, start: s.start_time?.slice(0,5)||'10:00', end: s.end_time?.slice(0,5)||'19:00' })}
                                  style={{ background: 'none', border: 'none', color: '#8892a8', cursor: 'pointer', fontSize: 12, padding: '1px 3px', lineHeight: 1 }} title='Editar horas'>✎</button>
                                <button onClick={() => removeSchedule(s.id)}
                                  style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12, padding: '1px 3px', lineHeight: 1 }} title='Eliminar'>✕</button>
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}
                    {dayEmps.length === 0 && (
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#2d3d5a', padding: '8px 0', textAlign: 'center', borderRadius: 6, border: '1px dashed #1e2a45', minHeight: 40 }}>
                        Arrastra un empleado aquí
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {showSiteHours && selSiteId && (
        <SiteHoursModal
          siteId={selSiteId}
          siteName={sites.find(s => s.id === selSiteId)?.name || ''}
          siteHours={siteHours}
          onSave={async rows => {
            const upserts = rows.map((r, i) => ({ site_id: selSiteId, day_of_week: i, open_time: r.open, close_time: r.close, is_open: r.isOpen }))
            await supabase.from('site_hours').upsert(upserts, { onConflict: 'site_id,day_of_week' })
            setShowSiteHours(false); onRefresh(); setToast('Horario de tienda guardado')
          }}
          onClose={() => setShowSiteHours(false)}
        />
      )}
    </div>
  )
}
// ─── Site Hours Modal ─────────────────────────────────────────────────────────
function SiteHoursModal({ siteId, siteName, siteHours, onSave, onClose }) {
  const init = Array.from({ length: 7 }, (_, i) => {
    const existing = (siteHours || []).find(h => h.site_id === siteId && h.day_of_week === i)
    return { isOpen: existing?.is_open ?? true, open: existing?.open_time?.slice(0,5) ?? '10:00', close: existing?.close_time?.slice(0,5) ?? '22:00' }
  })
  const [rows, setRows] = useState(init)
  const [saving, setSaving] = useState(false)
  const upd = (i, k, v) => setRows(r => r.map((row, idx) => idx === i ? { ...row, [k]: v } : row))
  const timeOpts = Array.from({ length: 48 }, (_, i) => { const h = String(Math.floor(i/2)).padStart(2,'0'); const m = i%2===0?'00':'30'; return `${h}:${m}` })
  async function handleSave() { setSaving(true); await onSave(rows); setSaving(false) }
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: '0 12px' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#1a2035', border: '1px solid #1e2a45', borderRadius: 14, padding: 22, width: '100%', maxWidth: 420, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Horario de la tienda</div>
            <div style={{ fontSize: 11, color: '#8892a8', marginTop: 2 }}>{siteName}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid #1e2a45', borderRadius: 6, color: '#8892a8', fontSize: 18, cursor: 'pointer', padding: '2px 10px', lineHeight: 1 }}>×</button>
        </div>
        {DAY_NAMES.map((day, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, padding: '10px 12px', background: '#0d1220', borderRadius: 8, border: '1px solid #1e2a45' }}>
            <div style={{ width: 28, fontSize: 12, fontWeight: 600, color: rows[i].isOpen ? '#f1f5f9' : '#4a5568' }}>{day}</div>
            <button onClick={() => upd(i, 'isOpen', !rows[i].isOpen)}
              style={{ padding: '3px 10px', borderRadius: 5, border: 'none', background: rows[i].isOpen ? 'rgba(16,185,129,.2)' : 'rgba(239,68,68,.15)', color: rows[i].isOpen ? '#10b981' : '#ef4444', fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
              {rows[i].isOpen ? 'Abierto' : 'Cerrado'}
            </button>
            {rows[i].isOpen && <>
              <select value={rows[i].open} onChange={e => upd(i, 'open', e.target.value)}
                style={{ flex: 1, background: '#1a2035', border: '1px solid #1e2a45', color: '#f1f5f9', fontSize: 11, padding: '4px 6px', borderRadius: 5, fontFamily: 'inherit' }}>
                {timeOpts.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <span style={{ color: '#4a5568', fontSize: 11 }}>–</span>
              <select value={rows[i].close} onChange={e => upd(i, 'close', e.target.value)}
                style={{ flex: 1, background: '#1a2035', border: '1px solid #1e2a45', color: '#f1f5f9', fontSize: 11, padding: '4px 6px', borderRadius: 5, fontFamily: 'inherit' }}>
                {timeOpts.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </>}
          </div>
        ))}
        <button onClick={handleSave} disabled={saving}
          style={{ width: '100%', marginTop: 4, padding: '11px 0', borderRadius: 8, border: 'none', background: '#3b82f6', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', opacity: saving ? .6 : 1 }}>
          {saving ? 'Guardando...' : 'Guardar horario'}
        </button>
      </div>
    </div>
  )
}
// ─── Company Modal ────────────────────────────────────────────────────────────
function CompanyModal({ data, onSave, onClose }) {
  const [name, setName]   = useState(data?.name || '')
  const [slug, setSlug]   = useState(data?.slug || '')
  const [autoSlug, setAutoSlug] = useState(!data?.slug)
  const valid = name.trim() && slug.trim()
  function handleNameChange(val) { setName(val); if (autoSlug) setSlug(slugify(val)) }
  function handleSave() { const d = { ...(data || {}), name: name.trim(), slug: slug.trim() }; onSave(d) }
  const iS = { width:'100%',background:'#0d1220',border:'1px solid #1e2a45',color:'#f1f5f9',fontSize:12,padding:'8px 10px',borderRadius:6,outline:'none',fontFamily:'inherit' }
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#1a2035', border: '1px solid #1e2a45', borderRadius: 12, padding: 22, width: '100%', maxWidth: 400 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>{data ? 'Editar Empresa' : 'Nueva Empresa'}</h3>
        <div style={{ marginBottom: 10 }}><label style={{ fontSize:10,fontWeight:600,color:'#8892a8',display:'block',marginBottom:4 }}>Nombre de la empresa</label><input value={name} onChange={e => handleNameChange(e.target.value)} style={iS} placeholder='Ej: Mi Empresa SA de CV' /></div>
        <div style={{ marginBottom: 18 }}><label style={{ fontSize:10,fontWeight:600,color:'#8892a8',display:'block',marginBottom:4 }}>Slug (identificador único)</label><input value={slug} onChange={e => { setSlug(slugify(e.target.value)); setAutoSlug(false) }} style={{ ...iS, fontFamily:"'JetBrains Mono'" }} placeholder='mi-empresa' /><div style={{ fontSize:10,color:'#4a5568',marginTop:4 }}>Solo letras, números y guiones.</div></div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button disabled={!valid} onClick={handleSave} style={{ flex:1,padding:'10px 16px',borderRadius:7,border:'none',background:valid?'#3b82f6':'#1e2a45',color:'#fff',fontSize:12,fontWeight:600,cursor:valid?'pointer':'not-allowed',fontFamily:'inherit' }}>Guardar</button>
          <button onClick={onClose} style={{ padding:'10px 16px',borderRadius:7,border:'1px solid #1e2a45',background:'transparent',color:'#8892a8',fontSize:12,cursor:'pointer',fontFamily:'inherit' }}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}
