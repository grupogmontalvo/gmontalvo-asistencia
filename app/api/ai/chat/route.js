import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'

const client = new Anthropic()

export async function POST(request) {
  try {
    const { messages, context } = await request.json()

    const system = `Eres el asistente de inteligencia artificial de Worktic, un sistema de control de asistencia para tiendas de retail en México.
Tienes acceso a los datos reales de la empresa. Responde preguntas sobre empleados, asistencia, puntualidad, sucursales y ventas.
Sé directo, conciso y útil. Responde en español. Si los datos no te permiten responder algo con certeza, dilo.
Usa números concretos cuando puedas. No inventes datos que no estén en el contexto.

DATOS DISPONIBLES:
${context}`

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 300,
      system,
      messages,
    })

    return NextResponse.json({ reply: response.content[0].text })
  } catch (e) {
    console.error('AI chat error:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
