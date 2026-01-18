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
  console.log('[getUserRowById] Buscando usuário:', userId)
  const candidates: Array<{ table: 'users_meugestor' | 'users'; user: User }> = []
  const tablesToTry: Array<'users_meugestor' | 'users'> = ['users_meugestor', 'users']
  for (const table of tablesToTry) {
    console.log('[getUserRowById] Tentando tabela:', table)
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
        console.log('[getUserRowById] Tabela não existe:', table)
        picked = null
        break
      }
      if (res.error && isMissingColumnError(res.error)) {
        console.log('[getUserRowById] Coluna não existe, tentando próximo conjunto')
        // tenta próximo conjunto
        continue
      }
      // outro erro (RLS etc) — loga mas continua tentando
      if (res.error) {
        console.warn('[getUserRowById] Erro ao buscar na tabela', table, ':', res.error.message)
        // Não retorna null imediatamente, continua tentando outras tabelas
        continue
      }
    }

    if (picked?.data) {
      // Preenche campos ausentes de forma segura
      const base: any = picked.data
      const ctx = await tryGetUserSessionContext(client, userId)

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

      candidates.push({ table, user })
    }
  }

  if (candidates.length === 0) {
    console.warn('[getUserRowById] Nenhum candidato encontrado para userId:', userId)
    return null
  }
  if (candidates.length === 1) {
    console.log('[getUserRowById] Candidato único encontrado:', candidates[0].table)
    return candidates[0]
  }

  function score(u: User): number {
    let s = 0
    if (u.tenant_id) s += 2
    if (u.email) s += 1
    if (u.role) s += 1
    if (u.name) s += 1
    if (u.whatsapp_number) s += 3
    if (u.updated_at) s += 1
    if (u.mode) s += 1
    if (u.empresa_id) s += 3
    return s
  }

  // Escolhe a linha mais completa. Em empate, preferir 'users' (tende a ser a tabela canônica com whatsapp/mode).
  candidates.sort((a, b) => {
    const d = score(b.user) - score(a.user)
    if (d !== 0) return d
    if (a.table === b.table) return 0
    return a.table === 'users' ? -1 : 1
  })
  return candidates[0]
}

