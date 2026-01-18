import type { Funcionario, SessionContext } from '@/lib/db/types'
import { ValidationError } from '@/lib/utils/errors'
import { normalizeText } from '@/lib/utils/normalize-text'
import {
  createFuncionario,
  getFuncionarioByNormalizedName,
  findFuncionariosByNormalizedNameLike,
} from '@/lib/db/queries-empresa'

function normalizeName(name: string): string {
  return String(name || '').trim().replace(/\s+/g, ' ')
}

export function normalizeFuncionarioName(name: string): string {
  return normalizeText(name)
}

export async function ensureFuncionarioByNameForContext(
  ctx: SessionContext,
  employeeNameRaw: string
): Promise<{ funcionario: Funcionario; created: boolean }> {
  if (ctx.mode !== 'empresa') {
    throw new ValidationError('Funcionários só existem no modo empresa.')
  }
  if (!ctx.empresa_id) {
    throw new ValidationError('Modo empresa sem empresa vinculada.')
  }

  const nome = normalizeName(employeeNameRaw)
  if (!nome) throw new ValidationError('Nome do funcionário é obrigatório')

  const nomeNormalizado = normalizeFuncionarioName(nome)
  if (!nomeNormalizado) throw new ValidationError('Nome do funcionário é obrigatório')

  const existing = await getFuncionarioByNormalizedName(ctx.tenant_id, ctx.empresa_id, nomeNormalizado)
  if (existing) return { funcionario: existing, created: false }

  const created = await createFuncionario(ctx.tenant_id, ctx.empresa_id, nome, nomeNormalizado)
  if (!created) throw new ValidationError('Erro ao cadastrar funcionário')

  return { funcionario: created, created: true }
}

/**
 * Extrai nome de funcionário de comandos explícitos (determinístico).
 * Exemplos:
 * - "cadastra um funcionario chamado Pedro Oliveira"
 * - "cria funcionario Pedro"
 * - "adiciona funcionario: João"
 */
export function extractEmployeeNameFromCreateCommand(message: string): string | null {
  const raw = String(message || '').trim()
  if (!raw) return null

  const reList: RegExp[] = [
    /\b(?:cadastr(?:a|e|ar)|cria|criar|adicione?|adiciona|novo)\s+(?:um\s+)?funcion[aá]rio\s+(?:pra\s+mim\s+)?(?:chamad[oa]\s+)?(.+?)\s*$/i,
    /\bfuncion[aá]rio\s*[:\-]\s*(.+?)\s*$/i,
  ]

  for (const re of reList) {
    const m = raw.match(re)
    if (!m) continue
    const name = normalizeName(m[1] || '')
      .replace(/^["'""'']+/, '')
      .replace(/["'""'']+$/, '')
      .trim()
    if (name) return name
  }
  return null
}

/**
 * Extrai nome de funcionário mencionado em uma frase de pagamento:
 * - "fiz o pagamento do Pedro Oliveira, 1500 reais"
 * - "paguei 2 mil para o funcionário Pedro"
 * - "salário do Pedro 1500"
 */
export function extractEmployeeNameFromPaymentText(message: string): string | null {
  const raw = String(message || '')
  if (!raw) return null

  // Padrões para detectar funcionário em pagamentos
  const patterns = [
    /\b(?:paguei|pagamento|sal[aá]rio)\s+(?:do|da|de)\s+(?:funcion[aá]rio\s+)?(.+?)(?:,|\s+|\d|reais|mil|$)/i,
    /\b(?:paguei|pagamento)\s+(?:\d+[.,]?\d*)\s*(?:reais?|mil|rs?|r\$)?\s+(?:para\s+o\s+)?(?:funcion[aá]rio\s+)?(.+?)(?:,|$|!|\.)/i,
    /\bfuncion[aá]rio\s+(.+?)(?:,|\s+|\d|reais|mil|$)/i,
    /\bdo\s+funcion[aá]rio\s+(.+?)(?:,|\s+|\d|reais|mil|$)/i,
  ]

  for (const pattern of patterns) {
    const m = raw.match(pattern)
    if (!m) continue
    const name = normalizeName(m[1] || '')
      .replace(/^["'""'']+/, '')
      .replace(/["'""'']+$/, '')
      .trim()
    // Remove palavras que indicam valor (reais, mil, etc) se ficaram no nome
    const cleaned = name.replace(/\s+(reais?|mil|rs?|r\$|para|ao|a|o)$/i, '').trim()
    if (cleaned && cleaned.length >= 2) return cleaned
  }
  return null
}

/**
 * Busca funcionário por nome (normalizado ou parcial).
 * Tenta primeiro por nome exato, depois parcial.
 */
export async function findFuncionarioByName(
  ctx: SessionContext,
  employeeNameRaw: string
): Promise<Funcionario | null> {
  if (ctx.mode !== 'empresa' || !ctx.empresa_id) return null

  const nomeNormalizado = normalizeFuncionarioName(employeeNameRaw)
  if (!nomeNormalizado) return null

  // Tenta busca exata primeiro
  const exact = await getFuncionarioByNormalizedName(ctx.tenant_id, ctx.empresa_id, nomeNormalizado)
  if (exact) return exact

  // Se não encontrou, tenta busca parcial
  const partial = await findFuncionariosByNormalizedNameLike(ctx.tenant_id, ctx.empresa_id, nomeNormalizado, 1)
  if (partial.length > 0) return partial[0]

  return null
}
