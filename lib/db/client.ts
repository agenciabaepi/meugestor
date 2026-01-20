import { createClient } from '@supabase/supabase-js'
import { createServerClient as createSupabaseServerClient } from '@supabase/ssr'
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
    const errorMsg = 'Supabase não configurado. Verifique as variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    console.error(errorMsg)
    throw new Error(errorMsg)
  }

  const cookieStore = await cookies()

  // Padrão oficial (SSR) para manter sessão em cookies.
  // Em Server Components, setAll pode não ter efeito (Next limita escrita de cookies),
  // mas o `proxy.ts` (middleware) vai fazer o refresh e setar cookies corretamente.
  return createSupabaseServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        try {
          return cookieStore.getAll().map((c) => ({ name: c.name, value: c.value }))
        } catch {
          return []
        }
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, {
              ...options,
              // defaults seguros
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              path: '/',
            })
          })
        } catch {
          // Em Server Components não dá para setar cookies — ok.
        }
      },
    },
  })
}


/**
 * Cria um cliente Supabase para uso no cliente (browser)
 * Usa localStorage para persistir a sessão
 */
export function createBrowserClient() {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      /**
       * IMPORTANTE:
       * Este app usa sessão via cookies no servidor (Route Handlers + proxy),
       * então manter uma sessão paralela no localStorage (com refresh automático)
       * pode causar "Invalid Refresh Token: Already Used" (rotação concorrente / token fora de sync).
       */
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
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
