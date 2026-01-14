/**
 * Módulo de autenticação e vinculação WhatsApp
 */

import { supabaseAdmin } from '../db/client'

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

    // Normaliza o número (remove caracteres não numéricos)
    const normalized = whatsappNumber.replace(/\D/g, '')

    // Verifica se o número já está vinculado a outro usuário
    const { data: existing } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('whatsapp_number', normalized)
      .single()

    if (existing && existing.id !== userId) {
      console.error('WhatsApp já vinculado a outro usuário')
      return false
    }

    // Atualiza o usuário
    const { error } = await supabaseAdmin
      .from('users')
      .update({ whatsapp_number: normalized })
      .eq('id', userId)

    if (error) {
      console.error('Erro ao vincular WhatsApp:', error)
      return false
    }

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
      return null
    }

    const normalized = whatsappNumber.replace(/\D/g, '')

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, tenant_id')
      .eq('whatsapp_number', normalized)
      .single()

    if (error || !data) {
      return null
    }

    return data
  } catch (error) {
    console.error('Erro ao buscar usuário por WhatsApp:', error)
    return null
  }
}

/**
 * Obtém ou cria tenant baseado no número do WhatsApp (para webhook)
 * Se encontrar usuário vinculado, usa o tenant dele
 * Caso contrário, cria um tenant temporário
 */
export async function getOrCreateTenantByWhatsApp(
  whatsappNumber: string
): Promise<{ tenant_id: string; user_id: string | null } | null> {
  try {
    // Primeiro, tenta encontrar usuário vinculado
    const user = await getUserByWhatsApp(whatsappNumber)
    
    if (user) {
      return {
        tenant_id: user.tenant_id,
        user_id: user.id,
      }
    }

    // Se não encontrou, busca tenant existente pelo número
    if (!supabaseAdmin) {
      return null
    }

    const normalized = whatsappNumber.replace(/\D/g, '')
    
    const { data: tenant } = await supabaseAdmin
      .from('tenants')
      .select('id')
      .eq('whatsapp_number', normalized)
      .single()

    if (tenant) {
      return {
        tenant_id: tenant.id,
        user_id: null,
      }
    }

    // Cria novo tenant temporário (sem usuário vinculado)
    const { data: newTenant, error } = await supabaseAdmin
      .from('tenants')
      .insert({
        name: `Tenant ${normalized}`,
        whatsapp_number: normalized,
      })
      .select()
      .single()

    if (error || !newTenant) {
      console.error('Erro ao criar tenant:', error)
      return null
    }

    return {
      tenant_id: newTenant.id,
      user_id: null,
    }
  } catch (error) {
    console.error('Erro ao obter/criar tenant:', error)
    return null
  }
}
