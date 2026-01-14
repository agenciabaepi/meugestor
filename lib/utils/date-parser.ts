/**
 * Utilitários para parsing de datas e horários
 */

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
  const lowerMessage = message.toLowerCase().trim()
  const now = new Date()

  // Padrões comuns
  const patterns = [
    // "reunião 12h", "reunião às 12h", "reunião as 12h"
    /(reunião|consulta|compromisso|encontro|evento|agendar|marcar)\s+(?:às\s*|as\s*)?(\d{1,2})h/i,
    // "12h" sozinho (assume que é compromisso)
    /^(\d{1,2})h$/i,
    // "reunião às 12h", "consulta as 14h"
    /(reunião|consulta|compromisso|encontro|evento)\s+(?:às|as)\s+(\d{1,2})h/i,
    // "amanhã às 10h"
    /amanhã\s+(?:às\s*|as\s*)?(\d{1,2})h/i,
    // "segunda às 14h", "terça às 9h"
    /(segunda|terça|quarta|quinta|sexta|sábado|domingo)\s+(?:às|as)\s+(\d{1,2})h/i,
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
          const currentDay = now.getDay()
          const targetDay = i
          dayOffset = (targetDay - currentDay + 7) % 7
          if (dayOffset === 0 && hour !== null && now.getHours() >= hour) {
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
    const titleMatch = lowerMessage.match(/^(.*?)(?:\s+(?:às|as|para|em)\s+|\s+\d)/)
    if (titleMatch) {
      title = titleMatch[1].trim()
      if (title.length > 0) {
        title = title.charAt(0).toUpperCase() + title.slice(1)
      }
    } else {
      title = 'Compromisso'
    }
  }

  // Se encontrou hora, cria data
  if (hour !== null) {
    const scheduledDate = new Date(now)
    scheduledDate.setDate(scheduledDate.getDate() + dayOffset)
    scheduledDate.setHours(hour, 0, 0, 0)
    
    return {
      title,
      scheduledAt: scheduledDate.toISOString(),
    }
  }

  return { title, scheduledAt: null }
}
