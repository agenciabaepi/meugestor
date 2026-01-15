/**
 * Session Focus (Ação ativa / pendente)
 *
 * Mantém o foco em uma tarefa ativa (create/update) por tenant.
 * Enquanto houver ação pendente, o bot não deve trocar de assunto automaticamente.
 */

import type { SemanticState } from './semantic-state'

export type ActiveTaskType = 'create_appointment' | 'update_appointment'

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

