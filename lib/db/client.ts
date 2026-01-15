import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

/**
 * Cria um cliente Supabase para uso no servidor (Server Components, Server Actions)
 * Usa cookies para manter a sessão entre requisições
 */
export async function createServerClient() {
  // Valida configuração antes de criar cliente
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase não configurado. Verifique as variáveis de ambiente.')
    // Retorna cliente placeholder para não quebrar o build
    return createClient('https://placeholder.supabase.co', 'placeholder-key')
  }

  try {
    const cookieStore = await cookies()
    
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: {
          getItem: (key: string) => {
            try {
              return cookieStore.get(key)?.value ?? null
            } catch (error) {
              // Em alguns contextos, cookies() pode não estar disponível
              return null
            }
          },
          setItem: (key: string, value: string) => {
            // Cookies só podem ser modificados em Server Actions ou Route Handlers
            // Em Server Components, apenas lemos os cookies
            try {
              cookieStore.set(key, value, {
                httpOnly: false,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
                maxAge: 60 * 60 * 24 * 7, // 7 dias
              })
            } catch (error) {
              // Em Server Components, não podemos modificar cookies
              // Isso é esperado e não é um erro
            }
          },
          removeItem: (key: string) => {
            try {
              cookieStore.delete(key)
            } catch (error) {
              // Em Server Components, não podemos modificar cookies
              // Isso é esperado e não é um erro
            }
          },
        },
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  } catch (error: any) {
    console.error('Error creating Supabase server client:', error?.message || error)
    // Retorna um cliente básico sem cookies em caso de erro
    return createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }
}


/**
 * Cria um cliente Supabase para uso no cliente (browser)
 * Usa localStorage para persistir a sessão
 */
export function createBrowserClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  })
}

// Cliente para uso no cliente (browser) - mantido para compatibilidade
// Mas agora usa createBrowserClient() internamente
export const supabase = typeof window !== 'undefined'
  ? createBrowserClient()
  : createClient('https://placeholder.supabase.co', 'placeholder-key')

// Cliente para uso no servidor - usa service role key (bypass RLS quando necessário)
export const supabaseAdmin = supabaseUrl && supabaseServiceRoleKey
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null

// Função para validar se as variáveis estão configuradas (usar em runtime)
export function validateSupabaseConfig() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase environment variables. Please check your .env.local file or Vercel environment variables.'
    )
  }
}
