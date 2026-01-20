import { NextRequest, NextResponse } from 'next/server'
import { getSessionContext } from '@/lib/utils/session-context'
import { getCategoriasEmpresa } from '@/lib/db/queries-empresa'

/**
 * GET - Retorna as categorias válidas para o modo atual (pessoal ou empresa)
 */
export async function GET(request: NextRequest) {
  try {
    const ctx = await getSessionContext()
    
    if (!ctx) {
      return NextResponse.json({ error: 'Erro ao carregar contexto' }, { status: 500 })
    }

    // Categorias do modo pessoal
    const categoriasPessoal = [
      'Alimentação',
      'Moradia',
      'Saúde',
      'Transporte',
      'Educação',
      'Lazer e Entretenimento',
      'Compras Pessoais',
      'Assinaturas e Serviços',
      'Financeiro e Obrigações',
      'Impostos e Taxas',
      'Pets',
      'Doações e Presentes',
      'Trabalho e Negócios',
      'Outros',
    ]

    // Se for modo empresa, busca categorias da empresa
    if (ctx.mode === 'empresa' && ctx.empresa_id) {
      try {
        const categoriasEmpresa = await getCategoriasEmpresa(ctx.tenant_id, ctx.empresa_id)
        return NextResponse.json({
          categorias: categoriasEmpresa.map((c) => ({
            nome: c.nome,
            tipo: c.tipo,
            is_default: c.is_default,
          })),
        })
      } catch (error) {
        console.error('Erro ao buscar categorias da empresa:', error)
        // Fallback para categorias pessoais
        return NextResponse.json({ categorias: categoriasPessoal.map((n) => ({ nome: n })) })
      }
    }

    // Modo pessoal: retorna categorias fixas
    return NextResponse.json({
      categorias: categoriasPessoal.map((nome) => ({ nome })),
    })
  } catch (error: any) {
    console.error('Erro na API categorias:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
