/**
 * Utilitários para parsing de datas e horários
 */

/**
 * Timezone padrão do sistema (Brasil - America/Sao_Paulo)
 */
const BRAZIL_TIMEZONE = 'America/Sao_Paulo'

function parseTimeString(time: string | null | undefined): { hour: number; minute: number } | null {
  if (!time) return null
  const t = time.trim().toLowerCase()

  // HH:mm
  const hhmm = t.match(/^(\d{1,2}):(\d{2})$/)
  if (hhmm) {
    const hour = Number(hhmm[1])
    const minute = Number(hhmm[2])
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) return { hour, minute }
    return null
  }

  // "15h" or "15h30"
  const h = t.match(/^(\d{1,2})h(?:(\d{2}))?$/)
  if (h) {
    const hour = Number(h[1])
    const minute = h[2] ? Number(h[2]) : 0
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) return { hour, minute }
    return null
  }

  // "15" (assume hour)
  const onlyHour = t.match(/^(\d{1,2})$/)
  if (onlyHour) {
    const hour = Number(onlyHour[1])
    if (hour >= 0 && hour <= 23) return { hour, minute: 0 }
  }

  return null
}

function getCurrentDayInBrazilFrom(baseDate: Date): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: BRAZIL_TIMEZONE,
    weekday: 'long'
  })
  const parts = formatter.formatToParts(baseDate)
  const weekday = parts.find(p => p.type === 'weekday')?.value
  const weekdayMap: Record<string, number> = {
    'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
    'Thursday': 4, 'Friday': 5, 'Saturday': 6
  }
  return weekdayMap[weekday || 'Sunday'] || 0
}

function resolveDayOffsetFromPeriodo(periodo: string | null | undefined, baseDate: Date): number | null {
  if (!periodo) return null
  const p = periodo.trim().toLowerCase()
  if (p === 'hoje') return 0
  if (p === 'amanhã' || p === 'amanha') return 1
  if (p === 'ontem') return -1

  const daysOfWeek = ['domingo', 'segunda', 'terça', 'terca', 'quarta', 'quinta', 'sexta', 'sábado', 'sabado']
  const idx = daysOfWeek.indexOf(p)
  if (idx !== -1) {
    const targetDay = idx <= 6 ? idx : (idx === 7 ? 6 : 6) // 'sábado'/'sabado' -> 6
    const currentDay = getCurrentDayInBrazilFrom(baseDate)
    return (targetDay - currentDay + 7) % 7
  }

  return null
}

/**
 * Converte tempo relativo + hora (HH:mm / 15h / 15h30) em ISO (UTC instant).
 * O backend é o ÚNICO responsável por gerar ISO.
 *
 * Exemplo (base 15/01/2026 Brasil):
 * resolveScheduledAt('amanhã', '15:00') -> 2026-01-16T18:00:00.000Z (equivalente a 15h -03)
 */
export function resolveScheduledAt(
  periodo: string | null | undefined,
  horario: string | null | undefined,
  timezone: string = BRAZIL_TIMEZONE,
  baseDate: Date = new Date()
): string | null {
  // Hoje o sistema é Brasil; se vier outro timezone, ainda mantém comportamento estável.
  if (timezone !== BRAZIL_TIMEZONE) {
    console.warn('resolveScheduledAt - timezone diferente do Brasil, usando America/Sao_Paulo:', timezone)
  }

  const hm = parseTimeString(horario)
  if (!hm) return null

  const dayOffset = resolveDayOffsetFromPeriodo(periodo, baseDate)
  if (dayOffset === null) return null

  const date = createDateInBrazil(hm.hour, hm.minute, dayOffset, baseDate)
  if (isNaN(date.getTime())) return null
  return date.toISOString()
}

/**
 * Aplica um novo horário ao MESMO dia (Brasil) de um ISO existente.
 * Útil para correções: "na verdade é às 22h" (mantém a data, muda só a hora).
 */
export function applyTimeToISOInBrazil(
  baseIso: string | null | undefined,
  horario: string | null | undefined,
  timezone: string = BRAZIL_TIMEZONE
): string | null {
  if (!baseIso) return null
  const baseDate = new Date(baseIso)
  if (isNaN(baseDate.getTime())) return null

  if (timezone !== BRAZIL_TIMEZONE) {
    console.warn('applyTimeToISOInBrazil - timezone diferente do Brasil, usando America/Sao_Paulo:', timezone)
  }

  const hm = parseTimeString(horario)
  if (!hm) return null

  const date = createDateInBrazil(hm.hour, hm.minute, 0, baseDate)
  if (isNaN(date.getTime())) return null
  return date.toISOString()
}

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
 * Obtém o início do dia atual no timezone do Brasil (00:00:00)
 * Retorna uma string no formato YYYY-MM-DD para uso em queries
 */
