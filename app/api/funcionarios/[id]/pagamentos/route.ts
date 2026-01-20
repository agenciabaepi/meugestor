import { NextRequest, NextResponse } from 'next/server'
import { getSessionContext } from '@/lib/utils/session-context'
import { getFinanceiroEmpresaByFuncionario, getFuncionariosByEmpresa } from '@/lib/db/queries-empresa'
import { registrarPagamentoFuncionarioPorRegra } from '@/lib/services/pagamentos-funcionarios'

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
    const valor = body?.valor !== undefined ? Number(body.valor) : null
    const dataPagamento = body?.data ? String(body.data) : null
    const competenciaAno = body?.competencia_ano !== undefined ? Number(body.competencia_ano) : undefined
    const competenciaMes = body?.competencia_mes !== undefined ? Number(body.competencia_mes) : undefined
    const competenciaQuinzena =
      body?.competencia_quinzena === 1 || body?.competencia_quinzena === 2 ? body.competencia_quinzena : undefined
    const quantidadeDias = body?.quantidade_dias !== undefined ? Number(body.quantidade_dias) : undefined

    // Busca funcionário (contrato)
    const funcionarios = await getFuncionariosByEmpresa(ctx.tenant_id, ctx.empresa_id, true, 1000)
    const funcionario = funcionarios.find((f) => f.id === params.id)
    if (!funcionario) {
      return NextResponse.json({ error: 'Funcionário não encontrado' }, { status: 404 })
    }

    const result = await registrarPagamentoFuncionarioPorRegra(ctx, funcionario, {
      valorOverride: typeof valor === 'number' && valor > 0 ? valor : null,
      dataPagamento,
      competenciaAno,
      competenciaMes,
      competenciaQuinzena: competenciaQuinzena ?? null,
      quantidadeDias: typeof quantidadeDias === 'number' && quantidadeDias > 0 ? quantidadeDias : null,
      userId: null,
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: 400 })
    }

    // Backward compat: front usa `pagamento` como registro do financeiro
    return NextResponse.json(
      { pagamento: result.data?.financeiro, evento_pagamento: result.data?.pagamento, competencia: result.data?.competencia },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Erro na API pagamentos POST:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
