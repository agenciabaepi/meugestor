/**
 * Utilitários de Segurança
 */

import { checkRateLimit } from './rate-limit'

/**
 * Valida e sanitiza entrada de texto
 */
export function sanitizeInput(input: string): string {
  // Remove caracteres perigosos
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove tags HTML básicas
    .slice(0, 10000) // Limita tamanho
}

/**
 * Valida formato de email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Valida formato de número de telefone
 */
export function isValidPhoneNumber(phone: string): boolean {
  const cleaned = phone.replace(/\D/g, '')
  return cleaned.length >= 10 && cleaned.length <= 15
}

/**
 * Valida se um valor numérico é seguro
 */
export function isValidNumeric(value: any): boolean {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= 0
  }
  if (typeof value === 'string') {
    const num = parseFloat(value)
    return !isNaN(num) && Number.isFinite(num) && num >= 0
  }
  return false
}

/**
 * Valida requisição com rate limiting
 */
export function validateRequest(
  identifier: string,
  maxRequests: number = 100,
  windowMs: number = 60 * 60 * 1000
): {
  allowed: boolean
  remaining: number
  resetAt: number
} {
  return checkRateLimit(identifier, { maxRequests, windowMs })
}

/**
 * Gera token seguro aleatório
 */
export function generateSecureToken(length: number = 32): string {
  const crypto = require('crypto')
  return crypto.randomBytes(length).toString('hex')
}

/**
 * Valida assinatura HMAC
 */
export function validateHMAC(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const crypto = require('crypto')
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )
}
