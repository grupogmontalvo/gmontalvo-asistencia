import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { NextResponse } from 'next/server'

// Perezoso a propósito: si falta la API key, el aviso por correo se omite
// pero el registro sigue funcionando (el constructor lanza si la key no existe).
function mailer() {
  if (!process.env.RESEND_API_KEY) return null
  try { return new Resend(process.env.RESEND_API_KEY) } catch { return null }
}

function admin() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
}

// Motivo por el que un link no sirve, o null si está vigente.
function motivoInvalido(link) {
  if (!link) return 'Este link de registro no existe o fue eliminado.'
  if (!link.active) return 'Este link fue desactivado. Pide uno nuevo a tu administrador.'
  if (link.expires_at && new Date(link.expires_at) < new Date()) return 'Este link ya venció. Pide uno nuevo a tu administrador.'
  if (link.max_uses != null && link.uses >= link.max_uses) return 'Este link alcanzó su límite de registros. Pide uno nuevo a tu administrador.'
  return null
}

// GET /api/alta?token=... — datos para pintar el formulario sin exponer la config interna
export async function GET(request) {
  try {
    const token = new URL(request.url).searchParams.get('token')
    if (!token) return NextResponse.json({ error: 'Link inválido.' }, { status: 400 })

    const supabase = admin()
    const { data: link } = await supabase.from('invite_links').select('*').eq('token', token).maybeSingle()

    const motivo = motivoInvalido(link)
    if (motivo) return NextResponse.json({ error: motivo }, { status: 400 })

    const [{ data: empresa }, { data: sucursales }] = await Promise.all([
      supabase.from('companies').select('name').eq('id', link.company_id).maybeSingle(),
      link.site_ids?.length
        ? supabase.from('sites').select('name').in('id', link.site_ids)
        : Promise.resolve({ data: [] }),
    ])

    return NextResponse.json({
      ok: true,
      empresa: empresa?.name || 'la empresa',
      sucursales: (sucursales || []).map(s => s.name),
      role: link.role,
    })
  } catch (e) {
    console.error('alta GET error:', e)
    return NextResponse.json({ error: 'Error de conexión. Intenta de nuevo.' }, { status: 500 })
  }
}

// POST /api/alta — crea al empleado en estado pendiente de aprobación
export async function POST(request) {
  try {
    const { token, name, email, phone, birth_date } = await request.json()

    if (!token) return NextResponse.json({ error: 'Link inválido.' }, { status: 400 })
    if (!name?.trim())  return NextResponse.json({ error: 'Escribe tu nombre completo.' }, { status: 400 })
    if (!email?.trim()) return NextResponse.json({ error: 'Escribe tu correo.' }, { status: 400 })

    const cleanEmail = email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return NextResponse.json({ error: 'Ese correo no parece válido. Revísalo.' }, { status: 400 })
    }

    const supabase = admin()
    const { data: link } = await supabase.from('invite_links').select('*').eq('token', token).maybeSingle()

    const motivo = motivoInvalido(link)
    if (motivo) return NextResponse.json({ error: motivo }, { status: 400 })

    // Un correo por empresa: evita que se acumulen registros duplicados de la misma persona.
    const { data: yaExiste } = await supabase
      .from('employees').select('id, pending_approval, active')
      .ilike('email', cleanEmail).eq('company_id', link.company_id).maybeSingle()

    if (yaExiste) {
      return NextResponse.json({
        error: yaExiste.pending_approval
          ? 'Ya te registraste con este correo. Tu alta está pendiente de aprobación.'
          : 'Este correo ya está registrado. Usa el código QR de tu sucursal para checar.',
      }, { status: 400 })
    }

    const { data: nuevo, error: empErr } = await supabase.from('employees').insert({
      name: name.trim(),
      email: cleanEmail,
      phone: phone?.trim() || null,
      birth_date: birth_date || null,
      role: link.role,
      company_id: link.company_id,
      skip_sales: link.skip_sales,
      skip_photo: link.skip_photo,
      active: false,
      pending_approval: true,
      invite_link_id: link.id,
    }).select().single()

    if (empErr || !nuevo) {
      console.error('alta insert error:', empErr)
      return NextResponse.json({ error: 'No pudimos completar tu registro. Intenta de nuevo.' }, { status: 500 })
    }

    // Sucursales y meta quedan preasignadas desde el link
    if (link.site_ids?.length) {
      await supabase.from('employee_site_assignments')
        .insert(link.site_ids.map(site_id => ({ employee_id: nuevo.id, site_id })))
    }
    if (link.weekly_goal != null && Number(link.weekly_goal) > 0) {
      await supabase.from('employee_goals')
        .upsert({ employee_id: nuevo.id, weekly_goal: Number(link.weekly_goal) }, { onConflict: 'employee_id' })
    }

    await supabase.from('invite_links').update({ uses: link.uses + 1 }).eq('id', link.id)

    // Aviso al administrador (no bloquea el registro)
    const resend = mailer()
    if (resend) supabase.from('admin_users').select('email').eq('company_id', link.company_id).eq('active', true)
      .then(({ data: admins }) => {
        const destinos = (admins || []).map(a => a.email).filter(Boolean)
        if (!destinos.length) return
        resend.emails.send({
          from: 'Worktic <alertas@worktic.app>',
          to: destinos,
          subject: `Nuevo registro pendiente: ${name.trim()}`,
          html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;background:#0a0e1a;color:#f1f5f9;padding:28px;border-radius:12px">
            <h2 style="color:#f59e0b;font-size:18px;margin:0 0 16px">Alguien se registró con tu link</h2>
            <div style="background:#1a2035;border-radius:10px;padding:18px;font-size:14px;line-height:2">
              <b>Nombre:</b> ${name.trim()}<br/>
              <b>Correo:</b> ${cleanEmail}<br/>
              ${phone?.trim() ? `<b>Teléfono:</b> ${phone.trim()}<br/>` : ''}
              <b>Link:</b> ${link.label}
            </div>
            <p style="color:#8892a8;font-size:13px;margin:16px 0">No podrá checar asistencia hasta que lo apruebes.</p>
            <div style="text-align:center">
              <a href="https://worktic.app/admin" style="display:inline-block;padding:13px 30px;background:#10b981;color:#fff;border-radius:8px;font-weight:700;font-size:14px;text-decoration:none">Revisar en el panel →</a>
            </div>
          </div>`,
        }).catch(() => {})
      })

    return NextResponse.json({ ok: true, nombre: nuevo.name })
  } catch (e) {
    console.error('alta POST error:', e)
    return NextResponse.json({ error: 'Error de conexión. Intenta de nuevo.' }, { status: 500 })
  }
}
