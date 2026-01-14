/**
 * Utilitários para parsing de datas e horários
 */

/**
 * Timezone padrão do sistema (Brasil - America/Sao_Paulo)
 */
const BRAZIL_TIMEZONE = 'America/Sao_Paulo'

/**
 * Obtém a data/hora atual no timezone do Brasil
 * Retorna uma data que representa "agora" no timezone do Brasil
 */
export function getNowInBrazil(): Date {
  const now = new Date()
  
  // Obtém o horário atual no Brasil
  const brazilNow = new Intl.DateTimeFormat('en-US', {
    timeZone: BRAZIL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(now)
  
  const year = parseInt(brazilNow.find(p => p.type === 'year')?.value || '2024')
  const month = parseInt(brazilNow.find(p => p.type === 'month')?.value || '1')
  const day = parseInt(brazilNow.find(p => p.type === 'day')?.value || '1')
  const hour = parseInt(brazilNow.find(p => p.type === 'hour')?.value || '0')
  const minute = parseInt(brazilNow.find(p => p.type === 'minute')?.value || '0')
  const second = parseInt(brazilNow.find(p => p.type === 'second')?.value || '0')
  
  // Cria uma data UTC que representa esse horário no Brasil
  // Usa a mesma lógica de createDateInBrazil
  const noonUTC = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
  const brazilNoonParts = new Intl.DateTimeFormat('en-US', {
    timeZone: BRAZIL_TIMEZONE,
    hour: '2-digit',
    hour12: false
  }).formatToParts(noonUTC)
  
  const brazilNoonHour = parseInt(brazilNoonParts.find(p => p.type === 'hour')?.value || '12')
  const offsetHours = brazilNoonHour - 12
  
  let utcHourTarget = hour - offsetHours
  let utcDay = day
  let utcMonth = month - 1
  let utcYear = year
  
  if (utcHourTarget < 0) {
    utcHourTarget += 24
    utcDay -= 1
  } else if (utcHourTarget >= 24) {
    utcHourTarget -= 24
    utcDay += 1
  }
  
  const utcDate = new Date(Date.UTC(utcYear, utcMonth, utcDay, utcHourTarget, minute, second))
  
  return utcDate
}

/**
 * Obtém a hora atual no timezone do Brasil (0-23)
 */
export function getCurrentHourInBrazil(): number {
  const now = new Date()
  const brazilTimeString = now.toLocaleString('en-US', {
    timeZone: BRAZIL_TIMEZONE,
    hour: '2-digit',
    hour12: false
  })
  return parseInt(brazilTimeString)
}

/**
 * Obtém o dia da semana atual no timezone do Brasil (0 = domingo, 6 = sábado)
 */
export function getCurrentDayInBrazil(): number {
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: BRAZIL_TIMEZONE,
    weekday: 'long'
  })
  // getDay() retorna 0-6, mas precisamos ajustar
  const parts = formatter.formatToParts(now)
  const weekday = parts.find(p => p.type === 'weekday')?.value
  
  // Mapeia weekday name para número (Sunday = 0, Monday = 1, etc)
  const weekdayMap: Record<string, number> = {
    'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
    'Thursday': 4, 'Friday': 5, 'Saturday': 6
  }
  
  return weekdayMap[weekday || 'Sunday'] || 0
}

/**
 * Cria uma data no timezone do Brasil com a hora especificada
 * @param hour Hora (0-23) no horário do Brasil
 * @param minute Minuto (0-59), padrão 0
 * @param dayOffset Offset de dias a partir de hoje, padrão 0
 */
