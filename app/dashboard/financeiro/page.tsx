import { Suspense } from 'react'
import { 
  getFinanceiroRecordsForContext, 
  getDespesasRecordsForContext,
  getReceitasRecordsForContext,
  calculateTotalSpentForContext, 
  calculateTotalRevenueForContext,
} from '@/lib/services/financeiro'
import { getSessionContext } from '@/lib/utils/session-context'
import { FinanceiroTabs } from './tabs'
import { FinanceiroDonutTabs } from './FinanceiroDonutTabs'
import { EmpresaCategoriasTabela } from './EmpresaCategoriasTabela'
import { EmpresaFornecedoresTabela } from './EmpresaFornecedoresTabela'
import { AddTransacaoButton } from './AddTransacaoButton'
import { PeriodoSelector } from './PeriodoSelector'
import { formatCurrency } from '@/lib/utils/format-currency'

export const dynamic = 'force-dynamic'

async function getFinanceiroData(searchParams?: { mes?: string; ano?: string }) {
  const ctx = await getSessionContext()
  
  if (!ctx) {
    return {
      despesasMes: [],
      receitasMes: [],
      todasTransacoes: [],
      totalDespesas: 0,
      totalReceitas: 0,
      saldo: 0,
      totalDespesasAnterior: 0,
      totalReceitasAnterior: 0,
      dadosPorCategoriaDespesas: [],
      dadosPorCategoriaReceitas: [],
      dadosGraficoDespesas: [],
      dadosGraficoReceitas: [],
      periodoAtual: { mes: 0, ano: 0 },
    }
  }
  
  // Obtém o período selecionado ou usa o mês atual
  const now = new Date()
  const mesSelecionado = searchParams?.mes ? parseInt(searchParams.mes) : now.getMonth() + 1
  const anoSelecionado = searchParams?.ano ? parseInt(searchParams.ano) : now.getFullYear()
  
  const startOfMonth = new Date(anoSelecionado, mesSelecionado - 1, 1)
  const endOfMonth = new Date(anoSelecionado, mesSelecionado, 0)
  const startOfLastMonth = new Date(anoSelecionado, mesSelecionado - 2, 1)
  const endOfLastMonth = new Date(anoSelecionado, mesSelecionado - 1, 0)

  // Busca despesas e receitas separadamente para o período selecionado
  const despesasMes = await getDespesasRecordsForContext(
    ctx,
    startOfMonth.toISOString().split('T')[0],
    endOfMonth.toISOString().split('T')[0]
  )
  
  const receitasMes = await getReceitasRecordsForContext(
    ctx,
    startOfMonth.toISOString().split('T')[0],
    endOfMonth.toISOString().split('T')[0]
  )
  
  const todasTransacoes = await getFinanceiroRecordsForContext(
    ctx,
    startOfMonth.toISOString().split('T')[0],
    endOfMonth.toISOString().split('T')[0]
  )
  
  // Calcula totais
  const totalDespesas = await calculateTotalSpentForContext(
    ctx,
    startOfMonth.toISOString().split('T')[0],
    endOfMonth.toISOString().split('T')[0]
  )
  
  const totalReceitas = await calculateTotalRevenueForContext(
    ctx,
    startOfMonth.toISOString().split('T')[0],
    endOfMonth.toISOString().split('T')[0]
  )
  
  const saldo = totalReceitas - totalDespesas
  
  // Totais do mês anterior
  const totalDespesasAnterior = await calculateTotalSpentForContext(
    ctx,
    startOfLastMonth.toISOString().split('T')[0],
    endOfLastMonth.toISOString().split('T')[0]
  )
  
  const totalReceitasAnterior = await calculateTotalRevenueForContext(
    ctx,
    startOfLastMonth.toISOString().split('T')[0],
    endOfLastMonth.toISOString().split('T')[0]
  )

  // Dados por categoria (somente despesas) para o donut.
  // (Sem o gráfico “por categoria” antigo, não precisamos calcular receitas por categoria.)
  const totalsByCategory = new Map<string, number>()
  for (const d of despesasMes) {
    const key = String(d.category || 'Outros')
    totalsByCategory.set(key, (totalsByCategory.get(key) || 0) + Number(d.amount))
  }
  const dadosPorCategoriaDespesas = Array.from(totalsByCategory.entries())
    .map(([name, value]) => ({ name, value: Number(value) }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value)

  const totalsByCategoryReceitas = new Map<string, number>()
  for (const r of receitasMes) {
    const key = String(r.category || 'Outros')
    totalsByCategoryReceitas.set(key, (totalsByCategoryReceitas.get(key) || 0) + Number(r.amount))
  }
  const dadosPorCategoriaReceitas = Array.from(totalsByCategoryReceitas.entries())
    .map(([name, value]) => ({ name, value: Number(value) }))
    .filter((d) => d.value > 0)
    .sort((a, b) => b.value - a.value)

  // Dados para gráfico de barras (últimos 7 dias do mês selecionado)
  // Pega os últimos 7 dias do período selecionado
  const ultimos7Dias = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(endOfMonth)
    date.setDate(date.getDate() - (6 - i))
    // Garante que não vai além do início do mês
    if (date < startOfMonth) {
      return null
    }
    return date.toISOString().split('T')[0]
  }).filter(Boolean) as string[]

  const dadosGraficoDespesas = await Promise.all(
    ultimos7Dias.map(async (date) => {
      const despesas = await getDespesasRecordsForContext(ctx, date, date)
      const total = despesas.reduce((sum, d) => sum + Number(d.amount), 0)
      return {
        date: new Date(date).toLocaleDateString('pt-BR', { weekday: 'short' }),
        total: Number(total),
      }
    })
  )
  
  const dadosGraficoReceitas = await Promise.all(
    ultimos7Dias.map(async (date) => {
      const receitas = await getReceitasRecordsForContext(ctx, date, date)
      const total = receitas.reduce((sum, r) => sum + Number(r.amount), 0)
      return {
        date: new Date(date).toLocaleDateString('pt-BR', { weekday: 'short' }),
        total: Number(total),
      }
    })
  )

  return {
    despesasMes,
    receitasMes,
    todasTransacoes,
    totalDespesas,
    totalReceitas,
    saldo,
    totalDespesasAnterior,
    totalReceitasAnterior,
    dadosPorCategoriaDespesas,
    dadosPorCategoriaReceitas,
    dadosGraficoDespesas,
    dadosGraficoReceitas,
    periodoAtual: { mes: mesSelecionado, ano: anoSelecionado },
  }
}

