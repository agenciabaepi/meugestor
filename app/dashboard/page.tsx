import { getFinanceiroRecords, calculateTotalSpent } from '@/lib/services/financeiro'
import { getTodayCompromissos, getCompromissosRecords } from '@/lib/services/compromissos'
import { gerarResumoMensal } from '@/lib/services/relatorios'
import { supabase } from '@/lib/db/client'
import { Wallet, FileText, Calendar, Clock } from 'lucide-react'

// Por enquanto, vamos buscar o primeiro tenant disponível
// Na implementação completa, isso virá da autenticação
async function getTenantId(): Promise<string | null> {
  const { data } = await supabase
    .from('tenants')
    .select('id')
    .limit(1)
    .single()
  
  return data?.id || null
}

async function getDashboardData() {
  // TODO: Obter tenant_id da sessão autenticada
  // Por enquanto, vamos buscar o primeiro tenant disponível
  const tenantId = await getTenantId()
  
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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">
          Visão geral das suas finanças e compromissos
        </p>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Wallet className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Gastos do Mês</p>
              <p className="text-2xl font-semibold text-gray-900">
                R$ {data.totalMes.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Registros</p>
              <p className="text-2xl font-semibold text-gray-900">
                {data.gastosMes}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Hoje</p>
              <p className="text-2xl font-semibold text-gray-900">
                {data.hoje} compromissos
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Próximos</p>
              <p className="text-2xl font-semibold text-gray-900">
                {data.proximos.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Gastos Recentes */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Gastos Recentes</h2>
        </div>
        <div className="p-6">
          {data.gastosRecentes.length > 0 ? (
            <div className="space-y-4">
              {data.gastosRecentes.map((gasto) => (
                <div
                  key={gasto.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">{gasto.description}</p>
                    <p className="text-sm text-gray-500">
                      {gasto.category} • {new Date(gasto.date).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      R$ {Number(gasto.amount).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              Nenhum gasto registrado ainda
            </p>
          )}
        </div>
      </div>

      {/* Próximos Compromissos */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Próximos Compromissos</h2>
        </div>
        <div className="p-6">
          {data.proximos.length > 0 ? (
            <div className="space-y-4">
              {data.proximos.map((compromisso) => (
                <div
                  key={compromisso.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">{compromisso.title}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(compromisso.scheduled_at).toLocaleString('pt-BR')}
                    </p>
                    {compromisso.description && (
                      <p className="text-sm text-gray-600 mt-1">
                        {compromisso.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              Nenhum compromisso agendado
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
