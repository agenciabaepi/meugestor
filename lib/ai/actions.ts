/**
 * Processa ações identificadas pela IA e executa no sistema
 */

import { analyzeIntention } from './conversation'
import { createFinanceiroRecord, getFinanceiroBySubcategoryRecords, getFinanceiroByTagsRecords, calculateTotalByCategory, getDespesasRecords, getReceitasRecords } from '../services/financeiro'
import { createCompromissoRecord, getCompromissosRecords } from '../services/compromissos'
import { gerarRelatorioFinanceiro, gerarResumoMensal } from '../services/relatorios'
import { getFinanceiroRecords } from '../services/financeiro'
import { getTodayCompromissos } from '../services/compromissos'
import { ValidationError } from '../utils/errors'
import { categorizeExpense, categorizeRevenue, extractTags } from '../services/categorization'
import { parseScheduledAt, extractAppointmentFromMessage, isFutureInBrazil, getNowInBrazil, getTodayStartInBrazil, getTodayEndInBrazil, getYesterdayStartInBrazil, getYesterdayEndInBrazil } from '../utils/date-parser'
import { analyzeAppointmentContext, analyzeSystemFeaturesRequest, analyzeConversationalIntent } from './context-analyzer'
import type { SemanticState } from './semantic-state'

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
 * Valida e corrige a intenção baseado em palavras-chave da mensagem original
 * Isso serve como camada de segurança caso a IA não detecte corretamente
 */
function validateAndCorrectIntention(
  message: string,
  detectedIntention: string,
  extractedData: any
): string {
  const lowerMessage = message.toLowerCase()
  
  // Palavras-chave que indicam RECEITA
  const revenueKeywords = [
    'recebi', 'recebido', 'receber', 'recebeu',
    'ganhei', 'ganho', 'ganhar', 'ganhou',
    'entrada', 'entrou',
    'salário', 'salario',
    'comissão', 'comissao', 'comissões', 'comissoes',
    'dividendos', 'dividendo',
    'rendimento', 'rendimentos',
    'venda', 'vendas',
    'freelance', 'freela',
    'prolabore',
    'bônus', 'bonus',
    'reembolso', 'estorno', 'devolução', 'devolucao',
    'aluguel recebido'
  ]
  
  // Palavras-chave que indicam DESPESA
  const expenseKeywords = [
    'gastei', 'gasto', 'gastar', 'gastou',
    'paguei', 'pago', 'pagar', 'pagou',
    'despesa', 'despesas',
    'comprei', 'compra', 'comprar', 'comprou',
    'saída', 'saiu'
  ]
  
  // Verifica se há palavras de receita na mensagem
  const hasRevenueKeyword = revenueKeywords.some(keyword => lowerMessage.includes(keyword))
  const hasExpenseKeyword = expenseKeywords.some(keyword => lowerMessage.includes(keyword))
  
  // Palavras-chave que indicam CONSULTA DE GASTOS (não compromissos)
  const expenseQueryKeywords = [
    'quanto gastei', 'quantos gastei', 'quanto gasto', 'quantos gasto',
    'quanto paguei', 'quantos paguei', 'quanto pago', 'quantos pago',
    'quanto despesa', 'quantos despesa'
  ]
  
  // Verifica se é consulta de gastos (deve ser query, não compromissos)
  const isExpenseQuery = expenseQueryKeywords.some(keyword => lowerMessage.includes(keyword)) ||
                         (hasExpenseKeyword && (lowerMessage.includes('quanto') || lowerMessage.includes('quantos')))
  
  // Se detectou compromissos mas a mensagem é sobre gastos, corrige para query de gastos
  if (detectedIntention === 'query' && extractedData?.queryType === 'compromissos' && isExpenseQuery) {
    console.log('⚠️ Correção: Era "compromissos", mas é sobre gastos. Corrigindo queryType.')
    if (extractedData) {
      extractedData.queryType = 'gasto'
      extractedData.queryPeriod = lowerMessage.includes('ontem') ? 'ontem' :
                                  lowerMessage.includes('hoje') ? 'hoje' :
                                  lowerMessage.includes('semana') ? 'semana' :
                                  lowerMessage.includes('mês') || lowerMessage.includes('mes') ? 'mês' : undefined
    }
  }
  
  // Se detectou receita mas a IA disse que é despesa, corrige
  if (hasRevenueKeyword && detectedIntention === 'register_expense') {
    console.log('⚠️ Correção: Mensagem contém palavras de receita, corrigindo intenção para register_revenue')
    return 'register_revenue'
  }
  
  // Se detectou despesa mas a IA disse que é receita, corrige
  if (hasExpenseKeyword && detectedIntention === 'register_revenue') {
    console.log('⚠️ Correção: Mensagem contém palavras de despesa, corrigindo intenção para register_expense')
    return 'register_expense'
  }
  
  return detectedIntention
}

