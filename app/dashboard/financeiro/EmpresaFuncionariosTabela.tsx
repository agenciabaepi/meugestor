'use client'

import type { Financeiro } from '@/lib/db/types'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { formatCurrency } from '@/lib/utils/format-currency'

interface FuncionarioAgrupado {
  funcionario: {
    id: string
    nome: string
  }
  gastos: number
  registros: Financeiro[]
}

interface EmpresaFuncionariosTabelaProps {
  despesas: Financeiro[]
}

export function EmpresaFuncionariosTabela({
  despesas,
}: EmpresaFuncionariosTabelaProps) {
  const [funcionariosInfo, setFuncionariosInfo] = useState<Record<string, { nome: string }>>({})

  // Busca informações dos funcionários
  useEffect(() => {
    const funcionarioIds = new Set<string>()
    despesas.forEach((despesa) => {
      const funcionarioId = (despesa as any).funcionario_id
      if (funcionarioId) {
        funcionarioIds.add(funcionarioId)
      }
    })

    if (funcionarioIds.size > 0) {
      Promise.all(
        Array.from(funcionarioIds).map(async (id) => {
          try {
            const response = await fetch(`/api/funcionarios/${id}`)
            if (response.ok) {
              const data = await response.json()
              return { id, nome: data.funcionario?.nome_original || 'Funcionário desconhecido' }
            }
          } catch (error) {
            console.error('Erro ao buscar funcionário:', error)
          }
          return { id, nome: 'Funcionário desconhecido' }
        })
      ).then((results) => {
        const info: Record<string, { nome: string }> = {}
        results.forEach((r) => {
          if (r) info[r.id] = { nome: r.nome }
        })
        setFuncionariosInfo(info)
      })
    }
  }, [despesas])

  // Agrupa por funcionário
  const funcionariosMap = new Map<string, FuncionarioAgrupado>()

  // Processa despesas que têm funcionario_id
  despesas.forEach((despesa) => {
    const funcionarioId = (despesa as any).funcionario_id

    if (!funcionarioId) {
      return // Ignora despesas sem funcionário
    }

    const valor = Number(despesa.amount) || 0
    const nomeFuncionario = funcionariosInfo[funcionarioId]?.nome || 'Funcionário desconhecido'

    if (!funcionariosMap.has(funcionarioId)) {
      funcionariosMap.set(funcionarioId, {
        funcionario: {
          id: funcionarioId,
          nome: nomeFuncionario,
        },
        gastos: 0,
        registros: [],
      })
    }

    const func = funcionariosMap.get(funcionarioId)!
    func.gastos += valor
    func.registros.push(despesa)
  })

  // Calcula totais e ordena
  const funcionarios: FuncionarioAgrupado[] = Array.from(funcionariosMap.values())
    .sort((a, b) => {
      // Ordena por maior gasto primeiro
      return b.gastos - a.gastos
    })

  // Conta despesas sem funcionário (da categoria Funcionários mas sem funcionario_id)
  const despesasSemFuncionario = despesas.filter((d) => {
    const funcionarioId = (d as any).funcionario_id
    return !funcionarioId && d.category === 'Funcionários'
  })

  const totalSemFuncionario = despesasSemFuncionario.reduce(
    (sum, d) => sum + Number(d.amount || 0),
    0
  )

  if (funcionarios.length === 0 && despesasSemFuncionario.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm sm:shadow p-6 text-center">
        <p className="text-gray-500">Nenhum pagamento de funcionário registrado este mês.</p>
      </div>
    )
  }

  const totalGeral = funcionarios.reduce((sum, f) => sum + f.gastos, 0) + totalSemFuncionario

  return (
    <div className="bg-white rounded-lg shadow-sm sm:shadow overflow-hidden">
      <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 bg-gray-50">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900">
          Pagamentos por Funcionário
        </h2>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">
          Visão consolidada dos pagamentos agrupados por funcionário
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Funcionário
              </th>
              <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Pago
              </th>
              <th className="px-4 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pagamentos
              </th>
              <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                % do Total
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {funcionarios.map((func) => {
              const percentual = totalGeral > 0 ? (func.gastos / totalGeral) * 100 : 0
              return (
                <tr key={func.funcionario.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="text-base">👤</span>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          <Link
                            href={`/dashboard/funcionarios`}
                            className="hover:text-emerald-600 hover:underline transition-colors"
                          >
                            {func.funcionario.nome}
                          </Link>
                        </div>
                        {func.registros.length > 0 && (
                          <div className="text-xs text-gray-500 mt-0.5">
                            {func.registros.length} {func.registros.length === 1 ? 'pagamento' : 'pagamentos'}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-right">
                    <span className="text-sm font-semibold text-red-600">
                      {formatCurrency(func.gastos)}
                    </span>
                  </td>
                  <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center">
                    <span className="text-sm text-gray-600">
                      {func.registros.length}
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

            {/* Linha para despesas sem funcionário */}
            {despesasSemFuncionario.length > 0 && (
              <tr className="hover:bg-gray-50 transition-colors bg-gray-50/50">
                <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className="text-base">❓</span>
                    <div>
                      <div className="text-sm font-medium text-gray-600 italic">
                        Sem funcionário
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {despesasSemFuncionario.length}{' '}
                        {despesasSemFuncionario.length === 1 ? 'pagamento' : 'pagamentos'}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-right">
                  <span className="text-sm font-semibold text-gray-600">
                    {formatCurrency(totalSemFuncionario)}
                  </span>
                </td>
                <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center">
                  <span className="text-sm text-gray-500">
                    {despesasSemFuncionario.length}
                  </span>
                </td>
                <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gray-400 h-2 rounded-full transition-all"
                        style={{
                          width: `${Math.min((totalSemFuncionario / totalGeral) * 100, 100)}%`,
                        }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-12 text-right">
                      {totalGeral > 0
                        ? ((totalSemFuncionario / totalGeral) * 100).toFixed(1)
                        : '0.0'}
                      %
                    </span>
                  </div>
                </td>
              </tr>
            )}
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
                  {funcionarios.reduce((sum, f) => sum + f.registros.length, 0) + despesasSemFuncionario.length}
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
