import { NextResponse } from 'next/server'
import { readWidgetToken } from '../../../../lib/widgetToken'

// Manifest propio para que "Agregar a pantalla de inicio" abra directo las ventas.
export async function GET(request) {
  const t = new URL(request.url).searchParams.get('t')
  if (!readWidgetToken(t)) return NextResponse.json({ error: 'Liga inválida' }, { status: 401 })
  return NextResponse.json({
    name: 'Ventas del día',
    short_name: 'Ventas',
    start_url: `/ventas/${t}`,
    scope: `/ventas/${t}`,
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0a0e1a',
    theme_color: '#0a0e1a',
    icons: [
      { src: '/logo.jpeg', sizes: '192x192', type: 'image/jpeg', purpose: 'any' },
      { src: '/logo.jpeg', sizes: '512x512', type: 'image/jpeg', purpose: 'any' },
    ],
  }, { headers: { 'Content-Type': 'application/manifest+json' } })
}