export async function updateUserModeAndEmpresa(
  client: SupabaseLikeClient,
  userId: string,
  params: { mode: AppMode; empresaId: string | null }
): Promise<boolean> {
  console.log('[updateUserModeAndEmpresa] Atualizando contexto:', { userId, mode: params.mode, empresaId: params.empresaId })
  
  // Primeiro, busca tenant_id e a tabela onde o usuário existe
  const row = await getUserRowById(client, userId)
  if (!row) {
    console.warn('[updateUserModeAndEmpresa] Usuário não encontrado:', userId)
    return false
  }

  const tenantId = row.user.tenant_id
  if (!tenantId) {
    console.warn('[updateUserModeAndEmpresa] Tenant ID não encontrado para usuário:', userId)
    return false
  }

  const table = row.table
  let updatedInTable = false
  let tableError: any = null

  // Tenta atualizar na tabela de perfil (users/users_meugestor)
  try {
    // IMPORTANTE: Se mode='empresa' e empresaId é null, isso viola a constraint
    // Mas o endpoint já valida isso antes de chamar esta função
    const updateData: any = { mode: params.mode }
    if (params.mode === 'empresa' && params.empresaId) {
      updateData.empresa_id = params.empresaId
    } else if (params.mode === 'pessoal') {
      updateData.empresa_id = null
    }

    const { data, error } = await client
      .from(table)
      .update(updateData)
      .eq('id', userId)
      .select('id')

    if (!error && data && Array.isArray(data) && data.length > 0) {
      console.log('[updateUserModeAndEmpresa] Atualizado com sucesso na tabela:', table)
      updatedInTable = true
    } else if (error) {
      tableError = error
      if (isMissingColumnError(error)) {
        console.warn('[updateUserModeAndEmpresa] Colunas mode/empresa_id não existem na tabela:', table)
      } else {
        console.error('[updateUserModeAndEmpresa] Erro ao atualizar tabela:', error.code, error.message)
      }
    }
  } catch (e) {
    console.error('[updateUserModeAndEmpresa] Exceção ao atualizar tabela:', e)
    tableError = e
  }

  // SEMPRE tenta salvar em user_session_context (mesmo que tenha conseguido atualizar na tabela)
  // Isso garante persistência mesmo se as colunas não existirem na tabela principal
  let updatedInContext = false
  try {
    const { error: ctxError } = await client
      .from('user_session_context')
      .upsert(
        {
          user_id: userId,
          tenant_id: tenantId,
          mode: params.mode,
          empresa_id: params.mode === 'empresa' ? params.empresaId : null,
        },
        { onConflict: 'user_id' }
      )
    
    if (!ctxError) {
      console.log('[updateUserModeAndEmpresa] ✅ Atualizado com sucesso em user_session_context')
      updatedInContext = true
    } else if (isMissingRelationError(ctxError)) {
      console.warn('[updateUserModeAndEmpresa] Tabela user_session_context não existe (migration não aplicada?)')
    } else {
      console.error('[updateUserModeAndEmpresa] Erro ao atualizar user_session_context:', ctxError.code, ctxError.message)
    }
  } catch (e) {
    console.error('[updateUserModeAndEmpresa] Exceção ao atualizar user_session_context:', e)
  }

  // Retorna true se atualizou em pelo menos um lugar
  // Prioriza user_session_context pois é mais confiável
  const success = updatedInTable || updatedInContext
  
  if (success) {
    console.log('[updateUserModeAndEmpresa] ✅ Contexto atualizado com sucesso')
  } else {
    console.error('[updateUserModeAndEmpresa] ❌ Falha ao atualizar contexto em ambos os lugares', { tableError })
  }
  
  return success
}

