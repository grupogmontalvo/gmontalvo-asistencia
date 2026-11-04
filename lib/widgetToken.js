// Token del widget de ventas: liga de solo lectura para el celular.
// Es "v1.<admin_user_id>.<firma>", firmado con HMAC en el servidor, así no
// necesita tabla nueva. Solo da acceso a los totales de venta de las
// sucursales que ese usuario ya puede ver en el panel, y deja de servir en
// cuanto el usuario se desactiva. Para invalidar todas las ligas a la vez se
// cambia WIDGET_SECRET en Vercel.
import crypto from 'crypto'

function secret() {
  const s = process.env.WIDGET_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!s) throw new Error('Falta WIDGET_SECRET')
  return s
}

function sign(adminId) {
  return crypto.createHmac('sha256', secret()).update(`widget-ventas:v1:${adminId}`).digest('base64url').slice(0, 32)
}

export function makeWidgetToken(adminId) {
  return `v1.${adminId}.${sign(adminId)}`
}

export function readWidgetToken(token) {
  if (typeof token !== 'string') return null
  const [v, adminId, sig] = token.split('.')
  if (v !== 'v1' || !adminId || !sig) return null
  const expected = Buffer.from(sign(adminId))
  const got = Buffer.from(sig)
  if (expected.length !== got.length || !crypto.timingSafeEqual(expected, got)) return null
  return adminId
}
