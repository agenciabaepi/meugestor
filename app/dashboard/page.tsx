import { 
  getFinanceiroRecordsForContext,
  getDespesasRecordsForContext,
  getReceitasRecordsForContext,
  calculateTotalSpentForContext,
  calculateTotalRevenueForContext,
} from '@/lib/services/financeiro'
import { getTodayCompromissos, getCompromissosRecords } from '@/lib/services/compromissos'
import { gerarResumoMensal } from '@/lib/services/relatorios'
import { calcularCaixa } from '@/lib/services/caixa'
import { getSessionContext } from '@/lib/utils/session-context'
import { Wallet, FileText, Calendar, Clock, TrendingUp, TrendingDown, Banknote } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format-currency'
import { DashboardChart } from './components/DashboardChart'

export const dynamic = 'force-dynamic'

async function getDashboardData() {
  try {
    const ctx = await getSessionContext()
    
    if (!ctx) {
      return {
        totalDespesas: 0,
        totalReceitas: 0,
        saldo: 0,
        caixa: 0,
        gastosRecentes: [],
        receitasRecentes: [],
        gastosMes: 0,
        receitasMes: 0,
        hoje: 0,
        proximos: [],
        dadosGrafico: [],
        resumo: {
          total: 0,
          porCategoria: {},
          totalRegistros: 0,
          periodo: { inicio: '', fim: '' },
        },
      }
    }
    
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    
    // Busca dados financeiros com tratamento de erro
    let totalDespesas = 0
    let totalReceitas = 0
    let gastosRecentes: any[] = []
    let receitasRecentes: any[] = []
    let gastosMes: any[] = []
    let receitasMes: any[] = []
    let dadosGrafico: Array<{ date: string; despesas: number; receitas: number }> = []
    
    try {
      totalDespesas = await calculateTotalSpentForContext(
        ctx,
        startOfMonth.toISOString().split('T')[0],
        endOfMonth.toISOString().split('T')[0]
      )
      totalReceitas = await calculateTotalRevenueForContext(
        ctx,
        startOfMonth.toISOString().split('T')[0],
        endOfMonth.toISOString().split('T')[0]
      )
      
      gastosMes = await getDespesasRecordsForContext(
        ctx,
        startOfMonth.toISOString().split('T')[0],
        endOfMonth.toISOString().split('T')[0]
      )
      receitasMes = await getReceitasRecordsForContext(
        ctx,
        startOfMonth.toISOString().split('T')[0],
        endOfMonth.toISOString().split('T')[0]
      )
      
      // Busca registros recentes (últimos 5) - apenas do mês atual para economizar memória
      const recentesStartDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      const recentesEndDate = endOfMonth.toISOString().split('T')[0]
      const gastosRecentesRaw = await getDespesasRecordsForContext(ctx, recentesStartDate, recentesEndDate)
      const receitasRecentesRaw = await getReceitasRecordsForContext(ctx, recentesStartDate, recentesEndDate)
      gastosRecentes = gastosRecentesRaw.slice(0, 5)
      receitasRecentes = receitasRecentesRaw.slice(0, 5)
      
      // Prepara dados do gráfico - usa dados já carregados (gastosMes e receitasMes) para economizar memória
      // Agrupa por dia em vez de fazer queries separadas
      const dadosPorDia = new Map<string, { despesas: number; receitas: number }>()
      
      // Inicializa todos os dias do mês com zero
      for (let i = 1; i <= endOfMonth.getDate(); i++) {
        const date = new Date(now.getFullYear(), now.getMonth(), i)
        const dateKey = date.toISOString().split('T')[0]
        dadosPorDia.set(dateKey, { despesas: 0, receitas: 0 })
      }
      
      // Agrupa despesas por dia
      for (const despesa of gastosMes) {
        const dateKey = despesa.date
        const current = dadosPorDia.get(dateKey) || { despesas: 0, receitas: 0 }
        current.despesas += Number(despesa.amount)
        dadosPorDia.set(dateKey, current)
      }
      
      // Agrupa receitas por dia
      for (const receita of receitasMes) {
        const dateKey = receita.date
        const current = dadosPorDia.get(dateKey) || { despesas: 0, receitas: 0 }
        current.receitas += Number(receita.amount)
        dadosPorDia.set(dateKey, current)
      }
      
      // Converte para array ordenado
      dadosGrafico = Array.from(dadosPorDia.entries())
        .map(([dateKey, values]) => {
          const date = new Date(dateKey)
          return {
            date: date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
            despesas: Number(values.despesas),
            receitas: Number(values.receitas),
            saldo: Number(values.receitas - values.despesas),
          }
        })
        .sort((a, b) => {
          const dateA = new Date(a.date.split('/').reverse().join('-'))
          const dateB = new Date(b.date.split('/').reverse().join('-'))
          return dateA.getTime() - dateB.getTime()
        })
    } catch (error) {
      console.error('Error fetching financeiro data:', error)
    }
    
    // Calcula caixa (saldo acumulado)
    let caixa = 0
    try {
      caixa = await calcularCaixa(ctx)
    } catch (error) {
      console.error('Error calculating caixa:', error)
    }
    
    // Busca compromissos com tratamento de erro
    let hoje: any[] = []
    let proximos: any[] = []
    let resumo = {
      total: 0,
      porCategoria: {},
      totalRegistros: 0,
      periodo: { inicio: '', fim: '' },
    }
    
    try {
      hoje = await getTodayCompromissos(ctx.tenant_id)
      proximos = await getCompromissosRecords(
        ctx.tenant_id,
        new Date().toISOString()
      )
      resumo = await gerarResumoMensal(ctx.tenant_id)
    } catch (error) {
      console.error('Error fetching compromissos data:', error)
    }
    
    const saldo = totalReceitas - totalDespesas
    
    return {
      totalDespesas,
      totalReceitas,
      saldo,
      caixa,
      gastosRecentes,
      receitasRecentes,
      gastosMes: gastosMes.length,
      receitasMes: receitasMes.length,
      hoje: hoje.length,
      proximos: proximos.slice(0, 5),
      dadosGrafico,
      resumo,
    }
  } catch (error) {
    console.error('Error in getDashboardData:', error)
    return {
      totalDespesas: 0,
      totalReceitas: 0,
      saldo: 0,
      caixa: 0,
      gastosRecentes: [],
      receitasRecentes: [],
      gastosMes: 0,
      receitasMes: 0,
      hoje: 0,
      proximos: [],
      dadosGrafico: [],
      resumo: {
        total: 0,
        porCategoria: {},
        totalRegistros: 0,
        periodo: { inicio: '', fim: '' },
      },
    }
  }
}

