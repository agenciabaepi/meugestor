'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { useState } from 'react'

interface PeriodoSelectorProps {
  basePath?: string
}

export function PeriodoSelector({ basePath }: PeriodoSelectorProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  // Usa basePath se fornecido, senão usa o pathname atual
  const currentBasePath = basePath || pathname || '/dashboard/financeiro'
  
  // Obtém o mês atual da URL ou usa o mês atual
  const monthParam = searchParams.get('mes')
  const yearParam = searchParams.get('ano')
  
  const now = new Date()
  const currentMonth = monthParam ? parseInt(monthParam) : now.getMonth() + 1
  const currentYear = yearParam ? parseInt(yearParam) : now.getFullYear()
  
  const [selectedDate, setSelectedDate] = useState(
    new Date(currentYear, currentMonth - 1, 1)
  )
  
  // Navega para o mês anterior
  const goToPreviousMonth = () => {
    const newDate = new Date(selectedDate)
    newDate.setMonth(newDate.getMonth() - 1)
    updatePeriod(newDate)
  }
  
  // Navega para o próximo mês
  const goToNextMonth = () => {
    const newDate = new Date(selectedDate)
    newDate.setMonth(newDate.getMonth() + 1)
    updatePeriod(newDate)
  }
  
  // Vai para o mês atual
  const goToCurrentMonth = () => {
    updatePeriod(new Date())
  }
  
  // Atualiza o período na URL
  const updatePeriod = (date: Date) => {
    const month = date.getMonth() + 1
    const year = date.getFullYear()
    setSelectedDate(date)
    
    const params = new URLSearchParams(searchParams.toString())
    params.set('mes', month.toString())
    params.set('ano', year.toString())
    router.push(`${currentBasePath}?${params.toString()}`)
  }
  
  // Verifica se é o mês atual
  const isCurrentMonth = 
    selectedDate.getMonth() === now.getMonth() &&
    selectedDate.getFullYear() === now.getFullYear()
  
  // Formata o nome do mês
  const monthName = selectedDate.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric'
  })
  
  // Gera lista dos últimos 6 meses para abas
  const recentMonths = Array.from({ length: 6 }, (_, i) => {
    const date = new Date(now)
    date.setMonth(date.getMonth() - i)
    return {
      month: date.getMonth() + 1,
      year: date.getFullYear(),
      date,
      label: date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
      isCurrent: i === 0,
    }
  }).reverse()
  
  return (
    <div className="bg-white rounded-lg shadow-sm sm:shadow p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Navegação de Mês */}
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            onClick={goToPreviousMonth}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Mês anterior"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          
          <div className="flex items-center gap-2 sm:gap-3">
            <Calendar className="w-5 h-5 text-emerald-600" />
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 capitalize">
                {monthName}
              </h2>
              {!isCurrentMonth && (
                <button
                  onClick={goToCurrentMonth}
                  className="text-xs text-emerald-600 hover:text-emerald-700 underline mt-0.5"
                >
                  Voltar para o mês atual
                </button>
              )}
            </div>
          </div>
          
          <button
            onClick={goToNextMonth}
            disabled={isCurrentMonth}
            className={`p-2 rounded-lg transition-colors ${
              isCurrentMonth
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:bg-gray-100'
            }`}
            aria-label="Próximo mês"
          >
            <ChevronRight className={`w-5 h-5 ${isCurrentMonth ? 'text-gray-400' : 'text-gray-600'}`} />
          </button>
        </div>
        
        {/* Seleção de Mês/Ano */}
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={`${currentYear}-${String(currentMonth).padStart(2, '0')}`}
            onChange={(e) => {
              const [year, month] = e.target.value.split('-')
              const newDate = new Date(parseInt(year), parseInt(month) - 1, 1)
              updatePeriod(newDate)
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
          />
        </div>
      </div>
      
      {/* Abas de Meses Recentes */}
      <div className="mt-4 sm:mt-6 border-t border-gray-200 pt-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300">
          {recentMonths.map((m) => {
            const isSelected = 
              m.month === currentMonth && m.year === currentYear
            
            return (
              <button
                key={`${m.year}-${m.month}`}
                onClick={() => updatePeriod(m.date)}
                className={`
                  px-3 sm:px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap
                  transition-colors
                  ${
                    isSelected
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                      : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                  }
                `}
              >
                {m.label}
                {m.isCurrent && (
                  <span className="ml-1 text-xs text-emerald-600">•</span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}