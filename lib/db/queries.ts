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
  receiptImageUrl?: string | null
): Promise<Financeiro | null> {
  // Usa supabaseAdmin para bypass RLS (chamado do servidor/webhook)
  if (!supabaseAdmin) {
    console.error('supabaseAdmin não está configurado. Verifique SUPABASE_SERVICE_ROLE_KEY.')
    return null
  }
  const client = supabaseAdmin
  
  const { data, error } = await client
    .from('financeiro')
    .insert({
      tenant_id: tenantId,
      amount,
      description,
      category,
      date,
      receipt_image_url: receiptImageUrl || null,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating financeiro:', error)
    return null
  }

  return data
}

export async function getFinanceiroByTenant(
  tenantId: string,
  startDate?: string,
  endDate?: string
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

  const { data, error } = await query

  if (error) {
    console.error('Error fetching financeiro:', error)
    return []
  }

  return data || []
}

export async function getFinanceiroByCategory(
  tenantId: string,
  category: string,
  startDate?: string,
  endDate?: string
): Promise<Financeiro[]> {
  let query = supabase
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
    return null
  }

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
    .select('*')
    .eq('tenant_id', tenantId)
    .order('scheduled_at', { ascending: true })

  if (startDate) {
    query = query.gte('scheduled_at', startDate)
  }

  if (endDate) {
    query = query.lte('scheduled_at', endDate)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching compromissos:', error)
    return []
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
