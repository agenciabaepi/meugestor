export interface Tenant {
  id: string
  name: string
  whatsapp_number: string
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  tenant_id: string
  email: string
  whatsapp_number: string
  whatsapp_welcome_sent_at?: string | null
  whatsapp_welcome_sent_number?: string | null
  role: 'admin' | 'user'
  name: string | null
  created_at: string
  updated_at: string
}

export interface Financeiro {
  id: string
  tenant_id: string
  user_id?: string | null
  amount: number
  description: string
  category: string
  subcategory: string | null
  date: string
  receipt_image_url: string | null
  metadata: Record<string, any> | null
  tags: string[] | null
  transaction_type: 'expense' | 'revenue'
  created_at: string
}

export interface Compromisso {
  id: string
  tenant_id: string
  user_id?: string | null
  title: string
  description: string | null
  scheduled_at: string
  created_at: string
  is_cancelled?: boolean
  cancelled_at?: string | null
  cancelled_by?: string | null
  reminder_1h_sent?: boolean
  reminder_30min_sent?: boolean
  reminder_10min_sent?: boolean
}

export interface Conversation {
  id: string
  tenant_id: string
  user_id?: string | null
  message: string
  role: 'user' | 'assistant'
  created_at: string
}

export interface Lista {
  id: string
  tenant_id: string
  nome: string
  nome_original?: string | null
  nome_normalizado?: string | null
  tipo: string
  created_at: string
  updated_at: string
}

export type ListaItemStatus = 'pendente' | 'comprado'

export interface ListaItem {
  id: string
  lista_id: string
  nome: string
  nome_original?: string | null
  nome_normalizado?: string | null
  quantidade: string | null
  unidade: string | null
  status: ListaItemStatus
  checked?: boolean | null
  quantidade_num?: number | null
  created_at: string
  updated_at: string
}

export interface TenantContext {
  tenant_id: string
  last_active_list_name: string | null
  created_at: string
  updated_at: string
}
