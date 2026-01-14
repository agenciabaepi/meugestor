import { 
  getFinanceiroRecords, 
  getDespesasRecords,
  getReceitasRecords,
  calculateTotalSpent, 
  calculateTotalRevenue,
  calculateBalance,
  calculateTotalByCategory 
} from '@/lib/services/financeiro'
import { getAuthenticatedTenantId } from '@/lib/utils/auth'
import { FinanceiroTabs } from './tabs'

async function getFinanceiroData() {
  const tenantId = await getAuthenticatedTenantId()
  
  if (!tenantId) {
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
      cores: [],
    }
  }
  
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

  // Busca despesas e receitas separadamente
  const despesasMes = await getDespesasRecords(
    tenantId,
    startOfMonth.toISOString().split('T')[0]
  )
  
  const receitasMes = await getReceitasRecords(
    tenantId,
    startOfMonth.toISOString().split('T')[0]
  )
  
  const todasTransacoes = await getFinanceiroRecords(
    tenantId,
    startOfMonth.toISOString().split('T')[0]
  )
  
  // Calcula totais
  const totalDespesas = await calculateTotalSpent(
    tenantId,
    startOfMonth.toISOString().split('T')[0]
  )
  
  const totalReceitas = await calculateTotalRevenue(
    tenantId,
    startOfMonth.toISOString().split('T')[0]
  )
  
  const saldo = totalReceitas - totalDespesas
  
  // Totais do mês anterior
  const totalDespesasAnterior = await calculateTotalSpent(
    tenantId,
    startOfLastMonth.toISOString().split('T')[0],
    endOfLastMonth.toISOString().split('T')[0]
  )
  
  const totalReceitasAnterior = await calculateTotalRevenue(
    tenantId,
    startOfLastMonth.toISOString().split('T')[0],
    endOfLastMonth.toISOString().split('T')[0]
  )

  // Dados por categoria (despesas)
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
  
  const dadosPorCategoriaDespesas = await Promise.all(
    categorias.map(async (cat) => {
      const despesas = await getDespesasRecords(
        tenantId,
        startOfMonth.toISOString().split('T')[0]
      )
      const total = despesas
        .filter(d => d.category === cat)
        .reduce((sum, d) => sum + Number(d.amount), 0)
      return { name: cat, value: Number(total) }
    })
  )
  
  const dadosPorCategoriaReceitas = await Promise.all(
    categorias.map(async (cat) => {
      const receitas = await getReceitasRecords(
        tenantId,
        startOfMonth.toISOString().split('T')[0]
      )
      const total = receitas
        .filter(r => r.category === cat)
        .reduce((sum, r) => sum + Number(r.amount), 0)
      return { name: cat, value: Number(total) }
    })
  )

  // Dados para gráfico de barras (últimos 7 dias)
  const ultimos7Dias = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - i))
    return date.toISOString().split('T')[0]
  })

  const dadosGraficoDespesas = await Promise.all(
    ultimos7Dias.map(async (date) => {
      const despesas = await getDespesasRecords(tenantId, date, date)
      const total = despesas.reduce((sum, d) => sum + Number(d.amount), 0)
      return {
        date: new Date(date).toLocaleDateString('pt-BR', { weekday: 'short' }),
        total: Number(total),
      }
    })
  )
  
  const dadosGraficoReceitas = await Promise.all(
    ultimos7Dias.map(async (date) => {
      const receitas = await getReceitasRecords(tenantId, date, date)
      const total = receitas.reduce((sum, r) => sum + Number(r.amount), 0)
      return {
        date: new Date(date).toLocaleDateString('pt-BR', { weekday: 'short' }),
        total: Number(total),
      }
    })
  )

  const cores = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6B7280']

  return {
    despesasMes,
    receitasMes,
    todasTransacoes,
    totalDespesas,
    totalReceitas,
    saldo,
    totalDespesasAnterior,
    totalReceitasAnterior,
    dadosPorCategoriaDespesas: dadosPorCategoriaDespesas.filter(d => d.value > 0),
    dadosPorCategoriaReceitas: dadosPorCategoriaReceitas.filter(d => d.value > 0),
    dadosGraficoDespesas,
    dadosGraficoReceitas,
    cores,
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
        dadosPorCategoriaDespesas={data.dadosPorCategoriaDespesas}
        dadosPorCategoriaReceitas={data.dadosPorCategoriaReceitas}
        cores={data.cores}
      />
    </div>
  )
}

