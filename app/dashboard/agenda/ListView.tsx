'use client'

import { useMemo } from 'react'
import type { Compromisso } from '@/lib/db/types'

export function ListView({ compromissos }: { compromissos: Compromisso[] }) {
  // Agrupa por data
  const grouped = useMemo(() => {
    const map = new Map<string, Compromisso[]>()
    
    compromissos.forEach((compromisso) => {
      const data = new Date(compromisso.scheduled_at)
      const dateKey = data.toLocaleDateString('en-CA', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
      
      if (!map.has(dateKey)) {
        map.set(dateKey, [])
      }
      
      map.get(dateKey)!.push(compromisso)
    })
    
    // Ordena compromissos por horário
    map.forEach((comps) => {
      comps.sort((a, b) => 
        new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
      )
    })
    
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]))
  }, [compromissos])

  const formatDateLabel = (dateKey: string) => {
    const date = new Date(dateKey)
    const hoje = new Date()
    hoje.setHours(0, 0, 0, 0)
    const dataComparacao = new Date(date)
    dataComparacao.setHours(0, 0, 0, 0)
    
    if (dataComparacao.getTime() === hoje.getTime()) {
      return 'Hoje'
    }
    
    const amanha = new Date(hoje)
    amanha.setDate(amanha.getDate() + 1)
    if (dataComparacao.getTime() === amanha.getTime()) {
      return 'Amanhã'
    }
    
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 w-full overflow-x-hidden">
      <div className="divide-y divide-gray-200">
        {grouped.map(([dateKey, compromissos]) => {
          const isHoje = formatDateLabel(dateKey) === 'Hoje'
          
          return (
            <div key={dateKey} className="p-3 sm:p-4 lg:p-6">
              <div className={`mb-3 ${isHoje ? 'bg-blue-50 -mx-3 sm:-mx-4 lg:-mx-6 px-3 sm:px-4 lg:px-6 py-2' : ''}`}>
                <h3 className={`text-sm sm:text-base font-semibold ${isHoje ? 'text-blue-900' : 'text-gray-900'}`}>
                  {formatDateLabel(dateKey)}
                </h3>
              </div>
              <div className="space-y-2">
                {compromissos.map((compromisso) => {
                  const dataHora = new Date(compromisso.scheduled_at)
                  const hora = dataHora.toLocaleTimeString('pt-BR', {
                    timeZone: 'America/Sao_Paulo',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                  const isCancelled = compromisso.is_cancelled === true
                  
                  return (
                    <div
                      key={compromisso.id}
                      className={`flex items-start gap-2 sm:gap-4 p-2 sm:p-3 rounded-lg border ${
                        isCancelled
                          ? 'bg-red-50 border-red-200'
                          : isHoje
                            ? 'bg-blue-50 border-blue-200'
                            : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className={`text-xs sm:text-sm font-medium shrink-0 ${
                        isCancelled ? 'text-red-700' : isHoje ? 'text-blue-700' : 'text-gray-700'
                      }`}>
                        {hora}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className={`text-sm sm:text-base font-semibold truncate ${
                            isCancelled ? 'text-red-900 line-through' : 'text-gray-900'
                          }`}>
                            {compromisso.title}
                          </h4>
                          {isCancelled && (
                            <span className="text-[10px] uppercase tracking-wide bg-red-100 text-red-700 px-2 py-0.5 rounded">
                              Cancelado
                            </span>
                          )}
                        </div>
                        {compromisso.description && (
                          <p className={`text-xs sm:text-sm mt-1 line-clamp-2 ${
                            isCancelled ? 'text-red-700' : 'text-gray-600'
                          }`}>{compromisso.description}</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
