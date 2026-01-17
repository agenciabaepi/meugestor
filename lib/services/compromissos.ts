import {
  createCompromisso,
  cancelCompromisso,
  getCompromissoById,
  getCompromissosByTenant,
} from '../db/queries'
import {
  cancelCompromissoEmpresa,
  createCompromissoEmpresa,
  getCompromissoEmpresaById,
  getCompromissosEmpresaByEmpresa,
} from '../db/queries-empresa'
import { isValidDate } from '../utils/validation'
import { ValidationError } from '../utils/errors'
import { isFutureInBrazil } from '../utils/date-parser'
import type { Compromisso, SessionContext } from '../db/types'

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

export async function createCompromissoRecordForContext(
  ctx: SessionContext,
  input: Omit<CreateCompromissoInput, 'tenantId'> & { tenantId?: never }
): Promise<Compromisso> {
  if (!input.title || input.title.trim().length === 0) {
    throw new ValidationError('Título é obrigatório')
  }
  if (!input.scheduledAt) {
    throw new ValidationError('Data/hora agendada é obrigatória')
  }
  if (!isValidDate(input.scheduledAt)) {
    throw new ValidationError(`Data/hora agendada inválida: ${input.scheduledAt}`)
  }
  const scheduledDate = new Date(input.scheduledAt)
  if (!isFutureInBrazil(scheduledDate, new Date())) {
    throw new ValidationError('Não é possível agendar compromissos no passado. Por favor, informe uma data/hora futura.')
  }

  if (ctx.mode === 'empresa') {
    if (!ctx.empresa_id) {
      throw new ValidationError('Modo empresa sem empresa vinculada')
    }
    const created = await createCompromissoEmpresa(
      ctx.tenant_id,
      ctx.empresa_id,
      input.title.trim(),
      input.scheduledAt,
      input.description?.trim() || null,
      input.userId || null
    )
    if (!created) throw new ValidationError('Erro ao criar compromisso no banco de dados')
    return created
  }

  const created = await createCompromisso(
    ctx.tenant_id,
    input.title.trim(),
    input.scheduledAt,
    input.description?.trim() || null,
    input.userId || null
  )
  if (!created) throw new ValidationError('Erro ao criar compromisso no banco de dados')
  return created
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
  const updated = await cancelCompromisso(id, tenantId, userId || null)
  // Se a migration 012 não estiver aplicada, retorna null e tratamos como falha (não deletar).
  return updated !== null
}

/**
 * Obtém compromissos de um tenant
 */
export async function getCompromissosRecords(
  tenantId: string,
  startDate?: string,
  endDate?: string,
  userId?: string | null,
  includeCancelled: boolean = false
): Promise<Compromisso[]> {
  return getCompromissosByTenant(tenantId, startDate, endDate, userId || null, includeCancelled)
}

/**
 * Obtém compromissos respeitando o contexto (pessoal vs empresa).
 */
export async function getCompromissosRecordsForContext(
  ctx: SessionContext,
  startDate?: string,
  endDate?: string,
  userId?: string | null,
  includeCancelled: boolean = false
): Promise<Compromisso[]> {
  if (ctx.mode === 'empresa') {
    if (!ctx.empresa_id) return []
    return getCompromissosEmpresaByEmpresa(
      ctx.tenant_id,
      ctx.empresa_id,
      startDate,
      endDate,
      userId || null,
      includeCancelled
    )
  }
  return getCompromissosByTenant(ctx.tenant_id, startDate, endDate, userId || null, includeCancelled)
}

export async function getCompromissoRecordByIdForContext(
  ctx: SessionContext,
  id: string,
  userId?: string | null
): Promise<Compromisso | null> {
  if (ctx.mode === 'empresa') {
    if (!ctx.empresa_id) return null
    return getCompromissoEmpresaById(id, ctx.tenant_id, ctx.empresa_id, userId || null)
  }
  return getCompromissoById(id, ctx.tenant_id, userId || null)
}

export async function cancelCompromissoRecordForContext(
  ctx: SessionContext,
  id: string,
  userId?: string | null
): Promise<boolean> {
  if (ctx.mode === 'empresa') {
    if (!ctx.empresa_id) return false
    const updated = await cancelCompromissoEmpresa(id, ctx.tenant_id, ctx.empresa_id, userId || null)
    return updated !== null
  }
  const updated = await cancelCompromisso(id, ctx.tenant_id, userId || null)
  return updated !== null
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
  const compromissos = await getCompromissosByTenant(tenantId, now, undefined, userId || null, false)
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
    userId || null,
    false
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
