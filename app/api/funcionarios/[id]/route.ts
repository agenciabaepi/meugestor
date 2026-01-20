import { NextRequest, NextResponse } from 'next/server'
import { getSessionContext } from '@/lib/utils/session-context'
import { updateFuncionario, deleteFuncionario, getFuncionariosByEmpresa } from '@/lib/db/queries-empresa'
import { normalizeText } from '@/lib/utils/normalize-text'

/**
 * GET - Busca um funcionário específico
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

    // Busca todos os funcionários e encontra o específico
    const funcionarios = await getFuncionariosByEmpresa(ctx.tenant_id, ctx.empresa_id)
    const funcionario = funcionarios.find((f) => f.id === params.id)

    if (!funcionario) {
      return NextResponse.json({ error: 'Funcionário não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ funcionario })
  } catch (error: any) {
    console.error('Erro na API funcionarios GET [id]:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

/**
 * PATCH - Atualiza um funcionário
 */
export async function PATCH(
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
    const { nome_original, cargo, salario_base, tipo, ativo, remuneracao_tipo, remuneracao_valor, remuneracao_regra } = body

    const updates: any = {}
    if (nome_original !== undefined) {
      updates.nome_original = String(nome_original).trim()
      updates.nome_normalizado = normalizeText(updates.nome_original)
    }
    if (cargo !== undefined) updates.cargo = cargo || null
    if (salario_base !== undefined) updates.salario_base = salario_base ? Number(salario_base) : null
    if (tipo !== undefined) updates.tipo = tipo || null
    if (remuneracao_tipo !== undefined) updates.remuneracao_tipo = remuneracao_tipo || null
    if (remuneracao_valor !== undefined) updates.remuneracao_valor = remuneracao_valor !== null ? Number(remuneracao_valor) : null
    if (remuneracao_regra !== undefined) updates.remuneracao_regra = remuneracao_regra || null
    if (ativo !== undefined) updates.ativo = Boolean(ativo)

    const funcionario = await updateFuncionario(
      ctx.tenant_id,
      ctx.empresa_id,
      params.id,
      updates
    )

    if (!funcionario) {
      return NextResponse.json({ error: 'Erro ao atualizar funcionário' }, { status: 500 })
    }

    return NextResponse.json({ funcionario })
  } catch (error: any) {
    console.error('Erro na API funcionarios PATCH:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

/**
 * DELETE - Remove um funcionário
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params
    const ctx = await getSessionContext()

    if (!ctx || ctx.mode !== 'empresa' || !ctx.empresa_id) {
      return NextResponse.json({ error: 'Apenas disponível no modo empresa' }, { status: 403 })
    }

    const success = await deleteFuncionario(ctx.tenant_id, ctx.empresa_id, params.id)

    if (!success) {
      return NextResponse.json({ error: 'Erro ao excluir funcionário' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Erro na API funcionarios DELETE:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
