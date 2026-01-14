'use client'

import { useState } from 'react'
import { CalendarView } from './CalendarView'
import { ListView } from './ListView'
import type { Compromisso } from '@/lib/db/types'

export function AgendaClient({ compromissos }: { compromissos: Compromisso[] }) {
  const [view, setView] = useState<'calendar' | 'list'>('calendar')

  return (
    <div className="space-y-4 sm:space-y-6 w-full overflow-x-hidden">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Agenda</h1>
          <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">
            Gerencie seus compromissos e eventos
          </p>
        </div>
        
        {/* Toggle de visualização */}
        <div className="flex items-center gap-1 sm:gap-2 bg-gray-100 rounded-lg p-1 flex-shrink-0">
          <button
            onClick={() => setView('calendar')}
            className={`px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded transition touch-manipulation ${
              view === 'calendar'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            style={{ minWidth: '44px', minHeight: '44px' }}
          >
            Calendário
          </button>
          <button
            onClick={() => setView('list')}
            className={`px-2 sm:px-3 py-1.5 text-xs sm:text-sm font-medium rounded transition touch-manipulation ${
              view === 'list'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            style={{ minWidth: '44px', minHeight: '44px' }}
          >
            Lista
          </button>
        </div>
      </div>

      {/* Conteúdo */}
      {compromissos.length > 0 ? (
        view === 'calendar' ? (
          <CalendarView compromissos={compromissos} />
        ) : (
          <ListView compromissos={compromissos} />
        )
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 sm:p-12 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-gray-400"
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nenhum compromisso agendado
            </h3>
            <p className="text-sm text-gray-500">
              Seus compromissos futuros aparecerão aqui
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
