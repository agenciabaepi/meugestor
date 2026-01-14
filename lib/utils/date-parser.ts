/**
 * Utilitários para parsing de datas e horários
 */

/**
 * Timezone padrão do sistema (Brasil - America/Sao_Paulo)
 */
const BRAZIL_TIMEZONE = 'America/Sao_Paulo'

/**
 * Obtém a data/hora atual no timezone do Brasil
 */
export function getNowInBrazil(): Date {
  return new Date()
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
  
  // Cria uma data de teste no meio-dia UTC para calcular o offset do Brasil
  const testDateUTC = new Date(Date.UTC(year, month - 1, day + dayOffset, 12, 0, 0))
  
  // Obtém o horário no Brasil e em UTC para essa data
  const brazilFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: BRAZIL_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
  const utcFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  })
  
  const brazilParts = brazilFormatter.formatToParts(testDateUTC)
  const utcParts = utcFormatter.formatToParts(testDateUTC)
  
  const brazilHour = parseInt(brazilParts.find(p => p.type === 'hour')?.value || '12')
  const utcHour = parseInt(utcParts.find(p => p.type === 'hour')?.value || '12')
  
  // Calcula o offset em horas (pode ser -3 ou -2 dependendo do horário de verão)
  const offsetHours = brazilHour - utcHour
  
  // Cria a data UTC que representa o horário desejado no Brasil
  // Se queremos 15h no Brasil e o offset é -3, então em UTC seria 18h (15 - (-3) = 18)
  let utcHourTarget = hour - offsetHours
  
  // Ajusta para o próximo dia se necessário
  let utcDay = day + dayOffset
  let utcMonth = month - 1
  let utcYear = year
  
  if (utcHourTarget < 0) {
    utcHourTarget += 24
    utcDay -= 1
  } else if (utcHourTarget >= 24) {
    utcHourTarget -= 24
    utcDay += 1
  }
  
  const utcDate = new Date(Date.UTC(utcYear, utcMonth, utcDay, utcHourTarget, minute, 0, 0))
  
  return utcDate
}

/**
 * Compara duas datas considerando o timezone do Brasil
 * Retorna true se scheduledDate é no futuro em relação a now
 */
export function isFutureInBrazil(scheduledDate: Date, now: Date = getNowInBrazil()): boolean {
  // Converte ambas as datas para o mesmo formato no timezone do Brasil e compara
  const scheduledBrazil = scheduledDate.toLocaleString('en-US', {
    timeZone: BRAZIL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
  
  const nowBrazil = now.toLocaleString('en-US', {
    timeZone: BRAZIL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  })
  
  return scheduledBrazil > nowBrazil
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
    // "tenho reunião amanhã às 9h" - padrão mais específico primeiro
    /(?:tenho\s+)?(reunião|consulta|compromisso|encontro|evento)\s+amanhã\s+(?:às\s*|as\s*)?(\d{1,2})h/i,
    // "reunião amanhã às 9h"
    /(reunião|consulta|compromisso|encontro|evento)\s+amanhã\s+(?:às\s*|as\s*)?(\d{1,2})h/i,
    // "amanhã às 10h"
    /amanhã\s+(?:às\s*|as\s*)?(\d{1,2})h/i,
    // "reunião 12h", "reunião às 12h", "reunião as 12h"
    /(reunião|consulta|compromisso|encontro|evento|agendar|marcar)\s+(?:às\s*|as\s*)?(\d{1,2})h/i,
    // "12h" sozinho (assume que é compromisso)
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
  for (const pattern of patterns) {
    const match = lowerMessage.match(pattern)
    if (match) {
      // Verifica se o primeiro grupo é um título (não é número)
      if (match[1] && !match[1].match(/^\d+$/)) {
        const firstGroup = match[1].toLowerCase()
        // Ignora palavras comuns que não são títulos
        if (!['agendar', 'marcar'].includes(firstGroup)) {
          title = firstGroup.charAt(0).toUpperCase() + firstGroup.slice(1)
        }
      }
      
      // Último número é a hora (pode estar em match[1] ou match[2])
      const hourMatch = match.find(m => m && /^\d+$/.test(m))
      if (hourMatch) {
        hour = parseInt(hourMatch)
      }
      
      // Verifica se mencionou "amanhã"
      if (lowerMessage.includes('amanhã')) {
        dayOffset = 1
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
    const scheduledDate = createDateInBrazil(hour, 0, dayOffset)
    const scheduledAtISO = scheduledDate.toISOString()
    
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
