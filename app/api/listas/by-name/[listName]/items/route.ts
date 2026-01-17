import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedTenantId } from '@/lib/utils/auth'
import { addItemToList, getListView, markItemDoneInList, removeItemFromList, touchLastActiveList } from '@/lib/services/listas'
import { ValidationError } from '@/lib/utils/errors'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ listName: string }> }
) {
  try {
    const tenantId = await getAuthenticatedTenantId()
    if (!tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { listName } = await params
    const decoded = decodeURIComponent(listName || '')

    const view = await getListView({ tenantId, listName: decoded })
    await touchLastActiveList(tenantId, view.lista.nome)

    return NextResponse.json({ view })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    console.error('Erro em GET /api/listas/by-name/[listName]/items:', error)
    return NextResponse.json({ error: 'Erro ao buscar itens' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ listName: string }> }
) {
  try {
    const tenantId = await getAuthenticatedTenantId()
    if (!tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { listName } = await params
    const decoded = decodeURIComponent(listName || '')

    const body = await request.json().catch(() => ({}))
    const itemName = typeof body?.itemName === 'string' ? body.itemName.trim() : ''
    const quantidade = body?.quantidade ?? null
    const unidade = typeof body?.unidade === 'string' ? body.unidade.trim() : null

    if (!itemName) {
      return NextResponse.json({ error: 'itemName é obrigatório' }, { status: 400 })
    }

    const result = await addItemToList({
      tenantId,
      listName: decoded,
      itemName,
      quantidade,
      unidade,
    })
    await touchLastActiveList(tenantId, result.lista.nome)

    return NextResponse.json({ result })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Erro em POST /api/listas/by-name/[listName]/items:', error)
    return NextResponse.json({ error: 'Erro ao adicionar item' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ listName: string }> }
) {
  try {
    const tenantId = await getAuthenticatedTenantId()
    if (!tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const { listName } = await params
    const decoded = decodeURIComponent(listName || '')

    const body = await request.json().catch(() => ({}))
    const itemName = typeof body?.itemName === 'string' ? body.itemName.trim() : ''
    const action = typeof body?.action === 'string' ? body.action : 'mark_done'

    if (!itemName) {
      return NextResponse.json({ error: 'itemName é obrigatório' }, { status: 400 })
    }

    if (action === 'remove') {
      const result = await removeItemFromList({ tenantId, listName: decoded, itemName })
      await touchLastActiveList(tenantId, result.lista.nome)
      return NextResponse.json({ result })
    }

    const result = await markItemDoneInList({ tenantId, listName: decoded, itemName })
    await touchLastActiveList(tenantId, result.lista.nome)
    return NextResponse.json({ result })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Erro em PATCH /api/listas/by-name/[listName]/items:', error)
    return NextResponse.json({ error: 'Erro ao atualizar item' }, { status: 500 })
  }
}

