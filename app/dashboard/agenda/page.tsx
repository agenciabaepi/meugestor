import { getCompromissosRecords } from '@/lib/services/compromissos'
import { getAuthenticatedTenantId } from '@/lib/utils/auth'
import { AgendaClient } from './AgendaClient'

async function getAgendaData() {
  const tenantId = await getAuthenticatedTenantId()
  
  if (!tenantId) {
    return {
      compromissos: [],
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
  
  return {
    compromissos,
  }
}

export default async function AgendaPage() {
  const data = await getAgendaData()

  return <AgendaClient compromissos={data.compromissos} />
}
