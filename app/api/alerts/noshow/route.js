import { NextResponse } from 'next/server'
import { supabase, getEmails, sendAlert, buildHtml, getPushAdminIds, sendPush } from '../_helpers'

// Called by Vercel cron once per day
// "Ya viene tarde"  (on_late)   → fires when start_time has passed but still within grace window
// "No llegó"        (on_noshow) → fires when start_time + grace_mins has passed
export async function GET(request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data: sites } = await supabase.from('sites').select('*').eq('active', true)
    let alertsSent = 0

    for (const site of (sites || [])) {
      const tz        = site.timezone || 'America/Cancun'
      const graceMins = site.grace_mins || 15
      const now       = new Date()
      const todayStr  = now.toLocaleDateString('en-CA', { timeZone: tz })

      const { data: schedules } = await supabase
        .from('schedules')
        .select('*, employees(name)')
        .eq('site_id', site.id)
        .eq('date', todayStr)

      if (!schedules?.length) continue

      const { data: todayAtt } = await supabase
        .from('attendance')
        .select('employee_id')
        .eq('site_id', site.id)
        .eq('date', todayStr)

      const checkedInIds = new Set((todayAtt || []).map(a => a.employee_id))

      const { data: perms } = await supabase
        .from('admin_site_permissions')
        .select('admin_user_id')
        .eq('site_id', site.id)

      const { data: companyAdmins } = await supabase
        .from('admin_users')
        .select('id')
        .eq('company_id', site.company_id)
        .in('role', ['company_admin', 'superadmin'])

      const allAdminIds = [...new Set([
        ...(perms || []).map(p => p.admin_user_id),
        ...(companyAdmins || []).map(a => a.id),
      ])]

      if (!allAdminIds.length) continue

      const { data: prefs } = await supabase
        .from('alert_preferences')
        .select('*')
        .in('admin_user_id', allAdminIds)

      if (!prefs?.length) continue

      for (const sched of schedules) {
        if (checkedInIds.has(sched.employee_id)) continue

        const [sh, sm]   = (sched.start_time || '09:00').split(':').map(Number)
        const nowInTz    = new Date(now.toLocaleString('en-US', { timeZone: tz }))
        const schedDate  = new Date(nowInTz)
        schedDate.setHours(sh, sm, 0, 0)
        const minsLate   = (nowInTz - schedDate) / 60000

        const empName  = sched.employees?.name || 'Empleado'
        const schedTime = sched.start_time?.slice(0, 5) || '?'

        // "Ya viene tarde" — past start_time but still within grace window
        if (minsLate >= 0 && minsLate < graceMins) {
          const emails  = getEmails(prefs, 'on_late')
          const pushIds = getPushAdminIds(prefs, 'push_on_late')
          if (emails.length || pushIds.length) {
            const subject = `⏰ ${empName} ya viene tarde — ${site.name}`
            const html = buildHtml(
              `⏰ Ya viene tarde`,
              site.name,
              [
                ['Empleado', empName],
                ['Sucursal', site.name],
                ['Debió entrar', `<span style="font-family:monospace">${schedTime}</span>`],
                ['Minutos tarde', `${Math.round(minsLate)} min`, '#f59e0b'],
                ['Tolerancia', `${graceMins} min`],
              ]
            )
            await Promise.all([
              emails.length  ? sendAlert(emails, subject, html) : null,
              pushIds.length ? sendPush(pushIds, `⏰ Ya viene tarde`, `${empName} · ${site.name} · ${Math.round(minsLate)} min`, 'late') : null,
            ])
            alertsSent++
          }
        }

        // "No llegó" — past start_time + grace_mins
        if (minsLate >= graceMins) {
          const emails  = getEmails(prefs, 'on_noshow')
          const pushIds = getPushAdminIds(prefs, 'push_on_noshow')
          if (emails.length || pushIds.length) {
            const subject = `🚨 ${empName} no llegó — ${site.name}`
            const html = buildHtml(
              `🚨 No llegó`,
              site.name,
              [
                ['Empleado', empName],
                ['Sucursal', site.name],
                ['Debió entrar', `<span style="font-family:monospace">${schedTime}</span>`],
                ['Tolerancia', `${graceMins} min`],
                ['Estado', 'No ha llegado', '#ef4444'],
              ]
            )
            await Promise.all([
              emails.length  ? sendAlert(emails, subject, html) : null,
              pushIds.length ? sendPush(pushIds, `🚨 No llegó`, `${empName} · ${site.name}`, 'noshow') : null,
            ])
            alertsSent++
          }
        }
      }
    }

    return NextResponse.json({ ok: true, alertsSent })
  } catch (e) {
    console.error('noshow cron error:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
