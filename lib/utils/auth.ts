/**
 * Utilitários de autenticação
 */

import { supabase } from '../db/client'

/**
 * Verifica se o usuário está autenticado
 */
export async function getSession() {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session
}

/**
 * Obtém o usuário atual
 */
export async function getCurrentUser() {
  const session = await getSession()
  if (!session) {
    return null
  }

  return session.user
}

/**
 * Faz logout
 */
export async function logout() {
  await supabase.auth.signOut()
}
