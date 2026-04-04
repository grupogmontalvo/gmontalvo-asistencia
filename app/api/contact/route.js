import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request) {
  try {
    const { name, company, email, employees, message } = await request.json()

    if (!name?.trim() || !email?.trim()) {
      return NextResponse.json({ error: 'Nombre y correo son obligatorios.' }, { status: 400 })
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email.trim())) {
      return NextResponse.json({ error: 'Correo electrónico inválido.' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    )

    await supabase.from('contact_requests').insert({
      name: name.trim(),
      company: company?.trim() || null,
      email: email.trim().toLowerCase(),
      employees: employees?.trim() || null,
      message: message?.trim() || null,
    })

    // Notify owner
    await resend.emails.send({
      from: 'Worktic <alertas@worktic.app>',
      to: 'jvmontalvo@gmail.com',
      subject: `📩 Nuevo contacto: ${name.trim()} — ${company?.trim() || 'sin empresa'}`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0a0e1a;color:#f1f5f9;padding:28px;border-radius:12px">
          <h2 style="color:#10b981;margin-bottom:20px">📩 Nuevo mensaje de contacto</h2>
          <table style="width:100%;border-collapse:collapse">
            ${[['Nombre', name.trim()],['Empresa', company?.trim() || '—'],['Email', email.trim()],['Empleados', employees?.trim() || '—']].map(([k,v]) => `
            <tr><td style="padding:8px 0;color:#8892a8;width:100px;font-size:13px">${k}</td><td style="padding:8px 0;font-weight:600;font-size:13px">${v}</td></tr>`).join('')}
          </table>
          ${message?.trim() ? `<div style="margin-top:20px;padding:16px;background:#1a2035;border-radius:8px;border-left:3px solid #10b981;font-size:13px;line-height:1.6">${message.trim()}</div>` : ''}
          <div style="margin-top:24px;font-size:11px;color:#4a5568">worktic.app</div>
        </div>
      `
    }).catch(() => {}) // never block UX

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
