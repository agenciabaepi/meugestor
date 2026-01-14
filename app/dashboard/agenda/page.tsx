import { getCompromissosRecords, getTodayCompromissos, getUpcomingCompromissos } from '@/lib/services/compromissos'
import { supabase } from '@/lib/db/client'

async function getTenantId(): Promise<string | null> {
  const { data } = await supabase
    .from('tenants')
    .select('id')
    .limit(1)
    .single()
  
  return data?.id || null
}

async function getAgendaData() {
  const tenantId = await getTenantId()
  
  if (!tenantId) {
    return {
      hoje: [],
      proximos: [],
      todos: [],
    }
  }
  
  const hoje = await getTodayCompromissos(tenantId)
  const proximos = await getUpcomingCompromissos(tenantId, 10)
  const todos = await getCompromissosRecords(tenantId)

  return {
    hoje,
    proximos,
    todos: todos.slice(0, 20), // Limita a 20 para performance
  }
}

export default async function AgendaPage() {
  const data = await getAgendaData()

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Agenda</h1>
        <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">
          Gerencie seus compromissos e eventos
        </p>
      </div>

      {/* Compromissos de Hoje */}
      {data.hoje.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm sm:shadow">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 bg-blue-50">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">
              Hoje ({new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })})
            </h2>
          </div>
          <div className="p-3 sm:p-4 lg:p-6">
            <div className="space-y-2 sm:space-y-3">
              {data.hoje.map((compromisso) => (
                <div
                  key={compromisso.id}
                  className="flex items-start p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200"
                >
                  <div className="flex-shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-semibold text-xs sm:text-sm">
                      {new Date(compromisso.scheduled_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="ml-3 sm:ml-4 flex-1 min-w-0">
                    <p className="font-semibold text-sm sm:text-base text-gray-900 truncate">{compromisso.title}</p>
                    {compromisso.description && (
                      <p className="text-xs sm:text-sm text-gray-600 mt-1 line-clamp-2">
                        {compromisso.description}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Próximos Compromissos */}
      <div className="bg-white rounded-lg shadow-sm sm:shadow">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">Próximos Compromissos</h2>
        </div>
        <div className="p-3 sm:p-4 lg:p-6">
          {data.proximos.length > 0 ? (
            <div className="space-y-2 sm:space-y-3">
              {data.proximos.map((compromisso) => {
                const dataCompromisso = new Date(compromisso.scheduled_at)
                const hoje = new Date()
                hoje.setHours(0, 0, 0, 0)
                const amanha = new Date(hoje)
                amanha.setDate(amanha.getDate() + 1)
                const dataComp = new Date(dataCompromisso)
                dataComp.setHours(0, 0, 0, 0)

                let dataLabel = ''
                if (dataComp.getTime() === hoje.getTime()) {
                  dataLabel = 'Hoje'
                } else if (dataComp.getTime() === amanha.getTime()) {
                  dataLabel = 'Amanhã'
                } else {
                  dataLabel = dataCompromisso.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })
                }

                return (
                  <div
                    key={compromisso.id}
                    className="flex items-start p-3 sm:p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                  >
                    <div className="flex-shrink-0 w-16 sm:w-20 text-center">
                      <p className="text-xs sm:text-sm font-medium text-gray-500">{dataLabel}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {dataCompromisso.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                    <div className="ml-3 sm:ml-4 flex-1 min-w-0">
                      <p className="font-semibold text-sm sm:text-base text-gray-900 truncate">{compromisso.title}</p>
                      {compromisso.description && (
                        <p className="text-xs sm:text-sm text-gray-600 mt-1 line-clamp-2">
                          {compromisso.description}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-6 sm:py-8 text-sm sm:text-base">
              Nenhum compromisso futuro agendado
            </p>
          )}
        </div>
      </div>

      {/* Todos os Compromissos */}
      <div className="bg-white rounded-lg shadow-sm sm:shadow">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">Todos os Compromissos</h2>
        </div>
        <div className="p-3 sm:p-4 lg:p-6">
          {data.todos.length > 0 ? (
            <div className="space-y-2">
              {data.todos.map((compromisso) => (
                <div
                  key={compromisso.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm sm:text-base text-gray-900 truncate">{compromisso.title}</p>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">
                      {new Date(compromisso.scheduled_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-6 sm:py-8 text-sm sm:text-base">
              Nenhum compromisso registrado
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
