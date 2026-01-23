'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'

interface PeriodoSelectorProps {
  basePath?: string
}

const months = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
]

export function PeriodoSelector({ basePath }: PeriodoSelectorProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isOpen, setIsOpen] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)
  
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
  
  const [tempMonth, setTempMonth] = useState(currentMonth - 1)
  const [tempYear, setTempYear] = useState(currentYear)
  
  // Atualiza o período na URL
  const updatePeriod = (month: number, year: number) => {
    setSelectedDate(new Date(year, month, 1))
    
    const params = new URLSearchParams(searchParams.toString())
    params.set('mes', (month + 1).toString())
    params.set('ano', year.toString())
    router.push(`${currentBasePath}?${params.toString()}`)
    setIsOpen(false)
  }
  
  // Sincroniza tempMonth e tempYear quando abre o modal
  useEffect(() => {
    if (isOpen) {
      setTempMonth(currentMonth - 1)
      setTempYear(currentYear)
    }
  }, [isOpen, currentMonth, currentYear])
  
  // Fecha ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])
  
  // Fecha com ESC
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const monthName = selectedDate.toLocaleDateString('pt-BR', { 
    month: 'long', 
    year: 'numeric' 
  })
  
  const navigateYear = (direction: 'prev' | 'next') => {
    setTempYear(prev => direction === 'prev' ? prev - 1 : prev + 1)
  }
  
  const handleMonthSelect = (month: number) => {
    updatePeriod(month, tempYear)
  }

  return (
    <>
      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm text-gray-700 dark:text-gray-300"
        >
          <Calendar className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          <span className="font-medium">
            {monthName}
          </span>
        </button>
      </div>
      
      {/* Modal do Calendário */}
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div 
            ref={modalRef}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-white font-semibold text-lg">Selecionar Período</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-lg hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            
            {/* Navegação de Ano */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <button
                onClick={() => navigateYear('prev')}
                className="w-9 h-9 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              <span className="text-2xl font-bold text-gray-900 dark:text-white">{tempYear}</span>
              <button
                onClick={() => navigateYear('next')}
                className="w-9 h-9 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
            
            {/* Grid de Meses */}
            <div className="p-6">
              <div className="grid grid-cols-3 gap-3">
                {months.map((month, index) => {
                  const isSelected = index === tempMonth && tempYear === currentYear && (index + 1) === currentMonth
                  const isCurrentMonth = index === now.getMonth() && tempYear === now.getFullYear()
                  
                  return (
                    <button
                      key={index}
                      onClick={() => handleMonthSelect(index)}
                      className={`
                        px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200
                        ${isSelected
                          ? 'bg-emerald-500 text-white shadow-lg scale-105'
                          : isCurrentMonth
                          ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-2 border-emerald-300 dark:border-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
                          : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 hover:scale-105'
                        }
                      `}
                    >
                      {month}
                    </button>
                  )
                })}
              </div>
            </div>
            
            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  const today = new Date()
                  updatePeriod(today.getMonth(), today.getFullYear())
                }}
                className="px-4 py-2 text-sm font-medium text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
              >
                Hoje
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}