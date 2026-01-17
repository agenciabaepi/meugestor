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
  const supabase = await createServerClient()
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  if (error || !session?.user?.id) return null

  // Preferir admin para conseguir fallback via auth.user_metadata quando necessário.
  return getSessionContextFromUserId((supabaseAdmin as any) || (supabase as any), session.user.id)
}

