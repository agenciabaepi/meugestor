/**
 * Rate limiting para números de WhatsApp
 * Previne abuso e spam
 */

// Armazena contadores de requisições por número (em produção, use Redis)
const requestCounts = new Map<string, { count: number; resetAt: number }>()

// Configurações de rate limit
const RATE_LIMIT_WINDOW = 60 * 1000 // 1 minuto
const MAX_REQUESTS_PER_WINDOW = 10 // 10 requisições por minuto
const MAX_REQUESTS_PER_HOUR = 100 // 100 requisições por hora

/**
 * Verifica se um número de WhatsApp excedeu o rate limit
 */
export function checkRateLimit(whatsappNumber: string): {
  allowed: boolean
  remaining?: number
  resetAt?: number
  error?: string
} {
  const normalized = whatsappNumber.replace(/\D/g, '')
  const now = Date.now()
  const key = normalized

  // Limpa entradas expiradas
  cleanupExpiredEntries()

  // Busca contador atual
  let counter = requestCounts.get(key)

  // Se não existe ou expirou, cria novo
  if (!counter || counter.resetAt < now) {
    counter = {
      count: 0,
      resetAt: now + RATE_LIMIT_WINDOW,
    }
    requestCounts.set(key, counter)
  }

  // Incrementa contador
  counter.count++

  // Verifica limite por minuto
  if (counter.count > MAX_REQUESTS_PER_WINDOW) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: counter.resetAt,
      error: `Muitas requisições. Aguarde ${Math.ceil((counter.resetAt - now) / 1000)} segundos.`,
    }
  }

  // Verifica limite por hora (simplificado - em produção use Redis com TTL)
  const hourlyKey = `${key}:hourly`
  let hourlyCounter = requestCounts.get(hourlyKey)
  
  if (!hourlyCounter || hourlyCounter.resetAt < now) {
    hourlyCounter = {
      count: 0,
      resetAt: now + 60 * 60 * 1000, // 1 hora
    }
    requestCounts.set(hourlyKey, hourlyCounter)
  }

  hourlyCounter.count++

  if (hourlyCounter.count > MAX_REQUESTS_PER_HOUR) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: hourlyCounter.resetAt,
      error: `Limite horário excedido. Aguarde ${Math.ceil((hourlyCounter.resetAt - now) / 1000 / 60)} minutos.`,
    }
  }

  return {
    allowed: true,
    remaining: MAX_REQUESTS_PER_WINDOW - counter.count,
    resetAt: counter.resetAt,
  }
}

/**
 * Limpa entradas expiradas do cache
 */
function cleanupExpiredEntries(): void {
  const now = Date.now()
  for (const [key, value] of requestCounts.entries()) {
    if (value.resetAt < now) {
      requestCounts.delete(key)
    }
  }
}

/**
 * Limpa rate limit de um número específico (útil para testes ou admin)
 */
export function resetRateLimit(whatsappNumber: string): void {
  const normalized = whatsappNumber.replace(/\D/g, '')
  requestCounts.delete(normalized)
  requestCounts.delete(`${normalized}:hourly`)
}
