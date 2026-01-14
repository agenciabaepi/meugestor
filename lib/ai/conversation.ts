import { openai, validateOpenAIConfig } from './openai'
import { SYSTEM_PROMPT, getContextPrompt } from './prompts'
import { getRecentConversations } from '../db/queries'
import {
  getFinanceiroRecords,
  calculateTotalSpent,
} from '../services/financeiro'
import { getCompromissosRecords, getTodayCompromissos } from '../services/compromissos'
import { logUsage, calculateOpenAICost } from '../utils/cost-tracker'
import type { Conversation } from '../db/types'

export interface ConversationContext {
  tenantId: string
  recentMessages?: Conversation[]
  financeiroSummary?: string
  compromissosSummary?: string
}

/**
 * Processa uma mensagem do usuário e gera uma resposta usando GPT-4o
 */
export async function processMessage(
  message: string,
  context: ConversationContext
): Promise<string> {
  try {
    validateOpenAIConfig()
    // Carrega contexto recente
    const recentConversations = context.recentMessages || 
      await getRecentConversations(context.tenantId, 5)

    // Usa resumos fornecidos ou gera novos
    const financeiroSummary = context.financeiroSummary || 
      await getFinanceiroSummary(context.tenantId)
    
    const compromissosSummary = context.compromissosSummary || 
      await getCompromissosSummary(context.tenantId)

    // Monta o prompt com contexto
    const contextPrompt = getContextPrompt(
      recentConversations.map(c => ({
        role: c.role,
        message: c.message,
      })),
      financeiroSummary,
      compromissosSummary
    )

    // Chama a API do OpenAI
    const model = process.env.OPENAI_MODEL || 'gpt-4o'
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
        },
        {
          role: 'system',
          content: contextPrompt,
        },
        {
          role: 'user',
          content: message,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    })

    const response = completion.choices[0]?.message?.content || 
      'Desculpe, não consegui processar sua mensagem.'

    // Registra uso e custo
    const inputTokens = completion.usage?.prompt_tokens || 0
    const outputTokens = completion.usage?.completion_tokens || 0
    const cost = calculateOpenAICost(model, inputTokens, outputTokens)

    await logUsage({
      tenantId: context.tenantId,
      service: 'openai',
      tokensUsed: inputTokens + outputTokens,
      cost,
      metadata: {
        model,
        inputTokens,
        outputTokens,
      },
    })

    return response
  } catch (error) {
    console.error('Erro ao processar mensagem com IA:', error)
    return 'Desculpe, ocorreu um erro ao processar sua mensagem. Tente novamente em alguns instantes.'
  }
}

/**
 * Gera resumo financeiro para contexto
 */
async function getFinanceiroSummary(tenantId: string): Promise<string | undefined> {
  try {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    
    const totalMes = await calculateTotalSpent(
      tenantId,
      startOfMonth.toISOString().split('T')[0]
    )

    const registros = await getFinanceiroRecords(tenantId, startOfMonth.toISOString().split('T')[0])

    if (registros.length === 0) {
      return undefined
    }

    return `Total gasto este mês: R$ ${totalMes.toFixed(2)}
Registros: ${registros.length}
Últimos gastos: ${registros.slice(0, 3).map(r => 
  `${r.description} - R$ ${Number(r.amount).toFixed(2)}`
).join(', ')}`
  } catch (error) {
    console.error('Erro ao gerar resumo financeiro:', error)
    return undefined
  }
}

/**
 * Gera resumo de compromissos para contexto
 */
async function getCompromissosSummary(tenantId: string): Promise<string | undefined> {
  try {
    const hoje = await getTodayCompromissos(tenantId)
    const proximos = await getCompromissosRecords(
      tenantId,
      new Date().toISOString()
    )

    if (hoje.length === 0 && proximos.length === 0) {
      return undefined
    }

    let summary = ''

    if (hoje.length > 0) {
      summary += `Hoje: ${hoje.map(c => c.title).join(', ')}\n`
    }

    if (proximos.length > 0) {
      summary += `Próximos: ${proximos.slice(0, 3).map(c => 
        `${c.title} (${new Date(c.scheduled_at).toLocaleDateString('pt-BR')})`
      ).join(', ')}`
    }

    return summary || undefined
  } catch (error) {
    console.error('Erro ao gerar resumo de compromissos:', error)
    return undefined
  }
}

/**
 * Analisa a intenção do usuário na mensagem
 */
export async function analyzeIntention(
  message: string
): Promise<{
  intention: 'register_expense' | 'create_appointment' | 'query' | 'report' | 'chat'
  confidence: number
  extractedData?: any
}> {
  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `Analise a mensagem do usuário e identifique a intenção. 
Responda APENAS com JSON no formato:
{
  "intention": "register_expense" | "create_appointment" | "query" | "report" | "chat",
  "confidence": 0.0-1.0,
  "extractedData": {
    "amount": número se mencionado,
    "category": categoria se mencionada,
    "description": descrição se mencionada,
    "date": data se mencionada,
    "title": título se for compromisso,
    "scheduled_at": data/hora se for compromisso
  }
}

INTENÇÕES:
- register_expense: usuário quer registrar um gasto
- create_appointment: usuário quer criar um compromisso
- query: usuário quer consultar informações
- report: usuário quer um relatório
- chat: conversa geral sem ação específica`,
        },
        {
          role: 'user',
          content: message,
        },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    })

    const response = completion.choices[0]?.message?.content
    if (!response) {
      return { intention: 'chat', confidence: 0.5 }
    }

    const parsed = JSON.parse(response)
    return {
      intention: parsed.intention || 'chat',
      confidence: parsed.confidence || 0.5,
      extractedData: parsed.extractedData,
    }
  } catch (error) {
    console.error('Erro ao analisar intenção:', error)
    return { intention: 'chat', confidence: 0.5 }
  }
}
