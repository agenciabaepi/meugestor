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
  role: 'admin' | 'user'
  name: string | null
  created_at: string
  updated_at: string
}

export interface Financeiro {
  id: string
  tenant_id: string
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
  title: string
  description: string | null
  scheduled_at: string
  created_at: string
  reminder_1h_sent?: boolean
  reminder_30min_sent?: boolean
  reminder_10min_sent?: boolean
}

export interface Conversation {
  id: string
  tenant_id: string
  message: string
  role: 'user' | 'assistant'
  created_at: string
}
