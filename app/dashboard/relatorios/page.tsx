import { gerarResumoMensalForContext, gerarResumoSemanalForContext, obterMaioresGastosForContext } from '@/lib/services/relatorios'
import { gerarDadosAnuais } from '@/lib/services/caixa'
import { getSessionContext } from '@/lib/utils/session-context'
import { formatCurrency } from '@/lib/utils/format-currency'
import {
  getDespesasRecordsForContext,
  getReceitasRecordsForContext,
  getFinanceiroRecordsForContext,
  calculateTotalSpentForContext,
  calculateTotalRevenueForContext,
} from '@/lib/services/financeiro'
import { ExportPDFButton } from './ExportPDFButton'

export const dynamic = 'force-dynamic'

async function getRelatoriosData() {
  const ctx = await getSessionContext()
  
  if (!ctx) {
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
      dadosAnuais: [],
      // Dados para PDF
      receitasMes: [],
      despesasMes: [],
      todasTransacoes: [],
      totalReceitas: 0,
      totalDespesas: 0,
      saldo: 0,
      mes: '',
      ano: 0,
    }
  }
  
  const resumoMensal = await gerarResumoMensalForContext(ctx)
  const resumoSemanal = await gerarResumoSemanalForContext(ctx)
  const maioresGastos = await obterMaioresGastosForContext(ctx, 10)
  const dadosAnuais = await gerarDadosAnuais(ctx)

  // Busca dados completos para o PDF (mês atual)
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)

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

  const mesNome = now.toLocaleDateString('pt-BR', { month: 'long' })
  const mesCapitalizado = mesNome.charAt(0).toUpperCase() + mesNome.slice(1)

  return {
    resumoMensal,
    resumoSemanal,
    maioresGastos,
    dadosAnuais,
    // Dados para PDF
    receitasMes,
    despesasMes,
    todasTransacoes,
    totalReceitas,
    totalDespesas,
    saldo,
    mes: mesCapitalizado,
    ano: now.getFullYear(),
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
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">Resumo Mensal</h2>
          <ExportPDFButton
            receitas={data.receitasMes}
            despesas={data.despesasMes}
            todasTransacoes={data.todasTransacoes}
            totalReceitas={data.totalReceitas}
            totalDespesas={data.totalDespesas}
            saldo={data.saldo}
            mes={data.mes}
            ano={data.ano}
          />
        </div>
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 gap-4 sm:gap-6 md:grid-cols-2">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-500">Total Gasto</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1 sm:mt-2 break-words">
                {formatCurrency(data.resumoMensal.total)}
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
                        {formatCurrency(Number(valor))}
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
                {formatCurrency(data.resumoSemanal.total)}
              </p>
              <p className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2">
                {data.resumoSemanal.totalRegistros} registros
              </p>
            </div>
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-500">Média Diária</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1 sm:mt-2 break-words">
                {formatCurrency(data.resumoSemanal.total / 7)}
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
                        {formatCurrency(Number(valor))}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Visão Anual e Fluxo de Caixa */}
      <div className="bg-white rounded-lg shadow-sm sm:shadow">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">Visão Anual {new Date().getFullYear()}</h2>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">Receitas, despesas, saldo e caixa acumulado por mês</p>
        </div>
        <div className="p-4 sm:p-6 overflow-x-auto">
          {data.dadosAnuais.length > 0 ? (
            <div className="min-w-full">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 text-xs sm:text-sm font-semibold text-gray-700 uppercase">Mês</th>
                      <th className="text-right py-3 px-4 text-xs sm:text-sm font-semibold text-gray-700 uppercase">Receitas</th>
                      <th className="text-right py-3 px-4 text-xs sm:text-sm font-semibold text-gray-700 uppercase">Despesas</th>
                      <th className="text-right py-3 px-4 text-xs sm:text-sm font-semibold text-gray-700 uppercase">Saldo</th>
                      <th className="text-right py-3 px-4 text-xs sm:text-sm font-semibold text-gray-700 uppercase">Caixa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.dadosAnuais.map((mes, index) => {
                      const isMesAtual = mes.mes === new Date().getMonth() + 1
                      return (
                        <tr
                          key={mes.mes}
                          className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                            isMesAtual ? 'bg-blue-50' : ''
                          }`}
                        >
                          <td className="py-3 px-4">
                            <span className="text-sm font-medium text-gray-900">
                              {mes.nomeMes}
                              {isMesAtual && (
                                <span className="ml-2 text-xs text-blue-600 font-semibold">(Atual)</span>
                              )}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="text-sm font-semibold text-green-600">
                              {formatCurrency(mes.receitas)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="text-sm font-semibold text-red-600">
                              {formatCurrency(mes.despesas)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className={`text-sm font-bold ${
                              mes.saldo >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {formatCurrency(mes.saldo)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className={`text-sm font-bold ${
                              mes.caixaAcumulado >= 0 ? 'text-blue-600' : 'text-red-600'
                            }`}>
                              {formatCurrency(mes.caixaAcumulado)}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 border-t-2 border-gray-300">
                      <td className="py-4 px-4">
                        <span className="text-sm font-bold text-gray-900">Total Anual</span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="text-sm font-bold text-green-600">
                          {formatCurrency(
                            data.dadosAnuais.reduce((sum, m) => sum + m.receitas, 0)
                          )}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className="text-sm font-bold text-red-600">
                          {formatCurrency(
                            data.dadosAnuais.reduce((sum, m) => sum + m.despesas, 0)
                          )}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className={`text-sm font-bold ${
                          data.dadosAnuais.reduce((sum, m) => sum + m.saldo, 0) >= 0 
                            ? 'text-green-600' 
                            : 'text-red-600'
                        }`}>
                          {formatCurrency(
                            data.dadosAnuais.reduce((sum, m) => sum + m.saldo, 0)
                          )}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right">
                        <span className={`text-sm font-bold text-blue-600`}>
                          {formatCurrency(
                            data.dadosAnuais[data.dadosAnuais.length - 1]?.caixaAcumulado || 0
                          )}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-6 sm:py-8 text-sm sm:text-base">
              Nenhum dado disponível
            </p>
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
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-100 rounded-lg flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
                      <span className="text-emerald-700 font-semibold text-xs sm:text-sm">#{index + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm sm:text-base text-gray-900 truncate">{gasto.description}</p>
                      <p className="text-xs sm:text-sm text-gray-500 truncate">{gasto.category}</p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg sm:text-xl font-bold text-gray-900 whitespace-nowrap">
                      {formatCurrency(gasto.amount)}
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
