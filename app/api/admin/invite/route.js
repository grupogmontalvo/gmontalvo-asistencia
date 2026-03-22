import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { email, name, role, site_ids, company_id } = await request.json()

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    // Genera el link sin mandar email
    const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: 'invite',
      email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://gmontalvo-asistencia.vercel.app'}/auth/set-password`,
      }
    })

    if (linkErr) return NextResponse.json({ error: linkErr.message }, { status: 400 })

    const userId = linkData.user.id
    const inviteLink = linkData.properties.action_link

    // Crear registro en admin_users
    await supabaseAdmin.from('admin_users').insert({
      id: userId,
      name,
      email,
      role,
      company_id: role === 'superadmin' ? null : (company_id || null),
    })

    // Asignar permisos de sucursales
    if (role !== 'superadmin' && site_ids?.length > 0) {
      await supabaseAdmin.from('admin_site_permissions').insert(
        site_ids.map(site_id => ({ admin_user_id: userId, site_id }))
      )
    }

    // Regresa el link para que tú lo mandes por WhatsApp
    return NextResponse.json({ ok: true, link: inviteLink })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
