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
  role: 'admin' | 'user'
  created_at: string
}

export interface Financeiro {
  id: string
  tenant_id: string
  amount: number
  description: string
  category: string
  date: string
  receipt_image_url: string | null
  created_at: string
}

export interface Compromisso {
  id: string
  tenant_id: string
  title: string
  description: string | null
  scheduled_at: string
  created_at: string
  reminder_sent?: boolean
}

export interface Conversation {
  id: string
  tenant_id: string
  message: string
  role: 'user' | 'assistant'
  created_at: string
}
