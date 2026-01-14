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
 * Processa uma mensagem do usuário e gera uma resposta usando GPT-5.2
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
    const model = process.env.OPENAI_MODEL || 'gpt-5.2'
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
  intention: 'register_expense' | 'register_revenue' | 'create_appointment' | 'query' | 'report' | 'chat'
  confidence: number
  extractedData?: any
}> {
  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-5.2',
      messages: [
        {
          role: 'system',
          content: `Você é um assistente especializado em análise de mensagens financeiras e agendamento.

Analise a mensagem do usuário e identifique a intenção. Extraia TODAS as informações relevantes.

Responda APENAS com JSON no formato:
{
  "intention": "register_expense" | "register_revenue" | "create_appointment" | "query" | "report" | "chat",
  "confidence": 0.0-1.0,
  "extractedData": {
    "amount": número se mencionado (extrair valor numérico),
    "category": categoria principal se mencionada ou inferida,
    "description": descrição completa e detalhada (do gasto ou receita),
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
- register_expense: usuário quer registrar um gasto/despesa (ex: "gastei 50 reais de gasolina", "coloquei 50 reais de gasolina", "despesa de 100 reais", "paguei 30 no mercado")
- register_revenue: usuário quer registrar uma receita/entrada de dinheiro (ex: "recebi 2000 de salário", "entrada de 500 reais", "ganhei 1000", "recebi 10 reais de comissão")
- create_appointment: usuário quer criar um compromisso/agendamento (ex: "reunião 12h", "tenho reunião amanhã às 10h", "marcar consulta médica para segunda às 14h")
- query: usuário quer consultar informações (ex: "quanto gastei de combustível?", "quanto gasto por mês de gasolina?")
- report: usuário quer um relatório completo
- chat: conversa geral sem ação específica

DISTINÇÃO CRÍTICA ENTRE RECEITA E DESPESA:
Para identificar se é RECEITA (register_revenue) ou DESPESA (register_expense), analise as palavras-chave na mensagem:

PALAVRAS-CHAVE DE RECEITA (sempre use register_revenue):
- "recebi", "recebido", "receber"
- "ganhei", "ganho", "ganhar"
- "entrada", "entrou"
- "salário", "salario"
- "comissão", "comissao", "comissões"
- "dividendos", "dividendo"
- "rendimento", "rendimentos"
- "venda", "vendas"
- "freelance", "freela"
- "prolabore"
- "bônus", "bonus"
- "reembolso", "estorno", "devolução"
- "aluguel recebido"
- Qualquer verbo que indique RECEBER dinheiro

PALAVRAS-CHAVE DE DESPESA (sempre use register_expense):
- "gastei", "gasto", "gastar"
- "paguei", "pago", "pagar"
- "despesa", "despesas"
- "comprei", "compra", "comprar"
- "coloquei" (quando se refere a abastecer, pagar)
- "saída", "saiu"
- Qualquer verbo que indique PAGAR ou GASTAR dinheiro

REGRAS IMPORTANTES:
1. Se a mensagem contém palavras de RECEBER (recebi, ganhei, entrada), SEMPRE use register_revenue
2. Se a mensagem contém palavras de PAGAR/GASTAR (gastei, paguei, despesa), SEMPRE use register_expense
3. Quando houver dúvida, analise o contexto: se menciona "recebi", "ganhei" ou "entrada", é RECEITA
4. Exemplos claros de RECEITA: "recebi X", "ganhei X", "entrada de X", "X de comissão", "X de salário"

CATEGORIAS VÁLIDAS: Alimentação, Moradia, Saúde, Transporte, Educação, Lazer e Entretenimento, Compras Pessoais, Assinaturas e Serviços, Financeiro e Obrigações, Impostos e Taxas, Pets, Doações e Presentes, Trabalho e Negócios, Outros

SUBCATEGORIAS POR CATEGORIA:
- Alimentação: supermercado, feira, hortifruti, padaria, restaurante, lanchonete, delivery, café
- Moradia: aluguel, condomínio, IPTU, água, energia elétrica, gás, internet, manutenção e reparos
- Saúde: consulta médica, exames, medicamentos, farmácia, plano de saúde, dentista, psicólogo/terapia
- Transporte: combustível, transporte público, aplicativos (Uber/99), estacionamento, manutenção veicular, seguro do veículo, IPVA, pedágio
- Educação: mensalidade escolar, faculdade, cursos, livros, material escolar, plataformas online
- Lazer e Entretenimento: cinema, streaming, viagens, passeios, bares, eventos, shows
- Compras Pessoais: roupas, calçados, acessórios, cosméticos, higiene pessoal
- Assinaturas e Serviços: streaming, softwares, aplicativos, clubes, associações
- Financeiro e Obrigações: cartão de crédito, empréstimos, financiamentos, tarifas bancárias, juros, multas
- Impostos e Taxas: imposto de renda, taxas municipais, taxas estaduais, licenças
- Pets: ração, veterinário, medicamentos, banho e tosa
- Doações e Presentes: doações, presentes, contribuições
- Trabalho e Negócios: ferramentas de trabalho, serviços profissionais, marketing, contabilidade, hospedagem, sistemas
- Outros: emergências, imprevistos, ajustes, correções

IMPORTANTE PARA COMPROMISSOS:
- Se o usuário mencionar horário sem data, assuma que é HOJE
- "12h" = hoje às 12:00
- "amanhã às 10h" = amanhã às 10:00 (calcule a data de amanhã corretamente)
- "tenho reunião amanhã às 9h" = amanhã às 09:00 (calcule a data de amanhã)
- "segunda às 14h" = próxima segunda-feira às 14:00
- Sempre extraia título (ex: "reunião", "consulta", "compromisso")
- scheduled_at deve estar em formato ISO 8601 completo com timezone UTC (ex: "2024-01-16T09:00:00.000Z")
- Se mencionar "amanhã", calcule a data de amanhã baseado na data atual
- SEMPRE retorne scheduled_at, mesmo que tenha que inferir a data

EXEMPLOS DE RECEITAS (register_revenue):
- "recebi 2000 de salário" -> register_revenue, amount: 2000, description: "Salário", category: "Trabalho e Negócios"
- "recebi 10 reais de comissão" -> register_revenue, amount: 10, description: "Comissão", category: "Trabalho e Negócios"
- "recebi comissão de 50 reais" -> register_revenue, amount: 50, description: "Comissão", category: "Trabalho e Negócios"
- "entrada de 500 reais" -> register_revenue, amount: 500, description: "Entrada"
- "ganhei 1000" -> register_revenue, amount: 1000, description: "Ganho"
- "recebi 500 de freelance" -> register_revenue, amount: 500, description: "Freelance", category: "Trabalho e Negócios"
- "ganhei 200 de comissão" -> register_revenue, amount: 200, description: "Comissão", category: "Trabalho e Negócios"
- "recebi dividendos de 150" -> register_revenue, amount: 150, description: "Dividendos", category: "Financeiro e Obrigações"
- "entrada de 300 reais hoje" -> register_revenue, amount: 300, description: "Entrada"
- "ganhei 20 reais de presente" -> register_revenue, amount: 20, description: "Presente", category: "Doações e Presentes"

EXEMPLOS DE DESPESAS (register_expense):
- "coloquei 50 reais de gasolina" -> register_expense, amount: 50, description: "Gasolina", category: "Transporte"
- "gastei 30 no posto" -> register_expense, amount: 30, description: "Posto", category: "Transporte", establishment: "Posto"
- "paguei 100 no mercado" -> register_expense, amount: 100, description: "Mercado", category: "Alimentação"
- "despesa de 200 reais" -> register_expense, amount: 200, description: "Despesa"

EXEMPLOS DE OUTRAS INTENÇÕES:
- "quanto gasto por mês de combustível?" -> query, queryType: "categoria", queryCategory: "Transporte", queryPeriod: "mês"
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
