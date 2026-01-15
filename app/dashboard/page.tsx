import { getFinanceiroRecords, calculateTotalSpent } from '@/lib/services/financeiro'
import { getTodayCompromissos, getCompromissosRecords } from '@/lib/services/compromissos'
import { gerarResumoMensal } from '@/lib/services/relatorios'
import { getAuthenticatedTenantId } from '@/lib/utils/auth'
import { Wallet, FileText, Calendar, Clock } from 'lucide-react'

async function getDashboardData() {
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
  
  // Busca dados financeiros
  const totalMes = await calculateTotalSpent(
    tenantId,
    startOfMonth.toISOString().split('T')[0]
  )
  
  const gastosRecentes = await getFinanceiroRecords(tenantId)
  const gastosMes = await getFinanceiroRecords(
    tenantId,
    startOfMonth.toISOString().split('T')[0]
  )
  
  // Busca compromissos
  const hoje = await getTodayCompromissos(tenantId)
  const proximos = await getCompromissosRecords(
    tenantId,
    new Date().toISOString()
  )
  
  // Gera resumo
  const resumo = await gerarResumoMensal(tenantId)
  
  return {
    totalMes,
    gastosRecentes: gastosRecentes.slice(0, 5),
    gastosMes: gastosMes.length,
    hoje: hoje.length,
    proximos: proximos.slice(0, 5),
    resumo,
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
        <div className="bg-white rounded-lg shadow-sm sm:shadow p-4 sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Wallet className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
            </div>
            <div className="ml-3 sm:ml-4 flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-500 truncate">Gastos do Mês</p>
              <p className="text-xl sm:text-2xl font-semibold text-gray-900 truncate">
                R$ {data.totalMes.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm sm:shadow p-4 sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              </div>
            </div>
            <div className="ml-3 sm:ml-4 flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-500 truncate">Registros</p>
              <p className="text-xl sm:text-2xl font-semibold text-gray-900 truncate">
                {data.gastosMes}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm sm:shadow p-4 sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
              </div>
            </div>
            <div className="ml-3 sm:ml-4 flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-500 truncate">Hoje</p>
              <p className="text-xl sm:text-2xl font-semibold text-gray-900 truncate">
                {data.hoje} compromissos
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm sm:shadow p-4 sm:p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" />
              </div>
            </div>
            <div className="ml-3 sm:ml-4 flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-500 truncate">Próximos</p>
              <p className="text-xl sm:text-2xl font-semibold text-gray-900 truncate">
                {data.proximos.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Gastos Recentes */}
      <div className="bg-white rounded-lg shadow-sm sm:shadow mb-8">
        <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5 border-b border-gray-200">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Gastos Recentes</h2>
        </div>
        <div className="p-4 sm:p-6 lg:p-8">
          {data.gastosRecentes.length > 0 ? (
            <div className="space-y-2 sm:space-y-3">
              {data.gastosRecentes.map((gasto) => (
                <div
                  key={gasto.id}
                  className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="font-medium text-sm sm:text-base text-gray-900 truncate">{gasto.description}</p>
                    <p className="text-xs sm:text-sm text-gray-500 truncate">
                      {gasto.category} • {new Date(gasto.date).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-semibold text-sm sm:text-base text-gray-900 whitespace-nowrap">
                      R$ {Number(gasto.amount).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-6 sm:py-8 text-sm sm:text-base">
              Nenhum gasto registrado ainda
            </p>
          )}
        </div>
      </div>

      {/* Próximos Compromissos */}
      <div className="bg-white rounded-lg shadow-sm sm:shadow">
        <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-5 border-b border-gray-200">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Próximos Compromissos</h2>
        </div>
        <div className="p-4 sm:p-6 lg:p-8">
          {data.proximos.length > 0 ? (
            <div className="space-y-2 sm:space-y-3">
              {data.proximos.map((compromisso) => (
                <div
                  key={compromisso.id}
                  className="flex items-start justify-between p-3 sm:p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm sm:text-base text-gray-900 truncate">{compromisso.title}</p>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">
                      {new Date(compromisso.scheduled_at).toLocaleString('pt-BR')}
                    </p>
                    {compromisso.description && (
                      <p className="text-xs sm:text-sm text-gray-600 mt-1 line-clamp-2">
                        {compromisso.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-6 sm:py-8 text-sm sm:text-base">
              Nenhum compromisso agendado
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
