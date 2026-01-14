import { NextRequest, NextResponse } from 'next/server'
import { getTenantCost, getTenantTokenUsage } from '@/lib/utils/cost-tracker'
import { supabase, validateSupabaseConfig } from '@/lib/db/client'

/**
 * GET - Obtém estatísticas de uso de um tenant
 */
export async function GET(request: NextRequest) {
  try {
    validateSupabaseConfig()
    // TODO: Obter tenant_id da sessão autenticada
    // Por enquanto, busca o primeiro tenant
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id')
      .limit(1)
      .single()

    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant não encontrado' },
        { status: 404 }
      )
    }

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Busca custos
    const custoMes = await getTenantCost(
      tenant.id,
      startOfMonth.toISOString()
    )

    const custoTotal = await getTenantCost(tenant.id)

    // Busca uso de tokens
    const tokensMes = await getTenantTokenUsage(
      tenant.id,
      startOfMonth.toISOString()
    )

    const tokensTotal = await getTenantTokenUsage(tenant.id)

    return NextResponse.json({
      tenantId: tenant.id,
      periodo: {
        mes: {
          custo: custoMes,
          tokens: tokensMes,
        },
        total: {
          custo: custoTotal,
          tokens: tokensTotal,
        },
      },
    })
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar estatísticas' },
      { status: 500 }
    )
  }
}
