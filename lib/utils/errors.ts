/**
 * Classes de erro customizadas para o sistema
 */

export class TenantNotFoundError extends Error {
  constructor(message = 'Tenant não encontrado') {
    super(message)
    this.name = 'TenantNotFoundError'
  }
}

export class UnauthorizedError extends Error {
  constructor(message = 'Não autorizado') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class DatabaseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DatabaseError'
  }
}

/**
 * Formata erros para resposta HTTP
 */
export function formatError(error: unknown): {
  error: string
  message: string
} {
  if (error instanceof Error) {
    return {
      error: error.name,
      message: error.message,
    }
  }

  return {
    error: 'UnknownError',
    message: 'Erro desconhecido',
  }
}
