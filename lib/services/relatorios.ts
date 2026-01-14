import {
  calculateTotalSpent,
  calculateTotalByCategory,
  getFinanceiroRecords,
} from './financeiro'
import { getCompromissosRecords, getTodayCompromissos } from './compromissos'

export interface RelatorioFinanceiro {
  total: number
  porCategoria: Record<string, number>
  totalRegistros: number
  periodo: {
    inicio: string
    fim: string
  }
}

/**
 * Gera relatório financeiro completo
 */
export async function gerarRelatorioFinanceiro(
  tenantId: string,
  startDate?: string,
  endDate?: string
): Promise<RelatorioFinanceiro> {
  const total = await calculateTotalSpent(tenantId, startDate, endDate)
  const registros = await getFinanceiroRecords(tenantId, startDate, endDate)

  // Agrupa por categoria
  const porCategoria: Record<string, number> = {}
  const categorias = [
    'Alimentação',
    'Transporte',
    'Moradia',
    'Saúde',
    'Educação',
    'Lazer',
    'Outros',
  ]

  for (const categoria of categorias) {
    const totalCategoria = await calculateTotalByCategory(
      tenantId,
      categoria,
      startDate,
      endDate
    )
    if (totalCategoria > 0) {
      porCategoria[categoria] = totalCategoria
    }
  }

  return {
    total,
    porCategoria,
    totalRegistros: registros.length,
    periodo: {
      inicio: startDate || 'início',
      fim: endDate || 'hoje',
    },
  }
}

/**
 * Gera resumo do mês atual
 */
export async function gerarResumoMensal(tenantId: string): Promise<RelatorioFinanceiro> {
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

  return gerarRelatorioFinanceiro(
    tenantId,
    startOfMonth.toISOString().split('T')[0],
    endOfMonth.toISOString().split('T')[0]
  )
}

/**
 * Gera resumo da semana atual
 */
export async function gerarResumoSemanal(tenantId: string): Promise<RelatorioFinanceiro> {
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0, 0, 0, 0)

  const endOfWeek = new Date(startOfWeek)
  endOfWeek.setDate(startOfWeek.getDate() + 6)
  endOfWeek.setHours(23, 59, 59, 999)

  return gerarRelatorioFinanceiro(
    tenantId,
    startOfWeek.toISOString(),
    endOfWeek.toISOString()
  )
}

/**
 * Obtém maiores gastos
 */
export async function obterMaioresGastos(
  tenantId: string,
  limit: number = 5
): Promise<Array<{ description: string; amount: number; category: string }>> {
  const registros = await getFinanceiroRecords(tenantId)
  
  return registros
    .sort((a, b) => Number(b.amount) - Number(a.amount))
    .slice(0, limit)
    .map((r) => ({
      description: r.description,
      amount: Number(r.amount),
      category: r.category,
    }))
}
