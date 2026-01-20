import type { Fornecedor, SessionContext } from '@/lib/db/types'
import { ValidationError } from '@/lib/utils/errors'
import { normalizeText } from '@/lib/utils/normalize-text'
import { createFornecedor, getFornecedorByNormalizedName } from '@/lib/db/queries-empresa'

function normalizeName(name: string): string {
  return String(name || '').trim().replace(/\s+/g, ' ')
}

export function normalizeFornecedorName(name: string): string {
  return normalizeText(name)
}

export async function ensureFornecedorByNameForContext(
  ctx: SessionContext,
  supplierNameRaw: string
): Promise<{ fornecedor: Fornecedor; created: boolean }> {
  if (ctx.mode !== 'empresa') {
    throw new ValidationError('Fornecedores só existem no modo empresa.')
  }
  if (!ctx.empresa_id) {
    throw new ValidationError('Modo empresa sem empresa vinculada.')
  }

  const nome = normalizeName(supplierNameRaw)
  if (!nome) throw new ValidationError('Nome do fornecedor é obrigatório')

  const nomeNormalizado = normalizeFornecedorName(nome)
  if (!nomeNormalizado) throw new ValidationError('Nome do fornecedor é obrigatório')

  const existing = await getFornecedorByNormalizedName(ctx.tenant_id, ctx.empresa_id, nomeNormalizado)
  if (existing) return { fornecedor: existing, created: false }

  const created = await createFornecedor(ctx.tenant_id, ctx.empresa_id, nome, nomeNormalizado, null, null, null, null)
  if (!created) throw new ValidationError('Erro ao cadastrar fornecedor')

  return { fornecedor: created, created: true }
}

/**
 * Extrai nome de fornecedor de comandos explícitos (determinístico).
 * Exemplos:
 * - "cadastra um fornecedor chamado Megamix"
 * - "cria fornecedor megamix"
 * - "adiciona fornecedor: Megamix"
 */
export function extractSupplierNameFromCreateCommand(message: string): string | null {
  const raw = String(message || '').trim()
  if (!raw) return null

  const reList: RegExp[] = [
    /\b(?:cadastr(?:a|e|ar)|cria|criar|adicione?|adiciona|novo)\s+(?:um\s+)?fornecedor\s+(?:pra\s+mim\s+)?(?:chamad[oa]\s+)?(.+?)\s*$/i,
    /\bfornecedor\s*[:\-]\s*(.+?)\s*$/i,
  ]

  for (const re of reList) {
    const m = raw.match(re)
    if (!m) continue
    const name = normalizeName(m[1] || '')
      .replace(/^["'“”‘’]+/, '')
      .replace(/["'“”‘’]+$/, '')
      .trim()
    if (name) return name
  }
  return null
}

/**
 * Extrai fornecedor mencionado dentro de uma frase de gasto:
 * - "gastei 50 reais com tinta no fornecedor Megamix"
 * - "paguei 200 no fornecedor megamix"
 */
export function extractSupplierNameFromExpenseText(message: string): string | null {
  const raw = String(message || '')
  if (!raw) return null

  const m =
    raw.match(/\bno\s+fornecedor\s+(.+?)(?:[.,;!\n]|$)/i) ||
    raw.match(/\bfornecedor\s+(.+?)(?:[.,;!\n]|$)/i)

  if (!m) return null
  const name = normalizeName(m[1] || '')
    .replace(/^["'“”‘’]+/, '')
    .replace(/["'“”‘’]+$/, '')
    .trim()
  return name || null
}

