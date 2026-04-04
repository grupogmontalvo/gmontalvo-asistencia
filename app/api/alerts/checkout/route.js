import { NextResponse } from 'next/server'
import { supabase, getAdminPrefs, getEmails, sendAlert, buildHtml, getPushAdminIds, sendPush } from '../_helpers'

export async function POST(request) {
  try {
    const { attendance_id } = await request.json()
    if (!attendance_id) return NextResponse.json({ ok: true })

    const { data: att } = await supabase
      .from('attendance')
      .select('*, employees(name), sites(name, company_id, timezone)')
      .eq('id', attendance_id)
      .single()

    if (!att) return NextResponse.json({ ok: true })

    const empName  = att.employees?.name || 'Empleado'
    const siteName = att.sites?.name || 'Sucursal'
    const tz       = att.sites?.timezone || 'America/Cancun'
    const timeStr  = new Date(att.check_out).toLocaleTimeString('es-MX', {
      hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz
    })
    const ciStr = new Date(att.check_in).toLocaleTimeString('es-MX', {
      hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz
    })

    const prefs   = await getAdminPrefs(att.site_id, att.sites?.company_id)
    const emails  = getEmails(prefs, 'on_checkout', 'on_movement')
    const pushIds = getPushAdminIds(prefs, 'push_on_checkout', 'push_on_movement')

    const hrs = att.hours_worked ? `${att.hours_worked}h` : '—'
    const subject = `🏁 ${empName} registró salida — ${siteName}`
    const html = buildHtml(
      `${empName} registró salida`,
      `${siteName} · ${timeStr}`,
      [
        ['Empleado', empName],
        ['Sucursal', siteName],
        ['Entrada', `<span style="font-family:monospace">${ciStr}</span>`],
        ['Salida', `<span style="font-family:monospace">${timeStr}</span>`],
        ['Horas trabajadas', hrs],
      ]
    )

    await Promise.all([
      emails.length  ? sendAlert(emails, subject, html) : null,
      pushIds.length ? sendPush(pushIds, `🏁 Salida: ${empName}`, `${siteName} · ${timeStr} · ${hrs}`, 'checkout') : null,
    ])
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('alert/checkout error:', e.message)
    return NextResponse.json({ ok: true })
  }
}