export async function processAction(
  message: string,
  tenantId: string
): Promise<ActionResult> {
  try {
    console.log('=== PROCESS ACTION INICIADO ===')
    console.log('processAction - Mensagem:', message)
    console.log('processAction - TenantId:', tenantId)
    
    // Busca contexto recente para o GPT entender a conversa completa
    const { getRecentConversations } = await import('../db/queries')
    const recentConversations = await getRecentConversations(tenantId, 10)
    const recentContext = recentConversations.map(c => ({
      role: c.role,
      message: c.message
    }))
    
    // GPT analisa e retorna estado semântico completo (com herança de contexto)
    console.log('processAction - Analisando estado semântico...')
    const semanticState = await analyzeIntention(message, recentContext)
    
    console.log('processAction - Estado semântico:', JSON.stringify(semanticState, null, 2))
    
    // Se precisa esclarecimento, retorna mensagem
    if (semanticState.needsClarification && semanticState.clarificationMessage) {
      return {
        success: true,
        message: semanticState.clarificationMessage,
      }
    }
    
    // Validação rígida: verifica se estado é válido
    if (semanticState.confidence < 0.7) {
      return {
        success: false,
        message: 'Não entendi completamente. Pode reformular sua pergunta?',
      }
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

    switch (semanticState.intent) {
      case 'register_expense':
        console.log('processAction - Chamando handleRegisterExpense')
        const expenseResult = await handleRegisterExpense(semanticState, tenantId)
        console.log('processAction - Resultado handleRegisterExpense:', expenseResult.success)
        return expenseResult

      case 'register_revenue':
        console.log('processAction - Chamando handleRegisterRevenue')
        const revenueResult = await handleRegisterRevenue(semanticState, tenantId)
        console.log('processAction - Resultado handleRegisterRevenue:', revenueResult.success)
        return revenueResult

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
          now.toISOString()
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
        
        console.log('processAction - Prosseguindo com criação de compromisso')
        return await handleCreateAppointment(semanticState, tenantId, message)

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
        return await handleQuerySimple(semanticState, tenantId)

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

/**
 * Registra um gasto
 */
async function handleRegisterExpense(
  state: SemanticState,
  tenantId: string
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
  tenantId: string
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
  originalMessage?: string
): Promise<ActionResult> {
  try {
    console.log('=== handleCreateAppointment INICIADO ===')
    console.log('handleCreateAppointment - Estado semântico:', JSON.stringify(state, null, 2))
    console.log('handleCreateAppointment - Mensagem original:', originalMessage)
    console.log('handleCreateAppointment - TenantId:', tenantId)
    
    // Validação rígida: verifica dados obrigatórios
    if (!state.title) {
      return {
        success: false,
        message: 'Preciso saber o título do compromisso. Pode informar?',
      }
    }
    
    if (!state.scheduled_at) {
      return {
        success: false,
        message: 'Preciso saber quando será o compromisso. Pode informar data e horário?',
      }
    }
    
    let title = state.title
    let scheduledAt = parseScheduledAt(state.scheduled_at, state.title, originalMessage)

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

    // Se não tem dados suficientes, tenta extrair da mensagem original
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
      title = state.title || 'Compromisso'
    }

    // Se ainda não tem data/hora, tenta processar o scheduled_at original
    if (!scheduledAt && state.scheduled_at) {
      scheduledAt = parseScheduledAt(state.scheduled_at, state.title, originalMessage)
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
        message: 'Preciso saber quando será o compromisso. Qual data e horário? (ex: "reunião 12h", "amanhã às 10h")',
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
