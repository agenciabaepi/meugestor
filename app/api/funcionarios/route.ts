import { NextRequest, NextResponse } from 'next/server'
import { getSessionContext } from '@/lib/utils/session-context'
import { getFuncionariosByEmpresa, createFuncionario } from '@/lib/db/queries-empresa'
import { normalizeText } from '@/lib/utils/normalize-text'

/**
 * GET - Lista todos os funcionários da empresa
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await getSessionContext()

    if (!ctx || ctx.mode !== 'empresa' || !ctx.empresa_id) {
      return NextResponse.json({ error: 'Apenas disponível no modo empresa' }, { status: 403 })
    }

    const funcionarios = await getFuncionariosByEmpresa(ctx.tenant_id, ctx.empresa_id)

    return NextResponse.json({ funcionarios })
  } catch (error: any) {
    console.error('Erro na API funcionarios GET:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

/**
 * POST - Cria um novo funcionário
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getSessionContext()

    if (!ctx || ctx.mode !== 'empresa' || !ctx.empresa_id) {
      return NextResponse.json({ error: 'Apenas disponível no modo empresa' }, { status: 403 })
    }

    const body = await request.json()
    const { nome_original, cargo, salario_base, tipo, remuneracao_tipo, remuneracao_valor, remuneracao_regra } = body

    if (!nome_original || String(nome_original).trim().length === 0) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
    }

    const nomeOriginal = String(nome_original).trim()
    const nomeNormalizado = normalizeText(nomeOriginal)

    const funcionario = await createFuncionario(
      ctx.tenant_id,
      ctx.empresa_id,
      nomeOriginal,
      nomeNormalizado,
      cargo || null,
      salario_base ? Number(salario_base) : null,
      tipo || null,
      remuneracao_tipo || null,
      remuneracao_valor !== undefined && remuneracao_valor !== null ? Number(remuneracao_valor) : null,
      remuneracao_regra || null
    )

    if (!funcionario) {
      return NextResponse.json({ error: 'Erro ao criar funcionário' }, { status: 500 })
    }

    return NextResponse.json({ funcionario }, { status: 201 })
  } catch (error: any) {
    console.error('Erro na API funcionarios POST:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
