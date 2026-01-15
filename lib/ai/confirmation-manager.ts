/**
 * Gerenciador de Confirmações Pendentes
 * Armazena ações que aguardam confirmação do usuário
 */

import type { SemanticState } from './semantic-state'

export interface PendingConfirmation {
  tenantId: string
  state: SemanticState
  createdAt: Date
}

// Armazena confirmações pendentes por tenant (em memória)
const pendingConfirmations: Map<string, PendingConfirmation> = new Map()

/**
 * Salva uma confirmação pendente
 */
export function savePendingConfirmation(tenantId: string, state: SemanticState): void {
  pendingConfirmations.set(tenantId, {
    tenantId,
    state,
    createdAt: new Date()
  })
  console.log('confirmation-manager - Confirmação pendente salva:', {
    tenantId,
    intent: state.intent
  })
}

/**
 * Busca confirmação pendente de um tenant
 */
export function getPendingConfirmation(tenantId: string): PendingConfirmation | null {
  return pendingConfirmations.get(tenantId) || null
}

/**
 * Remove confirmação pendente (após confirmação ou cancelamento)
 */
export function clearPendingConfirmation(tenantId: string): void {
  pendingConfirmations.delete(tenantId)
  console.log('confirmation-manager - Confirmação pendente removida:', tenantId)
}

/**
 * Verifica se há confirmação pendente expirada (mais de 5 minutos)
 */
export function clearExpiredConfirmations(): void {
  const now = Date.now()
  const expired: string[] = []
  
  for (const [tenantId, confirmation] of pendingConfirmations.entries()) {
    const age = now - confirmation.createdAt.getTime()
    if (age > 5 * 60 * 1000) { // 5 minutos
      expired.push(tenantId)
    }
  }
  
  expired.forEach(tenantId => {
    pendingConfirmations.delete(tenantId)
    console.log('confirmation-manager - Confirmação expirada removida:', tenantId)
  })
}
