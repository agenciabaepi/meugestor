import {
  createLista,
  createListaItem,
  deleteListaItemByName,
  findListasByNameLike,
  findListasByNormalizedNameLike,
  getListaByName,
  getListasByNormalizedName,
  getListaItemByName,
  getListaItemByNormalizedName,
  getListaItens,
  setLastActiveListName,
  updateListaItemFields,
  updateListaItemChecked,
  updateListaItemStatus,
} from '../db/queries'
import type { Lista, ListaItem, ListaItemStatus } from '../db/types'
import { ValidationError } from '../utils/errors'
import { normalizeText } from '../utils/normalize-text'

export type ResolveListaResult =
  | { ok: true; lista: Lista }
  | { ok: false; reason: 'not_found' }
  | { ok: false; reason: 'ambiguous'; candidates: Lista[] }

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}

export function normalizeListName(name: string): string {
  return normalizeText(name)
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
  // Exibição: mantém capitalização simples, mas comparação é por nome_normalizado
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1)
}

export async function ensureListaByNameMeta(
  tenantId: string,
  listName: string,
  tipo: string = 'compras'
): Promise<{ lista: Lista; created: boolean }> {
  const nomeOriginal = normalizeName(listName)
  if (!nomeOriginal) throw new ValidationError('Nome da lista é obrigatório')

  const nomeNormalizado = normalizeListName(nomeOriginal)

  // REGRA DE OURO: buscar por nome_normalizado
  if (nomeNormalizado) {
    const matches = await getListasByNormalizedName(tenantId, nomeNormalizado, 2)
    if (matches.length >= 1) return { lista: matches[0], created: false }
  }

  // Compatibilidade (quando coluna não existe ainda): busca e compara por normalização em memória
  // (ainda respeita comparação semântica, só não depende do schema novo)
  if (nomeNormalizado) {
    const all = await findListasByNameLike(tenantId, nomeOriginal, 50)
    const found = all.find((l) => normalizeListName(String((l as any).nome_original || l.nome || '')) === nomeNormalizado) || null
    if (found) return { lista: found, created: false }
  }

  const created = await createLista(tenantId, nomeOriginal, tipo, nomeNormalizado || null)
  if (!created) throw new ValidationError('Erro ao criar a lista')
  return { lista: created, created: true }
}

export async function ensureListaByName(
  tenantId: string,
  listName: string,
  tipo: string = 'compras'
): Promise<Lista> {
  const { lista } = await ensureListaByNameMeta(tenantId, listName, tipo)
  return lista
}

export async function resolveListaByName(
  tenantId: string,
  listName: string
): Promise<ResolveListaResult> {
  const nomeOriginal = normalizeName(listName)
  if (!nomeOriginal) return { ok: false, reason: 'not_found' }

  const nomeNormalizado = normalizeListName(nomeOriginal)

  // Prioridade: match por nome_normalizado
  if (nomeNormalizado) {
    const byNorm = await getListasByNormalizedName(tenantId, nomeNormalizado, 10)
    if (byNorm.length === 1) return { ok: true, lista: byNorm[0] }
    if (byNorm.length > 1) return { ok: false, reason: 'ambiguous', candidates: byNorm }
  }

  // Busca parcial por nome_normalizado (ex: "iphone" deve achar "pelicula iphone")
  if (nomeNormalizado) {
    const partial = await findListasByNormalizedNameLike(tenantId, nomeNormalizado, 10)
    if (partial.length === 1) return { ok: true, lista: partial[0] }
    if (partial.length > 1) return { ok: false, reason: 'ambiguous', candidates: partial }
  }

  // Compatibilidade: fallback literal / parcial em nome (apenas se schema antigo)
  const exact = await getListaByName(tenantId, nomeOriginal)
  if (exact) return { ok: true, lista: exact }

  const candidates = await findListasByNameLike(tenantId, nomeOriginal, 10)
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
}): Promise<{ lista: Lista; item: ListaItem; created: boolean; alreadyExists: boolean }> {
  const listName = normalizeName(params.listName)
  const itemNameOriginal = normalizeName(params.itemName)
  if (!itemNameOriginal) throw new ValidationError('Item é obrigatório')
  const itemNameDisplay = canonicalItemName(itemNameOriginal)
  const itemNorm = normalizeText(itemNameOriginal)

  const lista = await ensureListaByName(params.tenantId, listName, 'compras')

  const existing =
    (itemNorm ? await getListaItemByNormalizedName(lista.id, itemNorm) : null) ||
    (await getListaItemByName(lista.id, itemNameDisplay))
  const quantidade =
    params.quantidade === null || params.quantidade === undefined
      ? null
      : typeof params.quantidade === 'number'
        ? String(params.quantidade)
        : normalizeName(String(params.quantidade))
  const unidade = params.unidade ? normalizeName(params.unidade) : null

  if (existing) {
    // Regra Alexa: não duplicar e não "reabrir" automaticamente; apenas informa que já existe
    return { lista, item: existing, created: false, alreadyExists: true }
  }

  const createdItem = await createListaItem(lista.id, itemNameDisplay, quantidade, unidade, 'pendente')
  if (!createdItem) throw new ValidationError('Erro ao adicionar item na lista')
  return { lista, item: createdItem, created: true, alreadyExists: false }
}

