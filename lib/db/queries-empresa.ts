import { supabaseAdmin } from './client'
import type { Compromisso, Financeiro, Fornecedor, Funcionario, Lista, ListaItem, ListaItemStatus, TenantContext } from './types'

function requireAdmin() {
  if (!supabaseAdmin) {
    throw new Error('supabaseAdmin não está configurado. Verifique SUPABASE_SERVICE_ROLE_KEY.')
  }
  return supabaseAdmin
}

// ============================================
// FINANCEIRO_EMPRESA
// ============================================

export async function createFinanceiroEmpresa(
  tenantId: string,
  empresaId: string,
  amount: number,
  description: string,
  category: string,
  date: string,
  receiptImageUrl?: string | null,
  subcategory?: string | null,
  metadata?: Record<string, any> | null,
  tags?: string[] | null,
  transactionType: 'expense' | 'revenue' = 'expense',
  userId?: string | null
): Promise<Financeiro | null> {
  const client = requireAdmin()
  const { data, error } = await client
    .from('financeiro_empresa')
    .insert({
      tenant_id: tenantId,
      empresa_id: empresaId,
      user_id: userId || null,
      amount,
      description,
      category,
      date,
      receipt_image_url: receiptImageUrl || null,
      subcategory: subcategory || null,
      metadata: metadata || {},
      tags: tags || [],
      transaction_type: transactionType,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating financeiro_empresa:', error)
    return null
  }
  return data
}

export async function getFinanceiroEmpresaByEmpresa(
  tenantId: string,
  empresaId: string,
  startDate?: string,
  endDate?: string,
  transactionType?: 'expense' | 'revenue',
  userId?: string | null
): Promise<Financeiro[]> {
  const client = requireAdmin()
  let query = client
    .from('financeiro_empresa')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('empresa_id', empresaId)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  if (userId) query = query.eq('user_id', userId)
  if (startDate) query = query.gte('date', startDate)
  if (endDate) query = query.lte('date', endDate)
  if (transactionType) query = query.eq('transaction_type', transactionType)

  const { data, error } = await query
  if (error) {
    console.error('Error fetching financeiro_empresa:', error)
    return []
  }
  return data || []
}

export async function getFinanceiroEmpresaByCategory(
  tenantId: string,
  empresaId: string,
  category: string,
  startDate?: string,
  endDate?: string
): Promise<Financeiro[]> {
  const client = requireAdmin()
  let query = client
    .from('financeiro_empresa')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('empresa_id', empresaId)
    .eq('category', category)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })

  if (startDate) query = query.gte('date', startDate)
  if (endDate) query = query.lte('date', endDate)

  const { data, error } = await query
  if (error) {
    console.error('Error fetching financeiro_empresa by category:', error)
    return []
  }
  return data || []
}

// ============================================
// COMPROMISSOS_EMPRESA
// ============================================

