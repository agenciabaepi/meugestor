/**
 * Session Focus (Ação ativa / pendente)
 *
 * Mantém o foco em uma tarefa ativa (create/update) por tenant.
 * Enquanto houver ação pendente, o bot não deve trocar de assunto automaticamente.
 */

import type { SemanticState } from './semantic-state'

// Persistência via conversations (para funcionar em ambiente serverless)
const ACTIVE_PREFIX = '[ACTIVE_TASK]'
const CLEARED_PREFIX = '[ACTIVE_TASK_CLEARED]'

function safeJsonParse<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T
  } catch {
    return null
  }
}

export type ActiveTaskType =
  | 'create_appointment'
  | 'update_appointment'
  | 'register_expense'
  | 'register_revenue'
  | 'create_supplier'

export interface ActiveTask {
  tenantId: string
  userId: string
  type: ActiveTaskType
  state: SemanticState
  createdAt: Date
  updatedAt: Date
  queuedMessage?: string | null // pergunta do usuário que chegou "no meio" do fluxo
}

const activeTasks = new Map<string, ActiveTask>()

function key(tenantId: string, userId: string): string {
  return `${tenantId}:${userId}`
}

export function setActiveTask(tenantId: string, userId: string, type: ActiveTaskType, state: SemanticState): void {
  const existing = activeTasks.get(key(tenantId, userId))
  const now = new Date()

  // Sempre atualiza; preserva fila se já existia
  activeTasks.set(key(tenantId, userId), {
    tenantId,
    userId,
    type,
    state,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    queuedMessage: existing?.queuedMessage ?? null,
  })
}

export function getActiveTask(tenantId: string, userId: string): ActiveTask | null {
  const task = activeTasks.get(key(tenantId, userId))
  if (!task) return null

  // expira em 10 minutos para não prender o usuário
  const ageMs = Date.now() - task.updatedAt.getTime()
  if (ageMs > 10 * 60 * 1000) {
    activeTasks.delete(key(tenantId, userId))
    return null
  }

  return task
}

export function clearActiveTask(tenantId: string, userId: string): void {
  activeTasks.delete(key(tenantId, userId))
}

export function queueMessageForTask(tenantId: string, userId: string, message: string): void {
  const task = activeTasks.get(key(tenantId, userId))
  if (!task) return
  task.queuedMessage = message
  task.updatedAt = new Date()
  activeTasks.set(key(tenantId, userId), task)
}

export function consumeQueuedMessage(tenantId: string, userId: string): string | null {
  const task = activeTasks.get(key(tenantId, userId))
  if (!task?.queuedMessage) return null
  const msg = task.queuedMessage
  task.queuedMessage = null
  task.updatedAt = new Date()
  activeTasks.set(key(tenantId, userId), task)
  return msg
}

export async function persistActiveTask(tenantId: string, userId: string, task: ActiveTask): Promise<void> {
  const { createConversation } = await import('../db/queries')
  const payload = {
    version: 1,
    tenantId,
    userId,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
    type: task.type,
    state: task.state,
    queuedMessage: task.queuedMessage ?? null,
  }
  await createConversation(tenantId, `${ACTIVE_PREFIX}${JSON.stringify(payload)}`, 'assistant', userId)
}

export async function persistClearedActiveTask(tenantId: string, userId: string): Promise<void> {
  const { createConversation } = await import('../db/queries')
  await createConversation(tenantId, `${CLEARED_PREFIX}${new Date().toISOString()}`, 'assistant', userId)
}

export async function loadLatestActiveTask(tenantId: string, userId: string): Promise<ActiveTask | null> {
  const { getRecentConversations } = await import('../db/queries')
  const recents = await getRecentConversations(tenantId, 40, userId)
  for (const msg of recents) {
    if (msg.role !== 'assistant') continue
    if (msg.message.startsWith(CLEARED_PREFIX)) return null
    if (msg.message.startsWith(ACTIVE_PREFIX)) {
      const raw = msg.message.slice(ACTIVE_PREFIX.length)
      const parsed = safeJsonParse<{
        createdAt?: string
        updatedAt?: string
        type?: ActiveTaskType
        state?: SemanticState
        queuedMessage?: string | null
      }>(raw)
      if (!parsed?.type || !parsed?.state) return null
      const task: ActiveTask = {
        tenantId,
        userId,
        type: parsed.type,
        state: parsed.state,
        createdAt: new Date(parsed.createdAt || Date.now()),
        updatedAt: new Date(parsed.updatedAt || Date.now()),
        queuedMessage: parsed.queuedMessage ?? null,
      }

      // expira em 10 minutos para não prender o usuário
      const ageMs = Date.now() - task.updatedAt.getTime()
      if (ageMs > 10 * 60 * 1000) return null

      return task
    }
  }
  return null
}

