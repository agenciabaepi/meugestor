'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Compromisso } from '@/lib/db/types'

export function CalendarView({ compromissos }: { compromissos: Compromisso[] }) {
  const [currentDate, setCurrentDate] = useState(new Date())

  // Navegação de mês
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  // Gera os dias do mês
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    
    // Primeiro dia do mês
    const firstDay = new Date(year, month, 1)
    // Último dia do mês
    const lastDay = new Date(year, month + 1, 0)
    
    // Dia da semana do primeiro dia (0 = domingo, 6 = sábado)
    const startDayOfWeek = firstDay.getDay()
    
    // Número de dias no mês
    const daysInMonth = lastDay.getDate()
    
    // Array para armazenar todos os dias do calendário
    const days: (Date | null)[] = []
    
    // Adiciona dias vazios antes do primeiro dia do mês
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(null)
    }
    
    // Adiciona todos os dias do mês
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day))
    }
    
    return days
  }, [currentDate])

  // Agrupa compromissos por data (YYYY-MM-DD)
  const compromissosByDate = useMemo(() => {
    const grouped = new Map<string, Compromisso[]>()
    
    compromissos.forEach((compromisso) => {
      const data = new Date(compromisso.scheduled_at)
      const dateKey = data.toISOString().split('T')[0] // YYYY-MM-DD
      
      if (!grouped.has(dateKey)) {
        grouped.set(dateKey, [])
      }
      
      grouped.get(dateKey)!.push(compromisso)
    })
    
    // Ordena compromissos por horário dentro de cada dia
    grouped.forEach((comps) => {
      comps.sort((a, b) => 
        new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
      )
    })
    
    return grouped
  }, [compromissos])

  // Verifica se uma data é hoje
  const isToday = (date: Date | null): boolean => {
    if (!date) return false
    const today = new Date()
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    )
  }

  // Verifica se uma data está no mês atual
  const isCurrentMonth = (date: Date | null): boolean => {
    if (!date) return false
    return (
      date.getMonth() === currentDate.getMonth() &&
      date.getFullYear() === currentDate.getFullYear()
    )
  }

  // Nome do mês e ano
  const monthName = currentDate.toLocaleDateString('pt-BR', { 
    month: 'long', 
    year: 'numeric' 
  })

  // Nomes dos dias da semana
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Cabeçalho do calendário */}
      <div className="p-4 sm:p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={goToPreviousMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
              aria-label="Mês anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 capitalize">
              {monthName}
            </h2>
            <button
              onClick={goToNextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition"
              aria-label="Próximo mês"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <button
            onClick={goToToday}
            className="px-4 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition"
          >
            Hoje
          </button>
        </div>
      </div>

      {/* Grade do calendário */}
      <div className="p-4 sm:p-6">
        {/* Cabeçalho dos dias da semana */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {weekDays.map((day) => (
            <div
              key={day}
              className="text-center text-xs sm:text-sm font-semibold text-gray-500 py-2"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Dias do calendário */}
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((date, index) => {
            if (!date) {
              return (
                <div
                  key={`empty-${index}`}
                  className="aspect-square bg-gray-50 rounded-lg"
                />
              )
            }

            const dateKey = date.toISOString().split('T')[0]
            const dayCompromissos = compromissosByDate.get(dateKey) || []
            const today = isToday(date)
            const currentMonth = isCurrentMonth(date)

            return (
              <div
                key={dateKey}
                className={`aspect-square rounded-lg border-2 p-1 sm:p-2 transition ${
                  today
                    ? 'bg-blue-50 border-blue-500'
                    : currentMonth
                    ? 'bg-white border-gray-200 hover:border-gray-300'
                    : 'bg-gray-50 border-gray-100'
                }`}
              >
                {/* Número do dia */}
                <div
                  className={`text-xs sm:text-sm font-semibold mb-1 ${
                    today
                      ? 'text-blue-700'
                      : currentMonth
                      ? 'text-gray-900'
                      : 'text-gray-400'
                  }`}
                >
                  {date.getDate()}
                </div>

                {/* Compromissos do dia */}
                <div className="space-y-1 overflow-hidden">
                  {dayCompromissos.slice(0, 3).map((compromisso) => {
                    const hora = new Date(compromisso.scheduled_at).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })

                    return (
                      <div
                        key={compromisso.id}
                        className={`text-xs px-1.5 py-0.5 rounded truncate ${
                          today
                            ? 'bg-blue-200 text-blue-900'
                            : 'bg-indigo-100 text-indigo-900'
                        }`}
                        title={`${hora} - ${compromisso.title}`}
                      >
                        <span className="font-medium">{hora}</span>{' '}
                        <span className="truncate">{compromisso.title}</span>
                      </div>
                    )
                  })}
                  {dayCompromissos.length > 3 && (
                    <div
                      className={`text-xs px-1.5 py-0.5 rounded ${
                        today ? 'text-blue-700' : 'text-gray-600'
                      }`}
                    >
                      +{dayCompromissos.length - 3} mais
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