export async function createCompromissoEmpresa(
  tenantId: string,
  empresaId: string,
  title: string,
  scheduledAt: string,
  description?: string | null,
  userId?: string | null
): Promise<Compromisso | null> {
  const client = requireAdmin()
  const { data, error } = await client
    .from('compromissos_empresa')
    .insert({
      tenant_id: tenantId,
      empresa_id: empresaId,
      user_id: userId || null,
      title,
      description: description || null,
      scheduled_at: scheduledAt,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating compromissos_empresa:', error)
    return null
  }
  return data
}

export async function getCompromissoEmpresaById(
  id: string,
  tenantId: string,
  empresaId: string,
  userId?: string | null
): Promise<Compromisso | null> {
  const client = requireAdmin()
  let query = client
    .from('compromissos_empresa')
    .select('*')
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .eq('empresa_id', empresaId)

  if (userId) query = query.eq('user_id', userId)

  const { data, error } = await query.single()
  if (error) return null
  return data
}

export async function getCompromissosEmpresaByEmpresa(
  tenantId: string,
  empresaId: string,
  startDate?: string,
  endDate?: string,
  userId?: string | null,
  includeCancelled: boolean = false
): Promise<Compromisso[]> {
  const client = requireAdmin()
  let query = client
    .from('compromissos_empresa')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .eq('empresa_id', empresaId)
    .order('scheduled_at', { ascending: true })

  if (userId) query = query.eq('user_id', userId)
  if (!includeCancelled) query = query.eq('is_cancelled', false as any)
  if (startDate) query = query.gte('scheduled_at', startDate)
  if (endDate) query = query.lte('scheduled_at', endDate)

  const { data, error } = await query
  if (error) {
    console.error('Error fetching compromissos_empresa:', error)
    return []
  }
  return (data || []).map((item: any) => ({ ...item }))
}

export async function cancelCompromissoEmpresa(
  id: string,
  tenantId: string,
  empresaId: string,
  userId?: string | null
): Promise<Compromisso | null> {
  const client = requireAdmin()
  const { data, error } = await client
    .from('compromissos_empresa')
    .update({
      is_cancelled: true,
      cancelled_at: new Date().toISOString(),
      cancelled_by: userId || null,
    })
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .eq('empresa_id', empresaId)
    .select()
    .single()

  if (error) return null
  return data
}

// ============================================
// LISTAS_EMPRESA + LISTA_ITENS_EMPRESA
// ============================================

export async function createListaEmpresa(
  tenantId: string,
  empresaId: string,
  nome: string,
  tipo: string = 'compras',
  nomeNormalizado?: string | null
): Promise<Lista | null> {
  const client = requireAdmin()
  const { data, error } = await client
    .from('listas_empresa')
    .insert({
      tenant_id: tenantId,
      empresa_id: empresaId,
      nome,
      nome_original: nome,
      nome_normalizado: nomeNormalizado || null,
      tipo,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating listas_empresa:', error)
    return null
  }
  return data
}

export async function getListasEmpresaByTenant(
  tenantId: string,
  empresaId: string,
  tipo?: string | null,
  limit: number = 50
): Promise<Lista[]> {
  const client = requireAdmin()
  let query = client
    .from('listas_empresa')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('empresa_id', empresaId)
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (tipo) query = query.eq('tipo', tipo)

  const { data, error } = await query
  if (error) {
    console.error('Error fetching listas_empresa:', error)
    return []
  }
  return data || []
}

export async function getListaEmpresaByName(
  tenantId: string,
  empresaId: string,
  nome: string
): Promise<Lista | null> {
  const client = requireAdmin()
  const { data, error } = await client
    .from('listas_empresa')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('empresa_id', empresaId)
    .ilike('nome', nome.trim())
    .limit(1)

  if (error) return null
  return (data && data[0]) || null
}

export async function getListasEmpresaByNormalizedName(
  tenantId: string,
  empresaId: string,
  nomeNormalizado: string,
  limit: number = 10
): Promise<Lista[]> {
  const client = requireAdmin()
  const { data, error } = await client
    .from('listas_empresa')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('empresa_id', empresaId)
    .eq('nome_normalizado', nomeNormalizado)
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (error) return []
  return data || []
}

export async function findListasEmpresaByNormalizedNameLike(
  tenantId: string,
  empresaId: string,
  nomeNormalizado: string,
  limit: number = 10
): Promise<Lista[]> {
  const client = requireAdmin()
  const pattern = `%${String(nomeNormalizado || '').trim()}%`
  if (!pattern || pattern === '%%') return []

  const { data, error } = await client
    .from('listas_empresa')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('empresa_id', empresaId)
    .ilike('nome_normalizado', pattern)
    .limit(limit)

  if (error) return []
  return data || []
}

export async function findListasEmpresaByNameLike(
  tenantId: string,
  empresaId: string,
  nome: string,
  limit: number = 10
): Promise<Lista[]> {
  const client = requireAdmin()
  const pattern = `%${nome.trim()}%`
  const { data, error } = await client
    .from('listas_empresa')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('empresa_id', empresaId)
    .ilike('nome', pattern)
    .limit(limit)

  if (error) return []
  return data || []
}

export async function getListaEmpresaById(
  tenantId: string,
  empresaId: string,
  listaId: string
): Promise<Lista | null> {
  const client = requireAdmin()
  const { data, error } = await client
    .from('listas_empresa')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('empresa_id', empresaId)
    .eq('id', listaId)
    .single()
  if (error) return null
  return data
}

export async function createListaItemEmpresa(
  listaId: string,
  nome: string,
  quantidade?: string | null,
  unidade?: string | null,
  status: ListaItemStatus = 'pendente'
): Promise<ListaItem | null> {
  const client = requireAdmin()
  const { data, error } = await client
    .from('lista_itens_empresa')
    .insert({
      lista_id: listaId,
      nome,
      nome_original: nome,
      nome_normalizado: null,
      quantidade: quantidade || null,
      quantidade_num: null,
      unidade: unidade || null,
      status,
      checked: status === 'comprado',
    })
    .select()
    .single()

  if (error) return null
  return data
}

export async function getListaItensEmpresa(listaId: string): Promise<ListaItem[]> {
  const client = requireAdmin()
  const { data, error } = await client
    .from('lista_itens_empresa')
    .select('*')
    .eq('lista_id', listaId)
    .order('status', { ascending: true })
    .order('created_at', { ascending: true })
  if (error) return []
  return data || []
}

export async function getListaItemEmpresaByNormalizedName(
  listaId: string,
  nomeNormalizado: string
): Promise<ListaItem | null> {
  const client = requireAdmin()
  const { data, error } = await client
    .from('lista_itens_empresa')
    .select('*')
    .eq('lista_id', listaId)
    .eq('nome_normalizado', nomeNormalizado)
    .limit(1)
  if (error) return null
  return (data && data[0]) || null
}

export async function getListaItemEmpresaByName(
  listaId: string,
  nome: string
): Promise<ListaItem | null> {
  const client = requireAdmin()
  const { data, error } = await client
    .from('lista_itens_empresa')
    .select('*')
    .eq('lista_id', listaId)
    .ilike('nome', nome.trim())
    .limit(1)
  if (error) return null
  return (data && data[0]) || null
}

export async function updateListaItemEmpresaStatus(
  itemId: string,
  listaId: string,
  status: ListaItemStatus
): Promise<ListaItem | null> {
  const client = requireAdmin()
  const { data, error } = await client
    .from('lista_itens_empresa')
    .update({ status, checked: status === 'comprado' })
    .eq('id', itemId)
    .eq('lista_id', listaId)
    .select()
    .single()
  if (error) return null
  return data
}

export async function updateListaItemEmpresaChecked(
  itemId: string,
  listaId: string,
  checked: boolean
): Promise<ListaItem | null> {
  const client = requireAdmin()
  const { data, error } = await client
    .from('lista_itens_empresa')
    .update({ checked, status: checked ? 'comprado' : 'pendente' })
    .eq('id', itemId)
    .eq('lista_id', listaId)
    .select()
    .single()
  if (error) return null
  return data
}

export async function updateListaItemEmpresaFields(
  itemId: string,
  listaId: string,
  updates: { quantidade?: string | null; unidade?: string | null; status?: ListaItemStatus }
): Promise<ListaItem | null> {
  const client = requireAdmin()
  const { data, error } = await client
    .from('lista_itens_empresa')
    .update(updates)
    .eq('id', itemId)
    .eq('lista_id', listaId)
    .select()
    .single()
  if (error) return null
  return data
}

export async function deleteListaItemEmpresaByName(listaId: string, nome: string): Promise<boolean> {
  const client = requireAdmin()
  const { error } = await client
    .from('lista_itens_empresa')
    .delete()
    .eq('lista_id', listaId)
    .ilike('nome', nome.trim())
  return !error
}

// ============================================
// EMPRESA CONTEXT (lastActiveList)
// ============================================

export async function getEmpresaContext(tenantId: string, empresaId: string): Promise<TenantContext | null> {
  const client = requireAdmin()
  const { data, error } = await client
    .from('empresa_context')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('empresa_id', empresaId)
    .single()
  if (error) return null
  return data
}

export async function setLastActiveListNameEmpresa(
  tenantId: string,
  empresaId: string,
  listName: string | null
): Promise<void> {
  const client = requireAdmin()
  const { error } = await client
    .from('empresa_context')
    .upsert(
      {
        tenant_id: tenantId,
        empresa_id: empresaId,
        last_active_list_name: listName ? listName : null,
      },
      { onConflict: 'empresa_id' }
    )
  if (error) console.error('Error setting last active list name (empresa):', error)
}

// ============================================
// FORNECEDORES
// ============================================

export async function getFornecedorByNormalizedName(
  tenantId: string,
  empresaId: string,
  nomeNormalizado: string
): Promise<Fornecedor | null> {
  const client = requireAdmin()
  const { data, error } = await client
    .from('fornecedores')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('empresa_id', empresaId)
    .eq('nome_normalizado', nomeNormalizado)
    .single()
  if (error) return null
  return data
}

export async function getFornecedoresByEmpresa(
  tenantId: string,
  empresaId: string,
  limit: number = 100
): Promise<Fornecedor[]> {
  const client = requireAdmin()
  const { data, error } = await client
    .from('fornecedores')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('empresa_id', empresaId)
    .order('nome', { ascending: true })
    .limit(limit)

  if (error) {
    console.error('Error fetching fornecedores:', error)
    return []
  }
  return data || []
}

export async function createFornecedor(
  tenantId: string,
  empresaId: string,
  nome: string,
  nomeNormalizado: string,
  telefone?: string | null,
  email?: string | null,
  observacao?: string | null
): Promise<Fornecedor | null> {
  const client = requireAdmin()
  const { data, error } = await client
    .from('fornecedores')
    .insert({
      tenant_id: tenantId,
      empresa_id: empresaId,
      nome,
      nome_normalizado: nomeNormalizado,
      telefone: telefone || null,
      email: email || null,
      observacao: observacao || null,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating fornecedor:', error)
    return null
  }
  return data
}

// ============================================
// CATEGORIAS EMPRESA
// ============================================

export interface CategoriaEmpresa {
  id: string
  tenant_id: string
  empresa_id: string
  nome: string
  nome_normalizado: string | null
  tipo: 'fixo' | 'variavel'
  is_default: boolean
  created_at: string
}

export async function getCategoriasEmpresa(
  tenantId: string,
  empresaId: string,
  tipo?: 'fixo' | 'variavel'
): Promise<CategoriaEmpresa[]> {
  const client = requireAdmin()
  let query = client
    .from('categorias_empresa')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('empresa_id', empresaId)
    .order('nome', { ascending: true })

  if (tipo) {
    query = query.eq('tipo', tipo)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching categorias_empresa:', error)
    return []
  }
  return data || []
}

// ============================================
// FUNCIONÁRIOS
// ============================================

export async function getFuncionarioByNormalizedName(
  tenantId: string,
  empresaId: string,
  nomeNormalizado: string
): Promise<Funcionario | null> {
  const client = requireAdmin()
  const { data, error } = await client
    .from('funcionarios')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('empresa_id', empresaId)
    .eq('nome_normalizado', nomeNormalizado)
    .eq('ativo', true)
    .single()
  if (error) return null
  return data
}

export async function findFuncionariosByNormalizedNameLike(
  tenantId: string,
  empresaId: string,
  nomeNormalizadoPartial: string,
  limit: number = 10
): Promise<Funcionario[]> {
  const client = requireAdmin()
  const { data, error } = await client
    .from('funcionarios')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('empresa_id', empresaId)
    .eq('ativo', true)
    .ilike('nome_normalizado', `%${nomeNormalizadoPartial}%`)
    .order('nome_original', { ascending: true })
    .limit(limit)
  if (error) return []
  return data || []
}

export async function getFuncionariosByEmpresa(
  tenantId: string,
  empresaId: string,
  ativo?: boolean,
  limit: number = 100
): Promise<Funcionario[]> {
  const client = requireAdmin()
  let query = client
    .from('funcionarios')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('empresa_id', empresaId)
    .order('nome_original', { ascending: true })
    .limit(limit)

  if (ativo !== undefined) {
    query = query.eq('ativo', ativo)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching funcionarios:', error)
    return []
  }
  return data || []
}

export async function createFuncionario(
  tenantId: string,
  empresaId: string,
  nomeOriginal: string,
  nomeNormalizado: string,
  cargo?: string | null,
  salarioBase?: number | null,
  tipo?: 'fixo' | 'freelancer' | 'temporario' | null
): Promise<Funcionario | null> {
  const client = requireAdmin()
  const { data, error } = await client
    .from('funcionarios')
    .insert({
      tenant_id: tenantId,
      empresa_id: empresaId,
      nome_original: nomeOriginal,
      nome_normalizado: nomeNormalizado,
      cargo: cargo || null,
      salario_base: salarioBase || null,
      tipo: tipo || null,
      ativo: true,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating funcionario:', error)
    return null
  }
  return data
}
