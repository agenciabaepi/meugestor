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
    const row = await getUserRowById(supabaseAdmin as any, session.user.id)
    const tenantId = row?.user?.tenant_id
    if (!tenantId) return NextResponse.json({ error: 'Erro ao carregar tenant do usuário' }, { status: 500 })

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

    const ok = await updateUserModeAndEmpresa(supabaseAdmin as any, session.user.id, {
      mode,
      empresaId: mode === 'empresa' ? empresaId : null,
    })

    if (!ok) {
      return NextResponse.json(
        { error: 'Não foi possível salvar o contexto do usuário. Verifique migrations/colunas.' },
        { status: 500 }
      )
    }

    // Fallback canônico (sempre): auth metadata
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
      }
    } catch {
      // ignore
    }

    // Best-effort: user_session_context (se existir)
    try {
      await supabaseAdmin
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
    } catch {
      // ignore
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao definir contexto do usuário:', error)
    return NextResponse.json({ error: 'Erro ao salvar contexto' }, { status: 500 })
  }
}

