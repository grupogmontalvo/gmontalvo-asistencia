'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import { InstallButton, usePushNotifications } from '../components/PWAInstall'
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
  const [competitions, setCompetitions] = useState([])
  const [compSites, setCompSites] = useState([])    // competition_sites rows
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
  const [empSearch,    setEmpSearch]    = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [attEmpSearch, setAttEmpSearch] = useState('')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [feedbackLabel] = useState(() => Math.random() > 0.5 ? ['💡', 'Alguna idea?'] : ['💬', 'Te escuchamos'])
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [salesImportOpen, setSalesImportOpen] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
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
    let empsQuery = supabase.from('employees').select('*').order('name')
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
    let allEmpsQuery = supabase.from('employees').select('id, name, email, role, phone, skip_sales, skip_photo, free_roam, fixed_week, active, birth_date').order('name')
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
    const [s, e, ae, a, sc, g, esa, sh, comp, cs] = await Promise.all([
      sitesQuery, empsQuery, allEmpsQuery, attQuery, scQuery,
      supabase.from('employee_goals').select('*'),
      supabase.from('employee_site_assignments').select('*'),
      supabase.from('site_hours').select('*'),
      supabase.from('competitions').select('*').order('created_at', { ascending: false }),
      supabase.from('competition_sites').select('*'),
    ])
    const loadedSites = s.data || []
    const siteIdSet = new Set(loadedSites.map(x => x.id))
    // Filter att/schedules by loaded site IDs to handle records with null company_id
    const attData = (companyId && siteIdSet.size > 0) ? (a.data || []).filter(r => siteIdSet.has(r.site_id)) : (a.data || [])
    const scData  = (companyId && siteIdSet.size > 0) ? (sc.data || []).filter(r => siteIdSet.has(r.site_id)) : (sc.data || [])
    setSites(loadedSites)
    setEmps(e.data || [])
    setAllEmps(ae.data || [])
    setAtt(attData)
    setSchedules(scData)
    setGoals(g.data || [])
    setEmployeeSiteAssignments(esa.data || [])
    setSiteHours(sh.data || [])
    // Filter competitions to those that include at least one of the loaded sites
    const allComps = comp.data || []
    const allCs = cs.data || []
    const myCompIds = new Set(allCs.filter(c => siteIdSet.has(c.site_id)).map(c => c.competition_id))
    setCompetitions(allComps.filter(c => myCompIds.has(c.id) || c.created_by === adminUser?.id))
    setCompSites(allCs)
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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f8fafc', color: '#64748b', fontFamily: "'DM Sans'" }}>Cargando...</div>
  )
  const todaySchedules = schedules.filter(s => s.date === today)
  // Sort so latest record per employee comes first (supports multiple check-ins per day)
  const todayAtt       = att.filter(r => r.date === today).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

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
      if (record.lunch_start && !record.lunch_end) {
        color = '#f59e0b'; bg = 'rgba(245,158,11,.12)'; statusLabel = 'En comida'
      } else if (record.break_start && !record.break_end) {
        color = '#3b82f6'; bg = 'rgba(59,130,246,.12)'; statusLabel = 'En descanso'
      } else {
        color = stClr[record.status] || '#10b981'; bg = stBg[record.status] || 'rgba(16,185,129,.12)'; statusLabel = stLbl[record.status] || 'Activo'
      }
    } else {
      const grace = site?.grace_mins || 5; const absent = site?.absent_mins || 15; const start = sc.start_time?.slice(0, 5)
      if (start) {
        const [sh, sm] = start.split(':').map(Number); const [nh, nm] = nowTime.split(':').map(Number)
        const diffMins = (nh * 60 + nm) - (sh * 60 + sm)
        if (diffMins < 0) { color = '#64748b'; bg = 'rgba(136,146,168,.1)'; statusLabel = 'Esperado' }
        else if (diffMins === 0) { color = '#10b981'; bg = 'rgba(16,185,129,.12)'; statusLabel = 'En hora' }
        else if (diffMins <= grace) { color = '#f59e0b'; bg = 'rgba(245,158,11,.12)'; statusLabel = 'En tolerancia' }
        else if (diffMins <= absent) { color = '#f59e0b'; bg = 'rgba(245,158,11,.12)'; statusLabel = 'Tolerancia vencida' }
        else { color = '#ef4444'; bg = 'rgba(239,68,68,.12)'; statusLabel = 'No se presentó' }
      } else { color = '#64748b'; bg = 'rgba(136,146,168,.1)'; statusLabel = 'Esperado' }
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
    if (attEmpSearch.trim()) {
      const emp = allEmps.find(e => e.id === r.employee_id)
      if (!emp || !emp.name.toLowerCase().includes(attEmpSearch.toLowerCase())) return false
    }
    return true
  })
  function exportAttCSV() {
    const headers = ['Fecha','Empleado','Sucursal','Entrada','Salida','Horas','Ventas','Estado']
    const rows = filteredAtt.map(r => {
      const emp = allEmps.find(e => e.id === r.employee_id)
      const site = sites.find(s => s.id === r.site_id)
      const tz = site?.timezone || 'America/Cancun'
      return [
        r.date,
        emp?.name || '?',
        site?.name || '?',
        r.check_in ? new Date(r.check_in).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz }) : '',
        r.check_out ? new Date(r.check_out).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz }) : '',
        r.hours_worked || '',
        r.sales_amount || '',
        stLbl[r.status] || r.status || '',
      ]
    })
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `asistencia-${today}.csv`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

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
  async function toggleEmpActive(emp) {
    await supabase.from('employees').update({ active: !emp.active }).eq('id', emp.id)
    setToast(emp.active ? 'Empleado desactivado' : 'Empleado reactivado'); load()
  }
  async function delSite(id) { await supabase.from('sites').update({ active: false }).eq('id', id); setToast('Sitio eliminado'); setModal(null); load() }
  async function resetAdminPwd(au) {
    const res = await fetch('/api/admin/invite', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: au.id }) })
    const json = await res.json()
    if (!res.ok) { setToast('Error al resetear contraseña'); return }
    setModal({ type: 'showPwd', data: { name: au.name, email: au.email, pwd: json.password } })
  }
  async function deleteAdminUser(au) {
    if (!confirm(`¿Eliminar a ${au.name}? Se borrará su acceso permanentemente.`)) return
    await fetch(`/api/admin/invite?id=${au.id}`, { method: 'DELETE' })
    setToast('Usuario eliminado'); load()
  }
  function getSiteUrl(code) {
    if (typeof window === 'undefined') return ''
    return `${window.location.origin}/checkin/${code}`
  }
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#f8fafc', color: '#64748b', fontFamily: "'DM Sans'" }}>Cargando...</div>
  )
  if (empPage) {
    const empAtt = att.filter(r => r.employee_id === empPage.id)
    return (
      <div style={{ background: '#f8fafc', minHeight: '100vh', fontFamily: "'DM Sans', sans-serif", color: '#0f172a', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '12px 18px', borderBottom: '1px solid #e2e8f0', background: '#ffffff', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <button onClick={() => setEmpPage(null)} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 7, color: '#64748b', cursor: 'pointer', padding: '6px 14px', fontSize: 13, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>← Volver</button>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{empPage.name}</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>{empPage.email} · {empPage.role}</div>
          </div>
        </div>
        <EmpSidePanel emp={empPage} att={empAtt} sites={sites} onClose={() => setEmpPage(null)} onRefresh={load} fullPage />
      </div>
    )
  }
  const inputStyle = { width: '100%', background: '#ffffff', border: '1px solid #e2e8f0', color: '#0f172a', fontSize: 12, padding: '7px 10px', borderRadius: 6, outline: 'none', fontFamily: 'inherit' }
  const selectStyle = { ...inputStyle }
  const activeCompany = isSuperAdmin
    ? (selectedCompanyId ? companies.find(c => c.id === selectedCompanyId) : null)
    : companies.find(c => c.id === adminUser?.company_id)
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: "'DM Sans', sans-serif", background: '#f8fafc', color: '#0f172a' }}>
      <style>{`@media(max-width:767px){.sb-overlay{display:block!important}}`}</style>
      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} className="sb-overlay" style={{ display: 'none', position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 99 }} />}
      <div style={{ width: sidebarOpen ? 210 : 0, minWidth: sidebarOpen ? 210 : 0, background: '#f1f5f9', borderRight: sidebarOpen ? '1px solid #e2e8f0' : 'none', display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden', transition: 'width .2s ease, min-width .2s ease', position: 'relative', zIndex: 100 }}>
        <div style={{ width: 210, display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ padding: 16, borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src="/logo.jpeg" style={{ width: 32, height: 32, borderRadius: 8 }} alt="GM" />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>G.Montalvo</div>
              <div style={{ fontSize: 9, color: '#64748b' }}>Control de Asistencia</div>
            </div>
          </div>
          {isSuperAdmin && (
            <div style={{ padding: '8px 10px', borderBottom: '1px solid #e2e8f0', background: 'rgba(59,130,246,.05)' }}>
              <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>Empresa</div>
              <select value={selectedCompanyId} onChange={e => setSelectedCompanyId(e.target.value)} style={{ width: '100%', background: '#ffffff', border: '1px solid #e2e8f0', color: '#0f172a', fontSize: 11, padding: '5px 8px', borderRadius: 5, fontFamily: 'inherit' }}>
                <option value=''>Todas</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}
          <nav style={{ flex: 1, padding: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: '#94a3b8', padding: '8px 8px 4px' }}>Principal</div>
            {[{ id: 'dashboard', lb: '🏠 Dashboard' }, { id: 'schedules', lb: '📅 Horarios' }, { id: 'alerts', lb: '🔔 Mis alertas' }, { id: 'attendance', lb: '✅ Asistencia' }, { id: 'competitions', lb: '🏆 Competencias' }].map(n => (
              <button key={n.id} onClick={() => { setTab(n.id); if (window.innerWidth < 768) setSidebarOpen(false) }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500, color: tab === n.id ? (n.id === 'alerts' ? '#f59e0b' : '#3b82f6') : '#64748b', background: tab === n.id ? (n.id === 'alerts' ? 'rgba(245,158,11,.1)' : 'rgba(59,130,246,.12)') : 'transparent', border: 'none', width: '100%', textAlign: 'left', fontFamily: 'inherit' }}>{n.lb}</button>
            ))}
            <div style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: '#94a3b8', padding: '12px 8px 4px' }}>Gestión</div>
            {[{ id: 'employees', lb: '👥 Empleados' }, { id: 'sites', lb: '📍 Sitios' }].map(n => (
              <button key={n.id} onClick={() => { setTab(n.id); if (window.innerWidth < 768) setSidebarOpen(false) }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500, color: tab === n.id ? '#3b82f6' : '#64748b', background: tab === n.id ? 'rgba(59,130,246,.12)' : 'transparent', border: 'none', width: '100%', textAlign: 'left', fontFamily: 'inherit' }}>{n.lb}</button>
            ))}
            {(isSuperAdmin || isCompanyAdmin) && <>
              <div style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, color: '#94a3b8', padding: '12px 8px 4px' }}>Admin</div>
              {[{ id: 'users', lb: '🔑 Usuarios' }, ...(isSuperAdmin ? [{ id: 'companies', lb: '🏢 Empresas' }] : [])].map(n => (
                <button key={n.id} onClick={() => { setTab(n.id); if (window.innerWidth < 768) setSidebarOpen(false) }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 500, color: tab === n.id ? '#3b82f6' : '#64748b', background: tab === n.id ? 'rgba(59,130,246,.12)' : 'transparent', border: 'none', width: '100%', textAlign: 'left', fontFamily: 'inherit' }}>{n.lb}</button>
              ))}
            </>}
            {/* Instalar PWA */}
            <InstallButton style={{ marginTop: 8 }} />
            {/* Te escuchamos */}
            <div style={{ marginTop: 8, borderTop: '1px solid #e2e8f0', paddingTop: 8 }}>
              <button onClick={() => setFeedbackOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, color: feedbackLabel[0] === '💡' ? '#a78bfa' : '#10b981', background: feedbackLabel[0] === '💡' ? 'rgba(139,92,246,.08)' : 'rgba(16,185,129,.07)', border: `1px solid ${feedbackLabel[0] === '💡' ? 'rgba(139,92,246,.2)' : 'rgba(16,185,129,.15)'}`, width: '100%', textAlign: 'left', fontFamily: 'inherit' }}>
                {feedbackLabel[0]} {feedbackLabel[1]}
              </button>
            </div>
          </nav>
          <div style={{ padding: '12px 8px', borderTop: '1px solid #e2e8f0', marginTop: 4 }}>
            <div style={{ fontSize: 10, color: '#94a3b8', padding: '0 8px 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{adminUser?.name || authUser?.email}</div>
            <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, color: '#ef4444', background: 'transparent', border: 'none', width: '100%', textAlign: 'left', fontFamily: 'inherit' }}>Cerrar sesión</button>
          </div>
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '16px 22px', borderBottom: '1px solid #e2e8f0', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => setSidebarOpen(o => !o)} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 6, color: '#64748b', cursor: 'pointer', padding: '5px 9px', fontSize: 16, lineHeight: 1, fontFamily: 'inherit' }}>☰</button>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <h1 style={{ fontSize: 17, fontWeight: 700 }}>{{ dashboard: 'Dashboard', schedules: 'Horarios', attendance: 'Asistencia', employees: 'Empleados', sites: 'Sitios', users: 'Usuarios', companies: 'Empresas', competitions: 'Competencias' }[tab]}</h1>
                {activeCompany && <span style={{ fontSize: 10, color: '#3b82f6', background: 'rgba(59,130,246,.1)', border: '1px solid rgba(59,130,246,.2)', borderRadius: 4, padding: '2px 8px', fontWeight: 600 }}>{activeCompany.name}</span>}
              </div>
              <p style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>{new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Cancun' })}</p>
            </div>
          </div>
          {tab === 'employees'  && <button onClick={() => setModal({ type: 'emp', data: null })} style={{ padding: '7px 14px', borderRadius: 7, border: 'none', background: '#3b82f6', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>+ Nuevo Empleado</button>}
          {tab === 'sites'      && <button onClick={() => setModal({ type: 'site', data: null })} style={{ padding: '7px 14px', borderRadius: 7, border: 'none', background: '#3b82f6', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>+ Nuevo Sitio</button>}
          {tab === 'users'      && (isSuperAdmin || isCompanyAdmin) && <button onClick={() => setModal({ type: 'adminUser', data: null })} style={{ padding: '7px 14px', borderRadius: 7, border: 'none', background: '#3b82f6', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>+ Nuevo Usuario</button>}
          {tab === 'companies'  && isSuperAdmin && <button onClick={() => setModal({ type: 'company', data: null })} style={{ padding: '7px 14px', borderRadius: 7, border: 'none', background: '#3b82f6', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>+ Nueva Empresa</button>}
          {tab === 'competitions' && <button onClick={() => setModal({ type: 'competition', data: null })} style={{ padding: '7px 14px', borderRadius: 7, border: 'none', background: '#f59e0b', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>+ Nueva Competencia</button>}
        </div>
        <div style={{ flex: 1, padding: '14px 12px', overflow: 'auto' }}>
          {tab === 'dashboard' && <UnifiedDashboard
            sites={sites} allEmps={allEmps} att={att}
            todayAtt={todayAtt} schedules={schedules} todaySchedules={todaySchedules}
            siteHours={siteHours} today={today}
            dashRows={dashRows} unscheduledAtt={unscheduledAtt}
            sitesWorking={sitesWorking} peopleWorking={peopleWorking}
            setEmpPage={setEmpPage}
          />}
          {tab === 'attendance' && <>
            {/* Search bar */}
            <div style={{ marginBottom: 10, position: 'relative' }}>
              <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#94a3b8', pointerEvents: 'none' }}>🔍</span>
              <input value={attEmpSearch} onChange={e => setAttEmpSearch(e.target.value)}
                placeholder='Buscar empleado por nombre...'
                style={{ width: '100%', background: '#ffffff', border: '1px solid #e2e8f0', color: '#0f172a', fontSize: 12, padding: '9px 36px', borderRadius: 8, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
              {attEmpSearch && <button onClick={() => setAttEmpSearch('')} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#94a3b8', lineHeight: 1 }}>✕</button>}
            </div>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '14px 16px', marginBottom: 14, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
              {/* FIX BUG 2: usar allEmps para el filtro de empleados */}
              {[['Empleado', filterEmp, setFilterEmp, allEmps.map(e => [e.id, e.name])],['Sucursal', filterSite, setFilterSite, sites.map(s => [s.id, s.name])]].map(([l, val, set, opts]) => (
                <div key={l}>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>{l}</div>
                  <select value={val} onChange={e => set(e.target.value)} style={selectStyle}>
                    <option value=''>Todos</option>
                    {opts.map(([v, n]) => <option key={v} value={v}>{n}</option>)}
                  </select>
                </div>
              ))}
              {[['Desde', filterFrom, setFilterFrom], ['Hasta', filterTo, setFilterTo]].map(([l, val, set]) => (
                <div key={l}>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>{l}</div>
                  <input type='date' value={val} onChange={e => set(e.target.value)} style={inputStyle} />
                </div>
              ))}
              <div>
                <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>Estado</div>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={selectStyle}>
                  <option value=''>Todos</option>
                  <option value='on_time'>Puntual</option><option value='tolerancia'>Tolerancia</option><option value='late'>Retardo</option><option value='absent'>Falta</option>
                </select>
              </div>
            </div>
            <div style={{ marginBottom: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, color: '#64748b' }}>{filteredAtt.length} registro{filteredAtt.length !== 1 ? 's' : ''} encontrado{filteredAtt.length !== 1 ? 's' : ''}</span>
              <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setExportOpen(true)}
                style={{ background: 'rgba(16,185,129,.1)', border: '1px solid rgba(16,185,129,.3)', borderRadius: 5, color: '#10b981', fontSize: 10, padding: '4px 12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>📊 Exportar</button>
              <button onClick={exportAttCSV} disabled={filteredAtt.length === 0}
                style={{ background: filteredAtt.length > 0 ? 'rgba(16,185,129,.1)' : 'transparent', border: '1px solid ' + (filteredAtt.length > 0 ? 'rgba(16,185,129,.3)' : '#e2e8f0'), borderRadius: 5, color: filteredAtt.length > 0 ? '#10b981' : '#94a3b8', fontSize: 10, padding: '4px 12px', cursor: filteredAtt.length > 0 ? 'pointer' : 'default', fontFamily: 'inherit', fontWeight: 600 }}>⬇ CSV rápido</button>
              <button onClick={() => setSalesImportOpen(true)}
                style={{ background: 'rgba(139,92,246,.1)', border: '1px solid rgba(139,92,246,.3)', borderRadius: 5, color: '#a78bfa', fontSize: 10, padding: '4px 12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>⬆ Ventas</button>
              <button onClick={() => { setFilterEmp(''); setFilterSite(''); setFilterFrom(''); setFilterTo(''); setFilterStatus(''); setAttEmpSearch('') }} style={{ background: (filterEmp||filterSite||filterFrom||filterTo||filterStatus) ? 'rgba(59,130,246,.12)' : 'transparent', border: '1px solid '+((filterEmp||filterSite||filterFrom||filterTo||filterStatus)?'#3b82f6':'#e2e8f0'), borderRadius: 5, color: (filterEmp||filterSite||filterFrom||filterTo||filterStatus)?'#3b82f6':'#94a3b8', fontSize: 10, padding: '4px 12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Limpiar filtros</button>
              </div>
            </div>
            <AttendanceTable filteredAtt={filteredAtt} allEmps={allEmps} sites={sites} adminUser={adminUser} adminUsers={adminUsers} onEmpClick={setEmpPage} onRefresh={load} setToast={setToast} />
          </>}

          {tab === 'competitions' && <CompetitionsPanel
            competitions={competitions} compSites={compSites}
            sites={sites} allEmps={allEmps} att={att}
            adminUser={adminUser} isSuperAdmin={isSuperAdmin}
            onEdit={c => setModal({ type: 'competition', data: c })}
            onRefresh={load}
          />}
          {tab === 'schedules' && <ScheduleBoard sites={sites} allEmps={allEmps} schedules={schedules} employeeSiteAssignments={employeeSiteAssignments} siteHours={siteHours} isSuperAdmin={isSuperAdmin} adminUser={adminUser} onRefresh={load} setToast={setToast} />}
          {tab === 'employees' && (() => {
            const filteredEmps = emps.filter(e => {
              if (!showInactive && !e.active) return false
              if (empSearch.trim() && !e.name.toLowerCase().includes(empSearch.toLowerCase()) && !(e.email||'').toLowerCase().includes(empSearch.toLowerCase())) return false
              return true
            })
            return (
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
              {/* Search bar + inactive toggle */}
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
                  <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#94a3b8', pointerEvents: 'none' }}>🔍</span>
                  <input value={empSearch} onChange={e => setEmpSearch(e.target.value)}
                    placeholder='Buscar por nombre o email...'
                    style={{ width: '100%', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#0f172a', fontSize: 12, padding: '7px 10px 7px 32px', borderRadius: 7, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
                  {empSearch && <button onClick={() => setEmpSearch('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#94a3b8', lineHeight: 1 }}>✕</button>}
                </div>
                <button onClick={() => setShowInactive(v => !v)}
                  style={{ padding: '7px 14px', borderRadius: 7, border: `1px solid ${showInactive ? '#f59e0b' : '#e2e8f0'}`, background: showInactive ? 'rgba(245,158,11,.1)' : 'transparent', color: showInactive ? '#b45309' : '#64748b', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                  {showInactive ? '👁 Ocultando inactivos' : '👁 Mostrar inactivos'}
                </button>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>{filteredEmps.filter(e=>e.active).length} activo{filteredEmps.filter(e=>e.active).length!==1?'s':''}{!showInactive ? '' : `, ${filteredEmps.filter(e=>!e.active).length} inactivo${filteredEmps.filter(e=>!e.active).length!==1?'s':''}`}</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
                <thead><tr>{['Empleado','Email','Rol','Sucursales','Meta semanal','Próx. turno',''].map(h => (
                  <th key={h} style={{ textAlign: 'left', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.6px', color: '#94a3b8', padding: '9px 16px', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                ))}</tr></thead>
                <tbody>
                  {filteredEmps.map(emp => {
                    const empScheds = schedules.filter(s => s.employee_id === emp.id && s.date >= today).sort((a,b) => a.date.localeCompare(b.date))
                    const nextSched = empScheds[0]; const nextSite = nextSched ? sites.find(s => s.id === nextSched.site_id) : null
                    const goal = goals.find(g => g.employee_id === emp.id)
                    const empSiteIds = employeeSiteAssignments.filter(a => a.employee_id === emp.id).map(a => a.site_id)
                    const empSiteNames = empSiteIds.map(sid => sites.find(s => s.id === sid)?.name).filter(Boolean)
                    return (
                      <tr key={emp.id} style={{ borderBottom: '1px solid rgba(226,232,240,.3)', opacity: emp.active ? 1 : 0.5, background: emp.active ? 'transparent' : 'rgba(226,232,240,.2)' }}>
                        <td style={{ padding: '9px 16px' }}>
                          <button onClick={() => emp.active && setEmpPage(emp)} style={{ background: 'none', border: 'none', padding: 0, cursor: emp.active ? 'pointer' : 'default', textAlign: 'left', fontFamily: 'inherit' }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: emp.active ? '#3b82f6' : '#94a3b8', textDecoration: emp.active ? 'underline' : 'none', textDecorationColor: 'rgba(59,130,246,.3)', display: 'flex', alignItems: 'center', gap: 6 }}>
                              {emp.name}
                              {!emp.active && <span style={{ fontSize: 9, fontWeight: 700, color: '#94a3b8', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 3, padding: '1px 5px' }}>INACTIVO</span>}
                            </div>
                            <div style={{ fontSize: 10, color: '#94a3b8' }}>{emp.phone || ''}</div>
                          </button>
                        </td>
                        <td style={{ padding: '9px 16px', fontSize: 11, color: '#64748b' }}>{emp.email}</td>
                        <td style={{ padding: '9px 16px' }}>
                          <span style={{ fontSize: 11, color: '#64748b' }}>{emp.role}</span>
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
                                : <span style={{ fontSize: 10, color: '#94a3b8' }}>Sin meta</span>}
                        </td>
                        <td style={{ padding: '9px 16px' }}>
                          {emp.active ? (nextSched ? (
                            <div>
                              <div style={{ fontSize: 11, color: '#0f172a', fontWeight: 600 }}>{fmtDate(nextSched.date)}{nextSched.date === today ? <span style={{ marginLeft: 6, fontSize: 9, color: '#10b981', fontWeight: 700 }}>HOY</span> : ''}</div>
                              <div style={{ fontSize: 10, color: '#94a3b8', fontFamily: "'JetBrains Mono'" }}>{nextSched.start_time?.slice(0,5)} – {nextSched.end_time?.slice(0,5)} · {nextSite?.name}</div>
                            </div>
                          ) : <span style={{ fontSize: 10, color: '#f59e0b' }}>Sin turno próximo</span>) : <span style={{ fontSize: 10, color: '#94a3b8' }}>—</span>}
                        </td>
                        <td style={{ padding: '9px 16px' }}>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            {emp.active && <button onClick={() => setEmpPage(emp)} style={{ padding: '4px 10px', borderRadius: 5, border: '1px solid rgba(16,185,129,.25)', background: 'rgba(16,185,129,.1)', color: '#10b981', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Historial</button>}
                            {emp.active && <button onClick={() => setModal({ type: 'schedule', data: emp })} style={{ padding: '4px 10px', borderRadius: 5, border: '1px solid rgba(59,130,246,.25)', background: 'rgba(59,130,246,.12)', color: '#3b82f6', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Horarios</button>}
                            {emp.active && <button onClick={() => setModal({ type: 'emp', data: { emp, goal } })} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>Editar</button>}
                            <button onClick={() => toggleEmpActive(emp)}
                              style={{ padding: '4px 10px', borderRadius: 5, border: `1px solid ${emp.active ? 'rgba(239,68,68,.3)' : 'rgba(16,185,129,.3)'}`, background: emp.active ? 'rgba(239,68,68,.08)' : 'rgba(16,185,129,.08)', color: emp.active ? '#ef4444' : '#10b981', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                              {emp.active ? 'Desactivar' : '✓ Reactivar'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              </div>
              {filteredEmps.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>{empSearch ? 'Sin resultados para "' + empSearch + '"' : 'No hay empleados. Agrega el primero.'}</div>}
            </div>
            )
          })()}
          {tab === 'sites' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sites.map(site => (
                <div key={site.id} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 2 }}>{site.name}</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>{site.address}</div>
                    <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 4 }}>Tolerancia: {site.grace_mins}min · Radio GPS: {site.radius_m}m</div>
                    <div style={{ fontSize: 10, color: '#3b82f6', marginTop: 4, wordBreak: 'break-all' }}>QR: {getSiteUrl(site.code)}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 11, color: '#3b82f6', background: 'rgba(59,130,246,.12)', padding: '3px 8px', borderRadius: 4, fontWeight: 600 }}>{site.code}</span>
                    <button onClick={() => { navigator.clipboard.writeText(getSiteUrl(site.code)); setToast('URL copiada') }} style={{ padding: '5px 10px', borderRadius: 5, border: '1px solid #e2e8f0', background: 'transparent', color: '#64748b', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit' }}>Copiar URL</button>
                    <button onClick={() => setModal({ type: 'qr', data: site })} style={{ padding: '5px 10px', borderRadius: 5, border: '1px solid rgba(59,130,246,.25)', background: 'rgba(59,130,246,.12)', color: '#3b82f6', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Ver QR</button>
                    <button onClick={() => setModal({ type: 'site', data: site })} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>Editar</button>
                    <button onClick={() => { if (confirm('Eliminar ' + site.name + '?')) delSite(site.id) }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>Eliminar</button>
                  </div>
                </div>
              ))}
              {sites.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 12, background: '#ffffff', borderRadius: 10, border: '1px solid #e2e8f0' }}>No hay sitios. Agrega el primero.</div>}
            </div>
          )}
          {tab === 'users' && (isSuperAdmin || isCompanyAdmin) && (
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                <thead><tr>{['Usuario','Email','Empresa','Rol','Sucursales',''].map(h => (
                  <th key={h} style={{ textAlign: 'left', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.6px', color: '#94a3b8', padding: '9px 16px', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                ))}</tr></thead>
                <tbody>
                  {adminUsers.map(au => {
                    const auSites = (au.admin_site_permissions || []).map(p => sites.find(s => s.id === p.site_id)?.name).filter(Boolean)
                    const auCompany = companies.find(c => c.id === au.company_id)
                    const isActive = au.active !== false
                    return (
                      <tr key={au.id} style={{ borderBottom: '1px solid rgba(226,232,240,.3)', opacity: isActive ? 1 : 0.5 }}>
                        <td style={{ padding: '9px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: isActive ? '#10b981' : '#94a3b8', flexShrink: 0 }} />
                            <div style={{ fontSize: 12, fontWeight: 600 }}>{au.name}</div>
                          </div>
                        </td>
                        <td style={{ padding: '9px 16px', fontSize: 11, color: '#64748b' }}>{au.email}</td>
                        <td style={{ padding: '9px 16px', fontSize: 11, color: '#64748b' }}>{au.role === 'superadmin' ? <span style={{ color: '#94a3b8' }}>—</span> : (auCompany?.name || <span style={{ color: '#ef4444' }}>Sin empresa</span>)}</td>
                        <td style={{ padding: '9px 16px' }}><span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, color: au.role === 'superadmin' ? '#3b82f6' : au.role === 'company_admin' ? '#a855f7' : '#10b981', background: au.role === 'superadmin' ? 'rgba(59,130,246,.12)' : au.role === 'company_admin' ? 'rgba(168,85,247,.12)' : 'rgba(16,185,129,.12)' }}>{au.role === 'superadmin' ? 'Super Admin' : au.role === 'company_admin' ? 'Admin Empresa' : 'Gerente'}</span></td>
                        <td style={{ padding: '9px 16px', fontSize: 11, color: '#64748b' }}>{au.role === 'superadmin' ? <span style={{ color: '#94a3b8' }}>Todas</span> : au.role === 'company_admin' ? <span style={{ color: '#94a3b8' }}>Empresa</span> : auSites.length > 0 ? auSites.join(', ') : <span style={{ color: '#ef4444' }}>Sin asignar</span>}</td>
                        <td style={{ padding: '9px 16px' }}>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            <button onClick={() => setModal({ type: 'adminUser', data: au })} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>Editar</button>
                            {au.id !== authUser?.id && (<>
                              <button onClick={() => resetAdminPwd(au)} style={{ background: 'none', border: 'none', color: '#f59e0b', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>Reset pwd</button>
                              {isActive
                                ? <button onClick={async () => { if (confirm('Desactivar a ' + au.name + '?')) { await supabase.from('admin_users').update({ active: false }).eq('id', au.id); await load(); setToast('Usuario desactivado') } }} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>Desactivar</button>
                                : <button onClick={async () => { await supabase.from('admin_users').update({ active: true }).eq('id', au.id); await load(); setToast('Usuario reactivado') }} style={{ background: 'none', border: 'none', color: '#10b981', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>Reactivar</button>}
                              <button onClick={() => deleteAdminUser(au)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>Eliminar</button>
                            </>)}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {adminUsers.length === 0 && <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>No hay usuarios admin.</td></tr>}
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
                  <div key={company.id} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>{company.name}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: "'JetBrains Mono'" }}>slug: {company.slug}</div>
                      <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>{compSites} sucursal{compSites !== 1 ? 'es' : ''} · {compEmps} empleado{compEmps !== 1 ? 's' : ''}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button onClick={() => setSelectedCompanyId(company.id)} style={{ padding: '5px 10px', borderRadius: 5, border: '1px solid rgba(59,130,246,.25)', background: selectedCompanyId === company.id ? 'rgba(59,130,246,.2)' : 'rgba(59,130,246,.1)', color: '#3b82f6', fontSize: 10, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>Ver datos</button>
                      <button onClick={() => setModal({ type: 'company', data: company })} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>Editar</button>
                    </div>
                  </div>
                )
              })}
              {companies.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: '#94a3b8', fontSize: 12, background: '#ffffff', borderRadius: 10, border: '1px solid #e2e8f0' }}>No hay empresas.</div>}
            </div>
          )}
          {tab === 'alerts' && <AlertsPanel adminUserId={adminUser?.id} adminEmail={adminUser?.email} />}
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
      {modal?.type === 'adminUser' && <AdminUserModal data={modal.data} sites={sites} companies={companies} isSuperAdmin={isSuperAdmin} isCompanyAdmin={isCompanyAdmin} adminUser={adminUser} onSave={async () => { await load(); setToast('Usuario guardado'); setModal(null) }} onClose={() => setModal(null)} onResetPwd={resetAdminPwd} />}
      {modal?.type === 'competition' && (
        <CompetitionModal
          data={modal.data}
          sites={sites}
          allEmps={allEmps}
          adminUser={adminUser}
          permittedSiteIds={sites.map(s => s.id)}
          onSave={async (formData, siteIds) => {
            const isNew = !formData.id
            let compId = formData.id
            if (isNew) {
              delete formData.id
              formData.created_by = adminUser?.id
              formData.company_id = adminUser?.company_id || null
              const { data: nc } = await supabase.from('competitions').insert(formData).select().single()
              compId = nc?.id
            } else {
              await supabase.from('competitions').update(formData).eq('id', formData.id)
            }
            if (compId) {
              await supabase.from('competition_sites').delete().eq('competition_id', compId)
              if (siteIds.length > 0) {
                await supabase.from('competition_sites').insert(siteIds.map(sid => ({ competition_id: compId, site_id: sid })))
              }
            }
            setToast('Competencia guardada'); setModal(null); load()
          }}
          onDelete={async (id) => {
            await supabase.from('competitions').delete().eq('id', id)
            setToast('Competencia eliminada'); setModal(null); load()
          }}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'company'   && <CompanyModal   data={modal.data} onSave={saveCompany} onClose={() => setModal(null)} />}
      {modal?.type === 'showPwd' && (
        <div onClick={() => setModal(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 24, width: '100%', maxWidth: 380, textAlign: 'center' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#10b981', marginBottom: 10 }}>✅ Nueva contraseña generada</div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>Envía estos datos a <strong style={{ color: '#0f172a' }}>{modal.data.name}</strong></div>
            <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '14px 16px', marginBottom: 16, textAlign: 'left' }}>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Email: <span style={{ color: '#0f172a', fontFamily: "'JetBrains Mono'" }}>{modal.data.email}</span></div>
              <div style={{ fontSize: 12, color: '#64748b' }}>Contraseña: <span style={{ color: '#3b82f6', fontFamily: "'JetBrains Mono'", fontWeight: 700, fontSize: 15 }}>{modal.data.pwd}</span></div>
            </div>
            <button onClick={() => { navigator.clipboard.writeText(`Email: ${modal.data.email}\nContraseña: ${modal.data.pwd}`); setToast('¡Copiado!') }} style={{ width: '100%', padding: '11px', borderRadius: 7, border: 'none', background: '#3b82f6', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 8 }}>📋 Copiar credenciales</button>
            <button onClick={() => setModal(null)} style={{ width: '100%', padding: '9px', borderRadius: 7, border: '1px solid #e2e8f0', background: 'transparent', color: '#64748b', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Cerrar</button>
          </div>
        </div>
      )}
      {exportOpen && <ExportModal att={att} allEmps={allEmps} sites={sites} schedules={schedules} goals={goals} adminUsers={adminUsers} onClose={() => setExportOpen(false)} setToast={setToast} />}
      {salesImportOpen && <SalesImportModal sites={sites} allEmps={allEmps} att={att} schedules={schedules} adminUser={adminUser} employeeSiteAssignments={employeeSiteAssignments} onClose={() => setSalesImportOpen(false)} onDone={() => { setSalesImportOpen(false); load() }} setToast={setToast} />}
      <FeedbackButton open={feedbackOpen} onClose={() => setFeedbackOpen(false)} adminUser={adminUser} />
      {toast && <div style={{ position: 'fixed', bottom: 20, right: 20, background: '#ffffff', border: '1px solid rgba(16,185,129,.25)', borderRadius: 8, padding: '10px 16px', fontSize: 12, fontWeight: 500, zIndex: 200, color: '#10b981' }}>{toast}</div>}
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
  const iS = { background: '#ffffff', border: '1px solid #cbd5e1', color: '#0f172a', fontSize: 11, padding: '7px 10px', borderRadius: 6, outline: 'none', fontFamily: 'inherit', colorScheme: 'dark' }
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
      ? { flex: 1, background: '#f8fafc', display: 'flex', flexDirection: 'column', overflow: 'auto' }
      : { position: 'fixed', top: 0, right: 0, width: 480, height: '100vh', background: '#ffffff', borderLeft: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', zIndex: 150, boxShadow: '-8px 0 32px rgba(0,0,0,.4)' }}>
      {!fullPage && (
        <div style={{ padding: '18px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>{emp.name}</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{emp.email} · {emp.role}</div>
          </div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowColPicker(p => !p)} style={{ background: showColPicker ? 'rgba(59,130,246,.12)' : 'none', border: '1px solid '+(showColPicker?'#3b82f6':'#e2e8f0'), borderRadius: 6, color: showColPicker?'#3b82f6':'#64748b', fontSize: 11, cursor: 'pointer', padding: '4px 10px', fontFamily: 'inherit' }}>Columnas</button>
              {showColPicker && (
                <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', right: 0, top: 34, background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, zIndex: 10, minWidth: 160, boxShadow: '0 8px 24px rgba(0,0,0,.4)' }}>
                  {ALL_COLS.map(c => (
                    <label key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer', color: '#0f172a', padding: '4px 0' }}>
                      <input type='checkbox' checked={visibleCols.includes(c.key)} onChange={() => setVisibleCols(p => p.includes(c.key) ? p.filter(k => k !== c.key) : [...p, c.key])} style={{ accentColor: '#3b82f6' }} />
                      {c.label}
                    </label>
                  ))}
                </div>
              )}
            </div>
            <button onClick={onClose} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 6, color: '#64748b', fontSize: 18, cursor: 'pointer', padding: '2px 10px', lineHeight: 1 }}>×</button>
          </div>
        </div>
      )}
      {fullPage && (
        <div style={{ padding: '10px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', flexShrink: 0 }}>
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowColPicker(p => !p)} style={{ background: showColPicker ? 'rgba(59,130,246,.12)' : 'none', border: '1px solid '+(showColPicker?'#3b82f6':'#e2e8f0'), borderRadius: 6, color: showColPicker?'#3b82f6':'#64748b', fontSize: 11, cursor: 'pointer', padding: '4px 10px', fontFamily: 'inherit' }}>Columnas</button>
            {showColPicker && (
              <div onClick={e => e.stopPropagation()} style={{ position: 'absolute', right: 0, top: 34, background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, zIndex: 10, minWidth: 160, boxShadow: '0 8px 24px rgba(0,0,0,.4)' }}>
                {ALL_COLS.map(c => (
                  <label key={c.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer', color: '#0f172a', padding: '4px 0' }}>
                    <input type='checkbox' checked={visibleCols.includes(c.key)} onChange={() => setVisibleCols(p => p.includes(c.key) ? p.filter(k => k !== c.key) : [...p, c.key])} style={{ accentColor: '#3b82f6' }} />
                    {c.label}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      <div style={{ padding: '12px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 3 }}>Desde</div>
          <input type='date' value={from} onChange={e => setFrom(e.target.value)} style={{ ...iS, width: '100%' }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 3 }}>Hasta</div>
          <input type='date' value={to} onChange={e => setTo(e.target.value)} style={{ ...iS, width: '100%' }} />
        </div>
        {(from || to) && <button onClick={() => { setFrom(''); setTo('') }} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 5, color: '#64748b', fontSize: 10, padding: '5px 10px', cursor: 'pointer', fontFamily: 'inherit', marginTop: 14 }}>Limpiar</button>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', borderBottom: '1px solid #e2e8f0', flexShrink: 0 }}>
        {[['Registros',filtered.length,'#3b82f6'],['Puntuales',onTime,'#10b981'],['Retardos',late,'#f59e0b'],['Faltas',absent,'#ef4444'],['Horas',fmtHours(totalHours),'#64748b']].map(([l,v,c],i) => (
          <div key={l} style={{ padding: '10px 14px', borderRight: i < 4 ? '1px solid #e2e8f0' : 'none' }}>
            <div style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 3 }}>{l}</div>
            <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "'JetBrains Mono'", color: c }}>{v}</div>
          </div>
        ))}
      </div>
      {totalSales > 0 && (
        <div style={{ padding: '10px 20px', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: 20, flexShrink: 0 }}>
          <div><span style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.5px', marginRight: 8 }}>Ventas</span><span style={{ fontSize: 14, fontWeight: 700, fontFamily: "'JetBrains Mono'", color: '#10b981' }}>${Number(totalSales).toLocaleString('es-MX')}</span></div>
          <div><span style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.5px', marginRight: 8 }}>Prom. diario</span><span style={{ fontSize: 13, fontWeight: 600, fontFamily: "'JetBrains Mono'", color: '#10b981' }}>${Number(totalSales / Math.max(filtered.filter(r => r.sales_amount > 0).length, 1)).toLocaleString('es-MX', { maximumFractionDigits: 0 })}</span></div>
        </div>
      )}
      <div style={{ flex: 1, overflowY: fullPage ? 'visible' : 'auto', overflowX: 'auto' }} onClick={() => showColPicker && setShowColPicker(false)}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 540 }}>
          <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 1 }}>
            <tr>{ALL_COLS.filter(c => visibleCols.includes(c.key)).map(c => (
              <th key={c.key} style={{ textAlign: 'left', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.6px', color: '#94a3b8', padding: '8px 14px', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{c.label}</th>
            ))}</tr>
          </thead>
          <tbody>
            {filtered.length === 0 && <tr><td colSpan={visibleCols.length} style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>Sin registros</td></tr>}
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
                <tr key={r.id} style={{ borderBottom: '1px solid rgba(226,232,240,.3)' }}>
                  {visibleCols.includes('date')      && <td style={{ padding: '8px 14px', fontSize: 11, fontFamily: "'JetBrains Mono'", whiteSpace: 'nowrap' }}>{fmtDate(r.date)}</td>}
                  {visibleCols.includes('site')      && <td style={{ padding: '8px 14px', fontSize: 11, color: '#64748b', whiteSpace: 'nowrap' }}>{site?.name||'?'}</td>}
                  {visibleCols.includes('checkin')   && <td style={{ padding: '8px 14px', fontSize: 11, fontFamily: "'JetBrains Mono'", whiteSpace: 'nowrap' }}>{fmtTime(r.check_in, site?.timezone)}</td>}
                  {visibleCols.includes('checkout')  && <td style={{ padding: '8px 14px', fontSize: 11, fontFamily: "'JetBrains Mono'", whiteSpace: 'nowrap' }}>{fmtTime(r.check_out, site?.timezone)}</td>}
                  {visibleCols.includes('hours')     && <td style={{ padding: '8px 14px', fontSize: 11, fontFamily: "'JetBrains Mono'", whiteSpace: 'nowrap' }}>{fmtHours(r.hours_worked)}</td>}
                  {visibleCols.includes('time_out')  && <td style={{ padding: '8px 14px', fontSize: 11, fontFamily: "'JetBrains Mono'", color: tom>0?'#f59e0b':'#94a3b8', whiteSpace: 'nowrap' }}>{tomLabel}</td>}
                  {visibleCols.includes('sales') && (
                    <td style={{ padding: '8px 14px', whiteSpace: 'nowrap' }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          <input type='number' value={editingSale.value} onChange={e => { setEditingSale(p => ({ ...p, value: e.target.value })); setSaleErr('') }} onKeyDown={e => { if (e.key === 'Enter') saveSale(r.id); if (e.key === 'Escape') setEditingSale(null) }} autoFocus style={{ width: 90, background: '#ffffff', border: '1px solid '+(saleErr?'#ef4444':'#3b82f6'), color: '#0f172a', fontSize: 11, padding: '4px 7px', borderRadius: 5, fontFamily: "'JetBrains Mono'", outline: 'none' }} />
                          <button onClick={() => saveSale(r.id)} style={{ background: 'rgba(16,185,129,.15)', border: '1px solid rgba(16,185,129,.3)', borderRadius: 4, color: '#10b981', fontSize: 12, cursor: 'pointer', padding: '3px 7px' }}>✓</button>
                          <button onClick={() => { setEditingSale(null); setSaleErr('') }} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 4, color: '#64748b', fontSize: 12, cursor: 'pointer', padding: '3px 7px' }}>✕</button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono'", color: r.sales_amount > 0 ? '#10b981' : '#94a3b8' }}>{r.sales_amount > 0 ? '$'+Number(r.sales_amount).toLocaleString('es-MX') : '–'}</span>
                          <button onClick={() => { setEditingSale({ id: r.id, value: r.sales_amount || 0 }); setSaleErr('') }} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 11, padding: '1px 4px', borderRadius: 3, lineHeight: 1 }} title='Editar venta'>✎</button>
                        </div>
                      )}
                      {isEditing && saleErr && <div style={{ fontSize: 9, color: '#ef4444', marginTop: 2 }}>{saleErr}</div>}
                    </td>
                  )}
                  {visibleCols.includes('photo_in')  && <td style={{ padding: '8px 14px' }}>{r.photo_url?<a href={r.photo_url} target='_blank' rel='noopener noreferrer'><img src={r.photo_url} alt='in' style={{ width:32,height:32,borderRadius:6,objectFit:'cover',display:'block',border:'1px solid #e2e8f0' }} /></a>:<span style={{ fontSize:10,color:'#94a3b8' }}>–</span>}</td>}
                  {visibleCols.includes('photo_out') && <td style={{ padding: '8px 14px' }}>{r.photo_url_out?<a href={r.photo_url_out} target='_blank' rel='noopener noreferrer'><img src={r.photo_url_out} alt='out' style={{ width:32,height:32,borderRadius:6,objectFit:'cover',display:'block',border:'1px solid #e2e8f0' }} /></a>:<span style={{ fontSize:10,color:'#94a3b8' }}>–</span>}</td>}
                  {visibleCols.includes('gps')       && <td style={{ padding: '8px 14px', fontSize: 11, whiteSpace: 'nowrap' }}>{gpsLink?<a href={gpsLink} target='_blank' rel='noopener noreferrer' style={{ color:'#3b82f6',textDecoration:'none',fontFamily:"'JetBrains Mono'" }}>{gpsLabel} ↗</a>:<span style={{ color:'#94a3b8' }}>–</span>}</td>}
                  {visibleCols.includes('status')    && <td style={{ padding: '8px 14px' }}>{r.status?<span style={{ padding:'2px 8px',borderRadius:4,fontSize:10,fontWeight:600,color:stClr[r.status]||'#64748b',background:stBg[r.status]||'rgba(136,146,168,.1)',whiteSpace:'nowrap' }}>{stLbl[r.status]||r.status}</span>:<span style={{ fontSize:10,color:'#94a3b8' }}>–</span>}</td>}
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
  const [f, setF] = useState(data || { name: '', email: '', phone: '', role: 'Vendedor(a)', skip_sales: false, skip_photo: false, birth_date: null })
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
      <div onClick={e => e.stopPropagation()} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 22, width: '100%', maxWidth: 440, maxHeight: '85vh', overflow: 'auto' }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>{data ? 'Editar Empleado' : 'Nuevo Empleado'}</h3>
        {[['Nombre','name','text'],['Email','email','email'],['Teléfono','phone','tel'],['Fecha de nacimiento (opcional)','birth_date','date']].map(([l,k,t]) => (
          <div key={k} style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 10, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>{l}</label>
            <input type={t} value={f[k]||''} onChange={e => upd(k, e.target.value)} style={{ width:'100%',background:'#ffffff',border:`1px solid ${k==='email'&&emailErr?'#ef4444':'#e2e8f0'}`,color:'#0f172a',fontSize:12,padding:'8px 10px',borderRadius:6,outline:'none',fontFamily:'inherit' }} />
            {k === 'email' && emailErr && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4, fontWeight: 600 }}>⚠ {emailErr}</div>}
          </div>
        ))}
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 10, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Rol</label>
          <select value={f.role||'Vendedor(a)'} onChange={e => upd('role', e.target.value)} style={{ width:'100%',background:'#ffffff',border:'1px solid #e2e8f0',color:'#0f172a',fontSize:12,padding:'8px 10px',borderRadius:6,fontFamily:'inherit' }}>
            <option>Vendedor(a)</option><option>Encargado(a)</option><option>Gerente</option><option>Gerente Regional</option><option>Supervisor(a)</option>
          </select>
        </div>
        {sites.length > 0 && (
          <div style={{ marginBottom: 14, borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
            <div style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>Puntos de venta asignados</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {sites.map(s => (
                <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer', color: '#0f172a', padding: '6px 10px', borderRadius: 6, background: selSites.includes(s.id) ? 'rgba(59,130,246,.1)' : 'transparent', border: '1px solid ' + (selSites.includes(s.id) ? 'rgba(59,130,246,.3)' : '#e2e8f0') }}>
                  <input type='checkbox' checked={selSites.includes(s.id)} onChange={() => setSelSites(p => p.includes(s.id) ? p.filter(x => x !== s.id) : [...p, s.id])} style={{ accentColor: '#3b82f6' }} />
                  {s.name}
                </label>
              ))}
            </div>
            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 6 }}>Los gerentes de las sucursales marcadas podrán ver y asignar horarios a este empleado.</div>
          </div>
        )}
        <div style={{ marginBottom: 14, background: 'rgba(16,185,129,.05)', border: `1px solid ${goalErr ? 'rgba(239,68,68,.4)' : 'rgba(16,185,129,.15)'}`, borderRadius: 8, padding: '12px 14px' }}>
          <label style={{ fontSize: 10, fontWeight: 600, color: '#10b981', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.5px' }}>Meta de ventas semanal</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 14, fontWeight: 700, color: '#94a3b8', pointerEvents: 'none' }}>$</span>
            <input type='number' inputMode='decimal' placeholder='Sin meta (dejar vacío)' value={weeklyGoal} onChange={e => { setWeeklyGoal(e.target.value); setGoalErr('') }} style={{ width:'100%',background:'#ffffff',border:`1px solid ${goalErr?'#ef4444':'#e2e8f0'}`,color:'#0f172a',fontSize:14,fontWeight:700,padding:'10px 10px 10px 26px',borderRadius:8,outline:'none',fontFamily:"'JetBrains Mono', monospace",boxSizing:'border-box' }} />
          </div>
          {goalErr && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 6, fontWeight: 600 }}>⚠ {goalErr}</div>}
          {!goalErr && <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 6 }}>Máximo ${MAX_SALE.toLocaleString('es-MX')}. Deja vacío para no asignar meta.</div>}
        </div>
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 12, marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}>Comportamiento</div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer', color: '#0f172a' }}>
            <input type='checkbox' checked={isVendor} onChange={e => upd('skip_sales', !e.target.checked)} />
            Vendedor — pedir monto de ventas al hacer Check Out
          </label>
          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4, marginLeft: 20 }}>Desmarca si es bodega, admin u otro rol sin ventas directas</div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer', color: '#0f172a', marginTop: 10 }}>
            <input type='checkbox' checked={!f.skip_photo} onChange={e => upd('skip_photo', !e.target.checked)} />
            Pedir foto al hacer Check In y Check Out
          </label>
          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4, marginLeft: 20 }}>Desmarca si no quieres solicitar foto a este empleado</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button disabled={!valid} onClick={handleSave} style={{ flex:1,padding:'10px 16px',borderRadius:7,border:'none',background:valid?'#3b82f6':'#e2e8f0',color:'#fff',fontSize:12,fontWeight:600,cursor:valid?'pointer':'not-allowed',fontFamily:'inherit' }}>Guardar</button>
          <button onClick={onClose} style={{ padding:'10px 16px',borderRadius:7,border:'1px solid #e2e8f0',background:'transparent',color:'#64748b',fontSize:12,cursor:'pointer',fontFamily:'inherit' }}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}
// ─── Site Modal con Leaflet ───────────────────────────────────────────────────
function SiteModal({ data, onSave, onClose }) {
  const isNew = !data?.id
  const [f, setF] = useState(data || { name: '', address: '', grace_mins: 5, absent_mins: 15, lat: '', lng: '', radius_m: 150, timezone: 'America/Cancun' })
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
      <div onClick={e => e.stopPropagation()} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 22, width: '100%', maxWidth: 520, maxHeight: '92vh', overflow: 'auto' }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>{isNew ? 'Nuevo Sitio' : 'Editar Sitio'}</h3>
        <div style={{ marginBottom: 10 }}><label style={{ fontSize: 10, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Nombre del sitio</label><input value={f.name||''} onChange={e => upd('name', e.target.value)} style={{ width:'100%',background:'#ffffff',border:'1px solid #e2e8f0',color:'#0f172a',fontSize:12,padding:'8px 10px',borderRadius:6,outline:'none',fontFamily:'inherit' }} placeholder='Ej: Plaza Américas Cancún' /></div>
        <div style={{ marginBottom: 6 }}><label style={{ fontSize: 10, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Buscar ubicación</label>
          <div style={{ display: 'flex', gap: 6 }}>
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && searchLocation()} placeholder='Ej: Plaza Américas Cancún, Quintana Roo' style={{ flex:1,background:'#ffffff',border:'1px solid #e2e8f0',color:'#0f172a',fontSize:12,padding:'8px 10px',borderRadius:6,outline:'none',fontFamily:'inherit' }} />
            <button onClick={searchLocation} disabled={searching} style={{ padding:'8px 14px',borderRadius:6,border:'none',background:'#3b82f6',color:'#fff',fontSize:12,fontWeight:600,cursor:searching?'wait':'pointer',fontFamily:'inherit',whiteSpace:'nowrap' }}>{searching ? '...' : '🔍 Buscar'}</button>
          </div>
          {searchErr && <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 4 }}>⚠ {searchErr}</div>}
        </div>
        <div style={{ marginBottom: 10, borderRadius: 8, overflow: 'hidden', border: '1px solid #e2e8f0' }}><div ref={mapRef} style={{ height: 220, width: '100%', background: '#ffffff' }} /></div>
        <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 12 }}>{hasGps ? `📍 ${f.lat}, ${f.lng} — arrastra el marcador para ajustar` : '⚠️ Sin coordenadas — busca la ubicación o arrastra el marcador'}</div>
        <div style={{ marginBottom: 10 }}><label style={{ fontSize: 10, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Dirección (texto)</label><input value={f.address||''} onChange={e => upd('address', e.target.value)} style={{ width:'100%',background:'#ffffff',border:'1px solid #e2e8f0',color:'#0f172a',fontSize:12,padding:'8px 10px',borderRadius:6,outline:'none',fontFamily:'inherit' }} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
          <div><label style={{ fontSize: 10, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Radio GPS (metros)</label><input type='number' value={f.radius_m??150} onChange={e => upd('radius_m', parseInt(e.target.value)||150)} style={{ width:'100%',background:'#ffffff',border:'1px solid #e2e8f0',color:'#0f172a',fontSize:12,padding:'8px 10px',borderRadius:6,outline:'none',fontFamily:'inherit' }} /></div>
          <div><label style={{ fontSize: 10, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Tolerancia (minutos)</label><input type='number' value={f.grace_mins||0} onChange={e => upd('grace_mins', parseInt(e.target.value)||0)} style={{ width:'100%',background:'#ffffff',border:'1px solid #e2e8f0',color:'#0f172a',fontSize:12,padding:'8px 10px',borderRadius:6,outline:'none',fontFamily:'inherit' }} /></div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 10, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Zona horaria</label>
          <select value={f.timezone || 'America/Cancun'} onChange={e => upd('timezone', e.target.value)}
            style={{ width:'100%',background:'#ffffff',border:'1px solid #e2e8f0',color:'#0f172a',fontSize:12,padding:'8px 10px',borderRadius:6,outline:'none',fontFamily:'inherit' }}>
            <option value='America/Cancun'>Cancún / Q. Roo (UTC-5, sin horario de verano)</option>
            <option value='America/Mexico_City'>CDMX / Monterrey / Guadalajara (UTC-6/-5 con verano)</option>
            <option value='America/Merida'>Mérida / Yucatán (UTC-6/-5 con verano)</option>
            <option value='America/Monterrey'>Monterrey / Nuevo León (UTC-6/-5 con verano)</option>
            <option value='America/Mazatlan'>Sinaloa / Nayarit (UTC-7/-6 con verano)</option>
            <option value='America/Hermosillo'>Sonora (UTC-7, sin horario de verano)</option>
            <option value='America/Chihuahua'>Chihuahua (UTC-7/-6 con verano)</option>
            <option value='America/Tijuana'>Tijuana / Baja California (UTC-8/-7 con verano)</option>
          </select>
        </div>
        {isNew && <div style={{ background: 'rgba(59,130,246,.06)', border: '1px solid rgba(59,130,246,.15)', borderRadius: 8, padding: '10px 14px', marginBottom: 14 }}><div style={{ fontSize: 10, color: '#3b82f6', fontWeight: 600, marginBottom: 2 }}>Código QR</div><div style={{ fontSize: 11, color: '#94a3b8' }}>Se generará automáticamente al guardar.</div></div>}
        {!isNew && <div style={{ marginBottom: 14 }}><label style={{ fontSize: 10, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>Código QR</label><input value={f.code||''} onChange={e => upd('code', e.target.value.toUpperCase())} style={{ width:'100%',background:'#ffffff',border:'1px solid #e2e8f0',color:'#0f172a',fontSize:12,padding:'8px 10px',borderRadius:6,outline:'none',fontFamily:"'JetBrains Mono'" }} /></div>}

        {/* ── Metas de ventas ── */}
        <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 14, marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: '#10b981', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}>🎯 Metas de ventas (opcionales)</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {[['Diaria', 'goal_daily'], ['Semanal', 'goal_weekly'], ['Mensual', 'goal_monthly']].map(([lbl, key]) => (
              <div key={key}>
                <label style={{ fontSize: 10, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>{lbl}</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#94a3b8', pointerEvents: 'none' }}>$</span>
                  <input type='number' min='0' value={f[key] ?? ''} onChange={e => upd(key, e.target.value === '' ? null : parseFloat(e.target.value))}
                    placeholder='—'
                    style={{ width: '100%', background: '#ffffff', border: '1px solid #e2e8f0', color: '#0f172a', fontSize: 12, padding: '8px 8px 8px 20px', borderRadius: 6, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 6 }}>Aparecerán como barra de progreso en el dashboard al seleccionar el período correspondiente.</div>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button disabled={!valid} onClick={() => onSave(f)} style={{ flex:1,padding:'10px 16px',borderRadius:7,border:'none',background:valid?'#3b82f6':'#e2e8f0',color:'#fff',fontSize:12,fontWeight:600,cursor:valid?'pointer':'not-allowed',fontFamily:'inherit' }}>Guardar</button>
          <button onClick={onClose} style={{ padding:'10px 16px',borderRadius:7,border:'1px solid #e2e8f0',background:'transparent',color:'#64748b',fontSize:12,cursor:'pointer',fontFamily:'inherit' }}>Cancelar</button>
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
      <div onClick={e => e.stopPropagation()} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 24, width: '100%', maxWidth: 380, textAlign: 'center' }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{site.name}</h3>
        <p style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>{site.address}</p>
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, display: 'inline-block', marginBottom: 16 }}><img src={qrImgUrl} alt='QR Code' style={{ width: 220, height: 220, display: 'block' }} /></div>
        <div style={{ fontFamily: "'JetBrains Mono'", fontSize: 18, fontWeight: 700, letterSpacing: 3, marginBottom: 4 }}>{site.code}</div>
        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 16, wordBreak: 'break-all' }}>{url}</div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
          <button onClick={printQR} style={{ padding:'10px 20px',borderRadius:7,border:'none',background:'#3b82f6',color:'#fff',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit' }}>Imprimir QR</button>
          <button onClick={() => navigator.clipboard.writeText(url)} style={{ padding:'10px 20px',borderRadius:7,border:'1px solid #e2e8f0',background:'transparent',color:'#64748b',fontSize:12,cursor:'pointer',fontFamily:'inherit' }}>Copiar URL</button>
          <button onClick={onClose} style={{ padding:'10px 20px',borderRadius:7,border:'1px solid #e2e8f0',background:'transparent',color:'#64748b',fontSize:12,cursor:'pointer',fontFamily:'inherit' }}>Cerrar</button>
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
    // Validate: start_time < end_time for all active days
    for (const { date, label } of weekDates) {
      const day = week[date]
      if (!day?.on || day.blocked) continue
      const [sh, sm] = (day.start_time || '10:00').split(':').map(Number)
      const [eh, em] = (day.end_time || '19:00').split(':').map(Number)
      if ((sh * 60 + sm) >= (eh * 60 + em)) {
        alert(`Horario inválido el ${label}: la entrada (${day.start_time}) debe ser antes de la salida (${day.end_time}).`)
        return
      }
    }
    setSaving(true)
    // Guardar flag de semana fija en el empleado
    await supabase.from('employees').update({ fixed_week: fixedWeek }).eq('id', emp.id)
    const editableDates = weekDates.filter(({date}) => !week[date]?.blocked).map(d => d.date)
    if (editableDates.length > 0) await supabase.from('schedules').delete().eq('employee_id', emp.id).in('date', editableDates)
    const inserts = []
    weekDates.forEach(({ date }) => { const day = week[date]; if (day?.on && !day.blocked && day.site_id) { const siteCompanyId = sites.find(s => s.id === day.site_id)?.company_id || null; inserts.push({ employee_id: emp.id, date, site_id: day.site_id, start_time: day.start_time||'10:00', end_time: day.end_time||'19:00', lunch_mins: day.lunch_mins??60, ...(siteCompanyId ? { company_id: siteCompanyId } : {}) }) } })
    if (inserts.length > 0) await supabase.from('schedules').insert(inserts)
    setSaving(false); onSave()
  }
  const weekLabel = (() => { const s = weekDates[0].d; const e = weekDates[6].d; return `${s.getDate()} ${s.toLocaleDateString('es-MX',{month:'short'})} – ${e.getDate()} ${e.toLocaleDateString('es-MX',{month:'short',year:'numeric'})}` })()
  // FIX BUG 3: estilos para cada campo de horario — cada uno en su propia línea en móvil
  const fieldStyle = { background:'#ffffff',border:'1px solid #e2e8f0',color:'#0f172a',fontSize:11,padding:'6px 8px',borderRadius:5,outline:'none',fontFamily:'inherit',width:'100%' }
  return (
    <div onClick={onClose} style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(4px)' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 22, width: '100%', maxWidth: 480, maxHeight: '92vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4, flexWrap: 'wrap', gap: 8 }}>
          <h3 style={{ fontSize: 15, fontWeight: 700 }}>Horarios — {emp.name}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {/* Toggle semana fija */}
            <button
              onClick={() => setFixedWeek(v => !v)}
              style={{ fontSize:10, fontWeight:600, padding:'4px 10px', borderRadius:5, cursor:'pointer', fontFamily:'inherit', border:'1px solid '+(fixedWeek?'rgba(245,158,11,.5)':'#e2e8f0'), background:fixedWeek?'rgba(245,158,11,.15)':'transparent', color:fixedWeek?'#f59e0b':'#94a3b8', transition:'all .15s' }}
            >
              {fixedWeek ? '📌 Semana fija ON' : 'Semana fija OFF'}
            </button>
            {/* Selector de semana (solo si NO es semana fija) */}
            {!fixedWeek && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '4px 6px' }}>
                <button onClick={() => setWeekStart(d => addDays(d,-7))} style={{ background:'rgba(59,130,246,.15)',border:'none',borderRadius:5,color:'#3b82f6',padding:'5px 12px',cursor:'pointer',fontFamily:'inherit',fontSize:15,fontWeight:700,lineHeight:1 }}>‹</button>
                <span style={{ fontSize:11,color:'#0f172a',fontWeight:600,minWidth:140,textAlign:'center' }}>{weekLabel}</span>
                <button onClick={() => setWeekStart(d => addDays(d,7))} style={{ background:'rgba(59,130,246,.15)',border:'none',borderRadius:5,color:'#3b82f6',padding:'5px 12px',cursor:'pointer',fontFamily:'inherit',fontSize:15,fontWeight:700,lineHeight:1 }}>›</button>
              </div>
            )}
          </div>
        </div>
        <p style={{ fontSize: 11, color: '#64748b', marginBottom: 16 }}>Activa los días que trabaja. Cada día puede tener diferente sucursal y horario.</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {weekDates.map(({ date, label }) => {
            const day = week[date] || {}; const isOn = day.on; const isPast = date < todayDate; const isBlocked = day.blocked
            return (
              <div key={date} style={{ background: isBlocked ? 'rgba(245,158,11,.05)' : isOn ? '#ffffff' : 'transparent', border: '1px solid ' + (isBlocked ? 'rgba(245,158,11,.3)' : isOn ? '#e2e8f0' : 'rgba(226,232,240,.3)'), borderRadius: 8, padding: '10px 12px', opacity: isPast && !isBlocked ? 0.55 : 1 }}>
                {/* Fila superior: toggle + nombre día + fecha */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: isOn && !isBlocked ? 10 : 0 }}>
                  <button onClick={() => toggle(date)} disabled={isBlocked} style={{ width:22,height:22,borderRadius:6,flexShrink:0,cursor:isBlocked?'not-allowed':'pointer',border:'2px solid '+(isBlocked?'#f59e0b':isOn?'#10b981':'#94a3b8'),background:isBlocked?'rgba(245,158,11,.15)':isOn?'#10b981':'transparent',display:'flex',alignItems:'center',justifyContent:'center',color:isBlocked?'#f59e0b':'#fff',fontSize:12,fontWeight:700 }}>{isBlocked?'🔒':isOn?'✓':''}</button>
                  <span style={{ fontSize:12,fontWeight:700,color:date===todayDate?'#3b82f6':'#0f172a' }}>{label}</span>
                  {!fixedWeek && <span style={{ fontSize:10,color:'#94a3b8',fontFamily:"'JetBrains Mono'" }}>{date.slice(5).replace('-','/')}</span>}
                  {isBlocked && <span style={{ fontSize:11,color:'#f59e0b',fontWeight:600,marginLeft:4 }}>Ocupado — otra sucursal</span>}
                  {!isOn && !isBlocked && <span style={{ fontSize:11,color:'#94a3b8',marginLeft:4 }}>Descansa</span>}
                </div>
                {/* FIX BUG 3: Campos en columna vertical para móvil */}
                {isBlocked && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, paddingLeft: 30 }}>
                    <span style={{ fontSize: 10, color: '#94a3b8', fontFamily: "'JetBrains Mono'" }}>{day.start_time?.slice(0,5)} – {day.end_time?.slice(0,5)}</span>
                    <span style={{ fontSize: 9, color: '#94a3b8', background: 'rgba(245,158,11,.1)', border: '1px solid rgba(245,158,11,.2)', borderRadius: 4, padding: '1px 7px' }}>No editable</span>
                  </div>
                )}
                {isOn && !isBlocked && (
                  <div style={{ paddingLeft: 30, display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {/* Sucursal — fila completa */}
                    <div>
                      <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 3 }}>Sucursal</div>
                      <select value={day.site_id||''} onChange={e => upd(date,'site_id',e.target.value)} style={fieldStyle}>
                        {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                    {/* Horario — entrada y salida en fila */}
                    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 3 }}>Entrada</div>
                        <select value={day.start_time||'10:00'} onChange={e => upd(date,'start_time',e.target.value)} style={{ ...fieldStyle, fontFamily:"'JetBrains Mono', monospace" }}>
                          {Array.from({length:24},(_,h)=>['00','30'].map(m=>`${String(h).padStart(2,'0')}:${m}`)).flat().map(t=><option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 3 }}>Salida</div>
                        <select value={day.end_time||'19:00'} onChange={e => upd(date,'end_time',e.target.value)} style={{ ...fieldStyle, fontFamily:"'JetBrains Mono', monospace" }}>
                          {Array.from({length:24},(_,h)=>['00','30'].map(m=>`${String(h).padStart(2,'0')}:${m}`)).flat().map(t=><option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 9, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 3 }}>Comida</div>
                        <select value={day.lunch_mins??60} onChange={e => upd(date,'lunch_mins',parseInt(e.target.value))} style={fieldStyle}>
                          <option value={0}>Sin comida</option><option value={30}>30m</option><option value={45}>45m</option><option value={60}>60m</option><option value={90}>90m</option>
                        </select>
                      </div>
                    </div>
                    {/* Copiar a todos */}
                    <button onClick={() => copyToAll(date)} style={{ background:'none',border:'1px solid #e2e8f0',borderRadius:4,color:'#64748b',fontSize:10,padding:'4px 10px',cursor:'pointer',fontFamily:'inherit',alignSelf:'flex-start' }}>Copiar a todos los días activos</button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button disabled={saving} onClick={save} style={{ flex:1,padding:'11px 16px',borderRadius:7,border:'none',background:'#3b82f6',color:'#fff',fontSize:13,fontWeight:600,cursor:saving?'wait':'pointer',fontFamily:'inherit' }}>{saving?'Guardando...':'Guardar Semana'}</button>
          <button onClick={onClose} style={{ padding:'11px 16px',borderRadius:7,border:'1px solid #e2e8f0',background:'transparent',color:'#64748b',fontSize:12,cursor:'pointer',fontFamily:'inherit' }}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}
// ─── Admin User Modal ─────────────────────────────────────────────────────────
function AdminUserModal({ data, sites, companies, isSuperAdmin, isCompanyAdmin, adminUser, onSave, onClose, onResetPwd }) {
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

  const iS = { width:'100%',background:'#ffffff',border:'1px solid #e2e8f0',color:'#0f172a',fontSize:12,padding:'8px 10px',borderRadius:6,outline:'none',fontFamily:'inherit' }
  return (
    <div onClick={createdPwd ? undefined : onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 22, width: '100%', maxWidth: 460, maxHeight: '85vh', overflow: 'auto' }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>{data ? 'Editar Usuario' : 'Nuevo Usuario Admin'}</h3>
        {createdPwd ? (
          <div>
            <div style={{ background: 'rgba(16,185,129,.08)', border: '1px solid rgba(16,185,129,.2)', borderRadius: 10, padding: '16px 18px', marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#10b981', marginBottom: 8 }}>✅ Usuario creado</div>
              <div style={{ fontSize: 11, color: '#64748b', marginBottom: 14 }}>Manda estos datos a <strong style={{ color: '#0f172a' }}>{name}</strong> por WhatsApp. Puede cambiar su contraseña después.</div>
              <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '14px 16px', marginBottom: 14 }}>
                <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>Credenciales de acceso</div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>Email: <span style={{ color: '#0f172a', fontFamily: "'JetBrains Mono'" }}>{email.trim().toLowerCase()}</span></div>
                <div style={{ fontSize: 12, color: '#64748b' }}>Contraseña: <span style={{ color: '#3b82f6', fontFamily: "'JetBrains Mono'", fontWeight: 700, fontSize: 15 }}>{createdPwd}</span></div>
              </div>
              <button onClick={copyCredentials} style={{ width: '100%', padding: '11px 16px', borderRadius: 7, border: 'none', background: copied ? '#10b981' : '#3b82f6', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', transition: 'background .2s' }}>
                {copied ? '¡Copiado! ✓' : '📋 Copiar para WhatsApp'}
              </button>
            </div>
            <button onClick={onSave} style={{ width: '100%', padding: '10px 16px', borderRadius: 7, border: '1px solid #e2e8f0', background: 'transparent', color: '#64748b', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>
              Listo, cerrar
            </button>
          </div>
        ) : (
          <>
            {err && <div style={{ background:'rgba(239,68,68,.1)',border:'1px solid rgba(239,68,68,.25)',borderRadius:7,padding:'10px 14px',fontSize:12,color:'#ef4444',marginBottom:14 }}>{err}</div>}
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize:10,fontWeight:600,color:'#64748b',display:'block',marginBottom:4 }}>Nombre</label>
              <input value={name} onChange={e => setName(e.target.value)} style={iS} />
            </div>
            {!data && (
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize:10,fontWeight:600,color:'#64748b',display:'block',marginBottom:4 }}>Email</label>
                <input type='email' value={email} onChange={e => setEmail(e.target.value)} style={iS} />
                <div style={{ fontSize:10,color:'#94a3b8',marginTop:4 }}>Se generará una contraseña temporal para mandar por WhatsApp</div>
              </div>
            )}
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize:10,fontWeight:600,color:'#64748b',display:'block',marginBottom:4 }}>Rol</label>
              <select value={role} onChange={e => setRole(e.target.value)} style={iS}>
                <option value='manager'>Gerente</option>
                {isSuperAdmin && <option value='company_admin'>Admin Empresa</option>}
                {isSuperAdmin && <option value='superadmin'>Super Admin</option>}
              </select>
            </div>
            {role !== 'superadmin' && isSuperAdmin && companies.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize:10,fontWeight:600,color:'#64748b',display:'block',marginBottom:4 }}>Empresa</label>
                <select value={companyId} onChange={e => { setCompanyId(e.target.value); setSelSites([]) }} style={iS}>
                  {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
            {role === 'manager' && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize:10,fontWeight:600,color:'#64748b',textTransform:'uppercase',letterSpacing:'.5px',marginBottom:8 }}>Sucursales que puede ver</div>
                {companySites.length === 0 ? (
                  <div style={{ fontSize:11,color:'#94a3b8',padding:'8px 10px',background:'#ffffff',borderRadius:6 }}>No hay sucursales en esta empresa</div>
                ) : (
                  <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
                    {companySites.map(s => (
                      <label key={s.id} style={{ display:'flex',alignItems:'center',gap:8,fontSize:12,cursor:'pointer',color:'#0f172a',padding:'6px 10px',borderRadius:6,background:selSites.includes(s.id)?'rgba(59,130,246,.1)':'transparent',border:'1px solid '+(selSites.includes(s.id)?'rgba(59,130,246,.3)':'#e2e8f0') }}>
                        <input type='checkbox' checked={selSites.includes(s.id)} onChange={() => setSelSites(p => p.includes(s.id)?p.filter(x=>x!==s.id):[...p,s.id])} style={{ accentColor:'#3b82f6' }} />
                        {s.name}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button disabled={!valid||saving} onClick={handleSave} style={{ flex:1,padding:'10px 16px',borderRadius:7,border:'none',background:valid&&!saving?'#3b82f6':'#e2e8f0',color:'#fff',fontSize:12,fontWeight:600,cursor:valid&&!saving?'pointer':'not-allowed',fontFamily:'inherit' }}>
                {saving ? 'Guardando...' : data ? 'Guardar' : 'Crear usuario'}
              </button>
              {data && onResetPwd && (
                <button onClick={() => { onClose(); onResetPwd(data) }} style={{ padding:'10px 14px',borderRadius:7,border:'1px solid rgba(245,158,11,.4)',background:'rgba(245,158,11,.1)',color:'#f59e0b',fontSize:12,fontWeight:600,cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap' }}>🔑 Reset pwd</button>
              )}
              <button onClick={onClose} style={{ padding:'10px 16px',borderRadius:7,border:'1px solid #e2e8f0',background:'transparent',color:'#64748b',fontSize:12,cursor:'pointer',fontFamily:'inherit' }}>Cancelar</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
function UnifiedDashboard({ sites, allEmps, att, todayAtt, schedules, todaySchedules, siteHours, today, dashRows, unscheduledAtt, sitesWorking, peopleWorking, setEmpPage }) {
  const [viewMode, setViewMode] = useState('list')     // 'list' | 'grid'
  const [salesPeriod, setSalesPeriod] = useState('today') // 'today' | 'week' | 'month'
  const [salesInfoOpen, setSalesInfoOpen] = useState(false)

  const now = new Date()
  const weekStartStr = (() => { const d = new Date(now); const day = d.getDay(); d.setDate(d.getDate() - (day === 0 ? 6 : day - 1)); return d.toLocaleDateString('en-CA', { timeZone: 'America/Cancun' }) })()
  const prevWeekStartStr = (() => { const d = new Date(now); const day = d.getDay(); d.setDate(d.getDate() - (day === 0 ? 6 : day - 1) - 7); return d.toLocaleDateString('en-CA', { timeZone: 'America/Cancun' }) })()
  const daysElapsed = Math.floor((new Date(today + 'T12:00:00') - new Date(weekStartStr + 'T12:00:00')) / 86400000)
  const prevWeekEndStr   = (() => { const d = new Date(prevWeekStartStr + 'T12:00:00'); d.setDate(d.getDate() + daysElapsed); return d.toLocaleDateString('en-CA', { timeZone: 'America/Cancun' }) })()
  const monthStr = today.slice(0, 7)

  function getSiteSales(siteId) {
    return att.filter(r => {
      if (r.site_id !== siteId) return false
      if (salesPeriod === 'today') return r.date === today
      if (salesPeriod === 'week') return r.date >= weekStartStr
      if (salesPeriod === 'month') return r.date.startsWith(monthStr)
      return false
    }).reduce((sum, r) => sum + (parseFloat(r.sales_amount) || 0), 0)
  }
  function getPrevWeekSales(siteId) {
    return att.filter(r => r.site_id === siteId && r.date >= prevWeekStartStr && r.date <= prevWeekEndStr)
      .reduce((sum, r) => sum + (parseFloat(r.sales_amount) || 0), 0)
  }

  function getSiteGoal(site) {
    if (salesPeriod === 'today') return parseFloat(site.goal_daily) || 0
    if (salesPeriod === 'week')  return parseFloat(site.goal_weekly) || 0
    if (salesPeriod === 'month') return parseFloat(site.goal_monthly) || 0
    return 0
  }

  const totalSales = sites.reduce((sum, s) => sum + getSiteSales(s.id), 0)
  const totalGoal  = sites.reduce((sum, s) => sum + getSiteGoal(s), 0)
  const totalPct   = totalGoal > 0 ? Math.min(100, Math.round(totalSales / totalGoal * 100)) : null
  const totalPrevWeek = salesPeriod === 'week' ? sites.reduce((sum, s) => sum + getPrevWeekSales(s.id), 0) : 0
  const weekPct = (salesPeriod === 'week' && totalPrevWeek > 0) ? ((totalSales - totalPrevWeek) / totalPrevWeek * 100).toFixed(0) : null
  const jsDow = new Date(today + 'T12:00:00').getDay()
  const todayDow = jsDow === 0 ? 6 : jsDow - 1
  function isStoreOpen(site) { return todayAtt.some(r => r.site_id === site.id && r.check_in && !r.check_out) }
  function shouldBeOpen(site) {
    const h = (siteHours || []).find(h => h.site_id === site.id && h.day_of_week === todayDow)
    return h?.is_open === true
  }
  function storeStats(site) {
    const siteAtt = todayAtt.filter(r => r.site_id === site.id)
    const siteScheds = todaySchedules.filter(s => s.site_id === site.id)
    const activeRecords = siteAtt.filter(r => r.check_in && !r.check_out)
    const activeNow = activeRecords.length
    const completedToday = siteAtt.filter(r => r.check_out).length
    const totalExpected = siteScheds.length
    const firstIn = siteAtt.filter(r => r.check_in).sort((a, b) => new Date(a.check_in) - new Date(b.check_in))[0]
    return { activeNow, completedToday, totalExpected, firstIn, activeRecords }
  }

  const periodLabel = { today: 'Hoy', week: 'Semana', month: 'Mes' }

  return (
    <div>
      {/* Top stats + controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[['🏪', sitesWorking, 'Tiendas activas', '#10b981', 'rgba(16,185,129,.12)'], ['👥', peopleWorking, 'Trabajando ahora', '#3b82f6', 'rgba(59,130,246,.12)']].map(([icon, val, label, c, bg]) => (
            <div key={label} style={{ background: bg, border: `1px solid ${c}33`, borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, minWidth: 140 }}>
              <span style={{ fontSize: 22 }}>{icon}</span>
              <div>
                <div style={{ fontSize: 9, color: c, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>{label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono'", color: c, lineHeight: 1.2 }}>{val}</div>
              </div>
            </div>
          ))}
          {/* Sales card with week comparison */}
          {(() => {
            const fmtD = s => { const [y,m,d] = s.split('-'); return new Date(+y,+m-1,+d).toLocaleDateString('es-MX',{day:'numeric',month:'short'}) }
            const dayNames = ['lun','mar','mié','jue','vie','sáb','dom']
            return (
              <div style={{ position: 'relative' }}>
                <div onClick={() => setSalesInfoOpen(o => !o)} style={{ background: 'rgba(139,92,246,.12)', border: `1px solid ${salesInfoOpen ? 'rgba(139,92,246,.5)' : 'rgba(139,92,246,.2)'}`, borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, minWidth: 160, cursor: 'pointer', userSelect: 'none' }}>
                  <span style={{ fontSize: 22 }}>💰</span>
                  <div>
                    <div style={{ fontSize: 9, color: '#8b5cf6', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>Ventas ({periodLabel[salesPeriod]}) {salesPeriod === 'week' ? '📅' : ''}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'JetBrains Mono'", color: '#8b5cf6', lineHeight: 1.2 }}>{totalSales > 0 ? '$' + Number(totalSales).toLocaleString('es-MX') : '–'}</div>
                    {totalPct !== null && (
                      <>
                        <div style={{ marginTop: 5, height: 4, background: 'rgba(139,92,246,.15)', borderRadius: 2, overflow: 'hidden', width: 120 }}>
                          <div style={{ height: '100%', width: totalPct + '%', background: totalPct >= 100 ? '#10b981' : '#8b5cf6', borderRadius: 2, transition: 'width .5s ease' }} />
                        </div>
                        <div style={{ fontSize: 10, fontWeight: 600, color: totalPct >= 100 ? '#10b981' : '#8b5cf6', marginTop: 2 }}>{totalPct}% de meta</div>
                      </>
                    )}
                    {weekPct !== null && (
                      <div style={{ fontSize: 10, fontWeight: 600, color: Number(weekPct) >= 0 ? '#10b981' : '#ef4444', marginTop: 2 }}>
                        {Number(weekPct) >= 0 ? '↑' : '↓'} {Math.abs(Number(weekPct))}% vs sem. ant.
                      </div>
                    )}
                  </div>
                </div>
                {salesInfoOpen && (
                  <div onClick={() => setSalesInfoOpen(false)} style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 50, background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, padding: '12px 14px', minWidth: 230, boxShadow: '0 4px 20px rgba(0,0,0,.10)', fontSize: 11, color: '#334155' }}>
                    {salesPeriod === 'week' ? (
                      <>
                        <div style={{ fontWeight: 700, color: '#8b5cf6', marginBottom: 8, fontSize: 10, textTransform: 'uppercase', letterSpacing: '.5px' }}>Período comparado</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#8b5cf6', flexShrink: 0, display: 'inline-block' }} />
                          <span><b>Esta semana:</b> {fmtD(weekStartStr)} – {fmtD(today)}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#94a3b8', flexShrink: 0, display: 'inline-block' }} />
                          <span><b>Sem. anterior:</b> {fmtD(prevWeekStartStr)} – {fmtD(prevWeekEndStr)}</span>
                        </div>
                        <div style={{ fontSize: 10, color: '#94a3b8', borderTop: '1px solid #f1f5f9', paddingTop: 6 }}>Comparación equitativa: {daysElapsed + 1} día{daysElapsed !== 0 ? 's' : ''} vs mismos días sem. ant.</div>
                      </>
                    ) : salesPeriod === 'today' ? (
                      <div><b>Hoy:</b> {fmtD(today)}</div>
                    ) : (
                      <div><b>Mes:</b> {weekStartStr.slice(0,7).replace('-','/')}</div>
                    )}
                  </div>
                )}
              </div>
            )
          })()}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Sales period selector */}
          <div style={{ display: 'flex', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
            {['today', 'week', 'month'].map(p => (
              <button key={p} onClick={() => setSalesPeriod(p)}
                style={{ padding: '6px 12px', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'inherit', background: salesPeriod === p ? '#3b82f6' : 'transparent', color: salesPeriod === p ? '#fff' : '#64748b', transition: 'all .15s' }}>
                {periodLabel[p]}
              </button>
            ))}
          </div>
          {/* View mode toggle */}
          <div style={{ display: 'flex', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
            {[['list', '☰ Lista'], ['grid', '⊞ Cuadrícula']].map(([m, lb]) => (
              <button key={m} onClick={() => setViewMode(m)}
                style={{ padding: '6px 12px', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 600, fontFamily: 'inherit', background: viewMode === m ? '#e2e8f0' : 'transparent', color: viewMode === m ? '#0f172a' : '#64748b', transition: 'all .15s' }}>
                {lb}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Upcoming birthdays widget */}
      {(() => {
        const tz = 'America/Cancun'
        const todayDate = new Date(today + 'T12:00:00')
        const todayMonth = todayDate.getMonth() + 1
        const todayDay   = todayDate.getDate()
        const upcomingBdays = (allEmps || [])
          .filter(e => e.active !== false && e.birth_date)
          .map(e => {
            const [,bm,bd] = e.birth_date.split('-')
            const bMonth = parseInt(bm), bDay = parseInt(bd)
            let nextBday = new Date(todayDate.getFullYear(), bMonth - 1, bDay)
            if (nextBday < todayDate) nextBday.setFullYear(nextBday.getFullYear() + 1)
            const daysUntil = Math.round((nextBday - todayDate) / 86400000)
            return { ...e, daysUntil, bMonth, bDay }
          })
          .filter(e => e.daysUntil <= 30)
          .sort((a, b) => a.daysUntil - b.daysUntil)
        if (upcomingBdays.length === 0) return null
        return (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#ec4899', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>🎂 Próximos cumpleaños</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {upcomingBdays.map(e => {
                const isToday = e.daysUntil === 0
                const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']
                const dateLabel = `${e.bDay} ${months[e.bMonth - 1]}`
                return (
                  <div key={e.id} style={{ background: isToday ? 'rgba(236,72,153,.1)' : '#ffffff', border: `1px solid ${isToday ? 'rgba(236,72,153,.4)' : '#e2e8f0'}`, borderRadius: 10, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 10, minWidth: 160 }}>
                    <span style={{ fontSize: 20 }}>{isToday ? '🎉' : '🎂'}</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: isToday ? '#ec4899' : '#0f172a' }}>{e.name.split(' ').slice(0, 2).join(' ')}</div>
                      <div style={{ fontSize: 10, color: isToday ? '#ec4899' : '#94a3b8', fontWeight: 600 }}>
                        {isToday ? '¡Hoy! 🥳' : e.daysUntil === 1 ? 'Mañana' : `En ${e.daysUntil} días`} · {dateLabel}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* GRID VIEW */}
      {viewMode === 'grid' && (
        <div>
          <style>{`@keyframes pulse { 0%,100% { opacity:1 } 50% { opacity:.4 } }`}</style>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {sites.map(site => {
              const open = isStoreOpen(site)
              const late = !open && shouldBeOpen(site)
              const { activeNow, completedToday, totalExpected, firstIn, activeRecords } = storeStats(site)
              const siteSales = getSiteSales(site.id)
              const sitePrevWeek = getPrevWeekSales(site.id)
              const sitePct = (salesPeriod === 'week' && sitePrevWeek > 0) ? ((siteSales - sitePrevWeek) / sitePrevWeek * 100).toFixed(0) : null
              const siteGoal = getSiteGoal(site)
              const siteGoalPct = siteGoal > 0 ? Math.min(100, Math.round(siteSales / siteGoal * 100)) : null
              const tz = site.timezone || 'America/Cancun'
              return (
                <div key={site.id} style={{ background: '#ffffff', border: `2px solid ${open ? 'rgba(16,185,129,.4)' : late ? 'rgba(245,158,11,.35)' : '#e2e8f0'}`, borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(226,232,240,.6)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{site.name}</div>
                      {site.address && <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>{site.address}</div>}
                    </div>
                    {open && <span style={{ fontSize: 10, fontWeight: 700, color: '#10b981', background: 'rgba(16,185,129,.12)', border: '1px solid rgba(16,185,129,.3)', borderRadius: 5, padding: '2px 8px', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: 'pulse 2s infinite' }} />ABIERTA
                    </span>}
                    {!open && late && <span style={{ fontSize: 10, fontWeight: 700, color: '#f59e0b', background: 'rgba(245,158,11,.12)', border: '1px solid rgba(245,158,11,.35)', borderRadius: 5, padding: '2px 8px' }}>⚠ Sin check-in</span>}
                    {!open && !late && <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', background: 'rgba(74,85,104,.1)', border: '1px solid #e2e8f0', borderRadius: 5, padding: '2px 8px' }}>Inactiva</span>}
                  </div>
                  <div style={{ padding: '10px 16px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.5px' }}>Activos</div>
                      <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'JetBrains Mono'", color: '#10b981' }}>{activeNow}</div>
                      {activeRecords.slice(0, 3).map(r => {
                        const emp = allEmps.find(e => e.id === r.employee_id)
                        return emp ? <div key={r.id} style={{ fontSize: 9, color: '#10b981', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emp.name.split(' ')[0]}</div> : null
                      })}
                      {activeRecords.length > 3 && <div style={{ fontSize: 9, color: '#94a3b8' }}>+{activeRecords.length - 3}</div>}
                    </div>
                    {[['Completaron', completedToday, '#3b82f6'], ['Esperados', totalExpected, '#64748b']].map(([l, v, c]) => (
                      <div key={l} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.5px' }}>{l}</div>
                        <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "'JetBrains Mono'", color: c }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ padding: '8px 16px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                    {firstIn ? <span style={{ fontSize: 10, color: '#64748b' }}>1ra entrada: <span style={{ fontFamily: "'JetBrains Mono'", color: '#0f172a' }}>{new Date(firstIn.check_in).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz })}</span></span> : <span />}
                    <div style={{ textAlign: 'right', flex: 1 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: siteSales > 0 ? '#8b5cf6' : '#94a3b8' }}>
                        {siteSales > 0 ? `💰 $${Number(siteSales).toLocaleString('es-MX')}` : 'Sin ventas'}
                      </div>
                      {sitePct !== null && <div style={{ fontSize: 9, color: Number(sitePct) >= 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>{Number(sitePct) >= 0 ? '↑' : '↓'} {Math.abs(Number(sitePct))}% vs ant.</div>}
                      {siteGoalPct !== null && (
                        <div style={{ marginTop: 4 }}>
                          <div style={{ height: 4, background: 'rgba(139,92,246,.15)', borderRadius: 2, overflow: 'hidden', width: 100, marginLeft: 'auto' }}>
                            <div style={{ height: '100%', width: siteGoalPct + '%', background: siteGoalPct >= 100 ? '#10b981' : '#8b5cf6', borderRadius: 2 }} />
                          </div>
                          <div style={{ fontSize: 9, fontWeight: 600, color: siteGoalPct >= 100 ? '#10b981' : '#8b5cf6', marginTop: 1 }}>
                            {siteGoalPct}% · meta ${Number(siteGoal).toLocaleString('es-MX')}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* LIST VIEW */}
      {viewMode === 'list' && (
        <div>
          {sites.map(site => {
            const siteRows = dashRows.filter(r => r.sc.site_id === site.id)
            const siteUnscheduled = unscheduledAtt.filter(r => r.site_id === site.id)
            if (siteRows.length === 0 && siteUnscheduled.length === 0) return null
            const totalCount = siteRows.length + siteUnscheduled.length
            const siteSales = getSiteSales(site.id)
            const siteGoalL = getSiteGoal(site)
            const siteGoalPctL = siteGoalL > 0 ? Math.min(100, Math.round(siteSales / siteGoalL * 100)) : null
            return (
              <div key={site.id} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', marginBottom: 14 }}>
                <div style={{ padding: '10px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{site.name}</div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    {siteSales > 0 && (
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#8b5cf6' }}>💰 ${Number(siteSales).toLocaleString('es-MX')}</span>
                        {siteGoalPctL !== null && (
                          <div style={{ marginTop: 3 }}>
                            <div style={{ height: 3, background: 'rgba(139,92,246,.15)', borderRadius: 2, overflow: 'hidden', width: 80, marginLeft: 'auto' }}>
                              <div style={{ height: '100%', width: siteGoalPctL + '%', background: siteGoalPctL >= 100 ? '#10b981' : '#8b5cf6', borderRadius: 2 }} />
                            </div>
                            <div style={{ fontSize: 9, fontWeight: 600, color: siteGoalPctL >= 100 ? '#10b981' : '#8b5cf6' }}>{siteGoalPctL}% de meta</div>
                          </div>
                        )}
                      </div>
                    )}
                    <span style={{ fontSize: 10, color: '#94a3b8' }}>{totalCount} empleado{totalCount !== 1 ? 's' : ''} hoy</span>
                  </div>
                </div>
                <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
                  <thead><tr>{['Empleado','Horario','Entrada','Salida','Ventas','Estado'].map(h => (
                    <th key={h} style={{ textAlign: 'left', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.6px', color: '#94a3b8', padding: '8px 16px', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                  ))}</tr></thead>
                  <tbody>
                    {siteRows.map(({ sc, emp, record, color, bg, statusLabel }) => (
                      <tr key={sc.id} style={{ borderBottom: '1px solid rgba(226,232,240,.3)' }}>
                        <td style={{ padding: '10px 16px' }}>
                          <button onClick={() => setEmpPage(emp)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#3b82f6', textDecoration: 'underline', textDecorationColor: 'rgba(59,130,246,.3)' }}>{emp?.name || '?'}</div>
                            <div style={{ fontSize: 10, color: '#94a3b8' }}>{emp?.role}</div>
                          </button>
                        </td>
                        <td style={{ padding: '10px 16px', fontSize: 11, fontFamily: "'JetBrains Mono'", color: '#64748b' }}>{sc.start_time?.slice(0,5)} – {sc.end_time?.slice(0,5)}</td>
                        <td style={{ padding: '10px 16px', fontSize: 11, fontFamily: "'JetBrains Mono'" }}>{record?.check_in ? fmtTime(record.check_in, site.timezone) : '–'}</td>
                        <td style={{ padding: '10px 16px', fontSize: 11, fontFamily: "'JetBrains Mono'" }}>{record?.check_out ? fmtTime(record.check_out, site.timezone) : '–'}</td>
                        <td style={{ padding: '10px 16px', fontSize: 11, fontFamily: "'JetBrains Mono'", color: record?.sales_amount > 0 ? '#10b981' : '#94a3b8' }}>{record?.sales_amount > 0 ? '$'+Number(record.sales_amount).toLocaleString('es-MX') : '–'}</td>
                        <td style={{ padding: '10px 16px' }}><span style={{ padding: '3px 10px', borderRadius: 5, fontSize: 10, fontWeight: 600, color, background: bg }}>{statusLabel}</span></td>
                      </tr>
                    ))}
                    {siteUnscheduled.map(r => {
                      const emp = allEmps.find(e => e.id === r.employee_id)
                      const color = r.check_out ? '#3b82f6' : (r.lunch_start && !r.lunch_end) ? '#f59e0b' : (r.break_start && !r.break_end) ? '#3b82f6' : '#10b981'
                      const bg = r.check_out ? 'rgba(59,130,246,.12)' : (r.lunch_start && !r.lunch_end) ? 'rgba(245,158,11,.12)' : (r.break_start && !r.break_end) ? 'rgba(59,130,246,.12)' : 'rgba(16,185,129,.12)'
                      const label = r.check_out ? 'Completó turno' : (r.lunch_start && !r.lunch_end) ? 'En comida' : (r.break_start && !r.break_end) ? 'En descanso' : 'Activo'
                      return (
                        <tr key={r.id} style={{ borderBottom: '1px solid rgba(226,232,240,.3)', background: 'rgba(16,185,129,.03)' }}>
                          <td style={{ padding: '10px 16px' }}>
                            <button onClick={() => setEmpPage(emp)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: '#3b82f6', textDecoration: 'underline', textDecorationColor: 'rgba(59,130,246,.3)' }}>{emp?.name || '?'}</div>
                              <div style={{ fontSize: 10, color: '#94a3b8' }}>{emp?.role}</div>
                            </button>
                          </td>
                          <td style={{ padding: '10px 16px', fontSize: 10, color: '#94a3b8', fontStyle: 'italic' }}>Sin horario</td>
                          <td style={{ padding: '10px 16px', fontSize: 11, fontFamily: "'JetBrains Mono'" }}>{fmtTime(r.check_in, site.timezone)}</td>
                          <td style={{ padding: '10px 16px', fontSize: 11, fontFamily: "'JetBrains Mono'" }}>{r.check_out ? fmtTime(r.check_out, site.timezone) : '–'}</td>
                          <td style={{ padding: '10px 16px', fontSize: 11, fontFamily: "'JetBrains Mono'", color: r.sales_amount > 0 ? '#10b981' : '#94a3b8' }}>{r.sales_amount > 0 ? '$'+Number(r.sales_amount).toLocaleString('es-MX') : '–'}</td>
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
            <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 13, background: '#ffffff', borderRadius: 10, border: '1px solid #e2e8f0' }}>No hay actividad registrada para hoy.</div>
          )}
        </div>
      )}
    </div>
  )
}
// ─── Schedule Board ───────────────────────────────────────────────────────────
const SB_HOUR_H = 64   // px per hour
const SB_START  = 6    // 6am
const SB_END    = 23   // 11pm
const SB_TOTAL  = (SB_END - SB_START) * SB_HOUR_H
function sbTimeToY(time) {
  if (!time) return 0
  const [h, m] = time.slice(0, 5).split(':').map(Number)
  return (h - SB_START + m / 60) * SB_HOUR_H
}
function sbYToTime(y) {
  const tot = SB_START + Math.max(0, y) / SB_HOUR_H
  const h = Math.floor(tot)
  const m = Math.round(((tot - h) * 60) / 30) * 30
  const fh = m >= 60 ? h + 1 : h; const fm = m >= 60 ? 0 : m
  return `${String(Math.max(SB_START, Math.min(SB_END - 1, fh))).padStart(2, '0')}:${String(fm).padStart(2, '0')}`
}
function ScheduleBoard({ sites, allEmps, schedules, employeeSiteAssignments, siteHours, isSuperAdmin, adminUser, onRefresh, setToast }) {
  const [selSiteId, setSelSiteId] = useState(sites[0]?.id || '')
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()))
  const [localSchedules, setLocalSchedules] = useState(schedules)
  const [resizing, setResizing]   = useState(null)   // { schedId, startTime, origEnd, date }
  const [resizePrev, setResizePrev] = useState(null) // { schedId, time }
  const [dragOverDate, setDragOverDate] = useState(null)
  const [dragTime, setDragTime]   = useState(null)
  const [showSiteHours, setShowSiteHours] = useState(false)
  const [activeEmpId, setActiveEmpId] = useState(null) // click-to-assign: selected employee
  const [overlapEmpId, setOverlapEmpId] = useState(null) // flash red on overlap
  const [editSched, setEditSched] = useState(null)       // { id, empId, date, start_time, end_time } inline edit
  const [openFormEmpId, setOpenFormEmpId] = useState(null) // open ScheduleModal for emp
  const [pendingDrop, setPendingDrop] = useState(null)   // { empId, date, startTime }
  const colRefs  = useRef({})
  const gridRef  = useRef(null)
  const savingRef = useRef(false)

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Cancun' })
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = addDays(weekStart, i)
    return { date: dateStr(d), label: DAY_NAMES[i], d, isPast: dateStr(d) < today, isToday: dateStr(d) === today }
  })
  const weekLabel = `${weekDates[0].label} ${weekDates[0].date.slice(8)} – ${weekDates[6].label} ${weekDates[6].date.slice(8)} ${weekDates[0].date.slice(0,7).replace('-','/')}`

  // Reset selSiteId when sites list changes (e.g. company filter changed)
  useEffect(() => {
    if (sites.length > 0 && !sites.find(s => s.id === selSiteId)) {
      setSelSiteId(sites[0].id)
    }
  }, [sites])
  // Sync local schedules when parent refreshes (without resetting selSiteId)
  useEffect(() => { setLocalSchedules(schedules) }, [schedules])
  // Scroll to 8am on mount
  useEffect(() => { if (gridRef.current) gridRef.current.scrollTop = sbTimeToY('07:30') }, [])

  const siteEmpIds = employeeSiteAssignments.filter(a => a.site_id === selSiteId).map(a => a.employee_id)
  const filteredEmps = allEmps.filter(e => siteEmpIds.includes(e.id))
  const weekSchedForSite = localSchedules.filter(s => s.site_id === selSiteId && weekDates.some(d => d.date === s.date))

  const EMP_PALETTE = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444','#06b6d4','#ec4899','#84cc16','#f97316','#a78bfa']
  const empColorMap = {}
  filteredEmps.forEach((e, i) => { empColorMap[e.id] = EMP_PALETTE[i % EMP_PALETTE.length] })

  function tMins(t) { const [h,m] = (t||'00:00').slice(0,5).split(':').map(Number); return h*60+m }
  function computeLayout(dayScheds) {
    const sorted = [...dayScheds].sort((a,b) => a.start_time.localeCompare(b.start_time))
    const cols = []
    const layout = {}
    for (const s of sorted) {
      const endMins = tMins(s.end_time)
      const colIdx = cols.findIndex(e => e <= tMins(s.start_time))
      if (colIdx === -1) { layout[s.id] = cols.length; cols.push(endMins) }
      else { layout[s.id] = colIdx; cols[colIdx] = endMins }
    }
    return { layout, totalCols: cols.length || 1 }
  }

  function getDayHours(date) {
    const jsDow = new Date(date + 'T12:00:00').getDay()
    const dow = jsDow === 0 ? 6 : jsDow - 1
    return (siteHours || []).find(h => h.site_id === selSiteId && h.day_of_week === dow) || null
  }

  const [defaultDur, setDefaultDur] = useState(() => {
    try { const v = localStorage.getItem('schedDur_' + selSiteId); return v ? parseFloat(v) : 8 } catch { return 8 }
  })
  // Sync defaultDur when site changes
  useEffect(() => {
    try { const v = localStorage.getItem('schedDur_' + selSiteId); setDefaultDur(v ? parseFloat(v) : 8) } catch { setDefaultDur(8) }
  }, [selSiteId])
  function adjDefaultDur(delta) {
    setDefaultDur(d => {
      const next = Math.round(Math.min(24, Math.max(0.5, d + delta)) * 2) / 2
      try { localStorage.setItem('schedDur_' + selSiteId, String(next)) } catch {}
      return next
    })
  }
  function fmtDur(h) { const hrs = Math.floor(h); const mins = Math.round((h - hrs) * 60); return mins === 0 ? `${hrs}h` : `${hrs}h ${mins}m` }

  async function dropEmp(empId, date, y) {
    if (!selSiteId || savingRef.current) return
    if (localSchedules.find(s => s.employee_id === empId && s.date === date)) {
      setToast('Este empleado ya tiene un horario asignado ese día')
      setOverlapEmpId(empId); setTimeout(() => setOverlapEmpId(null), 1000)
      return
    }
    savingRef.current = true
    const dh = getDayHours(date)
    const startTime = y != null ? sbYToTime(y) : (dh?.open_time?.slice(0, 5) || '09:00')
    const [sh, sm] = startTime.split(':').map(Number)
    const totalMins = sh * 60 + sm + Math.round(defaultDur * 60)
    const endH = Math.min(23, Math.floor(totalMins / 60))
    const endM = totalMins % 60
    const endTime = `${String(endH).padStart(2,'0')}:${String(endM).padStart(2,'0')}`
    const companyId = sites.find(s => s.id === selSiteId)?.company_id || null
    const { data: ns } = await supabase.from('schedules').insert({
      employee_id: empId, site_id: selSiteId, date,
      start_time: startTime, end_time: endTime, lunch_mins: 60,
      ...(companyId ? { company_id: companyId } : {})
    }).select().single()
    if (ns) setLocalSchedules(prev => [...prev, ns])
    savingRef.current = false
  }

  async function confirmDrop(empId, date, startTime, durationHrs) {
    if (savingRef.current) return
    savingRef.current = true
    try { localStorage.setItem('schedDur_' + selSiteId, String(durationHrs)) } catch {}
    const [sh, sm] = startTime.split(':').map(Number)
    const totalMins = sh * 60 + sm + Math.round(durationHrs * 60)
    const endH = Math.min(23, Math.floor(totalMins / 60))
    const endM = totalMins % 60
    const endTime = `${String(endH).padStart(2,'0')}:${String(endM).padStart(2,'0')}`
    const companyId = sites.find(s => s.id === selSiteId)?.company_id || null
    const { data: ns } = await supabase.from('schedules').insert({
      employee_id: empId, site_id: selSiteId, date,
      start_time: startTime, end_time: endTime, lunch_mins: 60,
      ...(companyId ? { company_id: companyId } : {})
    }).select().single()
    if (ns) setLocalSchedules(prev => [...prev, ns])
    setPendingDrop(null)
    savingRef.current = false
  }

  async function removeSchedule(schedId) {
    setLocalSchedules(prev => prev.filter(s => s.id !== schedId))
    await supabase.from('schedules').delete().eq('id', schedId)
  }

  async function saveEditSched({ id, start_time, end_time }) {
    setLocalSchedules(prev => prev.map(s => s.id === id ? { ...s, start_time, end_time } : s))
    setEditSched(null)
    await supabase.from('schedules').update({ start_time, end_time }).eq('id', id)
  }

  function exportScheduleImage() {
    const PAD = 24, EMP_W = 150, COL_W = 88, ROW_H = 44, HEAD_H = 72, DAY_H = 32
    const siteName = sites.find(s => s.id === selSiteId)?.name || 'Tienda'
    const canvas = document.createElement('canvas')
    canvas.width  = PAD * 2 + EMP_W + COL_W * 7
    canvas.height = PAD * 2 + HEAD_H + DAY_H + ROW_H * (filteredEmps.length || 1) + 20
    const ctx = canvas.getContext('2d')
    // Background
    ctx.fillStyle = '#f8fafc'; ctx.fillRect(0, 0, canvas.width, canvas.height)
    // Header
    ctx.fillStyle = '#0f172a'; ctx.font = 'bold 17px sans-serif'
    ctx.fillText(siteName, PAD, PAD + 20)
    ctx.fillStyle = '#64748b'; ctx.font = '11px sans-serif'
    ctx.fillText(weekLabel, PAD, PAD + 40)
    // Day headers
    weekDates.forEach(({ date, label, isToday }, i) => {
      const x = PAD + EMP_W + i * COL_W
      ctx.fillStyle = isToday ? 'rgba(59,130,246,.18)' : 'rgba(226,232,240,.5)'
      ctx.fillRect(x, PAD + HEAD_H, COL_W - 1, DAY_H)
      ctx.fillStyle = isToday ? '#3b82f6' : '#64748b'
      ctx.font = 'bold 11px sans-serif'
      ctx.fillText(label, x + 8, PAD + HEAD_H + 14)
      ctx.fillStyle = '#94a3b8'; ctx.font = '10px monospace'
      ctx.fillText(date.slice(8), x + 8, PAD + HEAD_H + 27)
    })
    // Employee label header
    ctx.fillStyle = 'rgba(226,232,240,.5)'
    ctx.fillRect(PAD, PAD + HEAD_H, EMP_W - 1, DAY_H)
    ctx.fillStyle = '#94a3b8'; ctx.font = 'bold 9px sans-serif'
    ctx.fillText('EMPLEADO', PAD + 8, PAD + HEAD_H + 20)
    // Rows
    filteredEmps.forEach((emp, ei) => {
      const y = PAD + HEAD_H + DAY_H + ei * ROW_H
      const color = empColorMap[emp.id] || '#3b82f6'
      // Row bg
      ctx.fillStyle = ei % 2 === 0 ? 'rgba(255,255,255,.02)' : 'transparent'
      ctx.fillRect(PAD, y, canvas.width - PAD * 2, ROW_H)
      // Dot + name
      ctx.fillStyle = color; ctx.beginPath()
      ctx.arc(PAD + 10, y + ROW_H / 2, 4, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#0f172a'; ctx.font = '12px sans-serif'
      ctx.fillText(emp.name.length > 16 ? emp.name.slice(0, 15) + '…' : emp.name, PAD + 20, y + ROW_H / 2 + 4)
      // Day cells
      weekDates.forEach(({ date }, ci) => {
        const x = PAD + EMP_W + ci * COL_W
        const s = weekSchedForSite.find(s => s.date === date && s.employee_id === emp.id)
        ctx.strokeStyle = 'rgba(226,232,240,.6)'; ctx.lineWidth = 1
        ctx.strokeRect(x, y, COL_W - 1, ROW_H)
        if (s) {
          ctx.fillStyle = color + '28'
          ctx.fillRect(x + 2, y + 4, COL_W - 5, ROW_H - 8)
          ctx.fillStyle = color; ctx.font = 'bold 10px monospace'
          ctx.fillText(s.start_time?.slice(0,5) || '', x + 6, y + ROW_H / 2 - 2)
          ctx.fillStyle = color + 'aa'; ctx.font = '9px monospace'
          ctx.fillText(s.end_time?.slice(0,5) || '', x + 6, y + ROW_H / 2 + 11)
        } else {
          ctx.fillStyle = '#cbd5e1'; ctx.font = '14px sans-serif'
          ctx.fillText('–', x + COL_W / 2 - 5, y + ROW_H / 2 + 5)
        }
      })
    })
    if (filteredEmps.length === 0) {
      ctx.fillStyle = '#94a3b8'; ctx.font = '12px sans-serif'
      ctx.fillText('Sin empleados asignados', PAD + 10, PAD + HEAD_H + DAY_H + 22)
    }
    // Watermark
    ctx.fillStyle = 'rgba(136,146,168,.25)'; ctx.font = '9px sans-serif'
    ctx.fillText('worktic.app', canvas.width - PAD - 65, canvas.height - 7)
    // Download
    const link = document.createElement('a')
    link.download = `horario-${siteName.replace(/\s+/g,'-').toLowerCase()}-${weekDates[0].date}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  // Resize drag: track mouse globally while resizing
  useEffect(() => {
    if (!resizing) return
    let previewEnd = resizing.origEnd
    function onMove(e) {
      const col = colRefs.current[resizing.date]
      if (!col) return
      const rect = col.getBoundingClientRect()
      const minY = sbTimeToY(resizing.startTime) + SB_HOUR_H / 2
      previewEnd = sbYToTime(Math.max(minY, e.clientY - rect.top))
      setResizePrev({ schedId: resizing.schedId, time: previewEnd })
    }
    async function onUp() {
      if (previewEnd !== resizing.origEnd) {
        // Ensure end_time > start_time
        const [sh, sm] = resizing.startTime.split(':').map(Number)
        const [eh, em] = previewEnd.split(':').map(Number)
        if ((eh * 60 + em) <= (sh * 60 + sm)) { setResizing(null); setResizePrev(null); return }
        setLocalSchedules(prev => prev.map(s => s.id === resizing.schedId ? { ...s, end_time: previewEnd } : s))
        supabase.from('schedules').update({ end_time: previewEnd }).eq('id', resizing.schedId)
      }
      setResizing(null); setResizePrev(null)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [resizing])

  if (sites.length === 0) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>No hay sucursales configuradas.</div>
  )

  const hours = Array.from({ length: SB_END - SB_START }, (_, i) => SB_START + i)

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", userSelect: resizing ? 'none' : 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <select value={selSiteId} onChange={e => setSelSiteId(e.target.value)}
          style={{ background: '#ffffff', border: '1px solid #e2e8f0', color: '#0f172a', fontSize: 13, fontWeight: 600, padding: '7px 12px', borderRadius: 8, fontFamily: 'inherit', cursor: 'pointer' }}>
          {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button onClick={() => setWeekStart(w => addDays(w, -7))} style={{ background: '#ffffff', border: '1px solid #e2e8f0', color: '#64748b', borderRadius: 7, padding: '6px 10px', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>‹</button>
          <span style={{ fontSize: 12, color: '#64748b', minWidth: 170, textAlign: 'center' }}>{weekLabel}</span>
          <button onClick={() => setWeekStart(w => addDays(w, 7))} style={{ background: '#ffffff', border: '1px solid #e2e8f0', color: '#64748b', borderRadius: 7, padding: '6px 10px', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>›</button>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button onClick={exportScheduleImage}
            style={{ background: '#ffffff', border: '1px solid rgba(139,92,246,.4)', color: '#a78bfa', borderRadius: 7, padding: '7px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
            📷 Imagen
          </button>
          <button onClick={() => setShowSiteHours(true)}
            style={{ background: '#ffffff', border: '1px solid rgba(16,185,129,.4)', color: '#10b981', borderRadius: 7, padding: '7px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 6 }}>
            ⏰ Horario de la tienda
          </button>
        </div>
      </div>

      {/* Employee chips */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.6px', color: activeEmpId ? '#10b981' : '#94a3b8' }}>
            {activeEmpId
              ? <>{`✔ ${filteredEmps.find(e => e.id === activeEmpId)?.name || ''} seleccionado — toca un día para asignar · `}<button onClick={() => setActiveEmpId(null)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 10, padding: 0, fontFamily: 'inherit' }}>cancelar</button></>
              : 'Toca un nombre y luego un día para asignar · toca un bloque para editar'}
          </div>
          {/* Duration default control */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 8, padding: '4px 8px' }}>
            <span style={{ fontSize: 9, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.5px' }}>Turno</span>
            <button onClick={() => adjDefaultDur(-0.5)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 14, padding: '0 2px', fontFamily: 'inherit', lineHeight: 1 }}>−</button>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', minWidth: 32, textAlign: 'center' }}>{fmtDur(defaultDur)}</span>
            <button onClick={() => adjDefaultDur(0.5)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 14, padding: '0 2px', fontFamily: 'inherit', lineHeight: 1 }}>+</button>
          </div>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {filteredEmps.length === 0 && <div style={{ fontSize: 11, color: '#94a3b8' }}>Sin empleados asignados a esta tienda.</div>}
          {filteredEmps.map(emp => {
            const isActive = activeEmpId === emp.id
            const isOverlap = overlapEmpId === emp.id
            const color = empColorMap[emp.id] || '#3b82f6'
            return (
              <div key={emp.id} style={{ display: 'flex', alignItems: 'center', gap: 0, borderRadius: 8, overflow: 'hidden', border: `1px solid ${isOverlap ? '#ef4444' : isActive ? color : color + '55'}`, transition: 'border-color .2s', background: isOverlap ? 'rgba(239,68,68,.12)' : isActive ? color + '22' : color + '11' }}>
                <div draggable
                  onDragStart={e => { e.dataTransfer.setData('empId', emp.id); e.dataTransfer.effectAllowed = 'copy'; setActiveEmpId(null) }}
                  onClick={() => setActiveEmpId(isActive ? null : emp.id)}
                  style={{ padding: '6px 10px', cursor: 'pointer', userSelect: 'none', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5, color: isOverlap ? '#ef4444' : color }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
                  <span style={{ whiteSpace: 'nowrap' }}>{emp.name}</span>
                </div>
                <button title='Asignar horario semanal' onClick={() => setOpenFormEmpId(emp.id)}
                  style={{ background: color + '22', border: 'none', borderLeft: `1px solid ${color}44`, color, cursor: 'pointer', fontSize: 11, padding: '6px 8px', fontFamily: 'inherit', height: '100%' }}>📅</button>
              </div>
            )
          })}
        </div>
      </div>

      {/* Calendar grid */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
        {/* Single scrollable container — header + body scroll together horizontally */}
        <div ref={gridRef} style={{ maxHeight: 560, overflowY: 'auto', overflowX: 'auto' }}>
        {/* Day headers — sticky to top of THIS scroll container */}
        <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', position: 'sticky', top: 0, zIndex: 5, background: '#f8fafc', minWidth: 620 }}>
          <div style={{ width: 40, flexShrink: 0 }} />
          {weekDates.map(({ date, label, isToday, isPast }) => {
            const dh = getDayHours(date)
            return (
              <div key={date} style={{ flex: 1, minWidth: 80, padding: '7px 6px', borderLeft: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: isToday ? '#3b82f6' : isPast ? '#94a3b8' : '#0f172a' }}>
                  {label} <span style={{ fontFamily: "'JetBrains Mono'", fontSize: 10 }}>{date.slice(8)}</span>
                </div>
                {dh
                  ? <div style={{ fontSize: 9, color: dh.is_open ? '#10b981' : '#ef4444', marginTop: 1 }}>{dh.is_open ? `${dh.open_time?.slice(0,5)}–${dh.close_time?.slice(0,5)}` : '⛔ Cerrado'}</div>
                  : <div style={{ fontSize: 9, color: '#cbd5e1', marginTop: 1 }}>
                      <button onClick={() => setShowSiteHours(true)} style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: 9, padding: 0, fontFamily: 'inherit', textDecoration: 'underline' }}>+ Agregar horario</button>
                    </div>}
              </div>
            )
          })}
        </div>

        {/* Time body */}
          <div style={{ display: 'flex', minWidth: 620 }}>
            {/* Time axis — sticky to left so it stays visible when scrolling horizontally */}
            <div style={{ width: 40, flexShrink: 0, background: '#f8fafc', position: 'sticky', left: 0, zIndex: 3 }}>
              {hours.map(h => (
                <div key={h} style={{ height: SB_HOUR_H, display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', paddingRight: 6, paddingTop: 4, boxSizing: 'border-box', borderTop: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: 9, color: '#94a3b8', fontFamily: "'JetBrains Mono'" }}>{String(h).padStart(2,'0')}</span>
                </div>
              ))}
            </div>
            {/* Day columns */}
            <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
              {weekDates.map(({ date, isToday }) => {
                const dh = getDayHours(date)
                const dayScheds = weekSchedForSite.filter(s => s.date === date)
                const isOver = dragOverDate === date
                return (
                  <div key={date} style={{ borderLeft: '1px solid #e2e8f0' }}>
                    <div
                      ref={el => colRefs.current[date] = el}
                      onDragOver={e => {
                        e.preventDefault()
                        const y = e.clientY - e.currentTarget.getBoundingClientRect().top
                        setDragOverDate(date); setDragTime(sbYToTime(Math.max(0, y)))
                      }}
                      onDragLeave={() => { setDragOverDate(null); setDragTime(null) }}
                      onDrop={e => {
                        e.preventDefault()
                        const y = e.clientY - e.currentTarget.getBoundingClientRect().top
                        setDragOverDate(null); setDragTime(null)
                        dropEmp(e.dataTransfer.getData('empId'), date, y)
                      }}
                      onClick={e => {
                        if (!activeEmpId || resizing) return
                        const y = e.clientY - e.currentTarget.getBoundingClientRect().top
                        dropEmp(activeEmpId, date, y)
                      }}
                      style={{ position: 'relative', height: SB_TOTAL, background: activeEmpId ? (isOver ? 'rgba(16,185,129,.06)' : 'rgba(16,185,129,.02)') : isOver ? 'rgba(59,130,246,.04)' : isToday ? 'rgba(59,130,246,.015)' : 'transparent', transition: 'background .1s', cursor: activeEmpId ? 'crosshair' : 'default' }}>
                      {/* Hour lines */}
                      {hours.map(h => (
                        <div key={h} style={{ position: 'absolute', top: (h - SB_START) * SB_HOUR_H, left: 0, right: 0, borderTop: '1px solid rgba(226,232,240,.7)', pointerEvents: 'none' }} />
                      ))}
                      {/* Half-hour lines */}
                      {hours.map(h => (
                        <div key={h + '.5'} style={{ position: 'absolute', top: (h - SB_START) * SB_HOUR_H + SB_HOUR_H / 2, left: 0, right: 0, borderTop: '1px dashed rgba(226,232,240,.4)', pointerEvents: 'none' }} />
                      ))}
                      {/* Store open-hours highlight */}
                      {dh?.is_open && dh.open_time && dh.close_time && (
                        <div style={{ position: 'absolute', top: sbTimeToY(dh.open_time), height: sbTimeToY(dh.close_time) - sbTimeToY(dh.open_time), left: 0, right: 0, background: 'rgba(16,185,129,.04)', pointerEvents: 'none' }} />
                      )}
                      {/* Drop preview line */}
                      {isOver && dragTime && (
                        <div style={{ position: 'absolute', top: sbTimeToY(dragTime), left: 0, right: 0, height: 2, background: '#3b82f6', pointerEvents: 'none', zIndex: 6 }}>
                          <span style={{ position: 'absolute', left: 3, top: -9, fontSize: 9, color: '#3b82f6', fontFamily: "'JetBrains Mono'", background: '#ffffff', border: '1px solid #3b82f6', padding: '0 2px', borderRadius: 2 }}>{dragTime}</span>
                        </div>
                      )}
                      {/* Schedule blocks */}
                      {(() => {
                        const { layout, totalCols } = computeLayout(dayScheds)
                        return dayScheds.map(s => {
                          const emp = allEmps.find(e => e.id === s.employee_id)
                          const startT = s.start_time?.slice(0, 5) || '09:00'
                          const rawEnd = s.end_time?.slice(0, 5) || '18:00'
                          const isRes = resizing?.schedId === s.id
                          const endT = (isRes && resizePrev?.schedId === s.id) ? resizePrev.time : rawEnd
                          const top = sbTimeToY(startT)
                          const height = Math.max(SB_HOUR_H / 2, sbTimeToY(endT) - top)
                          const color = empColorMap[s.employee_id] || '#3b82f6'
                          const colIdx = layout[s.id] || 0
                          const colW = 100 / totalCols
                          const leftPct = colIdx * colW
                          const rightPct = 100 - (colIdx + 1) * colW
                          return (
                            <div key={s.id} style={{ position: 'absolute', top, left: `calc(${leftPct}% + 2px)`, right: `calc(${rightPct}% + 2px)`, height, background: isRes ? color + '44' : color + '26', border: `1px solid ${color}${isRes ? 'cc' : '66'}`, borderRadius: 5, overflow: 'hidden', zIndex: isRes ? 10 : 2, boxSizing: 'border-box' }}>
                              <div onClick={() => setEditSched({ id: s.id, empId: s.employee_id, date: s.date, start_time: startT, end_time: rawEnd })} style={{ padding: '3px 18px 3px 5px', overflow: 'hidden', cursor: 'pointer' }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp?.name || '?'}</div>
                                <div style={{ fontSize: 9, color: color + 'aa', fontFamily: "'JetBrains Mono'" }}>{startT}–{endT}</div>
                              </div>
                              <button onClick={e => { e.stopPropagation(); removeSchedule(s.id) }} style={{ position: 'absolute', top: 2, right: 2, background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 11, lineHeight: 1, padding: '1px 3px' }} title='Eliminar'>✕</button>
                              <div onMouseDown={e => { e.preventDefault(); e.stopPropagation(); setResizing({ schedId: s.id, startTime: startT, origEnd: rawEnd, date }) }}
                                style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 8, cursor: 'ns-resize', background: color + '30', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div style={{ width: 16, height: 2, background: color + '88', borderRadius: 1 }} />
                              </div>
                            </div>
                          )
                        })
                      })()}
                    </div>
                  </div>
                )
              })}
            </div>
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

      {/* Inline schedule block edit modal */}
      {editSched && <SchedEditModal sched={editSched} allEmps={allEmps}
        onSave={saveEditSched}
        onDelete={() => { removeSchedule(editSched.id); setEditSched(null) }}
        onClose={() => setEditSched(null)} />}

      {/* Quick shift creator on drop/click */}
      {pendingDrop && (
        <QuickShiftModal
          empId={pendingDrop.empId} date={pendingDrop.date} startTime={pendingDrop.startTime}
          siteId={selSiteId} allEmps={allEmps} defaultDuration={getLastDur()}
          onConfirm={confirmDrop}
          onClose={() => setPendingDrop(null)} />
      )}

      {/* Open full week ScheduleModal from chip 📅 */}
      {openFormEmpId && allEmps.find(e => e.id === openFormEmpId) && (
        <ScheduleModal emp={allEmps.find(e => e.id === openFormEmpId)} sites={sites}
          schedules={localSchedules.filter(s => s.employee_id === openFormEmpId)}
          onSave={async () => { await onRefresh(); setToast('Horarios guardados'); setOpenFormEmpId(null) }}
          onClose={() => setOpenFormEmpId(null)} />
      )}
    </div>
  )
}

function QuickShiftModal({ empId, date, startTime: initialStart, siteId, allEmps, defaultDuration, onConfirm, onClose }) {
  const [start, setStart] = useState(initialStart)
  const [duration, setDuration] = useState(defaultDuration || 8)
  const emp = allEmps.find(e => e.id === empId)
  const timeOpts = Array.from({ length: 48 }, (_, i) => {
    const h = String(Math.floor(i/2)).padStart(2,'0'); const m = i%2===0?'00':'30'; return `${h}:${m}`
  })
  const [sh, sm] = start.split(':').map(Number)
  const totalMins = sh * 60 + sm + Math.round(duration * 60)
  const endH = Math.min(23, Math.floor(totalMins / 60))
  const endM = totalMins % 60
  const endTime = `${String(endH).padStart(2,'0')}:${String(endM).padStart(2,'0')}`
  function adjDur(delta) { setDuration(d => Math.round(Math.min(24, Math.max(0.5, d + delta)) * 2) / 2) }
  function fmtDur(h) { const hrs = Math.floor(h); const mins = Math.round((h-hrs)*60); return mins === 0 ? `${hrs}h` : `${hrs}h ${mins}m` }
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 500, padding: '0 16px' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 24, width: '100%', maxWidth: 300, fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>Nuevo turno</div>
        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 18 }}>{emp?.name} · {date}</div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.5px' }}>Hora de entrada</div>
          <select value={start} onChange={e => setStart(e.target.value)}
            style={{ width: '100%', background: '#ffffff', border: '1px solid #e2e8f0', color: '#0f172a', fontSize: 14, padding: '8px 10px', borderRadius: 8, fontFamily: 'inherit' }}>
            {timeOpts.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.5px' }}>Duración del turno</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'center' }}>
            <button onClick={() => adjDur(-0.5)}
              style={{ width: 40, height: 40, borderRadius: 10, border: '1px solid #e2e8f0', background: '#ffffff', color: '#0f172a', fontSize: 22, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>−</button>
            <div style={{ textAlign: 'center', minWidth: 90 }}>
              <div style={{ fontSize: 26, fontWeight: 700, color: '#0f172a', lineHeight: 1 }}>{fmtDur(duration)}</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 5 }}>Salida: <span style={{ color: '#10b981', fontWeight: 600 }}>{endTime}</span></div>
            </div>
            <button onClick={() => adjDur(0.5)}
              style={{ width: 40, height: 40, borderRadius: 10, border: '1px solid #e2e8f0', background: '#ffffff', color: '#0f172a', fontSize: 22, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>+</button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: '10px', borderRadius: 9, border: '1px solid #e2e8f0', background: 'transparent', color: '#64748b', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
          <button onClick={() => onConfirm(empId, date, start, duration)}
            style={{ flex: 2, padding: '10px', borderRadius: 9, border: 'none', background: '#3b82f6', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Crear → {endTime}</button>
        </div>
      </div>
    </div>
  )
}

function SchedEditModal({ sched, allEmps, onSave, onDelete, onClose }) {
  const [start, setStart] = useState(sched.start_time)
  const [end, setEnd]     = useState(sched.end_time)
  const [err, setErr]     = useState('')
  const emp = allEmps.find(e => e.id === sched.empId)
  const timeOpts = Array.from({ length: 48 }, (_, i) => { const h = String(Math.floor(i/2)).padStart(2,'0'); const m = i%2===0?'00':'30'; return `${h}:${m}` })
  function handleSave() {
    const [sh, sm] = start.split(':').map(Number)
    const [eh, em] = end.split(':').map(Number)
    if ((sh * 60 + sm) >= (eh * 60 + em)) { setErr('La entrada debe ser antes de la salida'); return }
    onSave({ id: sched.id, start_time: start, end_time: end })
  }
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, padding: '0 16px' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 22, width: '100%', maxWidth: 320 }}>
        <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 2 }}>Editar horario</div>
        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 16 }}>{emp?.name} · {sched.date}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: err ? 6 : 16 }}>
          <div>
            <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 4 }}>Entrada</div>
            <select value={start} onChange={e => { setStart(e.target.value); setErr('') }}
              style={{ width: '100%', background: '#ffffff', border: '1px solid #e2e8f0', color: '#0f172a', fontSize: 13, padding: '7px 8px', borderRadius: 7, fontFamily: 'inherit' }}>
              {timeOpts.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 4 }}>Salida</div>
            <select value={end} onChange={e => { setEnd(e.target.value); setErr('') }}
              style={{ width: '100%', background: '#ffffff', border: '1px solid #e2e8f0', color: '#0f172a', fontSize: 13, padding: '7px 8px', borderRadius: 7, fontFamily: 'inherit' }}>
              {timeOpts.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        {err && <div style={{ fontSize: 11, color: '#ef4444', marginBottom: 12 }}>{err}</div>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onDelete} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid rgba(239,68,68,.3)', background: 'rgba(239,68,68,.08)', color: '#ef4444', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Eliminar</button>
          <button onClick={onClose} style={{ flex: 1, padding: '8px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'transparent', color: '#64748b', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
          <button onClick={handleSave} style={{ flex: 1, padding: '8px 14px', borderRadius: 8, border: 'none', background: '#3b82f6', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Guardar</button>
        </div>
      </div>
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
      <div onClick={e => e.stopPropagation()} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 22, width: '100%', maxWidth: 420, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700 }}>Horario de la tienda</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{siteName}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 6, color: '#64748b', fontSize: 18, cursor: 'pointer', padding: '2px 10px', lineHeight: 1 }}>×</button>
        </div>
        {DAY_NAMES.map((day, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, padding: '10px 12px', background: '#ffffff', borderRadius: 8, border: '1px solid #e2e8f0' }}>
            <div style={{ width: 28, fontSize: 12, fontWeight: 600, color: rows[i].isOpen ? '#0f172a' : '#94a3b8' }}>{day}</div>
            <button onClick={() => upd(i, 'isOpen', !rows[i].isOpen)}
              style={{ padding: '3px 10px', borderRadius: 5, border: 'none', background: rows[i].isOpen ? 'rgba(16,185,129,.2)' : 'rgba(239,68,68,.15)', color: rows[i].isOpen ? '#10b981' : '#ef4444', fontSize: 10, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
              {rows[i].isOpen ? 'Abierto' : 'Cerrado'}
            </button>
            {rows[i].isOpen && <>
              <select value={rows[i].open} onChange={e => upd(i, 'open', e.target.value)}
                style={{ flex: 1, background: '#ffffff', border: '1px solid #e2e8f0', color: '#0f172a', fontSize: 11, padding: '4px 6px', borderRadius: 5, fontFamily: 'inherit' }}>
                {timeOpts.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <span style={{ color: '#94a3b8', fontSize: 11 }}>–</span>
              <select value={rows[i].close} onChange={e => upd(i, 'close', e.target.value)}
                style={{ flex: 1, background: '#ffffff', border: '1px solid #e2e8f0', color: '#0f172a', fontSize: 11, padding: '4px 6px', borderRadius: 5, fontFamily: 'inherit' }}>
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
function AlertsPanel({ adminUserId, adminEmail }) {
  const [email, setEmail]                   = useState(adminEmail || '')
  const [onCheckin, setOnCheckin]           = useState(false)
  const [onLate, setOnLate]                 = useState(false)
  const [onNoshow, setOnNoshow]             = useState(false)
  const [onCheckout, setOnCheckout]         = useState(false)
  const [onMovement, setOnMovement]         = useState(false)
  const [pushCheckin, setPushCheckin]       = useState(false)
  const [pushLate, setPushLate]             = useState(false)
  const [pushNoshow, setPushNoshow]         = useState(false)
  const [pushCheckout, setPushCheckout]     = useState(false)
  const [pushMovement, setPushMovement]     = useState(false)
  const [loading, setLoading]               = useState(true)
  const [saving, setSaving]                 = useState(false)
  const [saved, setSaved]                   = useState(false)

  const { permState, subscribed, activate } = usePushNotifications(adminUserId)

  useEffect(() => {
    if (!adminUserId) return
    fetch(`/api/alerts/prefs?admin_user_id=${adminUserId}`)
      .then(r => r.json())
      .then(({ prefs }) => {
        if (prefs) {
          setEmail(prefs.email || adminEmail || '')
          setOnCheckin(!!prefs.on_checkin)
          setOnLate(!!prefs.on_late)
          setOnNoshow(!!prefs.on_noshow)
          setOnCheckout(!!prefs.on_checkout)
          setOnMovement(!!prefs.on_movement)
          setPushCheckin(!!prefs.push_on_checkin)
          setPushLate(!!prefs.push_on_late)
          setPushNoshow(!!prefs.push_on_noshow)
          setPushCheckout(!!prefs.push_on_checkout)
          setPushMovement(!!prefs.push_on_movement)
        }
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [adminUserId])

  async function handleSave() {
    setSaving(true)
    await fetch('/api/alerts/prefs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        admin_user_id: adminUserId, email,
        on_checkin: onCheckin, on_late: onLate, on_noshow: onNoshow, on_checkout: onCheckout, on_movement: onMovement,
        push_on_checkin: pushCheckin, push_on_late: pushLate, push_on_noshow: pushNoshow, push_on_checkout: pushCheckout, push_on_movement: pushMovement,
      }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const pushReady = permState === 'granted' && subscribed

  const ROWS = [
    { label: 'Check-in 📲', desc: 'Cuando un empleado registra su entrada',
      mail: onCheckin, setMail: setOnCheckin, push: pushCheckin, setPush: setPushCheckin },
    { label: 'Ya viene tarde ⏰', desc: 'Pasó la hora de entrada sin registrar (dentro de tolerancia)',
      mail: onLate, setMail: setOnLate, push: pushLate, setPush: setPushLate },
    { label: 'No llegó 🚨', desc: 'Pasó la hora + tolerancia y el empleado no ha llegado',
      mail: onNoshow, setMail: setOnNoshow, push: pushNoshow, setPush: setPushNoshow },
    { label: 'Check-out 🏁', desc: 'Cuando un empleado registra su salida',
      mail: onCheckout, setMail: setOnCheckout, push: pushCheckout, setPush: setPushCheckout },
    { label: 'Cualquier movimiento 🔄', desc: 'Check-in, check-out, descanso, comida — cualquier evento',
      mail: onMovement, setMail: setOnMovement, push: pushMovement, setPush: setPushMovement },
  ]

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Cargando...</div>

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '0 0 40px' }}>
      <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>🔔 Mis alertas</div>
      <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 20 }}>Elige cómo recibir cada notificación: por correo, push, o ambas.</div>

      {/* Push notifications activation */}
      <div style={{ background: '#ffffff', border: `1px solid ${pushReady ? 'rgba(29,158,117,.3)' : '#e2e8f0'}`, borderRadius: 10, padding: '14px 18px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
              {pushReady ? '✅ Notificaciones push activas' : '🔔 Activar notificaciones push'}
            </div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
              {permState === 'unsupported' && 'Tu navegador no soporta notificaciones push.'}
              {permState === 'blocked' && 'Bloqueadas en el navegador. Ve a Configuración del sitio para permitirlas.'}
              {permState === 'granted' && !subscribed && 'Permiso concedido, suscribiendo...'}
              {permState === 'granted' && subscribed && 'Recibirás alertas en este dispositivo aunque el navegador esté cerrado.'}
              {(permState === 'idle' || permState === 'loading') && 'Recibe alertas en este dispositivo sin tener el navegador abierto.'}
            </div>
          </div>
          {permState !== 'unsupported' && permState !== 'blocked' && !pushReady && (
            <button
              onClick={activate}
              disabled={permState === 'loading'}
              style={{ flexShrink: 0, padding: '8px 14px', borderRadius: 7, border: 'none', background: '#1D9E75', color: '#fff', fontSize: 12, fontWeight: 700, cursor: permState === 'loading' ? 'wait' : 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
            >
              {permState === 'loading' ? 'Activando...' : 'Activar'}
            </button>
          )}
        </div>
      </div>

      {/* Alert rows with mail + push toggles */}
      <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, marginBottom: 20, overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '8px 18px', borderBottom: '1px solid #e2e8f0', background: '#ffffff' }}>
          <div style={{ flex: 1, fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>Evento</div>
          <div style={{ display: 'flex', gap: 24, paddingRight: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, width: 40, textAlign: 'center' }}>✉️ Mail</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, width: 40, textAlign: 'center' }}>🔔 Push</span>
          </div>
        </div>
        {ROWS.map((row, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '12px 18px', borderBottom: i < ROWS.length - 1 ? '1px solid #e2e8f0' : 'none' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: '#0f172a' }}>{row.label}</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{row.desc}</div>
            </div>
            <div style={{ display: 'flex', gap: 24, paddingRight: 4 }}>
              <div style={{ width: 40, display: 'flex', justifyContent: 'center' }}>
                <Toggle checked={row.mail} onChange={row.setMail} />
              </div>
              <div style={{ width: 40, display: 'flex', justifyContent: 'center' }}>
                <Toggle checked={row.push} onChange={pushReady ? row.setPush : undefined} color="#1D9E75"
                  style={{ opacity: pushReady ? 1 : 0.35, cursor: pushReady ? 'pointer' : 'not-allowed' }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Email input */}
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 10, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 5 }}>CORREO PARA ALERTAS</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="tu@correo.com"
          style={{ width: '100%', background: '#ffffff', border: '1px solid #e2e8f0', color: '#0f172a', fontSize: 13, padding: '9px 12px', borderRadius: 7, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}
        />
      </div>

      <button
        onClick={handleSave}
        disabled={saving || !email.trim()}
        style={{ padding: '11px 28px', borderRadius: 7, border: 'none', background: saved ? '#10b981' : '#1D9E75', color: '#fff', fontSize: 13, fontWeight: 700, cursor: saving ? 'wait' : 'pointer', fontFamily: 'inherit' }}
      >
        {saved ? '✅ Guardado' : saving ? 'Guardando...' : 'Guardar preferencias'}
      </button>
    </div>
  )
}

function Toggle({ checked, onChange, color = '#f59e0b', style: extraStyle = {} }) {
  return (
    <div
      onClick={() => onChange && onChange(!checked)}
      style={{ width: 40, height: 22, borderRadius: 11, background: checked ? color : '#e2e8f0', cursor: onChange ? 'pointer' : 'not-allowed', position: 'relative', flexShrink: 0, transition: 'background .2s', ...extraStyle }}
    >
      <div style={{ position: 'absolute', top: 3, left: checked ? 20 : 3, width: 16, height: 16, borderRadius: '50%', background: checked ? '#fff' : '#94a3b8', transition: 'left .2s' }} />
    </div>
  )
}

function CompanyModal({ data, onSave, onClose }) {
  const [name, setName]   = useState(data?.name || '')
  const [slug, setSlug]   = useState(data?.slug || '')
  const [bdayMsg, setBdayMsg] = useState(data?.birthday_message || '')
  const [autoSlug, setAutoSlug] = useState(!data?.slug)
  const valid = name.trim() && slug.trim()
  function handleNameChange(val) { setName(val); if (autoSlug) setSlug(slugify(val)) }
  function handleSave() { const d = { ...(data || {}), name: name.trim(), slug: slug.trim(), birthday_message: bdayMsg.trim() || null }; onSave(d) }
  const iS = { width:'100%',background:'#ffffff',border:'1px solid #e2e8f0',color:'#0f172a',fontSize:12,padding:'8px 10px',borderRadius:6,outline:'none',fontFamily:'inherit' }
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 22, width: '100%', maxWidth: 420 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>{data ? 'Editar Empresa' : 'Nueva Empresa'}</h3>
        <div style={{ marginBottom: 10 }}><label style={{ fontSize:10,fontWeight:600,color:'#64748b',display:'block',marginBottom:4 }}>Nombre de la empresa</label><input value={name} onChange={e => handleNameChange(e.target.value)} style={iS} placeholder='Ej: Mi Empresa SA de CV' /></div>
        <div style={{ marginBottom: 14 }}><label style={{ fontSize:10,fontWeight:600,color:'#64748b',display:'block',marginBottom:4 }}>Slug (identificador único)</label><input value={slug} onChange={e => { setSlug(slugify(e.target.value)); setAutoSlug(false) }} style={{ ...iS, fontFamily:"'JetBrains Mono'" }} placeholder='mi-empresa' /><div style={{ fontSize:10,color:'#94a3b8',marginTop:4 }}>Solo letras, números y guiones.</div></div>
        <div style={{ marginBottom: 18, borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
          <label style={{ fontSize:10,fontWeight:600,color:'#64748b',display:'block',marginBottom:4 }}>🎂 Mensaje de cumpleaños (opcional)</label>
          <textarea value={bdayMsg} onChange={e => setBdayMsg(e.target.value)} rows={3}
            placeholder={'¡Feliz cumpleaños, {nombre}! 🎂 Que tengas un día increíble. De parte de todo el equipo.'}
            style={{ ...iS, resize: 'vertical', lineHeight: 1.5 }} />
          <div style={{ fontSize:10,color:'#94a3b8',marginTop:4 }}>Usa <code style={{ background:'#f1f5f9',padding:'1px 4px',borderRadius:3 }}>{'{nombre}'}</code> para incluir el nombre del empleado. Si lo dejas vacío se usa un mensaje genérico.</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button disabled={!valid} onClick={handleSave} style={{ flex:1,padding:'10px 16px',borderRadius:7,border:'none',background:valid?'#3b82f6':'#e2e8f0',color:'#fff',fontSize:12,fontWeight:600,cursor:valid?'pointer':'not-allowed',fontFamily:'inherit' }}>Guardar</button>
          <button onClick={onClose} style={{ padding:'10px 16px',borderRadius:7,border:'1px solid #e2e8f0',background:'transparent',color:'#64748b',fontSize:12,cursor:'pointer',fontFamily:'inherit' }}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}

// ─── Sales Import Modal ────────────────────────────────────────────────────────
function SalesImportModal({ sites, allEmps, att, schedules, adminUser, employeeSiteAssignments, onClose, onDone, setToast }) {
  const [step, setStep] = useState('choose') // choose | download | upload | preview
  const [rows, setRows] = useState([])
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const [dlSite, setDlSite] = useState('')
  const [dlFrom, setDlFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 7)
    return d.toLocaleDateString('en-CA', { timeZone: 'America/Cancun' })
  })
  const [dlTo, setDlTo] = useState(() => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Cancun' }))
  const fileRef = useRef(null)
  const sS = { padding: '6px 10px', borderRadius: 6, border: '1px solid #e2e8f0', fontSize: 11, fontFamily: 'inherit', outline: 'none', background: '#fff', color: '#0f172a', width: '100%' }
  const lblS = { fontSize: 9, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4, display: 'block' }

  function downloadTemplate() {
    // Build all dates in range
    const dates = []
    const from = new Date(dlFrom + 'T12:00:00')
    const to = new Date(dlTo + 'T12:00:00')
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      dates.push(d.toLocaleDateString('en-CA'))
    }
    // Get relevant employees
    let relevantEmps = allEmps
    if (dlSite) {
      const siteEmpIds = new Set((employeeSiteAssignments || []).filter(a => a.site_id === dlSite).map(a => a.employee_id))
      relevantEmps = allEmps.filter(e => siteEmpIds.has(e.id))
    }
    // Build rows: for each emp × date, check if attendance exists
    const headers = ['Fecha', 'Empleado', 'Email', 'Sucursal', 'Ventas actuales', 'Ventas corregidas']
    const csvRows = []
    for (const emp of relevantEmps) {
      for (const date of dates) {
        const record = att.find(r => r.employee_id === emp.id && r.date === date)
        const siteName = dlSite ? sites.find(s => s.id === dlSite)?.name || '' : (record ? sites.find(s => s.id === record.site_id)?.name || '' : '')
        const siteId = dlSite || record?.site_id || ''
        // Find site from assignments if no record
        const assignedSite = !siteName && !dlSite ? sites.find(s => (employeeSiteAssignments || []).some(a => a.employee_id === emp.id && a.site_id === s.id))?.name || '' : siteName
        csvRows.push([
          date,
          emp.name,
          emp.email,
          assignedSite,
          record?.sales_amount || 0,
          '', // Leave blank for user to fill
        ])
      }
    }
    const csv = [headers, ...csvRows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `plantilla-ventas-${dlFrom}-a-${dlTo}.csv`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setToast(`Plantilla descargada: ${csvRows.length} filas`)
  }

  function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/)
    if (lines.length < 2) { setErr('El archivo debe tener encabezado y al menos una fila.'); return }
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase())
    const dateIdx = headers.findIndex(h => h.includes('fecha') || h.includes('date'))
    const empIdx = headers.findIndex(h => h.includes('email') || h.includes('empleado') || h.includes('nombre'))
    // Prefer "corregidas" column, fall back to "ventas"
    let salesIdx = headers.findIndex(h => h.includes('corregida'))
    if (salesIdx < 0) salesIdx = headers.findIndex(h => h.includes('venta') || h.includes('sale') || h.includes('monto'))
    if (dateIdx < 0 || empIdx < 0 || salesIdx < 0) {
      setErr('El CSV debe tener columnas: Fecha, Empleado/Email, Ventas corregidas')
      return
    }
    const parsed = []
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.replace(/^"|"$/g, '').trim())
      if (!cols[dateIdx] || !cols[empIdx]) continue
      const rawSales = cols[salesIdx]
      if (!rawSales || rawSales === '0' || rawSales === '') continue // Skip empty corrections
      let date = cols[dateIdx]
      if (/^\d{2}\/\d{2}\/\d{4}$/.test(date)) {
        const [d, m, y] = date.split('/')
        date = `${y}-${m}-${d}`
      }
      const empQuery = cols[empIdx].toLowerCase()
      const emp = allEmps.find(e => e.email?.toLowerCase() === empQuery || e.name?.toLowerCase() === empQuery)
      const amount = parseFloat(rawSales.replace(/[$,\s]/g, '')) || 0
      // Find existing attendance record
      const existing = emp ? att.find(r => r.employee_id === emp.id && r.date === date) : null
      // Determine site
      let siteId = existing?.site_id
      if (!siteId && emp) {
        const assignment = (employeeSiteAssignments || []).find(a => a.employee_id === emp.id)
        siteId = assignment?.site_id
      }
      parsed.push({
        date, empQuery, emp, amount,
        existing, siteId,
        action: existing ? 'update' : 'create',
        valid: !!emp && !!date && amount > 0 && (existing || siteId),
        reason: !emp ? 'Empleado no encontrado' : !date ? 'Fecha inválida' : amount <= 0 ? 'Monto inválido' : (!existing && !siteId) ? 'Sin sucursal asignada' : '',
      })
    }
    setRows(parsed)
    setErr('')
    setStep('preview')
  }

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => parseCSV(ev.target.result)
    reader.readAsText(file, 'utf-8')
  }

  async function handleSave() {
    const valid = rows.filter(r => r.valid)
    if (!valid.length) return
    setSaving(true)
    let updated = 0, created = 0, errors = 0
    for (const row of valid) {
      if (row.action === 'update' && row.existing) {
        const originalSales = row.existing.sales_original != null ? row.existing.sales_original : row.existing.sales_amount
        const { error } = await supabase.from('attendance').update({
          sales_amount: row.amount,
          sales_original: originalSales,
          sales_corrected_by: adminUser?.id,
          sales_corrected_at: new Date().toISOString(),
          sales_correction_note: 'Importación CSV',
        }).eq('id', row.existing.id)
        if (error) errors++; else updated++
      } else if (row.action === 'create') {
        const companyId = sites.find(s => s.id === row.siteId)?.company_id || adminUser?.company_id
        const { error } = await supabase.from('attendance').insert({
          employee_id: row.emp.id,
          site_id: row.siteId,
          company_id: companyId,
          date: row.date,
          status: 'absent',
          sales_amount: row.amount,
          sales_corrected_by: adminUser?.id,
          sales_corrected_at: new Date().toISOString(),
          sales_correction_note: 'Venta sin asistencia — importación CSV',
        })
        if (error) errors++; else created++
      }
    }
    setSaving(false)
    const parts = []
    if (updated) parts.push(`${updated} actualizadas`)
    if (created) parts.push(`${created} nuevas creadas`)
    if (errors) parts.push(`${errors} errores`)
    setToast(parts.join(', '))
    onDone()
  }

  const validRows = rows.filter(r => r.valid)
  const invalidRows = rows.filter(r => !r.valid)
  const updateCount = validRows.filter(r => r.action === 'update').length
  const createCount = validRows.filter(r => r.action === 'create').length

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#ffffff', borderRadius: 14, padding: 0, width: '100%', maxWidth: 580, maxHeight: '90vh', overflow: 'auto' }}>
        {/* Header */}
        <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>💰 Gestión de ventas</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 18, cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ padding: '16px 24px 20px' }}>

          {/* Step: Choose */}
          {step === 'choose' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4, lineHeight: 1.6 }}>
                Descarga una plantilla con los empleados y sus ventas actuales, corrige en Excel, y vuelve a subir.
                <br /><span style={{ color: '#f59e0b', fontWeight: 600 }}>Si un día no tiene registro de asistencia, se creará automáticamente al importar.</span>
              </div>
              <button onClick={() => setStep('download')}
                style={{ padding: '14px 16px', borderRadius: 10, border: '1.5px solid rgba(16,185,129,.3)', background: 'rgba(16,185,129,.06)', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 22 }}>⬇</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#10b981' }}>Descargar plantilla</div>
                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>CSV con empleados, fechas y ventas actuales</div>
                </div>
              </button>
              <button onClick={() => setStep('upload')}
                style={{ padding: '14px 16px', borderRadius: 10, border: '1.5px solid rgba(139,92,246,.3)', background: 'rgba(139,92,246,.06)', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 22 }}>⬆</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#a78bfa' }}>Subir ventas corregidas</div>
                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>Importar CSV con correcciones o nuevas ventas</div>
                </div>
              </button>
            </div>
          )}

          {/* Step: Download config */}
          {step === 'download' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <button onClick={() => setStep('choose')} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: '#3b82f6', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>← Volver</button>
              <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>
                Configura el rango de fechas y sucursal para la plantilla. Se incluirán todos los empleados asignados con sus ventas actuales.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <span style={lblS}>Desde</span>
                  <input type="date" value={dlFrom} onChange={e => setDlFrom(e.target.value)} style={sS} />
                </div>
                <div>
                  <span style={lblS}>Hasta</span>
                  <input type="date" value={dlTo} onChange={e => setDlTo(e.target.value)} style={sS} />
                </div>
              </div>
              <div>
                <span style={lblS}>Sucursal</span>
                <select value={dlSite} onChange={e => setDlSite(e.target.value)} style={sS}>
                  <option value="">Todas</option>
                  {sites.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <button onClick={downloadTemplate}
                style={{ padding: '11px', borderRadius: 9, border: 'none', background: '#10b981', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                ⬇ Descargar plantilla CSV
              </button>
              <div style={{ fontSize: 10, color: '#94a3b8', lineHeight: 1.5, background: '#f8fafc', borderRadius: 8, padding: 10 }}>
                <strong>Instrucciones:</strong><br />
                1. Abre el CSV en Excel<br />
                2. La columna "Ventas corregidas" está vacía — llena solo las que quieras cambiar<br />
                3. Si dejas vacío, no se modifica<br />
                4. Puedes agregar filas para días sin registro de asistencia<br />
                5. Guarda como CSV y súbelo con "Subir ventas corregidas"
              </div>
            </div>
          )}

          {/* Step: Upload */}
          {step === 'upload' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button onClick={() => setStep('choose')} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: '#3b82f6', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>← Volver</button>
              <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.6 }}>
                Sube un CSV con columnas: <strong style={{ color: '#0f172a' }}>Fecha</strong>, <strong style={{ color: '#0f172a' }}>Email</strong> (o Empleado), <strong style={{ color: '#0f172a' }}>Ventas corregidas</strong>.<br />
                Solo se procesan filas con monto {'>'} 0 en la columna de corrección.
              </div>
              <input ref={fileRef} type="file" accept=".csv,.txt" style={{ display: 'none' }} onChange={handleFile} />
              <button onClick={() => fileRef.current?.click()}
                style={{ padding: '16px', borderRadius: 10, border: '1.5px dashed rgba(139,92,246,.4)', background: 'rgba(139,92,246,.04)', color: '#a78bfa', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center' }}>
                📂 Seleccionar archivo CSV
              </button>
              {err && <div style={{ fontSize: 11, color: '#ef4444' }}>{err}</div>}
            </div>
          )}

          {/* Step: Preview */}
          {step === 'preview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <button onClick={() => { setStep('upload'); setRows([]) }} style={{ alignSelf: 'flex-start', background: 'none', border: 'none', color: '#3b82f6', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>← Volver</button>

              {/* Summary badges */}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {updateCount > 0 && <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 12, background: 'rgba(59,130,246,.1)', color: '#3b82f6', fontWeight: 600 }}>✏️ {updateCount} correcciones</span>}
                {createCount > 0 && <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 12, background: 'rgba(16,185,129,.1)', color: '#10b981', fontWeight: 600 }}>+ {createCount} nuevos registros</span>}
                {invalidRows.length > 0 && <span style={{ fontSize: 10, padding: '3px 10px', borderRadius: 12, background: 'rgba(239,68,68,.1)', color: '#ef4444', fontWeight: 600 }}>✗ {invalidRows.length} con error</span>}
              </div>

              <div style={{ background: '#fff', borderRadius: 8, overflow: 'hidden', maxHeight: 280, overflowY: 'auto', border: '1px solid #e2e8f0' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                  <thead><tr>{['Fecha', 'Empleado', 'Venta', 'Acción', ''].map(h => <th key={h} style={{ textAlign: 'left', padding: '6px 10px', color: '#94a3b8', fontWeight: 600, borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {rows.slice(0, 50).map((r, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid rgba(226,232,240,.3)', background: !r.valid ? 'rgba(239,68,68,.03)' : r.action === 'create' ? 'rgba(16,185,129,.03)' : 'transparent' }}>
                        <td style={{ padding: '5px 10px', color: '#64748b' }}>{r.date}</td>
                        <td style={{ padding: '5px 10px', color: r.emp ? '#0f172a' : '#ef4444' }}>{r.emp ? r.emp.name : `¿${r.empQuery}?`}</td>
                        <td style={{ padding: '5px 10px', color: '#10b981', fontFamily: "'JetBrains Mono'" }}>${Number(r.amount).toLocaleString('es-MX')}</td>
                        <td style={{ padding: '5px 10px' }}>
                          {r.valid ? (
                            r.action === 'update'
                              ? <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'rgba(59,130,246,.1)', color: '#3b82f6', fontWeight: 600 }}>Corregir</span>
                              : <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'rgba(16,185,129,.1)', color: '#10b981', fontWeight: 600 }}>Crear nuevo</span>
                          ) : (
                            <span style={{ fontSize: 9, color: '#ef4444' }}>{r.reason}</span>
                          )}
                        </td>
                        <td style={{ padding: '5px 10px' }}>
                          {r.valid ? <span style={{ color: '#10b981' }}>✓</span> : <span style={{ color: '#ef4444' }}>✗</span>}
                        </td>
                      </tr>
                    ))}
                    {rows.length > 50 && <tr><td colSpan={5} style={{ padding: '6px 10px', color: '#94a3b8', fontSize: 10 }}>...y {rows.length - 50} filas más</td></tr>}
                  </tbody>
                </table>
              </div>

              {createCount > 0 && (
                <div style={{ fontSize: 10, color: '#f59e0b', background: 'rgba(245,158,11,.06)', border: '1px solid rgba(245,158,11,.2)', borderRadius: 8, padding: '8px 12px', lineHeight: 1.5 }}>
                  ⚠️ Se crearán <strong>{createCount}</strong> registros nuevos de venta sin asistencia. Se marcarán como corregidos por <strong>{adminUser?.name || adminUser?.email}</strong>.
                </div>
              )}

              <button onClick={handleSave} disabled={validRows.length === 0 || saving}
                style={{ padding: '12px', borderRadius: 9, border: 'none', background: validRows.length > 0 && !saving ? '#a78bfa' : '#e2e8f0', color: validRows.length > 0 && !saving ? '#fff' : '#94a3b8', fontSize: 13, fontWeight: 700, cursor: validRows.length > 0 && !saving ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
                {saving ? 'Procesando...' : `Aplicar ${validRows.length} cambios`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Feedback Modal ───────────────────────────────────────────────────────────
function FeedbackButton({ open, onClose, adminUser }) {
  const [type, setType] = useState('idea')
  const [msg, setMsg] = useState('')
  const [status, setStatus] = useState('idle')
  const [screenshot, setScreenshot] = useState(null) // { name, base64, preview }
  const fileRef = useRef(null)

  function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setScreenshot({ name: file.name, base64: ev.target.result.split(',')[1], preview: ev.target.result })
    reader.readAsDataURL(file)
  }

  async function send() {
    if (!msg.trim()) return
    setStatus('loading')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}) },
        body: JSON.stringify({
          type, message: msg,
          userName: adminUser?.name, userEmail: adminUser?.email,
          companyName: adminUser?.companies?.name,
          page: typeof window !== 'undefined' ? window.location.pathname : '/admin',
          screenshot: screenshot?.base64 || null,
          screenshotName: screenshot?.name || null,
        }),
      })
      if (res.ok) { setStatus('done'); setMsg(''); setScreenshot(null) }
      else setStatus('error')
    } catch { setStatus('error') }
  }

  function close() { onClose(); setStatus('idle'); setMsg(''); setScreenshot(null) }

  const types = [
    { id: 'error', emoji: '🐛', label: 'Reportar error' },
    { id: 'idea',  emoji: '💡', label: 'Tengo una idea' },
    { id: 'other', emoji: '💬', label: 'Comentario' },
  ]

  if (!open) return null
  return (
    <div onClick={close} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.65)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 1000, padding: '0 0 24px' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '24px 20px', width: '100%', maxWidth: 440 }}>
        {status === 'done' ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🙌</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#10b981', marginBottom: 6 }}>¡Gracias!</div>
            <div style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>Tu mensaje nos ayuda a mejorar Worktic.</div>
            <button onClick={close} style={{ padding: '10px 28px', borderRadius: 9, border: 'none', background: '#10b981', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Cerrar</button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>💬 Cuéntanos</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Tu opinión hace que Worktic mejore</div>
              </div>
              <button onClick={close} style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 6, color: '#64748b', fontSize: 18, cursor: 'pointer', padding: '2px 10px', lineHeight: 1 }}>×</button>
            </div>

            {/* Type selector */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              {types.map(t => (
                <button key={t.id} onClick={() => setType(t.id)}
                  style={{ flex: 1, padding: '9px 6px', borderRadius: 9, border: `1.5px solid ${type === t.id ? '#10b981' : '#e2e8f0'}`, background: type === t.id ? 'rgba(16,185,129,.1)' : '#ffffff', color: type === t.id ? '#10b981' : '#64748b', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center', lineHeight: 1.4 }}>
                  <div style={{ fontSize: 18 }}>{t.emoji}</div>
                  <div>{t.label}</div>
                </button>
              ))}
            </div>

            <textarea
              value={msg} onChange={e => setMsg(e.target.value)}
              placeholder={type === 'error' ? '¿Qué pasó? ¿Qué esperabas que pasara?' : type === 'idea' ? '¿Qué te gustaría que tuviera Worktic?' : '¿Algo que quieras decirnos?'}
              rows={4}
              style={{ width: '100%', background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 9, color: '#0f172a', fontSize: 13, padding: '11px 13px', resize: 'none', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginBottom: 10 }}
            />

            {/* Screenshot attachment */}
            <input ref={fileRef} type='file' accept='image/*' style={{ display: 'none' }} onChange={handleFile} />
            {screenshot ? (
              <div style={{ marginBottom: 12, position: 'relative' }}>
                <img src={screenshot.preview} alt='captura' style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 8, border: '1px solid #e2e8f0' }} />
                <button onClick={() => { setScreenshot(null); if (fileRef.current) fileRef.current.value = '' }}
                  style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,.7)', border: 'none', borderRadius: '50%', color: '#fff', width: 24, height: 24, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>×</button>
                <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4 }}>{screenshot.name}</div>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()}
                style={{ width: '100%', marginBottom: 10, padding: '8px', borderRadius: 8, border: '1px dashed #e2e8f0', background: 'transparent', color: '#94a3b8', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                📎 Adjuntar captura de pantalla
              </button>
            )}

            {status === 'error' && <div style={{ fontSize: 11, color: '#ef4444', marginBottom: 8 }}>Error al enviar. Intenta de nuevo.</div>}

            <button onClick={send} disabled={!msg.trim() || status === 'loading'}
              style={{ width: '100%', padding: '12px', borderRadius: 9, border: 'none', background: !msg.trim() || status === 'loading' ? '#e2e8f0' : '#10b981', color: !msg.trim() || status === 'loading' ? '#94a3b8' : '#fff', fontSize: 13, fontWeight: 700, cursor: !msg.trim() || status === 'loading' ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'background .2s' }}>
              {status === 'loading' ? 'Enviando...' : 'Enviar →'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Competitions Panel ───────────────────────────────────────────────────────
function CompetitionsPanel({ competitions, compSites, sites, allEmps, att, adminUser, isSuperAdmin, onEdit, onRefresh }) {
  const [selComp, setSelComp] = useState(null)
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Cancun' })

  function getCompSites(compId) {
    return compSites.filter(cs => cs.competition_id === compId).map(cs => sites.find(s => s.id === cs.site_id)).filter(Boolean)
  }

  function getDateRange(comp) {
    if (comp.type === 'auto_week') {
      const d = new Date(); const day = d.getDay()
      const mon = new Date(d); mon.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
      const toS = x => x.toLocaleDateString('en-CA')
      return { start: toS(mon), end: toS(sun) }
    }
    if (comp.type === 'auto_month') return { start: today.slice(0,7) + '-01', end: today }
    return { start: comp.start_date || today, end: comp.end_date || today }
  }

  function computeRanking(comp) {
    const siteIds = new Set(compSites.filter(cs => cs.competition_id === comp.id).map(cs => cs.site_id))
    const { start, end } = getDateRange(comp)
    const relevant = att.filter(r => siteIds.has(r.site_id) && r.date >= start && r.date <= end)
    const scores = {}
    relevant.forEach(r => {
      if (!scores[r.employee_id]) scores[r.employee_id] = 0
      if (comp.metric === 'sales') scores[r.employee_id] += parseFloat(r.sales_amount) || 0
      else if (comp.metric === 'attendance') scores[r.employee_id] += 1
      else if (comp.metric === 'punctuality') scores[r.employee_id] += r.status === 'on_time' ? 1 : 0
      else scores[r.employee_id] += parseFloat(r.sales_amount) || 0
    })
    return Object.entries(scores).filter(([, s]) => s > 0).sort((a, b) => b[1] - a[1]).map(([empId, score], i) => ({
      rank: i + 1, emp: allEmps.find(e => e.id === empId), score
    })).filter(r => r.emp)
  }

  const typeLabel = { auto_week: '📅 Sem. automática', auto_month: '📆 Mes automático', custom: '⚙️ Personalizada' }
  const metricLabel = { sales: 'Ventas', attendance: 'Asistencia', punctuality: 'Puntualidad', combined: 'Combinado' }
  const metricFmt = (metric, score) => {
    if (metric === 'sales') return '$' + Number(score).toLocaleString('es-MX')
    return score + (metric === 'attendance' ? ' días' : metric === 'punctuality' ? ' puntuales' : ' pts')
  }
  const rankIcon = r => r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : `#${r}`

  if (competitions.length === 0) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 13, background: '#ffffff', borderRadius: 10, border: '1px solid #e2e8f0' }}>
      No hay competencias. Crea una con el botón de arriba.
    </div>
  )

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14, marginBottom: selComp ? 16 : 0 }}>
        {competitions.map(comp => {
          const cSites = getCompSites(comp.id)
          const { start, end } = getDateRange(comp)
          const isActive = comp.active && start <= today && end >= today
          return (
            <div key={comp.id}
              onClick={() => setSelComp(selComp?.id === comp.id ? null : comp)}
              style={{ background: '#ffffff', border: `2px solid ${selComp?.id === comp.id ? '#f59e0b' : isActive ? 'rgba(245,158,11,.3)' : '#e2e8f0'}`, borderRadius: 12, padding: 16, cursor: 'pointer', transition: 'border-color .2s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{comp.name}</div>
                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{typeLabel[comp.type] || comp.type}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {isActive && <span style={{ fontSize: 9, fontWeight: 700, color: '#10b981', background: 'rgba(16,185,129,.12)', border: '1px solid rgba(16,185,129,.3)', borderRadius: 4, padding: '2px 7px' }}>ACTIVA</span>}
                  {!comp.active && <span style={{ fontSize: 9, color: '#94a3b8', background: 'rgba(74,85,104,.1)', border: '1px solid #e2e8f0', borderRadius: 4, padding: '2px 7px' }}>PAUSADA</span>}
                  <button onClick={e => { e.stopPropagation(); onEdit(comp) }}
                    style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: 5, color: '#64748b', fontSize: 10, padding: '2px 8px', cursor: 'pointer', fontFamily: 'inherit' }}>Editar</button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                <span style={{ fontSize: 10, color: '#8b5cf6', background: 'rgba(139,92,246,.1)', borderRadius: 4, padding: '2px 7px' }}>📊 {metricLabel[comp.metric]}</span>
                {cSites.map(s => <span key={s.id} style={{ fontSize: 10, color: '#3b82f6', background: 'rgba(59,130,246,.1)', borderRadius: 4, padding: '2px 7px' }}>{s.name}</span>)}
              </div>
              {comp.type === 'custom' && comp.start_date && (
                <div style={{ fontSize: 10, color: '#94a3b8' }}>{comp.start_date} → {comp.end_date || 'sin fin'}</div>
              )}
              {comp.prize_text && <div style={{ fontSize: 10, color: '#f59e0b', marginTop: 4 }}>🎁 {comp.prize_text}</div>}
            </div>
          )
        })}
      </div>

      {selComp && (() => {
        const ranking = computeRanking(selComp)
        return (
          <div style={{ background: '#ffffff', border: '1px solid rgba(245,158,11,.3)', borderRadius: 12, padding: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>🏆 Ranking — {selComp.name}</div>
            <div style={{ fontSize: 11, color: '#64748b', marginBottom: 16 }}>{metricLabel[selComp.metric]} · {getDateRange(selComp).start} → {getDateRange(selComp).end}</div>
            {ranking.length === 0 ? (
              <div style={{ fontSize: 12, color: '#94a3b8', padding: '20px 0', textAlign: 'center' }}>Sin datos aún para este período.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {ranking.slice(0, 3).map(({ rank, emp, score }) => {
                  const maxScore = ranking[0]?.score || 1
                  const pct = Math.round(score / maxScore * 100)
                  return (
                    <div key={emp.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: rank <= 3 ? 'rgba(245,158,11,.06)' : 'rgba(226,232,240,.3)', borderRadius: 8, border: rank === 1 ? '1px solid rgba(245,158,11,.3)' : '1px solid transparent' }}>
                      <div style={{ fontSize: rank <= 3 ? 20 : 13, fontWeight: 700, minWidth: 28, textAlign: 'center', color: '#0f172a' }}>{rankIcon(rank)}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{emp.name}</div>
                        <div style={{ marginTop: 4, height: 3, background: 'rgba(226,232,240,.8)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: pct + '%', background: rank === 1 ? '#f59e0b' : '#3b82f6', borderRadius: 2 }} />
                        </div>
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "'JetBrains Mono'", color: rank === 1 ? '#f59e0b' : '#0f172a' }}>{metricFmt(selComp.metric, score)}</div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })()}
    </div>
  )
}

// ─── Competition Modal ────────────────────────────────────────────────────────
function CompetitionModal({ data, sites, allEmps, adminUser, permittedSiteIds, onSave, onDelete, onClose }) {
  const isNew = !data?.id
  const [name, setName] = useState(data?.name || '')
  const [type, setType] = useState(data?.type || 'auto_week')
  const [metric, setMetric] = useState(data?.metric || 'sales')
  const [prize, setPrize] = useState(data?.prize_text || '')
  const [startDate, setStartDate] = useState(data?.start_date || '')
  const [endDate, setEndDate] = useState(data?.end_date || '')
  const [active, setActive] = useState(data?.active !== false)
  const [minSales, setMinSales] = useState(data?.min_sales != null ? String(data.min_sales) : '')
  const [selSiteIds, setSelSiteIds] = useState(data ? [] : [])
  const [err, setErr] = useState('')

  useEffect(() => {
    if (data?.id) {
      // Will be loaded from compSites prop if passed, for now default to empty
    }
  }, [])

  function toggleSite(siteId) {
    setSelSiteIds(prev => prev.includes(siteId) ? prev.filter(id => id !== siteId) : [...prev, siteId])
  }

  async function handleSave() {
    if (!name.trim()) { setErr('El nombre es obligatorio'); return }
    if (selSiteIds.length === 0) { setErr('Selecciona al menos una sucursal'); return }
    if (type === 'custom' && !startDate) { setErr('Indica la fecha de inicio'); return }
    const formData = { name: name.trim(), type, metric, prize_text: prize || null, active, min_sales: (type === 'auto_yesterday' && minSales !== '') ? (parseFloat(minSales) || null) : null, ...(data?.id ? { id: data.id } : {}), ...(type === 'custom' ? { start_date: startDate, end_date: endDate || null } : { start_date: null, end_date: null }) }
    await onSave(formData, selSiteIds)
  }

  const allowedSites = sites.filter(s => permittedSiteIds.includes(s.id))

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 400, padding: '0 16px' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 24, width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto', fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 18 }}>{isNew ? 'Nueva Competencia' : 'Editar Competencia'}</div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.5px' }}>Nombre</div>
          <input value={name} onChange={e => { setName(e.target.value); setErr('') }}
            placeholder='Ej: Vendedor del Mes Marzo' style={{ width: '100%', background: '#ffffff', border: '1px solid #e2e8f0', color: '#0f172a', fontSize: 13, padding: '9px 12px', borderRadius: 8, fontFamily: 'inherit', boxSizing: 'border-box' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.5px' }}>Tipo</div>
            <select value={type} onChange={e => setType(e.target.value)} style={{ width: '100%', background: '#ffffff', border: '1px solid #e2e8f0', color: '#0f172a', fontSize: 13, padding: '9px 8px', borderRadius: 8, fontFamily: 'inherit' }}>
              <option value='auto_week'>Semana (auto-reset)</option>
              <option value='auto_month'>Mes (auto-reset)</option>
              <option value='auto_yesterday'>Mejor de ayer</option>
              <option value='custom'>Personalizada (fechas)</option>
            </select>
          </div>
          <div>
            <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.5px' }}>Métrica</div>
            <select value={metric} onChange={e => setMetric(e.target.value)} style={{ width: '100%', background: '#ffffff', border: '1px solid #e2e8f0', color: '#0f172a', fontSize: 13, padding: '9px 8px', borderRadius: 8, fontFamily: 'inherit' }}>
              <option value='sales'>Ventas totales</option>
              <option value='attendance'>Días trabajados</option>
              <option value='punctuality'>Días puntuales</option>
            </select>
          </div>
        </div>

        {type === 'auto_yesterday' && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.25)', borderRadius: 8, padding: '10px 12px', marginBottom: 10, fontSize: 11, color: '#92400e' }}>
              Al hacer check-in, los empleados verán quién fue el <b>mejor vendedor de ayer</b> y la <b>mejor tienda de ayer</b> entre las sucursales participantes.
            </div>
            <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.5px' }}>Venta mínima para aparecer (opcional)</div>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#94a3b8', pointerEvents: 'none' }}>$</span>
              <input type='number' min='0' value={minSales} onChange={e => setMinSales(e.target.value)}
                placeholder='Ej: 500 — deja vacío para incluir todos'
                style={{ width: '100%', background: '#ffffff', border: '1px solid #e2e8f0', color: '#0f172a', fontSize: 13, padding: '9px 12px 9px 22px', borderRadius: 8, fontFamily: 'inherit', boxSizing: 'border-box' }} />
            </div>
            {minSales !== '' && parseFloat(minSales) > 0 && (
              <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>Solo aparecerán vendedores con al menos ${Number(parseFloat(minSales)).toLocaleString('es-MX')} en ventas el día anterior.</div>
            )}
          </div>
        )}

        {type === 'custom' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            {[['Inicio', startDate, setStartDate], ['Fin (opcional)', endDate, setEndDate]].map(([lbl, val, set]) => (
              <div key={lbl}>
                <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.5px' }}>{lbl}</div>
                <input type='date' value={val} onChange={e => set(e.target.value)} style={{ width: '100%', background: '#ffffff', border: '1px solid #e2e8f0', color: '#0f172a', fontSize: 13, padding: '9px 8px', borderRadius: 8, fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
            ))}
          </div>
        )}

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.5px' }}>Sucursales participantes</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {allowedSites.map(s => (
              <button key={s.id} onClick={() => toggleSite(s.id)}
                style={{ padding: '5px 12px', borderRadius: 7, border: `1px solid ${selSiteIds.includes(s.id) ? '#f59e0b' : '#e2e8f0'}`, background: selSiteIds.includes(s.id) ? 'rgba(245,158,11,.15)' : 'transparent', color: selSiteIds.includes(s.id) ? '#f59e0b' : '#64748b', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', fontWeight: selSiteIds.includes(s.id) ? 600 : 400, transition: 'all .15s' }}>
                {s.name}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.5px' }}>Premio (opcional)</div>
          <input value={prize} onChange={e => setPrize(e.target.value)}
            placeholder='Ej: Bono de $500, día libre, trofeo...' style={{ width: '100%', background: '#ffffff', border: '1px solid #e2e8f0', color: '#0f172a', fontSize: 13, padding: '9px 12px', borderRadius: 8, fontFamily: 'inherit', boxSizing: 'border-box' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <button onClick={() => setActive(a => !a)}
            style={{ width: 36, height: 20, borderRadius: 10, border: 'none', background: active ? '#10b981' : '#e2e8f0', cursor: 'pointer', position: 'relative', transition: 'background .2s', flexShrink: 0 }}>
            <div style={{ position: 'absolute', top: 2, left: active ? 18 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left .2s' }} />
          </button>
          <span style={{ fontSize: 12, color: '#64748b' }}>Competencia {active ? 'activa' : 'pausada'}</span>
        </div>

        {err && <div style={{ fontSize: 11, color: '#ef4444', marginBottom: 12, fontWeight: 600 }}>{err}</div>}

        <div style={{ display: 'flex', gap: 8 }}>
          {!isNew && <button onClick={() => onDelete(data.id)} style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid rgba(239,68,68,.3)', background: 'rgba(239,68,68,.08)', color: '#ef4444', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Eliminar</button>}
          <button onClick={onClose} style={{ flex: 1, padding: '9px', borderRadius: 8, border: '1px solid #e2e8f0', background: 'transparent', color: '#64748b', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
          <button onClick={handleSave} style={{ flex: 2, padding: '9px', borderRadius: 8, border: 'none', background: '#f59e0b', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Guardar</button>
        </div>
      </div>
    </div>
  )
}

// ─── Attendance Table with Sales Correction ─────────────────────────────────────
function AttendanceTable({ filteredAtt, allEmps, sites, adminUser, adminUsers, onEmpClick, onRefresh, setToast }) {
  const [editing, setEditing] = useState(null) // { id, sales_amount, note }
  const [saving, setSaving] = useState(false)
  const thS = { textAlign: 'left', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.6px', color: '#94a3b8', padding: '9px 12px', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }
  const tdS = { padding: '9px 12px', fontSize: 11, fontFamily: "'JetBrains Mono'" }
  async function saveCorrection() {
    if (!editing) return
    setSaving(true)
    const row = filteredAtt.find(r => r.id === editing.id)
    const originalSales = row.sales_original != null ? row.sales_original : row.sales_amount
    const { error } = await supabase.from('attendance').update({
      sales_amount: Number(editing.sales_amount) || 0,
      sales_original: originalSales,
      sales_corrected_by: adminUser.id,
      sales_corrected_at: new Date().toISOString(),
      sales_correction_note: editing.note || null,
    }).eq('id', editing.id)
    setSaving(false)
    if (error) { setToast('Error: ' + error.message); return }
    setToast('Venta corregida')
    setEditing(null)
    onRefresh()
  }
  const correctorName = (id) => {
    if (!id) return null
    const au = adminUsers?.find(a => a.id === id)
    return au?.name || au?.email || id.slice(0, 8)
  }
  return (
    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 780 }}>
          <thead><tr>
            {['Fecha','Empleado','Sucursal','Entrada','Salida','Horas','Ventas','Estado',''].map(h => (
              <th key={h} style={thS}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {filteredAtt.slice(0, 300).map(r => {
              const emp = allEmps.find(e => e.id === r.employee_id)
              const site = sites.find(s => s.id === r.site_id)
              const tz = site?.timezone || 'America/Cancun'
              const isEditing = editing?.id === r.id
              const wasCorrected = !!r.sales_corrected_by
              return (
                <tr key={r.id} style={{ borderBottom: '1px solid rgba(226,232,240,.3)', background: isEditing ? 'rgba(59,130,246,.04)' : 'transparent' }}>
                  <td style={tdS}>{fmtDate(r.date)}</td>
                  <td style={{ ...tdS, fontFamily: 'inherit' }}>
                    <button onClick={() => onEmpClick(emp)} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#3b82f6', textDecoration: 'underline', textDecorationColor: 'rgba(59,130,246,.3)' }}>{emp?.name || '?'}</span>
                    </button>
                  </td>
                  <td style={{ ...tdS, fontFamily: 'inherit', color: '#64748b' }}>{site?.name || '?'}</td>
                  <td style={tdS}>{fmtTime(r.check_in, tz)}</td>
                  <td style={tdS}>{fmtTime(r.check_out, tz)}</td>
                  <td style={tdS}>{fmtHours(r.hours_worked)}</td>
                  <td style={{ ...tdS, padding: '4px 8px', minWidth: 100 }}>
                    {isEditing ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          <span style={{ color: '#94a3b8', fontSize: 11 }}>$</span>
                          <input type="number" value={editing.sales_amount} onChange={e => setEditing({ ...editing, sales_amount: e.target.value })}
                            style={{ width: 80, padding: '3px 6px', borderRadius: 4, border: '1px solid #3b82f6', fontSize: 11, fontFamily: "'JetBrains Mono'", outline: 'none', background: '#fff' }}
                            autoFocus />
                        </div>
                        <input placeholder="Nota (opcional)" value={editing.note} onChange={e => setEditing({ ...editing, note: e.target.value })}
                          style={{ width: '100%', padding: '3px 6px', borderRadius: 4, border: '1px solid #e2e8f0', fontSize: 10, outline: 'none', fontFamily: 'inherit' }} />
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={saveCorrection} disabled={saving}
                            style={{ padding: '2px 8px', borderRadius: 4, border: 'none', background: '#3b82f6', color: '#fff', fontSize: 9, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                            {saving ? '...' : '✓ Guardar'}
                          </button>
                          <button onClick={() => setEditing(null)}
                            style={{ padding: '2px 8px', borderRadius: 4, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 9, cursor: 'pointer', fontFamily: 'inherit' }}>
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ color: r.sales_amount > 0 ? '#10b981' : '#94a3b8', cursor: 'pointer' }}
                          onClick={() => setEditing({ id: r.id, sales_amount: r.sales_amount || 0, note: r.sales_correction_note || '' })}
                          title="Click para corregir">
                          {r.sales_amount > 0 ? '$' + Number(r.sales_amount).toLocaleString('es-MX') : '–'}
                          {wasCorrected && <span style={{ marginLeft: 4, fontSize: 8, color: '#f59e0b' }} title={'Corregido por ' + correctorName(r.sales_corrected_by) + (r.sales_correction_note ? ': ' + r.sales_correction_note : '')}>✏️</span>}
                        </span>
                        {wasCorrected && r.sales_original != null && (
                          <span style={{ fontSize: 9, color: '#94a3b8' }} title={'Original: $' + Number(r.sales_original).toLocaleString('es-MX')}>
                            Antes: ${Number(r.sales_original).toLocaleString('es-MX')}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td style={{ ...tdS, fontFamily: 'inherit' }}>
                    <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600, color: stClr[r.status] || '#64748b', background: stBg[r.status] || 'rgba(136,146,168,.1)' }}>
                      {stLbl[r.status] || r.status || '–'}
                    </span>
                  </td>
                  <td style={{ ...tdS, fontFamily: 'inherit', padding: '4px 8px' }}>
                    {!isEditing && (
                      <button onClick={() => setEditing({ id: r.id, sales_amount: r.sales_amount || 0, note: r.sales_correction_note || '' })}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, opacity: 0.4, padding: 2 }}
                        title="Corregir venta">✏️</button>
                    )}
                  </td>
                </tr>
              )
            })}
            {filteredAtt.length === 0 && <tr><td colSpan={9} style={{ padding: 24, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>Sin registros con los filtros seleccionados</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── Export Modal ────────────────────────────────────────────────────────────────
const REPORT_TYPES = [
  { id: 'detail', label: 'Detalle', desc: 'Cada registro individual de asistencia' },
  { id: 'by_employee', label: 'Por empleado', desc: 'Resumen agrupado por empleado' },
  { id: 'by_site', label: 'Por sucursal', desc: 'Resumen agrupado por sucursal' },
  { id: 'by_period', label: 'Por período', desc: 'Resumen por día/semana/mes' },
  { id: 'payroll', label: 'Nómina', desc: 'Formato listo para nómina' },
]
const DETAIL_COLS = [
  { id: 'date', label: 'Fecha', default: true },
  { id: 'employee', label: 'Empleado', default: true },
  { id: 'email', label: 'Email', default: false },
  { id: 'role', label: 'Rol/Puesto', default: false },
  { id: 'site', label: 'Sucursal', default: true },
  { id: 'check_in', label: 'Entrada', default: true },
  { id: 'check_out', label: 'Salida', default: true },
  { id: 'hours', label: 'Horas trabajadas', default: true },
  { id: 'lunch', label: 'Comida (inicio/fin)', default: false },
  { id: 'break_time', label: 'Descanso (inicio/fin)', default: false },
  { id: 'sales', label: 'Ventas', default: true },
  { id: 'sales_original', label: 'Ventas originales', default: false },
  { id: 'sales_corrected', label: 'Corregido por', default: false },
  { id: 'sales_note', label: 'Nota de corrección', default: false },
  { id: 'status', label: 'Estado', default: true },
  { id: 'gps_distance', label: 'Distancia GPS (m)', default: false },
  { id: 'gps_coords', label: 'Coordenadas GPS', default: false },
]

function ExportModal({ att, allEmps, sites, schedules, goals, adminUsers, onClose, setToast }) {
  const [reportType, setReportType] = useState('detail')
  const [cols, setCols] = useState(() => DETAIL_COLS.filter(c => c.default).map(c => c.id))
  const [fSites, setFSites] = useState([])
  const [fEmps, setFEmps] = useState([])
  const [fStatuses, setFStatuses] = useState([])
  const [fFrom, setFFrom] = useState('')
  const [fTo, setFTo] = useState('')
  const [periodGroup, setPeriodGroup] = useState('day')
  const [savedConfigs, setSavedConfigs] = useState(() => {
    try { return JSON.parse(localStorage.getItem('worktic_export_configs') || '[]') } catch { return [] }
  })
  const [configName, setConfigName] = useState('')
  const [showSaveInput, setShowSaveInput] = useState(false)

  const toggleCol = (id) => setCols(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id])
  const toggleArr = (arr, setArr, val) => setArr(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val])

  const filtered = att.filter(r => {
    if (fSites.length && !fSites.includes(r.site_id)) return false
    if (fEmps.length && !fEmps.includes(r.employee_id)) return false
    if (fStatuses.length && !fStatuses.includes(r.status)) return false
    if (fFrom && r.date < fFrom) return false
    if (fTo && r.date > fTo) return false
    return true
  })

  function saveConfig() {
    if (!configName.trim()) return
    const config = { name: configName.trim(), reportType, cols, fSites, fEmps, fStatuses, fFrom, fTo, periodGroup, savedAt: new Date().toISOString() }
    const updated = [...savedConfigs.filter(c => c.name !== config.name), config]
    localStorage.setItem('worktic_export_configs', JSON.stringify(updated))
    setSavedConfigs(updated)
    setShowSaveInput(false)
    setConfigName('')
    setToast('Configuración guardada')
  }

  function loadConfig(config) {
    setReportType(config.reportType || 'detail')
    setCols(config.cols || DETAIL_COLS.filter(c => c.default).map(c => c.id))
    setFSites(config.fSites || [])
    setFEmps(config.fEmps || [])
    setFStatuses(config.fStatuses || [])
    setFFrom(config.fFrom || '')
    setFTo(config.fTo || '')
    setPeriodGroup(config.periodGroup || 'day')
  }

  function deleteConfig(name) {
    const updated = savedConfigs.filter(c => c.name !== name)
    localStorage.setItem('worktic_export_configs', JSON.stringify(updated))
    setSavedConfigs(updated)
  }

  function generateCSV() {
    let headers = []
    let rows = []
    const empMap = Object.fromEntries(allEmps.map(e => [e.id, e]))
    const siteMap = Object.fromEntries(sites.map(s => [s.id, s]))
    const adminMap = Object.fromEntries((adminUsers || []).map(a => [a.id, a]))
    const goalMap = Object.fromEntries((goals || []).map(g => [g.employee_id, g]))
    const tz = (siteId) => siteMap[siteId]?.timezone || 'America/Cancun'
    const fmtT = (ts, sid) => ts ? new Date(ts).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz(sid) }) : ''

    if (reportType === 'detail') {
      const colDefs = {
        date: { h: 'Fecha', v: r => r.date },
        employee: { h: 'Empleado', v: r => empMap[r.employee_id]?.name || '?' },
        email: { h: 'Email', v: r => empMap[r.employee_id]?.email || '' },
        role: { h: 'Rol', v: r => empMap[r.employee_id]?.role || '' },
        site: { h: 'Sucursal', v: r => siteMap[r.site_id]?.name || '?' },
        check_in: { h: 'Entrada', v: r => fmtT(r.check_in, r.site_id) },
        check_out: { h: 'Salida', v: r => fmtT(r.check_out, r.site_id) },
        hours: { h: 'Horas', v: r => r.hours_worked || '' },
        lunch: { h: 'Comida inicio', v: r => fmtT(r.lunch_start, r.site_id), h2: 'Comida fin', v2: r => fmtT(r.lunch_end, r.site_id) },
        break_time: { h: 'Descanso inicio', v: r => fmtT(r.break_start, r.site_id), h2: 'Descanso fin', v2: r => fmtT(r.break_end, r.site_id) },
        sales: { h: 'Ventas', v: r => r.sales_amount || 0 },
        sales_original: { h: 'Ventas originales', v: r => r.sales_original != null ? r.sales_original : '' },
        sales_corrected: { h: 'Corregido por', v: r => r.sales_corrected_by ? (adminMap[r.sales_corrected_by]?.name || adminMap[r.sales_corrected_by]?.email || '') : '' },
        sales_note: { h: 'Nota corrección', v: r => r.sales_correction_note || '' },
        status: { h: 'Estado', v: r => stLbl[r.status] || r.status || '' },
        gps_distance: { h: 'Distancia GPS (m)', v: r => r.gps_distance_m != null ? r.gps_distance_m : '' },
        gps_coords: { h: 'Latitud', v: r => r.gps_lat || '', h2: 'Longitud', v2: r => r.gps_lng || '' },
      }
      cols.forEach(c => {
        const d = colDefs[c]
        if (!d) return
        headers.push(d.h)
        if (d.h2) headers.push(d.h2)
      })
      rows = filtered.map(r => {
        const row = []
        cols.forEach(c => {
          const d = colDefs[c]
          if (!d) return
          row.push(d.v(r))
          if (d.v2) row.push(d.v2(r))
        })
        return row
      })
      // Totals row
      const salesIdx = headers.indexOf('Ventas')
      const hoursIdx = headers.indexOf('Horas')
      if (salesIdx >= 0 || hoursIdx >= 0) {
        const totals = headers.map(() => '')
        totals[0] = 'TOTALES'
        if (salesIdx >= 0) totals[salesIdx] = filtered.reduce((s, r) => s + (Number(r.sales_amount) || 0), 0)
        if (hoursIdx >= 0) totals[hoursIdx] = Math.round(filtered.reduce((s, r) => s + (Number(r.hours_worked) || 0), 0) * 100) / 100
        rows.push(totals)
      }
    } else if (reportType === 'by_employee') {
      headers = ['Empleado', 'Email', 'Rol', 'Sucursales', 'Días trabajados', 'Horas totales', 'Horas promedio', 'Total ventas', 'Meta semanal', '% Puntualidad', 'Retardos', 'Faltas']
      const grouped = {}
      filtered.forEach(r => {
        if (!grouped[r.employee_id]) grouped[r.employee_id] = []
        grouped[r.employee_id].push(r)
      })
      Object.entries(grouped).forEach(([empId, records]) => {
        const emp = empMap[empId]
        const empSites = [...new Set(records.map(r => siteMap[r.site_id]?.name).filter(Boolean))].join(', ')
        const days = records.filter(r => r.check_in).length
        const totalHours = Math.round(records.reduce((s, r) => s + (Number(r.hours_worked) || 0), 0) * 100) / 100
        const avgHours = days > 0 ? Math.round((totalHours / days) * 100) / 100 : 0
        const totalSales = records.reduce((s, r) => s + (Number(r.sales_amount) || 0), 0)
        const onTime = records.filter(r => r.status === 'on_time').length
        const late = records.filter(r => r.status === 'late').length
        const absent = records.filter(r => r.status === 'absent').length
        const total = records.length
        const pct = total > 0 ? Math.round((onTime / total) * 100) : 0
        const goal = goalMap[empId]?.weekly_goal || ''
        rows.push([emp?.name || '?', emp?.email || '', emp?.role || '', empSites, days, totalHours, avgHours, totalSales, goal, pct + '%', late, absent])
      })
      // Totals row
      const totals = ['TOTALES', '', '', '', 0, 0, '', 0, '', '', 0, 0]
      rows.forEach(r => { totals[4] += r[4]; totals[5] += r[5]; totals[7] += r[7]; totals[10] += r[10]; totals[11] += r[11] })
      totals[5] = Math.round(totals[5] * 100) / 100
      rows.push(totals)
    } else if (reportType === 'by_site') {
      headers = ['Sucursal', 'Empleados', 'Registros', 'Días con actividad', 'Horas totales', 'Horas promedio', 'Total ventas', '% Puntualidad', 'Retardos', 'Faltas']
      const grouped = {}
      filtered.forEach(r => {
        if (!grouped[r.site_id]) grouped[r.site_id] = []
        grouped[r.site_id].push(r)
      })
      Object.entries(grouped).forEach(([siteId, records]) => {
        const site = siteMap[siteId]
        const empCount = new Set(records.map(r => r.employee_id)).size
        const days = new Set(records.map(r => r.date)).size
        const totalHours = Math.round(records.reduce((s, r) => s + (Number(r.hours_worked) || 0), 0) * 100) / 100
        const avgHours = records.length > 0 ? Math.round((totalHours / records.length) * 100) / 100 : 0
        const totalSales = records.reduce((s, r) => s + (Number(r.sales_amount) || 0), 0)
        const onTime = records.filter(r => r.status === 'on_time').length
        const late = records.filter(r => r.status === 'late').length
        const absent = records.filter(r => r.status === 'absent').length
        const pct = records.length > 0 ? Math.round((onTime / records.length) * 100) : 0
        rows.push([site?.name || '?', empCount, records.length, days, totalHours, avgHours, totalSales, pct + '%', late, absent])
      })
      const totals = ['TOTALES', '', 0, '', 0, '', 0, '', 0, 0]
      rows.forEach(r => { totals[2] += r[2]; totals[4] += r[4]; totals[6] += r[6]; totals[8] += r[8]; totals[9] += r[9] })
      totals[4] = Math.round(totals[4] * 100) / 100
      rows.push(totals)
    } else if (reportType === 'by_period') {
      headers = ['Período', 'Registros', 'Puntuales', 'Tolerancia', 'Retardos', 'Faltas', 'Total horas', 'Total ventas']
      const grouped = {}
      filtered.forEach(r => {
        let key = r.date
        if (periodGroup === 'week') {
          const d = new Date(r.date + 'T12:00:00')
          const day = d.getDay()
          const diff = day === 0 ? -6 : 1 - day
          d.setDate(d.getDate() + diff)
          key = 'Sem ' + d.toLocaleDateString('en-CA')
        } else if (periodGroup === 'month') {
          key = r.date.slice(0, 7)
        }
        if (!grouped[key]) grouped[key] = []
        grouped[key].push(r)
      })
      Object.entries(grouped).sort((a, b) => a[0].localeCompare(b[0])).forEach(([period, records]) => {
        rows.push([
          period, records.length,
          records.filter(r => r.status === 'on_time').length,
          records.filter(r => r.status === 'tolerancia').length,
          records.filter(r => r.status === 'late').length,
          records.filter(r => r.status === 'absent').length,
          Math.round(records.reduce((s, r) => s + (Number(r.hours_worked) || 0), 0) * 100) / 100,
          records.reduce((s, r) => s + (Number(r.sales_amount) || 0), 0),
        ])
      })
      const totals = ['TOTALES', 0, 0, 0, 0, 0, 0, 0]
      rows.forEach(r => { for (let i = 1; i < 8; i++) totals[i] += r[i] })
      totals[6] = Math.round(totals[6] * 100) / 100
      rows.push(totals)
    } else if (reportType === 'payroll') {
      headers = ['Empleado', 'Email', 'Rol', 'Sucursal principal', 'Días trabajados', 'Horas totales', 'Total ventas', 'Meta semanal', 'Puntuales', 'Retardos', 'Faltas']
      const grouped = {}
      filtered.forEach(r => {
        if (!grouped[r.employee_id]) grouped[r.employee_id] = []
        grouped[r.employee_id].push(r)
      })
      Object.entries(grouped).forEach(([empId, records]) => {
        const emp = empMap[empId]
        const siteCounts = {}
        records.forEach(r => { siteCounts[r.site_id] = (siteCounts[r.site_id] || 0) + 1 })
        const mainSiteId = Object.entries(siteCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
        const days = records.filter(r => r.check_in).length
        const totalHours = Math.round(records.reduce((s, r) => s + (Number(r.hours_worked) || 0), 0) * 100) / 100
        const totalSales = records.reduce((s, r) => s + (Number(r.sales_amount) || 0), 0)
        const goal = goalMap[empId]?.weekly_goal || ''
        rows.push([emp?.name || '?', emp?.email || '', emp?.role || '', siteMap[mainSiteId]?.name || '?', days, totalHours, totalSales, goal,
          records.filter(r => r.status === 'on_time').length,
          records.filter(r => r.status === 'late').length,
          records.filter(r => r.status === 'absent').length,
        ])
      })
      const totals = ['TOTALES', '', '', '', 0, 0, 0, '', 0, 0, 0]
      rows.forEach(r => { totals[4] += r[4]; totals[5] += r[5]; totals[6] += r[6]; totals[8] += r[8]; totals[9] += r[9]; totals[10] += r[10] })
      totals[5] = Math.round(totals[5] * 100) / 100
      rows.push(totals)
    }

    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Cancun' })
    const a = document.createElement('a')
    a.href = url
    a.download = `worktic-${reportType}-${today}.csv`
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setToast(`Exportado ${rows.length - 1} registros`)
  }

  const sS = { padding: '5px 8px', borderRadius: 5, border: '1px solid #e2e8f0', fontSize: 11, fontFamily: 'inherit', outline: 'none', background: '#fff', color: '#0f172a', width: '100%' }
  const lblS = { fontSize: 9, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4, display: 'block' }
  const chipS = (active) => ({ fontSize: 10, padding: '3px 10px', borderRadius: 12, border: '1px solid ' + (active ? '#3b82f6' : '#e2e8f0'), background: active ? 'rgba(59,130,246,.1)' : '#fff', color: active ? '#3b82f6' : '#64748b', cursor: 'pointer', fontFamily: 'inherit', fontWeight: active ? 600 : 400 })

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 700, maxHeight: '90vh', overflow: 'auto', padding: 0 }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>📊 Exportar reporte</div>
            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{filtered.length} registros con los filtros actuales</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 18, color: '#94a3b8', cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Saved configs */}
          {savedConfigs.length > 0 && (
            <div>
              <span style={lblS}>Configuraciones guardadas</span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {savedConfigs.map(c => (
                  <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <button onClick={() => loadConfig(c)} style={{ ...chipS(false), background: 'rgba(16,185,129,.08)', borderColor: 'rgba(16,185,129,.25)', color: '#10b981' }}>
                      📁 {c.name}
                    </button>
                    <button onClick={() => deleteConfig(c.name)} style={{ background: 'none', border: 'none', fontSize: 10, color: '#ef4444', cursor: 'pointer', padding: '0 2px' }}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Report type */}
          <div>
            <span style={lblS}>Tipo de reporte</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 6 }}>
              {REPORT_TYPES.map(t => (
                <button key={t.id} onClick={() => setReportType(t.id)}
                  style={{ padding: '8px 10px', borderRadius: 8, border: '1.5px solid ' + (reportType === t.id ? '#3b82f6' : '#e2e8f0'), background: reportType === t.id ? 'rgba(59,130,246,.06)' : '#fff', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: reportType === t.id ? '#3b82f6' : '#0f172a' }}>{t.label}</div>
                  <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 2 }}>{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Period grouping */}
          {reportType === 'by_period' && (
            <div>
              <span style={lblS}>Agrupar por</span>
              <div style={{ display: 'flex', gap: 6 }}>
                {[['day', 'Día'], ['week', 'Semana'], ['month', 'Mes']].map(([v, l]) => (
                  <button key={v} onClick={() => setPeriodGroup(v)} style={chipS(periodGroup === v)}>{l}</button>
                ))}
              </div>
            </div>
          )}

          {/* Date range */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <span style={lblS}>Desde</span>
              <input type="date" value={fFrom} onChange={e => setFFrom(e.target.value)} style={sS} />
            </div>
            <div>
              <span style={lblS}>Hasta</span>
              <input type="date" value={fTo} onChange={e => setFTo(e.target.value)} style={sS} />
            </div>
          </div>

          {/* Site filter */}
          <div>
            <span style={lblS}>Sucursales {fSites.length > 0 && `(${fSites.length})`}</span>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              <button onClick={() => setFSites([])} style={chipS(fSites.length === 0)}>Todas</button>
              {sites.map(s => (
                <button key={s.id} onClick={() => toggleArr(fSites, setFSites, s.id)} style={chipS(fSites.includes(s.id))}>{s.name}</button>
              ))}
            </div>
          </div>

          {/* Employee filter */}
          <div>
            <span style={lblS}>Empleados {fEmps.length > 0 && `(${fEmps.length})`}</span>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', maxHeight: 80, overflow: 'auto' }}>
              <button onClick={() => setFEmps([])} style={chipS(fEmps.length === 0)}>Todos</button>
              {allEmps.map(e => (
                <button key={e.id} onClick={() => toggleArr(fEmps, setFEmps, e.id)} style={chipS(fEmps.includes(e.id))}>{e.name}</button>
              ))}
            </div>
          </div>

          {/* Status filter */}
          <div>
            <span style={lblS}>Estado</span>
            <div style={{ display: 'flex', gap: 5 }}>
              <button onClick={() => setFStatuses([])} style={chipS(fStatuses.length === 0)}>Todos</button>
              {[['on_time', 'Puntual'], ['tolerancia', 'Tolerancia'], ['late', 'Retardo'], ['absent', 'Falta']].map(([v, l]) => (
                <button key={v} onClick={() => toggleArr(fStatuses, setFStatuses, v)} style={chipS(fStatuses.includes(v))}>{l}</button>
              ))}
            </div>
          </div>

          {/* Column selector (detail only) */}
          {reportType === 'detail' && (
            <div>
              <span style={lblS}>Columnas a incluir</span>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {DETAIL_COLS.map(c => (
                  <button key={c.id} onClick={() => toggleCol(c.id)} style={chipS(cols.includes(c.id))}>{c.label}</button>
                ))}
              </div>
            </div>
          )}

          {/* Save config */}
          <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            {showSaveInput ? (
              <>
                <input value={configName} onChange={e => setConfigName(e.target.value)} placeholder="Nombre de la configuración" onKeyDown={e => e.key === 'Enter' && saveConfig()}
                  style={{ ...sS, width: 200 }} autoFocus />
                <button onClick={saveConfig} style={{ padding: '5px 12px', borderRadius: 5, border: 'none', background: '#10b981', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Guardar</button>
                <button onClick={() => setShowSaveInput(false)} style={{ padding: '5px 8px', borderRadius: 5, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
              </>
            ) : (
              <button onClick={() => setShowSaveInput(true)} style={{ padding: '5px 12px', borderRadius: 5, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>💾 Guardar configuración</button>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#64748b' }}>{filtered.length} registros · Reporte: {REPORT_TYPES.find(t => t.id === reportType)?.label}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
            <button onClick={generateCSV} disabled={filtered.length === 0}
              style={{ padding: '9px 24px', borderRadius: 8, border: 'none', background: filtered.length > 0 ? '#10b981' : '#e2e8f0', color: filtered.length > 0 ? '#fff' : '#94a3b8', fontSize: 12, fontWeight: 700, cursor: filtered.length > 0 ? 'pointer' : 'default', fontFamily: 'inherit' }}>
              ⬇ Descargar CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
