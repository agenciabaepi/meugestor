'use client'

import type { Financeiro } from '@/lib/db/types'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils/format-currency'

interface FornecedorAgrupado {
  fornecedor: {
    id?: string
    nome: string
  }
  gastos: number
  registros: Financeiro[]
}

interface EmpresaFornecedoresTabelaProps {
  despesas: Financeiro[]
}

export function EmpresaFornecedoresTabela({
  despesas,
}: EmpresaFornecedoresTabelaProps) {
  // Agrupa por fornecedor
  const fornecedoresMap = new Map<string, FornecedorAgrupado>()

  // Processa despesas que têm fornecedor
  despesas.forEach((despesa) => {
    const metadata = despesa.metadata || {}
    const fornecedor = metadata.fornecedor as { id?: string; nome: string } | undefined

    if (!fornecedor || !fornecedor.nome) {
      return // Ignora despesas sem fornecedor
    }

    const valor = Number(despesa.amount) || 0
    const nomeFornecedor = String(fornecedor.nome).trim()
    const idFornecedor = fornecedor.id || nomeFornecedor

    if (!fornecedoresMap.has(idFornecedor)) {
      fornecedoresMap.set(idFornecedor, {
        fornecedor: {
          id: fornecedor.id,
          nome: nomeFornecedor,
        },
        gastos: 0,
        registros: [],
      })
    }

    const forn = fornecedoresMap.get(idFornecedor)!
    forn.gastos += valor
    forn.registros.push(despesa)
  })

  // Calcula totais e ordena
  const fornecedores: FornecedorAgrupado[] = Array.from(fornecedoresMap.values())
    .sort((a, b) => {
      // Ordena por maior gasto primeiro
      return b.gastos - a.gastos
    })

  // Filtra apenas despesas que têm fornecedor para calcular o total
  const despesasComFornecedor = despesas.filter((d) => {
    const metadata = d.metadata || {}
    const fornecedor = metadata.fornecedor as { nome: string } | undefined
    return fornecedor && fornecedor.nome
  })

  if (fornecedores.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm sm:shadow p-6 text-center">
        <p className="text-gray-500">Nenhum gasto com fornecedor registrado este mês.</p>
      </div>
    )
  }

  // Total apenas dos gastos com fornecedor
  const totalGeral = fornecedores.reduce((sum, f) => sum + f.gastos, 0)

  return (
    <div className="bg-white rounded-lg shadow-sm sm:shadow overflow-hidden">
      <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 bg-gray-50">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900">
          Gastos por Fornecedor
        </h2>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">
          Visão consolidada dos gastos agrupados por fornecedor
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fornecedor
              </th>
              <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Gasto
              </th>
              <th className="px-4 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Registros
              </th>
              <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                % do Total
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {fornecedores.map((forn) => {
              const percentual = totalGeral > 0 ? (forn.gastos / totalGeral) * 100 : 0
              return (
                <tr key={forn.fornecedor.id || forn.fornecedor.nome} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🏢</span>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {forn.fornecedor.id ? (
                            <Link
                              href={`/dashboard/fornecedores`}
                              className="hover:text-emerald-600 hover:underline transition-colors"
                            >
                              {forn.fornecedor.nome}
                            </Link>
                          ) : (
                            forn.fornecedor.nome
                          )}
                        </div>
                        {forn.registros.length > 0 && (
                          <div className="text-xs text-gray-500 mt-0.5">
                            {forn.registros.length} {forn.registros.length === 1 ? 'gasto' : 'gastos'}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-right">
                    <span className="text-sm font-semibold text-red-600">
                      {formatCurrency(forn.gastos)}
                    </span>
                  </td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center">
                    <span className="text-sm text-gray-600">
                      {forn.registros.length}
                    </span>
                  </td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-red-600 h-2 rounded-full transition-all"
                          style={{ width: `${Math.min(percentual, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-600 w-12 text-right">
                        {percentual.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot className="bg-gray-50">
            <tr>
              <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                <span className="text-sm font-semibold text-gray-900">Total</span>
              </td>
              <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-right">
                <span className="text-sm font-semibold text-red-600">
                  {formatCurrency(totalGeral)}
                </span>
              </td>
              <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center">
                <span className="text-sm font-semibold text-gray-900">
                  {fornecedores.reduce((sum, f) => sum + f.registros.length, 0)}
                </span>
              </td>
              <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-right">
                <span className="text-sm font-semibold text-gray-900">100%</span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}