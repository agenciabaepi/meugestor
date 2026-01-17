/**
 * Processa ações identificadas pela IA e executa no sistema
 */

import { analyzeIntention } from './conversation'
import { analyzeConversationalIntention } from './conversational-assistant'
import { 
  getPendingConfirmation, 
  savePendingConfirmation, 
  clearPendingConfirmation,
  loadLatestPendingConfirmation,
  persistPendingConfirmation,
  persistResolvedConfirmation,
} from './confirmation-manager'
import { getActiveTask, setActiveTask, clearActiveTask, queueMessageForTask, consumeQueuedMessage } from './session-focus'
import { createFinanceiroRecord, getFinanceiroBySubcategoryRecords, getFinanceiroByTagsRecords, calculateTotalByCategory, getDespesasRecords, getReceitasRecords } from '../services/financeiro'
import { createCompromissoRecord, getCompromissosRecords } from '../services/compromissos'
import { gerarRelatorioFinanceiro, gerarResumoMensal } from '../services/relatorios'
import { getFinanceiroRecords } from '../services/financeiro'
import { getTodayCompromissos } from '../services/compromissos'
import { ValidationError } from '../utils/errors'
import { getListasByTenant, getTenantContext } from '../db/queries'
import {
  addItemToList,
  ensureListaByName,
  formatItemNameForReply,
  formatListResponse,
  getListView,
  markItemDoneInList,
  removeItemFromList,
  touchLastActiveList,
} from '../services/listas'
import { categorizeExpense, categorizeRevenue, extractTags } from '../services/categorization'
import { parseScheduledAt, resolveScheduledAt, applyTimeToISOInBrazil, extractAppointmentFromMessage, isFutureInBrazil, getNowInBrazil, getTodayStartInBrazil, getTodayEndInBrazil, getYesterdayStartInBrazil, getYesterdayEndInBrazil, getBrazilDayStartISO, getBrazilDayEndISO } from '../utils/date-parser'
import { analyzeAppointmentContext, analyzeSystemFeaturesRequest, analyzeConversationalIntent } from './context-analyzer'
import type { SemanticState } from './semantic-state'
import { getLastTouchedAppointmentId, saveRecentAction, removeAction, setLastTouchedAppointmentId } from './action-history'
import { clearState as clearSemanticState } from './semantic-state'
import { clearFocus } from './focus-lock'

const MUTATING_INTENTS = new Set([
  'register_expense',
  'register_revenue',
  'update_expense',
  'update_revenue',
  'create_appointment',
  'update_appointment',
  'cancel_appointment',
  'create_list',
  'add_list_item',
  'remove_list_item',
  'mark_item_done',
])

function isMutatingIntent(intent: string): boolean {
  return MUTATING_INTENTS.has(intent)
}

async function cleanupAfterMutation(tenantId: string, userId: string, intent: string): Promise<void> {
  // Limpa qualquer pendência para evitar loop/reabertura
  clearPendingConfirmation(tenantId, userId)
  clearActiveTask(tenantId, userId)

  // Marca resolvido para não reabrir pending persistido em invocações futuras
  await persistResolvedConfirmation(tenantId, userId)

  // Não herdar contexto de update/create/cancel em próximos fluxos
  if (intent === 'create_appointment' || intent === 'update_appointment' || intent === 'cancel_appointment') {
    clearFocus(tenantId, 'appointment')
  }
  clearSemanticState()
}

export interface ActionResult {
  success: boolean
  message: string
  data?: any
}

/**
 * Processa uma mensagem, identifica a intenção e executa a ação correspondente
 * Agora com análise de contexto inteligente para evitar ações desnecessárias
 */
/**
 * Validação mínima de segurança (apenas para casos extremos)
 * A maioria da análise deve vir do GPT
 * Esta função serve apenas como última camada de segurança
 */
function validateAndCorrectIntention(
  message: string,
  detectedIntention: string,
  state: SemanticState
): string {
  const lowerMessage = message.toLowerCase()
  
  // Apenas validações críticas de segurança
  // Se GPT detectou receita mas mensagem claramente é despesa (ou vice-versa)
  const hasRevenueKeyword = ['recebi', 'ganhei', 'entrada', 'salário'].some(k => lowerMessage.includes(k))
  const hasExpenseKeyword = ['gastei', 'paguei', 'despesa'].some(k => lowerMessage.includes(k))
  
  // Correção apenas em casos extremos
  if (hasRevenueKeyword && detectedIntention === 'register_expense') {
    console.log('⚠️ Correção de segurança: Mensagem contém palavras de receita')
    return 'register_revenue'
  }
  
  if (hasExpenseKeyword && detectedIntention === 'register_revenue') {
    console.log('⚠️ Correção de segurança: Mensagem contém palavras de despesa')
    return 'register_expense'
  }
  
  return detectedIntention
}

