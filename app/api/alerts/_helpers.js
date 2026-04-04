import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import webpush from 'web-push'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

let _resend = null
export function getResend() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}

webpush.setVapidDetails(
  'mailto:jvmontalvo@gmail.com',
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

// Returns alert_preferences rows for all admins of a site+company
export async function getAdminPrefs(siteId, companyId) {
  const [{ data: perms }, { data: companyAdmins }, { data: superAdmins }] = await Promise.all([
    supabase.from('admin_site_permissions').select('admin_user_id').eq('site_id', siteId),
    companyId
      ? supabase.from('admin_users').select('id').eq('company_id', companyId).in('role', ['company_admin', 'superadmin'])
      : Promise.resolve({ data: [] }),
    // superadmins with no company_id assigned have access to everything
    supabase.from('admin_users').select('id').eq('role', 'superadmin').is('company_id', null),
  ])
  const allAdminIds = [...new Set([
    ...(perms || []).map(p => p.admin_user_id),
    ...(companyAdmins || []).map(a => a.id),
    ...(superAdmins || []).map(a => a.id),
  ])]
  if (allAdminIds.length === 0) return []
  const { data: prefs } = await supabase.from('alert_preferences').select('*').in('admin_user_id', allAdminIds)
  return prefs || []
}

// Deduplicates — returns unique emails where ANY of the given pref flags is true
export function getEmails(prefs, ...flags) {
  const emails = new Set()
  for (const p of prefs) {
    if (flags.some(f => p[f])) emails.add(p.email)
  }
  return [...emails].filter(Boolean)
}

// Returns unique admin_user_ids where ANY of the given push pref flags is true
export function getPushAdminIds(prefs, ...flags) {
  const ids = new Set()
  for (const p of prefs) {
    if (flags.some(f => p[f])) ids.add(p.admin_user_id)
  }
  return [...ids].filter(Boolean)
}

// Sends push notification to all subscribed admins in the given id list
export async function sendPush(adminIds, title, body, tag = 'worktic', url = '/admin') {
  if (!adminIds.length) return
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('id, subscription')
    .in('admin_user_id', adminIds)
  if (!subs?.length) return

  const payload = JSON.stringify({ title, body, tag, url })
  const staleIds = []
  await Promise.allSettled(
    subs.map(async s => {
      try {
        await webpush.sendNotification(s.subscription, payload)
      } catch (e) {
        if (e.statusCode === 404 || e.statusCode === 410) staleIds.push(s.id)
      }
    })
  )
  if (staleIds.length) {
    await supabase.from('push_subscriptions').delete().in('id', staleIds)
  }
}

export async function sendAlert(emails, subject, html) {
  if (!emails.length) return
  await getResend().emails.send({
    from: 'Worktic Alertas <alertas@worktic.app>',
    to: emails,
    subject,
    html,
  })
}

export function buildHtml(title, subtitle, rows) {
  const rowsHtml = rows.map(([label, value, color]) =>
    `<tr><td style="padding:6px 0;color:#4a5568">${label}</td><td style="padding:6px 0;font-weight:600${color ? ';color:' + color : ''}">${value}</td></tr>`
  ).join('')
  return `
    <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
      <div style="background:#1a2035;border-radius:12px;padding:24px;color:#f1f5f9">
        <div style="font-size:22px;margin-bottom:4px">${title}</div>
        <div style="font-size:14px;color:#8892a8;margin-bottom:20px">${subtitle}</div>
        <table style="width:100%;font-size:13px;border-collapse:collapse">${rowsHtml}</table>
      </div>
      <div style="text-align:center;margin-top:16px;font-size:11px;color:#4a5568">worktic.app</div>
    </div>`
}
