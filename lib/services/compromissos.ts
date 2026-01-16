import {
  createCompromisso,
  deleteCompromisso,
  getCompromissoById,
  getCompromissosByTenant,
} from '../db/queries'
import { isValidDate } from '../utils/validation'
import { ValidationError } from '../utils/errors'
import { isFutureInBrazil } from '../utils/date-parser'
import type { Compromisso } from '../db/types'

export interface CreateCompromissoInput {
  tenantId: string
  userId?: string | null
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

  // Defesa em profundidade: nunca insere compromisso no passado
  // (mesmo que algum fluxo acabe chamando createCompromisso direto)
  const scheduledDate = new Date(input.scheduledAt)
  if (!isFutureInBrazil(scheduledDate, new Date())) {
    throw new ValidationError(
      'Não é possível agendar compromissos no passado. Por favor, informe uma data/hora futura.'
    )
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
    input.description?.trim() || null,
    input.userId || null
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
 * Obtém um compromisso por ID (para correções que preservam a data e mudam só o horário)
 */
export async function getCompromissoRecordById(
  id: string,
  tenantId: string,
  userId?: string | null
): Promise<Compromisso | null> {
  return getCompromissoById(id, tenantId, userId || null)
}

/**
 * Cancela (remove) um compromisso
 */
export async function cancelCompromissoRecord(
  id: string,
  tenantId: string,
  userId?: string | null
): Promise<boolean> {
  return deleteCompromisso(id, tenantId, userId || null)
}

/**
 * Obtém compromissos de um tenant
 */
export async function getCompromissosRecords(
  tenantId: string,
  startDate?: string,
  endDate?: string,
  userId?: string | null
): Promise<Compromisso[]> {
  return getCompromissosByTenant(tenantId, startDate, endDate, userId || null)
}

/**
 * Obtém compromissos futuros de um tenant
 */
export async function getUpcomingCompromissos(
  tenantId: string,
  limit: number = 10,
  userId?: string | null
): Promise<Compromisso[]> {
  const now = new Date().toISOString()
  const compromissos = await getCompromissosByTenant(tenantId, now, undefined, userId || null)
  return compromissos.slice(0, limit)
}

/**
 * Obtém compromissos do dia
 */
export async function getTodayCompromissos(
  tenantId: string,
  userId?: string | null
): Promise<Compromisso[]> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(23, 59, 59, 999) // Garante que inclui compromissos até o final do dia

  const compromissos = await getCompromissosByTenant(
    tenantId,
    today.toISOString(),
    tomorrow.toISOString(),
    userId || null
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
