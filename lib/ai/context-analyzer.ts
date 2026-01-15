/**
 * Analisador de contexto inteligente
 * Analisa mensagens para entender intenções e evitar ações desnecessárias
 */

export interface ContextAnalysis {
  shouldProceed: boolean
  message?: string
  reason?: string
  suggestedAction?: string
}

/**
 * Analisa se uma ação de criar compromisso é realmente necessária
 * ou se o usuário está pedindo algo que o sistema já faz
 */
export function analyzeAppointmentContext(
  message: string,
  extractedData: any,
  existingAppointments?: Array<{ title: string; scheduled_at: string }>
): ContextAnalysis {
  const lowerMessage = message.toLowerCase()
  
  // PRIORIDADE 1: Se tem título E horário extraídos, é novo compromisso - SEMPRE permite
  const hasNewAppointmentData = extractedData?.title && extractedData?.scheduled_at
  if (hasNewAppointmentData) {
    console.log('analyzeAppointmentContext - Dados de novo compromisso detectados, permitindo criação')
    // Continua para verificar duplicatas, mas não bloqueia por pedido de lembrete
  }
  
  // Palavras-chave que indicam pedido de lembrete/alerta
  const reminderKeywords = [
    'lembre', 'lembrar', 'me avise', 'me avisa', 'avise', 'avisa',
    'me notifique', 'notifique', 'alerta', 'me alerte', 'me alerta',
    'me mande', 'me manda', 'mande', 'manda', 'me envie', 'envie',
    'me fale', 'me fala', 'fale', 'fala antes'
  ]
  
  // Verifica se está pedindo lembrete de um compromisso EXISTENTE
  // IMPORTANTE: Só bloqueia se mencionar "dessa agenda", "desse compromisso", etc
  // Se mencionar horário + título novo = é novo compromisso, não pedido de lembrete
  const hasReminderKeyword = reminderKeywords.some(keyword => 
    lowerMessage.includes(keyword)
  )
  
  // Indicadores de que está se referindo a um compromisso EXISTENTE
  const existingAppointmentIndicators = [
    'dessa agenda', 'desse compromisso', 'deste compromisso',
    'dessa reunião', 'desse evento', 'deste evento',
    'dela', 'dele', 'disso', 'desse', 'desta'
  ]
  
  // Verifica se menciona compromisso existente por título
  const mentionsExistingByTitle = existingAppointments?.some(apt => {
    const aptTitle = apt.title.toLowerCase()
    // Verifica se a mensagem menciona o título do compromisso existente
    return lowerMessage.includes(aptTitle) && aptTitle.length > 3
  })
  
  // Só bloqueia se:
  // 1. Tem palavra de lembrete E
  // 2. (Menciona compromisso existente OU tem indicador de referência a algo existente) E
  // 3. NÃO tem dados de novo compromisso (título + horário)
  if (hasReminderKeyword && !hasNewAppointmentData) {
    const hasExistingReference = existingAppointmentIndicators.some(indicator => 
      lowerMessage.includes(indicator)
    ) || mentionsExistingByTitle
    
    // Se tem referência a existente E não tem dados de novo compromisso
    if (hasExistingReference) {
      console.log('analyzeAppointmentContext - Pedido de lembrete detectado, bloqueando criação')
      return {
        shouldProceed: false,
        message: `😊 Não precisa se preocupar! O sistema já envia lembretes automáticos para todos os seus compromissos! 📅\n\n` +
          `Você receberá avisos:\n` +
          `• ⏰ 1 hora antes\n` +
          `• ⏰ 30 minutos antes\n` +
          `• ⏰ 10 minutos antes\n\n` +
          `Assim você nunca perde um compromisso! 😉`,
        reason: 'user_asking_for_existing_feature',
        suggestedAction: 'explain_reminder_system'
      }
    }
    // Se tem palavra de lembrete mas tem dados de novo compromisso, deixa criar
  }
  
  // Verifica se está tentando criar compromisso duplicado
  // IMPORTANTE: Só bloqueia se for EXATAMENTE o mesmo (mesmo título E mesmo horário)
  // Permite múltiplos compromissos com mesmo título em horários diferentes
  if (extractedData?.title && extractedData?.scheduled_at && existingAppointments) {
    const newTitle = extractedData.title.toLowerCase().trim()
    const newDate = new Date(extractedData.scheduled_at)
    
    // Verifica se já existe compromisso com mesmo título E mesmo horário (dentro de 30 minutos)
    const exactDuplicate = existingAppointments.find(apt => {
      const aptTitle = apt.title.toLowerCase().trim()
      const aptDate = new Date(apt.scheduled_at)
      
      // Títulos muito similares (mesma palavra principal)
      const titlesMatch = aptTitle === newTitle || 
                         (aptTitle.includes(newTitle) && newTitle.length > 3) ||
                         (newTitle.includes(aptTitle) && aptTitle.length > 3)
      
      if (!titlesMatch) return false
      
      // Verifica se é o mesmo horário (dentro de 30 minutos)
      const diffMinutes = Math.abs(newDate.getTime() - aptDate.getTime()) / (1000 * 60)
      
      // Se é mesmo título E mesmo horário (dentro de 30min) = duplicata exata
      if (diffMinutes < 30) {
        return true
      }
      
      return false
    })
    
    if (exactDuplicate) {
      const aptDate = new Date(exactDuplicate.scheduled_at)
      return {
        shouldProceed: false,
        message: `🤔 Você já tem um compromisso idêntico agendado!\n\n` +
          `📅 *${exactDuplicate.title}*\n` +
          `🕐 ${aptDate.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}\n\n` +
          `Deseja mesmo criar outro compromisso igual? Se quiser, posso criar! 😊`,
        reason: 'exact_duplicate',
        suggestedAction: 'ask_confirmation'
      }
    }
    
    // Se tem mesmo título mas horário diferente, permite (ex: "salão 8h" e "salão 9h")
    // Não bloqueia, deixa criar normalmente
  }
  
  return {
    shouldProceed: true
  }
}

