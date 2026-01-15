/**
 * Gerenciador de contexto conversacional
 * Implementa "memória curta" para manter continuidade de conversa
 * Baseado nos princípios de arquitetura de bot inteligente
 */

export interface ConversationContext {
  lastIntent?: 'register_expense' | 'register_revenue' | 'create_appointment' | 'query' | 'report' | 'chat'
  lastDomain?: 'financeiro' | 'agenda' | 'geral'
  lastQueryType?: 'gasto' | 'compromissos' | 'categoria' | 'agenda'
  lastPeriod?: 'hoje' | 'ontem' | 'amanhã' | 'semana' | 'mês'
  lastCategory?: string
  timestamp: string
}

/**
 * Extrai contexto da última conversa válida
 */
export function extractContextFromConversations(
  recentConversations: Array<{ role: string; message: string }>
): ConversationContext | null {
  if (!recentConversations || recentConversations.length === 0) {
    return null
  }

  // Busca a última mensagem do usuário que teve uma ação válida
  const lastUserMessage = [...recentConversations].reverse().find(c => c.role === 'user')
  
  if (!lastUserMessage) {
    return null
  }

  const lowerMessage = lastUserMessage.message.toLowerCase()
  
  // Detecta domínio
  let domain: 'financeiro' | 'agenda' | 'geral' | undefined
  let queryType: 'gasto' | 'compromissos' | 'categoria' | 'agenda' | undefined
  let intent: ConversationContext['lastIntent'] | undefined
  let period: ConversationContext['lastPeriod'] | undefined
  let category: string | undefined

  // Detecta se é sobre gastos
  if (lowerMessage.includes('gastei') || 
      lowerMessage.includes('gasto') || 
      lowerMessage.includes('gastos') ||
      lowerMessage.includes('despesa') ||
      lowerMessage.includes('paguei')) {
    domain = 'financeiro'
    queryType = 'gasto'
    intent = 'query'
  }
  // Detecta se é sobre compromissos
  else if (lowerMessage.includes('compromisso') || 
           lowerMessage.includes('agenda') ||
           lowerMessage.includes('reunião') ||
           lowerMessage.includes('reuniao')) {
    domain = 'agenda'
    queryType = 'compromissos'
    intent = 'query'
  }
  // Detecta se é registro de gasto
  else if (lowerMessage.includes('gastei') && /\d+/.test(lowerMessage)) {
    domain = 'financeiro'
    intent = 'register_expense'
  }
  // Detecta se é registro de receita
  else if (lowerMessage.includes('recebi') || 
           lowerMessage.includes('ganhei') ||
           lowerMessage.includes('entrada')) {
    domain = 'financeiro'
    intent = 'register_revenue'
  }
  // Detecta se é criação de compromisso
  else if (lowerMessage.includes('marcar') || 
           lowerMessage.includes('agendar') ||
           /\d{1,2}h/.test(lowerMessage)) {
    domain = 'agenda'
    intent = 'create_appointment'
  }

  // Detecta período
  if (lowerMessage.includes('hoje')) {
    period = 'hoje'
  } else if (lowerMessage.includes('ontem')) {
    period = 'ontem'
  } else if (lowerMessage.includes('amanhã') || lowerMessage.includes('amanha')) {
    period = 'amanhã'
  } else if (lowerMessage.includes('semana')) {
    period = 'semana'
  } else if (lowerMessage.includes('mês') || lowerMessage.includes('mes')) {
    period = 'mês'
  }

  // Detecta categoria
  const categories = [
    'combustível', 'combustivel', 'gasolina', 'transporte',
    'alimentação', 'alimentacao', 'mercado', 'restaurante',
    'saúde', 'saude', 'medicamento', 'farmácia', 'farmacia',
    'moradia', 'aluguel', 'energia', 'água', 'agua'
  ]
  
  for (const cat of categories) {
    if (lowerMessage.includes(cat)) {
      category = cat
      break
    }
  }

  if (!domain && !intent) {
    return null // Não há contexto válido
  }

  return {
    lastIntent: intent,
    lastDomain: domain,
    lastQueryType: queryType,
    lastPeriod: period,
    lastCategory: category,
    timestamp: new Date().toISOString()
  }
}

/**
 * Detecta se uma mensagem é pergunta de continuação
 */
export function isContinuationQuestion(message: string): boolean {
  const lowerMessage = message.toLowerCase().trim()
  
  // Perguntas curtas sem substantivo são continuações
  const continuationPatterns = [
    /^(e\s+(hoje|ontem|amanhã|amanha|semana|mês|mes|agora))[?]?\.?$/i,
    /^(e\s+isso)[?]?\.?$/i,
    /^(e\s+esse)[?]?\.?$/i,
    /^(e\s+essa)[?]?\.?$/i,
    /^e\s*$/i, // Apenas "e"
    /^e\?$/i,  // "e?"
  ]
  
  return continuationPatterns.some(pattern => pattern.test(lowerMessage)) ||
         lowerMessage === 'e hoje' ||
         lowerMessage === 'e ontem' ||
         lowerMessage === 'e amanhã' ||
         lowerMessage === 'e amanha' ||
         lowerMessage === 'e hoje?' ||
         lowerMessage === 'e ontem?' ||
         lowerMessage === 'e amanhã?' ||
         lowerMessage === 'e amanha?'
}

/**
 * Reconstrói mensagem de continuação usando contexto
 */
export function reconstructContinuationMessage(
  message: string,
  context: ConversationContext
): { message: string; extractedData: any } {
  const lowerMessage = message.toLowerCase().trim()
  const extractedData: any = {}
  
  // Herda intenção e domínio do contexto
  if (context.lastIntent) {
    extractedData.intention = context.lastIntent
  }
  
  if (context.lastDomain) {
    extractedData.domain = context.lastDomain
  }
  
  if (context.lastQueryType) {
    extractedData.queryType = context.lastQueryType
  }
  
  // Detecta novo período na continuação
  if (lowerMessage.includes('hoje')) {
    extractedData.queryPeriod = 'hoje'
  } else if (lowerMessage.includes('ontem')) {
    extractedData.queryPeriod = 'ontem'
  } else if (lowerMessage.includes('amanhã') || lowerMessage.includes('amanha')) {
    extractedData.queryPeriod = 'amanhã'
  } else if (lowerMessage.includes('semana')) {
    extractedData.queryPeriod = 'semana'
  } else if (lowerMessage.includes('mês') || lowerMessage.includes('mes')) {
    extractedData.queryPeriod = 'mês'
  } else if (context.lastPeriod) {
    // Se não mencionou período, mantém o anterior (para casos como "e isso?")
    extractedData.queryPeriod = context.lastPeriod
  }
  
  // Reconstrói mensagem completa
  let reconstructedMessage = message
  
  if (context.lastDomain === 'financeiro' && context.lastQueryType === 'gasto') {
    if (extractedData.queryPeriod) {
      reconstructedMessage = `quantos gastei ${extractedData.queryPeriod}?`
    } else {
      reconstructedMessage = 'quantos gastei?'
    }
  } else if (context.lastDomain === 'agenda' && context.lastQueryType === 'compromissos') {
    if (extractedData.queryPeriod) {
      reconstructedMessage = `quantos compromissos tenho ${extractedData.queryPeriod}?`
    } else {
      reconstructedMessage = 'quantos compromissos tenho?'
    }
  }
  
  return {
    message: reconstructedMessage,
    extractedData
  }
}
