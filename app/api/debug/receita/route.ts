import { NextResponse } from 'next/server'
import { processAction } from '@/lib/ai/actions'
import { supabaseAdmin } from '@/lib/db/client'

export async function POST(request: Request) {
  try {
    const { message, tenantId, userId } = await request.json()
    
    if (!message || !tenantId) {
      return NextResponse.json(
        { error: 'message e tenantId são obrigatórios' },
        { status: 400 }
      )
    }
    
    console.log('=== DEBUG RECEITA ===')
    console.log('Mensagem:', message)
    console.log('TenantId:', tenantId)
    
    // Busca o primeiro tenant se não fornecido
    let finalTenantId = tenantId
    if (!finalTenantId && supabaseAdmin) {
      const { data } = await supabaseAdmin
        .from('tenants')
        .select('id')
        .limit(1)
        .single()
      finalTenantId = data?.id || null
    }
    
    if (!finalTenantId) {
      return NextResponse.json(
        { error: 'Nenhum tenant encontrado' },
        { status: 400 }
      )
    }
    
    // Busca um userId se não fornecido (debug)
    let finalUserId = userId
    if (!finalUserId && supabaseAdmin) {
      const { data } = await supabaseAdmin
        .from('users')
        .select('id')
        .eq('tenant_id', finalTenantId)
        .limit(1)
        .single()
      finalUserId = data?.id || null
    }

    if (!finalUserId) {
      return NextResponse.json(
        { error: 'userId é obrigatório (ou não foi possível inferir)' },
        { status: 400 }
      )
    }

    console.log('Processando ação...')
    const result = await processAction(message, finalTenantId, finalUserId, null)
    
    console.log('Resultado:', JSON.stringify(result, null, 2))
    
    return NextResponse.json({
      success: result.success,
      message: result.message,
      data: result.data,
      logs: 'Verifique o console do servidor para logs detalhados'
    })
  } catch (error) {
    console.error('Erro no debug:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}
