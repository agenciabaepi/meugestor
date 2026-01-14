'use client'

import { useMemo } from 'react'
import type { Compromisso } from '@/lib/db/types'

export function ListView({ compromissos }: { compromissos: Compromisso[] }) {
  // Agrupa por data
  const grouped = useMemo(() => {
    const map = new Map<string, Compromisso[]>()
    
    compromissos.forEach((compromisso) => {
      const data = new Date(compromisso.scheduled_at)
      const dateKey = data.toISOString().split('T')[0]
      
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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="divide-y divide-gray-200">
        {grouped.map(([dateKey, compromissos]) => {
          const isHoje = formatDateLabel(dateKey) === 'Hoje'
          
          return (
            <div key={dateKey} className="p-4 sm:p-6">
              <div className={`mb-3 ${isHoje ? 'bg-blue-50 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2' : ''}`}>
                <h3 className={`font-semibold ${isHoje ? 'text-blue-900' : 'text-gray-900'}`}>
                  {formatDateLabel(dateKey)}
                </h3>
              </div>
              <div className="space-y-2">
                {compromissos.map((compromisso) => {
                  const dataHora = new Date(compromisso.scheduled_at)
                  const hora = dataHora.toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                  
                  return (
                    <div
                      key={compromisso.id}
                      className={`flex items-start gap-4 p-3 rounded-lg border ${
                        isHoje
                          ? 'bg-blue-50 border-blue-200'
                          : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className={`font-medium ${isHoje ? 'text-blue-700' : 'text-gray-700'}`}>
                        {hora}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{compromisso.title}</h4>
                        {compromisso.description && (
                          <p className="text-sm text-gray-600 mt-1">{compromisso.description}</p>
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
