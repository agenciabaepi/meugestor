/**
 * Utilitários de autenticação
 */

import { createServerClient } from '../db/client'

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

    const supabase = await createServerClient()
    const { data, error } = await supabase
      .from('users')
      .select('tenant_id')
      .eq('id', session.user.id)
      .single()

    if (error || !data) {
      console.error('Error fetching tenant_id for user:', error)
      return null
    }

    return data.tenant_id
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
