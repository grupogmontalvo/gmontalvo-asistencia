import { NextResponse } from 'next/server'
import { supabase, getAdminPrefs, getEmails, sendAlert, buildHtml } from '../_helpers'

const MOVEMENT_LABELS = {
  lunch_start: { icon: '☕', title: 'Salió a comer',         label: 'Comida inicio' },
  lunch_end:   { icon: '🍽', title: 'Regresó de comer',      label: 'Comida fin'    },
  break_start: { icon: '⏸', title: 'Tomó un descanso',      label: 'Descanso inicio' },
  break_end:   { icon: '▶️', title: 'Regresó del descanso',  label: 'Descanso fin'  },
}

export async function POST(request) {
  try {
    const { attendance_id, type } = await request.json()
    if (!attendance_id || !type) return NextResponse.json({ ok: true })

    const meta = MOVEMENT_LABELS[type]
    if (!meta) return NextResponse.json({ ok: true })

    const { data: att } = await supabase
      .from('attendance')
      .select('*, employees(name), sites(name, company_id, timezone)')
      .eq('id', attendance_id)
      .single()

    if (!att) return NextResponse.json({ ok: true })

    const empName  = att.employees?.name || 'Empleado'
    const siteName = att.sites?.name || 'Sucursal'
    const tz       = att.sites?.timezone || 'America/Cancun'
    const now      = new Date().toLocaleTimeString('es-MX', {
      hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz
    })

    const prefs  = await getAdminPrefs(att.site_id, att.sites?.company_id)
    const emails = getEmails(prefs, 'on_movement')
    if (!emails.length) return NextResponse.json({ ok: true })

    const subject = `${meta.icon} ${empName} — ${meta.title} · ${siteName}`
    const html = buildHtml(
      `${meta.icon} ${meta.title}`,
      `${siteName} · ${now}`,
      [
        ['Empleado', empName],
        ['Sucursal', siteName],
        ['Evento', meta.label],
        ['Hora', `<span style="font-family:monospace">${now}</span>`],
      ]
    )

    await sendAlert(emails, subject, html)
    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('alert/movement error:', e.message)
    return NextResponse.json({ ok: true })
  }
}
