import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedTenantId } from '@/lib/utils/auth'
import { getListasByTenant, getTenantContext, setLastActiveListName } from '@/lib/db/queries'
import { ensureListaByName, touchLastActiveList } from '@/lib/services/listas'
import { ValidationError } from '@/lib/utils/errors'

export async function GET() {
  try {
    const tenantId = await getAuthenticatedTenantId()
    if (!tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const listas = await getListasByTenant(tenantId, null, 100)
    const ctx = await getTenantContext(tenantId)
    let activeListName = ctx?.last_active_list_name || null

    // Se não houver lista ativa e existir apenas 1 lista de compras, define automaticamente.
    if (!activeListName) {
      const compras = listas.filter(l => String(l.tipo) === 'compras')
      if (compras.length === 1) {
        activeListName = compras[0].nome
        await setLastActiveListName(tenantId, activeListName)
      }
    }

    return NextResponse.json({ listas, activeListName })
  } catch (error) {
    console.error('Erro em GET /api/listas:', error)
    return NextResponse.json({ error: 'Erro ao buscar listas' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenantId = await getAuthenticatedTenantId()
    if (!tenantId) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const nome = typeof body?.nome === 'string' ? body.nome.trim() : ''
    const tipo = typeof body?.tipo === 'string' ? body.tipo.trim() : 'compras'

    if (!nome) {
      return NextResponse.json({ error: 'Nome da lista é obrigatório' }, { status: 400 })
    }

    const lista = await ensureListaByName(tenantId, nome, tipo)
    await touchLastActiveList(tenantId, lista.nome)

    return NextResponse.json({ lista })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Erro em POST /api/listas:', error)
    return NextResponse.json({ error: 'Erro ao criar lista' }, { status: 500 })
  }
}

