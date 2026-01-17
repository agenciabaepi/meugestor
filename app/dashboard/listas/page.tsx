import { getSessionContext } from '@/lib/utils/session-context'
import { ListasClient } from './ListasClient'

export default async function ListasPage() {
  const ctx = await getSessionContext()
  return <ListasClient isAuthenticated={!!ctx?.tenant_id} />
}

