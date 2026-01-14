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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Relatórios</h1>
        <p className="mt-2 text-gray-600">
          Análises detalhadas das suas finanças
        </p>
      </div>

      {/* Resumo Mensal */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Resumo Mensal</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Gasto</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                R$ {data.resumoMensal.total.toFixed(2)}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                {data.resumoMensal.totalRegistros} registros
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Período</p>
              <p className="text-lg font-semibold text-gray-900 mt-2">
                {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>

          {Object.keys(data.resumoMensal.porCategoria).length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Por Categoria</h3>
              <div className="space-y-3">
                {Object.entries(data.resumoMensal.porCategoria)
                  .sort(([, a], [, b]) => Number(b) - Number(a))
                  .map(([categoria, valor]) => (
                    <div key={categoria} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">{categoria}</span>
                      <span className="font-semibold text-gray-900">
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
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Resumo Semanal</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Gasto</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                R$ {data.resumoSemanal.total.toFixed(2)}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                {data.resumoSemanal.totalRegistros} registros
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Média Diária</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                R$ {(data.resumoSemanal.total / 7).toFixed(2)}
              </p>
            </div>
          </div>

          {Object.keys(data.resumoSemanal.porCategoria).length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Por Categoria</h3>
              <div className="space-y-3">
                {Object.entries(data.resumoSemanal.porCategoria)
                  .sort(([, a], [, b]) => Number(b) - Number(a))
                  .map(([categoria, valor]) => (
                    <div key={categoria} className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">{categoria}</span>
                      <span className="font-semibold text-gray-900">
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
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Maiores Gastos</h2>
        </div>
        <div className="p-6">
          {data.maioresGastos.length > 0 ? (
            <div className="space-y-4">
              {data.maioresGastos.map((gasto, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                      <span className="text-blue-600 font-semibold">#{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{gasto.description}</p>
                      <p className="text-sm text-gray-500">{gasto.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-gray-900">
                      R$ {gasto.amount.toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              Nenhum gasto registrado
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
