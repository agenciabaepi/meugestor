import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseAdmin } from '@/lib/db/client'
import { sendWelcomeMessageIfNeeded } from '@/lib/modules/whatsapp-onboarding'

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
    console.log('=== REGISTRO DE USUÁRIO ===')
    console.log('Email:', email)
    console.log('WhatsApp normalizado:', normalizedWhatsApp)
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
      console.error('Erro no signUp:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    console.log('SignUp bem-sucedido. User ID:', data.user?.id)

    // Verifica se o registro foi criado na tabela users (o trigger deveria criar)
    if (data.user && supabaseAdmin) {
      // Aguarda um pouco para o trigger executar
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Verifica se o registro existe
      const { data: existingUser, error: checkError } = await supabaseAdmin
        .from('users')
        .select('id, whatsapp_number, tenant_id')
        .eq('id', data.user.id)
        .single()

      if (checkError || !existingUser) {
        console.error('Erro: Registro não foi criado na tabela users pelo trigger:', checkError)
        // Tenta criar manualmente se o trigger falhou
        // (Mas isso não deveria acontecer se o trigger estiver funcionando)
      } else {
        console.log('Registro encontrado na tabela users:', existingUser)
        // Atualiza o whatsapp_number se necessário (o trigger deveria ter criado com o número correto)
        if (existingUser.whatsapp_number !== normalizedWhatsApp) {
          console.log('Atualizando whatsapp_number no registro:', { old: existingUser.whatsapp_number, new: normalizedWhatsApp })
          const { error: updateError } = await supabaseAdmin
            .from('users')
            .update({ whatsapp_number: normalizedWhatsApp })
            .eq('id', data.user.id)
          
          if (updateError) {
            console.error('Erro ao atualizar whatsapp_number:', updateError)
          } else {
            console.log('whatsapp_number atualizado com sucesso')
          }
        }
      }
    }

    // Boas-vindas (idempotente): envia mensagem para novos números cadastrados
    if (data.user) {
      try {
        const result = await sendWelcomeMessageIfNeeded(data.user.id, normalizedWhatsApp)
        console.log('Welcome message result:', result)
      } catch (err) {
        console.warn('Falha ao enviar mensagem de boas-vindas (não bloqueante):', err)
      }
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
