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
    // Importante: NÃO usar .single() aqui, porque pode mascarar casos com múltiplas linhas / erros de schema.
    if (supabaseAdmin) {
      const tryTables = ['users_meugestor', 'users'] as const
      for (const table of tryTables) {
        const { data, error } = await supabaseAdmin
          .from(table)
          .select('id')
          .eq('whatsapp_number', normalizedWhatsApp)
          .limit(1)

        if (error) continue // tabela não existe ou sem permissão; tenta próxima
        if (Array.isArray(data) && data.length > 0) {
          return NextResponse.json(
            { error: 'Este número do WhatsApp já está vinculado a outra conta. Faça login.' },
            { status: 409 }
          )
        }
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
      // O Supabase Auth devolve essa mensagem genérica quando um trigger/constraint falha (ex.: whatsapp duplicado em public.users)
      if (typeof error.message === 'string' && error.message.includes('Database error saving new user')) {
        return NextResponse.json(
          { error: 'Não foi possível criar a conta. Esse WhatsApp já está cadastrado ou houve um erro no perfil. Tente fazer login.' },
          { status: 409 }
        )
      }
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
      let existingUserTable: (typeof tryTables)[number] | null = null
      let checkError: any = null
      for (const table of tryTables) {
        const res = await supabaseAdmin
          .from(table)
          .select('id, whatsapp_number, tenant_id')
          .eq('id', data.user.id)
          .single()
        existingUser = res.data
        checkError = res.error
        if (!res.error && res.data) {
          existingUserTable = table
          break
        }
      }

      if (checkError || !existingUser) {
        console.error('Erro: Registro não foi criado na tabela users pelo trigger:', checkError)
        // Tenta criar manualmente se o trigger falhou
        // (Mas isso não deveria acontecer se o trigger estiver funcionando)
      } else {
        console.log('Registro encontrado (perfil):', existingUser, { table: existingUserTable })
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

          // Vinculação determinística: atualiza a mesma tabela onde o perfil foi encontrado.
          // Se não conseguir (colunas ausentes), falha com mensagem clara (e tenta desfazer a empresa criada).
          const profileTable = existingUserTable || 'users'
          let linked = false
          try {
            const upd = await supabaseAdmin
              .from(profileTable)
              .update({ mode: 'empresa', empresa_id: empresa.id })
              .eq('id', data.user.id)
              .select('id, mode, empresa_id')
              .single()
            if (!upd.error && upd.data?.mode === 'empresa' && upd.data?.empresa_id) linked = true
            if (upd.error) console.error('Erro ao atualizar perfil com contexto empresa:', upd.error, { profileTable })
          } catch (e) {
            console.error('Exceção ao atualizar perfil com contexto empresa:', e, { profileTable })
          }
          
          // CRÍTICO: Atualiza user_session_context também para garantir que o contexto seja reconhecido imediatamente
          if (linked && existingUser) {
            try {
              const ctxUpd = await supabaseAdmin
                .from('user_session_context')
                .upsert(
                  {
                    user_id: data.user.id,
                    tenant_id: existingUser.tenant_id,
                    mode: 'empresa',
                    empresa_id: empresa.id,
                  },
                  { onConflict: 'user_id' }
                )
              if (ctxUpd.error) {
                console.warn('Aviso: Falha ao atualizar user_session_context (não bloqueante):', ctxUpd.error)
              } else {
                console.log('user_session_context atualizado com sucesso durante registro')
              }
            } catch (e) {
              console.warn('Exceção ao atualizar user_session_context (não bloqueante):', e)
            }
          }

          if (!linked) {
            // Mantém fallback em metadata (para não perder a vinculação), mas não trata como "sucesso silencioso":
            // se o banco não persistiu, retornamos erro para forçar correção de ambiente/migration.
            try {
              const admin = (supabaseAdmin as any).auth?.admin
              if (admin?.updateUserById) {
                await admin.updateUserById(data.user.id, {
                  user_metadata: {
                    ...(data.user.user_metadata || {}),
                    mode: 'empresa',
                    empresa_id: empresa.id,
                  },
                })
              }
            } catch (e) {
              console.error('Falha ao salvar fallback em auth.user_metadata:', e)
            }

            // best-effort cleanup para não deixar empresa órfã
            try {
              await supabaseAdmin.from('empresas').delete().eq('id', empresa.id)
            } catch {
              // ignore
            }

            return NextResponse.json(
              {
                error:
                  'Não foi possível vincular a empresa ao usuário (mode/empresa_id). Verifique se as migrations 018/019 foram aplicadas no Supabase e se a tabela de perfil possui as colunas.',
              },
              { status: 500 }
            )
          }

          // Mesmo quando vinculou com sucesso, grava também em auth.user_metadata (fallback canônico para outros componentes)
          try {
            const admin = (supabaseAdmin as any).auth?.admin
            if (admin?.updateUserById) {
              await admin.updateUserById(data.user.id, {
                user_metadata: {
                  ...(data.user.user_metadata || {}),
                  mode: 'empresa',
                  empresa_id: empresa.id,
                },
              })
            }
          } catch {
            // ignore
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
