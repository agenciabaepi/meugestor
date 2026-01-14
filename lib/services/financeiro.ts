import {
  createFinanceiro,
  getFinanceiroByTenant,
  getFinanceiroByCategory,
} from '../db/queries'
import { isValidAmount, isValidDate, isValidCategory } from '../utils/validation'
import { ValidationError } from '../utils/errors'
import type { Financeiro } from '../db/types'

export interface CreateFinanceiroInput {
  tenantId: string
  amount: number
  description: string
  category: string
  date: string
  receiptImageUrl?: string | null
  subcategory?: string | null
  metadata?: Record<string, any> | null
  tags?: string[] | null
}

/**
 * Cria um novo registro financeiro
 */
export async function createFinanceiroRecord(
  input: CreateFinanceiroInput
): Promise<Financeiro> {
  // Validações
  if (!isValidAmount(input.amount)) {
    throw new ValidationError('Valor deve ser maior que zero')
  }

  if (!input.description || input.description.trim().length === 0) {
    throw new ValidationError('Descrição é obrigatória')
  }

  if (!isValidCategory(input.category)) {
    throw new ValidationError(
      'Categoria inválida. Use: Alimentação, Transporte, Moradia, Saúde, Educação, Lazer, Outros'
    )
  }

  if (!isValidDate(input.date)) {
    throw new ValidationError('Data inválida')
  }

  // Cria o registro
  const record = await createFinanceiro(
    input.tenantId,
    input.amount,
    input.description.trim(),
    input.category,
    input.date,
    input.receiptImageUrl,
    input.subcategory,
    input.metadata,
    input.tags
  )

  if (!record) {
    throw new ValidationError('Erro ao criar registro financeiro')
  }

  return record
}

/**
 * Obtém registros financeiros de um tenant
 */
export async function getFinanceiroRecords(
  tenantId: string,
  startDate?: string,
  endDate?: string
): Promise<Financeiro[]> {
  return getFinanceiroByTenant(tenantId, startDate, endDate)
}

/**
 * Obtém registros financeiros por categoria
 */
export async function getFinanceiroByCategoryRecords(
  tenantId: string,
  category: string,
  startDate?: string,
  endDate?: string
): Promise<Financeiro[]> {
  if (!isValidCategory(category)) {
    throw new ValidationError('Categoria inválida')
  }

  return getFinanceiroByCategory(tenantId, category, startDate, endDate)
}

/**
 * Obtém registros financeiros por subcategoria
 */
export async function getFinanceiroBySubcategoryRecords(
  tenantId: string,
  subcategory: string,
  startDate?: string,
  endDate?: string
): Promise<Financeiro[]> {
  const { supabaseAdmin } = await import('../db/client')
  if (!supabaseAdmin) {
    throw new ValidationError('Supabase admin não configurado')
  }

  let query = supabaseAdmin
    .from('financeiro')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('subcategory', subcategory)
    .order('date', { ascending: false })

  if (startDate) {
    query = query.gte('date', startDate)
  }

  if (endDate) {
    query = query.lte('date', endDate)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching financeiro by subcategory:', error)
    return []
  }

  return data || []
}

/**
 * Obtém registros financeiros por tags
 */
export async function getFinanceiroByTagsRecords(
  tenantId: string,
  tags: string[],
  startDate?: string,
  endDate?: string
): Promise<Financeiro[]> {
  const { supabaseAdmin } = await import('../db/client')
  if (!supabaseAdmin) {
    throw new ValidationError('Supabase admin não configurado')
  }

  let query = supabaseAdmin
    .from('financeiro')
    .select('*')
    .eq('tenant_id', tenantId)
    .contains('tags', tags)
    .order('date', { ascending: false })

  if (startDate) {
    query = query.gte('date', startDate)
  }

  if (endDate) {
    query = query.lte('date', endDate)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching financeiro by tags:', error)
    return []
  }

  return data || []
}

/**
 * Calcula total de gastos em um período
 */
export async function calculateTotalSpent(
  tenantId: string,
  startDate?: string,
  endDate?: string
): Promise<number> {
  const records = await getFinanceiroByTenant(tenantId, startDate, endDate)
  return records.reduce((total, record) => total + Number(record.amount), 0)
}

/**
 * Calcula total de gastos por categoria
 */
export async function calculateTotalByCategory(
  tenantId: string,
  category: string,
  startDate?: string,
  endDate?: string
): Promise<number> {
  const records = await getFinanceiroByCategoryRecords(
    tenantId,
    category,
    startDate,
    endDate
  )
  return records.reduce((total, record) => total + Number(record.amount), 0)
}
