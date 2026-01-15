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
    
    // Analisa a intenção
    console.log('processAction - Analisando intenção...')
    const { intention, extractedData } = await analyzeIntention(message)

    console.log('processAction - Intenção detectada:', intention)
    console.log('processAction - Dados extraídos:', JSON.stringify(extractedData, null, 2))
    
    // Log específico para compromissos
    if (intention === 'create_appointment') {
      console.log('processAction - COMPROMISSO DETECTADO')
      console.log('processAction - extractedData.title:', extractedData?.title)
      console.log('processAction - extractedData.scheduled_at:', extractedData?.scheduled_at)
      console.log('processAction - Mensagem original:', message)
    }

    // Valida e corrige a intenção baseado em palavras-chave
    const correctedIntention = validateAndCorrectIntention(message, intention, extractedData)
    
    if (correctedIntention !== intention) {
      console.log(`processAction - ✅ Intenção corrigida: ${intention} -> ${correctedIntention}`)
    }

    console.log('processAction - Intenção final:', correctedIntention)

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
    if (correctedIntention !== 'create_appointment') {
      const featuresAnalysis = analyzeSystemFeaturesRequest(message)
      if (!featuresAnalysis.shouldProceed && featuresAnalysis.message) {
        console.log('processAction - Usuário pedindo funcionalidade que já existe')
        return {
          success: true,
          message: featuresAnalysis.message,
        }
      }
    }

    switch (correctedIntention) {
      case 'register_expense':
        console.log('processAction - Chamando handleRegisterExpense')
        const expenseResult = await handleRegisterExpense(extractedData, tenantId)
        console.log('processAction - Resultado handleRegisterExpense:', expenseResult.success)
        return expenseResult

      case 'register_revenue':
        console.log('processAction - Chamando handleRegisterRevenue')
        const revenueResult = await handleRegisterRevenue(extractedData, tenantId)
        console.log('processAction - Resultado handleRegisterRevenue:', revenueResult.success)
        return revenueResult

      case 'create_appointment':
        // Análise específica para compromissos
        console.log('processAction - Analisando contexto de compromisso...')
        console.log('processAction - Dados extraídos:', {
          title: extractedData?.title,
          scheduled_at: extractedData?.scheduled_at,
          description: extractedData?.description
        })
        
        // Busca compromissos existentes para verificar duplicatas e pedidos de lembrete
        // Busca apenas compromissos futuros para análise de contexto
        const now = new Date()
        const existingAppointments = await getCompromissosRecords(
          tenantId,
          now.toISOString()
        )
        console.log('processAction - Compromissos futuros encontrados:', existingAppointments.length)
        
        const appointmentAnalysis = analyzeAppointmentContext(
          message,
          extractedData,
          existingAppointments.map(apt => ({
            title: apt.title,
            scheduled_at: apt.scheduled_at,
          }))
        )
        
        if (!appointmentAnalysis.shouldProceed && appointmentAnalysis.message) {
          console.log('processAction - Ação de compromisso bloqueada pela análise de contexto')
          console.log('processAction - Razão:', appointmentAnalysis.reason)
          return {
            success: true,
            message: appointmentAnalysis.message,
          }
        }
        
        console.log('processAction - Prosseguindo com criação de compromisso')
        return await handleCreateAppointment(extractedData, tenantId, message)

      case 'query':
        return await handleQuery(message, tenantId, extractedData)

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
  data: any,
  tenantId: string
): Promise<ActionResult> {
  try {
    // Valida dados mínimos
    if (!data?.amount) {
      return {
        success: false,
        message: 'Preciso saber o valor do gasto. Quanto foi?',
      }
    }

    if (!data?.description) {
      return {
        success: false,
        message: 'Preciso saber o que foi comprado. Pode descrever?',
      }
    }

    // Define valores padrão
    const amount = parseFloat(data.amount) || 0
    let description = data.description || 'Gasto'
    const date = data.date || new Date().toISOString().split('T')[0]

    // Usa categorização inteligente se não foi fornecida categoria
    let category = data.category
    let subcategory: string | null = null
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
      establishment: data.establishment || null,
      paymentMethod: data.paymentMethod || null,
      extractedAt: new Date().toISOString(),
      confidence: data.confidence || 0.8,
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
  data: any,
  tenantId: string
): Promise<ActionResult> {
  try {
    // Valida dados mínimos
    if (!data?.amount) {
      return {
        success: false,
        message: 'Preciso saber o valor da receita. Quanto foi?',
      }
    }

    if (!data?.description) {
      return {
        success: false,
        message: 'Preciso saber de onde veio essa receita. Pode descrever?',
      }
    }

    // Define valores padrão
    const amount = parseFloat(data.amount) || 0
    let description = data.description || 'Receita'
    const date = data.date || new Date().toISOString().split('T')[0]

    // Usa categorização inteligente se não foi fornecida categoria
    let category = data.category
    let subcategory: string | null = null
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
      source: data.source || data.establishment || null,
      paymentMethod: data.paymentMethod || null,
      extractedAt: new Date().toISOString(),
      confidence: data.confidence || 0.8,
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
  data: any,
  tenantId: string,
  originalMessage?: string
): Promise<ActionResult> {
  try {
    console.log('=== handleCreateAppointment INICIADO ===')
    console.log('handleCreateAppointment - Dados recebidos:', JSON.stringify(data, null, 2))
    console.log('handleCreateAppointment - Mensagem original:', originalMessage)
    console.log('handleCreateAppointment - TenantId:', tenantId)
    
    let title = data?.title
    let scheduledAt = data?.scheduled_at ? parseScheduledAt(data.scheduled_at, data?.title, originalMessage) : null

    console.log('handleCreateAppointment - Dados da IA:', {
      title,
      scheduledAt,
      scheduled_at_original: data?.scheduled_at,
      data_completo: JSON.stringify(data, null, 2)
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
      title = data?.title || 'Compromisso'
    }

    // Se ainda não tem data/hora, tenta processar o scheduled_at original
    if (!scheduledAt && data?.scheduled_at) {
      scheduledAt = parseScheduledAt(data.scheduled_at, data?.title, originalMessage)
    }

    // Se ainda não tem data/hora, retorna erro
    if (!scheduledAt) {
      console.error('handleCreateAppointment - ERRO: scheduledAt não encontrado')
      console.error('handleCreateAppointment - Dados finais:', {
        title,
        scheduledAt,
        data_scheduled_at: data?.scheduled_at,
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
      description: data?.description || null,
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
      message: `✅ Compromisso agendado!\n\n📅 ${title}\n🕐 ${new Date(scheduledAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}${data?.description ? `\n📝 ${data.description}` : ''}`,
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
async function handleQuery(
  message: string,
  tenantId: string,
  extractedData?: any
): Promise<ActionResult> {
  try {
    const lowerMessage = message.toLowerCase()
    const now = getNowInBrazil() // Usa timezone do Brasil
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfMonthStr = startOfMonth.toISOString().split('T')[0]

    // PRIORIDADE 0: Verifica se é sobre GASTOS/DESPESAS primeiro (mais comum)
    // Se menciona palavras de gasto, NÃO é sobre compromissos
    const isAboutExpenses = lowerMessage.includes('gastei') || 
                           lowerMessage.includes('gasto') || 
                           lowerMessage.includes('gastar') ||
                           lowerMessage.includes('gastos') ||
                           lowerMessage.includes('despesa') ||
                           lowerMessage.includes('despesas') ||
                           lowerMessage.includes('paguei') ||
                           lowerMessage.includes('pago') ||
                           (lowerMessage.includes('quanto') && (lowerMessage.includes('gastei') || lowerMessage.includes('gasto'))) ||
                           (lowerMessage.includes('quantos') && (lowerMessage.includes('gastei') || lowerMessage.includes('gasto')))
    
    // PRIORIDADE 1: Consulta de compromissos (APENAS se NÃO for sobre gastos)
    // Verifica se é pergunta sobre compromissos/agenda
    if (!isAboutExpenses && (
        extractedData?.queryType === 'compromissos' || 
        extractedData?.queryType === 'agenda' ||
        (lowerMessage.includes('compromisso') && !lowerMessage.includes('gasto')) || 
        (lowerMessage.includes('agenda') && !lowerMessage.includes('gasto')) ||
        (lowerMessage.includes('reunião') && !lowerMessage.includes('gasto')) ||
        (lowerMessage.includes('reuniao') && !lowerMessage.includes('gasto')) ||
        (lowerMessage.includes('quantos') && (lowerMessage.includes('tenho') || lowerMessage.includes('tem')) && !lowerMessage.includes('gastei') && !lowerMessage.includes('gasto')) ||
        (lowerMessage.includes('quais') && (lowerMessage.includes('compromisso') || lowerMessage.includes('agenda')) && !lowerMessage.includes('gasto')) ||
        (lowerMessage.includes('tenho') && (lowerMessage.includes('compromisso') || lowerMessage.includes('agenda') || lowerMessage.includes('reunião')) && !lowerMessage.includes('gasto')) ||
        (lowerMessage.includes('amanhã') && (lowerMessage.includes('compromisso') || lowerMessage.includes('agenda')) && !lowerMessage.includes('gasto')) ||
        (lowerMessage.includes('amanha') && (lowerMessage.includes('compromisso') || lowerMessage.includes('agenda')) && !lowerMessage.includes('gasto')))) {
      
      console.log('handleQuery - Consulta de COMPROMISSOS detectada')
      
      // Determina o período da consulta
      const isAmanha = lowerMessage.includes('amanhã') || lowerMessage.includes('amanha')
      const isHoje = lowerMessage.includes('hoje')
      const isSemana = lowerMessage.includes('semana')
      
      let compromissos: any[] = []
      let periodoTexto = ''
      
      if (isAmanha) {
        // Compromissos de amanhã - usa getNowInBrazil para garantir timezone correto
        const nowBrazil = getNowInBrazil()
        const amanha = new Date(nowBrazil)
        amanha.setDate(amanha.getDate() + 1)
        amanha.setHours(0, 0, 0, 0)
        const amanhaFim = new Date(amanha)
        amanhaFim.setHours(23, 59, 59, 999)
        
        console.log('handleQuery - Buscando compromissos de amanhã:', {
          amanha: amanha.toISOString(),
          amanhaFim: amanhaFim.toISOString(),
          amanhaLocal: amanha.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
          amanhaFimLocal: amanhaFim.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
        })
        
        // Busca compromissos no intervalo de amanhã
        // Usa uma margem maior para garantir que pega todos (1 dia antes e 1 dia depois)
        const amanhaInicio = new Date(amanha)
        amanhaInicio.setDate(amanhaInicio.getDate() - 1) // 1 dia antes para margem
        amanhaInicio.setHours(0, 0, 0, 0)
        
        const amanhaFimMargem = new Date(amanhaFim)
        amanhaFimMargem.setDate(amanhaFimMargem.getDate() + 1) // 1 dia depois para margem
        amanhaFimMargem.setHours(23, 59, 59, 999)
        
        console.log('handleQuery - Buscando com margem para garantir todos:', {
          inicio: amanhaInicio.toISOString(),
          fim: amanhaFimMargem.toISOString(),
          inicioLocal: amanhaInicio.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
          fimLocal: amanhaFimMargem.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
        })
        
        const todosCompromissos = await getCompromissosRecords(
          tenantId,
          amanhaInicio.toISOString(),
          amanhaFimMargem.toISOString()
        )
        
        console.log(`handleQuery - Total de compromissos encontrados no intervalo ampliado: ${todosCompromissos.length}`)
        
        // Filtra no cliente para garantir que está no dia correto (timezone do Brasil)
        compromissos = todosCompromissos.filter(c => {
          const dataCompromisso = new Date(c.scheduled_at)
          const dataCompromissoBrazil = dataCompromisso.toLocaleDateString('en-CA', {
            timeZone: 'America/Sao_Paulo',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          })
          const amanhaKey = amanha.toLocaleDateString('en-CA', {
            timeZone: 'America/Sao_Paulo',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
          })
          const matches = dataCompromissoBrazil === amanhaKey
          
          if (!matches) {
            console.log(`handleQuery - Compromisso filtrado (não é amanhã):`, {
              title: c.title,
              scheduled_at: c.scheduled_at,
              dataCompromissoBrazil,
              amanhaKey
            })
          }
          
          return matches
        })
        
        console.log(`handleQuery - Compromissos encontrados para amanhã: ${compromissos.length} (de ${todosCompromissos.length} no intervalo)`, {
          amanhaInicio: amanha.toISOString(),
          amanhaFim: amanhaFim.toISOString(),
          amanhaInicioLocal: amanha.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
          amanhaFimLocal: amanhaFim.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
          compromissos: compromissos.map(c => ({
            id: c.id,
            title: c.title,
            scheduled_at: c.scheduled_at,
            scheduled_at_brazil: new Date(c.scheduled_at).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
          }))
        })
        
        periodoTexto = 'amanhã'
      } else if (isHoje) {
        // Compromissos de hoje
        compromissos = await getTodayCompromissos(tenantId)
        periodoTexto = 'hoje'
      } else if (isSemana) {
        // Compromissos da semana
        const semanaFim = new Date(now)
        semanaFim.setDate(semanaFim.getDate() + 7)
        compromissos = await getCompromissosRecords(
          tenantId,
          now.toISOString(),
          semanaFim.toISOString()
        )
        periodoTexto = 'esta semana'
      } else {
        // Todos os compromissos futuros
        compromissos = await getCompromissosRecords(
          tenantId,
          now.toISOString()
        )
        periodoTexto = 'futuros'
      }
      
      // Log para debug
      console.log(`handleQuery - Compromissos encontrados para período "${periodoTexto}": ${compromissos.length}`)
      
      // Log adicional: lista todos os IDs e títulos para verificar
      if (compromissos.length > 0) {
        console.log(`handleQuery - Lista completa de compromissos encontrados:`, compromissos.map(c => ({
          id: c.id,
          title: c.title,
          scheduled_at: c.scheduled_at
        })))
      }
      
      // Ordena por data
      compromissos.sort((a, b) => 
        new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
      )
      
      let response = ''
      
      if (compromissos.length === 0) {
        response = `📅 Você não tem compromissos ${periodoTexto === 'futuros' ? 'futuros' : periodoTexto}.`
      } else {
        const quantidade = compromissos.length
        response = `📅 Você tem ${quantidade} ${quantidade === 1 ? 'compromisso' : 'compromissos'} ${periodoTexto}:\n\n`
        
        // Lista TODOS os compromissos encontrados (sem limite)
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
          
          response += `${index + 1}. ${c.title}\n`
          response += `   🕐 ${hora} - ${data}\n`
          if (c.description) {
            response += `   📝 ${c.description}\n`
          }
          response += `\n`
        })
      }
      
      return {
        success: true,
        message: response,
        data: { compromissos, periodo: periodoTexto },
      }
    }

    // Consulta específica por categoria/subcategoria (ex: "quanto gasto de combustível?")
    if (extractedData?.queryType === 'categoria' || 
        lowerMessage.includes('combustível') || 
        lowerMessage.includes('combustivel') ||
        lowerMessage.includes('gasolina')) {
      
      // Detecta período específico
      const isHoje = lowerMessage.includes('hoje')
      const isOntem = lowerMessage.includes('ontem')
      const isSemana = lowerMessage.includes('semana')
      
      let startDate = startOfMonthStr
      let endDate: string | undefined
      let periodoTexto = 'este mês'
      
      if (isHoje) {
        // Gastos de HOJE - usa timezone do Brasil corretamente
        startDate = getTodayStartInBrazil()
        endDate = getTodayEndInBrazil()
        periodoTexto = 'hoje'
        console.log('handleQuery - Buscando gastos de HOJE (combustível):', { 
          startDate, 
          endDate,
          nowBrazil: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
        })
      } else if (isOntem) {
        // Gastos de ONTEM - usa timezone do Brasil corretamente
        startDate = getYesterdayStartInBrazil()
        endDate = getYesterdayEndInBrazil()
        periodoTexto = 'ontem'
        console.log('handleQuery - Buscando gastos de ONTEM (combustível):', { 
          startDate, 
          endDate,
          nowBrazil: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
        })
      } else if (isSemana) {
        const semanaInicio = new Date(now)
        semanaInicio.setDate(semanaInicio.getDate() - 7)
        semanaInicio.setHours(0, 0, 0, 0)
        startDate = semanaInicio.toISOString().split('T')[0]
        endDate = now.toISOString().split('T')[0]
        periodoTexto = 'esta semana'
      }
      
      // Busca APENAS DESPESAS
      const registrosSub = await getDespesasRecords(tenantId, startDate, endDate)
      const combustivelRecords = registrosSub.filter(r => 
        r.subcategory === 'Combustível' || 
        (r.category === 'Transporte' && (r.subcategory?.toLowerCase().includes('combust') || r.description.toLowerCase().includes('gasolina')))
      )
      
      if (combustivelRecords.length > 0) {
        const total = combustivelRecords.reduce((sum, r) => sum + Number(r.amount), 0)
        
        return {
          success: true,
          message: `⛽ Gastos com Combustível (${periodoTexto}):\n\n💰 Total: R$ ${total.toFixed(2)}\n📝 Registros: ${combustivelRecords.length}\n📊 Média: R$ ${(total / combustivelRecords.length).toFixed(2)} por abastecimento\n\n${combustivelRecords.slice(0, 5).map(r => 
            `• ${r.description} - R$ ${Number(r.amount).toFixed(2)} (${new Date(r.date).toLocaleDateString('pt-BR')})`
          ).join('\n')}`,
          data: { registros: combustivelRecords, total },
        }
      }
      
      // Se não encontrou por subcategoria, busca por categoria Transporte
      const transportRecords = registrosSub.filter(r => r.category === 'Transporte')
      
      if (transportRecords.length > 0) {
        const total = transportRecords.reduce((sum, r) => sum + Number(r.amount), 0)
        return {
          success: true,
          message: `🚗 Gastos com Transporte (${periodoTexto}):\n\n💰 Total: R$ ${total.toFixed(2)}\n📝 Registros: ${transportRecords.length}\n\n${transportRecords.slice(0, 5).map(r => 
            `• ${r.description} - R$ ${Number(r.amount).toFixed(2)}${r.subcategory ? ` (${r.subcategory})` : ''}`
          ).join('\n')}`,
          data: { registros: transportRecords, total },
        }
      }
    }

    // Consulta por categoria específica
    if (extractedData?.queryCategory) {
      // Detecta período específico
      const isHoje = lowerMessage.includes('hoje')
      const isOntem = lowerMessage.includes('ontem')
      const isSemana = lowerMessage.includes('semana')
      
      let startDate = startOfMonthStr
      let endDate: string | undefined
      let periodoTexto = 'este mês'
      
      if (isHoje) {
        // Gastos de HOJE - usa timezone do Brasil corretamente
        startDate = getTodayStartInBrazil()
        endDate = getTodayEndInBrazil()
        periodoTexto = 'hoje'
        console.log('handleQuery - Buscando gastos de HOJE (categoria):', { 
          startDate, 
          endDate,
          nowBrazil: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
        })
      } else if (isOntem) {
        // Gastos de ONTEM - usa timezone do Brasil corretamente
        startDate = getYesterdayStartInBrazil()
        endDate = getYesterdayEndInBrazil()
        periodoTexto = 'ontem'
        console.log('handleQuery - Buscando gastos de ONTEM (categoria):', { 
          startDate, 
          endDate,
          nowBrazil: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
        })
      } else if (isSemana) {
        const semanaInicio = new Date(now)
        semanaInicio.setDate(semanaInicio.getDate() - 7)
        semanaInicio.setHours(0, 0, 0, 0)
        startDate = semanaInicio.toISOString().split('T')[0]
        endDate = now.toISOString().split('T')[0]
        periodoTexto = 'esta semana'
      }
      
      // Busca APENAS DESPESAS da categoria
      const registros = await getDespesasRecords(tenantId, startDate, endDate)
      const categoryRecords = registros.filter(r => r.category === extractedData.queryCategory)
      const total = categoryRecords.reduce((sum, r) => sum + Number(r.amount), 0)
      
      return {
        success: true,
        message: `📊 Gastos em ${extractedData.queryCategory} (${periodoTexto}):\n\n💰 Total: R$ ${total.toFixed(2)}\n📝 Registros: ${categoryRecords.length}\n\n${categoryRecords.slice(0, 5).map(r => 
          `• ${r.description} - R$ ${Number(r.amount).toFixed(2)}${r.subcategory ? ` (${r.subcategory})` : ''}`
        ).join('\n')}`,
        data: { registros: categoryRecords, total },
      }
    }

    // Consulta geral de gastos/despesas
    // IMPORTANTE: Detecta período específico (hoje, ontem, semana, mês)
    if (lowerMessage.includes('gasto') || lowerMessage.includes('gastei') || 
        (lowerMessage.includes('quanto') && (lowerMessage.includes('gastei') || lowerMessage.includes('gasto')))) {
      
      // Detecta período específico na pergunta
      // IMPORTANTE: Verifica "só hoje", "apenas hoje", "hoje" para garantir detecção correta
      const isHoje = lowerMessage.includes('hoje') || lowerMessage.includes('só hoje') || lowerMessage.includes('apenas hoje')
      const isOntem = lowerMessage.includes('ontem') || lowerMessage.includes('só ontem') || lowerMessage.includes('apenas ontem')
      const isSemana = lowerMessage.includes('semana') && !lowerMessage.includes('mês') && !lowerMessage.includes('mes')
      const isMes = lowerMessage.includes('mês') || lowerMessage.includes('mes') || lowerMessage.includes('mensal')
      
      console.log('handleQuery - Detecção de período:', { isHoje, isOntem, isSemana, isMes, lowerMessage })
      
      let startDate: string
      let endDate: string | undefined
      let periodoTexto = 'este mês'
      
      if (isHoje) {
        // Gastos de HOJE - usa timezone do Brasil corretamente
        startDate = getTodayStartInBrazil()
        endDate = getTodayEndInBrazil()
        periodoTexto = 'hoje'
        console.log('handleQuery - Buscando gastos de HOJE:', { 
          startDate, 
          endDate, 
          nowBrazil: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
          nowUTC: now.toISOString()
        })
      } else if (isOntem) {
        // Gastos de ONTEM - usa timezone do Brasil corretamente
        startDate = getYesterdayStartInBrazil()
        endDate = getYesterdayEndInBrazil()
        periodoTexto = 'ontem'
        console.log('handleQuery - Buscando gastos de ONTEM:', { 
          startDate, 
          endDate,
          nowBrazil: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
          nowUTC: now.toISOString()
        })
      } else if (isSemana) {
        // Gastos da SEMANA (últimos 7 dias)
        const semanaInicio = new Date(now)
        semanaInicio.setDate(semanaInicio.getDate() - 7)
        semanaInicio.setHours(0, 0, 0, 0)
        startDate = semanaInicio.toISOString().split('T')[0]
        endDate = now.toISOString().split('T')[0]
        periodoTexto = 'esta semana'
      } else if (isMes) {
        // Gastos do MÊS
        startDate = startOfMonthStr
        periodoTexto = 'este mês'
      } else {
        // Se não especificou período, mas perguntou sobre gastos, assume ESTE MÊS
        // (mais útil para perguntas genéricas como "quanto gastei?")
        startDate = startOfMonthStr
        periodoTexto = 'este mês'
      }
      
      // Busca APENAS DESPESAS (não receitas)
      const registros = await getDespesasRecords(tenantId, startDate, endDate)
      const total = registros.reduce((sum, r) => sum + Number(r.amount), 0)

      // Se não há gastos no período, retorna mensagem simples
      if (registros.length === 0) {
        return {
          success: true,
          message: `💰 Você não teve despesas ${periodoTexto === 'hoje' ? 'hoje' : periodoTexto === 'ontem' ? 'ontem' : periodoTexto === 'esta semana' ? 'nesta semana' : 'este mês'}.`,
          data: { registros: [], total: 0 },
        }
      }

      // Para perguntas específicas (hoje, ontem), retorna resposta mais simples
      if (isHoje || isOntem) {
        let response = `💰 Seus gastos ${periodoTexto}:\n\n`
        response += `Total: R$ ${total.toFixed(2)}\n`
        response += `Registros: ${registros.length}\n\n`
        response += `Detalhes:\n${registros.map(r => 
          `• ${r.description} - R$ ${Number(r.amount).toFixed(2)} (${r.category}${r.subcategory ? ` - ${r.subcategory}` : ''})`
        ).join('\n')}`
        
        return {
          success: true,
          message: response,
          data: { registros, total },
        }
      }

      // Para períodos maiores (semana, mês), mostra resumo com categorias
      const porCategoria: Record<string, number> = {}
      registros.forEach(r => {
        porCategoria[r.category] = (porCategoria[r.category] || 0) + Number(r.amount)
      })

      let response = `📊 Seus gastos (${periodoTexto}):\n\n💰 Total: R$ ${total.toFixed(2)}\n📝 Registros: ${registros.length}\n\n`
      
      if (Object.keys(porCategoria).length > 0) {
        response += `Por categoria:\n`
        Object.entries(porCategoria)
          .sort(([, a], [, b]) => b - a)
          .forEach(([cat, valor]) => {
            response += `• ${cat}: R$ ${valor.toFixed(2)}\n`
          })
        response += `\n`
      }

      response += `Últimos gastos:\n${registros.slice(0, 5).map(r => 
        `• ${r.description} - R$ ${Number(r.amount).toFixed(2)} (${r.category}${r.subcategory ? ` - ${r.subcategory}` : ''})`
      ).join('\n')}`

      return {
        success: true,
        message: response,
        data: { registros, total },
      }
    }

    // Nota: Consultas de compromissos já são tratadas no bloco anterior (linhas 608-710)
    // Este código não será alcançado devido à verificação anterior, mas mantido como fallback

    return {
      success: true,
      message: 'Não entendi o que você quer consultar. Pode ser mais específico?',
    }
  } catch (error) {
    throw error
  }
}

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
