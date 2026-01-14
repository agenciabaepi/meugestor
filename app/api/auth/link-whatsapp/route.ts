import { NextRequest, NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/db/client'
import { linkWhatsAppToUser } from '@/lib/modules/auth'

/**
 * POST - Vincula WhatsApp ao usuário autenticado
 */
export async function POST(request: NextRequest) {
  try {
    // Verifica autenticação
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    const { whatsappNumber } = await request.json()

    if (!whatsappNumber) {
      return NextResponse.json(
        { error: 'Número do WhatsApp é obrigatório' },
        { status: 400 }
      )
    }

    // Vincula WhatsApp ao usuário
    const success = await linkWhatsAppToUser(session.user.id, whatsappNumber)

    if (!success) {
      return NextResponse.json(
        { error: 'Erro ao vincular WhatsApp. Verifique se o número não está vinculado a outra conta.' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao vincular WhatsApp:', error)
    return NextResponse.json(
      { error: 'Erro ao vincular WhatsApp' },
      { status: 500 }
    )
  }
}
