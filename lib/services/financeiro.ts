import {
  createFinanceiro,
  getFinanceiroByTenant,
  getFinanceiroByCategory,
  updateFinanceiro,
  deleteFinanceiro,
  getFinanceiroById,
} from '../db/queries'
import { 
  getFinanceiroEmpresaByCategory, 
  getFinanceiroEmpresaByEmpresa,
  updateFinanceiroEmpresa,
  deleteFinanceiroEmpresa,
  getFinanceiroEmpresaById,
} from '../db/queries-empresa'
import { isValidAmount, isValidDate, isValidCategory } from '../utils/validation'
import { ValidationError } from '../utils/errors'
import type { Financeiro, SessionContext } from '../db/types'

export interface CreateFinanceiroInput {
  tenantId: string
  userId?: string | null
  amount: number
  description: string
  category: string
  date: string
  receiptImageUrl?: string | null
  subcategory?: string | null
  metadata?: Record<string, any> | null
  tags?: string[] | null
  transactionType?: 'expense' | 'revenue'
  pago?: boolean
  funcionario_id?: string | null
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
    throw new ValidationError('Categoria inválida')
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
    input.tags,
    input.transactionType || 'expense',
    input.userId || null,
    input.pago
  )

  if (!record) {
    throw new ValidationError('Erro ao criar registro financeiro')
  }

  return record
}

/**
 * Cria um registro financeiro respeitando o contexto (pessoal vs empresa).
 */
export async function createFinanceiroRecordForContext(
  ctx: SessionContext,
  input: Omit<CreateFinanceiroInput, 'tenantId'> & { tenantId?: never }
): Promise<Financeiro> {
  // Validações (iguais ao modo pessoal)
  if (!isValidAmount(input.amount)) {
    throw new ValidationError('Valor deve ser maior que zero')
  }
  if (!input.description || input.description.trim().length === 0) {
    throw new ValidationError('Descrição é obrigatória')
  }
  // Modo empresa: categorias são definidas pelo módulo empresarial (não pela lista fixa do modo pessoal)
  if (ctx.mode !== 'empresa' && !isValidCategory(input.category)) {
    throw new ValidationError('Categoria inválida')
  }
  if (ctx.mode === 'empresa' && (!input.category || String(input.category).trim().length === 0)) {
    throw new ValidationError('Categoria é obrigatória')
  }
  
  // Normaliza a data para garantir formato YYYY-MM-DD (evita problemas de timezone)
  let normalizedDate = String(input.date).trim()
  if (normalizedDate.includes('T')) {
    normalizedDate = normalizedDate.split('T')[0]
  }
  
  if (!isValidDate(normalizedDate)) {
    throw new ValidationError('Data inválida')
  }
  
  // Garante que a data está no formato YYYY-MM-DD
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
    throw new ValidationError('Formato de data inválido')
  }

  if (ctx.mode === 'empresa') {
    if (!ctx.empresa_id) {
      throw new ValidationError('Modo empresa sem empresa vinculada')
    }
    const { createFinanceiroEmpresa } = await import('../db/queries-empresa')
    
    // Se categoria for funcionarios e funcionario_id foi fornecido, inclui no metadata
    const categoriaLower = (input.category || '').toLowerCase()
    const isFuncionariosCategory =
      categoriaLower === 'funcionarios' || categoriaLower === 'funcionário' || categoriaLower === 'funcionario'
    
    let finalMetadata = input.metadata || {}
    let finalFuncionarioId = input.funcionario_id || null
    
    // Se categoria é funcionarios mas não tem funcionario_id, não bloqueia (pode ser gasto genérico)
    // Mas se tem funcionario_id, adiciona ao metadata para referência
    if (isFuncionariosCategory && finalFuncionarioId) {
      finalMetadata = {
        ...finalMetadata,
        funcionario: {
          id: finalFuncionarioId,
          // Nome será buscado depois se necessário
        },
      }
    }
    
    const record = await createFinanceiroEmpresa(
      ctx.tenant_id,
      ctx.empresa_id,
      input.amount,
      input.description.trim(),
      input.category,
      normalizedDate,
      input.receiptImageUrl,
      input.subcategory,
      finalMetadata,
      input.tags,
      input.transactionType || 'expense',
      input.userId || null,
      finalFuncionarioId, // funcionarioId
      input.pago
    )
    if (!record) throw new ValidationError('Erro ao criar registro financeiro')
    return record
  }

  const record = await createFinanceiro(
    ctx.tenant_id,
    input.amount,
    input.description.trim(),
    input.category,
    normalizedDate,
    input.receiptImageUrl,
    input.subcategory,
    input.metadata,
    input.tags,
    input.transactionType || 'expense',
    input.userId || null,
    input.pago
  )
  if (!record) throw new ValidationError('Erro ao criar registro financeiro')
  return record
}

