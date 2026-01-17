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

async function getFinanceiroData() {
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
    }
  }
  
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

  // Busca despesas e receitas separadamente
  const despesasMes = await getDespesasRecordsForContext(
    ctx,
    startOfMonth.toISOString().split('T')[0]
  )
  
  const receitasMes = await getReceitasRecordsForContext(
    ctx,
    startOfMonth.toISOString().split('T')[0]
  )
  
  const todasTransacoes = await getFinanceiroRecordsForContext(
    ctx,
    startOfMonth.toISOString().split('T')[0]
  )
  
  // Calcula totais
  const totalDespesas = await calculateTotalSpentForContext(
    ctx,
    startOfMonth.toISOString().split('T')[0]
  )
  
  const totalReceitas = await calculateTotalRevenueForContext(
    ctx,
    startOfMonth.toISOString().split('T')[0]
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

  // Dados para gráfico de barras (últimos 7 dias)
  const ultimos7Dias = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - i))
    return date.toISOString().split('T')[0]
  })

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
  }
}

export default async function FinanceiroPage() {
  const data = await getFinanceiroData()
  
  const variacaoDespesas = data.totalDespesasAnterior > 0 
    ? ((data.totalDespesas - data.totalDespesasAnterior) / data.totalDespesasAnterior * 100).toFixed(1)
    : '0'
    
  const variacaoReceitas = data.totalReceitasAnterior > 0 
    ? ((data.totalReceitas - data.totalReceitasAnterior) / data.totalReceitasAnterior * 100).toFixed(1)
    : '0'

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Financeiro</h1>
        <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">
          Controle suas despesas e receitas
        </p>
      </div>

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
          <p className={`text-2xl sm:text-3xl font-bold mt-1 sm:mt-2 break-words ${data.saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {data.saldo >= 0 ? '+' : ''}R$ {data.saldo.toFixed(2)}
          </p>
          <p className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2">
            {data.totalReceitas >= 0 ? 'Receitas' : 'Despesas'} - {data.totalDespesas >= 0 ? 'Despesas' : 'Receitas'}
          </p>
        </div>

        {/* Receitas */}
        <div className="bg-white rounded-lg shadow-sm sm:shadow p-4 sm:p-6">
          <p className="text-xs sm:text-sm font-medium text-gray-500">Receitas</p>
          <p className="text-2xl sm:text-3xl font-bold text-green-600 mt-1 sm:mt-2 break-words">
            R$ {data.totalReceitas.toFixed(2)}
          </p>
          <p className={`text-xs sm:text-sm mt-1 sm:mt-2 ${Number(variacaoReceitas) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {Number(variacaoReceitas) >= 0 ? '↑' : '↓'} {Math.abs(Number(variacaoReceitas))}% vs mês anterior
          </p>
        </div>

        {/* Despesas */}
        <div className="bg-white rounded-lg shadow-sm sm:shadow p-4 sm:p-6">
          <p className="text-xs sm:text-sm font-medium text-gray-500">Despesas</p>
          <p className="text-2xl sm:text-3xl font-bold text-red-600 mt-1 sm:mt-2 break-words">
            R$ {data.totalDespesas.toFixed(2)}
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

