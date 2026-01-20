import {
  calculateTotalSpentForContext,
  calculateTotalRevenueForContext,
} from './financeiro'
import type { SessionContext } from '@/lib/db/types'

/**
 * Calcula o saldo de um mês específico (receitas - despesas)
 */
export async function calcularSaldoMes(
  ctx: SessionContext,
  ano: number,
  mes: number
): Promise<number> {
  const startOfMonth = new Date(ano, mes - 1, 1)
  const endOfMonth = new Date(ano, mes, 0)

  const despesas = await calculateTotalSpentForContext(
    ctx,
    startOfMonth.toISOString().split('T')[0],
    endOfMonth.toISOString().split('T')[0]
  )

  const receitas = await calculateTotalRevenueForContext(
    ctx,
    startOfMonth.toISOString().split('T')[0],
    endOfMonth.toISOString().split('T')[0]
  )

  return receitas - despesas
}

/**
 * Calcula o caixa acumulado (saldo de todos os meses até o mês atual)
 */
export async function calcularCaixa(ctx: SessionContext): Promise<number> {
  const now = new Date()
  const anoAtual = now.getFullYear()
  const mesAtual = now.getMonth() + 1

  let caixa = 0

  // Calcula desde janeiro do ano atual até o mês atual
  for (let mes = 1; mes <= mesAtual; mes++) {
    const saldoMes = await calcularSaldoMes(ctx, anoAtual, mes)
    caixa += saldoMes
  }

  // Se houver dados de anos anteriores, você pode adicionar aqui
  // Por enquanto, calculamos apenas o ano atual

  return caixa
}

/**
 * Gera dados mensais do ano atual com fluxo de caixa
 */
export interface MesFinanceiro {
  mes: number
  nomeMes: string
  receitas: number
  despesas: number
  saldo: number
  caixaAcumulado: number
}

export async function gerarDadosAnuais(ctx: SessionContext): Promise<MesFinanceiro[]> {
  const now = new Date()
  const anoAtual = now.getFullYear()
  const meses: MesFinanceiro[] = []

  let caixaAcumulado = 0

  // Nomes dos meses
  const nomesMeses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]

  for (let mes = 1; mes <= 12; mes++) {
    const startOfMonth = new Date(anoAtual, mes - 1, 1)
    const endOfMonth = new Date(anoAtual, mes, 0)

    const despesas = await calculateTotalSpentForContext(
      ctx,
      startOfMonth.toISOString().split('T')[0],
      endOfMonth.toISOString().split('T')[0]
    )

    const receitas = await calculateTotalRevenueForContext(
      ctx,
      startOfMonth.toISOString().split('T')[0],
      endOfMonth.toISOString().split('T')[0]
    )

    const saldo = receitas - despesas
    caixaAcumulado += saldo

    meses.push({
      mes,
      nomeMes: nomesMeses[mes - 1],
      receitas,
      despesas,
      saldo,
      caixaAcumulado,
    })
  }

  return meses
}
