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
}

export function FinanceiroTabs({
  despesas,
  receitas,
  todasTransacoes,
  dadosGraficoDespesas,
  dadosGraficoReceitas,
}: FinanceiroTabsProps) {
  const [activeTab, setActiveTab] = useState<'todos' | 'despesas' | 'receitas'>('todos')

  const getCurrentCharts = () => {
    switch (activeTab) {
      case 'despesas':
        return {
          dadosGrafico: dadosGraficoDespesas,
        }
      case 'receitas':
        return {
          dadosGrafico: dadosGraficoReceitas,
        }
      default:
        // Para "todos", combina os dados
        const dadosGraficoCombinados = dadosGraficoDespesas.map((item, index) => ({
          date: item.date,
          total: item.total + (dadosGraficoReceitas[index]?.total || 0),
        }))
        return {
          dadosGrafico: dadosGraficoCombinados,
        }
    }
  }

  const currentCharts = getCurrentCharts()

  return (
    <div id="financeiro-tabs" className="space-y-4 sm:space-y-6 w-full overflow-x-hidden">
      {/* Abas */}
      <div className="bg-white rounded-lg shadow-sm sm:shadow overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('todos')}
              className={`
                flex-1 px-2 sm:px-4 py-3 text-center text-xs sm:text-sm font-medium border-b-2 transition-colors touch-manipulation
                ${activeTab === 'todos'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
              style={{ minHeight: '44px' }}
            >
              <span className="block sm:inline">Todas</span>
              <span className="block sm:inline">({todasTransacoes.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('receitas')}
              className={`
                flex-1 px-2 sm:px-4 py-3 text-center text-xs sm:text-sm font-medium border-b-2 transition-colors touch-manipulation
                ${activeTab === 'receitas'
                  ? 'border-green-600 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
              style={{ minHeight: '44px' }}
            >
              <span className="block sm:inline">Receitas</span>
              <span className="block sm:inline">({receitas.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('despesas')}
              className={`
                flex-1 px-2 sm:px-4 py-3 text-center text-xs sm:text-sm font-medium border-b-2 transition-colors touch-manipulation
                ${activeTab === 'despesas'
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
              style={{ minHeight: '44px' }}
            >
              <span className="block sm:inline">Despesas</span>
              <span className="block sm:inline">({despesas.length})</span>
            </button>
          </nav>
        </div>
      </div>

      {/* Gráficos */}
      <Charts 
        dadosGrafico={currentCharts.dadosGrafico}
        tituloGrafico={
          activeTab === 'despesas' 
            ? 'Despesas dos Últimos 7 Dias'
            : activeTab === 'receitas'
            ? 'Receitas dos Últimos 7 Dias'
            : 'Transações dos Últimos 7 Dias'
        }
      />
    </div>
  )
}
