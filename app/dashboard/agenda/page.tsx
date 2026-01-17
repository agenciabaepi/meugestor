import { getCompromissosRecordsForContext } from '@/lib/services/compromissos'
import { getCurrentUser } from '@/lib/utils/auth'
import { getSessionContext } from '@/lib/utils/session-context'
import { getNowInBrazil } from '@/lib/utils/date-parser'
import { AgendaClient } from './AgendaClient'

async function getAgendaData() {
  const ctx = await getSessionContext()
  const user = await getCurrentUser()
  const userId = user?.id ?? null
  
  if (!ctx) {
    return {
      compromissos: [],
    }
  }
  
  // Busca também compromissos passados para manter o calendário completo.
  // Carrega uma janela ampla (6 meses para trás e 6 meses para frente) para
  // suportar navegação por mês no calendário sem "sumir" eventos.
  const nowBrazil = getNowInBrazil()

  const rangeStart = new Date(nowBrazil.getFullYear(), nowBrazil.getMonth() - 6, 1)
  rangeStart.setHours(0, 0, 0, 0)

  const rangeEnd = new Date(nowBrazil.getFullYear(), nowBrazil.getMonth() + 7, 0)
  rangeEnd.setHours(23, 59, 59, 999)

  const compromissos = await getCompromissosRecordsForContext(
    ctx,
    rangeStart.toISOString(),
    rangeEnd.toISOString(),
    userId,
    true // inclui cancelados para exibir no calendário
  )
  
  // Ordena por data/hora
  compromissos.sort((a, b) => 
    new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
  )
  
  return {
    compromissos,
  }
}

export default async function AgendaPage() {
  const data = await getAgendaData()

  return <AgendaClient compromissos={data.compromissos} />
}
