import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { email, name, role, site_ids, company_id } = await request.json()

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const { data: inviteData, error: inviteErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://gmontalvo-asistencia.vercel.app'}/auth/set-password`,
    })

    if (inviteErr) return NextResponse.json({ error: inviteErr.message }, { status: 400 })

    const userId = inviteData.user.id

    await supabaseAdmin.from('admin_users').insert({
      id: userId,
      name,
      email,
      role,
      company_id: role === 'superadmin' ? null : (company_id || null),
    })

    if (role !== 'superadmin' && site_ids?.length > 0) {
      await supabaseAdmin.from('admin_site_permissions').insert(
        site_ids.map(site_id => ({ admin_user_id: userId, site_id }))
      )
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
