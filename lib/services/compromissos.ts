import {
  createCompromisso,
  getCompromissosByTenant,
} from '../db/queries'
import { isValidDate } from '../utils/validation'
import { ValidationError } from '../utils/errors'
import type { Compromisso } from '../db/types'

export interface CreateCompromissoInput {
  tenantId: string
  title: string
  scheduledAt: string
  description?: string | null
}

/**
 * Cria um novo compromisso
 */
export async function createCompromissoRecord(
  input: CreateCompromissoInput
): Promise<Compromisso> {
  // Validações
  if (!input.title || input.title.trim().length === 0) {
    throw new ValidationError('Título é obrigatório')
  }

  if (!isValidDate(input.scheduledAt)) {
    throw new ValidationError('Data/hora agendada inválida')
  }

  // Cria o compromisso
  const compromisso = await createCompromisso(
    input.tenantId,
    input.title.trim(),
    input.scheduledAt,
    input.description?.trim() || null
  )

  if (!compromisso) {
    throw new ValidationError('Erro ao criar compromisso')
  }

  return compromisso
}

/**
 * Obtém compromissos de um tenant
 */
export async function getCompromissosRecords(
  tenantId: string,
  startDate?: string,
  endDate?: string
): Promise<Compromisso[]> {
  return getCompromissosByTenant(tenantId, startDate, endDate)
}

/**
 * Obtém compromissos futuros de um tenant
 */
export async function getUpcomingCompromissos(
  tenantId: string,
  limit: number = 10
): Promise<Compromisso[]> {
  const now = new Date().toISOString()
  const compromissos = await getCompromissosByTenant(tenantId, now)
  return compromissos.slice(0, limit)
}

/**
 * Obtém compromissos do dia
 */
export async function getTodayCompromissos(
  tenantId: string
): Promise<Compromisso[]> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  return getCompromissosByTenant(
    tenantId,
    today.toISOString(),
    tomorrow.toISOString()
  )
}
