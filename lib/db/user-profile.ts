import type { AppMode, SessionContext, User } from './types'

type SupabaseLikeClient = {
  from: (table: string) => any
}

function isMissingRelationError(err: any): boolean {
  const msg = String(err?.message || '')
  const code = String(err?.code || '')
  return code === '42P01' || msg.toLowerCase().includes('does not exist') || msg.toLowerCase().includes('relation')
}

function isMissingColumnError(err: any): boolean {
  const msg = String(err?.message || '').toLowerCase()
  const code = String(err?.code || '')
  return code === '42703' || msg.includes('column') || msg.includes('does not exist')
}

async function trySelectSingle<T>(
  client: SupabaseLikeClient,
  table: string,
  userId: string,
  columns: string
): Promise<{ data: T | null; error: any | null }> {
  const { data, error } = await client.from(table).select(columns).eq('id', userId).single()
  return { data, error }
}

async function tryGetUserSessionContext(
  client: SupabaseLikeClient,
  userId: string
): Promise<{ tenant_id: string; mode: AppMode; empresa_id: string | null } | null> {
  try {
    const { data, error } = await client
      .from('user_session_context')
      .select('tenant_id, mode, empresa_id')
      .eq('user_id', userId)
      .single()
    if (error) {
      if (isMissingRelationError(error)) return null
      return null
    }
    if (!data) return null
    return {
      tenant_id: data.tenant_id,
      mode: data.mode === 'empresa' ? 'empresa' : 'pessoal',
      empresa_id: data.empresa_id ?? null,
    }
  } catch {
    return null
  }
}

export async function getUserRowById(
  client: SupabaseLikeClient,
  userId: string
): Promise<{ table: 'users_meugestor' | 'users'; user: User } | null> {
  const preferred: Array<'users_meugestor' | 'users'> = ['users_meugestor', 'users']
  for (const table of preferred) {
    const { data, error } = await trySelectSingle<User>(
      client,
      table,
      userId,
      'id, tenant_id, email, whatsapp_number, role, name, created_at, updated_at, mode, empresa_id'
    )

    if (!error && data) return { table, user: data }
    // Se as colunas mode/empresa_id não existirem nesse ambiente, tenta fallback sem elas.
    if (error && isMissingColumnError(error)) {
      const fallback = await trySelectSingle<User>(
        client,
        table,
        userId,
        'id, tenant_id, email, whatsapp_number, role, name, created_at, updated_at'
      )
      if (!fallback.error && fallback.data) {
        const ctx = await tryGetUserSessionContext(client, userId)
        const user = {
          ...fallback.data,
          mode: (ctx?.mode ?? 'pessoal') as any,
          empresa_id: (ctx?.empresa_id ?? null) as any,
        } as User
        return { table, user }
      }
    }

    if (error && !isMissingRelationError(error)) {
      // Erro real (ex: RLS, etc) — não tenta mascarar.
      return null
    }
  }
  return null
}

export async function updateUserModeAndEmpresa(
  client: SupabaseLikeClient,
  userId: string,
  params: { mode: AppMode; empresaId: string | null }
): Promise<boolean> {
  const preferred: Array<'users_meugestor' | 'users'> = ['users_meugestor', 'users']
  for (const table of preferred) {
    const { data, error } = await client
      .from(table)
      .update({ mode: params.mode, empresa_id: params.empresaId })
      .eq('id', userId)
      .select('id')

    if (!error) {
      // Se a tabela existe mas não tinha o userId, data vem vazio; tenta próxima.
      if (Array.isArray(data) && data.length === 0) continue
      return true
    }

    // Se as colunas não existem, não é fatal: o contexto pode ser persistido via user_session_context.
    if (error && isMissingColumnError(error)) {
      // tenta apenas garantir user_session_context (com tenant_id vindo do user row)
      try {
        const { data: u } = await client.from(table).select('tenant_id').eq('id', userId).single()
        if (u?.tenant_id) {
          const up = await client
            .from('user_session_context')
            .upsert(
              { user_id: userId, tenant_id: u.tenant_id, mode: params.mode, empresa_id: params.empresaId },
              { onConflict: 'user_id' }
            )
          if (!up.error) return true
        }
      } catch {
        // ignore
      }
      continue
    }

    if (error && !isMissingRelationError(error)) return false
  }
  return false
}

export async function getSessionContextFromUserId(
  client: SupabaseLikeClient,
  userId: string
): Promise<SessionContext | null> {
  const row = await getUserRowById(client, userId)
  if (!row) return null

  const mode: AppMode = row.user.mode === 'empresa' ? 'empresa' : 'pessoal'
  const empresaId = (row.user.empresa_id ?? null) as string | null

  const ctx: SessionContext = {
    tenant_id: row.user.tenant_id,
    user_id: userId,
    mode,
    empresa_id: empresaId,
  }

  if (mode === 'empresa' && empresaId) {
    try {
      const { data, error } = await client
        .from('empresas')
        .select('nome_fantasia')
        .eq('id', empresaId)
        .eq('tenant_id', row.user.tenant_id)
        .single()
      if (!error && data) ctx.empresa_nome_fantasia = data.nome_fantasia ?? null
    } catch {
      // tolera ambientes sem a tabela ainda
    }
  }

  return ctx
}