export async function processAction(
  message: string,
  tenantId: string,
  userId: string
): Promise<ActionResult> {
  try {
    console.log('=== PROCESS ACTION INICIADO ===')
    console.log('processAction - Mensagem:', message)
    console.log('processAction - TenantId:', tenantId)
    
    // Busca contexto recente para o GPT entender a conversa completa
    const { getRecentConversations } = await import('../db/queries')
    const recentConversations = await getRecentConversations(tenantId, 10, userId)
    const recentContext = recentConversations.map(c => ({
      role: c.role,
      message: c.message
    }))
    
    // Verifica se há confirmação pendente (memória) ou persistida (DB via conversations)
    const lowerMessage = message.toLowerCase().trim()
    const isPositiveConfirm = ['sim', 's', 'confirmar', 'ok', 'isso', 'isso mesmo', 'pode', 'pode sim', 'pode salvar', 'confirmo'].includes(lowerMessage)
    const isNegativeConfirm = ['não', 'nao', 'cancelar', 'cancela'].includes(lowerMessage)

    let pendingConfirmation = getPendingConfirmation(tenantId, userId)
    if (!pendingConfirmation) {
      pendingConfirmation = await loadLatestPendingConfirmation(tenantId, userId)
    }

    // Session focus: ação ativa (create/update compromisso)
    const activeTask = getActiveTask(tenantId, userId)

    // COMMIT POINT (SESSION FOCUS):
    // Mesmo sem pendingConfirmation (ex: execução direta), se houver uma ação ativa e o usuário disser
    // "sim/isso/pode/ok", isso deve EXECUTAR (não reanalisar intenção e não perguntar de novo).
    if (!pendingConfirmation && activeTask) {
      if (isPositiveConfirm) {
        console.log('processAction - Confirmação recebida (activeTask), executando ação ativa')
        await persistResolvedConfirmation(tenantId, userId)
        clearPendingConfirmation(tenantId, userId)
        const actionResult = await executeAction({ ...activeTask.state }, tenantId, userId, message)
        if (actionResult.success && isMutatingIntent(activeTask.state.intent)) {
          await cleanupAfterMutation(tenantId, userId, activeTask.state.intent)
        } else {
          clearActiveTask(tenantId, userId)
        }
        return actionResult.success
          ? { success: true, message: buildCommitFinalMessage(activeTask.state, actionResult), data: actionResult.data }
          : { success: false, message: actionResult.message || 'Não consegui executar a ação. Tente novamente.', data: actionResult.data }
      }
      if (isNegativeConfirm) {
        console.log('processAction - Cancelamento recebido (activeTask), limpando ação ativa')
        await cleanupAfterMutation(tenantId, userId, activeTask.state.intent)
        return { success: true, message: 'Entendido, cancelado. Como posso ajudar?' }
      }
    }
    
    // COMMIT POINT: Se há confirmação pendente e usuário confirmou/cancelou, executa imediatamente.
    if (pendingConfirmation) {
      if (isPositiveConfirm) {
        console.log('processAction - Confirmação recebida, executando ação pendente')
        clearPendingConfirmation(tenantId, userId)
        // Usa o estado da confirmação pendente
        const semanticState = { ...pendingConfirmation.state }

        // Nunca confirmar duas vezes: marca resolvido imediatamente (idempotência)
        await persistResolvedConfirmation(tenantId, userId)

        // Executa imediatamente (gatilho de execução)
        const actionResult = await executeAction(semanticState, tenantId, userId, message)

        // Se havia uma pergunta em fila durante a ação ativa, responde após concluir
        const queued = consumeQueuedMessage(tenantId, userId)

        // Após ação mutável: limpar estado para não reabrir fluxo nem herdar contexto em queries seguintes
        if (actionResult.success && isMutatingIntent(semanticState.intent)) {
          await cleanupAfterMutation(tenantId, userId, semanticState.intent)
        } else {
          clearActiveTask(tenantId, userId)
        }
        if (queued) {
          const followUp = await processAction(queued, tenantId, userId)
          if (followUp?.message) {
            return {
              success: true,
              message: `${actionResult.message}\n\n${followUp.message}`,
              data: { action: actionResult.data, followUp: followUp.data }
            }
          }
        }

        // Resposta final curta e conclusiva (não re-pergunta)
        if (actionResult.success) {
          return {
            success: true,
            message: buildCommitFinalMessage(semanticState, actionResult),
            data: actionResult.data,
          }
        }

        // Se falhou, retorna erro claro (não repete confirmação)
        return {
          success: false,
          message: actionResult.message || 'Não consegui executar a ação. Tente novamente.',
          data: actionResult.data,
        }
      } else if (isNegativeConfirm) {
        console.log('processAction - Cancelamento recebido')
        await cleanupAfterMutation(tenantId, userId, pendingConfirmation.state.intent)
        return {
          success: true,
          message: 'Entendido, cancelado. Como posso ajudar?'
        }
      }
    }
    
    // Usa assistente conversacional (novo modelo)
    console.log('processAction - Analisando intenção conversacional...')
    const semanticState = await analyzeConversationalIntention(message, recentContext, tenantId, userId, activeTask)
    
    console.log('processAction - Estado semântico:', JSON.stringify(semanticState, null, 2))
    
    // Se precisa esclarecimento, retorna mensagem
    if (semanticState.needsClarification && semanticState.clarificationMessage) {
      return {
        success: true,
        message: semanticState.clarificationMessage,
      }
    }
    
    // CONFIRMAÇÃO INTELIGENTE: só pede confirmação se realmente necessário
    // Se dados estão completos (readyToSave), executa diretamente
    if (semanticState.readyToSave && !semanticState.needsConfirmation) {
      // Dados completos, executa diretamente sem confirmação
      console.log('processAction - Dados completos, executando diretamente sem confirmação')
      const result = await executeAction(semanticState, tenantId, userId, message)
      if (result.success && isMutatingIntent(semanticState.intent)) {
        await cleanupAfterMutation(tenantId, userId, semanticState.intent)
      }
      return result
    }
    
    // Se precisa confirmação (ambiguidade real), salva e retorna mensagem
    if (semanticState.needsConfirmation && semanticState.confirmationMessage) {
      // Marca ação ativa se for compromisso (não deixa perder o foco)
      if (semanticState.intent === 'create_appointment' || semanticState.intent === 'update_appointment') {
        setActiveTask(tenantId, userId, semanticState.intent, semanticState)
      }
      savePendingConfirmation(tenantId, userId, semanticState)
      await persistPendingConfirmation(tenantId, userId, semanticState)
      return {
        success: true,
        message: semanticState.confirmationMessage,
      }
    }
    
    // Se é conversa casual, usa fallback conversacional
    if (semanticState.intent === 'chat') {
      // Se existe ação ativa, não deixa cair em chat fora de contexto
      if (activeTask) {
        queueMessageForTask(tenantId, userId, message)
        return {
          success: true,
          message: buildKeepFocusMessage(activeTask),
        }
      }
      return {
        success: false, // Indica para usar processMessage
        message: 'Mensagem conversacional',
      }
    }
    
    // Validação rígida: verifica se estado é válido (chat já retornou acima)
    if (semanticState.confidence < 0.7) {
      return {
        success: false,
        message: 'Não entendi completamente. Pode reformular sua pergunta?',
      }
    }
    
    // Validação mínima de segurança (apenas casos extremos)
    const validatedIntent = validateAndCorrectIntention(message, semanticState.intent, semanticState)
    if (validatedIntent !== semanticState.intent) {
      console.log(`processAction - Correção de segurança aplicada: ${semanticState.intent} -> ${validatedIntent}`)
      semanticState.intent = validatedIntent as any
    }

    // Análise de contexto inteligente ANTES de executar ações
    // Verifica se é apenas conversa casual
    const conversationalAnalysis = analyzeConversationalIntent(message)
    if (!conversationalAnalysis.shouldProceed && conversationalAnalysis.message) {
      console.log('processAction - Mensagem identificada como conversa casual')
      return {
        success: true,
        message: conversationalAnalysis.message,
      }
    }

    // Verifica se está pedindo funcionalidade que já existe
    // IMPORTANTE: Só aplica se NÃO for criação de compromisso
    // Se for criação de compromisso, pula essa análise
    if (semanticState.intent !== 'create_appointment') {
      const featuresAnalysis = analyzeSystemFeaturesRequest(message)
      if (!featuresAnalysis.shouldProceed && featuresAnalysis.message) {
        console.log('processAction - Usuário pedindo funcionalidade que já existe')
        return {
          success: true,
          message: featuresAnalysis.message,
        }
      }
    }

    // Validação de domínio: verifica se domínio está correto
    if (semanticState.domain && 
        ((semanticState.intent === 'query' && semanticState.queryType === 'gasto' && semanticState.domain !== 'financeiro') ||
         (semanticState.intent === 'query' && semanticState.queryType === 'compromissos' && semanticState.domain !== 'agenda'))) {
      console.error('processAction - ERRO: Domínio incorreto no estado semântico')
      return {
        success: false,
        message: 'Erro interno ao processar. Tente novamente.',
      }
    }

    // Delega execução para função separada
    // Session focus: se há ação ativa e a mensagem mudou de assunto (query/report),
    // não ignora a ação ativa — guarda pergunta e pede para concluir/cancelar.
    if (activeTask && (semanticState.intent === 'query' || semanticState.intent === 'report')) {
      queueMessageForTask(tenantId, userId, message)
      return {
        success: true,
        message: buildKeepFocusMessage(activeTask),
      }
    }

    // Se esta mensagem inicia/continua uma ação de compromisso mas ainda não está pronta, mantém foco.
    if ((semanticState.intent === 'create_appointment' || semanticState.intent === 'update_appointment') &&
        (!semanticState.readyToSave || (semanticState.intent === 'update_appointment' && !semanticState.targetId))) {
      setActiveTask(tenantId, userId, semanticState.intent, semanticState)
    }

    const result = await executeAction(semanticState, tenantId, userId, message)
    // Após qualquer ação mutável, encerra o fluxo e reseta estado
    if (result.success && isMutatingIntent(semanticState.intent)) {
      await cleanupAfterMutation(tenantId, userId, semanticState.intent)
    }
    return result
  } catch (error) {
    console.error('=== ERRO EM PROCESS ACTION ===')
    console.error('processAction - Erro capturado:', error)
    console.error('processAction - Tipo:', error?.constructor?.name)
    console.error('processAction - Mensagem:', error instanceof Error ? error.message : String(error))
    console.error('processAction - Stack:', error instanceof Error ? error.stack : 'N/A')
    console.error('processAction - Erro completo:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2))
    
    return {
      success: false,
      message: error instanceof Error 
        ? `Erro ao processar: ${error.message}` 
        : 'Erro desconhecido ao processar ação',
    }
  }
}

function buildKeepFocusMessage(activeTask: any): string {
  const title = activeTask?.state?.title || 'compromisso'
  const rawWhen = activeTask?.state?.scheduled_at || null
  const parsed = rawWhen ? new Date(rawWhen) : null
  const when = rawWhen
    ? (parsed && !isNaN(parsed.getTime())
        ? parsed.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
        : rawWhen)
    : null
  const desc = activeTask?.state?.description || null

  const resumo = [
    title ? `📌 ${title}` : null,
    when ? `🕐 ${when}` : null,
    desc ? `📍 ${desc}` : null,
  ].filter(Boolean).join(' • ')

  return `Posso te responder isso, mas antes preciso concluir a ação pendente.\n\nVou salvar/atualizar: ${resumo || 'esse compromisso'}.\nPosso salvar assim? (sim / cancelar)`
}

function buildCommitFinalMessage(state: SemanticState, actionResult: ActionResult): string {
  // Resposta curta e conclusiva
  if (state.intent === 'update_appointment') {
    const title = (actionResult.data?.title || state.title || 'compromisso').toString()
    const whenIso = actionResult.data?.scheduled_at || state.scheduled_at
    const when = whenIso ? new Date(whenIso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : null
    return `Pronto! Atualizei ${title}${when ? ` para ${when}` : ''}.`
  }
  if (state.intent === 'create_appointment') {
    const title = (actionResult.data?.title || state.title || 'compromisso').toString()
    const whenIso = actionResult.data?.scheduled_at || state.scheduled_at
    const when = whenIso ? new Date(whenIso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : null
    return `Pronto! Agendei ${title}${when ? ` para ${when}` : ''}.`
  }
  if (state.intent === 'update_expense' || state.intent === 'update_revenue') {
    return 'Pronto! Atualizei o registro.'
  }
  if (state.intent === 'register_expense') return 'Pronto! Registrei o gasto.'
  if (state.intent === 'register_revenue') return 'Pronto! Registrei a receita.'
  if (state.intent === 'create_list') return actionResult.message || 'Lista criada.'
  if (state.intent === 'add_list_item') return actionResult.message || 'Item adicionado.'
  if (state.intent === 'remove_list_item') return actionResult.message || 'Item removido.'
  if (state.intent === 'mark_item_done') return actionResult.message || 'Item marcado como comprado.'
  if (state.intent === 'show_list') return actionResult.message || 'Aqui está sua lista.'
  return actionResult.message || 'Pronto!'
}

async function resolveListNameFromContext(
  tenantId: string,
  explicitListName?: string | null
): Promise<string | null> {
  const raw = explicitListName ? String(explicitListName).trim() : ''
  if (raw) return raw

  const ctx = await getTenantContext(tenantId)
  const last = ctx?.last_active_list_name ? String(ctx.last_active_list_name).trim() : ''
  if (last) return last

  // Fallback estilo Alexa: se só existir 1 lista de compras, usa ela (sem perguntar)
  const listas = await getListasByTenant(tenantId, 'compras', 2)
  if (listas.length === 1) return listas[0].nome
  return null
}

/**
 * Executa ação baseada no estado semântico
 */
async function executeAction(
  semanticState: SemanticState,
  tenantId: string,
  userId: string,
  message: string
): Promise<ActionResult> {
  switch (semanticState.intent) {
    case 'register_expense':
      console.log('executeAction - Chamando handleRegisterExpense')
      const expenseResult = await handleRegisterExpense(semanticState, tenantId, userId)
      if (expenseResult.success && expenseResult.data) {
        // Salva no histórico de ações
        saveRecentAction({
          id: expenseResult.data.id,
          type: 'expense',
          tenantId,
          userId,
          createdAt: new Date(),
          data: {
            amount: semanticState.amount ?? undefined,
            description: semanticState.description ?? undefined,
            category: semanticState.categoria ?? undefined
          }
        })
      }
      return expenseResult

    case 'register_revenue':
      console.log('executeAction - Chamando handleRegisterRevenue')
      const revenueResult = await handleRegisterRevenue(semanticState, tenantId, userId)
      if (revenueResult.success && revenueResult.data) {
        saveRecentAction({
          id: revenueResult.data.id,
          type: 'revenue',
          tenantId,
          userId,
          createdAt: new Date(),
          data: {
            amount: semanticState.amount ?? undefined,
            description: semanticState.description ?? undefined,
            category: semanticState.categoria ?? undefined
          }
        })
      }
      return revenueResult

    case 'update_expense':
    case 'update_revenue':
      return await handleUpdateFinanceiro(semanticState, tenantId, userId)

    case 'update_appointment':
      return await handleUpdateAppointment(semanticState, tenantId, userId)

    case 'cancel_appointment':
      return await handleCancelAppointment(semanticState, tenantId, userId)

    case 'create_appointment':
        // Análise específica para compromissos
        console.log('processAction - Analisando contexto de compromisso...')
        console.log('processAction - Estado semântico:', {
          title: semanticState.title,
          scheduled_at: semanticState.scheduled_at,
          description: semanticState.description
        })
        
        // Busca compromissos existentes para verificar duplicatas e pedidos de lembrete
        const now = new Date()
        const existingAppointments = await getCompromissosRecords(
          tenantId,
          now.toISOString(),
          undefined,
          userId
        )
        console.log('processAction - Compromissos futuros encontrados:', existingAppointments.length)
        
        const appointmentAnalysis = analyzeAppointmentContext(
          message,
          semanticState,
          existingAppointments.map(apt => ({
            title: apt.title,
            scheduled_at: apt.scheduled_at,
          }))
        )
        
        if (!appointmentAnalysis.shouldProceed && appointmentAnalysis.message) {
          console.log('processAction - Ação de compromisso bloqueada pela análise de contexto')
          return {
            success: true,
            message: appointmentAnalysis.message,
          }
        }
        
        console.log('executeAction - Prosseguindo com criação de compromisso')
        const appointmentResult = await handleCreateAppointment(semanticState, tenantId, userId, message)
        if (appointmentResult.success && appointmentResult.data) {
          saveRecentAction({
            id: appointmentResult.data.id,
            type: 'appointment',
            tenantId,
            userId,
            createdAt: new Date(),
            data: {
              title: appointmentResult.data.title ?? semanticState.title ?? undefined,
              // IMPORTANTE: guarda ISO real do banco (para correções "muda só a hora" sem perder a data)
              scheduled_at: appointmentResult.data.scheduled_at ?? undefined
            }
          })
          setLastTouchedAppointmentId(tenantId, userId, appointmentResult.data.id)
        }
        return appointmentResult

    case 'create_list':
      return await handleCreateList(semanticState, tenantId)

    case 'add_list_item':
      return await handleAddListItem(semanticState, tenantId)

    case 'remove_list_item':
      return await handleRemoveListItem(semanticState, tenantId)

    case 'mark_item_done':
      return await handleMarkItemDone(semanticState, tenantId)

    case 'show_list':
      return await handleShowList(semanticState, tenantId)

      case 'query':
        // Validação rígida: verifica se queryType e domain estão corretos
        if (!semanticState.queryType) {
          return {
            success: false,
            message: 'Não entendi o que você quer consultar. Pode especificar?',
          }
        }
        
        if (!semanticState.domain) {
          return {
            success: false,
            message: 'Erro ao identificar o tipo de consulta. Tente novamente.',
          }
        }
        
        const { handleQuerySimple } = await import('./actions-query-simple')
        return await handleQuerySimple(semanticState, tenantId, userId)

      case 'chat':
        // Mensagens conversacionais simples - retorna false para usar fallback conversacional
        console.log('processAction - Intenção chat detectada, usando fallback conversacional')
        return {
          success: false,
          message: 'Mensagem conversacional detectada',
        }

      case 'report':
        return await handleReport(tenantId)

      default:
        return {
          success: true,
          message: 'Mensagem recebida. Processando...',
        }
    }
}

async function handleCreateList(state: SemanticState, tenantId: string): Promise<ActionResult> {
  try {
    const listName = state.list_name ? String(state.list_name).trim() : ''
    if (!listName) {
      return { success: true, message: 'Qual o nome da lista?' }
    }
    const lista = await ensureListaByName(tenantId, listName, state.list_type ? String(state.list_type) : 'compras')
    await touchLastActiveList(tenantId, lista.nome)
    // Se já existia, ainda assim mantém resposta curta
    return { success: true, message: `Lista '${lista.nome}' criada.`, data: lista }
  } catch (error) {
    if (error instanceof ValidationError) {
      return { success: false, message: error.message }
    }
    console.error('Erro ao criar lista:', error)
    return { success: false, message: 'Não consegui criar a lista.' }
  }
}

async function handleAddListItem(state: SemanticState, tenantId: string): Promise<ActionResult> {
  try {
    const itemName = state.item_name ? String(state.item_name).trim() : ''
    if (!itemName) return { success: true, message: 'O que você quer adicionar?' }

    const listName = await resolveListNameFromContext(tenantId, state.list_name ?? null)
    if (!listName) return { success: true, message: 'Em qual lista?' }

    const result = await addItemToList({
      tenantId,
      listName,
      itemName,
      quantidade: state.quantidade ?? null,
      unidade: state.unidade ?? null,
    })

    await touchLastActiveList(tenantId, result.lista.nome)

    const itemLabel = formatItemNameForReply(result.item.nome)
    if (result.wasAlreadyPending) {
      return { success: true, message: `${itemLabel} já está na lista ${result.lista.nome}.`, data: result }
    }
    return { success: true, message: `${itemLabel} adicionado à lista ${result.lista.nome}.`, data: result }
  } catch (error) {
    if (error instanceof ValidationError) {
      return { success: false, message: error.message }
    }
    console.error('Erro ao adicionar item:', error)
    return { success: false, message: 'Não consegui adicionar esse item.' }
  }
}

async function handleRemoveListItem(state: SemanticState, tenantId: string): Promise<ActionResult> {
  try {
    const itemName = state.item_name ? String(state.item_name).trim() : ''
    if (!itemName) return { success: true, message: 'Qual item você quer remover?' }

    const listName = await resolveListNameFromContext(tenantId, state.list_name ?? null)
    if (!listName) return { success: true, message: 'Em qual lista?' }

    const result = await removeItemFromList({ tenantId, listName, itemName })
    await touchLastActiveList(tenantId, result.lista.nome)

    const itemLabel = formatItemNameForReply(itemName)
    if (!result.removed) {
      return { success: true, message: `Não achei ${itemLabel} na lista ${result.lista.nome}.` }
    }
    return { success: true, message: `${itemLabel} removido da lista ${result.lista.nome}.` }
  } catch (error) {
    if (error instanceof ValidationError) {
      return { success: false, message: error.message }
    }
    console.error('Erro ao remover item:', error)
    return { success: false, message: 'Não consegui remover esse item.' }
  }
}

async function handleMarkItemDone(state: SemanticState, tenantId: string): Promise<ActionResult> {
  try {
    const itemName = state.item_name ? String(state.item_name).trim() : ''
    if (!itemName) return { success: true, message: 'Qual item você já comprou?' }

    const listName = await resolveListNameFromContext(tenantId, state.list_name ?? null)
    if (!listName) return { success: true, message: 'Em qual lista?' }

    const result = await markItemDoneInList({ tenantId, listName, itemName })
    await touchLastActiveList(tenantId, result.lista.nome)

    const itemLabel = formatItemNameForReply(itemName)
    // UX estilo Alexa: sempre resolve (cria se não existir, marca comprado, ou informa que já estava)
    if (result.alreadyBought) {
      return { success: true, message: `${itemLabel} já estava marcado como comprado na lista ${result.lista.nome}.`, data: result }
    }
    return { success: true, message: `${itemLabel} marcado como comprado na lista ${result.lista.nome}.`, data: result }
  } catch (error) {
    if (error instanceof ValidationError) {
      return { success: false, message: error.message }
    }
    console.error('Erro ao marcar como comprado:', error)
    return { success: false, message: 'Não consegui marcar como comprado.' }
  }
}

async function handleShowList(state: SemanticState, tenantId: string): Promise<ActionResult> {
  try {
    const listName = await resolveListNameFromContext(tenantId, state.list_name ?? null)
    if (!listName) return { success: true, message: 'Qual lista?' }

    const view = await getListView({ tenantId, listName })
    await touchLastActiveList(tenantId, view.lista.nome)

    const message = formatListResponse({
      listName: view.lista.nome,
      pendentes: view.pendentes,
      comprados: view.comprados,
    })
    return { success: true, message, data: view }
  } catch (error) {
    if (error instanceof ValidationError) {
      return { success: false, message: error.message }
    }
    console.error('Erro ao mostrar lista:', error)
    return { success: false, message: 'Não consegui mostrar a lista.' }
  }
}

/**
 * Atualiza um registro financeiro (expense ou revenue)
 */
async function handleUpdateFinanceiro(
  state: SemanticState,
  tenantId: string,
  userId: string
): Promise<ActionResult> {
  try {
    if (!state.targetId) {
      return {
        success: false,
        message: 'Não encontrei o registro para atualizar. Pode especificar qual?'
      }
    }
    
    const { updateFinanceiroRecord } = await import('../services/financeiro')
    
    // Prepara updates apenas com campos fornecidos
    const updates: any = {}
    if (typeof state.amount === 'number' && state.amount > 0) {
      updates.amount = state.amount
    }
    if (typeof state.description === 'string' && state.description.trim().length > 0) {
      updates.description = state.description.trim()
    }
    if (state.categoria) {
      updates.category = state.categoria
    }
    if (state.subcategoria !== undefined) {
      updates.subcategory = state.subcategoria
    }
    
    const record = await updateFinanceiroRecord(state.targetId, tenantId, updates)
    
    // Remove do histórico após update bem-sucedido
    const { removeAction } = await import('./action-history')
    removeAction(tenantId, userId, state.targetId)
    
    let responseMessage = `✅ Registro atualizado com sucesso!\n\n`
    if (updates.amount) responseMessage += `💰 Valor: R$ ${updates.amount.toFixed(2)}\n`
    if (updates.description) responseMessage += `📝 Descrição: ${updates.description}\n`
    if (updates.category) responseMessage += `🏷️ Categoria: ${updates.category}\n`
    
    return {
      success: true,
      message: responseMessage,
      data: record
    }
  } catch (error) {
    if (error instanceof ValidationError) {
      return {
        success: false,
        message: error.message
      }
    }
    throw error
  }
}

/**
 * Atualiza um compromisso
 */
async function handleUpdateAppointment(
  state: SemanticState,
  tenantId: string,
  userId: string
): Promise<ActionResult> {
  try {
    if (!state.targetId) {
      return {
        success: false,
        message: 'Não encontrei o compromisso para atualizar. Pode especificar qual?'
      }
    }
    
    const { updateCompromissoRecord, getCompromissoRecordById } = await import('../services/compromissos')
    
    // Prepara updates apenas com campos fornecidos
    const updates: any = {}
    if (state.title) {
      updates.title = state.title
    }
    if (state.description !== undefined) {
      updates.description = state.description
    }
    if (state.scheduled_at) {
      // scheduled_at pode ser ISO (legado) ou apenas horário (novo).
      const raw = String(state.scheduled_at).trim()
      const looksIso = raw.includes('T') && !isNaN(new Date(raw).getTime())

      if (looksIso) {
        updates.scheduledAt = raw
      } else if (state.periodo) {
        const iso = resolveScheduledAt(state.periodo, raw, 'America/Sao_Paulo', new Date())
        if (iso) updates.scheduledAt = iso
      } else {
        // Correção de horário: mantém a data atual do compromisso e altera só a hora.
        const current = await getCompromissoRecordById(state.targetId, tenantId, userId)
        const iso = applyTimeToISOInBrazil(current?.scheduled_at || null, raw, 'America/Sao_Paulo')
        if (iso) updates.scheduledAt = iso
      }
    }
    
    const compromisso = await updateCompromissoRecord(state.targetId, tenantId, updates)

    // UPDATE substitui o compromisso anterior no histórico (não duplica)
    saveRecentAction({
      id: compromisso.id,
      type: 'appointment',
      tenantId,
      userId,
      createdAt: new Date(),
      data: {
        title: compromisso.title ?? undefined,
        scheduled_at: compromisso.scheduled_at ?? undefined,
      },
    })
    setLastTouchedAppointmentId(tenantId, userId, compromisso.id)
    
    // Limpa o focus lock após update bem-sucedido
    const { clearFocus } = await import('./focus-lock')
    clearFocus(tenantId, 'appointment')
    
    // Usa os dados do compromisso atualizado do banco (já está correto)
    let responseMessage = `✅ Compromisso atualizado com sucesso!\n\n`
    if (compromisso.title) responseMessage += `📋 Título: ${compromisso.title}\n`
    if (compromisso.scheduled_at) {
      // Usa o scheduled_at do banco e formata com timezone correto
      const date = new Date(compromisso.scheduled_at)
      responseMessage += `📅 Data/Hora: ${date.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}\n`
    }
    if (compromisso.description) {
      responseMessage += `📝 ${compromisso.description}\n`
    }
    
    return {
      success: true,
      message: responseMessage,
      data: compromisso
    }
  } catch (error) {
    if (error instanceof ValidationError) {
      return {
        success: false,
        message: error.message
      }
    }
    throw error
  }
}

/**
 * Cancela (remove) um compromisso
 */
async function handleCancelAppointment(
  state: SemanticState,
  tenantId: string,
  userId: string
): Promise<ActionResult> {
  const { cancelCompromissoRecord, getCompromissoRecordById, getCompromissosRecords } = await import('../services/compromissos')

  function normalizeString(str: string): string {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
  }

  function parseHourMinute(input: string | null | undefined): { hour: number; minute: number } | null {
    if (!input) return null
    const t = String(input).trim().toLowerCase()
    const hhmm = t.match(/^(\d{1,2}):(\d{2})$/)
    if (hhmm) return { hour: Number(hhmm[1]), minute: Number(hhmm[2]) }
    const h30 = t.match(/^(\d{1,2})h(\d{2})$/)
    if (h30) return { hour: Number(h30[1]), minute: Number(h30[2]) }
    const h = t.match(/^(\d{1,2})h$/)
    if (h) return { hour: Number(h[1]), minute: 0 }
    return null
  }

  function formatTimeBR(iso: string): string {
    const parts = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date(iso))
    const hour = parts.find(p => p.type === 'hour')?.value || '00'
    const minute = parts.find(p => p.type === 'minute')?.value || '00'
    return `${hour}:${minute}`
  }

  function formatDayLabel(periodo: string | null | undefined): string {
    if (!periodo) return ''
    if (periodo === 'hoje') return 'hoje'
    if (periodo === 'amanhã') return 'amanhã'
    if (periodo === 'ontem') return 'ontem'
    return periodo
  }

  function getDayRangeFromPeriodo(periodo: string | null | undefined): { start: string; end: string } | null {
    if (!periodo) return null
    const base = new Date()
    const p = periodo.toLowerCase()
    const offset = p === 'hoje' ? 0 : p === 'amanhã' ? 1 : p === 'ontem' ? -1 : null
    if (offset === null) return null
    return {
      start: getBrazilDayStartISO(offset, base),
      end: getBrazilDayEndISO(offset, base),
    }
  }

  async function cancelById(id: string): Promise<ActionResult> {
    const current = await getCompromissoRecordById(id, tenantId, userId)
    const ok = await cancelCompromissoRecord(id, tenantId, userId)
    if (!ok) return { success: false, message: 'Não consegui cancelar o compromisso. Tente novamente.' }

    removeAction(tenantId, userId, id)
    const title = current?.title || 'compromisso'
    const when = current?.scheduled_at
      ? new Date(current.scheduled_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
      : null
    return { success: true, message: `Pronto! ${title}${when ? ` (${when})` : ''} cancelado.`, data: { id } }
  }

  // 1) Referencial / ID direto
  const touchedId = getLastTouchedAppointmentId(tenantId, userId)
  const targetId = state.targetId || touchedId
  if (state.targetId || (!state.title && !state.periodo && !state.scheduled_at && targetId)) {
    return await cancelById(targetId as string)
  }

  // 2) Resolver por critérios (título + período + horário)
  const range = getDayRangeFromPeriodo(state.periodo || null)
  if (!range) {
    return {
      success: true,
      message: 'Qual dia é esse compromisso? (ex: "hoje" ou "amanhã")',
    }
  }

  const time = parseHourMinute(state.scheduled_at || null)
  const titleNorm = state.title ? normalizeString(state.title) : null
  const isGenericTitle = titleNorm ? ['reuniao', 'reunião', 'compromisso', 'consulta', 'evento'].includes(titleNorm) : true

  // Busca compromissos do dia (não inclui cancelados)
  let candidates = await getCompromissosRecords(tenantId, range.start, range.end, userId, false)

  // Filtra por título quando for específico
  if (titleNorm && !isGenericTitle) {
    candidates = candidates.filter(c => normalizeString(c.title).includes(titleNorm))
  }

  // Filtra por horário se fornecido
  if (time) {
    candidates = candidates.filter(c => {
      const hhmm = formatTimeBR(c.scheduled_at)
      const [hh, mm] = hhmm.split(':').map(Number)
      return hh === time.hour && mm === time.minute
    })
  }

  if (candidates.length === 0) {
    const label = formatDayLabel(state.periodo)
    const when = time ? `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}` : null
    return {
      success: true,
      message: `Não encontrei nenhum compromisso${label ? ` ${label}` : ''}${when ? ` às ${when}` : ''} para cancelar.`,
    }
  }

  if (candidates.length === 1) {
    return await cancelById(candidates[0].id)
  }

  // Ambíguo: lista apenas opções válidas
  const label = formatDayLabel(state.periodo)
  const options = candidates
    .slice(0, 5)
    .map(c => {
      const hhmm = formatTimeBR(c.scheduled_at)
      const title = c.title || 'Compromisso'
      return `- ${hhmm} — ${title}`
    })
    .join('\n')

  return {
    success: true,
    message: `Encontrei ${candidates.length} compromissos${label ? ` ${label}` : ''}.\nQual você quer cancelar?\n\n${options}`,
  }
}

/**
 * Registra um gasto
 */
async function handleRegisterExpense(
  state: SemanticState,
  tenantId: string,
  userId: string
): Promise<ActionResult> {
  try {
    // Validação rígida: verifica dados obrigatórios
    if (!state.amount || state.amount <= 0) {
      return {
        success: false,
        message: 'Preciso saber o valor do gasto. Quanto foi?',
      }
    }

    if (!state.description) {
      return {
        success: false,
        message: 'Preciso saber o que foi comprado. Pode descrever?',
      }
    }

    // Usa dados do estado semântico
    const amount = state.amount
    const description = state.description
    const date = new Date().toISOString().split('T')[0] // Sempre usa hoje para registros

    // Usa categoria do estado ou categoriza automaticamente
    let category = state.categoria || 'Outros'
    let subcategory = state.subcategoria || null
    let tags: string[] = []

    if (!category || category === 'Outros') {
      // Aplica categorização inteligente baseada na descrição
      const categorization = categorizeExpense(description, amount)
      category = categorization.category
      subcategory = categorization.subcategory
      tags = categorization.tags
    } else {
      // Se categoria foi fornecida, ainda tenta extrair subcategoria e tags
      const categorization = categorizeExpense(description, amount)
      if (categorization.category === category) {
        subcategory = categorization.subcategory
        tags = categorization.tags
      } else {
        // Mesmo com categoria diferente, extrai tags da descrição
        tags = extractTags(description, category, null)
      }
    }

    // Extrai tags adicionais da descrição
    const additionalTags = extractTags(description, category, subcategory)
    tags = [...new Set([...tags, ...additionalTags])]

    // Prepara metadados
    const metadata: Record<string, any> = {
      extractedAt: new Date().toISOString(),
      confidence: state.confidence || 0.8,
    }

    // Cria o registro
    const record = await createFinanceiroRecord({
      tenantId,
      userId,
      amount,
      description: description.trim(),
      category,
      date,
      subcategory,
      metadata,
      tags,
      transactionType: 'expense',
    })

    let responseMessage = `✅ Gasto registrado com sucesso!\n\n💰 Valor: R$ ${amount.toFixed(2)}\n📝 Descrição: ${description}\n🏷️ Categoria: ${category}`
    
    if (subcategory) {
      responseMessage += `\n📌 Subcategoria: ${subcategory}`
    }
    
    responseMessage += `\n📅 Data: ${new Date(date).toLocaleDateString('pt-BR')}`

    return {
      success: true,
      message: responseMessage,
      data: record,
    }
  } catch (error) {
    if (error instanceof ValidationError) {
      return {
        success: false,
        message: error.message,
      }
    }
    throw error
  }
}

/**
 * Registra uma receita
 * Mesma lógica de handleRegisterExpense, apenas muda transactionType e mensagens
 */
async function handleRegisterRevenue(
  state: SemanticState,
  tenantId: string,
  userId: string
): Promise<ActionResult> {
  try {
    // Validação rígida: verifica dados obrigatórios
    if (!state.amount || state.amount <= 0) {
      return {
        success: false,
        message: 'Preciso saber o valor da receita. Quanto foi?',
      }
    }

    if (!state.description) {
      return {
        success: false,
        message: 'Preciso saber de onde veio essa receita. Pode descrever?',
      }
    }

    // Usa dados do estado semântico
    const amount = state.amount
    const description = state.description
    const date = new Date().toISOString().split('T')[0] // Sempre usa hoje para registros

    // Usa categoria do estado ou categoriza automaticamente
    let category = state.categoria || 'Outros'
    let subcategory = state.subcategoria || null
    let tags: string[] = []

    if (!category || category === 'Outros') {
      // Aplica categorização inteligente baseada na descrição (para receitas)
      const categorization = categorizeRevenue(description, amount)
      category = categorization.category
      subcategory = categorization.subcategory
      tags = categorization.tags
    } else {
      // Se categoria foi fornecida, ainda tenta extrair subcategoria e tags
      const categorization = categorizeRevenue(description, amount)
      if (categorization.category === category) {
        subcategory = categorization.subcategory
        tags = categorization.tags
      } else {
        // Mesmo com categoria diferente, extrai tags da descrição
        tags = extractTags(description, category, null)
      }
    }

    // Extrai tags adicionais da descrição
    const additionalTags = extractTags(description, category, subcategory)
    tags = [...new Set([...tags, ...additionalTags])]

    // Prepara metadados
    const metadata: Record<string, any> = {
      extractedAt: new Date().toISOString(),
      confidence: state.confidence || 0.8,
    }

    // Cria o registro (única diferença: transactionType: 'revenue')
    const record = await createFinanceiroRecord({
      tenantId,
      userId,
      amount,
      description: description.trim(),
      category,
      date,
      subcategory,
      metadata,
      tags,
      transactionType: 'revenue',
    })

    let responseMessage = `✅ Receita registrada com sucesso!\n\n💰 Valor: R$ ${amount.toFixed(2)}\n📝 Descrição: ${description}\n🏷️ Categoria: ${category}`
    
    if (subcategory) {
      responseMessage += `\n📌 Subcategoria: ${subcategory}`
    }
    
    responseMessage += `\n📅 Data: ${new Date(date).toLocaleDateString('pt-BR')}`

    return {
      success: true,
      message: responseMessage,
      data: record,
    }
  } catch (error) {
    if (error instanceof ValidationError) {
      return {
        success: false,
        message: error.message,
      }
    }
    throw error
  }
}

/**
 * Cria um compromisso
 */
async function handleCreateAppointment(
  state: SemanticState,
  tenantId: string,
  userId: string,
  originalMessage?: string
): Promise<ActionResult> {
  try {
    console.log('=== handleCreateAppointment INICIADO ===')
    console.log('handleCreateAppointment - Estado semântico:', JSON.stringify(state, null, 2))
    console.log('handleCreateAppointment - Mensagem original:', originalMessage)
    console.log('handleCreateAppointment - TenantId:', tenantId)
    
    // NÃO pergunte antes de tentar extrair da mensagem original.
    // Isso evita perguntas como "qual a data de amanhã" quando o usuário já disse "amanhã às 15h".
    let title = state.title || null
    let scheduledAt: string | null = null

    // 1) Se a IA forneceu scheduled_at, pode ser:
    // - ISO (legado) -> parseScheduledAt
    // - Hora (HH:mm / 15h / 15h30) + periodo separado -> resolveScheduledAt
    // - Texto relativo ("amanhã às 15h") -> extrai periodo/hora e resolve
    if (state.scheduled_at) {
      scheduledAt = parseScheduledAt(state.scheduled_at, state.title || undefined, originalMessage)

      if (!scheduledAt) {
        const raw = state.scheduled_at.toLowerCase()
        const periodoFromState = state.periodo || null
        const periodoFromText =
          raw.includes('amanhã') ? 'amanhã'
          : raw.includes('hoje') ? 'hoje'
          : raw.includes('ontem') ? 'ontem'
          : null
        const periodo = periodoFromState || periodoFromText

        // Extrai "HH:mm" ou "15h"/"15h30"
        const timeMatch = raw.match(/(\d{1,2})(?::|h)(\d{2})/) || raw.match(/(\d{1,2})h\b/) || raw.match(/\b(\d{1,2}):(\d{2})\b/)
        let horario: string | null = null
        if (timeMatch) {
          const h = Number(timeMatch[1])
          const m = timeMatch[2] ? Number(timeMatch[2]) : 0
          if (!Number.isNaN(h) && !Number.isNaN(m)) {
            horario = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
          }
        }

        if (periodo && horario) {
          scheduledAt = resolveScheduledAt(periodo, horario, 'America/Sao_Paulo', new Date())
        }
      }
    }

    console.log('handleCreateAppointment - Dados da IA:', {
      title,
      scheduledAt,
      scheduled_at_original: state.scheduled_at,
      state_completo: JSON.stringify(state, null, 2)
    })
    
    // Se a IA retornou uma data, verifica se está no formato correto
    if (scheduledAt) {
      const testDate = new Date(scheduledAt)
      const testBrazil = testDate.toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
      console.log('handleCreateAppointment - Data da IA verificada:', {
        scheduledAt,
        testBrazil,
        isValid: !isNaN(testDate.getTime())
      })
    }

    // 2) Se não tem dados suficientes, tenta extrair da mensagem original
    if ((!title || !scheduledAt) && originalMessage) {
      console.log('handleCreateAppointment - Tentando extrair da mensagem original:', originalMessage)
      const extracted = extractAppointmentFromMessage(originalMessage)
      console.log('handleCreateAppointment - Dados extraídos da mensagem:', JSON.stringify(extracted, null, 2))
      
      if (!title && extracted.title) {
        title = extracted.title
        console.log('handleCreateAppointment - Título atualizado para:', title)
      }
      if (!scheduledAt && extracted.scheduledAt) {
        scheduledAt = extracted.scheduledAt
        console.log('handleCreateAppointment - scheduledAt atualizado para:', scheduledAt)
        console.log('handleCreateAppointment - scheduledAt (formato local):', new Date(scheduledAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }))
      }
    }

    // Se ainda não tem título, usa padrão
    if (!title) {
      title = state.title || 'Reunião'
    }

    // Se ainda não tem data/hora, tenta processar o scheduled_at original (se existir)
    if (!scheduledAt && state.scheduled_at) {
      // Última chance: tenta como tempo relativo + hora (se tiver periodo)
      const iso = parseScheduledAt(state.scheduled_at, state.title || undefined, originalMessage)
      if (iso) scheduledAt = iso
      else if (state.periodo) {
        // Se a IA retornou apenas horário (ex: "15:00"), converte aqui
        const tryIso = resolveScheduledAt(state.periodo, state.scheduled_at, 'America/Sao_Paulo', new Date())
        if (tryIso) scheduledAt = tryIso
      }
    }

    // Se ainda não tem data/hora, retorna erro
    if (!scheduledAt) {
      console.error('handleCreateAppointment - ERRO: scheduledAt não encontrado')
      console.error('handleCreateAppointment - Dados finais:', {
        title,
        scheduledAt,
        state_scheduled_at: state.scheduled_at,
        originalMessage
      })
      return {
        success: false,
        message: 'Não consegui entender a data/horário. Pode me dizer assim: "amanhã às 15h" ou "segunda às 15h"?',
      }
    }

    // Valida se a data não é no passado (usando timezone do Brasil)
    const scheduledDate = new Date(scheduledAt)
    const now = new Date() // Usa data atual do sistema
    
    console.log('handleCreateAppointment - Validação de data:', {
      scheduledAt,
      scheduledDateISO: scheduledDate.toISOString(),
      scheduledDateLocal: scheduledDate.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
      nowISO: now.toISOString(),
      nowLocal: now.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
    })
    
    // Validação mais permissiva para agendamentos no mesmo dia
    const isValid = isFutureInBrazil(scheduledDate, now)
    
    if (!isValid) {
      // Log detalhado para debug
      const scheduledBrazil = scheduledDate.toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
      
      const nowBrazil = now.toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
      
      console.error('handleCreateAppointment - Data rejeitada como passado:', {
        scheduledBrazil,
        nowBrazil,
        scheduledISO: scheduledDate.toISOString(),
        nowISO: now.toISOString(),
        diferencaMs: scheduledDate.getTime() - now.getTime(),
        diferencaMinutos: (scheduledDate.getTime() - now.getTime()) / (1000 * 60)
      })
      
      return {
        success: false,
        message: 'Não é possível agendar compromissos no passado. Por favor, informe uma data/hora futura.',
      }
    }
    
    console.log('handleCreateAppointment - Data validada com sucesso')

    console.log('Criando compromisso:', { title, scheduledAt, tenantId })

    const compromisso = await createCompromissoRecord({
      tenantId,
      userId,
      title: title.trim(),
      scheduledAt: scheduledAt,
      description: state.description || null,
    })

    if (!compromisso) {
      return {
        success: false,
        message: 'Erro ao criar compromisso. Tente novamente.',
      }
    }

    console.log('Compromisso criado com sucesso:', compromisso.id)

    return {
      success: true,
      message: `✅ Compromisso agendado!\n\n📅 ${title}\n🕐 ${new Date(scheduledAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}${state.description ? `\n📝 ${state.description}` : ''}`,
      data: compromisso,
    }
  } catch (error) {
    console.error('Erro ao criar compromisso:', error)
    if (error instanceof ValidationError) {
      return {
        success: false,
        message: error.message,
      }
    }
    return {
      success: false,
      message: 'Erro ao criar compromisso. Tente novamente.',
    }
  }
}

/**
 * Consulta informações
 */
/**
 * Consulta informações baseado no estado semântico
 * SEM heurísticas, SEM if/else complexos, SEM reconstrução manual
 * Apenas valida e executa baseado no estado
 * 
 * Função handleQuery antiga removida - substituída por handleQuerySimple em actions-query-simple.ts
 */

/**
 * Gera relatório completo (financeiro + compromissos)
 */
async function handleReport(tenantId: string): Promise<ActionResult> {
  try {
    const now = new Date()
    
    // Busca relatório financeiro mensal
    const relatorio = await gerarResumoMensal(tenantId)

    // Busca TODOS os compromissos futuros (sem limite)
    const compromissos = await getCompromissosRecords(
      tenantId,
      now.toISOString()
    )
    
    // Log para debug
    console.log(`handleReport - Compromissos futuros encontrados:`, compromissos.length)
    
    // Ordena compromissos por data
    compromissos.sort((a, b) => 
      new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
    )

    let message = `📊 Relatório Completo\n\n`
    
    // Seção Financeira
    message += `💰 FINANCEIRO (Mensal)\n`
    message += `Total: R$ ${relatorio.total.toFixed(2)}\n`
    message += `Registros: ${relatorio.totalRegistros}\n\n`

    if (Object.keys(relatorio.porCategoria).length > 0) {
      message += `Por categoria:\n`
      Object.entries(relatorio.porCategoria)
        .sort(([, a], [, b]) => b - a)
        .forEach(([cat, valor]) => {
          message += `• ${cat}: R$ ${Number(valor).toFixed(2)}\n`
        })
      message += `\n`
    }

    // Seção de Compromissos
    message += `📅 COMPROMISSOS AGENDADOS\n`
    if (compromissos.length === 0) {
      message += `Nenhum compromisso futuro agendado.\n`
    } else {
      message += `Total: ${compromissos.length} ${compromissos.length === 1 ? 'compromisso' : 'compromissos'}\n\n`
      
      compromissos.forEach((c, index) => {
        const dataHora = new Date(c.scheduled_at)
        const data = dataHora.toLocaleDateString('pt-BR', {
          timeZone: 'America/Sao_Paulo',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })
        const hora = dataHora.toLocaleTimeString('pt-BR', {
          timeZone: 'America/Sao_Paulo',
          hour: '2-digit',
          minute: '2-digit'
        })
        
        message += `${index + 1}. ${c.title}\n`
        message += `   🕐 ${hora} - ${data}\n`
        if (c.description) {
          message += `   📝 ${c.description}\n`
        }
        message += `\n`
      })
    }

    return {
      success: true,
      message,
      data: { 
        financeiro: relatorio,
        compromissos,
        totalCompromissos: compromissos.length
      },
    }
  } catch (error) {
    console.error('Erro ao gerar relatório:', error)
    throw error
  }
}
