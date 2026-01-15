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
    console.error('Erro: Título vazio')
    throw new ValidationError('Título é obrigatório')
  }

  if (!input.scheduledAt) {
    console.error('Erro: scheduledAt não fornecido')
    throw new ValidationError('Data/hora agendada é obrigatória')
  }

  if (!isValidDate(input.scheduledAt)) {
    console.error('Erro: Data inválida:', input.scheduledAt)
    throw new ValidationError(`Data/hora agendada inválida: ${input.scheduledAt}`)
  }

  console.log('Criando compromisso com dados:', {
    tenantId: input.tenantId,
    title: input.title,
    scheduledAt: input.scheduledAt,
    description: input.description,
  })

  // Cria o compromisso
  const compromisso = await createCompromisso(
    input.tenantId,
    input.title.trim(),
    input.scheduledAt,
    input.description?.trim() || null
  )

  if (!compromisso) {
    console.error('Erro: createCompromisso retornou null')
    throw new ValidationError('Erro ao criar compromisso no banco de dados')
  }

  console.log('Compromisso criado com sucesso:', compromisso.id)
  return compromisso
}

/**
 * Atualiza um compromisso existente
 */
export async function updateCompromissoRecord(
  id: string,
  tenantId: string,
  updates: {
    title?: string
    description?: string | null
    scheduledAt?: string
  }
): Promise<Compromisso> {
  // Validações apenas para campos fornecidos
  if (updates.title !== undefined && (!updates.title || updates.title.trim().length === 0)) {
    throw new ValidationError('Título não pode ser vazio')
  }
  
  if (updates.scheduledAt !== undefined && !isValidDate(updates.scheduledAt)) {
    throw new ValidationError('Data/hora agendada inválida')
  }
  
  const { updateCompromisso } = await import('../db/queries')
  const compromisso = await updateCompromisso(id, tenantId, {
    title: updates.title,
    description: updates.description,
    scheduled_at: updates.scheduledAt
  })
  
  if (!compromisso) {
    throw new ValidationError('Erro ao atualizar compromisso')
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
  tomorrow.setHours(23, 59, 59, 999) // Garante que inclui compromissos até o final do dia

  const compromissos = await getCompromissosByTenant(
    tenantId,
    today.toISOString(),
    tomorrow.toISOString()
  )
  
  // Filtra apenas os compromissos que são realmente de hoje (evita problemas de timezone)
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const fimHoje = new Date(hoje)
  fimHoje.setHours(23, 59, 59, 999)
  
  return compromissos.filter(c => {
    const dataCompromisso = new Date(c.scheduled_at)
    return dataCompromisso >= hoje && dataCompromisso <= fimHoje
  })
}
