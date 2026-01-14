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
 * Faz logout (para uso no servidor)
 */
export async function logout() {
  const supabase = await createServerClient()
  await supabase.auth.signOut()
}
