import {
  createLista,
  createListaItem,
  deleteListaItemByName,
  findListasByNameLike,
  getListaByName,
  getListaItemByName,
  getListaItens,
  setLastActiveListName,
  updateListaItemFields,
  updateListaItemStatus,
} from '../db/queries'
import type { Lista, ListaItem, ListaItemStatus } from '../db/types'
import { ValidationError } from '../utils/errors'

export type ResolveListaResult =
  | { ok: true; lista: Lista }
  | { ok: false; reason: 'not_found' }
  | { ok: false; reason: 'ambiguous'; candidates: Lista[] }

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}

function normalizeForCompare(input: string): string {
  const s = normalizeName(input)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
  // plural simples: remove "s" final (ex: leite/leites)
  if (s.length > 3 && s.endsWith('s') && !s.endsWith('ss')) {
    return s.slice(0, -1)
  }
  return s
}

function canonicalItemName(input: string): string {
  const trimmed = normalizeName(input)
  if (!trimmed) return trimmed
  // Usa a forma normalizada para evitar duplicação por plural/case
  const base = normalizeForCompare(trimmed)
  return base.charAt(0).toUpperCase() + base.slice(1)
}

export async function ensureListaByName(
  tenantId: string,
  listName: string,
  tipo: string = 'compras'
): Promise<Lista> {
  const nome = normalizeName(listName)
  if (!nome) throw new ValidationError('Nome da lista é obrigatório')

  const existing = await getListaByName(tenantId, nome)
  if (existing) return existing

  const created = await createLista(tenantId, nome, tipo)
  if (!created) throw new ValidationError('Erro ao criar a lista')
  return created
}

export async function resolveListaByName(
  tenantId: string,
  listName: string
): Promise<ResolveListaResult> {
  const nome = normalizeName(listName)
  if (!nome) return { ok: false, reason: 'not_found' }

  const exact = await getListaByName(tenantId, nome)
  if (exact) return { ok: true, lista: exact }

  const candidates = await findListasByNameLike(tenantId, nome, 10)
  if (candidates.length === 1) return { ok: true, lista: candidates[0] }
  if (candidates.length > 1) return { ok: false, reason: 'ambiguous', candidates }
  return { ok: false, reason: 'not_found' }
}

export async function touchLastActiveList(tenantId: string, listName: string): Promise<void> {
  const nome = normalizeName(listName)
  if (!nome) return
  await setLastActiveListName(tenantId, nome)
}

export async function addItemToList(params: {
  tenantId: string
  listName: string
  itemName: string
  quantidade?: string | number | null
  unidade?: string | null
}): Promise<{ lista: Lista; item: ListaItem; created: boolean; wasAlreadyPending: boolean }> {
  const listName = normalizeName(params.listName)
  const itemName = canonicalItemName(params.itemName)
  if (!itemName) throw new ValidationError('Item é obrigatório')

  const lista = await ensureListaByName(params.tenantId, listName, 'compras')

  const existing = await getListaItemByName(lista.id, itemName)
  const quantidade =
    params.quantidade === null || params.quantidade === undefined
      ? null
      : typeof params.quantidade === 'number'
        ? String(params.quantidade)
        : normalizeName(String(params.quantidade))
  const unidade = params.unidade ? normalizeName(params.unidade) : null

  if (existing) {
    if (existing.status === 'pendente') {
      // Não duplicar item pendente
      return { lista, item: existing, created: false, wasAlreadyPending: true }
    }
    // Se estava comprado e o usuário adicionou de novo, volta para pendente (e atualiza qtd/unidade se vierem)
    const updated = await updateListaItemFields(existing.id, lista.id, {
      status: 'pendente',
      ...(quantidade !== null ? { quantidade } : {}),
      ...(unidade !== null ? { unidade } : {}),
    })
    if (!updated) throw new ValidationError('Erro ao atualizar o item')
    return { lista, item: updated, created: false, wasAlreadyPending: false }
  }

  const createdItem = await createListaItem(lista.id, itemName, quantidade, unidade, 'pendente')
  if (!createdItem) throw new ValidationError('Erro ao adicionar item na lista')
  return { lista, item: createdItem, created: true, wasAlreadyPending: false }
}

