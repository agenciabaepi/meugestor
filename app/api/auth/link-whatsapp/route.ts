import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseAdmin } from '@/lib/db/client'
import { sendOTPVerification, verifyOTPAndLink } from '@/lib/modules/whatsapp-verification'

/**
 * POST - Inicia processo de vinculação de WhatsApp (envia OTP)
 */
export async function POST(request: NextRequest) {
  try {
    // Cria cliente Supabase com suporte a cookies
    const supabase = await createServerClient()
    
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

    const { whatsappNumber, code } = await request.json()

    if (!whatsappNumber) {
      return NextResponse.json(
        { error: 'Número do WhatsApp é obrigatório' },
        { status: 400 }
      )
    }

    // Se código foi fornecido, verifica e vincula
    if (code) {
      const result = await verifyOTPAndLink(
        session.user.id,
        whatsappNumber,
        code
      )

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || 'Erro ao verificar código' },
          { status: 400 }
        )
      }

      return NextResponse.json({ success: true, message: 'WhatsApp vinculado com sucesso!' })
    }

    // Se não tem código, envia OTP
    const result = await sendOTPVerification(session.user.id, whatsappNumber)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Erro ao enviar código de verificação' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Código de verificação enviado para seu WhatsApp',
    })
  } catch (error) {
    console.error('Erro ao vincular WhatsApp:', error)
    return NextResponse.json(
      { error: 'Erro ao vincular WhatsApp' },
      { status: 500 }
    )
  }
}
