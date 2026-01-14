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
      console.error('getUserByWhatsApp: supabaseAdmin não configurado')
      return null
    }

    const normalized = whatsappNumber.replace(/\D/g, '')
    console.log('getUserByWhatsApp: Buscando usuário com número normalizado:', normalized)

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, tenant_id, whatsapp_number, email')
      .eq('whatsapp_number', normalized)
      .single()

    if (error) {
      console.error('getUserByWhatsApp: Erro na query:', error)
      // Tenta buscar sem .single() para ver se há algum registro
      const { data: allData, error: listError } = await supabaseAdmin
        .from('users')
        .select('id, tenant_id, whatsapp_number, email')
        .limit(10)
      
      if (!listError && allData) {
        console.log('getUserByWhatsApp: Usuários existentes na tabela:', allData.map(u => ({ email: u.email, whatsapp: u.whatsapp_number })))
      }
      return null
    }

    if (!data) {
      console.log('getUserByWhatsApp: Nenhum usuário encontrado para o número:', normalized)
      return null
    }

    console.log('getUserByWhatsApp: Usuário encontrado:', { id: data.id, email: data.email, whatsapp: data.whatsapp_number })
    return { id: data.id, tenant_id: data.tenant_id }
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
