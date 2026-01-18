import { NextRequest, NextResponse } from 'next/server'
import { createServerClient, supabaseAdmin } from '@/lib/db/client'
import { getSessionContextFromUserId, getUserRowById } from '@/lib/db/user-profile'

/**
 * GET - Retorna dados do usuário autenticado
 */
export async function GET(request: NextRequest) {
  try {
    // Cria cliente Supabase com suporte a cookies
    const supabase = await createServerClient()
    
    // Obtém a sessão do cookie
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json(
        { error: 'Não autenticado' },
        { status: 401 }
      )
    }

    // Busca dados completos do usuário
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Erro de configuração' },
        { status: 500 }
      )
    }

    // Não pode quebrar a página de perfil: sempre devolve algo quando há sessão
    const meta: any = (session.user as any)?.user_metadata || {}

    let row: Awaited<ReturnType<typeof getUserRowById>> = null
    let ctx: Awaited<ReturnType<typeof getSessionContextFromUserId>> = null
    let tenantData: { id: string; name: string } | null = null

    try {
      row = await getUserRowById(supabaseAdmin as any, session.user.id)
    } catch (e) {
      console.error('api/auth/me: erro getUserRowById:', e)
    }

    try {
      ctx = await getSessionContextFromUserId(supabaseAdmin as any, session.user.id)
    } catch (e) {
      console.error('api/auth/me: erro getSessionContextFromUserId:', e)
    }

    try {
      const tenantId = row?.user?.tenant_id || ctx?.tenant_id || null
      if (tenantId) {
        const { data } = await supabaseAdmin
          .from('tenants')
          .select('id, name')
          .eq('id', tenantId)
          .maybeSingle()
        tenantData = data || null
      }
    } catch (e) {
      console.error('api/auth/me: erro tenant lookup:', e)
    }

    const fallbackUser = {
      id: session.user.id,
      email: session.user.email || '',
      name: meta?.name || null,
      whatsapp_number: meta?.whatsapp_number || '',
      role: (row?.user as any)?.role || 'user',
    }

    return NextResponse.json({
      user: {
        id: row?.user?.id || fallbackUser.id,
        email: row?.user?.email || fallbackUser.email,
        name: row?.user?.name ?? fallbackUser.name,
        whatsapp_number: row?.user?.whatsapp_number || fallbackUser.whatsapp_number,
        role: row?.user?.role || fallbackUser.role,
        tenant: tenantData || null,
        // Regra: empresa_id implica modo empresa (sem exigir passo extra no perfil)
        mode: ((ctx?.empresa_id || row?.user?.empresa_id || meta?.empresa_id)
          ? 'empresa'
          : (ctx?.mode || row?.user?.mode || meta?.mode || 'pessoal')) as any,
        empresa_id: ctx?.empresa_id || row?.user?.empresa_id || meta?.empresa_id || null,
        empresa_nome_fantasia: ctx?.empresa_nome_fantasia || null,
      },
      session,
    })
  } catch (error) {
    console.error('Erro ao buscar usuário:', error)
    // Em último caso, tenta responder sem quebrar o app (se houver sessão)
    return NextResponse.json({ error: 'Erro ao buscar dados' }, { status: 500 })
  }
}

/**
 * PATCH - Atualiza dados do usuário autenticado
 */
export async function PATCH(request: NextRequest) {
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
    const { name, whatsappNumber } = body

    // Atualiza na tabela de perfil (users/users_meugestor)
    const row = await getUserRowById(supabaseAdmin as any, session.user.id)
    if (row) {
      const updateData: any = {}
      if (name) updateData.name = name
      if (whatsappNumber) {
        // Normaliza o número (remove caracteres não numéricos)
        const normalized = whatsappNumber.replace(/\D/g, '')
        if (normalized.length < 10) {
          return NextResponse.json(
            { error: 'O número do WhatsApp deve ter pelo menos 10 dígitos' },
            { status: 400 }
          )
        }
        updateData.whatsapp_number = normalized
      }

      if (Object.keys(updateData).length > 0) {
        const { error } = await supabaseAdmin
          .from(row.table)
          .update(updateData)
          .eq('id', session.user.id)

        if (error) {
          console.error('Erro ao atualizar perfil:', error)
          return NextResponse.json(
            { error: 'Erro ao atualizar dados no perfil' },
            { status: 500 }
          )
        }
      }
    }

    // Atualiza também em auth.user_metadata (fallback canônico)
    try {
      const admin = (supabaseAdmin as any).auth?.admin
      if (admin?.updateUserById) {
        const metadataUpdate: any = { ...(session.user.user_metadata || {}) }
        if (name) metadataUpdate.name = name
        if (whatsappNumber) {
          metadataUpdate.whatsapp_number = whatsappNumber.replace(/\D/g, '')
        }

        if (name || whatsappNumber) {
          await admin.updateUserById(session.user.id, {
            user_metadata: metadataUpdate,
          })
        }
      }
    } catch (e) {
      console.warn('Falha ao atualizar metadata em auth.user_metadata (não bloqueante):', e)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error)
    return NextResponse.json({ error: 'Erro ao atualizar dados' }, { status: 500 })
  }
}
