import { gerarRelatorioFinanceiro, gerarResumoMensal, gerarResumoSemanal, obterMaioresGastos } from '@/lib/services/relatorios'
import { supabase } from '@/lib/db/client'

async function getTenantId(): Promise<string | null> {
  const { data } = await supabase
    .from('tenants')
    .select('id')
    .limit(1)
    .single()
  
  return data?.id || null
}

async function getRelatoriosData() {
  const tenantId = await getTenantId()
  
  if (!tenantId) {
    return {
      resumoMensal: {
        total: 0,
        porCategoria: {},
        totalRegistros: 0,
        periodo: { inicio: '', fim: '' },
      },
      resumoSemanal: {
        total: 0,
        porCategoria: {},
        totalRegistros: 0,
        periodo: { inicio: '', fim: '' },
      },
      maioresGastos: [],
    }
  }
  
  const resumoMensal = await gerarResumoMensal(tenantId)
  const resumoSemanal = await gerarResumoSemanal(tenantId)
  const maioresGastos = await obterMaioresGastos(tenantId, 10)

  return {
    resumoMensal,
    resumoSemanal,
    maioresGastos,
  }
}

export default async function RelatoriosPage() {
  const data = await getRelatoriosData()

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Relatórios</h1>
        <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">
          Análises detalhadas das suas finanças
        </p>
      </div>

      {/* Resumo Mensal */}
      <div className="bg-white rounded-lg shadow-sm sm:shadow">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">Resumo Mensal</h2>
        </div>
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-500">Total Gasto</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1 sm:mt-2 break-words">
                R$ {data.resumoMensal.total.toFixed(2)}
              </p>
              <p className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2">
                {data.resumoMensal.totalRegistros} registros
              </p>
            </div>
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-500">Período</p>
              <p className="text-base sm:text-lg font-semibold text-gray-900 mt-1 sm:mt-2">
                {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>

          {Object.keys(data.resumoMensal.porCategoria).length > 0 && (
            <div className="mt-4 sm:mt-6">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-900 mb-3 sm:mb-4">Por Categoria</h3>
              <div className="space-y-2 sm:space-y-3">
                {Object.entries(data.resumoMensal.porCategoria)
                  .sort(([, a], [, b]) => Number(b) - Number(a))
                  .map(([categoria, valor]) => (
                    <div key={categoria} className="flex items-center justify-between p-2 sm:p-0">
                      <span className="text-xs sm:text-sm text-gray-700 truncate pr-2">{categoria}</span>
                      <span className="font-semibold text-sm sm:text-base text-gray-900 whitespace-nowrap">
                        R$ {Number(valor).toFixed(2)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Resumo Semanal */}
      <div className="bg-white rounded-lg shadow-sm sm:shadow">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">Resumo Semanal</h2>
        </div>
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-500">Total Gasto</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1 sm:mt-2 break-words">
                R$ {data.resumoSemanal.total.toFixed(2)}
              </p>
              <p className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2">
                {data.resumoSemanal.totalRegistros} registros
              </p>
            </div>
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-500">Média Diária</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1 sm:mt-2 break-words">
                R$ {(data.resumoSemanal.total / 7).toFixed(2)}
              </p>
            </div>
          </div>

          {Object.keys(data.resumoSemanal.porCategoria).length > 0 && (
            <div className="mt-4 sm:mt-6">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-900 mb-3 sm:mb-4">Por Categoria</h3>
              <div className="space-y-2 sm:space-y-3">
                {Object.entries(data.resumoSemanal.porCategoria)
                  .sort(([, a], [, b]) => Number(b) - Number(a))
                  .map(([categoria, valor]) => (
                    <div key={categoria} className="flex items-center justify-between p-2 sm:p-0">
                      <span className="text-xs sm:text-sm text-gray-700 truncate pr-2">{categoria}</span>
                      <span className="font-semibold text-sm sm:text-base text-gray-900 whitespace-nowrap">
                        R$ {Number(valor).toFixed(2)}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Maiores Gastos */}
      <div className="bg-white rounded-lg shadow-sm sm:shadow">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">Maiores Gastos</h2>
        </div>
        <div className="p-3 sm:p-4 lg:p-6">
          {data.maioresGastos.length > 0 ? (
            <div className="space-y-2 sm:space-y-3">
              {data.maioresGastos.map((gasto, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center flex-1 min-w-0 pr-2">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
                      <span className="text-blue-600 font-semibold text-xs sm:text-sm">#{index + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm sm:text-base text-gray-900 truncate">{gasto.description}</p>
                      <p className="text-xs sm:text-sm text-gray-500 truncate">{gasto.category}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg sm:text-xl font-bold text-gray-900 whitespace-nowrap">
                      R$ {gasto.amount.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-6 sm:py-8 text-sm sm:text-base">
              Nenhum gasto registrado
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
