/**
 * Utilitários para formatação de datas
 */

/**
 * Converte uma string de data no formato YYYY-MM-DD para um objeto Date local
 * Evita problemas de timezone que podem causar diferença de 1 dia
 */
export function parseLocalDate(dateString: string): Date {
  // Se a string já contém hora, usa diretamente
  if (dateString.includes('T')) {
    return new Date(dateString)
  }
  
  // Para formato YYYY-MM-DD, cria a data como local (não UTC)
  const [year, month, day] = dateString.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/**
 * Formata uma data para exibição em português
 */
export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const dateObj = typeof date === 'string' ? parseLocalDate(date) : date
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }
  
  return dateObj.toLocaleDateString('pt-BR', { ...defaultOptions, ...options })
}

/**
 * Formata uma data completa (com dia da semana e mês por extenso)
 */
export function formatDateFull(date: Date | string): string {
  const dateObj = typeof date === 'string' ? parseLocalDate(date) : date
  
  return dateObj.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