/**
 * Analisa se uma mensagem está pedindo algo que o sistema já faz automaticamente
 * IMPORTANTE: Só bloqueia se for claramente uma pergunta sobre funcionalidade
 * Não bloqueia criação de compromissos que mencionam essas palavras
 */
export function analyzeSystemFeaturesRequest(message: string): ContextAnalysis {
  const lowerMessage = message.toLowerCase()
  
  // Verifica se é uma PERGUNTA sobre funcionalidade (não uma ação)
  const isQuestion = lowerMessage.includes('?') || 
                    lowerMessage.startsWith('como') ||
                    lowerMessage.startsWith('pode') ||
                    lowerMessage.startsWith('consegue') ||
                    lowerMessage.startsWith('você pode') ||
                    lowerMessage.startsWith('vc pode')
  
  // Mapeamento de funcionalidades do sistema
  const systemFeatures = [
    {
      keywords: ['lembre', 'lembrar', 'avise', 'avisa', 'alerta', 'notifique'],
      feature: 'lembretes automáticos',
      explanation: 'O sistema já envia lembretes automáticos 1h, 30min e 10min antes de todos os compromissos! 📅⏰'
    },
    {
      keywords: ['categoria', 'categorizar', 'classificar'],
      feature: 'categorização automática',
      explanation: 'O sistema já categoriza automaticamente seus gastos baseado na descrição! 🏷️'
    },
    {
      keywords: ['resumo', 'relatório', 'estatística'],
      feature: 'relatórios',
      explanation: 'Você pode pedir relatórios a qualquer momento! Basta perguntar "quanto gastei este mês?" ou "me mostre um relatório" 📊'
    }
  ]
  
  for (const feature of systemFeatures) {
    if (feature.keywords.some(keyword => lowerMessage.includes(keyword))) {
      // Só bloqueia se for claramente uma PERGUNTA sobre a funcionalidade
      // Não bloqueia se for criação de compromisso (ex: "tenho salão às 9h")
      // Verifica se tem indicadores de que é pergunta E não é criação de compromisso
      const hasAppointmentKeywords = lowerMessage.includes('tenho') ||
                                    lowerMessage.includes('tenho') ||
                                    lowerMessage.includes('marcar') ||
                                    lowerMessage.includes('agendar') ||
                                    lowerMessage.includes('reunião') ||
                                    lowerMessage.includes('consulta') ||
                                    lowerMessage.includes('compromisso') ||
                                    /\d{1,2}h/.test(lowerMessage) // Tem horário
      
      // Se é pergunta E não parece ser criação de compromisso
      if (isQuestion && !hasAppointmentKeywords) {
        return {
          shouldProceed: false,
          message: `💡 ${feature.explanation}\n\n` +
            `Não precisa fazer nada, o sistema cuida disso automaticamente! 😊`,
          reason: 'explaining_system_feature',
          suggestedAction: 'inform_user'
        }
      }
      // Se tem palavras de funcionalidade mas parece ser criação de compromisso, deixa passar
    }
  }
  
  return {
    shouldProceed: true
  }
}

