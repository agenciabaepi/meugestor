import { NextRequest, NextResponse } from 'next/server'
import { sendTextMessage } from '@/lib/modules/whatsapp'
import { formatError } from '@/lib/utils/errors'

/**
 * POST - Envia mensagem via WhatsApp
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { to, message } = body

    // Validações
    if (!to || !message) {
      return NextResponse.json(
        formatError(new Error('Campos "to" e "message" são obrigatórios')),
        { status: 400 }
      )
    }

    // Envia mensagem
    const success = await sendTextMessage(to, message)

    if (!success) {
      return NextResponse.json(
        formatError(new Error('Erro ao enviar mensagem')),
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao enviar mensagem:', error)
    return NextResponse.json(formatError(error), { status: 500 })
  }
}
