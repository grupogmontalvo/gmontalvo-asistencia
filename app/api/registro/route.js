import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { NextResponse } from 'next/server'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(request) {
  try {
    const { name, company, email, password } = await request.json()

    if (!name?.trim() || !company?.trim() || !email?.trim() || !password?.trim()) {
      return NextResponse.json({ error: 'Todos los campos son obligatorios.' }, { status: 400 })
    }
    if (password.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres.' }, { status: 400 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const cleanEmail = email.trim().toLowerCase()

    // 1. Try to create auth user
    let userId
    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: cleanEmail,
      password: password.trim(),
      email_confirm: true,
    })

    if (authErr) {
      // Auth user already exists — check if setup completed
      if (authErr.message?.includes('already') || authErr.code === 'email_exists') {
        const { data: existingAdmin } = await supabase
          .from('admin_users').select('id').eq('email', cleanEmail).maybeSingle()
        if (existingAdmin) {
          return NextResponse.json({ error: 'Este correo ya tiene una cuenta registrada.' }, { status: 400 })
        }
        // Auth exists but setup never completed — get the user id and finish setup
        const { data: { users } } = await supabase.auth.admin.listUsers()
        const existingUser = users?.find(u => u.email === cleanEmail)
        if (!existingUser) {
          return NextResponse.json({ error: 'Error al verificar la cuenta. Contacta soporte.' }, { status: 500 })
        }
        userId = existingUser.id
        // Update password in case they're retrying
        await supabase.auth.admin.updateUserById(userId, { password: password.trim() })
      } else {
        return NextResponse.json({ error: `Error al crear usuario: ${authErr.message}` }, { status: 400 })
      }
    } else {
      userId = authData.user.id
    }

    // 2. Create company (check if already exists for this user first)
    const { data: existingAdmin } = await supabase
      .from('admin_users').select('id, company_id').eq('id', userId).maybeSingle()

    let companyId = existingAdmin?.company_id

    if (!companyId) {
      // Generate unique slug from company name
      const baseSlug = company.trim().toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      const slug = `${baseSlug}-${Date.now()}`

      const { data: newCompany, error: compErr } = await supabase
        .from('companies').insert({ name: company.trim(), plan: 'free', slug }).select().single()
      if (compErr) {
        return NextResponse.json({ error: `Error al crear empresa: ${compErr.message}` }, { status: 500 })
      }
      companyId = newCompany.id

      // 3. Create admin_user
      const { error: adminErr } = await supabase.from('admin_users').insert({
        id: userId,
        name: name.trim(),
        email: cleanEmail,
        role: 'company_admin',
        company_id: companyId,
      })
      if (adminErr) {
        // Rollback company
        await supabase.from('companies').delete().eq('id', companyId)
        return NextResponse.json({ error: `Error al guardar perfil: ${adminErr.message}` }, { status: 500 })
      }
    }

    // 4. Emails (non-blocking)
    resend.emails.send({
      from: 'Worktic <alertas@worktic.app>',
      to: cleanEmail,
      subject: '¡Bienvenido a Worktic! Tu cuenta está lista',
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0a0e1a;color:#f1f5f9;padding:32px;border-radius:12px">
          <div style="text-align:center;margin-bottom:28px">
            <div style="font-size:32px;margin-bottom:8px">✅</div>
            <h1 style="color:#10b981;font-size:22px;margin-bottom:8px">¡Ya estás dentro!</h1>
            <p style="color:#8892a8;font-size:14px">Tu empresa <strong style="color:#f1f5f9">${company.trim()}</strong> está creada y lista para usar.</p>
          </div>
          <div style="background:#1a2035;border-radius:10px;padding:20px;margin-bottom:24px">
            <div style="font-size:13px;color:#8892a8;margin-bottom:12px">Primeros pasos:</div>
            <div style="font-size:13px;line-height:2;color:#f1f5f9">
              1. <strong>Sitios</strong> → crear tu primera sucursal<br/>
              2. <strong>Empleados</strong> → agregar a tu equipo<br/>
              3. Compartir el link de check-in con cada persona
            </div>
          </div>
          <div style="text-align:center">
            <a href="https://worktic.app/admin" style="display:inline-block;padding:14px 32px;background:#10b981;color:#fff;border-radius:8px;font-weight:700;font-size:14px;text-decoration:none">Entrar al panel →</a>
          </div>
          <div style="margin-top:24px;text-align:center;font-size:11px;color:#4a5568">worktic.app · Gratis durante beta</div>
        </div>
      `
    }).catch(() => {})

    resend.emails.send({
      from: 'Worktic <alertas@worktic.app>',
      to: 'jvmontalvo@gmail.com',
      subject: `🎉 Nuevo registro: ${company.trim()} — ${name.trim()}`,
      html: `<div style="font-family:sans-serif;padding:20px;background:#0a0e1a;color:#f1f5f9;border-radius:10px"><h3 style="color:#10b981">Nuevo registro en Worktic</h3><p><b>Nombre:</b> ${name.trim()}</p><p><b>Empresa:</b> ${company.trim()}</p><p><b>Email:</b> ${cleanEmail}</p></div>`
    }).catch(() => {})

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('registro error:', e)
    return NextResponse.json({ error: `Error interno: ${e.message}` }, { status: 500 })
  }
}