/**
 * Analisa se o usuário está apenas conversando ou realmente quer uma ação
 */
export function analyzeConversationalIntent(message: string): ContextAnalysis {
  const lowerMessage = message.toLowerCase()
  
  // Saudações e conversas casuais
  const casualPhrases = [
    'obrigado', 'obrigada', 'valeu', 'vlw', 'ok', 'okay', 'tudo bem',
    'beleza', 'show', 'legal', 'bacana', 'top', 'perfeito', 'ótimo',
    'entendi', 'entendido', 'ok entendi', 'beleza entendi'
  ]
  
  if (casualPhrases.some(phrase => lowerMessage === phrase || lowerMessage.startsWith(phrase + ' '))) {
    return {
      shouldProceed: false,
      message: '😊 De nada! Estou aqui sempre que precisar!',
      reason: 'casual_conversation',
      suggestedAction: 'friendly_response'
    }
  }
  
  // Perguntas sobre o sistema
  const systemQuestions = [
    'o que você faz', 'o que voce faz', 'o que vc faz',
    'o que você pode fazer', 'o que voce pode fazer',
    'quais suas funções', 'quais suas funcoes',
    'como funciona', 'como funciona o sistema'
  ]
  
  if (systemQuestions.some(question => lowerMessage.includes(question))) {
    return {
      shouldProceed: false,
      message: `🤖 *O que eu posso fazer por você:*\n\n` +
        `💰 *Registrar gastos e receitas*\n` +
        `• "Gastei 50 reais de gasolina"\n` +
        `• "Recebi 2000 de salário"\n\n` +
        `📅 *Agendar compromissos*\n` +
        `• "Reunião amanhã às 10h"\n` +
        `• "Consulta médica segunda às 14h"\n\n` +
        `📊 *Consultar informações*\n` +
        `• "Quanto gastei este mês?"\n` +
        `• "Quanto gasto de combustível?"\n` +
        `• "Me mostre meus compromissos"\n\n` +
        `📈 *Gerar relatórios*\n` +
        `• "Me mostre um relatório"\n` +
        `• "Resumo financeiro"\n\n` +
        `🖼️ *Processar comprovantes*\n` +
        `• Envie uma foto do comprovante\n\n` +
        `🎤 *Entender áudios*\n` +
        `• Envie um áudio com suas informações\n\n` +
        `⏰ *Lembretes automáticos*\n` +
        `• Todos os compromissos recebem lembretes 1h, 30min e 10min antes!`,
      reason: 'system_question',
      suggestedAction: 'explain_capabilities'
    }
  }
  
  return {
    shouldProceed: true
  }
}