export function createDateInBrazil(hour: number, minute: number = 0, dayOffset: number = 0): Date {
  const now = new Date()
  
  // Obtém a data atual no timezone do Brasil
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: BRAZIL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  
  const parts = formatter.formatToParts(now)
  const year = parseInt(parts.find(p => p.type === 'year')?.value || '2024')
  const month = parseInt(parts.find(p => p.type === 'month')?.value || '1')
  const day = parseInt(parts.find(p => p.type === 'day')?.value || '1')
  
  const targetDay = day + dayOffset
  
  // Abordagem simplificada: cria uma data ISO string no formato brasileiro
  // e depois converte para Date. Isso garante que o horário seja interpretado
  // corretamente no timezone do Brasil.
  
  // Cria string no formato: YYYY-MM-DDTHH:mm:00
  const dateString = `${year}-${String(month).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`
  
  // Cria uma data de teste para descobrir o offset do Brasil para essa data específica
  // Usa meio-dia UTC como referência
  const testUTC = new Date(Date.UTC(year, month - 1, targetDay, 12, 0, 0))
  const testBrazilParts = new Intl.DateTimeFormat('en-US', {
    timeZone: BRAZIL_TIMEZONE,
    hour: '2-digit',
    hour12: false
  }).formatToParts(testUTC)
  
  const testBrazilHour = parseInt(testBrazilParts.find(p => p.type === 'hour')?.value || '12')
  const offsetHours = testBrazilHour - 12 // Geralmente -3 ou -2
  
  // Calcula a hora UTC correspondente
  let utcHour = hour - offsetHours
  
  // Ajusta para o próximo dia se necessário
  let utcDay = targetDay
  if (utcHour < 0) {
    utcHour += 24
    utcDay -= 1
  } else if (utcHour >= 24) {
    utcHour -= 24
    utcDay += 1
  }
  
  // Cria a data UTC
  let utcDate = new Date(Date.UTC(year, month - 1, utcDay, utcHour, minute, 0, 0))
  
  // Verifica e ajusta se necessário (máximo 2 tentativas)
  for (let attempt = 0; attempt < 2; attempt++) {
    const verifyParts = new Intl.DateTimeFormat('en-US', {
      timeZone: BRAZIL_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).formatToParts(utcDate)
    
    const verifyYear = parseInt(verifyParts.find(p => p.type === 'year')?.value || '0')
    const verifyMonth = parseInt(verifyParts.find(p => p.type === 'month')?.value || '0')
    const verifyDay = parseInt(verifyParts.find(p => p.type === 'day')?.value || '0')
    const verifyHour = parseInt(verifyParts.find(p => p.type === 'hour')?.value || '0')
    const verifyMinute = parseInt(verifyParts.find(p => p.type === 'minute')?.value || '0')
    
    if (verifyYear === year && verifyMonth === month && verifyDay === targetDay && 
        verifyHour === hour && verifyMinute === minute) {
      break
    }
    
    // Ajusta
    const hourDiff = hour - verifyHour
    const minuteDiff = minute - verifyMinute
    const dayDiff = targetDay - verifyDay
    
    utcDate = new Date(utcDate.getTime() + 
      (hourDiff * 60 + minuteDiff) * 60 * 1000 + 
      dayDiff * 24 * 60 * 60 * 1000)
  }
  
  // Verificação final para logs
  const finalParts = new Intl.DateTimeFormat('en-US', {
    timeZone: BRAZIL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(utcDate)
  
  const finalHour = parseInt(finalParts.find(p => p.type === 'hour')?.value || '0')
  const finalMinute = parseInt(finalParts.find(p => p.type === 'minute')?.value || '0')
  const finalDay = parseInt(finalParts.find(p => p.type === 'day')?.value || '0')
  
  console.log('createDateInBrazil - Criando data:', {
    input: { hour, minute, dayOffset },
    target: `${targetDay}/${month}/${year} ${hour}:${minute}`,
    offsetHours,
    utcDate: utcDate.toISOString(),
    resultBrazil: `${finalDay}/${month}/${year} ${finalHour}:${finalMinute}`,
    match: finalHour === hour && finalMinute === minute && finalDay === targetDay
  })
  
  return utcDate
}

/**
 * Compara duas datas considerando o timezone do Brasil
 * Retorna true se scheduledDate é no futuro ou presente (permite agendamentos no mesmo dia)
 * Permite uma margem generosa para compensar diferenças de timezone e processamento
 */
export function isFutureInBrazil(scheduledDate: Date, now: Date = new Date()): boolean {
  // Converte ambas as datas para o timezone do Brasil para comparação
  const scheduledBrazil = new Intl.DateTimeFormat('en-US', {
    timeZone: BRAZIL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(scheduledDate)
  
  const nowBrazil = new Intl.DateTimeFormat('en-US', {
    timeZone: BRAZIL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(now)
  
  // Extrai componentes
  const scheduledYear = parseInt(scheduledBrazil.find(p => p.type === 'year')?.value || '0')
  const scheduledMonth = parseInt(scheduledBrazil.find(p => p.type === 'month')?.value || '0')
  const scheduledDay = parseInt(scheduledBrazil.find(p => p.type === 'day')?.value || '0')
  const scheduledHour = parseInt(scheduledBrazil.find(p => p.type === 'hour')?.value || '0')
  const scheduledMinute = parseInt(scheduledBrazil.find(p => p.type === 'minute')?.value || '0')
  
  const nowYear = parseInt(nowBrazil.find(p => p.type === 'year')?.value || '0')
  const nowMonth = parseInt(nowBrazil.find(p => p.type === 'month')?.value || '0')
  const nowDay = parseInt(nowBrazil.find(p => p.type === 'day')?.value || '0')
  const nowHour = parseInt(nowBrazil.find(p => p.type === 'hour')?.value || '0')
  const nowMinute = parseInt(nowBrazil.find(p => p.type === 'minute')?.value || '0')
  
  // Compara ano
  if (scheduledYear > nowYear) {
    console.log('isFutureInBrazil - Resultado: FUTURO (ano diferente)')
    return true
  }
  if (scheduledYear < nowYear) {
    console.log('isFutureInBrazil - Resultado: PASSADO (ano diferente)')
    return false
  }
  
  // Compara mês
  if (scheduledMonth > nowMonth) {
    console.log('isFutureInBrazil - Resultado: FUTURO (mês diferente)')
    return true
  }
  if (scheduledMonth < nowMonth) {
    console.log('isFutureInBrazil - Resultado: PASSADO (mês diferente)')
    return false
  }
  
  // Compara dia
  if (scheduledDay > nowDay) {
    console.log('isFutureInBrazil - Resultado: FUTURO (dia diferente)')
    return true
  }
  if (scheduledDay < nowDay) {
    console.log('isFutureInBrazil - Resultado: PASSADO (dia diferente)')
    return false
  }
  
  // Mesmo dia - compara hora e minuto
  // Permite margem de 60 minutos para compensar diferenças de timezone e processamento
  const scheduledTotalMinutes = scheduledHour * 60 + scheduledMinute
  const nowTotalMinutes = nowHour * 60 + nowMinute
  const diferencaMinutos = scheduledTotalMinutes - nowTotalMinutes
  
  const isFuture = diferencaMinutos >= -60 // Margem de 60 minutos
  
  console.log('isFutureInBrazil - Comparação (mesmo dia):', {
    scheduled: `${scheduledDay}/${scheduledMonth}/${scheduledYear} ${scheduledHour}:${String(scheduledMinute).padStart(2, '0')}`,
    now: `${nowDay}/${nowMonth}/${nowYear} ${nowHour}:${String(nowMinute).padStart(2, '0')}`,
    diferencaMinutos,
    isFuture,
    permitido: isFuture ? 'SIM' : 'NÃO'
  })
  
  return isFuture
}

/**
 * Processa uma data/hora extraída pela IA e converte para ISO 8601
 * Se a data não tiver horário, assume horário atual ou padrão
 */
export function parseScheduledAt(scheduledAt: string | undefined, title?: string): string | null {
  if (!scheduledAt) {
    return null
  }

  try {
    // Se já está em formato ISO válido, retorna
    const date = new Date(scheduledAt)
    if (!isNaN(date.getTime())) {
      return date.toISOString()
    }

    // Tenta parsear como string de data
    const parsed = new Date(scheduledAt)
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString()
    }

    return null
  } catch (error) {
    console.error('Erro ao parsear data:', error)
    return null
  }
}

/**
 * Processa título e horário de uma mensagem para criar compromisso
 * Ex: "reunião 12h" -> { title: "Reunião", scheduled_at: "hoje às 12:00" }
 */
export function extractAppointmentFromMessage(message: string): {
  title: string | null
  scheduledAt: string | null
} {
  console.log('extractAppointmentFromMessage - Mensagem recebida:', message)
  const lowerMessage = message.toLowerCase().trim()
  const now = getNowInBrazil()

  // Padrões comuns
  const patterns = [
    // "marca uma reunião pra mim às 20h de hoje" - padrão mais específico (captura hora no grupo 1)
    /(?:marca|marcar|agenda|agendar)\s+(?:uma\s+)?(?:reunião|consulta|compromisso|encontro|evento)\s+(?:pra\s+)?(?:mim|eu)?\s+(?:às\s*|as\s*)?(\d{1,2})h\s+(?:de\s+)?hoje/i,
    // "marca reunião às 20h de hoje" (captura hora no grupo 1)
    /(?:marca|marcar|agenda|agendar)\s+(?:reunião|consulta|compromisso|encontro|evento)\s+(?:às\s*|as\s*)?(\d{1,2})h\s+(?:de\s+)?hoje/i,
    // "marca reunião pra mim às 20h" (captura hora no grupo 1)
    /(?:marca|marcar|agenda|agendar)\s+(?:uma\s+)?(?:reunião|consulta|compromisso|encontro|evento)\s+(?:pra\s+)?(?:mim|eu)?\s+(?:às\s*|as\s*)?(\d{1,2})h/i,
    // "tenho reunião hoje às 18h" - padrão mais específico primeiro
    /(?:tenho\s+)?(reunião|consulta|compromisso|encontro|evento)\s+hoje\s+(?:às\s*|as\s*)?(\d{1,2})h/i,
    // "reunião hoje às 18h"
    /(reunião|consulta|compromisso|encontro|evento)\s+hoje\s+(?:às\s*|as\s*)?(\d{1,2})h/i,
    // "hoje às 18h"
    /hoje\s+(?:às\s*|as\s*)?(\d{1,2})h/i,
    // "tenho reunião amanhã às 9h" - padrão mais específico primeiro
    /(?:tenho\s+)?(reunião|consulta|compromisso|encontro|evento)\s+amanhã\s+(?:às\s*|as\s*)?(\d{1,2})h/i,
    // "reunião amanhã às 9h"
    /(reunião|consulta|compromisso|encontro|evento)\s+amanhã\s+(?:às\s*|as\s*)?(\d{1,2})h/i,
    // "amanhã às 10h"
    /amanhã\s+(?:às\s*|as\s*)?(\d{1,2})h/i,
    // "reunião 12h", "reunião às 12h", "reunião as 12h" (assume hoje se não mencionar dia)
    /(reunião|consulta|compromisso|encontro|evento|agendar|marcar)\s+(?:às\s*|as\s*)?(\d{1,2})h/i,
    // "12h" sozinho (assume que é compromisso hoje)
    /^(\d{1,2})h$/i,
    // "reunião às 12h", "consulta as 14h"
    /(reunião|consulta|compromisso|encontro|evento)\s+(?:às|as)\s+(\d{1,2})h/i,
    // "segunda às 14h", "terça às 9h"
    /(segunda|terça|quarta|quinta|sexta|sábado|domingo)\s+(?:às|as)\s+(\d{1,2})h/i,
    // "tenho reunião agora 15h" ou "reunião agora 15h"
    /(?:tenho\s+)?(reunião|consulta|compromisso|encontro|evento)?\s*(?:agora\s+)?(\d{1,2})h/i,
  ]

  let title: string | null = null
  let hour: number | null = null
  let dayOffset = 0

  // Tenta encontrar padrões
  for (let i = 0; i < patterns.length; i++) {
    const pattern = patterns[i]
    const match = lowerMessage.match(pattern)
    if (match) {
      console.log(`extractAppointmentFromMessage - Padrão ${i} encontrado:`, {
        pattern: pattern.toString(),
        match: match[0],
        groups: match.slice(1)
      })
      
      // Verifica se o primeiro grupo é um título (não é número)
      if (match[1] && !match[1].match(/^\d+$/)) {
        const firstGroup = match[1].toLowerCase()
        // Ignora palavras comuns que não são títulos
        if (!['agendar', 'marcar'].includes(firstGroup)) {
          title = firstGroup.charAt(0).toUpperCase() + firstGroup.slice(1)
          console.log(`extractAppointmentFromMessage - Título extraído: ${title}`)
        }
      }
      
      // Último número é a hora (pode estar em match[1] ou match[2])
      const hourMatch = match.find(m => m && /^\d+$/.test(m))
      if (hourMatch) {
        hour = parseInt(hourMatch)
        console.log(`extractAppointmentFromMessage - Hora extraída: ${hour}h`)
      }
      
      // Verifica se mencionou "hoje" (garante que é hoje mesmo)
      // IMPORTANTE: Verifica "hoje" ANTES de verificar "amanhã" para evitar conflitos
      if (lowerMessage.includes('hoje')) {
        dayOffset = 0
        console.log('extractAppointmentFromMessage - Detectado "hoje", dayOffset = 0')
      }
      // Verifica se mencionou "amanhã" (só se não mencionou "hoje")
      else if (lowerMessage.includes('amanhã')) {
        dayOffset = 1
        console.log('extractAppointmentFromMessage - Detectado "amanhã", dayOffset = 1')
      }
      // Se não mencionou nem "hoje" nem "amanhã" nem dia da semana, assume hoje
      else {
        const daysOfWeek = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
        const hasDayOfWeek = daysOfWeek.some(day => lowerMessage.includes(day))
        if (!hasDayOfWeek) {
          console.log('extractAppointmentFromMessage - Nenhum dia mencionado, assumindo hoje (dayOffset = 0)')
          dayOffset = 0
        }
      }
      
      // Verifica dia da semana
      const daysOfWeek = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
      for (let i = 0; i < daysOfWeek.length; i++) {
        if (lowerMessage.includes(daysOfWeek[i])) {
          const currentDay = getCurrentDayInBrazil()
          const targetDay = i
          dayOffset = (targetDay - currentDay + 7) % 7
          // Usa getCurrentHourInBrazil() para verificar se já passou o horário hoje
          const nowBrazilHours = getCurrentHourInBrazil()
          if (dayOffset === 0 && hour !== null && nowBrazilHours >= hour) {
            dayOffset = 7 // Se já passou o horário hoje, agenda para próxima semana
          }
          break
        }
      }
      
      if (hour !== null) {
        break
      }
    }
  }

  // Se não encontrou título, tenta extrair da mensagem
  if (!title) {
    const titleMatch = lowerMessage.match(/^(.*?)(?:\s+(?:às|as|para|em|agora)\s+|\s+\d)/)
    if (titleMatch) {
      title = titleMatch[1].trim()
      if (title.length > 0) {
        title = title.charAt(0).toUpperCase() + title.slice(1)
      }
    } else {
      title = 'Compromisso'
    }
  }

  // Se encontrou hora, cria data no timezone do Brasil
  if (hour !== null) {
    console.log('extractAppointmentFromMessage - Dados extraídos:', {
      title,
      hour,
      dayOffset,
      lowerMessage
    })
    // Cria a data no timezone do Brasil
    console.log('extractAppointmentFromMessage - Criando data com:', { hour, minute: 0, dayOffset })
    const scheduledDate = createDateInBrazil(hour, 0, dayOffset)
    
    // Verifica se a data criada está correta
    const verifyParts = new Intl.DateTimeFormat('en-US', {
      timeZone: BRAZIL_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).formatToParts(scheduledDate)
    
    const verifyHour = parseInt(verifyParts.find(p => p.type === 'hour')?.value || '0')
    const verifyDay = parseInt(verifyParts.find(p => p.type === 'day')?.value || '0')
    
    console.log('extractAppointmentFromMessage - Data criada e verificada:', {
      input: { hour, dayOffset },
      createdDateISO: scheduledDate.toISOString(),
      createdDateLocal: scheduledDate.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
      verified: { hour: verifyHour, day: verifyDay },
      match: verifyHour === hour
    })
    
    // Se a hora não está correta, tenta ajustar
    let finalDate = scheduledDate
    if (verifyHour !== hour) {
      console.warn('extractAppointmentFromMessage - Hora não corresponde! Tentando ajustar...')
      // Ajusta a diferença
      const hourDiff = hour - verifyHour
      finalDate = new Date(scheduledDate.getTime() + hourDiff * 60 * 60 * 1000)
      console.log('extractAppointmentFromMessage - Data ajustada:', {
        adjustedDateISO: finalDate.toISOString(),
        adjustedDateLocal: finalDate.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
      })
    }
    
    const scheduledAtISO = finalDate.toISOString()
    
    console.log('extractAppointmentFromMessage - Data criada:', {
      scheduledAt: scheduledAtISO,
      scheduledDateLocal: scheduledDate.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
    })
    
    return {
      title,
      scheduledAt: scheduledAtISO,
    }
  }

  console.log('extractAppointmentFromMessage - Nenhuma hora encontrada na mensagem')
  return { title, scheduledAt: null }
}
