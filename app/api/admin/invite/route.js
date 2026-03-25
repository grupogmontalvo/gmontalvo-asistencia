import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

// Genera una contraseña temporal fácil de teclear: Palabra + 3 dígitos
function tempPassword() {
  const words = ['Gm','Sol','Mar','Rio','Luz','Paz','Red','Top','Fix','Uno']
  const w = words[Math.floor(Math.random() * words.length)]
  const n = String(Math.floor(100 + Math.random() * 900))
  return w + n   // e.g. Gm847, Sol312 — corto y sin ambigüedad
}

export async function POST(request) {
  try {
    const { email, name, role, site_ids, company_id, password: customPwd } = await request.json()

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
    )

    const pwd = customPwd || tempPassword()

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Falta configurar SUPABASE_SERVICE_ROLE_KEY en Vercel. Ve a Vercel → Settings → Environment Variables.' }, { status: 500 })
    }

    // Crear usuario con contraseña — sin link de confirmación
    const { data: userData, error: userErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: pwd,
      email_confirm: true,   // confirmar email automáticamente
    })

    if (userErr) {
      // Si el usuario ya existe, actualizar su contraseña en vez de fallar
      if (userErr.message?.includes('already been registered') || userErr.message?.includes('already exists')) {
        const { data: existing } = await supabaseAdmin.auth.admin.listUsers()
        const existingUser = existing?.users?.find(u => u.email === email)
        if (existingUser) {
          await supabaseAdmin.auth.admin.updateUserById(existingUser.id, { password: pwd, email_confirm: true })
          return NextResponse.json({ ok: true, password: pwd, updated: true })
        }
      }
      return NextResponse.json({ error: userErr.message }, { status: 400 })
    }

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
