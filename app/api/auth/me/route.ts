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
        mode: (ctx?.mode || meta?.mode || 'pessoal') as any,
        empresa_id: ctx?.empresa_id || meta?.empresa_id || null,
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