/**
 * Atualiza um registro financeiro existente
 */
export async function updateFinanceiroRecord(
  id: string,
  tenantId: string,
  updates: {
    amount?: number
    description?: string
    category?: string
    subcategory?: string | null
    date?: string
    receiptImageUrl?: string | null
    metadata?: Record<string, any> | null
    tags?: string[] | null
    transactionType?: 'expense' | 'revenue'
    pago?: boolean
  }
): Promise<Financeiro> {
  // Validações apenas para campos fornecidos
  if (updates.amount !== undefined && !isValidAmount(updates.amount)) {
    throw new ValidationError('Valor deve ser maior que zero')
  }
  
  if (updates.description !== undefined && (!updates.description || updates.description.trim().length === 0)) {
    throw new ValidationError('Descrição não pode ser vazia')
  }
  
  if (updates.category !== undefined && !isValidCategory(updates.category)) {
    throw new ValidationError('Categoria inválida')
  }
  
  if (updates.date !== undefined && !isValidDate(updates.date)) {
    throw new ValidationError('Data inválida')
  }
  
  const { updateFinanceiro } = await import('../db/queries')
  const record = await updateFinanceiro(id, tenantId, updates)
  
  if (!record) {
    throw new ValidationError('Erro ao atualizar registro financeiro')
  }
  
  return record
}

/**
 * Obtém registros financeiros de um tenant
 */
export async function getFinanceiroRecords(
  tenantId: string,
  startDate?: string,
  endDate?: string,
  transactionType?: 'expense' | 'revenue',
  userId?: string | null
): Promise<Financeiro[]> {
  return getFinanceiroByTenant(tenantId, startDate, endDate, transactionType, userId || null)
}

/**
 * Obtém registros financeiros respeitando o contexto (pessoal vs empresa).
 */
export async function getFinanceiroRecordsForContext(
  ctx: SessionContext,
  startDate?: string,
  endDate?: string,
  transactionType?: 'expense' | 'revenue',
  userId?: string | null
): Promise<Financeiro[]> {
  if (ctx.mode === 'empresa') {
    if (!ctx.empresa_id) return []
    return getFinanceiroEmpresaByEmpresa(
      ctx.tenant_id,
      ctx.empresa_id,
      startDate,
      endDate,
      transactionType,
      userId || null
    )
  }
  return getFinanceiroByTenant(ctx.tenant_id, startDate, endDate, transactionType, userId || null)
}

/**
 * Obtém apenas despesas de um tenant
 */
export async function getDespesasRecords(
  tenantId: string,
  startDate?: string,
  endDate?: string,
  userId?: string | null
): Promise<Financeiro[]> {
  return getFinanceiroByTenant(tenantId, startDate, endDate, 'expense', userId || null)
}

/**
 * Obtém apenas receitas de um tenant
 */
export async function getReceitasRecords(
  tenantId: string,
  startDate?: string,
  endDate?: string,
  userId?: string | null
): Promise<Financeiro[]> {
  return getFinanceiroByTenant(tenantId, startDate, endDate, 'revenue', userId || null)
}

export async function getDespesasRecordsForContext(
  ctx: SessionContext,
  startDate?: string,
  endDate?: string,
  userId?: string | null
): Promise<Financeiro[]> {
  return getFinanceiroRecordsForContext(ctx, startDate, endDate, 'expense', userId || null)
}

export async function getReceitasRecordsForContext(
  ctx: SessionContext,
  startDate?: string,
  endDate?: string,
  userId?: string | null
): Promise<Financeiro[]> {
  return getFinanceiroRecordsForContext(ctx, startDate, endDate, 'revenue', userId || null)
}

