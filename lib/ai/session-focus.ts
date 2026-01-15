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
  type: ActiveTaskType
  state: SemanticState
  createdAt: Date
  updatedAt: Date
  queuedMessage?: string | null // pergunta do usuário que chegou "no meio" do fluxo
}

const activeTasks = new Map<string, ActiveTask>()

export function setActiveTask(tenantId: string, type: ActiveTaskType, state: SemanticState): void {
  const existing = activeTasks.get(tenantId)
  const now = new Date()

  // Sempre atualiza; preserva fila se já existia
  activeTasks.set(tenantId, {
    tenantId,
    type,
    state,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    queuedMessage: existing?.queuedMessage ?? null,
  })
}

export function getActiveTask(tenantId: string): ActiveTask | null {
  const task = activeTasks.get(tenantId)
  if (!task) return null

  // expira em 10 minutos para não prender o usuário
  const ageMs = Date.now() - task.updatedAt.getTime()
  if (ageMs > 10 * 60 * 1000) {
    activeTasks.delete(tenantId)
    return null
  }

  return task
}

export function clearActiveTask(tenantId: string): void {
  activeTasks.delete(tenantId)
}

export function queueMessageForTask(tenantId: string, message: string): void {
  const task = activeTasks.get(tenantId)
  if (!task) return
  task.queuedMessage = message
  task.updatedAt = new Date()
  activeTasks.set(tenantId, task)
}

export function consumeQueuedMessage(tenantId: string): string | null {
  const task = activeTasks.get(tenantId)
  if (!task?.queuedMessage) return null
  const msg = task.queuedMessage
  task.queuedMessage = null
  task.updatedAt = new Date()
  activeTasks.set(tenantId, task)
  return msg
}

