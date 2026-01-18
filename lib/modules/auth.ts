/**
 * Módulo de autenticação e vinculação WhatsApp
 */

import { supabaseAdmin } from '../db/client'

function normalizeWhatsApp(whatsappNumber: string): string {
  return String(whatsappNumber || '').replace(/\D/g, '')
}

function isMissingRelationOrColumn(err: any): boolean {
  const msg = String(err?.message || '').toLowerCase()
  const code = String(err?.code || '')
  return code === '42P01' || code === '42703' || msg.includes('does not exist') || msg.includes('column')
}

async function tryGetUserByWhatsAppFromTable(
  table: 'users' | 'users_meugestor',
  normalized: string
): Promise<{ id: string; tenant_id: string } | null> {
  if (!supabaseAdmin) return null
  try {
    const { data, error } = await supabaseAdmin
      .from(table)
      .select('id, tenant_id, whatsapp_number, email')
      .eq('whatsapp_number', normalized)
      .maybeSingle()

    if (error) {
      if (isMissingRelationOrColumn(error)) return null
      console.error(`getUserByWhatsApp: erro na query (${table}):`, error)
      return null
    }
    if (!data?.id || !data?.tenant_id) return null
    return { id: data.id, tenant_id: data.tenant_id }
  } catch (e) {
    console.error(`getUserByWhatsApp: exceção (${table}):`, e)
    return null
  }
}

/**
 * Vincula um número de WhatsApp a um usuário
 */
export async function linkWhatsAppToUser(
  userId: string,
  whatsappNumber: string
): Promise<boolean> {
  try {
    if (!supabaseAdmin) {
      console.error('supabaseAdmin não configurado')
      return false
    }

    const normalized = normalizeWhatsApp(whatsappNumber)

    // Verifica se o número já está vinculado a outro usuário
    for (const table of ['users', 'users_meugestor'] as const) {
      const { data: existing, error } = await supabaseAdmin
        .from(table)
        .select('id')
        .eq('whatsapp_number', normalized)
        .maybeSingle()
      if (error && !isMissingRelationOrColumn(error)) {
        console.error(`Erro ao verificar WhatsApp existente (${table}):`, error)
      }
      if (existing?.id && existing.id !== userId) {
        console.error('WhatsApp já vinculado a outro usuário')
        return false
      }
    }

    // Atualiza o usuário (tenta em users e users_meugestor; tolera ambientes diferentes)
    let updated = false
    for (const table of ['users', 'users_meugestor'] as const) {
      const { error } = await supabaseAdmin.from(table).update({ whatsapp_number: normalized }).eq('id', userId)
      if (!error) updated = true
      if (error && !isMissingRelationOrColumn(error)) {
        console.error(`Erro ao vincular WhatsApp (${table}):`, error)
      }
    }

    // Atualiza auth.user_metadata (fallback canônico)
    try {
      const admin = (supabaseAdmin as any).auth?.admin
      if (admin?.updateUserById) {
        await admin.updateUserById(userId, { user_metadata: { whatsapp_number: normalized } })
      }
    } catch {
      // ignore
    }

    if (!updated) return false
    return true
  } catch (error) {
    console.error('Erro ao vincular WhatsApp:', error)
    return false
  }
}

/**
 * Busca usuário pelo número do WhatsApp
 */
export async function getUserByWhatsApp(
  whatsappNumber: string
): Promise<{ id: string; tenant_id: string } | null> {
  try {
    if (!supabaseAdmin) {
      console.error('getUserByWhatsApp: supabaseAdmin não configurado')
      return null
    }

    const normalized = normalizeWhatsApp(whatsappNumber)
    console.log('getUserByWhatsApp: Buscando usuário com número normalizado:', normalized)

    // Primeiro tenta em users (schema mais provável). Se não achar, tenta users_meugestor.
    const found =
      (await tryGetUserByWhatsAppFromTable('users', normalized)) ||
      (await tryGetUserByWhatsAppFromTable('users_meugestor', normalized))
    if (found) {
      console.log('getUserByWhatsApp: Usuário encontrado:', { id: found.id })
      return found
    }

    // Fallback: tenta achar tenant pelo número e depois um usuário admin no tenant
    try {
      const { data: tenant } = await supabaseAdmin
        .from('tenants')
        .select('id')
        .eq('whatsapp_number', normalized)
        .maybeSingle()
      if (tenant?.id) {
        for (const table of ['users', 'users_meugestor'] as const) {
          const { data: u, error } = await supabaseAdmin
            .from(table)
            .select('id, tenant_id, role')
            .eq('tenant_id', tenant.id)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle()
          if (error && isMissingRelationOrColumn(error)) continue
          if (u?.id && u?.tenant_id) return { id: u.id, tenant_id: u.tenant_id }
        }
      }
    } catch {
      // ignore
    }

    console.log('getUserByWhatsApp: Nenhum usuário encontrado para o número:', normalized)
    return null
  } catch (error) {
    console.error('Erro ao buscar usuário por WhatsApp:', error)
    return null
  }
}

/**
 * Obtém tenant baseado no número do WhatsApp (para webhook)
 * SEGURANÇA: Só retorna tenant se o número estiver vinculado a um usuário autenticado
 * Não cria tenants temporários para prevenir uso não autorizado
 */
export async function getOrCreateTenantByWhatsApp(
  whatsappNumber: string
): Promise<{ tenant_id: string; user_id: string | null } | null> {
  try {
    // SEGURANÇA: Só permite uso se o número estiver vinculado a um usuário autenticado
    const user = await getUserByWhatsApp(whatsappNumber)
    
    if (user) {
      return {
        tenant_id: user.tenant_id,
        user_id: user.id,
      }
    }

    // Se não encontrou usuário vinculado, retorna null
    // NÃO cria tenant temporário para prevenir uso não autorizado
    console.warn(`Tentativa de uso do bot por número não vinculado: ${whatsappNumber}`)
    return null
  } catch (error) {
    console.error('Erro ao obter tenant:', error)
    return null
  }
}
