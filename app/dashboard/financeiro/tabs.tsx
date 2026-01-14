'use client'

import { useState } from 'react'
import { Charts } from './charts'
import type { Financeiro } from '@/lib/db/types'

interface FinanceiroTabsProps {
  despesas: Financeiro[]
  receitas: Financeiro[]
  todasTransacoes: Financeiro[]
  dadosGraficoDespesas: Array<{ date: string; total: number }>
  dadosGraficoReceitas: Array<{ date: string; total: number }>
  dadosPorCategoriaDespesas: Array<{ name: string; value: number }>
  dadosPorCategoriaReceitas: Array<{ name: string; value: number }>
  cores: string[]
}

export function FinanceiroTabs({
  despesas,
  receitas,
  todasTransacoes,
  dadosGraficoDespesas,
  dadosGraficoReceitas,
  dadosPorCategoriaDespesas,
  dadosPorCategoriaReceitas,
  cores,
}: FinanceiroTabsProps) {
  const [activeTab, setActiveTab] = useState<'todos' | 'despesas' | 'receitas'>('todos')

  const getCurrentData = () => {
    switch (activeTab) {
      case 'despesas':
        return despesas
      case 'receitas':
        return receitas
      default:
        return todasTransacoes
    }
  }

  const getCurrentCharts = () => {
    switch (activeTab) {
      case 'despesas':
        return {
          dadosGrafico: dadosGraficoDespesas,
          dadosPorCategoria: dadosPorCategoriaDespesas,
        }
      case 'receitas':
        return {
          dadosGrafico: dadosGraficoReceitas,
          dadosPorCategoria: dadosPorCategoriaReceitas,
        }
      default:
        // Para "todos", combina os dados
        const dadosGraficoCombinados = dadosGraficoDespesas.map((item, index) => ({
          date: item.date,
          total: item.total + (dadosGraficoReceitas[index]?.total || 0),
        }))
        const dadosPorCategoriaCombinados = dadosPorCategoriaDespesas.map((item) => {
          const receita = dadosPorCategoriaReceitas.find(r => r.name === item.name)
          return {
            name: item.name,
            value: item.value + (receita?.value || 0),
          }
        })
        return {
          dadosGrafico: dadosGraficoCombinados,
          dadosPorCategoria: dadosPorCategoriaCombinados.filter(d => d.value > 0),
        }
    }
  }

  const currentData = getCurrentData()
  const currentCharts = getCurrentCharts()
  const title = activeTab === 'despesas' ? 'Despesas' : activeTab === 'receitas' ? 'Receitas' : 'Todas as Transações'

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Abas */}
      <div className="bg-white rounded-lg shadow-sm sm:shadow">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('todos')}
              className={`
                flex-1 px-4 py-3 text-center text-sm font-medium border-b-2 transition-colors
                ${activeTab === 'todos'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              Todas ({todasTransacoes.length})
            </button>
            <button
              onClick={() => setActiveTab('receitas')}
              className={`
                flex-1 px-4 py-3 text-center text-sm font-medium border-b-2 transition-colors
                ${activeTab === 'receitas'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              Receitas ({receitas.length})
            </button>
            <button
              onClick={() => setActiveTab('despesas')}
              className={`
                flex-1 px-4 py-3 text-center text-sm font-medium border-b-2 transition-colors
                ${activeTab === 'despesas'
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              Despesas ({despesas.length})
            </button>
          </nav>
        </div>
      </div>

      {/* Gráficos */}
      <Charts 
        dadosGrafico={currentCharts.dadosGrafico}
        dadosPorCategoria={currentCharts.dadosPorCategoria}
        cores={cores}
        tituloGrafico={
          activeTab === 'despesas' 
            ? 'Despesas dos Últimos 7 Dias'
            : activeTab === 'receitas'
            ? 'Receitas dos Últimos 7 Dias'
            : 'Transações dos Últimos 7 Dias'
        }
        tituloCategoria={
          activeTab === 'despesas'
            ? 'Despesas por Categoria'
            : activeTab === 'receitas'
            ? 'Receitas por Categoria'
            : 'Transações por Categoria'
        }
      />

      {/* Lista de Transações */}
      <div className="bg-white rounded-lg shadow-sm sm:shadow">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">
            {title} do Mês
          </h2>
        </div>
        <div className="p-3 sm:p-4 lg:p-6">
          {currentData.length > 0 ? (
            <div className="space-y-2 sm:space-y-3">
              {currentData.map((transacao) => {
                // Fallback: se transaction_type não existir, assume despesa (comportamento antigo)
                const isReceita = (transacao as any).transaction_type === 'revenue'
                return (
                  <div
                    key={transacao.id}
                    className={`flex items-center justify-between p-3 sm:p-4 rounded-lg hover:bg-gray-100 transition ${
                      isReceita ? 'bg-green-50' : 'bg-red-50'
                    }`}
                  >
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                          isReceita 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {isReceita ? '💰 Receita' : '💸 Despesa'}
                        </span>
                        <p className="font-medium text-sm sm:text-base text-gray-900 truncate">
                          {transacao.description}
                        </p>
                      </div>
                      <div className="flex items-center flex-wrap gap-2 sm:gap-4 mt-1">
                        <p className="text-xs sm:text-sm text-gray-500">
                          {transacao.category}
                        </p>
                        {transacao.subcategory && (
                          <p className="text-xs sm:text-sm text-gray-400">
                            • {transacao.subcategory}
                          </p>
                        )}
                        <p className="text-xs sm:text-sm text-gray-500">
                          {new Date(transacao.date).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`font-semibold text-sm sm:text-base lg:text-lg whitespace-nowrap ${
                        isReceita ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {isReceita ? '+' : '-'}R$ {Number(transacao.amount).toFixed(2)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-6 sm:py-8 text-sm sm:text-base">
              {activeTab === 'despesas' && 'Nenhuma despesa registrada este mês'}
              {activeTab === 'receitas' && 'Nenhuma receita registrada este mês'}
              {activeTab === 'todos' && 'Nenhuma transação registrada este mês'}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
