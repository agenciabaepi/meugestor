'use client'

import type { Financeiro } from '@/lib/db/types'

interface CategoriaAgrupada {
  categoria: string
  gastos: number
  receitas: number
  saldo: number
  registrosGastos: Financeiro[]
  registrosReceitas: Financeiro[]
}

interface EmpresaCategoriasTabelaProps {
  despesas: Financeiro[]
  receitas: Financeiro[]
}

export function EmpresaCategoriasTabela({
  despesas,
  receitas,
}: EmpresaCategoriasTabelaProps) {
  // Agrupa por categoria
  const categoriasMap = new Map<string, CategoriaAgrupada>()

  // Processa despesas
  despesas.forEach((despesa) => {
    const categoria = despesa.category || 'Outros'
    const valor = Number(despesa.amount) || 0

    if (!categoriasMap.has(categoria)) {
      categoriasMap.set(categoria, {
        categoria,
        gastos: 0,
        receitas: 0,
        saldo: 0,
        registrosGastos: [],
        registrosReceitas: [],
      })
    }

    const cat = categoriasMap.get(categoria)!
    cat.gastos += valor
    cat.registrosGastos.push(despesa)
  })

  // Processa receitas
  receitas.forEach((receita) => {
    const categoria = receita.category || 'Outros'
    const valor = Number(receita.amount) || 0

    if (!categoriasMap.has(categoria)) {
      categoriasMap.set(categoria, {
        categoria,
        gastos: 0,
        receitas: 0,
        saldo: 0,
        registrosGastos: [],
        registrosReceitas: [],
      })
    }

    const cat = categoriasMap.get(categoria)!
    cat.receitas += valor
    cat.registrosReceitas.push(receita)
  })

  // Calcula saldo e ordena
  const categorias: CategoriaAgrupada[] = Array.from(categoriasMap.values())
    .map((cat) => ({
      ...cat,
      saldo: cat.receitas - cat.gastos,
    }))
    .sort((a, b) => {
      // Ordena por maior gasto primeiro
      if (Math.abs(b.gastos - a.gastos) > 0.01) {
        return b.gastos - a.gastos
      }
      // Se gastos iguais, ordena por receitas
      return b.receitas - a.receitas
    })

  if (categorias.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm sm:shadow p-6 text-center">
        <p className="text-gray-500">Nenhum registro financeiro encontrado este mês.</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm sm:shadow overflow-hidden">
      <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 bg-gray-50">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900">
          Gastos e Receitas por Categoria
        </h2>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">
          Visão consolidada das transações agrupadas por categoria
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Categoria
              </th>
              <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Gastos
              </th>
              <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Receitas
              </th>
              <th className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Saldo
              </th>
              <th className="px-4 sm:px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Registros
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {categorias.map((cat) => (
              <tr key={cat.categoria} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{cat.categoria}</div>
                  <div className="text-xs text-gray-500">
                    {cat.registrosGastos.length} gasto{cat.registrosGastos.length !== 1 ? 's' : ''} •{' '}
                    {cat.registrosReceitas.length} receita{cat.registrosReceitas.length !== 1 ? 's' : ''}
                  </div>
                </td>
                <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-right">
                  <span className="text-sm font-semibold text-red-600">
                    R$ {cat.gastos.toFixed(2)}
                  </span>
                </td>
                <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-right">
                  <span className="text-sm font-semibold text-green-600">
                    R$ {cat.receitas.toFixed(2)}
                  </span>
                </td>
                <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-right">
                  <span
                    className={`text-sm font-semibold ${
                      cat.saldo >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {cat.saldo >= 0 ? '+' : ''}R$ {cat.saldo.toFixed(2)}
                  </span>
                </td>
                <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center">
                  <span className="text-sm text-gray-600">
                    {cat.registrosGastos.length + cat.registrosReceitas.length}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-50">
            <tr>
              <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                <span className="text-sm font-semibold text-gray-900">Total</span>
              </td>
              <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-right">
                <span className="text-sm font-semibold text-red-600">
                  R${' '}
                  {categorias.reduce((sum, cat) => sum + cat.gastos, 0).toFixed(2)}
                </span>
              </td>
              <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-right">
                <span className="text-sm font-semibold text-green-600">
                  R${' '}
                  {categorias.reduce((sum, cat) => sum + cat.receitas, 0).toFixed(2)}
                </span>
              </td>
              <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-right">
                <span
                  className={`text-sm font-semibold ${
                    categorias.reduce((sum, cat) => sum + cat.saldo, 0) >= 0
                      ? 'text-green-600'
                      : 'text-red-600'
                  }`}
                >
                  {categorias.reduce((sum, cat) => sum + cat.saldo, 0) >= 0 ? '+' : ''}R${' '}
                  {categorias.reduce((sum, cat) => sum + cat.saldo, 0).toFixed(2)}
                </span>
              </td>
              <td className="px-4 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-center">
                <span className="text-sm font-semibold text-gray-900">
                  {despesas.length + receitas.length}
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}