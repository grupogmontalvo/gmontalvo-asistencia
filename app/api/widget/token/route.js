import { NextResponse } from 'next/server'
import { supabase } from '../../alerts/_helpers'
import { makeWidgetToken } from '../../../../lib/widgetToken'

// Entrega la liga del widget al usuario del panel que la pide. Se identifica
// con su sesión de Supabase (Authorization: Bearer <access_token>).
export async function POST(request) {
  const jwt = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
  if (!jwt) return NextResponse.json({ error: 'Sin sesión' }, { status: 401 })
  const { data: { user } = {}, error } = await supabase.auth.getUser(jwt)
  if (error || !user) return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })
  const { data: au } = await supabase.from('admin_users').select('id, active').eq('id', user.id).maybeSingle()
  if (!au || au.active === false) return NextResponse.json({ error: 'Sin acceso' }, { status: 403 })
  return NextResponse.json({ token: makeWidgetToken(au.id) })
}
