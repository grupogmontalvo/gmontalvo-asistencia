import { NextResponse } from 'next/server'
import { supabase, getResend, isAuthorizedCron } from '../_helpers'

// Convierte una hora local (en `tz`) a un Date UTC.
// dateStr: 'YYYY-MM-DD', timeStr: 'HH:MM' o 'HH:MM:SS', tz: 'America/Cancun'
function localToUtc(dateStr, timeStr, tz) {
  const [hh, mm] = timeStr.split(':').map(Number)
  const anchor = new Date(`${dateStr}T${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}:00Z`)
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  })
  const parts = Object.fromEntries(fmt.formatToParts(anchor).map(p => [p.type, p.value]))
  const shown = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second)
  const offset = shown - anchor.getTime()
  return new Date(anchor.getTime() - offset)
}

function reminderHtml(empName, type, siteName, timeStr) {
  const isCheckin = type === 'checkin'
  const title  = isCheckin ? '⏰ Tu turno empieza pronto' : '🕔 Tu turno está por terminar'
  const accion = isCheckin ? 'check-in'                  : 'check-out'
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <div style="background:#1a2035;border-radius:12px;padding:24px;color:#f1f5f9">
        <div style="font-size:22px;margin-bottom:4px">${title}</div>
        <div style="font-size:14px;color:#8892a8;margin-bottom:20px">Hola ${empName}, en 5 minutos.</div>
        <table style="width:100%;font-size:13px;border-collapse:collapse">
          <tr><td style="padding:6px 0;color:#4a5568">Sucursal</td><td style="padding:6px 0;font-weight:600">${siteName}</td></tr>
          <tr><td style="padding:6px 0;color:#4a5568">Hora</td><td style="padding:6px 0;font-weight:600;font-family:monospace">${timeStr}</td></tr>
          <tr><td style="padding:6px 0;color:#4a5568">Acción</td><td style="padding:6px 0;font-weight:600">No olvides hacer ${accion}</td></tr>
        </table>
      </div>
      <div style="text-align:center;margin-top:16px;font-size:11px;color:#4a5568">worktic.app</div>
    </div>`
}

// Cron diario que agenda con Resend (scheduledAt) un correo 5 min antes de
// cada start_time y end_time del día. Resend dispara solo a la hora exacta.
export async function GET(request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  console.log('[reminder cron] start', new Date().toISOString())

  try {
    const { data: sites } = await supabase.from('sites').select('*').eq('active', true)
    const resend  = getResend()
    const nowMs   = Date.now()
    let scheduled = 0
    let skipped   = 0

    for (const site of (sites || [])) {
      const tz       = site.timezone || 'America/Cancun'
      const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: tz })

      const { data: schedules } = await supabase
        .from('schedules')
        .select('*, employees(name, email, active)')
        .eq('site_id', site.id)
        .eq('date', todayStr)

      if (!schedules?.length) continue

      for (const sched of schedules) {
        const emp = sched.employees
        if (!emp?.active || !emp?.email) { skipped++; continue }

        for (const [type, timeRaw] of [['checkin', sched.start_time], ['checkout', sched.end_time]]) {
          if (!timeRaw) continue
          const targetUtc = localToUtc(todayStr, timeRaw, tz)
          const remindAt  = new Date(targetUtc.getTime() - 5 * 60000)

          // Resend exige al menos ~10 segundos en el futuro; damos 60s de margen.
          if (remindAt.getTime() <= nowMs + 60000) { skipped++; continue }

          const timeStr = timeRaw.slice(0, 5)
          const subject = type === 'checkin'
            ? `⏰ ${emp.name}, tu entrada es en 5 minutos`
            : `🕔 ${emp.name}, tu salida es en 5 minutos`

          try {
            await resend.emails.send({
              from: 'Worktic <alertas@worktic.app>',
              to: [emp.email],
              subject,
              html: reminderHtml(emp.name, type, site.name, timeStr),
              scheduledAt: remindAt.toISOString(),
            })
            scheduled++
          } catch (e) {
            console.error(`reminder ${type} error for ${emp.email}:`, e.message)
          }
        }
      }
    }

    console.log('[reminder cron] done', { scheduled, skipped })
    return NextResponse.json({ ok: true, scheduled, skipped })
  } catch (e) {
    console.error('reminder cron error:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
