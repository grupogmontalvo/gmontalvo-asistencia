import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Genera una contraseña temporal legible: Xxxx + 4 dígitos
function tempPassword() {
  const words = ['Casa','Mist','Luna','Nova','Star','Flux','Vega','Bolt','Apex','Zeta']
  const w = words[Math.floor(Math.random() * words.length)]
  const n = String(Math.floor(1000 + Math.random() * 9000))
  return w + n
}

export async function POST(request) {
  try {
    const { email, name, role, site_ids, company_id, password: customPwd } = await request.json()

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    )

    const pwd = customPwd || tempPassword()

    // Crear usuario con contraseña — sin link de confirmación
    const { data: userData, error: userErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: pwd,
      email_confirm: true,   // confirmar email automáticamente
    })

    if (userErr) return NextResponse.json({ error: userErr.message }, { status: 400 })

    const userId = userData.user.id

    // Crear registro en admin_users
    const { error: auErr } = await supabaseAdmin.from('admin_users').insert({
      id: userId,
      name,
      email,
      role,
      company_id: role === 'superadmin' ? null : (company_id || null),
    })
    if (auErr) return NextResponse.json({ error: auErr.message }, { status: 400 })

    // Asignar permisos de sucursales
    if (role !== 'superadmin' && site_ids?.length > 0) {
      await supabaseAdmin.from('admin_site_permissions').insert(
        site_ids.map(site_id => ({ admin_user_id: userId, site_id }))
      )
    }

    return NextResponse.json({ ok: true, password: pwd })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
