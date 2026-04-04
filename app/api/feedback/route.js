import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request) {
  try {
    const { type, message, userName, userEmail, companyName, page, screenshot, screenshotName } = await request.json()

    if (!message?.trim()) {
      return NextResponse.json({ error: 'El mensaje no puede estar vacío.' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Get user from auth header if present
    const authHeader = request.headers.get('authorization')
    let userId = null, companyId = null
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7)
      const { data: { user } } = await supabase.auth.getUser(token)
      if (user) {
        userId = user.id
        const { data: admin } = await supabase
          .from('admin_users').select('company_id').eq('id', user.id).maybeSingle()
        companyId = admin?.company_id || null
      }
    }

    await supabase.from('feedback').insert({
      type: type || 'other',
      message: message.trim(),
      user_id: userId,
      user_name: userName || null,
      user_email: userEmail || null,
      company_id: companyId,
      page: page || null,
    })

    const typeEmoji = { error: '🐛', idea: '💡', other: '💬' }[type] || '💬'
    const typeLabel = { error: 'Error reportado', idea: 'Idea nueva', other: 'Comentario' }[type] || 'Feedback'

    const emailPayload = {
      from: 'Worktic <alertas@worktic.app>',
      to: 'jvmontalvo@gmail.com',
      subject: `${typeEmoji} ${typeLabel}${companyName ? ` — ${companyName}` : ''}`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0a0e1a;color:#f1f5f9;padding:28px;border-radius:12px">
          <h2 style="color:#10b981;margin-bottom:20px">${typeEmoji} ${typeLabel}</h2>
          <div style="background:#1a2035;border-radius:10px;padding:20px;margin-bottom:20px;border-left:3px solid ${type === 'error' ? '#ef4444' : type === 'idea' ? '#f59e0b' : '#10b981'}">
            <p style="font-size:15px;line-height:1.6;margin:0;color:#f1f5f9">${message.trim()}</p>
          </div>
          <table style="width:100%;border-collapse:collapse">
            ${[
              ['De', userName || '—'],
              ['Email', userEmail || '—'],
              ['Empresa', companyName || '—'],
              ['Página', page || '—'],
            ].map(([k,v]) => `<tr><td style="padding:6px 0;color:#8892a8;width:80px;font-size:12px">${k}</td><td style="padding:6px 0;font-size:12px;font-weight:600">${v}</td></tr>`).join('')}
          </table>
          ${screenshot ? `<div style="margin-top:16px;font-size:11px;color:#4a5568">📎 Captura adjunta: ${screenshotName}</div>` : ''}
          <div style="margin-top:20px;font-size:11px;color:#4a5568">worktic.app · feedback</div>
        </div>
      `,
      ...(screenshot ? { attachments: [{ filename: screenshotName || 'captura.png', content: screenshot }] } : {}),
    }

    resend.emails.send(emailPayload).catch(() => {})

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
