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
  
  // Verifica se está pedindo lembrete
  const isAskingForReminder = reminderKeywords.some(keyword => 
    lowerMessage.includes(keyword)
  )
  
  if (isAskingForReminder) {
    // Verifica se menciona um compromisso existente
    const hasAppointmentReference = existingAppointments?.some(apt => 
      lowerMessage.includes(apt.title.toLowerCase()) ||
      lowerMessage.includes('dessa agenda') ||
      lowerMessage.includes('desse compromisso') ||
      lowerMessage.includes('deste compromisso')
    )
    
    if (hasAppointmentReference || lowerMessage.includes('dessa') || lowerMessage.includes('desse')) {
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
  }
  
  // Verifica se está tentando criar compromisso duplicado
  if (extractedData?.title && existingAppointments) {
    const similarAppointment = existingAppointments.find(apt => {
      const aptTitle = apt.title.toLowerCase()
      const newTitle = extractedData.title.toLowerCase()
      
      // Verifica similaridade (títulos muito parecidos)
      return aptTitle.includes(newTitle) || 
             newTitle.includes(aptTitle) ||
             (aptTitle.length > 5 && newTitle.length > 5 && 
              aptTitle.substring(0, 5) === newTitle.substring(0, 5))
    })
    
    if (similarAppointment) {
      const aptDate = new Date(similarAppointment.scheduled_at)
      const newDate = extractedData.scheduled_at ? new Date(extractedData.scheduled_at) : null
      
      // Se as datas são muito próximas (mesmo dia ou próximo)
      if (newDate) {
        const diffHours = Math.abs(newDate.getTime() - aptDate.getTime()) / (1000 * 60 * 60)
        if (diffHours < 24) {
          return {
            shouldProceed: false,
            message: `🤔 Parece que você já tem um compromisso similar agendado!\n\n` +
              `📅 *${similarAppointment.title}*\n` +
              `🕐 ${aptDate.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}\n\n` +
              `Deseja mesmo criar outro compromisso? Se quiser, posso criar! 😊`,
            reason: 'possible_duplicate',
            suggestedAction: 'ask_confirmation'
          }
        }
      }
    }
  }
  
  return {
    shouldProceed: true
  }
}

/**
 * Analisa se uma mensagem está pedindo algo que o sistema já faz automaticamente
 */
export function analyzeSystemFeaturesRequest(message: string): ContextAnalysis {
  const lowerMessage = message.toLowerCase()
  
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
      // Verifica se está perguntando sobre a funcionalidade
      const isAsking = lowerMessage.includes('?') || 
                      lowerMessage.includes('como') ||
                      lowerMessage.includes('pode') ||
                      lowerMessage.includes('consegue')
      
      if (isAsking) {
        return {
          shouldProceed: false,
          message: `💡 ${feature.explanation}\n\n` +
            `Não precisa fazer nada, o sistema cuida disso automaticamente! 😊`,
          reason: 'explaining_system_feature',
          suggestedAction: 'inform_user'
        }
      }
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
