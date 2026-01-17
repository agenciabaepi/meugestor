import { createServerClient } from '@/lib/db/client'
import type { SessionContext } from '@/lib/db/types'
import { getSessionContextFromUserId } from '@/lib/db/user-profile'

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

  return getSessionContextFromUserId(supabase as any, session.user.id)
}