/**
 * Obtém apenas despesas não pagas (contas a pagar)
 */
export async function getContasAPagarForContext(
  ctx: SessionContext,
  startDate?: string,
  endDate?: string,
  userId?: string | null
): Promise<Financeiro[]> {
  if (ctx.mode === 'empresa') {
    if (!ctx.empresa_id) return []
    // Busca despesas não pagas da empresa
    const { getFinanceiroEmpresaNaoPago } = await import('../db/queries-empresa')
    return getFinanceiroEmpresaNaoPago(
      ctx.tenant_id,
      ctx.empresa_id,
      startDate,
      endDate,
      userId || null
    )
  }
  const { getFinanceiroNaoPago } = await import('../db/queries')
  return getFinanceiroNaoPago(ctx.tenant_id, startDate, endDate, userId || null)
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

export async function getFinanceiroByCategoryRecordsForContext(
  ctx: SessionContext,
  category: string,
  startDate?: string,
  endDate?: string
): Promise<Financeiro[]> {
  // Validação: apenas para modo pessoal (categorias fixas)
  // No modo empresa, categorias são dinâmicas e não precisam estar na lista fixa
  if (ctx.mode !== 'empresa' && !isValidCategory(category)) {
    throw new ValidationError('Categoria inválida')
  }
  
  // Validação básica: categoria não pode ser vazia
  if (!category || String(category).trim().length === 0) {
    throw new ValidationError('Categoria é obrigatória')
  }
  
  if (ctx.mode === 'empresa') {
    if (!ctx.empresa_id) return []
    return getFinanceiroEmpresaByCategory(ctx.tenant_id, ctx.empresa_id, category, startDate, endDate)
  }
  return getFinanceiroByCategory(ctx.tenant_id, category, startDate, endDate)
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
  endDate?: string,
  userId?: string | null
): Promise<number> {
  const records = await getFinanceiroByTenant(tenantId, startDate, endDate, 'expense', userId || null)
  return records.reduce((total, record) => total + Number(record.amount), 0)
}

export async function calculateTotalSpentForContext(
  ctx: SessionContext,
  startDate?: string,
  endDate?: string,
  userId?: string | null
): Promise<number> {
  const records = await getDespesasRecordsForContext(ctx, startDate, endDate, userId || null)
  return records.reduce((total, record) => total + Number(record.amount), 0)
}

/**
 * Calcula total de receitas em um período
 */
export async function calculateTotalRevenue(
  tenantId: string,
  startDate?: string,
  endDate?: string,
  userId?: string | null
): Promise<number> {
  const records = await getFinanceiroByTenant(tenantId, startDate, endDate, 'revenue', userId || null)
  return records.reduce((total, record) => total + Number(record.amount), 0)
}

export async function calculateTotalRevenueForContext(
  ctx: SessionContext,
  startDate?: string,
  endDate?: string,
  userId?: string | null
): Promise<number> {
  const records = await getReceitasRecordsForContext(ctx, startDate, endDate, userId || null)
  return records.reduce((total, record) => total + Number(record.amount), 0)
}

/**
 * Calcula saldo (receitas - despesas) em um período
 */
export async function calculateBalance(
  tenantId: string,
  startDate?: string,
  endDate?: string,
  userId?: string | null
): Promise<number> {
  const receitas = await calculateTotalRevenue(tenantId, startDate, endDate, userId || null)
  const despesas = await calculateTotalSpent(tenantId, startDate, endDate, userId || null)
  return receitas - despesas
}

export async function calculateBalanceForContext(
  ctx: SessionContext,
  startDate?: string,
  endDate?: string,
  userId?: string | null
): Promise<number> {
  const receitas = await calculateTotalRevenueForContext(ctx, startDate, endDate, userId || null)
  const despesas = await calculateTotalSpentForContext(ctx, startDate, endDate, userId || null)
  return receitas - despesas
}

/**
 * Calcula total de gastos por categoria
 */
export async function calculateTotalByCategory(
  tenantId: string,
  category: string,
  startDate?: string,
  endDate?: string,
  userId?: string | null
): Promise<number> {
  const records = await getFinanceiroByCategoryRecords(
    tenantId,
    category,
    startDate,
    endDate
  )
  return records.reduce((total, record) => total + Number(record.amount), 0)
}

/**
 * Obtém um registro financeiro por ID respeitando o contexto
 */
export async function getFinanceiroRecordByIdForContext(
  ctx: SessionContext,
  id: string
): Promise<Financeiro | null> {
  if (ctx.mode === 'empresa') {
    if (!ctx.empresa_id) return null
    return getFinanceiroEmpresaById(id, ctx.tenant_id, ctx.empresa_id)
  }
  return getFinanceiroById(id, ctx.tenant_id)
}

/**
 * Atualiza um registro financeiro respeitando o contexto
 */
export async function updateFinanceiroRecordForContext(
  ctx: SessionContext,
  id: string,
  updates: {
    amount?: number
    description?: string
    category?: string
    subcategory?: string | null
    date?: string
    receiptImageUrl?: string | null
    metadata?: Record<string, any> | null
    tags?: string[] | null
    transactionType?: 'expense' | 'revenue'
    pago?: boolean
  }
): Promise<Financeiro> {
  // Validações apenas para campos fornecidos
  if (updates.amount !== undefined && !isValidAmount(updates.amount)) {
    throw new ValidationError('Valor deve ser maior que zero')
  }
  
  if (updates.description !== undefined && (!updates.description || updates.description.trim().length === 0)) {
    throw new ValidationError('Descrição não pode ser vazia')
  }
  
  if (ctx.mode !== 'empresa' && updates.category !== undefined && !isValidCategory(updates.category)) {
    throw new ValidationError('Categoria inválida')
  }
  
  if (updates.date !== undefined && !isValidDate(updates.date)) {
    throw new ValidationError('Data inválida')
  }
  
  if (ctx.mode === 'empresa') {
    if (!ctx.empresa_id) {
      throw new ValidationError('Modo empresa sem empresa vinculada')
    }
    const record = await updateFinanceiroEmpresa(id, ctx.tenant_id, ctx.empresa_id, updates)
    if (!record) throw new ValidationError('Erro ao atualizar registro financeiro')
    return record
  }
  
  const record = await updateFinanceiro(id, ctx.tenant_id, updates)
  if (!record) throw new ValidationError('Erro ao atualizar registro financeiro')
  return record
}

/**
 * Deleta um registro financeiro respeitando o contexto
 */
export async function deleteFinanceiroRecordForContext(
  ctx: SessionContext,
  id: string
): Promise<boolean> {
  if (ctx.mode === 'empresa') {
    if (!ctx.empresa_id) {
      throw new ValidationError('Modo empresa sem empresa vinculada')
    }
    return deleteFinanceiroEmpresa(id, ctx.tenant_id, ctx.empresa_id)
  }
  
  return deleteFinanceiro(id, ctx.tenant_id)
}

/**
 * Obtém receitas não recebidas (contas a receber) respeitando o contexto
 */
export async function getContasAReceberForContext(
  ctx: SessionContext,
  startDate?: string,
  endDate?: string,
  userId?: string | null
): Promise<Financeiro[]> {
  console.log('[getContasAReceberForContext] Buscando contas a receber - modo:', ctx.mode, 'tenant_id:', ctx.tenant_id)
  
  if (ctx.mode === 'empresa') {
    if (!ctx.empresa_id) {
      console.log('[getContasAReceberForContext] Modo empresa mas sem empresa_id')
      return []
    }
    const { getFinanceiroEmpresaNaoPago } = await import('../db/queries-empresa')
    const receitas = await getFinanceiroEmpresaNaoPago(ctx.tenant_id, ctx.empresa_id, startDate, endDate, userId, 'revenue')
    console.log('[getContasAReceberForContext] Empresa - receitas encontradas:', receitas.length)
    return receitas
  }
  
  // Para modo pessoal, buscar receitas não recebidas
  // Nota: Para receitas, "pago" significa "recebido"
  const { getFinanceiroNaoRecebido } = await import('../db/queries')
  const receitas = await getFinanceiroNaoRecebido(ctx.tenant_id, startDate, endDate, userId)
  console.log('[getContasAReceberForContext] Pessoal - receitas encontradas:', receitas.length)
  return receitas
}
