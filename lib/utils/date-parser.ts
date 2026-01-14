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
  
  // Abordagem mais simples: usa busca binária para encontrar a data UTC correta
  // Começa com uma estimativa (Brasil geralmente é UTC-3)
  let utcHourEstimate = hour + 3
  let utcDate = new Date(Date.UTC(year, month - 1, targetDay, utcHourEstimate, minute, 0, 0))
  
  // Verifica e ajusta se necessário
  const verificationParts = new Intl.DateTimeFormat('en-US', {
    timeZone: BRAZIL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(utcDate)
  
  const verifiedHour = parseInt(verificationParts.find(p => p.type === 'hour')?.value || '0')
  const verifiedMinute = parseInt(verificationParts.find(p => p.type === 'minute')?.value || '0')
  const verifiedDay = parseInt(verificationParts.find(p => p.type === 'day')?.value || String(targetDay))
  
  // Se não está correto, ajusta
  if (verifiedHour !== hour || verifiedMinute !== minute || verifiedDay !== targetDay) {
    const hourDiff = hour - verifiedHour
    const minuteDiff = minute - verifiedMinute
    const dayDiff = targetDay - verifiedDay
    
    // Ajusta a data UTC
    utcDate = new Date(utcDate.getTime() + 
      (hourDiff * 60 + minuteDiff) * 60 * 1000 + 
      dayDiff * 24 * 60 * 60 * 1000)
  }
  
  console.log('createDateInBrazil - Criando data:', {
    hour,
    minute,
    dayOffset,
    targetDay: `${targetDay}/${month}/${year}`,
    utcDate: utcDate.toISOString(),
    utcDateLocal: utcDate.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
    verified: `${verifiedDay}/${month}/${year} ${verifiedHour}:${verifiedMinute}`
  })
  
  return utcDate
}

/**
 * Compara duas datas considerando o timezone do Brasil
 * Retorna true se scheduledDate é no futuro ou presente (permite agendamentos no mesmo dia)
 * Permite uma margem de 5 minutos para agendamentos muito próximos e compensar diferenças de timezone
 */
export function isFutureInBrazil(scheduledDate: Date, now: Date = new Date()): boolean {
  // Converte ambas as datas para o timezone do Brasil e compara diretamente
  const scheduledBrazil = new Intl.DateTimeFormat('en-US', {
    timeZone: BRAZIL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(scheduledDate)
  
  const nowBrazil = new Intl.DateTimeFormat('en-US', {
    timeZone: BRAZIL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(now)
  
  // Extrai valores
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
  
  // Compara ano, mês, dia, hora e minuto
  // Permite margem de 5 minutos para compensar diferenças de processamento
  if (scheduledYear > nowYear) return true
  if (scheduledYear < nowYear) return false
  
  if (scheduledMonth > nowMonth) return true
  if (scheduledMonth < nowMonth) return false
  
  if (scheduledDay > nowDay) return true
  if (scheduledDay < nowDay) return false
  
  // Mesmo dia - compara hora e minuto
  const scheduledTotalMinutes = scheduledHour * 60 + scheduledMinute
  const nowTotalMinutes = nowHour * 60 + nowMinute
  
  // Permite margem de 5 minutos
  const diferencaMinutos = scheduledTotalMinutes - nowTotalMinutes
  
  console.log('isFutureInBrazil - Comparação:', {
    scheduled: `${scheduledDay}/${scheduledMonth}/${scheduledYear} ${scheduledHour}:${scheduledMinute}`,
    now: `${nowDay}/${nowMonth}/${nowYear} ${nowHour}:${nowMinute}`,
    diferencaMinutos,
    isFuture: diferencaMinutos >= -5
  })
  
  return diferencaMinutos >= -5
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
      
      // Verifica se mencionou "hoje" (garante que é hoje mesmo)
      if (lowerMessage.includes('hoje')) {
        dayOffset = 0
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
