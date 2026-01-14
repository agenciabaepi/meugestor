/**
 * Processa ações identificadas pela IA e executa no sistema
 */

import { analyzeIntention } from './conversation'
import { createFinanceiroRecord, getFinanceiroBySubcategoryRecords, getFinanceiroByTagsRecords, calculateTotalByCategory } from '../services/financeiro'
import { createCompromissoRecord } from '../services/compromissos'
import { gerarRelatorioFinanceiro, gerarResumoMensal } from '../services/relatorios'
import { getFinanceiroRecords } from '../services/financeiro'
import { getCompromissosRecords, getTodayCompromissos } from '../services/compromissos'
import { ValidationError } from '../utils/errors'
import { categorizeExpense, extractTags } from '../services/categorization'
import { parseScheduledAt, extractAppointmentFromMessage } from '../utils/date-parser'

export interface ActionResult {
  success: boolean
  message: string
  data?: any
}

/**
 * Processa uma mensagem, identifica a intenção e executa a ação correspondente
 */
export async function processAction(
  message: string,
  tenantId: string
): Promise<ActionResult> {
  try {
    // Analisa a intenção
    const { intention, extractedData } = await analyzeIntention(message)

    console.log('Intenção detectada:', intention, 'Dados extraídos:', extractedData)

    switch (intention) {
      case 'register_expense':
        return await handleRegisterExpense(extractedData, tenantId)

      case 'create_appointment':
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
    console.error('Erro ao processar ação:', error)
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erro desconhecido',
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
 * Cria um compromisso
 */
async function handleCreateAppointment(
  data: any,
  tenantId: string,
  originalMessage?: string
): Promise<ActionResult> {
  try {
    let title = data?.title
    let scheduledAt = data?.scheduled_at ? parseScheduledAt(data.scheduled_at) : null

    // Se não tem dados suficientes, tenta extrair da mensagem original
    if ((!title || !scheduledAt) && originalMessage) {
      const extracted = extractAppointmentFromMessage(originalMessage)
      if (!title && extracted.title) {
        title = extracted.title
      }
      if (!scheduledAt && extracted.scheduledAt) {
        scheduledAt = extracted.scheduledAt
      }
    }

    // Se ainda não tem título, usa padrão
    if (!title) {
      title = data?.title || 'Compromisso'
    }

    // Se ainda não tem data/hora, tenta processar o scheduled_at original
    if (!scheduledAt && data?.scheduled_at) {
      scheduledAt = parseScheduledAt(data.scheduled_at)
    }

    // Se ainda não tem data/hora, retorna erro
    if (!scheduledAt) {
      return {
        success: false,
        message: 'Preciso saber quando será o compromisso. Qual data e horário? (ex: "reunião 12h", "amanhã às 10h")',
      }
    }

    // Valida se a data não é no passado
    const scheduledDate = new Date(scheduledAt)
    const now = new Date()
    if (scheduledDate < now) {
      return {
        success: false,
        message: 'Não é possível agendar compromissos no passado. Por favor, informe uma data/hora futura.',
      }
    }

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
      message: `✅ Compromisso agendado!\n\n📅 ${title}\n🕐 ${new Date(scheduledAt).toLocaleString('pt-BR')}${data?.description ? `\n📝 ${data.description}` : ''}`,
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
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfMonthStr = startOfMonth.toISOString().split('T')[0]

    // Consulta específica por categoria/subcategoria (ex: "quanto gasto de combustível?")
    if (extractedData?.queryType === 'categoria' || 
        lowerMessage.includes('combustível') || 
        lowerMessage.includes('combustivel') ||
        lowerMessage.includes('gasolina')) {
      
      // Tenta buscar por subcategoria primeiro
      const registrosSub = await getFinanceiroBySubcategoryRecords(
        tenantId,
        'Combustível',
        startOfMonthStr
      )
      
      if (registrosSub.length > 0) {
        const total = registrosSub.reduce((sum, r) => sum + Number(r.amount), 0)
        const avgPerMonth = total
        
        return {
          success: true,
          message: `⛽ Gastos com Combustível (este mês):\n\n💰 Total: R$ ${total.toFixed(2)}\n📝 Registros: ${registrosSub.length}\n📊 Média: R$ ${(total / registrosSub.length).toFixed(2)} por abastecimento\n\n${registrosSub.slice(0, 5).map(r => 
            `• ${r.description} - R$ ${Number(r.amount).toFixed(2)} (${new Date(r.date).toLocaleDateString('pt-BR')})`
          ).join('\n')}`,
          data: { registros: registrosSub, total },
        }
      }
      
      // Se não encontrou por subcategoria, busca por categoria Transporte
      const registros = await getFinanceiroRecords(tenantId, startOfMonthStr)
      const transportRecords = registros.filter(r => r.category === 'Transporte')
      
      if (transportRecords.length > 0) {
        const total = transportRecords.reduce((sum, r) => sum + Number(r.amount), 0)
        return {
          success: true,
          message: `🚗 Gastos com Transporte (este mês):\n\n💰 Total: R$ ${total.toFixed(2)}\n📝 Registros: ${transportRecords.length}\n\n${transportRecords.slice(0, 5).map(r => 
            `• ${r.description} - R$ ${Number(r.amount).toFixed(2)}${r.subcategory ? ` (${r.subcategory})` : ''}`
          ).join('\n')}`,
          data: { registros: transportRecords, total },
        }
      }
    }

    // Consulta por categoria específica
    if (extractedData?.queryCategory) {
      const total = await calculateTotalByCategory(
        tenantId,
        extractedData.queryCategory,
        startOfMonthStr
      )
      
      const registros = await getFinanceiroRecords(tenantId, startOfMonthStr)
      const categoryRecords = registros.filter(r => r.category === extractedData.queryCategory)
      
      return {
        success: true,
        message: `📊 Gastos em ${extractedData.queryCategory} (este mês):\n\n💰 Total: R$ ${total.toFixed(2)}\n📝 Registros: ${categoryRecords.length}\n\n${categoryRecords.slice(0, 5).map(r => 
          `• ${r.description} - R$ ${Number(r.amount).toFixed(2)}${r.subcategory ? ` (${r.subcategory})` : ''}`
        ).join('\n')}`,
        data: { registros: categoryRecords, total },
      }
    }

    // Consulta geral de gastos
    if (lowerMessage.includes('gasto') || lowerMessage.includes('gastei') || lowerMessage.includes('quanto')) {
      const registros = await getFinanceiroRecords(tenantId, startOfMonthStr)
      const total = registros.reduce((sum, r) => sum + Number(r.amount), 0)

      // Agrupa por categoria
      const porCategoria: Record<string, number> = {}
      registros.forEach(r => {
        porCategoria[r.category] = (porCategoria[r.category] || 0) + Number(r.amount)
      })

      let response = `📊 Seus gastos (este mês):\n\n💰 Total: R$ ${total.toFixed(2)}\n📝 Registros: ${registros.length}\n\n`
      
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

    // Consulta de compromissos
    if (lowerMessage.includes('compromisso') || lowerMessage.includes('agenda')) {
      const hoje = await getTodayCompromissos(tenantId)
      const proximos = await getCompromissosRecords(
        tenantId,
        new Date().toISOString()
      )

      let response = '📅 Seus compromissos:\n\n'

      if (hoje.length > 0) {
        response += `Hoje:\n${hoje.map(c => `• ${c.title}`).join('\n')}\n\n`
      }

      if (proximos.length > 0) {
        response += `Próximos:\n${proximos.slice(0, 5).map(c => 
          `• ${c.title} - ${new Date(c.scheduled_at).toLocaleString('pt-BR')}`
        ).join('\n')}`
      } else {
        response += 'Nenhum compromisso futuro agendado.'
      }

      return {
        success: true,
        message: response,
        data: { hoje, proximos },
      }
    }

    return {
      success: true,
      message: 'Não entendi o que você quer consultar. Pode ser mais específico?',
    }
  } catch (error) {
    throw error
  }
}

/**
 * Gera relatório
 */
async function handleReport(tenantId: string): Promise<ActionResult> {
  try {
    const relatorio = await gerarResumoMensal(tenantId)

    let message = `📊 Relatório Mensal\n\n`
    message += `💰 Total: R$ ${relatorio.total.toFixed(2)}\n`
    message += `📝 Registros: ${relatorio.totalRegistros}\n\n`

    if (Object.keys(relatorio.porCategoria).length > 0) {
      message += `Por categoria:\n`
      Object.entries(relatorio.porCategoria)
        .sort(([, a], [, b]) => b - a)
        .forEach(([cat, valor]) => {
          message += `• ${cat}: R$ ${Number(valor).toFixed(2)}\n`
        })
    }

    return {
      success: true,
      message,
      data: relatorio,
    }
  } catch (error) {
    throw error
  }
}