export default async function DashboardPage() {
  const data = await getDashboardData()

  return (
    <div className="space-y-6 lg:space-y-8">
      <div className="mb-8 lg:mb-10">
        <div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-2">Dashboard</h1>
          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400">
            Visão geral das suas finanças e compromissos
          </p>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {/* Card Saldo do Mês */}
        <div className={`relative rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-6 overflow-hidden ${
          data.saldo >= 0 
            ? 'bg-gradient-to-br from-emerald-600 to-emerald-700' 
            : 'bg-gradient-to-br from-red-600 to-red-700'
        }`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-white/20  rounded-xl flex items-center justify-center">
                {data.saldo >= 0 ? (
                  <TrendingUp className="w-6 h-6 text-white" />
                ) : (
                  <TrendingDown className="w-6 h-6 text-white" />
                )}
              </div>
            </div>
            <p className="text-white/90 text-sm font-medium mb-1">Saldo do Mês</p>
            <p className="text-white text-2xl sm:text-3xl font-bold">
              {formatCurrency(data.saldo)}
            </p>
            <p className="text-white/80 text-xs mt-1">
              {data.totalReceitas > 0 
                ? `${((data.saldo / data.totalReceitas) * 100).toFixed(1)}% da receita`
                : 'Sem receitas'
              }
            </p>
          </div>
        </div>

        {/* Card Receitas */}
        <div className="relative bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-6 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-white/20  rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-white/90 text-sm font-medium mb-1">Receitas</p>
            <p className="text-white text-2xl sm:text-3xl font-bold">
              {formatCurrency(data.totalReceitas)}
            </p>
            <p className="text-white/80 text-xs mt-1">
              {data.receitasMes} registro{data.receitasMes !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Card Despesas */}
        <div className="relative bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-6 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-white/20  rounded-xl flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-white/90 text-sm font-medium mb-1">Despesas</p>
            <p className="text-white text-2xl sm:text-3xl font-bold">
              {formatCurrency(data.totalDespesas)}
            </p>
            <p className="text-white/80 text-xs mt-1">
              {data.gastosMes} registro{data.gastosMes !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Card Caixa */}
        <div className={`relative rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 p-6 overflow-hidden ${
          data.caixa >= 0 
            ? 'bg-gradient-to-br from-blue-600 to-blue-700' 
            : 'bg-gradient-to-br from-red-600 to-red-700'
        }`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-white/20  rounded-xl flex items-center justify-center">
                <Banknote className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-white/90 text-sm font-medium mb-1">Caixa</p>
            <p className="text-white text-2xl sm:text-3xl font-bold">
              {formatCurrency(data.caixa)}
            </p>
            <p className="text-white/80 text-xs mt-1">Saldo acumulado</p>
          </div>
        </div>
      </div>

      {/* Gráfico Financeiro */}
      {data.dadosGrafico.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 mb-8 overflow-hidden">
          <div className="px-6 lg:px-8 py-5 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Visão Geral do Mês</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Receitas e despesas de {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="p-4 sm:p-6 lg:p-8">
            <DashboardChart data={data.dadosGrafico} />
          </div>
        </div>
      )}

      {/* Gastos Recentes */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 mb-8 overflow-hidden">
        <div className="px-6 lg:px-8 py-5 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Gastos Recentes</h2>
        </div>
        <div className="p-4 sm:p-6 lg:p-8">
          {data.gastosRecentes.length > 0 ? (
            <div className="space-y-3">
              {data.gastosRecentes.map((gasto) => (
                <div
                  key={gasto.id}
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white dark:from-gray-700 dark:to-gray-800 rounded-lg border border-gray-100 dark:border-gray-600 hover:border-gray-200 dark:hover:border-gray-500 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="font-semibold text-base text-gray-900 dark:text-white truncate mb-1">{gasto.description}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                      {gasto.category} • {new Date(gasto.date).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-lg text-gray-900 dark:text-white whitespace-nowrap">
                      {formatCurrency(Number(gasto.amount))}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-400 dark:text-gray-500 text-base">
                Nenhum gasto registrado ainda
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Próximos Compromissos */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="px-6 lg:px-8 py-5 bg-gradient-to-r from-gray-50 to-white dark:from-gray-800 dark:to-gray-800 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Próximos Compromissos</h2>
        </div>
        <div className="p-4 sm:p-6 lg:p-8">
          {data.proximos.length > 0 ? (
            <div className="space-y-3">
              {data.proximos.map((compromisso) => (
                <div
                  key={compromisso.id}
                  className="flex items-start justify-between p-4 bg-gradient-to-r from-gray-50 to-white dark:from-gray-700 dark:to-gray-800 rounded-lg border border-gray-100 dark:border-gray-600 hover:border-emerald-200 dark:hover:border-emerald-500 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full shrink-0"></div>
                      <p className="font-semibold text-base text-gray-900 dark:text-white truncate">{compromisso.title}</p>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 ml-5">
                      {new Date(compromisso.scheduled_at).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                    {compromisso.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-2 ml-5 line-clamp-2">
                        {compromisso.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-400 dark:text-gray-500 text-base">
                Nenhum compromisso agendado
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
