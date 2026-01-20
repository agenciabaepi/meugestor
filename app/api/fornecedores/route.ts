import { NextRequest, NextResponse } from 'next/server'
import { getSessionContext } from '@/lib/utils/session-context'
import { getFornecedoresByEmpresa, createFornecedor } from '@/lib/db/queries-empresa'
import { normalizeText } from '@/lib/utils/normalize-text'

/**
 * GET - Lista todos os fornecedores da empresa
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await getSessionContext()

    if (!ctx || ctx.mode !== 'empresa' || !ctx.empresa_id) {
      return NextResponse.json({ error: 'Apenas disponível no modo empresa' }, { status: 403 })
    }

    const fornecedores = await getFornecedoresByEmpresa(ctx.tenant_id, ctx.empresa_id)

    return NextResponse.json({ fornecedores })
  } catch (error: any) {
    console.error('Erro na API fornecedores GET:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}

/**
 * POST - Cria um novo fornecedor
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getSessionContext()

    if (!ctx || ctx.mode !== 'empresa' || !ctx.empresa_id) {
      return NextResponse.json({ error: 'Apenas disponível no modo empresa' }, { status: 403 })
    }

    const body = await request.json()
    const { nome, telefone, email, endereco, cnpj, observacao } = body

    if (!nome || String(nome).trim().length === 0) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 })
    }

    const nomeOriginal = String(nome).trim()
    const nomeNormalizado = normalizeText(nomeOriginal)

    const fornecedor = await createFornecedor(
      ctx.tenant_id,
      ctx.empresa_id,
      nomeOriginal,
      nomeNormalizado,
      telefone || null,
      email || null,
      endereco || null,
      cnpj || null,
      observacao || null
    )

    if (!fornecedor) {
      return NextResponse.json({ error: 'Erro ao criar fornecedor' }, { status: 500 })
    }

    return NextResponse.json({ fornecedor }, { status: 201 })
  } catch (error: any) {
    console.error('Erro na API fornecedores POST:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
