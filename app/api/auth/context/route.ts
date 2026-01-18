import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseAdmin } from '@/lib/db/client'
import { getUserRowById, updateUserModeAndEmpresa } from '@/lib/db/user-profile'

type Mode = 'pessoal' | 'empresa'

/**
 * POST - Define contexto global do usuário (mode + empresa_id)
 * Persistência:
 * - users/users_meugestor (se existir colunas)
 * - user_session_context (se existir)
 * - auth.user_metadata (sempre, para fallback)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Erro de configuração' }, { status: 500 })
    }

    const body = await request.json()
    const mode: Mode = body?.mode === 'empresa' ? 'empresa' : 'pessoal'
    const empresaId: string | null = body?.empresaId ? String(body.empresaId) : null

    if (mode === 'empresa' && !empresaId) {
      return NextResponse.json({ error: 'empresaId é obrigatório no modo empresa' }, { status: 400 })
    }

    // Descobre tenant_id para validações (robusto: users_meugestor vs users)
    let row: Awaited<ReturnType<typeof getUserRowById>> = null
    let tenantId: string | null = null

    try {
      row = await getUserRowById(supabaseAdmin as any, session.user.id)
      tenantId = row?.user?.tenant_id || null
      console.log('[POST /api/auth/context] Usuário encontrado:', { hasRow: !!row, tenantId })
    } catch (e) {
      console.error('[POST /api/auth/context] Erro ao buscar usuário:', e)
    }

    // Fallback: tenta buscar tenant_id de auth.user_metadata
    if (!tenantId) {
      try {
        const meta: any = (session.user as any)?.user_metadata || {}
        // Se não tem tenant_id, tenta buscar da sessão ou criar um novo tenant
        // Por enquanto, retorna erro se não encontrar
        console.warn('[POST /api/auth/context] Tenant ID não encontrado, tentando fallback')
      } catch (e) {
        console.error('[POST /api/auth/context] Erro no fallback:', e)
      }
    }

    // Se ainda não encontrou tenant_id, tenta buscar diretamente das tabelas
    if (!tenantId) {
      try {
        for (const table of ['users_meugestor', 'users'] as const) {
          const { data, error } = await supabaseAdmin
            .from(table)
            .select('tenant_id')
            .eq('id', session.user.id)
            .maybeSingle()
          if (!error && data?.tenant_id) {
            tenantId = data.tenant_id
            console.log('[POST /api/auth/context] Tenant ID encontrado via fallback direto:', tenantId)
            break
          }
        }
      } catch (e) {
        console.error('[POST /api/auth/context] Erro ao buscar tenant_id diretamente:', e)
      }
    }

    if (!tenantId) {
      console.error('[POST /api/auth/context] Tenant ID não encontrado para userId:', session.user.id)
      return NextResponse.json(
        { error: 'Erro ao carregar tenant do usuário. Verifique se o usuário foi criado corretamente.' },
        { status: 500 }
      )
    }

    // Valida empresa pertence ao tenant
    if (mode === 'empresa' && empresaId) {
      const { data: emp, error: empErr } = await supabaseAdmin
        .from('empresas')
        .select('id')
        .eq('id', empresaId)
        .eq('tenant_id', tenantId)
        .maybeSingle()
      if (empErr || !emp?.id) {
        return NextResponse.json({ error: 'Empresa inválida para este tenant' }, { status: 400 })
      }
    }

    console.log('[POST /api/auth/context] Tentando atualizar contexto:', { userId: session.user.id, mode, empresaId })
    
    const ok = await updateUserModeAndEmpresa(supabaseAdmin as any, session.user.id, {
      mode,
      empresaId: mode === 'empresa' ? empresaId : null,
    })

    console.log('[POST /api/auth/context] Resultado da atualização:', ok)

    // SEMPRE tenta salvar em auth.user_metadata (mesmo que tenha conseguido ou não no banco)
    // Isso garante que o contexto está disponível mesmo se as tabelas falharem
    let savedInMetadata = false
    try {
      const admin = (supabaseAdmin as any).auth?.admin
      if (admin?.updateUserById) {
        await admin.updateUserById(session.user.id, {
          user_metadata: {
            ...(session.user.user_metadata || {}),
            mode,
            empresa_id: mode === 'empresa' ? empresaId : null,
          },
        })
        console.log('[POST /api/auth/context] ✅ Salvo em auth.user_metadata')
        savedInMetadata = true
      }
    } catch (e) {
      console.error('[POST /api/auth/context] Erro ao salvar em auth.user_metadata:', e)
    }

    // Se não conseguiu salvar em nenhum lugar, retorna erro
    if (!ok && !savedInMetadata) {
      return NextResponse.json(
        { error: 'Não foi possível salvar o contexto do usuário. Verifique se as migrations foram aplicadas corretamente.' },
        { status: 500 }
      )
    }

    // Se conseguiu salvar pelo menos em metadata, considera sucesso
    // Mas ainda tenta salvar nas tabelas para ter dados completos

    // Best-effort: user_session_context (se existir e ainda não foi salvo)
    if (!ok) {
      try {
        const { error: ctxError } = await supabaseAdmin
          .from('user_session_context')
          .upsert(
            {
              user_id: session.user.id,
              tenant_id: tenantId,
              mode,
              empresa_id: mode === 'empresa' ? empresaId : null,
            },
            { onConflict: 'user_id' }
          )
        if (!ctxError) {
          console.log('[POST /api/auth/context] ✅ Salvo em user_session_context como fallback adicional')
        } else {
          console.warn('[POST /api/auth/context] Erro ao salvar em user_session_context:', ctxError.message)
        }
      } catch (e) {
        console.warn('[POST /api/auth/context] Exceção ao salvar em user_session_context:', e)
      }
    }

    return NextResponse.json({ success: true, savedInMetadata, savedInTables: ok })
  } catch (error) {
    console.error('Erro ao definir contexto do usuário:', error)
    return NextResponse.json({ error: 'Erro ao salvar contexto' }, { status: 500 })
  }
}

