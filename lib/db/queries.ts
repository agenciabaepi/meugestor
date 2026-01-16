import { supabase, supabaseAdmin } from './client'
import type {
  Tenant,
  User,
  Financeiro,
  Compromisso,
  Conversation,
} from './types'

// ============================================
// TENANTS
// ============================================

export async function getTenantByWhatsAppNumber(
  whatsappNumber: string
): Promise<Tenant | null> {
  // Usa supabaseAdmin para bypass RLS (chamado do servidor/webhook)
  if (!supabaseAdmin) {
    console.error('supabaseAdmin não está configurado. Verifique SUPABASE_SERVICE_ROLE_KEY.')
    return null
  }
  const client = supabaseAdmin
  
  const { data, error } = await client
    .from('tenants')
    .select('*')
    .eq('whatsapp_number', whatsappNumber)
    .single()

  if (error) {
    console.error('Error fetching tenant:', error)
    return null
  }

  return data
}

export async function createTenant(
  name: string,
  whatsappNumber: string
): Promise<Tenant | null> {
  // Usa supabaseAdmin para bypass RLS (chamado do servidor/webhook)
  if (!supabaseAdmin) {
    console.error('supabaseAdmin não está configurado. Verifique SUPABASE_SERVICE_ROLE_KEY.')
    return null
  }
  const client = supabaseAdmin
  
  const { data, error } = await client
    .from('tenants')
    .insert({
      name,
      whatsapp_number: whatsappNumber,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating tenant:', error)
    return null
  }

  return data
}

// ============================================
// USERS
// ============================================

export async function getUserByEmail(
  email: string
): Promise<User | null> {
  const { data, error } = await supabase
    .from('users_meugestor')
    .select('*')
    .eq('email', email)
    .single()

  if (error) {
    console.error('Error fetching user:', error)
    return null
  }

  return data
}

export async function createUser(
  tenantId: string,
  email: string,
  role: 'admin' | 'user' = 'user'
): Promise<User | null> {
  const { data, error } = await supabase
    .from('users_meugestor')
    .insert({
      tenant_id: tenantId,
      email,
      role,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating user:', error)
    return null
  }

  return data
}

// ============================================
// FINANCEIRO
// ============================================

export async function createFinanceiro(
  tenantId: string,
  amount: number,
  description: string,
  category: string,
  date: string,
  receiptImageUrl?: string | null,
  subcategory?: string | null,
  metadata?: Record<string, any> | null,
  tags?: string[] | null,
  transactionType: 'expense' | 'revenue' = 'expense',
  userId?: string | null
): Promise<Financeiro | null> {
  // Usa supabaseAdmin para bypass RLS (chamado do servidor/webhook)
  if (!supabaseAdmin) {
    console.error('supabaseAdmin não está configurado. Verifique SUPABASE_SERVICE_ROLE_KEY.')
    return null
  }
  const client = supabaseAdmin
  
  // Prepara dados para inserção
  const insertData: any = {
    tenant_id: tenantId,
    user_id: userId || null,
    amount,
    description,
    category,
    date,
    receipt_image_url: receiptImageUrl || null,
    subcategory: subcategory || null,
    metadata: metadata || {},
    tags: tags || [],
    transaction_type: transactionType,
  }
  
  console.log('createFinanceiro - Inserindo dados:', JSON.stringify(insertData, null, 2))
  
  let { data, error } = await client
    .from('financeiro')
    .insert(insertData)
    .select()
    .single()
  
  // Compatibilidade: se user_id/transaction_type não existirem, tenta novamente sem esses campos
  if (error && (error.message?.includes('column') || error.code === '42703')) {
    const missingUserId = error.message?.includes('user_id')
    const missingTransactionType = error.message?.includes('transaction_type')
    if (missingUserId || missingTransactionType) {
      console.warn('Campo user_id/transaction_type não existe, tentando inserir sem ele (aplique a migration 011/008)')
      console.warn('Erro original:', error.message)
      const retryData = { ...insertData }
      if (missingUserId) delete retryData.user_id
      if (missingTransactionType) delete retryData.transaction_type
      const retryResult = await client
        .from('financeiro')
        .insert(retryData)
        .select()
        .single()
      data = retryResult.data
      error = retryResult.error
    }
  }

  if (error) {
    console.error('Error creating financeiro:', error)
    console.error('Error details:', JSON.stringify(error, null, 2))
    console.error('Data being inserted:', {
      tenant_id: tenantId,
      amount,
      description,
      category,
      date,
      receipt_image_url: receiptImageUrl,
      subcategory,
      transaction_type: transactionType,
    })
    return null
  }

  return data
}

export async function getFinanceiroByTenant(
  tenantId: string,
  startDate?: string,
  endDate?: string,
  transactionType?: 'expense' | 'revenue',
  userId?: string | null
): Promise<Financeiro[]> {
  // Usa supabaseAdmin para bypass RLS (chamado do servidor/webhook)
  if (!supabaseAdmin) {
    console.error('supabaseAdmin não está configurado. Verifique SUPABASE_SERVICE_ROLE_KEY.')
    return []
  }
  const client = supabaseAdmin
  
  let query = client
    .from('financeiro')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('date', { ascending: false })

  if (userId) {
    query = query.eq('user_id', userId)
  }

  if (startDate) {
    query = query.gte('date', startDate)
  }

  if (endDate) {
    query = query.lte('date', endDate)
  }

  // Filtra por tipo de transação se fornecido
  // Tenta filtrar, mas se o campo não existir (migration não aplicada), ignora o filtro
  if (transactionType) {
    try {
      query = query.eq('transaction_type', transactionType)
    } catch (e) {
      // Se o campo não existir, continua sem filtro
      console.warn('Campo transaction_type não disponível, retornando todos os registros')
    }
  }

  let { data, error } = await query

  if (error) {
    const isMissingColumn = error.message?.includes('column') || error.code === '42703'
    const missingTransactionType = error.message?.includes('transaction_type')
    const missingUserId = error.message?.includes('user_id')

    // Se o erro for sobre colunas não existirem, tenta sem esses filtros
    if (isMissingColumn && (missingTransactionType || missingUserId)) {
      console.warn('Campo transaction_type/user_id não existe, buscando sem filtro (aplique a migration 011 para user_id)')
      let retryQuery = client
        .from('financeiro')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('date', { ascending: false })
      
      if (startDate) {
        retryQuery = retryQuery.gte('date', startDate)
      }
      if (endDate) {
        retryQuery = retryQuery.lte('date', endDate)
      }
      
      const retryResult = await retryQuery
      return retryResult.data || []
    }
    
    console.error('Error fetching financeiro:', error)
    return []
  }

  // Se transactionType foi fornecido mas não há campo, filtra manualmente
  if (transactionType && data) {
    return data.filter((item: any) => {
      // Se o campo não existe, assume que tudo é despesa (comportamento antigo)
      if (!item.transaction_type) {
        return transactionType === 'expense'
      }
      return item.transaction_type === transactionType
    })
  }

  return data || []
}

export async function getFinanceiroByCategory(
  tenantId: string,
  category: string,
  startDate?: string,
  endDate?: string
): Promise<Financeiro[]> {
  // Usa supabaseAdmin para bypass RLS (chamado do servidor)
  if (!supabaseAdmin) {
    console.error('supabaseAdmin não está configurado. Verifique SUPABASE_SERVICE_ROLE_KEY.')
    return []
  }
  const client = supabaseAdmin
  
  let query = client
    .from('financeiro')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('category', category)
    .order('date', { ascending: false })

  if (startDate) {
    query = query.gte('date', startDate)
  }

  if (endDate) {
    query = query.lte('date', endDate)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching financeiro by category:', error)
    return []
  }

  return data || []
}

// ============================================
// COMPROMISSOS
// ============================================

export async function createCompromisso(
  tenantId: string,
  title: string,
  scheduledAt: string,
  description?: string | null,
  userId?: string | null
): Promise<Compromisso | null> {
  // Usa supabaseAdmin para bypass RLS (chamado do servidor/webhook)
  if (!supabaseAdmin) {
    console.error('supabaseAdmin não está configurado. Verifique SUPABASE_SERVICE_ROLE_KEY.')
    return null
  }
  const client = supabaseAdmin
  
  console.log('createCompromisso - Tentando inserir:', { tenantId, title, scheduledAt, description })
  
  let { data, error } = await client
    .from('compromissos')
    .insert({
      tenant_id: tenantId,
      user_id: userId || null,
      title,
      description: description || null,
      scheduled_at: scheduledAt,
    })
    .select()
    .single()

  // Compatibilidade: se user_id não existir ainda, tenta sem user_id (aplique a migration 011)
  if (error && (error.message?.includes('user_id') || error.code === '42703')) {
    console.warn('Campo user_id não existe em compromissos, tentando inserir sem ele (aplique a migration 011)')
    const retry = await client
      .from('compromissos')
      .insert({
        tenant_id: tenantId,
        title,
        description: description || null,
        scheduled_at: scheduledAt,
      })
      .select()
      .single()
    data = retry.data as any
    error = retry.error as any
  }

  if (error) {
    console.error('Error creating compromisso:', error)
    console.error('Error details:', JSON.stringify(error, null, 2))
    return null
  }

  console.log('createCompromisso - Sucesso! ID:', data?.id)
  return data
}

export async function updateFinanceiro(
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
  }
): Promise<Financeiro | null> {
  if (!supabaseAdmin) {
    console.error('supabaseAdmin não está configurado.')
    return null
  }
  
  const updateData: any = {}
  if (updates.amount !== undefined) updateData.amount = updates.amount
  if (updates.description !== undefined) updateData.description = updates.description
  if (updates.category !== undefined) updateData.category = updates.category
  if (updates.subcategory !== undefined) updateData.subcategory = updates.subcategory
  if (updates.date !== undefined) updateData.date = updates.date
  if (updates.receiptImageUrl !== undefined) updateData.receipt_image_url = updates.receiptImageUrl
  if (updates.metadata !== undefined) updateData.metadata = updates.metadata
  if (updates.tags !== undefined) updateData.tags = updates.tags
  if (updates.transactionType !== undefined) updateData.transaction_type = updates.transactionType
  
  const { data, error } = await supabaseAdmin
    .from('financeiro')
    .update(updateData)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single()
  
  if (error) {
    console.error('Error updating financeiro:', error)
    return null
  }
  
  return data
}

export async function updateCompromisso(
  id: string,
  tenantId: string,
  updates: {
    title?: string
    description?: string | null
    scheduled_at?: string
  }
): Promise<Compromisso | null> {
  if (!supabaseAdmin) {
    console.error('supabaseAdmin não está configurado.')
    return null
  }
  
  const updateData: any = {}
  if (updates.title !== undefined) updateData.title = updates.title
  if (updates.description !== undefined) updateData.description = updates.description
  if (updates.scheduled_at !== undefined) updateData.scheduled_at = updates.scheduled_at
  
  const { data, error } = await supabaseAdmin
    .from('compromissos')
    .update(updateData)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select()
    .single()
  
  if (error) {
    console.error('Error updating compromisso:', error)
    return null
  }
  
  return data
}

export async function getCompromissoById(
  id: string,
  tenantId: string,
  userId?: string | null
): Promise<Compromisso | null> {
  // Usa supabaseAdmin para bypass RLS (chamado do servidor/webhook)
  if (!supabaseAdmin) {
    console.error('supabaseAdmin não está configurado. Verifique SUPABASE_SERVICE_ROLE_KEY.')
    return null
  }
  const client = supabaseAdmin

  let query = client
    .from('compromissos')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (userId) {
    query = query.eq('user_id', userId)
  }

  let { data, error } = await query.single()

  // Compatibilidade: se user_id não existe ainda, tenta novamente sem filtro
  if (error && (error.message?.includes('user_id') || error.code === '42703')) {
    console.warn('Campo user_id não existe em compromissos, buscando sem filtro (aplique a migration 011)')
    const retry = await client
      .from('compromissos')
      .select('*')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .single()
    data = retry.data as any
    error = retry.error as any
  }

  if (error) {
    console.error('Error fetching compromisso by id:', error)
    return null
  }

  return data
}

export async function getCompromissosByTenant(
  tenantId: string,
  startDate?: string,
  endDate?: string,
  userId?: string | null,
  includeCancelled: boolean = false
): Promise<Compromisso[]> {
  // Usa supabaseAdmin para bypass RLS (chamado do servidor/webhook)
  if (!supabaseAdmin) {
    console.error('supabaseAdmin não está configurado. Verifique SUPABASE_SERVICE_ROLE_KEY.')
    return []
  }
  const client = supabaseAdmin
  
  let query = client
    .from('compromissos')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .order('scheduled_at', { ascending: true })

  if (userId) {
    query = query.eq('user_id', userId)
  }

  if (!includeCancelled) {
    // Por padrão, não retorna compromissos cancelados
    query = query.eq('is_cancelled', false as any)
  }

  if (startDate) {
    query = query.gte('scheduled_at', startDate)
  }

  if (endDate) {
    query = query.lte('scheduled_at', endDate)
  }

  // Supabase tem limite padrão de 1000 registros
  // Para garantir que buscamos todos, vamos usar range se necessário
  // Mas para uso normal (poucos compromissos), não deve ser problema
  let { data, error, count } = await query

  // Compatibilidade: se user_id / is_cancelled não existe ainda, tenta novamente sem filtro desses campos
  if (error && (
    error.message?.includes('user_id') ||
    error.message?.includes('is_cancelled') ||
    error.code === '42703'
  )) {
    console.warn('Campo user_id/is_cancelled não existe em compromissos, buscando sem filtro (aplique migrations 011/012)')
    let retryQuery = client
      .from('compromissos')
      .select('*', { count: 'exact' })
      .eq('tenant_id', tenantId)
      .order('scheduled_at', { ascending: true })
    if (startDate) retryQuery = retryQuery.gte('scheduled_at', startDate)
    if (endDate) retryQuery = retryQuery.lte('scheduled_at', endDate)
    const retry = await retryQuery
    data = retry.data as any
    error = retry.error as any
    count = retry.count as any
  }
  
  // Se houver mais de 1000 registros, precisaríamos paginar
  // Mas para compromissos de um dia específico, não deve ser necessário
  // Se count > 1000 e data.length < count, significa que há mais registros
  if (count && count > (data?.length || 0) && count > 1000) {
    console.warn(`getCompromissosByTenant - Há mais de 1000 compromissos (${count}), mas apenas ${data?.length || 0} foram retornados. Pode precisar de paginação.`)
  }

  if (error) {
    console.error('Error fetching compromissos:', error)
    console.error('Error details:', JSON.stringify(error, null, 2))
    return []
  }

  // Log para debug - verificar quantos compromissos foram encontrados
  const totalEncontrados = count || data?.length || 0
  console.log(`getCompromissosByTenant - Encontrados ${totalEncontrados} compromissos para tenant ${tenantId}`, {
    startDate,
    endDate,
    count: totalEncontrados,
    dataLength: data?.length || 0,
    countFromQuery: count
  })
  
  // Log detalhado dos compromissos encontrados (apenas se houver poucos para não poluir logs)
  if (data && data.length > 0 && data.length <= 10) {
    console.log('getCompromissosByTenant - Detalhes dos compromissos:', data.map((c: any) => ({
      id: c.id,
      title: c.title,
      scheduled_at: c.scheduled_at,
      scheduled_at_brazil: new Date(c.scheduled_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    })))
  }

  return (data || []).map((item: any) => ({
    ...item,
    reminder_sent: item.reminder_sent || false,
  }))
}

export async function cancelCompromisso(
  id: string,
  tenantId: string,
  userId?: string | null
): Promise<Compromisso | null> {
  if (!supabaseAdmin) {
    console.error('supabaseAdmin não está configurado. Verifique SUPABASE_SERVICE_ROLE_KEY.')
    return null
  }

  const client = supabaseAdmin

  const updateData: any = {
    is_cancelled: true,
    cancelled_at: new Date().toISOString(),
    cancelled_by: userId || null,
  }

  let query = client
    .from('compromissos')
    .update(updateData)
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (userId) {
    query = query.eq('user_id', userId)
  }

  let { data, error } = await query.select().single()

  // Compatibilidade: se user_id/is_cancelled não existe, tenta apenas "deletar" como fallback (último recurso)
  if (error && (error.message?.includes('user_id') || error.message?.includes('is_cancelled') || error.code === '42703')) {
    console.warn('Campo user_id/is_cancelled não existe em compromissos, cancelando via delete como fallback (aplique migrations 011/012)')
    const ok = await deleteCompromisso(id, tenantId, userId || null)
    if (!ok) return null
    // Sem coluna, não tem como retornar registro atualizado
    return null
  }

  if (error) {
    console.error('Error cancelling compromisso:', error)
    return null
  }

  return data as any
}

export async function deleteCompromisso(
  id: string,
  tenantId: string,
  userId?: string | null
): Promise<boolean> {
  if (!supabaseAdmin) {
    console.error('supabaseAdmin não está configurado. Verifique SUPABASE_SERVICE_ROLE_KEY.')
    return false
  }
  const client = supabaseAdmin

  let query = client
    .from('compromissos')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenantId)

  if (userId) {
    query = query.eq('user_id', userId)
  }

  let { error } = await query

  // Compatibilidade: se user_id não existe ainda, tenta novamente sem filtro
  if (error && (error.message?.includes('user_id') || error.code === '42703')) {
    console.warn('Campo user_id não existe em compromissos, deletando sem filtro (aplique a migration 011)')
    const retry = await client
      .from('compromissos')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId)
    error = retry.error as any
  }

  if (error) {
    console.error('Error deleting compromisso:', error)
    return false
  }

  return true
}

