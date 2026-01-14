/**
 * Sistema de Rate Limiting
 */

interface RateLimitStore {
  [key: string]: {
    count: number
    resetAt: number
  }
}

// Store simples em memória (em produção, use Redis)
const store: RateLimitStore = {}

export interface RateLimitConfig {
  maxRequests: number
  windowMs: number // Janela de tempo em milissegundos
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 100, // 100 requisições
  windowMs: 60 * 60 * 1000, // Por hora
}

/**
 * Verifica se uma requisição está dentro do limite
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig = DEFAULT_CONFIG
): {
  allowed: boolean
  remaining: number
  resetAt: number
} {
  const now = Date.now()
  const record = store[key]

  // Se não existe registro ou a janela expirou, cria novo
  if (!record || now > record.resetAt) {
    store[key] = {
      count: 1,
      resetAt: now + config.windowMs,
    }
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: now + config.windowMs,
    }
  }

  // Se excedeu o limite
  if (record.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: record.resetAt,
    }
  }

  // Incrementa contador
  record.count++

  return {
    allowed: true,
    remaining: config.maxRequests - record.count,
    resetAt: record.resetAt,
  }
}

/**
 * Limpa registros expirados (chamado periodicamente)
 */
export function cleanupExpiredRecords() {
  const now = Date.now()
  Object.keys(store).forEach((key) => {
    if (store[key].resetAt < now) {
      delete store[key]
    }
  })
}
