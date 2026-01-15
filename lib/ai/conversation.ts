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
 * Agora com processamento mais inteligente e conversacional
 */
export async function processMessage(
  message: string,
  context: ConversationContext
): Promise<string> {
  try {
    validateOpenAIConfig()
    
    // Carrega contexto recente (aumenta para 10 para ter mais contexto)
    const recentConversations = context.recentMessages || 
      await getRecentConversations(context.tenantId, 10)

    // Usa resumos fornecidos ou gera novos
    const financeiroSummary = context.financeiroSummary || 
      await getFinanceiroSummary(context.tenantId)
    
    const compromissosSummary = context.compromissosSummary || 
      await getCompromissosSummary(context.tenantId)

    // Monta o prompt com contexto mais rico
    const contextPrompt = getContextPrompt(
      recentConversations.map(c => ({
        role: c.role,
        message: c.message,
      })),
      financeiroSummary,
      compromissosSummary
    )

    // Adiciona instruções específicas sobre lembretes automáticos
    const reminderInfo = `\n\nINFORMAÇÃO IMPORTANTE SOBRE LEMBRETES:
O sistema já envia lembretes automáticos para TODOS os compromissos:
- ⏰ 1 hora antes
- ⏰ 30 minutos antes  
- ⏰ 10 minutos antes

Se o usuário pedir para lembrar de um compromisso, EXPLIQUE que o sistema já faz isso automaticamente.
NÃO crie um novo compromisso só para lembrete.`

    // Chama a API do OpenAI
    const model = process.env.OPENAI_MODEL || 'gpt-5.2'
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPT + reminderInfo,
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
      temperature: 0.8, // Aumenta um pouco para respostas mais naturais
      max_tokens: 600, // Aumenta para respostas mais completas
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

import { SemanticState, inheritContext, saveLastValidState } from './semantic-state'

/**
 * Analisa a intenção do usuário e retorna estado semântico completo
 * GPT conversa. Sistema valida. Sistema executa.
 */
export async function analyzeIntention(
  message: string,
  recentConversations?: Array<{ role: string; message: string }>
): Promise<SemanticState> {
  try {
    // Monta contexto completo da conversa para o GPT entender
    const conversationContext = recentConversations && recentConversations.length > 0
      ? recentConversations.slice(-10).map(c => `${c.role === 'user' ? 'Usuário' : 'Assistente'}: ${c.message}`).join('\n')
      : ''
    
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-5.2',
      messages: [
        {
          role: 'system',
          content: `Você é um ANALISADOR SEMÂNTICO especializado em entender conversas sobre gestão financeira e agendamento.

SEU PAPEL:
- Você entende a conversa COMPLETA, incluindo contexto de mensagens anteriores
- Você identifica perguntas de continuação (ex: "e hoje?", "e mercado?") e usa o contexto para entender
- Você retorna um ESTADO SEMÂNTICO ÚNICO estruturado em JSON
- Você NÃO responde texto ao usuário
- Você NÃO executa ações
- Você NÃO acessa banco de dados
- Se não tiver certeza, retorne confidence < 0.7 e deixe o sistema perguntar
- NUNCA invente dados - se não conseguir extrair, deixe o campo null ou undefined

${conversationContext ? `
CONTEXTO DA CONVERSA RECENTE:
${conversationContext}

IMPORTANTE - PERGUNTAS DE CONTINUAÇÃO:
Se a mensagem atual é curta (ex: "e hoje?", "e mercado?", "e cartão?"), use o contexto da conversa anterior para entender a intenção completa.
Exemplo: Se o usuário perguntou "quanto gastei ontem?" e depois pergunta "e mercado?", interprete como "quanto gastei de mercado ontem?".
` : ''}

Analise a mensagem do usuário e retorne um ESTADO SEMÂNTICO COMPLETO.

REGRA CRÍTICA - SEPARAÇÃO DE DOMÍNIOS:
- Financeiro: gastos, receitas, despesas (register_expense, register_revenue, query sobre gastos)
- Agenda: compromissos, reuniões, eventos (create_appointment, query sobre compromissos)
- NUNCA misture domínios
- "gastei", "gasto", "despesa" → SEMPRE domínio financeiro
- "compromisso", "agenda", "reunião" → SEMPRE domínio agenda

Responda APENAS com JSON no formato:
{
  "intent": "register_expense" | "register_revenue" | "create_appointment" | "query" | "report" | "chat",
  "domain": "financeiro" | "agenda" | "geral" | null,
  "periodo": "hoje" | "ontem" | "amanhã" | "semana" | "mês" | "ano" | null,
  "categoria": string | null,
  "subcategoria": string | null,
  "queryType": "gasto" | "compromissos" | "categoria" | "agenda" | null,
  "amount": number | null,
  "title": string | null,
  "scheduled_at": string (ISO 8601) | null,
  "description": string | null,
  "confidence": 0.0-1.0,
  "needsClarification": boolean,
  "clarificationMessage": string | null
}

INTENÇÕES (intent):
- register_expense: registrar gasto/despesa
- register_revenue: registrar receita/entrada
- create_appointment: criar compromisso/agendamento
- query: consultar informações existentes
- report: relatório completo
- chat: conversa geral

DOMÍNIOS (domain):
- financeiro: gastos, receitas, despesas
- agenda: compromissos, reuniões, eventos
- geral: conversa sem domínio específico

PERÍODOS (periodo):
- hoje, ontem, amanhã, semana, mês, ano
- Se não mencionar, deixe null (sistema herdará do contexto se necessário)

QUERY TYPES (queryType):
- gasto: consulta sobre gastos/despesas
- compromissos: consulta sobre compromissos/agenda
- categoria: consulta sobre categoria específica

IMPORTANTE - DISTINÇÃO ENTRE QUERY E REPORT:
- query: perguntas específicas sobre dados existentes (ex: "quantos compromissos tenho?", "quanto gastei?", "quais são meus compromissos amanhã?")
- report: pedido de relatório completo ou resumo geral (ex: "me mostre um relatório", "resumo dos meus gastos", "relatório financeiro")

IMPORTANTE - INTERPRETAÇÃO DE PERÍODOS EM CONSULTAS:
Quando o usuário fizer uma pergunta sobre gastos/receitas, SEMPRE identifique o período mencionado:
- "quanto gastei HOJE?" → queryPeriod: "hoje" (NÃO "mês")
- "quanto gastei ONTEM?" → queryPeriod: "ontem"
- "quanto gastei esta SEMANA?" → queryPeriod: "semana"
- "quanto gastei este MÊS?" → queryPeriod: "mês"
- Se não mencionar período específico, mas perguntar "quanto gastei?", assuma "hoje" (mais útil)
- NUNCA assuma "mês" quando o usuário perguntar sobre "hoje" ou "ontem"
- Extraia queryPeriod corretamente para que o sistema filtre os dados pelo período correto

IMPORTANTE - DISTINÇÃO CRÍTICA ENTRE GASTOS E COMPROMISSOS:
- Se a mensagem menciona "gastei", "gasto", "gastar", "despesa", "paguei" → SEMPRE é sobre GASTOS, NUNCA sobre compromissos
- "quantos eu gastei?" → query sobre GASTOS (queryType: "gasto" ou "despesa"), NÃO sobre compromissos
- "quantos eu gastei ontem?" → query sobre GASTOS no período "ontem", NÃO sobre compromissos
- "quanto gastei hoje?" → query sobre GASTOS no período "hoje", NÃO sobre compromissos
- Só use queryType: "compromissos" se a mensagem EXPLICITAMENTE menciona "compromisso", "agenda", "reunião" E NÃO menciona "gastei", "gasto", "despesa"

IMPORTANTE - CONSULTAS SOBRE COMPROMISSOS:
Se o usuário perguntar sobre compromissos (ex: "quantos compromissos tenho?", "quais são meus compromissos amanhã?", "tenho compromissos hoje?"), SEMPRE use intenção "query" com:
- queryType: "compromissos" ou "agenda"
- queryPeriod: período mencionado (hoje, amanhã, semana, mês, etc)
- IMPORTANTE: Se a mensagem menciona "gastei", "gasto", "despesa", "paguei", NÃO é sobre compromissos, é sobre gastos!

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
- "12h" = hoje às 12:00 (use a data de HOJE)
- "hoje às 18h" = HOJE às 18:00 (use a data de HOJE, não amanhã)
- "amanhã às 10h" = amanhã às 10:00 (calcule a data de amanhã corretamente)
- "tenho reunião amanhã às 9h" = amanhã às 09:00 (calcule a data de amanhã)
- "segunda às 14h" = próxima segunda-feira às 14:00
- Sempre extraia título (ex: "reunião", "consulta", "compromisso")
- scheduled_at deve estar em formato ISO 8601 completo com timezone UTC (ex: "2024-01-16T09:00:00.000Z")
- Se mencionar "hoje", use a data de HOJE (não amanhã, não outro dia)
- Se mencionar "amanhã", calcule a data de amanhã baseado na data atual
- SEMPRE retorne scheduled_at, mesmo que tenha que inferir
- IMPORTANTE: Quando o usuário diz "hoje às Xh", o scheduled_at deve ser para HOJE, não para outro dia a data

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
- "quanto gastei hoje?" -> query, queryType: "gasto" ou "despesa", queryPeriod: "hoje" (NÃO "compromissos")
- "quantos eu gastei ontem?" -> query, queryType: "gasto" ou "despesa", queryPeriod: "ontem" (NÃO "compromissos")
- "quanto gastei esta semana?" -> query, queryType: "gasto" ou "despesa", queryPeriod: "semana" (NÃO "compromissos")

EXEMPLOS DE PERGUNTAS DE CONTINUAÇÃO (usar contexto anterior):
- Contexto: "quantos gastei ontem?" → Nova mensagem: "e hoje?" → query, queryType: "gasto", queryPeriod: "hoje"
- Contexto: "quanto gastei hoje?" → Nova mensagem: "e ontem?" → query, queryType: "gasto", queryPeriod: "ontem"
- Contexto: "quantos compromissos tenho amanhã?" → Nova mensagem: "e hoje?" → query, queryType: "compromissos", queryPeriod: "hoje"
- IMPORTANTE: Quando a mensagem é curta e parece continuação (ex: "e hoje?", "e ontem?"), SEMPRE use o contexto da conversa anterior para entender a intenção completa
- "quantos compromissos tenho amanhã?" -> query, queryType: "compromissos", queryPeriod: "amanhã"
- "quais são meus compromissos hoje?" -> query, queryType: "compromissos", queryPeriod: "hoje"
- "tenho algum compromisso hoje?" -> query, queryType: "compromissos", queryPeriod: "hoje"
- "meus compromissos da semana" -> query, queryType: "compromissos", queryPeriod: "semana"
- "reunião 12h" -> create_appointment, title: "Reunião", scheduled_at: "2024-01-15T12:00:00.000Z" (use data de HOJE)
- "tenho reunião amanhã às 10h" -> create_appointment, title: "Reunião", scheduled_at: "2024-01-16T10:00:00.000Z"
- "marcar consulta médica segunda às 14h" -> create_appointment, title: "Consulta médica", scheduled_at: "2024-01-20T14:00:00.000Z"
- "agendar reunião" -> create_appointment, title: "Reunião", scheduled_at: (use data/hora atual + 1 hora como padrão)

REGRA CRÍTICA - PERGUNTAS SOBRE COMPROMISSOS:
Se a mensagem contém palavras como "compromissos", "agenda", "reuniões", "eventos" combinadas com perguntas (quantos, quais, tenho, tem), SEMPRE use intenção "query" com queryType: "compromissos".
NUNCA use "report" para perguntas sobre compromissos.

REGRA CRÍTICA - PERGUNTAS SOBRE GASTOS vs COMPROMISSOS:
- Se a mensagem contém "gastei", "gasto", "gastar", "despesa", "paguei" → SEMPRE é sobre GASTOS, NUNCA sobre compromissos
- "quantos eu gastei?" → queryType: "gasto" ou "despesa" (NÃO "compromissos")
- "quanto gastei ontem?" → queryType: "gasto" ou "despesa", queryPeriod: "ontem" (NÃO "compromissos")
- "quantos eu gastei hoje?" → queryType: "gasto" ou "despesa", queryPeriod: "hoje" (NÃO "compromissos")
- Só use queryType: "compromissos" se a mensagem EXPLICITAMENTE menciona "compromisso", "agenda", "reunião" E NÃO menciona palavras de gasto

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
      return {
        intent: 'chat',
        confidence: 0.5,
        needsClarification: true,
        clarificationMessage: 'Não consegui entender sua mensagem. Pode reformular?'
      }
    }

    const parsed = JSON.parse(response)
    
    // Constrói estado semântico completo
    const semanticState: SemanticState = {
      intent: parsed.intent || 'chat',
      domain: parsed.domain || null,
      periodo: parsed.periodo || null,
      categoria: parsed.categoria || null,
      subcategoria: parsed.subcategoria || null,
      queryType: parsed.queryType || null,
      amount: parsed.amount || null,
      title: parsed.title || null,
      scheduled_at: parsed.scheduled_at || null,
      description: parsed.description || null,
      confidence: parsed.confidence || 0.5,
      needsClarification: parsed.needsClarification || false,
      clarificationMessage: parsed.clarificationMessage || null
    }
    
    // Aplica herança de contexto
    const stateWithContext = inheritContext(semanticState)
    
    // Salva estado válido se confidence >= 0.7
    if (stateWithContext.confidence >= 0.7) {
      saveLastValidState(stateWithContext)
    }
    
    return stateWithContext
  } catch (error) {
    console.error('Erro ao analisar intenção:', error)
    return {
      intent: 'chat',
      confidence: 0.5,
      needsClarification: true,
      clarificationMessage: 'Erro ao processar mensagem. Pode tentar novamente?'
    }
  }
}
