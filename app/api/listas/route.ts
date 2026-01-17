import { NextRequest, NextResponse } from 'next/server'
import { getSessionContext } from '@/lib/utils/session-context'
import { getListasByTenant, getTenantContext, setLastActiveListName } from '@/lib/db/queries'
import { getEmpresaContext, getListasEmpresaByTenant, setLastActiveListNameEmpresa } from '@/lib/db/queries-empresa'
import { ensureListaByName, touchLastActiveList } from '@/lib/services/listas'
import { ensureListaEmpresaByName, touchLastActiveListEmpresa } from '@/lib/services/listas-empresa'
import { ValidationError } from '@/lib/utils/errors'

export async function GET() {
  try {
    const ctx = await getSessionContext()
    if (!ctx) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    if (ctx.mode === 'empresa') {
      if (!ctx.empresa_id) {
        return NextResponse.json({ error: 'Usuário em modo empresa sem empresa vinculada' }, { status: 400 })
      }

      const listas = await getListasEmpresaByTenant(ctx.tenant_id, ctx.empresa_id, null, 100)
      const ectx = await getEmpresaContext(ctx.tenant_id, ctx.empresa_id)
      let activeListName = (ectx as any)?.last_active_list_name || null

      if (activeListName && !listas.some((l) => l.nome === activeListName)) {
        activeListName = null
        await setLastActiveListNameEmpresa(ctx.tenant_id, ctx.empresa_id, null)
      }

      if (!activeListName) {
        const compras = listas.filter(l => String(l.tipo) === 'compras')
        if (compras.length === 1) {
          activeListName = compras[0].nome
          await setLastActiveListNameEmpresa(ctx.tenant_id, ctx.empresa_id, activeListName)
        }
      }

      return NextResponse.json({ listas, activeListName })
    }

    const listas = await getListasByTenant(ctx.tenant_id, null, 100)
    const tctx = await getTenantContext(ctx.tenant_id)
    let activeListName = tctx?.last_active_list_name || null

    // Se a lista ativa não existe mais (ex: apagada), corrige automaticamente.
    if (activeListName && !listas.some((l) => l.nome === activeListName)) {
      activeListName = null
      await setLastActiveListName(ctx.tenant_id, null)
    }

    // Se não houver lista ativa e existir apenas 1 lista de compras, define automaticamente.
    if (!activeListName) {
      const compras = listas.filter(l => String(l.tipo) === 'compras')
      if (compras.length === 1) {
        activeListName = compras[0].nome
        await setLastActiveListName(ctx.tenant_id, activeListName)
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
    const ctx = await getSessionContext()
    if (!ctx) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const nome = typeof body?.nome === 'string' ? body.nome.trim() : ''
    const tipo = typeof body?.tipo === 'string' ? body.tipo.trim() : 'compras'

    if (!nome) {
      return NextResponse.json({ error: 'Nome da lista é obrigatório' }, { status: 400 })
    }

    if (ctx.mode === 'empresa') {
      if (!ctx.empresa_id) {
        return NextResponse.json({ error: 'Usuário em modo empresa sem empresa vinculada' }, { status: 400 })
      }
      const lista = await ensureListaEmpresaByName(ctx.tenant_id, ctx.empresa_id, nome, tipo)
      await touchLastActiveListEmpresa(ctx.tenant_id, ctx.empresa_id, lista.nome)
      return NextResponse.json({ lista })
    }

    const lista = await ensureListaByName(ctx.tenant_id, nome, tipo)
    await touchLastActiveList(ctx.tenant_id, lista.nome)

    return NextResponse.json({ lista })
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Erro em POST /api/listas:', error)
    return NextResponse.json({ error: 'Erro ao criar lista' }, { status: 500 })
  }
}

