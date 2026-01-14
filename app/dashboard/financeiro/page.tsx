import { getFinanceiroRecords, calculateTotalSpent, calculateTotalByCategory } from '@/lib/services/financeiro'
import { gerarRelatorioFinanceiro } from '@/lib/services/relatorios'
import { supabase } from '@/lib/db/client'
import { Charts } from './charts'

async function getTenantId(): Promise<string | null> {
  const { data } = await supabase
    .from('tenants')
    .select('id')
    .limit(1)
    .single()
  
  return data?.id || null
}

async function getFinanceiroData() {
  const tenantId = await getTenantId()
  
  if (!tenantId) {
    return {
      gastosMes: [],
      totalMes: 0,
      totalMesAnterior: 0,
      dadosPorCategoria: [],
      dadosGrafico: [],
      cores: [],
    }
  }
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

  const gastosMes = await getFinanceiroRecords(
    tenantId,
    startOfMonth.toISOString().split('T')[0]
  )
  
  const totalMes = await calculateTotalSpent(
    tenantId,
    startOfMonth.toISOString().split('T')[0]
  )
  
  const totalMesAnterior = await calculateTotalSpent(
    tenantId,
    startOfLastMonth.toISOString().split('T')[0],
    endOfLastMonth.toISOString().split('T')[0]
  )

  // Dados por categoria
  const categorias = ['Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Educação', 'Lazer', 'Outros']
  const dadosPorCategoria = await Promise.all(
    categorias.map(async (cat) => {
      const total = await calculateTotalByCategory(
        tenantId,
        cat,
        startOfMonth.toISOString().split('T')[0]
      )
      return { name: cat, value: Number(total) }
    })
  )

  // Dados para gráfico de barras (últimos 7 dias)
  const ultimos7Dias = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - i))
    return date.toISOString().split('T')[0]
  })

  const dadosGrafico = await Promise.all(
    ultimos7Dias.map(async (date) => {
      const gastos = await getFinanceiroRecords(tenantId, date, date)
      const total = gastos.reduce((sum, g) => sum + Number(g.amount), 0)
      return {
        date: new Date(date).toLocaleDateString('pt-BR', { weekday: 'short' }),
        total: Number(total),
      }
    })
  )

  const cores = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6B7280']

  return {
    gastosMes,
    totalMes,
    totalMesAnterior,
    dadosPorCategoria: dadosPorCategoria.filter(d => d.value > 0),
    dadosGrafico,
    cores,
  }
}

export default async function FinanceiroPage() {
  const data = await getFinanceiroData()
  const variacao = data.totalMesAnterior > 0 
    ? ((data.totalMes - data.totalMesAnterior) / data.totalMesAnterior * 100).toFixed(1)
    : '0'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Financeiro</h1>
        <p className="mt-2 text-gray-600">
          Controle seus gastos e visualize suas finanças
        </p>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-500">Total do Mês</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            R$ {data.totalMes.toFixed(2)}
          </p>
          <p className={`text-sm mt-2 ${Number(variacao) >= 0 ? 'text-red-600' : 'text-green-600'}`}>
            {Number(variacao) >= 0 ? '↑' : '↓'} {Math.abs(Number(variacao))}% vs mês anterior
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-500">Registros</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {data.gastosMes.length}
          </p>
          <p className="text-sm text-gray-500 mt-2">Este mês</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm font-medium text-gray-500">Média Diária</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            R$ {(data.totalMes / new Date().getDate()).toFixed(2)}
          </p>
          <p className="text-sm text-gray-500 mt-2">Gasto médio por dia</p>
        </div>
      </div>

      {/* Gráficos */}
      <Charts 
        dadosGrafico={data.dadosGrafico}
        dadosPorCategoria={data.dadosPorCategoria}
        cores={data.cores}
      />

      {/* Lista de Gastos */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Todos os Gastos do Mês</h2>
        </div>
        <div className="p-6">
          {data.gastosMes.length > 0 ? (
            <div className="space-y-4">
              {data.gastosMes.map((gasto) => (
                <div
                  key={gasto.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                >
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{gasto.description}</p>
                    <div className="flex items-center space-x-4 mt-1">
                      <p className="text-sm text-gray-500">
                        {gasto.category}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(gasto.date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900 text-lg">
                      R$ {Number(gasto.amount).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              Nenhum gasto registrado este mês
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
