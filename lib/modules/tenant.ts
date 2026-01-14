import { getTenantByWhatsAppNumber, createTenant } from '../db/queries'
import type { Tenant } from '../db/types'

/**
 * Obtém ou cria um tenant baseado no número do WhatsApp
 */
export async function getOrCreateTenantByWhatsApp(
  whatsappNumber: string,
  tenantName?: string
): Promise<Tenant | null> {
  // Tenta encontrar tenant existente
  let tenant = await getTenantByWhatsAppNumber(whatsappNumber)

  // Se não existir, cria um novo
  if (!tenant) {
    const name = tenantName || `Tenant ${whatsappNumber}`
    tenant = await createTenant(name, whatsappNumber)
  }

  return tenant
}

/**
 * Obtém tenant pelo número do WhatsApp Business (phone_number_id)
 */
export async function getTenantByPhoneNumberId(
  phoneNumberId: string
): Promise<Tenant | null> {
  // Por enquanto, usa o phone_number_id como identificador
  // Pode ser ajustado para usar o número do WhatsApp Business configurado
  return getTenantByWhatsAppNumber(phoneNumberId)
}

/**
 * Valida se um tenant existe e está ativo
 */
export async function validateTenant(tenantId: string): Promise<boolean> {
  const { supabase } = await import('../db/client')
  
  const { data, error } = await supabase
    .from('tenants')
    .select('id')
    .eq('id', tenantId)
    .single()

  return !error && !!data
}

/**
 * Obtém o tenant_id de um usuário autenticado
 */
export async function getTenantIdFromUser(userId: string): Promise<string | null> {
  const { supabase } = await import('../db/client')
  
  const { data, error } = await supabase
    .from('users_meugestor')
    .select('tenant_id')
    .eq('id', userId)
    .single()

  if (error || !data) {
    return null
  }

  return data.tenant_id
}
