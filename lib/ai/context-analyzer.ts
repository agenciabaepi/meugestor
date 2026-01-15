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
  
  // Palavras-chave que indicam pedido de lembrete/alerta
  const reminderKeywords = [
    'lembre', 'lembrar', 'me avise', 'me avisa', 'avise', 'avisa',
    'me notifique', 'notifique', 'alerta', 'me alerte', 'me alerta',
    'me mande', 'me manda', 'mande', 'manda', 'me envie', 'envie',
    'me fale', 'me fala', 'fale', 'fala antes'
  ]
  
  // Indicadores de que está se referindo a um compromisso EXISTENTE
  const existingAppointmentIndicators = [
    'dessa agenda', 'desse compromisso', 'deste compromisso',
    'dessa reunião', 'desse evento', 'deste evento',
    'dela', 'dele', 'disso', 'desse', 'desta', 'do salão', 'da reunião'
  ]
  
  // Verifica se tem palavra de lembrete
  const hasReminderKeyword = reminderKeywords.some(keyword => 
    lowerMessage.includes(keyword)
  )
  
  // Verifica se menciona compromisso existente por título
  const mentionsExistingByTitle = existingAppointments?.some(apt => {
    const aptTitle = apt.title.toLowerCase().trim()
    if (aptTitle.length > 2 && lowerMessage.includes(aptTitle)) {
      return true
    }
    // Verifica variações normalizadas (ex: "salão" vs "salao")
    const normalizedTitle = aptTitle.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    const normalizedMessage = lowerMessage.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    return normalizedTitle.length > 2 && normalizedMessage.includes(normalizedTitle)
  })
  
  // Verifica se menciona compromisso existente por contexto temporal
  // Ex: "me lembre amanhã às 8h do salão" quando existe "salão amanhã às 9h"
  const mentionsExistingByContext = existingAppointments?.some(apt => {
    const aptTitle = apt.title.toLowerCase().trim()
    if (extractedData?.scheduled_at && aptTitle.length > 2 && lowerMessage.includes(aptTitle)) {
      const aptDate = new Date(apt.scheduled_at)
      const newDate = new Date(extractedData.scheduled_at)
      const diffDays = Math.abs((newDate.getTime() - aptDate.getTime()) / (1000 * 60 * 60 * 24))
      // Se menciona o título E a data é no mesmo dia ou próximo (dentro de 2 dias)
      return diffDays <= 2
    }
    return false
  })
  
  // Verifica se tem indicador de referência a compromisso existente
  const hasExistingReference = existingAppointmentIndicators.some(indicator => 
    lowerMessage.includes(indicator)
  ) || mentionsExistingByTitle || mentionsExistingByContext
  
  // Verifica se o título extraído é "Lembrete" ou similar
  const extractedTitle = extractedData?.title?.toLowerCase() || ''
  const isReminderTitle = extractedTitle.includes('lembrete') || 
                          extractedTitle.includes('aviso') ||
                          extractedTitle.includes('alerta') ||
                          extractedTitle === 'lembre' ||
                          extractedTitle === 'avise'
  
  // PRIORIDADE 1: Se tem palavra de lembrete E menciona compromisso existente, é pedido de lembrete
  if (hasReminderKeyword && hasExistingReference) {
    // Se título é "Lembrete" OU não tem título válido (só tem horário), é pedido de lembrete
    if (isReminderTitle || !extractedData?.title || extractedTitle.length < 3) {
      console.log('analyzeAppointmentContext - Pedido de lembrete de compromisso existente detectado')
      
      const mentionedAppointment = existingAppointments?.find(apt => {
        const aptTitle = apt.title.toLowerCase().trim()
        if (lowerMessage.includes(aptTitle) && aptTitle.length > 2) {
          return true
        }
        const normalizedTitle = aptTitle.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        const normalizedMessage = lowerMessage.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        return normalizedTitle.length > 2 && normalizedMessage.includes(normalizedTitle)
      })
      
      let responseMessage = `😊 Não precisa se preocupar! O sistema já envia lembretes automáticos para todos os seus compromissos! 📅\n\n`
      
      if (mentionedAppointment) {
        const aptDate = new Date(mentionedAppointment.scheduled_at)
        responseMessage += `Sobre o compromisso *${mentionedAppointment.title}*:\n`
        responseMessage += `🕐 ${aptDate.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}\n\n`
      }
      
      responseMessage += `Você receberá avisos:\n` +
        `• ⏰ 1 hora antes\n` +
        `• ⏰ 30 minutos antes\n` +
        `• ⏰ 10 minutos antes\n\n` +
        `Assim você nunca perde um compromisso! 😉`
      
      return {
        shouldProceed: false,
        message: responseMessage,
        reason: 'user_asking_for_existing_feature',
        suggestedAction: 'explain_reminder_system'
      }
    }
  }
  
  // PRIORIDADE 2: Se título extraído é "Lembrete" (mesmo sem referência explícita), bloqueia
  if (isReminderTitle && hasReminderKeyword) {
    console.log('analyzeAppointmentContext - Título "Lembrete" detectado, bloqueando criação')
    return {
      shouldProceed: false,
      message: `😊 Não precisa criar um compromisso de lembrete! O sistema já envia lembretes automáticos para todos os seus compromissos! 📅\n\n` +
        `Você receberá avisos:\n` +
        `• ⏰ 1 hora antes\n` +
        `• ⏰ 30 minutos antes\n` +
        `• ⏰ 10 minutos antes\n\n` +
        `Assim você nunca perde um compromisso! 😉`,
      reason: 'reminder_title_detected',
      suggestedAction: 'explain_reminder_system'
    }
  }
  
  // PRIORIDADE 3: Se tem título E horário extraídos E não é pedido de lembrete, é novo compromisso
  const hasNewAppointmentData = extractedData?.title && extractedData?.scheduled_at
  if (hasNewAppointmentData && !isReminderTitle) {
    console.log('analyzeAppointmentContext - Dados de novo compromisso detectados, permitindo criação')
    // Continua para verificar duplicatas, mas não bloqueia por pedido de lembrete
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
      return diffMinutes < 30
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
