/**
 * Assistente Conversacional Inteligente
 * 
 * Princípio: IA conversa naturalmente, entende intenção, confirma quando necessário,
 * e só então gera ação estruturada para o sistema executar.
 */

import { openai } from '../utils/openai-client'
import { SemanticState, inheritContext, saveLastValidState } from './semantic-state'
import { getLastAction, getLastAnyAction } from './action-history'

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
3. Se há ambiguidade ou risco de erro → needsConfirmation: true
4. Se o usuário está corrigindo algo → use update_expense, update_revenue, update_appointment

DETECÇÃO DE CORREÇÕES:
- "não, é amanhã" → update_appointment (corrige data)
- "não, foi 45" → update_expense (corrige valor)
- "não, falei errado, é meio-dia" → update_appointment (corrige horário)
- Use o targetId da última ação do mesmo tipo

CONFIRMAÇÕES:
- Se dados estão incompletos ou ambíguos → needsConfirmation: true
- Gere uma mensagem de confirmação natural (confirmationMessage)
- Exemplo: "Certo, consulta com dentista amanhã às 10h. Posso agendar?"

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
  "targetId": string | null
}

REGRAS IMPORTANTES:
- Se é conversa casual → intent: "chat", confidence: 0.8
- Se precisa confirmar → needsConfirmation: true, gere mensagem natural
- Se está corrigindo → use update_* com targetId da última ação
- Se dados estão completos e claros → execute ação diretamente
- NUNCA invente dados - se não conseguir extrair, deixe null
- scheduled_at deve ser ISO 8601 completo (ex: "2024-01-16T10:00:00.000Z")
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
      targetId: parsed.targetId ?? null
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
