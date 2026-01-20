import { createServerClient } from '@/lib/db/client'
import type { SessionContext } from '@/lib/db/types'
import { getSessionContextFromUserId } from '@/lib/db/user-profile'
import { supabaseAdmin } from '@/lib/db/client'

/**
 * Contexto global de sessão:
 * - tenant_id
 * - mode: "pessoal" | "empresa"
 * - empresa_id (quando mode === "empresa")
 *
 * IMPORTANTE: server-only (usa cookies/sessão).
 */
export async function getSessionContext(): Promise<SessionContext | null> {
  try {
    const supabase = await createServerClient()
    // getUser() valida via Supabase Auth e também pode forçar refresh quando necessário
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user?.id) {
      console.warn('[getSessionContext] Sem usuário ou erro:', error?.message)
      return null
    }

    // Preferir admin para conseguir fallback via auth.user_metadata quando necessário.
    const client = (supabaseAdmin as any) || (supabase as any)
    if (!client) {
      console.warn('[getSessionContext] Cliente Supabase não disponível')
      return null
    }

    const ctx = await getSessionContextFromUserId(client, user.id)
    if (!ctx) {
      console.warn('[getSessionContext] Contexto não encontrado para userId:', user.id)
      // Retorna contexto mínimo baseado apenas na sessão
      return {
        tenant_id: '', // vazio se não encontrou
        user_id: user.id,
        mode: 'pessoal',
        empresa_id: null,
      }
    }

    return ctx
  } catch (error) {
    console.error('[getSessionContext] Erro inesperado:', error)
    return null
  }
}