export function getTodayStartInBrazil(): string {
  const now = new Date()
  const brazilDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: BRAZIL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now)
  
  return brazilDate // Retorna no formato YYYY-MM-DD
}

/**
 * Obtém o fim do dia atual no timezone do Brasil (23:59:59)
 * Retorna uma string no formato YYYY-MM-DD para uso em queries
 */
export function getTodayEndInBrazil(): string {
  // Para queries de data, o fim do dia é o mesmo dia (YYYY-MM-DD)
  // O banco compara apenas a data, não a hora
  return getTodayStartInBrazil()
}

/**
 * Obtém a data (YYYY-MM-DD) no timezone do Brasil, com offset de dias.
 * Útil para construir ranges de "amanhã" de forma determinística.
 */
export function getBrazilDateString(dayOffset: number = 0, baseDate: Date = new Date()): string {
  const brazilToday = new Intl.DateTimeFormat('en-CA', {
    timeZone: BRAZIL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(baseDate)

  const [year, month, day] = brazilToday.split('-').map(Number)

  // Usa meio-dia UTC para evitar problemas de DST/offset em mudanças de dia
  const anchor = new Date(Date.UTC(year, (month - 1), day, 12, 0, 0))
  const shifted = new Date(anchor.getTime() + dayOffset * 24 * 60 * 60 * 1000)

  return new Intl.DateTimeFormat('en-CA', {
    timeZone: BRAZIL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(shifted)
}

/**
 * Obtém o início do dia de ontem no timezone do Brasil
 * Retorna uma string no formato YYYY-MM-DD para uso em queries
 */
export function getYesterdayStartInBrazil(): string {
  const now = new Date()
  // Obtém a data atual no timezone do Brasil
  const brazilToday = new Intl.DateTimeFormat('en-CA', {
    timeZone: BRAZIL_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now)
  
  // Converte para Date e subtrai 1 dia
  const [year, month, day] = brazilToday.split('-').map(Number)
  const todayDate = new Date(year, month - 1, day)
  todayDate.setDate(todayDate.getDate() - 1)
  
  // Formata como YYYY-MM-DD
  const yesterdayYear = todayDate.getFullYear()
  const yesterdayMonth = String(todayDate.getMonth() + 1).padStart(2, '0')
  const yesterdayDay = String(todayDate.getDate()).padStart(2, '0')
  
  return `${yesterdayYear}-${yesterdayMonth}-${yesterdayDay}`
}

/**
 * Obtém o fim do dia de ontem no timezone do Brasil
 * Retorna uma string no formato YYYY-MM-DD para uso em queries
 */
export function getYesterdayEndInBrazil(): string {
  // Para queries de data, o fim do dia é o mesmo dia
  return getYesterdayStartInBrazil()
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
export function createDateInBrazil(hour: number, minute: number = 0, dayOffset: number = 0, baseDate: Date = new Date()): Date {
  const now = baseDate
  
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
 * Início do dia (00:00:00.000) no Brasil em ISO (UTC instant)
 */
export function getBrazilDayStartISO(dayOffset: number = 0, baseDate: Date = new Date()): string {
  return createDateInBrazil(0, 0, dayOffset, baseDate).toISOString()
}

/**
 * Fim do dia (23:59:59.999) no Brasil em ISO (UTC instant)
 */
export function getBrazilDayEndISO(dayOffset: number = 0, baseDate: Date = new Date()): string {
  const endMinute = createDateInBrazil(23, 59, dayOffset, baseDate)
  const end = new Date(endMinute.getTime() + 59 * 1000 + 999)
  return end.toISOString()
}

export function getTomorrowStartISOInBrazil(baseDate: Date = new Date()): string {
  return getBrazilDayStartISO(1, baseDate)
}

export function getTomorrowEndISOInBrazil(baseDate: Date = new Date()): string {
  return getBrazilDayEndISO(1, baseDate)
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
 * IMPORTANTE: A IA pode retornar horários em UTC, mas o usuário quer no horário do Brasil
 * Se a IA retorna "20:00:00.000Z", ela provavelmente quis dizer 20h no Brasil, não 20h UTC
 */
export function parseScheduledAt(scheduledAt: string | undefined, title?: string, originalMessage?: string): string | null {
  if (!scheduledAt) {
    return null
  }

  try {
    // Tenta parsear a data
    const date = new Date(scheduledAt)
    if (isNaN(date.getTime())) {
      return null
    }
    
    // Obtém a data atual no Brasil para comparação
    const nowBrazil = getNowInBrazil()
    const nowBrazilParts = new Intl.DateTimeFormat('en-US', {
      timeZone: BRAZIL_TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(nowBrazil)
    
    const nowBrazilDay = parseInt(nowBrazilParts.find(p => p.type === 'day')?.value || '0')
    const nowBrazilMonth = parseInt(nowBrazilParts.find(p => p.type === 'month')?.value || '0')
    const nowBrazilYear = parseInt(nowBrazilParts.find(p => p.type === 'year')?.value || '0')
    
    // Verifica se a data está em formato ISO com timezone UTC (termina com Z)
    const isUTC = scheduledAt.endsWith('Z') || scheduledAt.includes('+00:00')
    
    if (isUTC) {
      // Extrai componentes da data UTC
      const utcHour = date.getUTCHours()
      const utcMinute = date.getUTCMinutes()
      const utcDay = date.getUTCDate()
      const utcMonth = date.getUTCMonth()
      const utcYear = date.getUTCFullYear()
      
      // Converte para o timezone do Brasil para ver o que a hora UTC representa no Brasil
      const brazilParts = new Intl.DateTimeFormat('en-US', {
        timeZone: BRAZIL_TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).formatToParts(date)
      
      const brazilHour = parseInt(brazilParts.find(p => p.type === 'hour')?.value || '0')
      const brazilDay = parseInt(brazilParts.find(p => p.type === 'day')?.value || '0')
      const brazilMonth = parseInt(brazilParts.find(p => p.type === 'month')?.value || '0')
      const brazilYear = parseInt(brazilParts.find(p => p.type === 'year')?.value || '0')
      
      // Detecta se a mensagem original menciona "amanhã" ou "hoje"
      const lowerMessage = originalMessage?.toLowerCase() || ''
      const isAmanha = lowerMessage.includes('amanhã')
      const isHoje = lowerMessage.includes('hoje')
      
      // Calcula o dayOffset baseado na mensagem original e na data da IA
      let dayOffset = 0
      
      if (isAmanha) {
        // Se mencionou "amanhã", sempre usa dayOffset = 1
        dayOffset = 1
        console.log('parseScheduledAt - Mensagem menciona "amanhã", usando dayOffset = 1')
      } else if (isHoje) {
        // Se mencionou "hoje", sempre usa dayOffset = 0
        dayOffset = 0
        console.log('parseScheduledAt - Mensagem menciona "hoje", usando dayOffset = 0')
      } else {
        // Se não mencionou nem "hoje" nem "amanhã", calcula baseado na data original da IA
        // Compara a data no Brasil com a data atual
        if (brazilYear > nowBrazilYear || 
            (brazilYear === nowBrazilYear && brazilMonth > nowBrazilMonth) ||
            (brazilYear === nowBrazilYear && brazilMonth === nowBrazilMonth && brazilDay > nowBrazilDay)) {
          // A data no Brasil é no futuro - calcula o offset
          const targetDate = new Date(brazilYear, brazilMonth - 1, brazilDay)
          const todayDate = new Date(nowBrazilYear, nowBrazilMonth - 1, nowBrazilDay)
          const diffTime = targetDate.getTime() - todayDate.getTime()
          dayOffset = Math.round(diffTime / (1000 * 60 * 60 * 24))
          console.log('parseScheduledAt - Calculado dayOffset baseado na data:', dayOffset)
        }
      }
      
      // Se a hora no Brasil é diferente da hora UTC, a IA provavelmente quis dizer
      // a hora UTC como se fosse a hora no Brasil
      // Exemplo: IA retorna 20:00 UTC, mas no Brasil isso vira 17:00
      // O usuário pediu 20h, então a IA quis dizer 20h no Brasil, não 20h UTC
      if (brazilHour !== utcHour || brazilDay !== utcDay || isAmanha) {
        console.log('parseScheduledAt - Detectada diferença de timezone:', {
          original: scheduledAt,
          utcHour,
          utcMinute,
          utcDate: `${utcDay}/${utcMonth + 1}/${utcYear}`,
          brazilHour,
          brazilDay,
          brazilDate: `${brazilDay}/${brazilMonth}/${brazilYear}`,
          nowBrazilDate: `${nowBrazilDay}/${nowBrazilMonth}/${nowBrazilYear}`,
          isAmanha,
          dayOffset,
          interpretacao: `IA retornou ${utcHour}h UTC (que vira ${brazilHour}h no Brasil), mas usuário provavelmente queria ${utcHour}h no Brasil ${isAmanha ? 'AMANHÃ' : ''}`
        })
        
        // Cria uma data que representa utcHour:utcMinute no horário do Brasil
        // Usa createDateInBrazil que já faz essa conversão corretamente
        const adjustedDate = createDateInBrazil(utcHour, utcMinute, dayOffset)
        
        // Verifica se a data ajustada está correta
        const adjustedBrazilParts = new Intl.DateTimeFormat('en-US', {
          timeZone: BRAZIL_TIMEZONE,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false
        }).formatToParts(adjustedDate)
        
        const adjustedBrazilHour = parseInt(adjustedBrazilParts.find(p => p.type === 'hour')?.value || '0')
        const adjustedBrazilDay = parseInt(adjustedBrazilParts.find(p => p.type === 'day')?.value || '0')
        const adjustedBrazilMonth = parseInt(adjustedBrazilParts.find(p => p.type === 'month')?.value || '0')
        const adjustedBrazilYear = parseInt(adjustedBrazilParts.find(p => p.type === 'year')?.value || '0')
        
        console.log('parseScheduledAt - Data ajustada:', {
          original: scheduledAt,
          originalBrazil: `${brazilDay}/${brazilMonth}/${brazilYear} ${brazilHour}:${brazilParts.find(p => p.type === 'minute')?.value}`,
          adjusted: adjustedDate.toISOString(),
          adjustedBrazil: `${adjustedBrazilDay}/${adjustedBrazilMonth}/${adjustedBrazilYear} ${adjustedBrazilHour}:${adjustedBrazilParts.find(p => p.type === 'minute')?.value}`,
          correto: adjustedBrazilHour === utcHour
        })
        
        return adjustedDate.toISOString()
      }
    }
    
    // Se não há diferença ou não é UTC, retorna como está
    return date.toISOString()
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
  let minute: number | null = null
  let periodo: string | null = null

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

      // Tenta capturar minutos se vierem como "15:30" no match[0]
      const minuteMatch = match[0]?.match(/(\d{1,2})[:h](\d{2})/i)
      if (minuteMatch && minuteMatch[2]) {
        minute = parseInt(minuteMatch[2])
      }
      
      // Resolve período (hoje/amanhã/dia da semana). Default: hoje.
      if (lowerMessage.includes('hoje')) periodo = 'hoje'
      else if (lowerMessage.includes('amanhã')) periodo = 'amanhã'
      else {
        const daysOfWeek = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
        const found = daysOfWeek.find(d => lowerMessage.includes(d))
        periodo = found || 'hoje'
      }
      
      // Verifica dia da semana
      const daysOfWeek = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
      for (let i = 0; i < daysOfWeek.length; i++) {
        if (lowerMessage.includes(daysOfWeek[i])) {
          // Se for "hoje" mas já passou o horário, joga para próxima semana
          const currentDay = getCurrentDayInBrazil()
          const targetDay = i
          const dayOffset = (targetDay - currentDay + 7) % 7
          const nowBrazilHours = getCurrentHourInBrazil()
          if (dayOffset === 0 && hour !== null && nowBrazilHours >= hour) {
            periodo = daysOfWeek[i] // mantém o dia, resolveScheduledAt vira 0; aqui só sinalizamos intenção
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

  // Se encontrou hora, resolve para ISO via função única
  if (hour !== null) {
    console.log('extractAppointmentFromMessage - Dados extraídos:', {
      title,
      hour,
      minute,
      periodo,
      lowerMessage
    })

    const horario = `${String(hour).padStart(2, '0')}:${String(minute ?? 0).padStart(2, '0')}`
    const scheduledAtISO = resolveScheduledAt(periodo || 'hoje', horario, BRAZIL_TIMEZONE, now)

    console.log('extractAppointmentFromMessage - scheduledAt resolvido:', {
      periodo,
      horario,
      scheduledAtISO,
      scheduledAtLocal: scheduledAtISO ? new Date(scheduledAtISO).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : null
    })
    
    return {
      title,
      scheduledAt: scheduledAtISO,
    }
  }

  console.log('extractAppointmentFromMessage - Nenhuma hora encontrada na mensagem')
  return { title, scheduledAt: null }
}
