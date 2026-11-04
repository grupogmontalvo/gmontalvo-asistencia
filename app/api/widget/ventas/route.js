import { NextResponse } from 'next/server'
import { readWidgetToken } from '../../../../lib/widgetToken'
import { ventasDelDia } from '../../../../lib/ventasHoy'

export const dynamic = 'force-dynamic'

const CORS = { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' }

// JSON con las ventas del día. Lo leen la página /ventas/<token>, el widget de
// Scriptable (iPhone) y cualquier app de widgets que lea JSON (Android).
export async function GET(request) {
  const t = new URL(request.url).searchParams.get('t')
  const adminId = readWidgetToken(t)
  if (!adminId) return NextResponse.json({ error: 'Liga inválida' }, { status: 401, headers: CORS })
  try {
    const data = await ventasDelDia(adminId)
    if (!data) return NextResponse.json({ error: 'Sin acceso' }, { status: 403, headers: CORS })
    return NextResponse.json(data, { headers: CORS })
  } catch (e) {
    console.error('widget ventas:', e.message)
    return NextResponse.json({ error: 'No se pudieron leer las ventas' }, { status: 500, headers: CORS })
  }
}
