import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseAdmin } from '@/lib/db/client'
import { sendWelcomeMessageIfNeeded } from '@/lib/modules/whatsapp-onboarding'
import { updateUserModeAndEmpresa } from '@/lib/db/user-profile'

/**
 * POST - Registro de novo usuário
 */
export async function POST(request: NextRequest) {
  try {
    const {
      email,
      password,
      name,
      whatsappNumber,
      mode,
      empresaNomeFantasia,
      empresaRazaoSocial,
      empresaCnpj,
    } = await request.json()

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
      const tryTables = ['users_meugestor', 'users'] as const
      let existingUser: any = null
      for (const table of tryTables) {
        const { data, error } = await supabaseAdmin
          .from(table)
          .select('id')
          .eq('whatsapp_number', normalizedWhatsApp)
          .single()
        if (!error && data) {
          existingUser = data
          break
        }
        // se tabela não existir, tenta a próxima
      }

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
          mode: mode === 'empresa' ? 'empresa' : 'pessoal',
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
      const tryTables = ['users_meugestor', 'users'] as const
      let existingUser: any = null
      let checkError: any = null
      for (const table of tryTables) {
        const res = await supabaseAdmin
          .from(table)
          .select('id, whatsapp_number, tenant_id')
          .eq('id', data.user.id)
          .single()
        existingUser = res.data
        checkError = res.error
        if (!res.error && res.data) break
      }

      if (checkError || !existingUser) {
        console.error('Erro: Registro não foi criado na tabela users pelo trigger:', checkError)
        // Tenta criar manualmente se o trigger falhou
        // (Mas isso não deveria acontecer se o trigger estiver funcionando)
      } else {
        console.log('Registro encontrado (perfil):', existingUser)
        // Atualiza o whatsapp_number se necessário (o trigger deveria ter criado com o número correto)
        if (existingUser.whatsapp_number !== normalizedWhatsApp) {
          console.log('Atualizando whatsapp_number no registro:', { old: existingUser.whatsapp_number, new: normalizedWhatsApp })
          // tenta atualizar em users_meugestor e fallback em users
          let updateError: any = null
          for (const table of tryTables) {
            const res = await supabaseAdmin
              .from(table)
              .update({ whatsapp_number: normalizedWhatsApp })
              .eq('id', data.user.id)
            updateError = res.error
            if (!res.error) break
          }
          
          if (updateError) {
            console.error('Erro ao atualizar whatsapp_number:', updateError)
          } else {
            console.log('whatsapp_number atualizado com sucesso')
          }
        }

        // Modo empresa: cria empresa e grava contexto no perfil do usuário
        if (mode === 'empresa') {
          const nomeFantasia = typeof empresaNomeFantasia === 'string' ? empresaNomeFantasia.trim() : ''
          if (!nomeFantasia) {
            return NextResponse.json(
              { error: 'Nome fantasia da empresa é obrigatório no modo empresarial' },
              { status: 400 }
            )
          }

          const { data: empresa, error: empresaError } = await supabaseAdmin
            .from('empresas')
            .insert({
              tenant_id: existingUser.tenant_id,
              nome_fantasia: nomeFantasia,
              razao_social: typeof empresaRazaoSocial === 'string' ? empresaRazaoSocial.trim() : null,
              cnpj: typeof empresaCnpj === 'string' ? empresaCnpj.trim() : null,
            })
            .select('id')
            .single()

          if (empresaError || !empresa?.id) {
            console.error('Erro ao criar empresa:', empresaError)
            return NextResponse.json(
              { error: 'Erro ao criar empresa' },
              { status: 500 }
            )
          }

          console.log('Empresa criada com sucesso. ID:', empresa.id)

          const ok = await updateUserModeAndEmpresa(supabaseAdmin as any, data.user.id, {
            mode: 'empresa',
            empresaId: empresa.id,
          })
          if (!ok) {
            console.error('Falha ao vincular empresa ao usuário (mode/empresa_id).', {
              userId: data.user.id,
              tenantId: existingUser.tenant_id,
              empresaId: empresa.id,
            })
            return NextResponse.json(
              { error: 'Erro ao vincular empresa ao usuário' },
              { status: 500 }
            )
          }
        } else {
          // garante modo pessoal explícito (idempotente)
          await updateUserModeAndEmpresa(supabaseAdmin as any, data.user.id, {
            mode: 'pessoal',
            empresaId: null,
          })
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
