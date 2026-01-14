/**
 * Validações comuns para o sistema
 */

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function isValidWhatsAppNumber(phone: string): boolean {
  // Remove caracteres não numéricos
  const cleaned = phone.replace(/\D/g, '')
  // Valida se tem entre 10 e 15 dígitos (formato internacional)
  return cleaned.length >= 10 && cleaned.length <= 15
}

export function normalizeWhatsAppNumber(phone: string): string {
  // Remove caracteres não numéricos
  return phone.replace(/\D/g, '')
}

export function isValidAmount(amount: number): boolean {
  return amount > 0 && Number.isFinite(amount)
}

export function isValidDate(dateString: string): boolean {
  const date = new Date(dateString)
  return !isNaN(date.getTime())
}

export function isValidCategory(category: string): boolean {
  const validCategories = [
    'Alimentação',
    'Transporte',
    'Moradia',
    'Saúde',
    'Educação',
    'Lazer',
    'Outros',
  ]
  return validCategories.includes(category)
}
