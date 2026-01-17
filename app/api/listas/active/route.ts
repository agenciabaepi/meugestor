import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedTenantId } from '@/lib/utils/auth'
import { setLastActiveListName } from '@/lib/db/queries'

export async function POST(request: NextRequest) {
  try {
    const tenantId = await getAuthenticatedTenantId()
    if (!tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const listName = typeof body?.listName === 'string' ? body.listName.trim() : ''
    if (!listName) {
      return NextResponse.json({ error: 'listName é obrigatório' }, { status: 400 })
    }

    await setLastActiveListName(tenantId, listName)
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Erro em POST /api/listas/active:', error)
    return NextResponse.json({ error: 'Erro ao salvar lista ativa' }, { status: 500 })
  }
}

