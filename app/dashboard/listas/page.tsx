import { getAuthenticatedTenantId } from '@/lib/utils/auth'
import { ListasClient } from './ListasClient'

export default async function ListasPage() {
  const tenantId = await getAuthenticatedTenantId()
  return <ListasClient isAuthenticated={!!tenantId} />
}

