import { NextResponse } from 'next/server'
import { supabase, getAdminPrefs, getEmails, sendAlert, buildHtml, getPushAdminIds, sendPush } from '../_helpers'

function statusLabel(status) {
  if (status === 'on_time')    return '✅ llegó a tiempo'
  if (status === 'tolerancia') return '⚠️ llegó en tolerancia'
  if (status === 'late')       return '❌ llegó tarde'
  return '✅ hizo check-in'
}

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

    const stText   = statusLabel(att.status)
    const empName  = att.employees?.name || 'Empleado'
    const siteName = att.sites?.name || 'Sucursal'
    const timeStr  = new Date(att.check_in).toLocaleTimeString('es-MX', {
      hour: '2-digit', minute: '2-digit', hour12: false,
      timeZone: att.sites?.timezone || 'America/Cancun'
    })

    const prefs   = await getAdminPrefs(att.site_id, att.sites?.company_id)
    const emails  = getEmails(prefs, 'on_checkin', 'on_movement')
    const pushIds = getPushAdminIds(prefs, 'push_on_checkin', 'push_on_movement')

    const subject = `📲 ${empName} ${stText} — ${siteName}`
    const html = buildHtml(
      `${empName} ${stText}`,
      `${siteName} · ${timeStr}`,
      [
        ['Empleado', empName],
        ['Sucursal', siteName],
        ['Hora entrada', `<span style="font-family:monospace">${timeStr}</span>`],
        ['Estado', stText],
      ]
    )

    await Promise.all([
      emails.length  ? sendAlert(emails, subject, html) : null,
      pushIds.length ? sendPush(pushIds, `📲 Check-in: ${empName}`, `${siteName} · ${timeStr}`, 'checkin') : null,
    ])
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('alert/checkin error:', e.message)
    return NextResponse.json({ ok: true })
  }
}
