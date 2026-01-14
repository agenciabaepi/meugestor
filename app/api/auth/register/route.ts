import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseAdmin } from '@/lib/db/client'

/**
 * POST - Registro de novo usuário
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password, name, whatsappNumber } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email e senha são obrigatórios' },
        { status: 400 }
      )
    }

    if (!whatsappNumber || whatsappNumber.trim().length === 0) {
      return NextResponse.json(
        { error: 'O número do WhatsApp é obrigatório' },
        { status: 400 }
      )
    }

    // Valida formato básico do WhatsApp
    const whatsappDigits = whatsappNumber.replace(/\D/g, '')
    if (whatsappDigits.length < 10) {
      return NextResponse.json(
        { error: 'O número do WhatsApp deve ter pelo menos 10 dígitos' },
        { status: 400 }
      )
    }

    // Normaliza o número do WhatsApp (remove caracteres não numéricos)
    const normalizedWhatsApp = whatsappNumber.replace(/\D/g, '')

    // Verifica se o WhatsApp já está vinculado a outro usuário
    if (supabaseAdmin) {
      const { data: existingUser } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('whatsapp_number', normalizedWhatsApp)
        .single()

      if (existingUser) {
        return NextResponse.json(
          { error: 'Este número do WhatsApp já está vinculado a outra conta' },
          { status: 400 }
        )
      }
    }

    // Cria cliente Supabase com suporte a cookies
    const supabase = await createServerClient()

    // Registra no Supabase Auth
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name || email,
          whatsapp_number: normalizedWhatsApp,
        },
      },
    })

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    // Atualiza o whatsapp_number no registro do usuário (o trigger cria o usuário, mas podemos garantir)
    if (data.user && supabaseAdmin) {
      await supabaseAdmin
        .from('users')
        .update({ whatsapp_number: normalizedWhatsApp })
        .eq('id', data.user.id)
    }

    return NextResponse.json({
      user: data.user,
      session: data.session,
    })
  } catch (error) {
    console.error('Erro no registro:', error)
    return NextResponse.json(
      { error: 'Erro ao criar conta' },
      { status: 500 }
    )
  }
}