export async function getSessionContextFromUserId(
  client: SupabaseLikeClient,
  userId: string
): Promise<SessionContext | null> {
  console.log('[getSessionContextFromUserId] Iniciando busca de contexto para userId:', userId)

  // 1) Prioridade: user_session_context (quando existir) — independe da tabela de perfil
  const ctxRow = await tryGetUserSessionContext(client, userId)
  if (ctxRow?.tenant_id) {
    const mode: AppMode = ctxRow.empresa_id ? 'empresa' : ctxRow.mode === 'empresa' ? 'empresa' : 'pessoal'
    const ctx: SessionContext = {
      tenant_id: ctxRow.tenant_id,
      user_id: userId,
      mode,
      empresa_id: ctxRow.empresa_id ?? null,
    }
    if (ctx.mode === 'empresa' && ctx.empresa_id) {
      try {
        const { data, error } = await client
          .from('empresas')
          .select('nome_fantasia')
          .eq('id', ctx.empresa_id)
          .eq('tenant_id', ctx.tenant_id)
          .maybeSingle()
        if (!error && data) ctx.empresa_nome_fantasia = data.nome_fantasia ?? null
      } catch {
        // ignore
      }
    }
    console.log('[getSessionContextFromUserId] Contexto vindo de user_session_context:', {
      tenant_id: ctx.tenant_id,
      mode: ctx.mode,
      empresa_id: ctx.empresa_id,
    })
    return ctx
  }

  // 2) Fallback: tabela de perfil (users/users_meugestor)
  const row = await getUserRowById(client, userId)
  if (!row) {
    console.warn('[getSessionContextFromUserId] getUserRowById retornou null para userId:', userId)
    return null
  }

  console.log('[getSessionContextFromUserId] Usuário encontrado:', {
    table: row.table,
    tenant_id: row.user.tenant_id,
    mode: row.user.mode,
    empresa_id: row.user.empresa_id,
  })

  // Regra: se já existe empresa_id, o contexto deve ser empresa (mesmo que mode esteja default/errado).
  const inferredMode: AppMode =
    row.user.empresa_id ? 'empresa' : row.user.mode === 'empresa' ? 'empresa' : 'pessoal'
  const mode: AppMode = inferredMode
  const empresaId = (row.user.empresa_id ?? null) as string | null
  
  console.log('[getSessionContextFromUserId] Modo inferido:', { inferredMode, mode, empresaId })

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

  let finalMode: AppMode = (row.user as any).mode === 'empresa' ? 'empresa' : 'pessoal'
  let finalEmpresaId = ((row.user as any).empresa_id ?? null) as string | null

  // Fallback adicional: se o usuário já tem empresa(s) no tenant mas não está vinculado,
  // tenta inferir automaticamente quando houver exatamente 1 empresa.
  // Isso evita o caso "sou empresa mas o bot não reconhece".
  if (!finalEmpresaId) {
    console.log('[getSessionContextFromUserId] Tentando inferir empresa do tenant:', row.user.tenant_id)
    try {
      const { data: empresas, error } = await client
        .from('empresas')
        .select('id, nome_fantasia')
        .eq('tenant_id', row.user.tenant_id)
        .limit(2)

      console.log('[getSessionContextFromUserId] Empresas no tenant:', { empresas, error })

      if (!error && Array.isArray(empresas) && empresas.length === 1) {
        console.log('[getSessionContextFromUserId] Inferindo modo empresa automaticamente da única empresa:', empresas[0].id)
        
        finalMode = 'empresa'
        finalEmpresaId = empresas[0].id
        ;(row.user as any).mode = 'empresa'
        ;(row.user as any).empresa_id = finalEmpresaId

        // Best-effort: persiste no perfil (se colunas existirem)
        try {
          const updResult = await client.from(row.table).update({ mode: 'empresa', empresa_id: finalEmpresaId }).eq('id', userId)
          if (updResult.error) {
            console.warn('[getSessionContextFromUserId] Falha ao atualizar perfil:', updResult.error)
          } else {
            console.log('[getSessionContextFromUserId] Perfil atualizado com sucesso')
          }
        } catch (e) {
          console.warn('[getSessionContextFromUserId] Exceção ao atualizar perfil:', e)
        }

        // Best-effort: persiste no user_session_context (se existir)
        try {
          const up = await client
            .from('user_session_context')
            .upsert(
              {
                user_id: userId,
                tenant_id: row.user.tenant_id,
                mode: 'empresa',
                empresa_id: finalEmpresaId,
              },
              { onConflict: 'user_id' }
            )
          if (up?.error && isMissingRelationError(up.error)) {
            console.warn('[getSessionContextFromUserId] Tabela user_session_context não existe')
          } else if (up?.error) {
            console.warn('[getSessionContextFromUserId] Falha ao atualizar user_session_context:', up.error)
          } else {
            console.log('[getSessionContextFromUserId] user_session_context atualizado com sucesso')
          }
        } catch (e) {
          console.warn('[getSessionContextFromUserId] Exceção ao atualizar user_session_context:', e)
        }
      }
    } catch (e) {
      console.warn('[getSessionContextFromUserId] Erro ao buscar empresas do tenant:', e)
      // tolera ambientes sem a tabela ainda
    }
  }

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
      if (!error && data) {
        ctx.empresa_nome_fantasia = data.nome_fantasia ?? null
        console.log('[getSessionContextFromUserId] Nome fantasia da empresa:', data.nome_fantasia)
      }
    } catch (e) {
      console.warn('[getSessionContextFromUserId] Erro ao buscar nome fantasia da empresa:', e)
      // tolera ambientes sem a tabela ainda
    }
  }

  console.log('[getSessionContextFromUserId] Contexto final retornado:', {
    mode: ctx.mode,
    empresa_id: ctx.empresa_id,
    empresa_nome_fantasia: ctx.empresa_nome_fantasia,
  })

  return ctx
}

