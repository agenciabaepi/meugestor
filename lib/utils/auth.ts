/**
 * Utilitários de autenticação
 */

import { createServerClient } from '../db/client'
import { getUserRowById } from '../db/user-profile'

/**
 * Verifica se o usuário está autenticado (para uso no servidor)
 */
export async function getSession() {
  try {
    const supabase = await createServerClient()
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()
    
    if (error) {
      console.error('Error getting session:', error)
      return null
    }
    
    return session
  } catch (error) {
    console.error('Error in getSession:', error)
    return null
  }
}

/**
 * Obtém o usuário atual (para uso no servidor)
 */
export async function getCurrentUser() {
  const session = await getSession()
  if (!session) {
    return null
  }

  return session.user
}

/**
 * Obtém o tenant_id do usuário autenticado
 * CRÍTICO: Usa a sessão do usuário para garantir isolamento multi-tenant
 */
export async function getAuthenticatedTenantId(): Promise<string | null> {
  try {
    const session = await getSession()
    if (!session || !session.user) {
      return null
    }

    // Importa supabaseAdmin dinamicamente para evitar problemas de inicialização
    const { supabaseAdmin } = await import('../db/client')
    if (!supabaseAdmin) {
      console.warn('[getAuthenticatedTenantId] supabaseAdmin não configurado')
      return null
    }

    const row = await getUserRowById(supabaseAdmin as any, session.user.id)
    if (!row?.user?.tenant_id) return null
    return row.user.tenant_id
  } catch (error) {
    console.error('Error in getAuthenticatedTenantId:', error)
    // Retorna null em caso de erro para não quebrar a página
    return null
  }
}

/**
 * Faz logout (para uso no servidor)
 */
export async function logout() {
  const supabase = await createServerClient()
  await supabase.auth.signOut()
}
