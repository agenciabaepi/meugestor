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
  // maybeSingle evita erro quando não há linhas (PGRST116), permitindo tentar outras tabelas/estratégias.
  const { data, error } = await client.from(table).select(columns).eq('id', userId).maybeSingle()
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
    // Estratégia robusta: tenta conjuntos de colunas do mais completo ao mínimo.
    // Isso permite funcionar em ambientes onde a tabela existe mas tem colunas diferentes.
    const columnSets = [
      'id, tenant_id, email, whatsapp_number, role, name, created_at, updated_at, mode, empresa_id',
      'id, tenant_id, email, whatsapp_number, role, name, created_at, updated_at',
      'id, tenant_id, email, role, created_at',
    ] as const

    let picked: { data: any | null; error: any | null } | null = null
    for (const cols of columnSets) {
      const res = await trySelectSingle<any>(client, table, userId, cols)
      if (!res.error && res.data) {
        picked = res
        break
      }
      if (res.error && isMissingRelationError(res.error)) {
        picked = null
        break
      }
      if (res.error && isMissingColumnError(res.error)) {
        // tenta próximo conjunto
        continue
      }
      // outro erro (RLS etc) — aborta
      if (res.error) return null
    }

    if (picked?.data) {
      // Preenche campos ausentes de forma segura
      const base: any = picked.data
      let ctx = await tryGetUserSessionContext(client, userId)

      // Fallback via auth.user_metadata para colunas que não existirem (ex: whatsapp_number, name, mode, empresa_id)
      const anyClient: any = client as any
      const admin = anyClient?.auth?.admin
      if (admin?.getUserById) {
        try {
          const res = await admin.getUserById(userId)
          const meta = res?.data?.user?.user_metadata || res?.data?.user?.raw_user_meta_data || {}
          if (!base.whatsapp_number && meta?.whatsapp_number) base.whatsapp_number = String(meta.whatsapp_number)
          if (!base.name && meta?.name) base.name = String(meta.name)
          if (!base.email && res?.data?.user?.email) base.email = String(res.data.user.email)
          if (!base.mode && meta?.mode) base.mode = meta.mode === 'empresa' ? 'empresa' : 'pessoal'
          if (!base.empresa_id && (meta?.empresa_id || meta?.empresaId)) base.empresa_id = String(meta.empresa_id || meta.empresaId)
        } catch {
          // ignore
        }
      }

      const user = {
        id: base.id,
        tenant_id: base.tenant_id,
        email: base.email ?? '',
        whatsapp_number: base.whatsapp_number ?? '',
        role: base.role ?? 'user',
        name: base.name ?? null,
        created_at: base.created_at ?? null,
        updated_at: base.updated_at ?? null,
        mode: (base.mode ?? ctx?.mode ?? 'pessoal') as any,
        empresa_id: (base.empresa_id ?? ctx?.empresa_id ?? null) as any,
      } as User

      return { table, user }
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

  // Regra: se já existe empresa_id, o contexto deve ser empresa (mesmo que mode esteja default/errado).
  const inferredMode: AppMode =
    row.user.empresa_id ? 'empresa' : row.user.mode === 'empresa' ? 'empresa' : 'pessoal'
  const mode: AppMode = inferredMode
  const empresaId = (row.user.empresa_id ?? null) as string | null

  // Fallback: se não há colunas/tabela e client tem admin API, tenta ler auth.user_metadata
  // (isso permite "reconhecer modo empresa" mesmo sem migrations aplicadas)
  if (mode === 'pessoal' && !empresaId) {
    const anyClient: any = client as any
    const admin = anyClient?.auth?.admin
    if (admin?.getUserById) {
      try {
        const res = await admin.getUserById(userId)
        const meta = res?.data?.user?.user_metadata || res?.data?.user?.raw_user_meta_data || {}
        const m = meta?.mode === 'empresa' ? 'empresa' : null
        const eId = meta?.empresa_id || meta?.empresaId || null
        if (m === 'empresa' && eId) {
          // Sobrescreve apenas se realmente encontrar contexto
          ;(row.user as any).mode = 'empresa'
          ;(row.user as any).empresa_id = String(eId)

          // Best-effort: se as colunas já existem, faz backfill no perfil para não ficar "pessoal" no banco.
          // (Isso corrige cadastros antigos onde a vinculação falhou por falta de migrations/colunas.)
          try {
            await client
              .from(row.table)
              .update({ mode: 'empresa', empresa_id: String(eId) })
              .eq('id', userId)
          } catch {
            // ignore
          }

          // Best-effort: backfill também no user_session_context, se existir.
          try {
            const up = await client
              .from('user_session_context')
              .upsert(
                {
                  user_id: userId,
                  tenant_id: row.user.tenant_id,
                  mode: 'empresa',
                  empresa_id: String(eId),
                },
                { onConflict: 'user_id' }
              )
            if (up?.error && isMissingRelationError(up.error)) {
              // ignore
            }
          } catch {
            // ignore
          }
        }
      } catch {
        // ignore
      }
    }
  }

  const finalMode: AppMode = (row.user as any).mode === 'empresa' ? 'empresa' : 'pessoal'
  const finalEmpresaId = ((row.user as any).empresa_id ?? null) as string | null

  const ctx: SessionContext = {
    tenant_id: row.user.tenant_id,
    user_id: userId,
    mode: finalMode,
    empresa_id: finalEmpresaId,
  }

  if (ctx.mode === 'empresa' && ctx.empresa_id) {
    try {
      const { data, error } = await client
        .from('empresas')
        .select('nome_fantasia')
        .eq('id', ctx.empresa_id)
        .eq('tenant_id', row.user.tenant_id)
        .single()
      if (!error && data) ctx.empresa_nome_fantasia = data.nome_fantasia ?? null
    } catch {
      // tolera ambientes sem a tabela ainda
    }
  }

  return ctx
}

