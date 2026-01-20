import { NextRequest, NextResponse } from 'next/server'
import { getSessionContext } from '@/lib/utils/session-context'
import { getFinanceiroEmpresaByFuncionario, createFinanceiroEmpresa } from '@/lib/db/queries-empresa'

/**
 * GET - Lista pagamentos de um funcionário
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const ctx = await getSessionContext()

    if (!ctx || ctx.mode !== 'empresa' || !ctx.empresa_id) {
      return NextResponse.json({ error: 'Apenas disponível no modo empresa' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('startDate') || undefined
    const endDate = searchParams.get('endDate') || undefined

    const pagamentos = await getFinanceiroEmpresaByFuncionario(
      ctx.tenant_id,
      ctx.empresa_id,
      params.id,
      startDate,
      endDate
    )

    return NextResponse.json({ pagamentos })
  } catch (error: any) {
    console.error('Erro na API pagamentos GET:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

/**
 * POST - Registra um pagamento de salário
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const ctx = await getSessionContext()

    if (!ctx || ctx.mode !== 'empresa' || !ctx.empresa_id) {
      return NextResponse.json({ error: 'Apenas disponível no modo empresa' }, { status: 403 })
    }

    const body = await request.json()
    const { valor, data, observacao } = body

    if (!valor || Number(valor) <= 0) {
      return NextResponse.json({ error: 'Valor deve ser maior que zero' }, { status: 400 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Data é obrigatória' }, { status: 400 })
    }

    // Cria registro no financeiro_empresa
    const financeiro = await createFinanceiroEmpresa(
      ctx.tenant_id,
      ctx.empresa_id,
      Number(valor),
      observacao || `Pagamento de salário`,
      'Funcionários',
      String(data),
      null, // receipt_image_url
      'Salário', // subcategory
      { funcionario_id: params.id }, // metadata
      [], // tags
      'expense', // transaction_type
      null, // user_id
      params.id // funcionario_id
    )

    if (!financeiro) {
      console.error('Erro ao criar pagamento: financeiro retornou null')
      return NextResponse.json({ error: 'Erro ao registrar pagamento' }, { status: 500 })
    }

    // Verifica se o funcionario_id foi salvo corretamente
    const { supabaseAdmin } = await import('@/lib/db/client')
    if (supabaseAdmin && (financeiro as any).funcionario_id !== params.id) {
      console.log('Atualizando funcionario_id no registro criado...')
      const { error: updateError } = await supabaseAdmin
        .from('financeiro_empresa')
        .update({ funcionario_id: params.id })
        .eq('id', financeiro.id)
      
      if (updateError) {
        console.error('Erro ao atualizar funcionario_id:', updateError)
      } else {
        // Busca o registro atualizado
        const { data: updatedFinanceiro } = await supabaseAdmin
          .from('financeiro_empresa')
          .select('*')
          .eq('id', financeiro.id)
          .single()
        
        if (updatedFinanceiro) {
          return NextResponse.json({ pagamento: updatedFinanceiro }, { status: 201 })
        }
      }
    }

    return NextResponse.json({ pagamento: financeiro }, { status: 201 })
  } catch (error: any) {
    console.error('Erro na API pagamentos POST:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