export default async function FinanceiroPage({
  searchParams,
}: {
  searchParams?: Promise<{ mes?: string; ano?: string }>
}) {
  const params = await searchParams
  const data = await getFinanceiroData(params)
  const ctx = await getSessionContext()
  const isEmpresa = ctx?.mode === 'empresa'
  
  const variacaoDespesas = data.totalDespesasAnterior > 0 
    ? ((data.totalDespesas - data.totalDespesasAnterior) / data.totalDespesasAnterior * 100).toFixed(1)
    : '0'
    
  const variacaoReceitas = data.totalReceitasAnterior > 0 
    ? ((data.totalReceitas - data.totalReceitasAnterior) / data.totalReceitasAnterior * 100).toFixed(1)
    : '0'

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Financeiro</h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">
            Controle suas despesas e receitas
          </p>
        </div>
        <AddTransacaoButton />
      </div>

      {/* Seletor de Período */}
      <Suspense fallback={
        <div className="bg-white rounded-lg shadow-sm sm:shadow p-4 sm:p-6 animate-pulse">
          <div className="h-10 bg-gray-200 rounded w-64"></div>
        </div>
      }>
        <PeriodoSelector />
      </Suspense>

      {/* Donuts (Despesas/Receitas) */}
      <FinanceiroDonutTabs
        donutDespesas={{
          total: Number(data.totalDespesas) || 0,
          categorias: (data.dadosPorCategoriaDespesas || []).map((c: any) => ({
            nome: String(c.name),
            valor: Number(c.value),
          })),
        }}
        donutReceitas={{
          total: Number(data.totalReceitas) || 0,
          categorias: (data.dadosPorCategoriaReceitas || []).map((c: any) => ({
            nome: String(c.name),
            valor: Number(c.value),
          })),
        }}
      />

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Saldo */}
        <div className="bg-white rounded-lg shadow-sm sm:shadow p-4 sm:p-6">
          <p className="text-xs sm:text-sm font-medium text-gray-500">Saldo do Mês</p>
          <p className={`text-2xl sm:text-3xl font-bold mt-1 sm:mt-2 wrap-break-word ${data.saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {data.saldo >= 0 ? '+' : ''}{formatCurrency(data.saldo)}
          </p>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2">
            {data.totalReceitas >= 0 ? 'Receitas' : 'Despesas'} - {data.totalDespesas >= 0 ? 'Despesas' : 'Receitas'}
          </p>
        </div>

        {/* Receitas */}
        <div className="bg-white rounded-lg shadow-sm sm:shadow p-4 sm:p-6">
          <p className="text-xs sm:text-sm font-medium text-gray-500">Receitas</p>
          <p className="text-2xl sm:text-3xl font-bold text-green-600 mt-1 sm:mt-2 wrap-break-word">
            {formatCurrency(data.totalReceitas)}
          </p>
          <p className={`text-xs sm:text-sm mt-1 sm:mt-2 ${Number(variacaoReceitas) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {Number(variacaoReceitas) >= 0 ? '↑' : '↓'} {Math.abs(Number(variacaoReceitas))}% vs mês anterior
          </p>
        </div>

        {/* Despesas */}
        <div className="bg-white rounded-lg shadow-sm sm:shadow p-4 sm:p-6">
          <p className="text-xs sm:text-sm font-medium text-gray-500">Despesas</p>
          <p className="text-2xl sm:text-3xl font-bold text-red-600 mt-1 sm:mt-2 wrap-break-word">
            {formatCurrency(data.totalDespesas)}
          </p>
          <p className={`text-xs sm:text-sm mt-1 sm:mt-2 ${Number(variacaoDespesas) >= 0 ? 'text-red-600' : 'text-green-600'}`}>
            {Number(variacaoDespesas) >= 0 ? '↑' : '↓'} {Math.abs(Number(variacaoDespesas))}% vs mês anterior
          </p>
        </div>

        {/* Registros */}
        <div className="bg-white rounded-lg shadow-sm sm:shadow p-4 sm:p-6">
          <p className="text-xs sm:text-sm font-medium text-gray-500">Registros</p>
          <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1 sm:mt-2">
            {data.todasTransacoes.length}
          </p>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2">
            {data.receitasMes.length} receitas • {data.despesasMes.length} despesas
          </p>
        </div>
      </div>

      {/* Seção de Empresas: Tabelas por Categoria, Fornecedor e Funcionários */}
      {isEmpresa && (
        <>
          <EmpresaCategoriasTabela
            despesas={data.despesasMes}
            receitas={data.receitasMes}
          />
          <EmpresaFornecedoresTabela despesas={data.despesasMes} />
        </>
      )}

      {/* Componente de Abas */}
      <FinanceiroTabs 
        despesas={data.despesasMes}
        receitas={data.receitasMes}
        todasTransacoes={data.todasTransacoes}
        dadosGraficoDespesas={data.dadosGraficoDespesas}
        dadosGraficoReceitas={data.dadosGraficoReceitas}
      />
    </div>
  )
}