// ============================================
// CONVERSATIONS
// ============================================

export async function createConversation(
  tenantId: string,
  message: string,
  role: 'user' | 'assistant',
  userId?: string | null
): Promise<Conversation | null> {
  // Usa supabaseAdmin para bypass RLS (chamado do servidor/webhook)
  if (!supabaseAdmin) {
    console.error('supabaseAdmin não está configurado. Verifique SUPABASE_SERVICE_ROLE_KEY.')
    return null
  }
  const client = supabaseAdmin
  
  let { data, error } = await client
    .from('conversations')
    .insert({
      tenant_id: tenantId,
      user_id: userId || null,
      message,
      role,
    })
    .select()
    .single()

  // Compatibilidade: se user_id não existir ainda, tenta sem user_id (aplique a migration 011)
  if (error && (error.message?.includes('user_id') || error.code === '42703')) {
    console.warn('Campo user_id não existe em conversations, tentando inserir sem ele (aplique a migration 011)')
    const retry = await client
      .from('conversations')
      .insert({
        tenant_id: tenantId,
        message,
        role,
      })
      .select()
      .single()
    data = retry.data as any
    error = retry.error as any
  }

  if (error) {
    console.error('Error creating conversation:', error)
    return null
  }

  return data
}

export async function getRecentConversations(
  tenantId: string,
  limit: number = 10,
  userId?: string | null
): Promise<Conversation[]> {
  // Usa supabaseAdmin para bypass RLS (chamado do servidor/webhook)
  if (!supabaseAdmin) {
    console.error('supabaseAdmin não está configurado. Verifique SUPABASE_SERVICE_ROLE_KEY.')
    return []
  }
  const client = supabaseAdmin
  
  let query = client
    .from('conversations')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (userId) {
    query = query.eq('user_id', userId)
  }

  let { data, error } = await query

  if (error && (error.message?.includes('user_id') || error.code === '42703')) {
    console.warn('Campo user_id não existe em conversations, buscando sem filtro (aplique a migration 011)')
    const retry = await client
      .from('conversations')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(limit)
    data = retry.data
    error = retry.error
  }

  if (error) {
    console.error('Error fetching conversations:', error)
    return []
  }

  return data || []
}
