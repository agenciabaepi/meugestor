import { getFinanceiroRecords, calculateTotalSpent } from '@/lib/services/financeiro'
import { getTodayCompromissos, getCompromissosRecords } from '@/lib/services/compromissos'
import { gerarResumoMensal } from '@/lib/services/relatorios'
import { getAuthenticatedTenantId } from '@/lib/utils/auth'
import { Wallet, FileText, Calendar, Clock } from 'lucide-react'

async function getDashboardData() {
  try {
    // Obtém tenant_id do usuário autenticado
    const tenantId = await getAuthenticatedTenantId()
    
    if (!tenantId) {
      // Retorna dados vazios se não houver tenant
      return {
        totalMes: 0,
        gastosRecentes: [],
        gastosMes: 0,
        hoje: 0,
        proximos: [],
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
    
    // Busca dados financeiros com tratamento de erro
    let totalMes = 0
    let gastosRecentes: any[] = []
    let gastosMes: any[] = []
    
    try {
      totalMes = await calculateTotalSpent(
        tenantId,
        startOfMonth.toISOString().split('T')[0]
      )
      gastosRecentes = await getFinanceiroRecords(tenantId)
      gastosMes = await getFinanceiroRecords(
        tenantId,
        startOfMonth.toISOString().split('T')[0]
      )
    } catch (error) {
      console.error('Error fetching financeiro data:', error)
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
      hoje = await getTodayCompromissos(tenantId)
      proximos = await getCompromissosRecords(
        tenantId,
        new Date().toISOString()
      )
      resumo = await gerarResumoMensal(tenantId)
    } catch (error) {
      console.error('Error fetching compromissos data:', error)
    }
    
    return {
      totalMes,
      gastosRecentes: gastosRecentes.slice(0, 5),
      gastosMes: gastosMes.length,
      hoje: hoje.length,
      proximos: proximos.slice(0, 5),
      resumo,
    }
  } catch (error) {
    console.error('Error in getDashboardData:', error)
    // Retorna dados vazios em caso de erro para não quebrar a página
    return {
      totalMes: 0,
      gastosRecentes: [],
      gastosMes: 0,
      hoje: 0,
      proximos: [],
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
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-base sm:text-lg text-gray-600">
          Visão geral das suas finanças e compromissos
        </p>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {/* Card Gastos do Mês */}
        <div className="relative bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 p-6 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <Wallet className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-blue-100 text-sm font-medium mb-1">Gastos do Mês</p>
            <p className="text-white text-2xl sm:text-3xl font-bold">
              R$ {data.totalMes.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Card Registros */}
        <div className="relative bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 p-6 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-emerald-100 text-sm font-medium mb-1">Registros</p>
            <p className="text-white text-2xl sm:text-3xl font-bold">
              {data.gastosMes}
            </p>
          </div>
        </div>

        {/* Card Hoje */}
        <div className="relative bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 p-6 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <Calendar className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-purple-100 text-sm font-medium mb-1">Hoje</p>
            <p className="text-white text-2xl sm:text-3xl font-bold">
              {data.hoje} compromissos
            </p>
          </div>
        </div>

        {/* Card Próximos */}
        <div className="relative bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 p-6 overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-amber-100 text-sm font-medium mb-1">Próximos</p>
            <p className="text-white text-2xl sm:text-3xl font-bold">
              {data.proximos.length}
            </p>
          </div>
        </div>
      </div>

      {/* Gastos Recentes */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 mb-8 overflow-hidden">
        <div className="px-6 lg:px-8 py-5 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Gastos Recentes</h2>
        </div>
        <div className="p-4 sm:p-6 lg:p-8">
          {data.gastosRecentes.length > 0 ? (
            <div className="space-y-3">
              {data.gastosRecentes.map((gasto) => (
                <div
                  key={gasto.id}
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex-1 min-w-0 pr-4">
                    <p className="font-semibold text-base text-gray-900 truncate mb-1">{gasto.description}</p>
                    <p className="text-sm text-gray-500 truncate">
                      {gasto.category} • {new Date(gasto.date).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-bold text-lg text-gray-900 whitespace-nowrap">
                      R$ {Number(gasto.amount).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-400 text-base">
                Nenhum gasto registrado ainda
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Próximos Compromissos */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="px-6 lg:px-8 py-5 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Próximos Compromissos</h2>
        </div>
        <div className="p-4 sm:p-6 lg:p-8">
          {data.proximos.length > 0 ? (
            <div className="space-y-3">
              {data.proximos.map((compromisso) => (
                <div
                  key={compromisso.id}
                  className="flex items-start justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-lg border border-gray-100 hover:border-purple-200 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0"></div>
                      <p className="font-semibold text-base text-gray-900 truncate">{compromisso.title}</p>
                    </div>
                    <p className="text-sm text-gray-500 ml-5">
                      {new Date(compromisso.scheduled_at).toLocaleString('pt-BR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                    {compromisso.description && (
                      <p className="text-sm text-gray-600 mt-2 ml-5 line-clamp-2">
                        {compromisso.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-400 text-base">
                Nenhum compromisso agendado
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
