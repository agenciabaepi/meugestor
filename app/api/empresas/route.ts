import { NextResponse } from 'next/server'
import { createServerClient, supabaseAdmin } from '@/lib/db/client'
import { getUserRowById } from '@/lib/db/user-profile'
import { getAuthenticatedTenantId } from '@/lib/utils/auth'

/**
 * GET - Lista empresas do tenant do usuário autenticado
 */
export async function GET() {
  try {
    const supabase = await createServerClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session?.user?.id) {
      console.warn('[GET /api/empresas] Não autenticado')
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }
    if (!supabaseAdmin) {
      console.error('[GET /api/empresas] supabaseAdmin não configurado')
      return NextResponse.json({ empresas: [] })
    }

    // Usa função robusta para obter tenant_id (consistente com outros endpoints)
    let tenantId: string | null = null

    try {
      tenantId = await getAuthenticatedTenantId()
      console.log('[GET /api/empresas] Tenant ID obtido:', tenantId)
    } catch (e) {
      console.error('[GET /api/empresas] Erro ao obter tenant_id:', e)
      
      // Fallback: tenta buscar diretamente do perfil
      try {
        const row = await getUserRowById(supabaseAdmin as any, session.user.id)
        tenantId = row?.user?.tenant_id || null
        console.log('[GET /api/empresas] Tenant ID via fallback:', tenantId)
      } catch (e2) {
        console.error('[GET /api/empresas] Erro no fallback:', e2)
      }
    }

    // Se não encontrou tenant_id, retorna array vazio (não 401, pois o usuário está autenticado)
    if (!tenantId) {
      console.warn('[GET /api/empresas] Tenant ID não encontrado para userId:', session.user.id, '- retornando array vazio')
      return NextResponse.json({ empresas: [] })
    }

    const { data, error } = await supabaseAdmin
      .from('empresas')
      .select('id, nome_fantasia, razao_social, cnpj, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    console.log('[GET /api/empresas] Resultado da busca:', { count: data?.length || 0, error: error?.message })

    if (error) {
      // tolera ambiente sem tabela
      console.warn('[GET /api/empresas] Erro ao buscar empresas (tolerado):', error.message)
      return NextResponse.json({ empresas: [] })
    }

    return NextResponse.json({ empresas: data || [] })
  } catch (e) {
    console.error('[GET /api/empresas] Erro inesperado:', e)
    return NextResponse.json({ empresas: [] })
  }
}

