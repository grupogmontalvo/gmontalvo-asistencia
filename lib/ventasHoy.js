// Totales de venta para el widget, con el mismo alcance que el panel:
// superadmin sin empresa ve todo, admin de empresa ve su empresa y gerente
// solo sus sucursales.
import { supabase } from '../app/api/alerts/_helpers'

const TZ = 'America/Cancun'

function ymd(d) { return d.toLocaleDateString('en-CA', { timeZone: TZ }) }
function shift(dateStr, days) {
  const d = new Date(dateStr + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

export async function ventasDelDia(adminId) {
  const { data: au } = await supabase.from('admin_users').select('id, role, company_id, default_company_id, active').eq('id', adminId).maybeSingle()
  if (!au || au.active === false) return null

  let sitesQ = supabase.from('sites').select('id, name').eq('active', true).order('name')
  if (au.role === 'superadmin') {
    const cid = au.default_company_id
    if (cid) sitesQ = sitesQ.eq('company_id', cid)
  } else if (au.role === 'company_admin') {
    sitesQ = sitesQ.eq('company_id', au.company_id)
  } else {
    const { data: perms } = await supabase.from('admin_site_permissions').select('site_id').eq('admin_user_id', au.id)
    const ids = (perms || []).map(p => p.site_id)
    if (!ids.length) return vacio()
    sitesQ = sitesQ.in('id', ids)
  }
  const { data: sites } = await sitesQ
  if (!sites?.length) return vacio()

  const hoy = ymd(new Date())
  const ayer = shift(hoy, -1)
  const semanaPasada = shift(hoy, -7)
  const dow = new Date(hoy + 'T12:00:00Z').getUTCDay()
  const lunes = shift(hoy, -(dow === 0 ? 6 : dow - 1))
  const desde = semanaPasada < lunes ? semanaPasada : lunes

  // Solo columnas y días necesarios: es una consulta chica aunque se refresque seguido.
  const rows = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from('attendance')
      .select('date, site_id, sales_amount')
      .in('site_id', sites.map(s => s.id))
      .gte('date', desde).lte('date', hoy)
      .gt('sales_amount', 0)
      .range(from, from + 999)
    if (error) throw error
    rows.push(...(data || []))
    if (!data || data.length < 1000) break
  }

  const sum = pred => rows.filter(pred).reduce((s, r) => s + Number(r.sales_amount || 0), 0)
  const porSitio = sites.map(s => ({
    nombre: s.name,
    hoy: sum(r => r.date === hoy && r.site_id === s.id),
  })).filter(s => s.hoy > 0).sort((a, b) => b.hoy - a.hoy)

  return {
    fecha: hoy,
    hoy: sum(r => r.date === hoy),
    ventas_hoy: rows.filter(r => r.date === hoy).length,
    ayer: sum(r => r.date === ayer),
    mismo_dia_semana_pasada: sum(r => r.date === semanaPasada),
    semana: sum(r => r.date >= lunes),
    por_sucursal: porSitio,
    actualizado: new Date().toISOString(),
  }

  function vacio() {
    const hoy = ymd(new Date())
    return { fecha: hoy, hoy: 0, ventas_hoy: 0, ayer: 0, mismo_dia_semana_pasada: 0, semana: 0, por_sucursal: [], actualizado: new Date().toISOString() }
  }
}
