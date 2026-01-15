/**
 * Gerenciador de Confirmações Pendentes
 * Armazena ações que aguardam confirmação do usuário
 */

import type { SemanticState } from './semantic-state'

// Persistência via conversations (para funcionar em ambiente serverless)
const PENDING_PREFIX = '[PENDING_ACTION]'
const RESOLVED_PREFIX = '[PENDING_ACTION_RESOLVED]'

function safeJsonParse<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

export async function persistPendingConfirmation(tenantId: string, userId: string, state: SemanticState): Promise<void> {
  const { createConversation } = await import('../db/queries')
  const payload = {
    version: 1,
    tenantId,
    userId,
    createdAt: new Date().toISOString(),
    state,
  }
  await createConversation(tenantId, `${PENDING_PREFIX}${JSON.stringify(payload)}`, 'assistant', userId)
}

export async function persistResolvedConfirmation(tenantId: string, userId: string): Promise<void> {
  const { createConversation } = await import('../db/queries')
  await createConversation(tenantId, `${RESOLVED_PREFIX}${new Date().toISOString()}`, 'assistant', userId)
}

export async function loadLatestPendingConfirmation(tenantId: string, userId: string): Promise<PendingConfirmation | null> {
  const { getRecentConversations } = await import('../db/queries')
  const recents = await getRecentConversations(tenantId, 30, userId)
  for (const msg of recents) {
    if (msg.role !== 'assistant') continue
    if (msg.message.startsWith(RESOLVED_PREFIX)) {
      // encontrou um resolved mais recente que qualquer pending anterior nesta janela
      return null
    }
    if (msg.message.startsWith(PENDING_PREFIX)) {
      const raw = msg.message.slice(PENDING_PREFIX.length)
      const parsed = safeJsonParse<{ state: SemanticState; createdAt: string; userId?: string }>(raw)
      if (!parsed?.state) return null
      return {
        tenantId,
        userId,
        state: parsed.state,
        createdAt: new Date(parsed.createdAt || Date.now()),
      }
    }
  }
  return null
}

export interface PendingConfirmation {
  tenantId: string
  userId: string
  state: SemanticState
  createdAt: Date
}

// Armazena confirmações pendentes por (tenant+user) (em memória)
const pendingConfirmations: Map<string, PendingConfirmation> = new Map()

function key(tenantId: string, userId: string): string {
  return `${tenantId}:${userId}`
}

/**
 * Salva uma confirmação pendente
 */
export function savePendingConfirmation(tenantId: string, userId: string, state: SemanticState): void {
  pendingConfirmations.set(key(tenantId, userId), {
    tenantId,
    userId,
    state,
    createdAt: new Date()
  })
  console.log('confirmation-manager - Confirmação pendente salva:', {
    tenantId,
    userId,
    intent: state.intent
  })
}

/**
 * Busca confirmação pendente de um tenant
 */
export function getPendingConfirmation(tenantId: string, userId: string): PendingConfirmation | null {
  return pendingConfirmations.get(key(tenantId, userId)) || null
}

/**
 * Remove confirmação pendente (após confirmação ou cancelamento)
 */
export function clearPendingConfirmation(tenantId: string, userId: string): void {
  pendingConfirmations.delete(key(tenantId, userId))
  console.log('confirmation-manager - Confirmação pendente removida:', { tenantId, userId })
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
