/**
 * Processa ações identificadas pela IA e executa no sistema
 */

import { analyzeIntention } from './conversation'
import { createFinanceiroRecord } from '../services/financeiro'
import { createCompromissoRecord } from '../services/compromissos'
import { gerarRelatorioFinanceiro, gerarResumoMensal } from '../services/relatorios'
import { getFinanceiroRecords } from '../services/financeiro'
import { getCompromissosRecords, getTodayCompromissos } from '../services/compromissos'
import { ValidationError } from '../utils/errors'

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

    switch (intention) {
      case 'register_expense':
        return await handleRegisterExpense(extractedData, tenantId)

      case 'create_appointment':
        return await handleCreateAppointment(extractedData, tenantId)

      case 'query':
        return await handleQuery(message, tenantId)

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
    const description = data.description || 'Gasto'
    const category = data.category || 'Outros'
    const date = data.date || new Date().toISOString().split('T')[0]

    // Cria o registro
    const record = await createFinanceiroRecord({
      tenantId,
      amount,
      description,
      category,
      date,
    })

    return {
      success: true,
      message: `✅ Gasto registrado com sucesso!\n\n💰 Valor: R$ ${amount.toFixed(2)}\n📝 Descrição: ${description}\n🏷️ Categoria: ${category}\n📅 Data: ${new Date(date).toLocaleDateString('pt-BR')}`,
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
  tenantId: string
): Promise<ActionResult> {
  try {
    if (!data?.title) {
      return {
        success: false,
        message: 'Preciso saber o título do compromisso. O que é?',
      }
    }

    if (!data?.scheduled_at) {
      return {
        success: false,
        message: 'Preciso saber quando será. Qual data e horário?',
      }
    }

    const compromisso = await createCompromissoRecord({
      tenantId,
      title: data.title,
      scheduledAt: data.scheduled_at,
      description: data.description,
    })

    return {
      success: true,
      message: `✅ Compromisso agendado!\n\n📅 ${data.title}\n🕐 ${new Date(data.scheduled_at).toLocaleString('pt-BR')}${data.description ? `\n📝 ${data.description}` : ''}`,
      data: compromisso,
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
 * Consulta informações
 */
async function handleQuery(
  message: string,
  tenantId: string
): Promise<ActionResult> {
  try {
    const lowerMessage = message.toLowerCase()

    // Consulta de gastos
    if (lowerMessage.includes('gasto') || lowerMessage.includes('gastei')) {
      const registros = await getFinanceiroRecords(tenantId)
      const total = registros.reduce((sum, r) => sum + Number(r.amount), 0)

      return {
        success: true,
        message: `📊 Seus gastos:\n\n💰 Total: R$ ${total.toFixed(2)}\n📝 Registros: ${registros.length}\n\n${registros.slice(0, 5).map(r => 
          `• ${r.description} - R$ ${Number(r.amount).toFixed(2)} (${r.category})`
        ).join('\n')}`,
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
