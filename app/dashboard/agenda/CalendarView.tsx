'use client'

import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, X, Check, XCircle } from 'lucide-react'
import type { Compromisso } from '@/lib/db/types'

export function CalendarView({ compromissos }: { compromissos: Compromisso[] }) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

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

  // Agrupa compromissos por data (YYYY-MM-DD) usando timezone do Brasil
  const compromissosByDate = useMemo(() => {
    const grouped = new Map<string, Compromisso[]>()
    
    compromissos.forEach((compromisso) => {
      const data = new Date(compromisso.scheduled_at)
      // Usa timezone do Brasil para calcular a data correta
      // Formata a data no timezone do Brasil e extrai YYYY-MM-DD
      const dateKey = data.toLocaleDateString('en-CA', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }) // Retorna formato YYYY-MM-DD
      
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

  // Abre modal com compromissos do dia
  const handleDateClick = (date: Date) => {
    console.log('Date clicked:', date)
    setSelectedDate(date)
    setIsModalOpen(true)
    console.log('Modal should open, isModalOpen:', true)
  }

  // Fecha modal
  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedDate(null)
  }

  // Compromissos do dia selecionado
  const selectedDateCompromissos = useMemo(() => {
    if (!selectedDate) return []
    
    // Usa timezone do Brasil para calcular a chave da data
    const dateKey = selectedDate.toLocaleDateString('en-CA', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
    return compromissosByDate.get(dateKey) || []
  }, [selectedDate, compromissosByDate])

  // Formata data para exibição
  const formatSelectedDate = (date: Date | null): string => {
    if (!date) return ''
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    if (date.toDateString() === today.toDateString()) {
      return 'Hoje'
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Amanhã'
    } else {
      return date.toLocaleDateString('pt-BR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    }
  }

  return (
    <>
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 w-full overflow-x-hidden">
      {/* Cabeçalho do calendário */}
      <div className="p-3 sm:p-4 lg:p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={goToPreviousMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition touch-manipulation"
              aria-label="Mês anterior"
              style={{ minWidth: '44px', minHeight: '44px' }}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 capitalize truncate">
              {monthName}
            </h2>
            <button
              onClick={goToNextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition touch-manipulation"
              aria-label="Próximo mês"
              style={{ minWidth: '44px', minHeight: '44px' }}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <button
            onClick={goToToday}
            className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition touch-manipulation self-start sm:self-auto"
            style={{ minHeight: '44px' }}
          >
            Hoje
          </button>
        </div>
      </div>

      {/* Grade do calendário */}
      <div className="p-2 sm:p-4 lg:p-6 overflow-x-auto">
        <div className="min-w-[280px]">
          {/* Cabeçalho dos dias da semana */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
            {weekDays.map((day) => (
              <div
                key={day}
                className="text-center text-xs font-semibold text-gray-500 py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Dias do calendário */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {calendarDays.map((date, index) => {
            if (!date) {
              return (
                <div
                  key={`empty-${index}`}
                  className="aspect-square bg-gray-50 rounded-lg"
                />
              )
            }

            // Calcula dateKey no timezone do Brasil para corresponder ao agrupamento
            const dateKey = date.toLocaleDateString('en-CA', {
              timeZone: 'America/Sao_Paulo',
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            })
            const dayCompromissos = compromissosByDate.get(dateKey) || []
            const today = isToday(date)
            const currentMonth = isCurrentMonth(date)

            return (
              <button
                key={dateKey}
                onClick={() => handleDateClick(date)}
                className={`aspect-square rounded-lg border-2 p-1 transition text-left touch-manipulation ${
                  today
                    ? 'bg-emerald-50 border-emerald-500 active:bg-emerald-100'
                    : currentMonth
                    ? 'bg-white border-gray-200 active:border-gray-300 active:bg-gray-50'
                    : 'bg-gray-50 border-gray-100'
                } ${dayCompromissos.length > 0 ? 'cursor-pointer' : 'cursor-default'}`}
                style={{ minHeight: '60px' }}
              >
                {/* Número do dia */}
                <div
                  className={`text-xs font-semibold mb-0.5 ${
                    today
                      ? 'text-emerald-700'
                      : currentMonth
                      ? 'text-gray-900'
                      : 'text-gray-400'
                  }`}
                >
                  {date.getDate()}
                </div>

                {/* Compromissos do dia */}
                <div className="space-y-0.5 overflow-hidden pointer-events-none">
                  {dayCompromissos.slice(0, 2).map((compromisso) => {
                    const hora = new Date(compromisso.scheduled_at).toLocaleTimeString('pt-BR', {
                      timeZone: 'America/Sao_Paulo',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                    const isCancelled = compromisso.is_cancelled === true
                    const isConcluido = !isCancelled && new Date(compromisso.scheduled_at).getTime() < Date.now()

                    return (
                      <div
                        key={compromisso.id}
                        className={`text-[10px] px-1 py-0.5 rounded truncate ${
                          isCancelled
                            ? 'bg-red-100 text-red-900 line-through'
                            : isConcluido
                              ? 'bg-emerald-100 text-emerald-900'
                              : today
                                ? 'bg-emerald-200 text-emerald-900'
                                : 'bg-emerald-100 text-emerald-900'
                        }`}
                        title={`${hora} - ${compromisso.title}`}
                      >
                        <span className="font-medium hidden sm:inline">{hora} </span>
                        <span className="truncate">{compromisso.title}</span>
                      </div>
                    )
                  })}
                  {dayCompromissos.length > 2 && (
                    <div
                      className={`text-[10px] px-1 py-0.5 rounded ${
                        today ? 'text-emerald-700' : 'text-gray-600'
                      }`}
                    >
                      +{dayCompromissos.length - 2}
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
        </div>
      </div>
    </div>

      {/* Modal de Detalhes */}
      {isModalOpen && selectedDate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm" onClick={closeModal}>
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            {/* Cabeçalho do Modal */}
            <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white capitalize">
                  {formatSelectedDate(selectedDate)}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {selectedDateCompromissos.length} {selectedDateCompromissos.length === 1 ? 'compromisso' : 'compromissos'}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
                aria-label="Fechar"
              >
                <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {/* Lista de Compromissos */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {selectedDateCompromissos.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
                    <svg
                      className="w-8 h-8 text-gray-400 dark:text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400">Nenhum compromisso neste dia</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedDateCompromissos.map((compromisso) => {
                    const dataHora = new Date(compromisso.scheduled_at)
                    const hora = dataHora.toLocaleTimeString('pt-BR', {
                      timeZone: 'America/Sao_Paulo',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                    const data = dataHora.toLocaleDateString('pt-BR', {
                      timeZone: 'America/Sao_Paulo',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })

                    const isCancelled = compromisso.is_cancelled === true
                    const isConcluido = !isCancelled && new Date(compromisso.scheduled_at).getTime() < Date.now()

                    return (
                      <div
                        key={compromisso.id}
                        className={`border rounded-lg p-4 hover:shadow-sm transition ${
                          isCancelled
                            ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 hover:border-red-300 dark:hover:border-red-700'
                            : isConcluido
                              ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 hover:border-emerald-300 dark:hover:border-emerald-700'
                            : 'border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-700'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${
                                isCancelled ? 'bg-red-100' : isConcluido ? 'bg-emerald-100' : 'bg-emerald-100'
                              }`}>
                                <svg
                                  className={`w-6 h-6 ${isCancelled ? 'text-red-600' : isConcluido ? 'text-emerald-600' : 'text-emerald-700'}`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className={`text-base sm:text-lg font-semibold ${
                                    isCancelled ? 'text-red-900 dark:text-red-300 line-through' : 'text-gray-900 dark:text-white'
                                  }`}>
                                    {compromisso.title}
                                  </h4>
                                  {isCancelled && (
                                    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide bg-red-200 text-red-800 px-2 py-0.5 rounded">
                                      <XCircle className="w-3 h-3" />
                                      Cancelado
                                    </span>
                                  )}
                                  {isConcluido && (
                                    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded">
                                      <Check className="w-3 h-3" />
                                      Concluído
                                    </span>
                                  )}
                                </div>
                                <div className={`flex items-center gap-4 text-sm ${isCancelled ? 'text-red-700 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
                                  <span className="flex items-center gap-1">
                                    <svg
                                      className="w-4 h-4"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                      />
                                    </svg>
                                    {hora}
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <svg
                                      className="w-4 h-4"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                                      />
                                    </svg>
                                    {data}
                                  </span>
                                </div>
                              </div>
                            </div>
                            {compromisso.description && (
                              <p className={`text-sm mt-2 pl-15 ${isCancelled ? 'text-red-700 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'}`}>
                                {compromisso.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Rodapé do Modal */}
            <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={closeModal}
                className="w-full px-4 py-2 bg-emerald-700 dark:bg-emerald-600 text-white rounded-lg hover:bg-emerald-800 dark:hover:bg-emerald-700 transition font-medium"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
