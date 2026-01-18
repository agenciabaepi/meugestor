/**
 * Assistente Conversacional Inteligente
 * 
 * Princípio: IA conversa naturalmente, entende intenção, confirma quando necessário,
 * e só então gera ação estruturada para o sistema executar.
 */

import { openai } from './openai'
import { SemanticState, inheritContext, saveLastValidState } from './semantic-state'
import { getLastAction, getLastAnyAction, getLastTouchedAppointmentId } from './action-history'
import { 
  registerMention, 
  hasFocusLock, 
  clearFocus, 
  findMatchingAppointments 
} from './focus-lock'
import type { ActiveTask } from './session-focus'

/**
 * Valida se os dados essenciais estão completos para salvar
 */
function validateDataCompleteness(state: SemanticState): boolean {
  switch (state.intent) {
    case 'create_appointment':
      // Execução direta: só salva sem conversa se tiver título + período + horário.
      // scheduled_at aqui é apenas o horário (ex: "23:00", "23h", "23h30")
      return !!(
        state.title &&
        state.periodo &&
        state.scheduled_at &&
        /^(?:\d{1,2}:\d{2}|\d{1,2}h(?:\d{2})?)$/i.test(String(state.scheduled_at).trim())
      )

    case 'cancel_appointment':
      return !!state.targetId
    
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

    case 'create_list':
      return !!(state.list_name && String(state.list_name).trim().length > 0)

    case 'add_list_item':
      // list_name pode vir do contexto persistente (resolvido pelo sistema)
      return !!(state.item_name && String(state.item_name).trim().length > 0)

    case 'remove_list_item':
      return !!(state.item_name && String(state.item_name).trim().length > 0)

    case 'mark_item_done':
      return !!(state.item_name && String(state.item_name).trim().length > 0)

    case 'show_list':
      // list_name pode vir do contexto persistente (resolvido pelo sistema)
      return true
    
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
  tenantId: string,
  userId: string,
  activeTask?: ActiveTask | null
): Promise<SemanticState> {
  try {
    const conversationContext = recentConversations.length > 0
      ? recentConversations.slice(-10).map(c => `${c.role === 'user' ? 'Usuário' : 'Assistente'}: ${c.message}`).join('\n')
      : ''
    
    // Busca última ação criada para detectar correções
    const lastExpense = getLastAction(tenantId, userId, 'expense')
    const lastRevenue = getLastAction(tenantId, userId, 'revenue')
    const lastAppointment = getLastAction(tenantId, userId, 'appointment')
    const lastAny = getLastAnyAction(tenantId, userId)
    
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
    
    // Verifica se há foco travado (usuário repetiu o mesmo compromisso)
    const focusLock = hasFocusLock(tenantId, userId, 'appointment')
    const focusLockContext = focusLock ? `
FOCO TRAVADO (usuário repetiu o mesmo compromisso ${focusLock.mentions} vezes):
- targetId: ${focusLock.targetId || 'null'}
- title: ${focusLock.title || 'null'}
- location: ${focusLock.location || 'null'}
- date: ${focusLock.date || 'null'}
- confidence: ${focusLock.confidence}

Se o usuário está corrigindo este compromisso, use targetId: "${focusLock.targetId}" e NÃO pergunte novamente qual compromisso é.
` : ''

    const activeTaskContext = activeTask ? `
AÇÃO ATIVA (SESSION FOCUS):
- type: ${activeTask.type}
- targetId: ${activeTask.state.targetId || 'null'}
- title: ${activeTask.state.title || 'null'}
- scheduled_at: ${activeTask.state.scheduled_at || 'null'}
- description: ${activeTask.state.description || 'null'}

REGRAS DE SESSION FOCUS:
- Enquanto houver ação ativa, NÃO troque de assunto automaticamente.
- Interprete a mensagem atual como: continuação/correção/confirm/cancel.
- Se o usuário fizer uma pergunta diferente (ex: consulta), NÃO ignore a ação ativa:
  peça para concluir ou cancelar (uma única vez) e mantenha o foco.
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
- Você executa ações DIRETAMENTE quando a mensagem é clara e completa
- Você só pergunta quando falta informação essencial (clarificação), sem conversa desnecessária
- Você DETECTA quando o usuário está corrigindo algo (não criando novo)
- Você retorna um ESTADO SEMÂNTICO estruturado em JSON

COMPORTAMENTO CONVERSACIONAL:
1. Se a mensagem é uma pergunta geral ou conversa casual → intent: "chat"
2. Se a intenção está clara e completa → gere ação (register_expense, create_appointment, etc)
3. Se há ambiguidade REAL (faltou dado essencial) → needsClarification: true (veja regras abaixo)
4. Se o usuário está corrigindo algo → use update_expense, update_revenue, update_appointment

DETECÇÃO DE CORREÇÕES:
- "não, é amanhã" → update_appointment (corrige data)
- "não, foi 45" → update_expense (corrige valor)
- "não, falei errado, é meio-dia" → update_appointment (corrige horário)
- Use o targetId da última ação do mesmo tipo

REGRA CRÍTICA PARA UPDATE DE COMPROMISSO (OBRIGATÓRIA):
- Se intent = update_appointment e a mudança é clara (ex: horário) e existe um compromisso recente (lastTouched),
  execute diretamente (readyToSave=true).
- NUNCA preencha/atualize campos que o usuário não pediu:
  - NÃO invente title (ex: "Reunião") em updates
  - NÃO invente description/local em updates
  - Se o usuário só mudou horário, retorne apenas scheduled_at e deixe title/description como null.

REGRAS CRÍTICAS (OBRIGATÓRIAS):
1. Execução direta quando estiver claro e completo → readyToSave: true, needsClarification: false
2. Só perguntar quando faltar informação ESSENCIAL (data/período e/ou horário, valor, descrição etc.)
3. NUNCA perguntar a mesma informação mais de uma vez
4. Local (cidade/endereço) é OPCIONAL - nunca bloquear salvamento por falta de local
5. PROIBIDO: pedir formato técnico de data, ISO 8601 ou fuso horário

REGRA CRÍTICA - NOVO DOMÍNIO "listas":
- Listas são para intenção futura (ex: compras). NUNCA registre gasto automaticamente.
- Quando a mensagem for sobre listas (lista de compras, itens, marcar comprado), use domain: "listas".
- Intenções de listas (execute direto quando possível):
  - create_list: criar uma lista (ex: "cria uma lista chamada mercado")
  - add_list_item: adicionar item em uma lista (ex: "adiciona leite no mercado"; "adiciona leite" como follow-up)
  - remove_list_item: remover item (ex: "remove leite")
  - mark_item_done: marcar como comprado (ex: "já comprei o arroz"; "leite comprado")
  - show_list: mostrar itens (ex: "o que tem na lista do mercado?"; "o que falta comprar?")
 - Perguntas SOBRE AS LISTAS (contagem/nomes) devem ser query (NÃO chat):
   - "quantas listas de compras eu tenho?" → intent: "query", domain: "listas", queryType: "listas", list_type: "compras"
   - "quais listas eu tenho?" → intent: "query", domain: "listas", queryType: "listas", list_type: null (todas)
 - Perguntas SOBRE ITENS DE UMA LISTA devem virar query (NÃO query de listas):
   - "quais itens tem na lista do mercado?" → intent: "query", domain: "listas", queryType: "lista_itens", list_name: "mercado"
   - "quantos itens tenho na lista de películas de iphone?" → intent: "query", domain: "listas", queryType: "lista_itens", list_name: "películas de iphone"

FOLLOW-UP (OBRIGATÓRIO):
- Mensagens curtas como "adiciona arroz", "remove leite", "marca como comprado", "o que falta comprar?"
  devem ser tratadas como continuação da última lista ativa.
- Se não houver nome da lista na mensagem, retorne list_name: null (o SISTEMA resolve via contexto persistente).

PROIBIDO:
- Perguntar "qual a data exata" / "dd/mm/aaaa"
- Mencionar ISO 8601
- Perguntar sobre fuso horário/timezone
- Pedir cidade/UF como requisito

REGRA CRÍTICA DE TEMPO RELATIVO:
- "amanhã", "hoje", "segunda", etc. + horário explícito = DADO COMPLETO.
- Nesses casos: readyToSave=true e executar diretamente (sem confirmação).

REGRA CRÍTICA - FOCUS LOCK (TRAVA DE FOCO):
- Se o usuário mencionar o mesmo compromisso 2-3 vezes seguidas (mesmo título/local/data), NÃO perguntar novamente qual compromisso é
- Use o targetId do foco travado se disponível
- Se há foco travado e usuário está corrigindo, execute update_appointment diretamente
- Palavras como "essa", "isso", "a de amanhã", "a reunião da Zion" indicam continuidade da conversa
- Após certeza suficiente (2+ menções do mesmo alvo), execute ou faça UMA confirmação final curta

CONFIRMAÇÃO:
- Só use needsConfirmation=true se o USUÁRIO pedir confirmação explicitamente (ex: "confirma?" / "posso salvar assim?").

DADOS ESSENCIAIS POR INTENÇÃO:
- create_appointment: título + (tempo relativo + horário) → readyToSave: true (scheduled_at pode ser null; backend converte)
- register_expense: amount + description → readyToSave: true
- register_revenue: amount + description → readyToSave: true
- create_supplier: supplier_name → readyToSave: true (modo empresa)
- create_employee: employee_name → readyToSave: true (modo empresa)

EXEMPLOS DE QUANDO NÃO PERGUNTAR:
- "tenho dentista amanhã às 10" → Dados completos! readyToSave: true, executar diretamente
- "gastei 50 no mercado" → Dados completos! readyToSave: true, executar diretamente
- "15/01/2026 às 12:00" → Data/hora explícita! readyToSave: true, executar diretamente

EXEMPLOS DE QUANDO PERGUNTAR (apenas ambiguidade real):
- "tenho reunião" → Falta data/hora → needsClarification: true
- "gastei no mercado" → Falta valor → needsClarification: true
- "reunião às 10" → Falta período → needsClarification: true (pergunte "hoje ou amanhã?")

${conversationContext ? `
CONTEXTO DA CONVERSA:
${conversationContext}
${lastStateContext}
${lastActionContext}
${focusLockContext}
${activeTaskContext}
` : ''}

Responda APENAS com JSON no formato:
{
  "intent": "register_expense" | "register_revenue" | "create_supplier" | "create_employee" | "create_appointment" | "update_expense" | "update_revenue" | "update_appointment" | "cancel_appointment" | "create_list" | "add_list_item" | "remove_list_item" | "mark_item_done" | "show_list" | "query" | "report" | "chat" | "confirm" | "cancel",
  "domain": "financeiro" | "agenda" | "listas" | "geral" | null,
  "periodo": "hoje" | "ontem" | "amanhã" | "semana" | "mês" | "ano" | null,
  "categoria": string | null,
  "subcategoria": string | null,
  "queryType": "gasto" | "compromissos" | "categoria" | "agenda" | "listas" | "lista_itens" | null,
  "amount": number | null,
  "title": string | null,
  "scheduled_at": string (apenas horário, ex: "15:00") | null,
  "description": string | null,
  "list_name": string | null,
  "list_type": string | null,
  "item_name": string | null,
  "quantidade": number | string | null,
  "unidade": string | null,
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
- Se há ambiguidade REAL → needsClarification: true, readyToSave: false
- Se está corrigindo → use update_* com targetId da última ação
- NUNCA invente dados - se não conseguir extrair, deixe null
- scheduled_at NUNCA deve ser ISO 8601
- scheduled_at deve ser apenas o horário (ex: "15:00"). O backend converte (periodo + horário -> ISO).
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
      list_name: parsed.list_name ?? null,
      list_type: parsed.list_type ?? null,
      item_name: parsed.item_name ?? null,
      quantidade: parsed.quantidade ?? null,
      unidade: parsed.unidade ?? null,
      confidence: parsed.confidence ?? 0.5,
      needsClarification: parsed.needsClarification ?? false,
      clarificationMessage: parsed.clarificationMessage ?? null,
      needsConfirmation: parsed.needsConfirmation ?? false,
      confirmationMessage: parsed.confirmationMessage ?? null,
      targetId: parsed.targetId ?? null,
      readyToSave: parsed.readyToSave ?? false
    }

    // REFERÊNCIA DETERMINÍSTICA: "essa", "essa reunião", etc.
    // Mantém um único compromisso lógico (lastTouchedAppointmentId).
    const touchedId = getLastTouchedAppointmentId(tenantId, userId)
    if (touchedId) {
      // Se é update e não veio targetId, usa o lastTouched
      if (semanticState.intent === 'update_appointment' && !semanticState.targetId) {
        semanticState.targetId = touchedId
      }
      // Cancelamento por linguagem referencial
      const lower = message.toLowerCase()
      const isCancelVerb = /\b(cancela|cancelar|desmarca|desmarcar)\b/.test(lower)
      const isReferential = /\b(essa|esse|este|a\s+reuni[aã]o|o\s+compromisso)\b/.test(lower)
      if ((semanticState.intent === 'cancel_appointment' || semanticState.intent === 'cancel') && isCancelVerb) {
        semanticState.intent = 'cancel_appointment'
        semanticState.targetId = semanticState.targetId || touchedId
        semanticState.domain = 'agenda'
      } else if (isCancelVerb && isReferential && semanticState.intent === 'chat') {
        // Se o modelo caiu em chat mas a frase é operacional e referencial, executa cancelamento.
        semanticState.intent = 'cancel_appointment'
        semanticState.targetId = touchedId
        semanticState.domain = 'agenda'
      }
    }
    
    // Validação inteligente: se dados estão completos, marca como readyToSave
    if (!semanticState.readyToSave) {
      semanticState.readyToSave = validateDataCompleteness(semanticState)
    }

    // EXECUÇÃO DIRETA (regra do produto):
    // - Se está pronto para salvar, nunca pedir confirmação.
    // - Conversa só quando falta dado essencial (needsClarification).
    if (semanticState.readyToSave) {
      semanticState.needsConfirmation = false
      semanticState.confirmationMessage = null
      semanticState.needsClarification = false
      semanticState.clarificationMessage = null
    } else {
      // Se faltou algo essencial, pergunta diretamente (humano, sem formato técnico).
      if (semanticState.intent === 'create_appointment') {
        const missingPeriodo = !semanticState.periodo
        const missingHora = !semanticState.scheduled_at
        semanticState.needsClarification = true
        semanticState.clarificationMessage =
          missingPeriodo && missingHora
            ? 'Pra quando e que horas? (ex: "amanhã às 15h")'
            : missingPeriodo
              ? 'Pra quando? (ex: "hoje" ou "amanhã")'
              : 'Que horas? (ex: "às 15h")'
      }
      if ((semanticState.intent === 'register_expense' || semanticState.intent === 'register_revenue')) {
        const missingAmount = !(semanticState.amount && semanticState.amount > 0)
        const missingDesc = !semanticState.description
        if (missingAmount || missingDesc) {
          semanticState.needsClarification = true
          semanticState.clarificationMessage =
            missingAmount && missingDesc
              ? 'Quanto foi e com o que foi? (ex: "gastei 50 no mercado")'
              : missingAmount
                ? 'Quanto foi?'
                : 'Com o que foi?'
        }
      }
      if (semanticState.intent === 'create_list') {
        const missing = !semanticState.list_name || String(semanticState.list_name).trim().length === 0
        if (missing) {
          semanticState.needsClarification = true
          semanticState.clarificationMessage = 'Qual o nome da lista? (ex: "mercado")'
        }
      }
      if (semanticState.intent === 'add_list_item') {
        const missingItem = !semanticState.item_name || String(semanticState.item_name).trim().length === 0
        if (missingItem) {
          semanticState.needsClarification = true
          semanticState.clarificationMessage = 'O que você quer adicionar?'
        }
      }
      if (semanticState.intent === 'remove_list_item') {
        const missingItem = !semanticState.item_name || String(semanticState.item_name).trim().length === 0
        if (missingItem) {
          semanticState.needsClarification = true
          semanticState.clarificationMessage = 'Qual item você quer remover?'
        }
      }
      if (semanticState.intent === 'mark_item_done') {
        const missingItem = !semanticState.item_name || String(semanticState.item_name).trim().length === 0
        if (missingItem) {
          semanticState.needsClarification = true
          semanticState.clarificationMessage = 'Qual item você já comprou?'
        }
      }
    }
    
    // Para updates, tenta definir targetId usando múltiplas estratégias
    if ((semanticState.intent === 'update_expense' || 
         semanticState.intent === 'update_revenue' || 
         semanticState.intent === 'update_appointment') && 
        !semanticState.targetId) {
      
      // Estratégia 1: Focus Lock (prioridade máxima)
      if (semanticState.intent === 'update_appointment') {
        const focusLock = hasFocusLock(tenantId, userId, 'appointment')
        if (focusLock?.targetId) {
          semanticState.targetId = focusLock.targetId
          console.log('conversational-assistant - TargetId definido pelo focus lock:', semanticState.targetId)
        } else {
          // Estratégia 2: Buscar compromissos que correspondem aos critérios
          const criteria: any = {}
          if (semanticState.title) criteria.title = semanticState.title
          if (semanticState.description) criteria.location = semanticState.description
          if (semanticState.scheduled_at) criteria.date = semanticState.scheduled_at
          
          if (Object.keys(criteria).length > 0) {
            const matches = await findMatchingAppointments(tenantId, userId, criteria)
            if (matches.length === 1) {
              // Apenas um match, usa esse
              semanticState.targetId = matches[0].id
              console.log('conversational-assistant - TargetId definido por busca única:', semanticState.targetId)
              
              // Registra menção para focus lock
              registerMention(tenantId, userId, 'appointment', {
                targetId: matches[0].id,
                title: matches[0].title,
                location: matches[0].description || undefined,
                date: matches[0].scheduled_at
              })
            } else if (matches.length > 1) {
              // Múltiplos matches, usa o com maior score (mais relevante)
              const bestMatch = matches[0]
              semanticState.targetId = bestMatch.id
              console.log('conversational-assistant - TargetId definido por busca (melhor match, score:', bestMatch.score, '):', semanticState.targetId)
              
              // Registra menção para focus lock
              registerMention(tenantId, userId, 'appointment', {
                targetId: bestMatch.id,
                title: bestMatch.title,
                location: bestMatch.description || undefined,
                date: bestMatch.scheduled_at
              })
            }
          }
        }
      }
      
      // Estratégia 3: Última ação (fallback)
      if (!semanticState.targetId) {
        const lastAction = getLastAction(
          tenantId,
          userId,
          semanticState.intent === 'update_expense' ? 'expense' :
          semanticState.intent === 'update_revenue' ? 'revenue' : 'appointment'
        )
        if (lastAction) {
          semanticState.targetId = lastAction.id
          console.log('conversational-assistant - TargetId definido da última ação:', semanticState.targetId)
        }
      }
    }
    
    // Registra menção para focus lock (para updates de compromissos)
    if (semanticState.intent === 'update_appointment') {
      if (semanticState.targetId) {
        // Tem targetId, registra com ele
        registerMention(tenantId, userId, 'appointment', {
          targetId: semanticState.targetId,
          title: semanticState.title || undefined,
          location: semanticState.description || undefined,
          date: semanticState.scheduled_at || undefined
        })
      } else if (semanticState.title || semanticState.description || semanticState.scheduled_at) {
        // Não tem targetId ainda, mas tem dados do compromisso - registra para busca futura
        registerMention(tenantId, userId, 'appointment', {
          title: semanticState.title || undefined,
          location: semanticState.description || undefined,
          date: semanticState.scheduled_at || undefined
        })
      }
    }
    
    // Se há foco travado e dados estão completos, força readyToSave
    if (semanticState.intent === 'update_appointment') {
      const focusLock = hasFocusLock(tenantId, userId, 'appointment')
      if (focusLock && focusLock.confidence >= 0.8 && semanticState.targetId) {
        // Foco travado com alta confiança, não precisa confirmação
        semanticState.readyToSave = true
        semanticState.needsConfirmation = false
        console.log('conversational-assistant - Foco travado com alta confiança, executando diretamente')
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
