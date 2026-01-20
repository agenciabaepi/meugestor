import { NextRequest, NextResponse } from 'next/server'
import { getSessionContext } from '@/lib/utils/session-context'
import { updateFornecedor, deleteFornecedor, getFornecedoresByEmpresa } from '@/lib/db/queries-empresa'
import { normalizeText } from '@/lib/utils/normalize-text'

/**
 * GET - Busca um fornecedor específico
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

    // Busca todos os fornecedores e encontra o específico
    const fornecedores = await getFornecedoresByEmpresa(ctx.tenant_id, ctx.empresa_id)
    const fornecedor = fornecedores.find((f) => f.id === params.id)

    if (!fornecedor) {
      return NextResponse.json({ error: 'Fornecedor não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ fornecedor })
  } catch (error: any) {
    console.error('Erro na API fornecedores GET [id]:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

/**
 * PATCH - Atualiza um fornecedor
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
    const { nome, telefone, email, endereco, cnpj, observacao } = body

    const updates: any = {}
    if (nome !== undefined) {
      updates.nome = String(nome).trim()
      updates.nomeNormalizado = normalizeText(updates.nome)
    }
    if (telefone !== undefined) updates.telefone = telefone || null
    if (email !== undefined) updates.email = email || null
    if (endereco !== undefined) updates.endereco = endereco || null
    if (cnpj !== undefined) updates.cnpj = cnpj || null
    if (observacao !== undefined) updates.observacao = observacao || null

    const fornecedor = await updateFornecedor(
      ctx.tenant_id,
      ctx.empresa_id,
      params.id,
      updates
    )

    if (!fornecedor) {
      return NextResponse.json({ error: 'Erro ao atualizar fornecedor' }, { status: 500 })
    }

    return NextResponse.json({ fornecedor })
  } catch (error: any) {
    console.error('Erro na API fornecedores PATCH:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

/**
 * DELETE - Remove um fornecedor
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

    const success = await deleteFornecedor(ctx.tenant_id, ctx.empresa_id, params.id)

    if (!success) {
      return NextResponse.json({ error: 'Erro ao excluir fornecedor' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Erro na API fornecedores DELETE:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
