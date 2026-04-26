import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const client = new Anthropic()

export async function POST(request) {
  try {
    const { stats } = await request.json()

    const prompt = `Eres el asistente de un sistema de control de asistencia para tiendas de retail en México.
Analiza estos datos del día de hoy y da un resumen ejecutivo MUY breve (máx 2-3 oraciones) en español, directo y útil para el gerente.
Menciona lo más relevante: ausencias, tardanzas, cumplimiento, algo positivo si lo hay. Tono profesional pero cercano. Sin bullet points, solo texto fluido.

Datos de hoy:
- Fecha: ${stats.today}
- Tiendas activas: ${stats.activeSites}/${stats.totalSites}
- Empleados trabajando ahora: ${stats.working}
- Esperados hoy: ${stats.expected}
- Puntuales: ${stats.onTime}
- En tolerancia: ${stats.tolerance}
- Retardos: ${stats.late}
- Ausentes: ${stats.absent}
- Ya terminaron turno: ${stats.completed}
${stats.birthdaysToday?.length ? `- Cumpleaños hoy: ${stats.birthdaysToday.join(', ')}` : ''}
${stats.topSite ? `- Sucursal con más asistencia: ${stats.topSite}` : ''}
${stats.worstSite ? `- Sucursal con más ausencias: ${stats.worstSite}` : ''}`

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      messages: [{ role: 'user', content: prompt }],
    })

    return NextResponse.json({ summary: message.content[0].text })
  } catch (e) {
    console.error('AI summary error:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
