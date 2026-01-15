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
  userId: string
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

// Armazena histórico por (tenant+user) (em memória, pode ser migrado para banco depois)
const actionHistory: Map<string, RecentAction[]> = new Map()

function key(tenantId: string, userId: string): string {
  return `${tenantId}:${userId}`
}

/**
 * Salva uma ação recente no histórico
 */
export function saveRecentAction(action: RecentAction): void {
  const tenantActions = actionHistory.get(key(action.tenantId, action.userId)) || []
  
  // Adiciona no início
  tenantActions.unshift(action)
  
  // Mantém apenas as últimas 10 ações por tenant
  if (tenantActions.length > 10) {
    tenantActions.pop()
  }
  
  actionHistory.set(key(action.tenantId, action.userId), tenantActions)
  console.log('action-history - Ação salva:', {
    tenantId: action.tenantId,
    userId: action.userId,
    type: action.type,
    id: action.id
  })
}

/**
 * Busca a última ação de um tipo específico
 */
export function getLastAction(
  tenantId: string,
  userId: string,
  type: 'expense' | 'revenue' | 'appointment'
): RecentAction | null {
  const tenantActions = actionHistory.get(key(tenantId, userId)) || []
  const lastAction = tenantActions.find(a => a.type === type)
  
  if (lastAction) {
    console.log('action-history - Última ação encontrada:', {
      tenantId,
      userId,
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
export function getLastAnyAction(tenantId: string, userId: string): RecentAction | null {
  const tenantActions = actionHistory.get(key(tenantId, userId)) || []
  return tenantActions[0] || null
}

/**
 * Limpa o histórico de um tenant
 */
export function clearHistory(tenantId: string, userId: string): void {
  actionHistory.delete(key(tenantId, userId))
  console.log('action-history - Histórico limpo:', { tenantId, userId })
}

/**
 * Remove uma ação específica do histórico (após update bem-sucedido)
 */
export function removeAction(tenantId: string, userId: string, actionId: string): void {
  const tenantActions = actionHistory.get(key(tenantId, userId)) || []
  const filtered = tenantActions.filter(a => a.id !== actionId)
  actionHistory.set(key(tenantId, userId), filtered)
  console.log('action-history - Ação removida:', { tenantId, userId, actionId })
}
