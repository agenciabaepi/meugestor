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
          content: `Você é um assistente especializado em análise de mensagens financeiras e agendamento.

Analise a mensagem do usuário e identifique a intenção. Extraia TODAS as informações relevantes.

Responda APENAS com JSON no formato:
{
  "intention": "register_expense" | "create_appointment" | "query" | "report" | "chat",
  "confidence": 0.0-1.0,
  "extractedData": {
    "amount": número se mencionado (extrair valor numérico),
    "category": categoria principal se mencionada ou inferida,
    "description": descrição completa e detalhada do gasto,
    "date": data se mencionada (formato YYYY-MM-DD),
    "establishment": nome do estabelecimento se mencionado,
    "paymentMethod": método de pagamento se mencionado (cartão, dinheiro, pix, etc),
    "title": título do compromisso se for agendamento (ex: "Reunião", "Consulta médica"),
    "scheduled_at": data/hora completa em ISO 8601 se for compromisso (ex: "2024-01-15T12:00:00.000Z"). Se mencionar apenas horário sem data, use a data de HOJE. Se mencionar "amanhã", use amanhã. Se mencionar dia da semana, calcule a próxima ocorrência,
    "description": descrição adicional do compromisso se houver,
    "queryType": tipo de consulta se for query (gasto, categoria, período, etc),
    "queryCategory": categoria específica se a consulta for sobre uma categoria,
    "queryPeriod": período se mencionado (mês, semana, ano, etc)
  }
}

INTENÇÕES:
- register_expense: usuário quer registrar um gasto (ex: "gastei 50 reais de gasolina", "coloquei 50 reais de gasolina")
- create_appointment: usuário quer criar um compromisso/agendamento (ex: "reunião 12h", "tenho reunião amanhã às 10h", "marcar consulta médica para segunda às 14h")
- query: usuário quer consultar informações (ex: "quanto gastei de combustível?", "quanto gasto por mês de gasolina?")
- report: usuário quer um relatório completo
- chat: conversa geral sem ação específica

CATEGORIAS VÁLIDAS: Alimentação, Transporte, Moradia, Saúde, Educação, Lazer, Outros

IMPORTANTE PARA COMPROMISSOS:
- Se o usuário mencionar horário sem data, assuma que é HOJE
- "12h" = hoje às 12:00
- "amanhã às 10h" = amanhã às 10:00
- "segunda às 14h" = próxima segunda-feira às 14:00
- Sempre extraia título (ex: "reunião", "consulta", "compromisso")
- scheduled_at deve estar em formato ISO 8601 completo (YYYY-MM-DDTHH:mm:ss)

EXEMPLOS:
- "coloquei 50 reais de gasolina" -> register_expense, amount: 50, description: "Gasolina", category: "Transporte"
- "quanto gasto por mês de combustível?" -> query, queryType: "categoria", queryCategory: "Transporte", queryPeriod: "mês"
- "gastei 30 no posto" -> register_expense, amount: 30, description: "Posto", category: "Transporte", establishment: "Posto"
- "reunião 12h" -> create_appointment, title: "Reunião", scheduled_at: "2024-01-15T12:00:00.000Z" (use data de HOJE)
- "tenho reunião amanhã às 10h" -> create_appointment, title: "Reunião", scheduled_at: "2024-01-16T10:00:00.000Z"
- "marcar consulta médica segunda às 14h" -> create_appointment, title: "Consulta médica", scheduled_at: "2024-01-20T14:00:00.000Z"
- "agendar reunião" -> create_appointment, title: "Reunião", scheduled_at: (use data/hora atual + 1 hora como padrão)

IMPORTANTE: 
- scheduled_at DEVE estar em formato ISO 8601 completo com timezone (ex: "2024-01-15T12:00:00.000Z")
- Se não houver data mencionada, use HOJE
- Se não houver horário mencionado, use o horário atual + 1 hora
- SEMPRE retorne scheduled_at, mesmo que tenha que inferir`,
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
