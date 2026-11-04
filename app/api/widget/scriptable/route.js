import { readWidgetToken } from '../../../../lib/widgetToken'

// Script para la app Scriptable (iPhone): widget nativo de pantalla de inicio.
// Se copia completo y se pega en un script nuevo de Scriptable.
export async function GET(request) {
  const url = new URL(request.url)
  const t = url.searchParams.get('t')
  if (!readWidgetToken(t)) return new Response('Liga inválida', { status: 401 })
  const api = `${url.origin}/api/widget/ventas?t=${encodeURIComponent(t)}`
  const page = `${url.origin}/ventas/${t}`
  return new Response(scriptFor(api, page), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

function scriptFor(api, page) {
  return `// Ventas del día — widget para Scriptable
// Pega este script en Scriptable y agrega un widget de Scriptable a tu pantalla.
const API = ${JSON.stringify(api)}
const PAGE = ${JSON.stringify(page)}

const money = n => '$' + Math.round(n || 0).toLocaleString('es-MX')
const pct = (a, b) => b > 0 ? Math.round((a - b) / b * 100) : null

let d
try { d = await new Request(API).loadJSON() } catch (e) { d = { error: 'Sin conexión' } }

const w = new ListWidget()
w.backgroundColor = new Color('#0a0e1a')
w.url = PAGE
w.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000)
w.setPadding(14, 14, 14, 14)

const title = w.addText('VENTAS HOY')
title.font = Font.semiboldSystemFont(10)
title.textColor = new Color('#94a3b8')
w.addSpacer(4)

if (d.error) {
  const e = w.addText(d.error)
  e.font = Font.systemFont(12)
  e.textColor = new Color('#ef4444')
} else {
  const big = w.addText(money(d.hoy))
  big.font = Font.boldSystemFont(26)
  big.textColor = new Color('#10b981')
  big.minimumScaleFactor = 0.5
  big.lineLimit = 1

  const p = pct(d.hoy, d.mismo_dia_semana_pasada)
  if (p !== null) {
    const c = w.addText((p >= 0 ? '▲ ' : '▼ ') + Math.abs(p) + '% vs sem. pasada')
    c.font = Font.mediumSystemFont(10)
    c.textColor = new Color(p >= 0 ? '#10b981' : '#ef4444')
  }
  w.addSpacer(6)

  const fam = config.widgetFamily || 'small'
  if (fam !== 'small') {
    for (const s of (d.por_sucursal || []).slice(0, fam === 'large' ? 10 : 3)) {
      const row = w.addText(s.nombre + '  ' + money(s.hoy))
      row.font = Font.systemFont(11)
      row.textColor = new Color('#e2e8f0')
      row.lineLimit = 1
    }
    w.addSpacer(4)
  }
  const wk = w.addText('Semana ' + money(d.semana))
  wk.font = Font.systemFont(10)
  wk.textColor = new Color('#94a3b8')
}

w.addSpacer()
const upd = w.addText('Act. ' + new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }))
upd.font = Font.systemFont(8)
upd.textColor = new Color('#64748b')

if (config.runsInWidget) Script.setWidget(w)
else await w.presentMedium()
Script.complete()
`
}
