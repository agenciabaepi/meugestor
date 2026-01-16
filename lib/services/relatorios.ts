import {
  calculateTotalSpent,
  getDespesasRecords,
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
  // IMPORTANTE: este relatório é de GASTOS (despesas).
  // Mantém consistência entre `total` e `porCategoria` (ambos filtrados como expense).
  const despesas = await getDespesasRecords(tenantId, startDate, endDate)
  const total = despesas.reduce((sum, r) => sum + Number(r.amount), 0)

  // Agrupa por categoria
  const porCategoria: Record<string, number> = {}
  const categorias = [
    'Alimentação',
    'Moradia',
    'Saúde',
    'Transporte',
    'Educação',
    'Lazer e Entretenimento',
    'Compras Pessoais',
    'Assinaturas e Serviços',
    'Financeiro e Obrigações',
    'Impostos e Taxas',
    'Pets',
    'Doações e Presentes',
    'Trabalho e Negócios',
    'Outros',
  ]

  for (const categoria of categorias) {
    const totalCategoria = despesas
      .filter((d) => d.category === categoria)
      .reduce((sum, d) => sum + Number(d.amount), 0)
    if (totalCategoria > 0) {
      porCategoria[categoria] = totalCategoria
    }
  }

  return {
    total,
    porCategoria,
    totalRegistros: despesas.length,
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
  const registros = await getDespesasRecords(tenantId)
  
  return registros
    .sort((a, b) => Number(b.amount) - Number(a.amount))
    .slice(0, limit)
    .map((r) => ({
      description: r.description,
      amount: Number(r.amount),
      category: r.category,
    }))
}
