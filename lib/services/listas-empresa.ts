import {
  createListaEmpresa,
  findListasEmpresaByNameLike,
  findListasEmpresaByNormalizedNameLike,
  getListaEmpresaByName,
  getListasEmpresaByNormalizedName,
  setLastActiveListNameEmpresa,
} from '@/lib/db/queries-empresa'
import type { Lista } from '@/lib/db/types'
import { ValidationError } from '@/lib/utils/errors'
import { normalizeText } from '@/lib/utils/normalize-text'

function normalizeName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}

export function normalizeListName(name: string): string {
  return normalizeText(name)
}

export async function ensureListaEmpresaByName(
  tenantId: string,
  empresaId: string,
  listName: string,
  tipo: string = 'compras'
): Promise<Lista> {
  const nomeOriginal = normalizeName(listName)
  if (!nomeOriginal) throw new ValidationError('Nome da lista é obrigatório')

  const nomeNormalizado = normalizeListName(nomeOriginal)

  if (nomeNormalizado) {
    const matches = await getListasEmpresaByNormalizedName(tenantId, empresaId, nomeNormalizado, 2)
    if (matches.length >= 1) return matches[0]
  }

  if (nomeNormalizado) {
    const partial = await findListasEmpresaByNormalizedNameLike(tenantId, empresaId, nomeNormalizado, 10)
    if (partial.length === 1) return partial[0]
  }

  const exact = await getListaEmpresaByName(tenantId, empresaId, nomeOriginal)
  if (exact) return exact

  const candidates = await findListasEmpresaByNameLike(tenantId, empresaId, nomeOriginal, 10)
  if (candidates.length === 1) return candidates[0]

  const created = await createListaEmpresa(tenantId, empresaId, nomeOriginal, tipo, nomeNormalizado || null)
  if (!created) throw new ValidationError('Erro ao criar a lista')
  return created
}

export async function touchLastActiveListEmpresa(
  tenantId: string,
  empresaId: string,
  listName: string
): Promise<void> {
  const nome = normalizeName(listName)
  if (!nome) return
  await setLastActiveListNameEmpresa(tenantId, empresaId, nome)
}

