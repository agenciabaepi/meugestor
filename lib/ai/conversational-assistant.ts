/**
 * Assistente Conversacional Inteligente
 * 
 * Princípio: IA conversa naturalmente, entende intenção, confirma quando necessário,
 * e só então gera ação estruturada para o sistema executar.
 */

import { openai } from './openai'
import { SemanticState, inheritContext, saveLastValidState } from './semantic-state'
import { getLastAction, getLastAnyAction } from './action-history'

/**
 * Valida se os dados essenciais estão completos para salvar
 */
function validateDataCompleteness(state: SemanticState): boolean {
  switch (state.intent) {
    case 'create_appointment':
      // Precisa: title + scheduled_at (data/hora)
      return !!(state.title && state.scheduled_at)
    
    case 'register_expense':
    case 'register_revenue':
      // Precisa: amount + description
      return !!(state.amount && state.amount > 0 && state.description)
    
    case 'update_expense':
    case 'update_revenue':
    case 'update_appointment':
      // Para updates, precisa ter targetId e pelo menos um campo para atualizar
      return !!(state.targetId && (
        state.amount !== null ||
        state.description !== null ||
        state.title !== null ||
        state.scheduled_at !== null ||
        state.categoria !== null
      ))
    
    default:
      return false
  }
}

/**
 * Analisa mensagem do usuário de forma conversacional
 * Retorna estado semântico com possível necessidade de confirmação
 */