export async function removeItemFromList(params: {
  tenantId: string
  listName: string
  itemName: string
}): Promise<{ lista: Lista; removed: boolean }> {
  const listName = normalizeName(params.listName)
  const itemNameOriginal = normalizeName(params.itemName)
  if (!itemNameOriginal) throw new ValidationError('Item é obrigatório')
  const itemNorm = normalizeText(itemNameOriginal)
  const itemDisplay = canonicalItemName(itemNameOriginal)

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

  const existing =
    (itemNorm ? await getListaItemByNormalizedName(lista.id, itemNorm) : null) ||
    (await getListaItemByName(lista.id, itemDisplay))
  if (!existing) return { lista, removed: false }

  // Preferir deletar por nome original do registro (evita mismatch de normalização no fallback)
  const ok = await deleteListaItemByName(lista.id, existing.nome)
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
  const itemNorm = normalizeText(itemNameRaw)

  // UX estilo Alexa: se a lista não existir, cria (não pergunta, não bloqueia)
  const lista = await ensureListaByName(params.tenantId, listName, 'compras')

  // Busca por nome_normalizado quando disponível; fallback para scan/compare
  const byNorm = itemNorm ? await getListaItemByNormalizedName(lista.id, itemNorm) : null
  const itens = byNorm ? [] : await getListaItens(lista.id)
  const wantedKey = normalizeText(itemCanonical)
  const existing =
    byNorm ||
    itens.find((it) => normalizeText(it.nome_normalizado || it.nome_original || it.nome) === wantedKey) ||
    null

  // CASO A — item não existe: cria já como comprado
  if (!existing) {
    const createdItem = await createListaItem(lista.id, itemCanonical, null, null, 'comprado')
    if (!createdItem) throw new ValidationError('Erro ao marcar item como comprado')
    return { lista, item: createdItem, created: true, alreadyBought: false }
  }

  // CASO C — item já comprado
  const isBought = existing.checked === true || existing.status === 'comprado'
  if (isBought) {
    return { lista, item: existing, created: false, alreadyBought: true }
  }

  const updated =
    (await updateListaItemChecked(existing.id, lista.id, true)) ||
    (await updateListaItemStatus(existing.id, lista.id, 'comprado'))
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
    const checked = it.checked === true || it.status === 'comprado'
    if (checked) comprados.push(it)
    else pendentes.push(it)
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

export function formatListRawResponse(params: {
  listName: string
  pendentes: ListaItem[]
  comprados?: ListaItem[]
}): string {
  const listName = normalizeName(params.listName)
  const pendentes = params.pendentes || []
  const comprados = params.comprados || []

  // Formato UX: título + itens em linhas, sem texto interpretativo
  const title = `🛒 ${listName.toUpperCase()}`

  const lines: string[] = []
  const formatItem = (statusEmoji: string, item: ListaItem) => {
    const qty = parseQuantidadeUnidadeForReply(item)
    const suffix = qty ? ` (${qty})` : ''
    return `${statusEmoji} ${formatItemNameForReply(item.nome)}${suffix}`
  }

  for (const it of pendentes) {
    lines.push(formatItem('⬜', it))
  }
  for (const it of comprados) {
    lines.push(formatItem('✅', it))
  }

  if (lines.length === 0) {
    // Sem frase interpretativa, apenas um placeholder visual
    return `${title}\n\n—`
  }

  return `${title}\n\n${lines.join('\n')}`
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

