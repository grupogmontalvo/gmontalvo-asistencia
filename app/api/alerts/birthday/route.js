import { NextResponse } from 'next/server'
import { supabase, getEmails, getPushAdminIds, sendAlert, sendPush, buildHtml } from '../_helpers'

export async function POST(request) {
  try {
    const { company_id, names } = await request.json()
    if (!company_id || !names?.length) return NextResponse.json({ ok: true })

    // Get all admin prefs for this company
    const { data: admins } = await supabase
      .from('admin_users')
      .select('id')
      .eq('company_id', company_id)
    const adminIds = (admins || []).map(a => a.id)
    if (!adminIds.length) return NextResponse.json({ ok: true })

    const { data: prefs } = await supabase
      .from('alert_preferences')
      .select('*')
      .in('admin_user_id', adminIds)
    if (!prefs?.length) return NextResponse.json({ ok: true })

    const nameList = names.join(', ')
    const plural = names.length > 1
    const emails  = getEmails(prefs, 'on_birthday')
    const pushIds = getPushAdminIds(prefs, 'push_on_birthday')

    if (emails.length) {
      const subject = `🎂 ${plural ? 'Cumpleaños hoy' : `Cumpleaños de ${nameList}`}`
      const html = buildHtml(
        `🎂 ${plural ? 'Cumpleaños hoy' : `¡Hoy es el cumpleaños de ${nameList}!`}`,
        plural ? `${nameList} cumplen años hoy` : `No olvides felicitarle`,
        [[plural ? 'Empleados' : 'Empleado', nameList, '#ec4899']]
      )
      await sendAlert(emails, subject, html)
    }

    if (pushIds.length) {
      const title = plural ? `🎂 Cumpleaños hoy` : `🎂 ¡Cumpleaños de ${nameList}!`
      const body  = plural ? `${nameList} cumplen años hoy` : `No olvides felicitarle`
      await sendPush(pushIds, title, body, 'birthday')
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('alert/birthday error:', e.message)
    return NextResponse.json({ ok: true })
  }
}
