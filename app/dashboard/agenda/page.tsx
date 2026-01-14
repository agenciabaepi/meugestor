import { getCompromissosRecords } from '@/lib/services/compromissos'
import { getAuthenticatedTenantId } from '@/lib/utils/auth'
import type { Compromisso } from '@/lib/db/types'

// Agrupa compromissos por data (formato YYYY-MM-DD)
function groupCompromissosByDate(compromissos: Compromisso[]): Map<string, Compromisso[]> {
  const grouped = new Map<string, Compromisso[]>()
  
  compromissos.forEach((compromisso) => {
    const data = new Date(compromisso.scheduled_at)
    const dateKey = data.toISOString().split('T')[0] // YYYY-MM-DD
    
    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, [])
    }
    
    grouped.get(dateKey)!.push(compromisso)
  })
  
  // Ordena os compromissos dentro de cada data por horário
  grouped.forEach((compromissos, dateKey) => {
    compromissos.sort((a, b) => 
      new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
    )
  })
  
  return grouped
}

// Formata o label da data (Hoje, Amanhã, ou data formatada)
function formatDateLabel(dateKey: string, date: Date): string {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  
  const amanha = new Date(hoje)
  amanha.setDate(amanha.getDate() + 1)
  
  const dataComparacao = new Date(date)
  dataComparacao.setHours(0, 0, 0, 0)
  
  if (dataComparacao.getTime() === hoje.getTime()) {
    return 'Hoje'
  } else if (dataComparacao.getTime() === amanha.getTime()) {
    return 'Amanhã'
  } else {
    return date.toLocaleDateString('pt-BR', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    })
  }
}

async function getAgendaData() {
  const tenantId = await getAuthenticatedTenantId()
  
  if (!tenantId) {
    return {
      compromissos: [],
      grouped: new Map<string, Compromisso[]>(),
    }
  }
  
  // Busca compromissos a partir de hoje
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  
  const compromissos = await getCompromissosRecords(
    tenantId,
    hoje.toISOString()
  )
  
  // Ordena por data/hora
  compromissos.sort((a, b) => 
    new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
  )
  
  const grouped = groupCompromissosByDate(compromissos)
  
  return {
    compromissos,
    grouped,
  }
}

export default async function AgendaPage() {
  const data = await getAgendaData()
  
  // Converte Map para Array ordenado por data
  const datesArray = Array.from(data.grouped.entries()).sort((a, b) => 
    a[0].localeCompare(b[0])
  )

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Agenda</h1>
        <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">
          Gerencie seus compromissos e eventos
        </p>
      </div>

      {datesArray.length > 0 ? (
        <div className="bg-white rounded-lg shadow-sm sm:shadow">
          <div className="divide-y divide-gray-200">
            {datesArray.map(([dateKey, compromissos]) => {
              const primeiraData = new Date(compromissos[0].scheduled_at)
              const dateLabel = formatDateLabel(dateKey, primeiraData)
              
              // Verifica se é hoje para destacar
              const hoje = new Date()
              hoje.setHours(0, 0, 0, 0)
              const dataComparacao = new Date(primeiraData)
              dataComparacao.setHours(0, 0, 0, 0)
              const isHoje = dataComparacao.getTime() === hoje.getTime()
              
              return (
                <div key={dateKey} className="py-4 sm:py-6">
                  {/* Cabeçalho da Data */}
                  <div className={`px-4 sm:px-6 pb-3 ${isHoje ? 'bg-blue-50 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div className={`flex-shrink-0 w-1 h-6 rounded-full ${isHoje ? 'bg-blue-500' : 'bg-gray-300'}`} />
                      <h2 className={`text-base sm:text-lg font-semibold ${isHoje ? 'text-blue-900' : 'text-gray-900'}`}>
                        {dateLabel}
                      </h2>
                      <span className={`text-xs sm:text-sm ${isHoje ? 'text-blue-600' : 'text-gray-500'}`}>
                        ({compromissos.length} {compromissos.length === 1 ? 'compromisso' : 'compromissos'})
                      </span>
                    </div>
                  </div>
                  
                  {/* Compromissos do Dia */}
                  <div className="px-4 sm:px-6 pt-3 space-y-2 sm:space-y-3">
                    {compromissos.map((compromisso) => {
                      const dataHora = new Date(compromisso.scheduled_at)
                      const hora = dataHora.toLocaleTimeString('pt-BR', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })
                      
                      return (
                        <div
                          key={compromisso.id}
                          className={`flex items-start gap-4 p-3 sm:p-4 rounded-lg border transition ${
                            isHoje 
                              ? 'bg-blue-50 border-blue-200 hover:bg-blue-100' 
                              : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          {/* Horário */}
                          <div className={`flex-shrink-0 w-14 sm:w-16 text-sm sm:text-base font-medium ${
                            isHoje ? 'text-blue-700' : 'text-gray-700'
                          }`}>
                            {hora}
                          </div>
                          
                          {/* Conteúdo */}
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm sm:text-base text-gray-900 mb-1">
                              {compromisso.title}
                            </h3>
                            {compromisso.description && (
                              <p className="text-xs sm:text-sm text-gray-600 line-clamp-2">
                                {compromisso.description}
                              </p>
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
      ) : (
        <div className="bg-white rounded-lg shadow-sm sm:shadow p-8 sm:p-12 text-center">
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