export async function analyzeConversationalIntention(
  message: string,
  recentConversations: Array<{ role: string; message: string }>,
  tenantId: string
): Promise<SemanticState> {
  try {
    const conversationContext = recentConversations.length > 0
      ? recentConversations.slice(-10).map(c => `${c.role === 'user' ? 'Usuário' : 'Assistente'}: ${c.message}`).join('\n')
      : ''
    
    // Busca última ação criada para detectar correções
    const lastExpense = getLastAction(tenantId, 'expense')
    const lastRevenue = getLastAction(tenantId, 'revenue')
    const lastAppointment = getLastAction(tenantId, 'appointment')
    const lastAny = getLastAnyAction(tenantId)
    
    const lastActionContext = lastAny ? `
ÚLTIMA AÇÃO CRIADA (para detectar correções):
- Tipo: ${lastAny.type}
- ID: ${lastAny.id}
- Criada há: ${Math.round((Date.now() - lastAny.createdAt.getTime()) / 1000)} segundos
- Dados: ${JSON.stringify(lastAny.data, null, 2)}

Se o usuário estiver corrigindo algo (ex: "não, é amanhã", "não, foi 45"), use intent: "update_${lastAny.type}" e targetId: "${lastAny.id}".
` : ''
    
    const { getLastValidState } = await import('./semantic-state')
    const lastState = getLastValidState()
    const lastStateContext = lastState ? `
ÚLTIMO ESTADO VÁLIDO:
- intent: ${lastState.intent}
- domain: ${lastState.domain || 'null'}
- periodo: ${lastState.periodo || 'null'}
` : ''
    
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-5.2',
      messages: [
        {
          role: 'system',
          content: `Você é um ASSISTENTE INTELIGENTE e CONVERSACIONAL, similar ao ChatGPT.

SEU PAPEL:
- Você CONVERSA naturalmente com o usuário
- Você ENTENDE a intenção, mas não precisa classificar tudo imediatamente
- Você CONFIRMA antes de executar ações quando há ambiguidade
- Você DETECTA quando o usuário está corrigindo algo (não criando novo)
- Você retorna um ESTADO SEMÂNTICO estruturado em JSON

COMPORTAMENTO CONVERSACIONAL:
1. Se a mensagem é uma pergunta geral ou conversa casual → intent: "chat"
2. Se a intenção está clara e completa → gere ação (register_expense, create_appointment, etc)
3. Se há ambiguidade REAL → needsConfirmation: true (veja regras abaixo)
4. Se o usuário está corrigindo algo → use update_expense, update_revenue, update_appointment

DETECÇÃO DE CORREÇÕES:
- "não, é amanhã" → update_appointment (corrige data)
- "não, foi 45" → update_expense (corrige valor)
- "não, falei errado, é meio-dia" → update_appointment (corrige horário)
- Use o targetId da última ação do mesmo tipo

REGRAS CRÍTICAS DE CONFIRMAÇÃO (OBRIGATÓRIAS):
1. NUNCA perguntar se data e hora foram dadas explicitamente (ex: "15/01/2026 às 12:00")
2. NUNCA perguntar a mesma informação mais de uma vez
3. Só perguntar quando há AMBIGUIDADE REAL (não quando dados estão claros)
4. Local (cidade/endereço) é OPCIONAL - nunca bloquear salvamento por falta de local
5. Não perguntar fuso horário se cidade/UF já indicar claramente
6. Quando todos os dados essenciais estiverem claros → readyToSave: true
7. Fazer NO MÁXIMO uma confirmação final resumida antes de salvar

FORMATO DE CONFIRMAÇÃO (quando realmente necessário):
"Vou salvar: [título], [data/hora], [cidade opcional]. Posso salvar assim?"

DADOS ESSENCIAIS POR INTENÇÃO:
- create_appointment: title + scheduled_at (data/hora explícita) → readyToSave: true
- register_expense: amount + description → readyToSave: true
- register_revenue: amount + description → readyToSave: true

EXEMPLOS DE QUANDO NÃO PERGUNTAR:
- "tenho dentista amanhã às 10" → Dados completos! readyToSave: true, executar diretamente
- "gastei 50 no mercado" → Dados completos! readyToSave: true, executar diretamente
- "15/01/2026 às 12:00" → Data/hora explícita! readyToSave: true, executar diretamente

EXEMPLOS DE QUANDO PERGUNTAR (apenas ambiguidade real):
- "tenho reunião" → Falta data/hora → needsConfirmation: true
- "gastei no mercado" → Falta valor → needsConfirmation: true
- "reunião às 10" → Pode ser hoje ou amanhã? → needsConfirmation: true (só se realmente ambíguo)

${conversationContext ? `
CONTEXTO DA CONVERSA:
${conversationContext}
${lastStateContext}
${lastActionContext}
` : ''}

Responda APENAS com JSON no formato:
{
  "intent": "register_expense" | "register_revenue" | "create_appointment" | "update_expense" | "update_revenue" | "update_appointment" | "query" | "report" | "chat" | "confirm" | "cancel",
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
  "clarificationMessage": string | null,
  "needsConfirmation": boolean,
  "confirmationMessage": string | null,
  "targetId": string | null,
  "readyToSave": boolean
}

REGRAS IMPORTANTES:
- Se é conversa casual → intent: "chat", confidence: 0.8
- Se dados estão completos e claros → readyToSave: true, execute ação diretamente (SEM confirmação)
- Se há ambiguidade REAL → needsConfirmation: true, readyToSave: false
- Se está corrigindo → use update_* com targetId da última ação
- NUNCA invente dados - se não conseguir extrair, deixe null
- scheduled_at deve ser ISO 8601 completo (ex: "2024-01-16T10:00:00.000Z")
- PRIORIDADE: Executar diretamente quando possível, confirmar apenas quando necessário
`
        },
        {
          role: 'user',
          content: message,
        },
      ],
      temperature: 0.7, // Mais criativo para conversa natural
      response_format: { type: 'json_object' },
    })

    const response = completion.choices[0]?.message?.content
    if (!response) {
      return {
        intent: 'chat',
        confidence: 0.5,
        needsClarification: true,
        clarificationMessage: 'Não consegui entender. Pode reformular?'
      }
    }

    const parsed = JSON.parse(response)
    
    // Normaliza categoria/subcategoria
    const { resolveCategoria } = await import('../utils/category-normalizer')
    let categoriaFinal: string | null = null
    let subcategoriaFinal: string | null = null
    
    if (parsed.categoria) {
      const normalizada = resolveCategoria(parsed.categoria)
      categoriaFinal = normalizada.category
      subcategoriaFinal = normalizada.subcategory
    }
    
    if (parsed.subcategoria && !subcategoriaFinal) {
      const normalizadaSub = resolveCategoria(parsed.subcategoria)
      if (normalizadaSub.subcategory) {
        subcategoriaFinal = normalizadaSub.subcategory
        if (!categoriaFinal && normalizadaSub.category) {
          categoriaFinal = normalizadaSub.category
        }
      }
    }
    
    // Constrói estado semântico
    const semanticState: SemanticState = {
      intent: parsed.intent || 'chat',
      domain: parsed.domain ?? null,
      periodo: parsed.periodo ?? null,
      categoria: categoriaFinal,
      subcategoria: subcategoriaFinal,
      queryType: parsed.queryType ?? null,
      amount: parsed.amount ?? null,
      title: parsed.title ?? null,
      scheduled_at: parsed.scheduled_at ?? null,
      description: parsed.description ?? null,
      confidence: parsed.confidence ?? 0.5,
      needsClarification: parsed.needsClarification ?? false,
      clarificationMessage: parsed.clarificationMessage ?? null,
      needsConfirmation: parsed.needsConfirmation ?? false,
      confirmationMessage: parsed.confirmationMessage ?? null,
      targetId: parsed.targetId ?? null,
      readyToSave: parsed.readyToSave ?? false
    }
    
    // Validação inteligente: se dados estão completos, marca como readyToSave
    if (!semanticState.readyToSave) {
      semanticState.readyToSave = validateDataCompleteness(semanticState)
    }
    
    // Para updates, se não tem targetId mas detectou update, busca da última ação
    if ((semanticState.intent === 'update_expense' || 
         semanticState.intent === 'update_revenue' || 
         semanticState.intent === 'update_appointment') && 
        !semanticState.targetId) {
      const lastAction = getLastAction(
        tenantId,
        semanticState.intent === 'update_expense' ? 'expense' :
        semanticState.intent === 'update_revenue' ? 'revenue' : 'appointment'
      )
      if (lastAction) {
        semanticState.targetId = lastAction.id
        console.log('conversational-assistant - TargetId definido da última ação:', semanticState.targetId)
      }
    }
    
    // Aplica herança de contexto (apenas para queries)
    const stateWithContext = inheritContext(semanticState)
    
    // Salva estado válido se confidence >= 0.7
    if (stateWithContext.confidence >= 0.7 && stateWithContext.intent !== 'chat') {
      saveLastValidState(stateWithContext)
    }
    
    return stateWithContext
  } catch (error) {
    console.error('Erro ao analisar intenção conversacional:', error)
    return {
      intent: 'chat',
      confidence: 0.5,
      needsClarification: true,
      clarificationMessage: 'Erro ao processar mensagem. Pode tentar novamente?'
    }
  }
}
