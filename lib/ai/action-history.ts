/**
 * Histórico de Ações Recentes
 * Armazena as últimas ações criadas para permitir correções contextuais
 * 
 * Princípio: Quando usuário diz "não, é amanhã", o sistema precisa saber
 * qual compromisso/gasto está sendo corrigido.
 */

export interface RecentAction {
  id: string // ID do registro criado
  type: 'expense' | 'revenue' | 'appointment'
  tenantId: string
  createdAt: Date
  data: {
    amount?: number
    description?: string
    title?: string
    scheduled_at?: string
    category?: string
    subcategory?: string
  }
}

// Armazena histórico por tenant (em memória, pode ser migrado para banco depois)
const actionHistory: Map<string, RecentAction[]> = new Map()

/**
 * Salva uma ação recente no histórico
 */
export function saveRecentAction(action: RecentAction): void {
  const tenantActions = actionHistory.get(action.tenantId) || []
  
  // Adiciona no início
  tenantActions.unshift(action)
  
  // Mantém apenas as últimas 10 ações por tenant
  if (tenantActions.length > 10) {
    tenantActions.pop()
  }
  
  actionHistory.set(action.tenantId, tenantActions)
  console.log('action-history - Ação salva:', {
    tenantId: action.tenantId,
    type: action.type,
    id: action.id
  })
}

/**
 * Busca a última ação de um tipo específico
 */
export function getLastAction(
  tenantId: string,
  type: 'expense' | 'revenue' | 'appointment'
): RecentAction | null {
  const tenantActions = actionHistory.get(tenantId) || []
  const lastAction = tenantActions.find(a => a.type === type)
  
  if (lastAction) {
    console.log('action-history - Última ação encontrada:', {
      tenantId,
      type,
      id: lastAction.id,
      age: Date.now() - lastAction.createdAt.getTime()
    })
  }
  
  return lastAction || null
}

/**
 * Busca a última ação de qualquer tipo (mais recente)
 */
export function getLastAnyAction(tenantId: string): RecentAction | null {
  const tenantActions = actionHistory.get(tenantId) || []
  return tenantActions[0] || null
}

/**
 * Limpa o histórico de um tenant
 */
export function clearHistory(tenantId: string): void {
  actionHistory.delete(tenantId)
  console.log('action-history - Histórico limpo para tenant:', tenantId)
}

/**
 * Remove uma ação específica do histórico (após update bem-sucedido)
 */
export function removeAction(tenantId: string, actionId: string): void {
  const tenantActions = actionHistory.get(tenantId) || []
  const filtered = tenantActions.filter(a => a.id !== actionId)
  actionHistory.set(tenantId, filtered)
  console.log('action-history - Ação removida:', { tenantId, actionId })
}
