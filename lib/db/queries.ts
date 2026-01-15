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
  transactionType: 'expense' | 'revenue' = 'expense'
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
  
  // Se o erro for sobre transaction_type não existir, tenta sem esse campo
  if (error && (error.message?.includes('transaction_type') || error.message?.includes('column') || error.code === '42703')) {
    console.warn('Campo transaction_type não existe, tentando inserir sem ele (migration não aplicada)')
    console.warn('Erro original:', error.message)
    const insertDataWithoutType = { ...insertData }
    delete insertDataWithoutType.transaction_type
    const retryResult = await client
      .from('financeiro')
      .insert(insertDataWithoutType)
      .select()
      .single()
    data = retryResult.data
    error = retryResult.error
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
  transactionType?: 'expense' | 'revenue'
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

  const { data, error } = await query

  if (error) {
    // Se o erro for sobre transaction_type não existir, tenta sem o filtro
    if (error.message?.includes('transaction_type') || error.code === '42703') {
      console.warn('Campo transaction_type não existe, buscando sem filtro')
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
  description?: string | null
): Promise<Compromisso | null> {
  // Usa supabaseAdmin para bypass RLS (chamado do servidor/webhook)
  if (!supabaseAdmin) {
    console.error('supabaseAdmin não está configurado. Verifique SUPABASE_SERVICE_ROLE_KEY.')
    return null
  }
  const client = supabaseAdmin
  
  console.log('createCompromisso - Tentando inserir:', { tenantId, title, scheduledAt, description })
  
  const { data, error } = await client
    .from('compromissos')
    .insert({
      tenant_id: tenantId,
      title,
      description: description || null,
      scheduled_at: scheduledAt,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating compromisso:', error)
    console.error('Error details:', JSON.stringify(error, null, 2))
    return null
  }

  console.log('createCompromisso - Sucesso! ID:', data?.id)
  return data
}

export async function getCompromissosByTenant(
  tenantId: string,
  startDate?: string,
  endDate?: string
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

  if (startDate) {
    query = query.gte('scheduled_at', startDate)
  }

  if (endDate) {
    query = query.lte('scheduled_at', endDate)
  }

  // Supabase tem limite padrão de 1000, mas vamos garantir que buscamos todos
  // Se houver muitos compromissos, pode precisar de paginação, mas para uso normal não deve ser problema
  const { data, error, count } = await query

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

// ============================================
// CONVERSATIONS
// ============================================

export async function createConversation(
  tenantId: string,
  message: string,
  role: 'user' | 'assistant'
): Promise<Conversation | null> {
  // Usa supabaseAdmin para bypass RLS (chamado do servidor/webhook)
  if (!supabaseAdmin) {
    console.error('supabaseAdmin não está configurado. Verifique SUPABASE_SERVICE_ROLE_KEY.')
    return null
  }
  const client = supabaseAdmin
  
  const { data, error } = await client
    .from('conversations')
    .insert({
      tenant_id: tenantId,
      message,
      role,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating conversation:', error)
    return null
  }

  return data
}

export async function getRecentConversations(
  tenantId: string,
  limit: number = 10
): Promise<Conversation[]> {
  // Usa supabaseAdmin para bypass RLS (chamado do servidor/webhook)
  if (!supabaseAdmin) {
    console.error('supabaseAdmin não está configurado. Verifique SUPABASE_SERVICE_ROLE_KEY.')
    return []
  }
  const client = supabaseAdmin
  
  const { data, error } = await client
    .from('conversations')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('Error fetching conversations:', error)
    return []
  }

  return data || []
}