export async function removeItemFromList(params: {
  tenantId: string
  listName: string
  itemName: string
}): Promise<{ lista: Lista; removed: boolean }> {
  const listName = normalizeName(params.listName)
  const itemName = canonicalItemName(params.itemName)
  if (!itemName) throw new ValidationError('Item é obrigatório')

  const resolved = await resolveListaByName(params.tenantId, listName)
  if (!resolved.ok) {
    if (resolved.reason === 'ambiguous') {
      throw new ValidationError(
        `Qual lista? ${resolved.candidates.map(l => l.nome).slice(0, 5).join(', ')}.`
      )
    }
    throw new ValidationError(`Não achei a lista "${listName}".`)
  }
  const lista = resolved.lista

  const existing = await getListaItemByName(lista.id, itemName)
  if (!existing) return { lista, removed: false }

  const ok = await deleteListaItemByName(lista.id, itemName)
  return { lista, removed: ok }
}

export async function markItemDoneInList(params: {
  tenantId: string
  listName: string
  itemName: string
}): Promise<{ lista: Lista; item: ListaItem; created: boolean; alreadyBought: boolean }> {
  const listName = normalizeName(params.listName)
  const itemNameRaw = normalizeName(params.itemName)
  if (!itemNameRaw) throw new ValidationError('Item é obrigatório')
  const itemCanonical = canonicalItemName(itemNameRaw)

  // UX estilo Alexa: se a lista não existir, cria (não pergunta, não bloqueia)
  const lista = await ensureListaByName(params.tenantId, listName, 'compras')

  // Comparação case-insensitive + trim + plural simples
  const wantedKey = normalizeForCompare(itemCanonical)
  const itens = await getListaItens(lista.id)
  const existing = itens.find((it) => normalizeForCompare(it.nome) === wantedKey) || null

  // CASO A — item não existe: cria já como comprado
  if (!existing) {
    const createdItem = await createListaItem(lista.id, itemCanonical, null, null, 'comprado')
    if (!createdItem) throw new ValidationError('Erro ao marcar item como comprado')
    return { lista, item: createdItem, created: true, alreadyBought: false }
  }

  // CASO C — item já comprado
  if (existing.status === 'comprado') {
    return { lista, item: existing, created: false, alreadyBought: true }
  }

  const updated = await updateListaItemStatus(existing.id, lista.id, 'comprado')
  if (!updated) throw new ValidationError('Erro ao marcar item como comprado')
  // CASO B — existia pendente e foi marcado como comprado
  return { lista, item: updated, created: false, alreadyBought: false }
}

export async function getListView(params: {
  tenantId: string
  listName: string
}): Promise<{
  lista: Lista
  pendentes: ListaItem[]
  comprados: ListaItem[]
}> {
  const listName = normalizeName(params.listName)
  const resolved = await resolveListaByName(params.tenantId, listName)
  if (!resolved.ok) {
    if (resolved.reason === 'ambiguous') {
      throw new ValidationError(
        `Qual lista? ${resolved.candidates.map(l => l.nome).slice(0, 5).join(', ')}.`
      )
    }
    throw new ValidationError(`Não achei a lista "${listName}".`)
  }

  const lista = resolved.lista
  const itens = await getListaItens(lista.id)

  const pendentes: ListaItem[] = []
  const comprados: ListaItem[] = []
  for (const it of itens) {
    if (it.status === 'pendente') pendentes.push(it)
    else comprados.push(it)
  }

  return { lista, pendentes, comprados }
}

export function formatListResponse(params: {
  listName: string
  pendentes: ListaItem[]
  comprados?: ListaItem[]
}): string {
  const listName = normalizeName(params.listName)
  const pendentes = params.pendentes || []
  const comprados = params.comprados || []

  if (pendentes.length === 0 && comprados.length === 0) {
    return `A lista ${listName} está vazia.`
  }

  if (pendentes.length === 0) {
    return `Na lista ${listName} não falta nada.`
  }

  const pendingNames = pendentes.map(i => i.nome)
  const base = `Na lista ${listName} ainda falta: ${pendingNames.join(', ')}.`
  if (comprados.length === 0) return base

  const boughtNames = comprados.map(i => i.nome).slice(0, 10)
  return `${base}${boughtNames.length ? ` Comprados: ${boughtNames.join(', ')}.` : ''}`
}

export function formatItemNameForReply(name: string): string {
  const v = normalizeName(name)
  if (!v) return v
  return v.charAt(0).toUpperCase() + v.slice(1)
}

export function parseQuantidadeUnidadeForReply(item: ListaItem): string | null {
  const qty = item.quantidade ? normalizeName(item.quantidade) : null
  const unit = item.unidade ? normalizeName(item.unidade) : null
  if (qty && unit) return `${qty} ${unit}`
  if (qty) return qty
  return null
}

