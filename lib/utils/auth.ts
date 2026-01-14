/**
 * Utilitários de autenticação
 */

import { createServerClient } from '../db/client'

/**
 * Verifica se o usuário está autenticado (para uso no servidor)
 */
export async function getSession() {
  const supabase = await createServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session
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
}

/**
 * Faz logout (para uso no servidor)
 */
export async function logout() {
  const supabase = await createServerClient()
  await supabase.auth.signOut()
}
