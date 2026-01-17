import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedTenantId } from '@/lib/utils/auth'
import { deleteListaById, getListaById } from '@/lib/db/queries'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ listId: string }> }
) {
  try {
    const tenantId = await getAuthenticatedTenantId()
    if (!tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { listId } = await params
    const listaId = String(listId || '').trim()
    if (!listaId) {
      return NextResponse.json({ error: 'listId é obrigatório' }, { status: 400 })
    }

    // Confere se pertence ao tenant (melhor mensagem e evita deletar errado)
    const lista = await getListaById(tenantId, listaId)
    if (!lista) {
      return NextResponse.json({ error: 'Lista não encontrada' }, { status: 404 })
    }

    const ok = await deleteListaById(tenantId, listaId)
    if (!ok) {
      return NextResponse.json({ error: 'Erro ao apagar lista' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, deleted: { id: lista.id, nome: lista.nome } })
  } catch (error) {
    console.error('Erro em DELETE /api/listas/[listId]:', error)
    return NextResponse.json({ error: 'Erro ao apagar lista' }, { status: 500 })
  }
}

