import { NextResponse } from 'next/server'
import { supabase } from '../_helpers'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const adminUserId = searchParams.get('admin_user_id')
  if (!adminUserId) return NextResponse.json({ error: 'Missing admin_user_id' }, { status: 400 })
  const { data } = await supabase.from('alert_preferences').select('*').eq('admin_user_id', adminUserId).maybeSingle()
  return NextResponse.json({ prefs: data })
}

export async function POST(request) {
  try {
    const body = await request.json()
    const {
      admin_user_id, email,
      on_checkin, on_late, on_noshow, on_checkout, on_movement,
      push_on_checkin, push_on_late, push_on_noshow, push_on_checkout, push_on_movement,
    } = body
    if (!admin_user_id || !email) return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 })
    const { data, error } = await supabase.from('alert_preferences').upsert(
      {
        admin_user_id, email,
        on_checkin, on_late, on_noshow, on_checkout, on_movement, on_tolerance: false,
        push_on_checkin: push_on_checkin || false,
        push_on_late: push_on_late || false,
        push_on_noshow: push_on_noshow || false,
        push_on_checkout: push_on_checkout || false,
        push_on_movement: push_on_movement || false,
      },
      { onConflict: 'admin_user_id' }
    ).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, prefs: data })
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
