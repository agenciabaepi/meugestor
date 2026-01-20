import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

function isPublicPath(pathname: string) {
  // Páginas públicas
  if (pathname === '/login' || pathname === '/register') return true

  // Qualquer arquivo estático (ex: /logo.png, /images/x.svg, /manifest.json, etc)
  // Importante: assets em /public são servidos na raiz e não devem exigir autenticação
  const lastSegment = pathname.split('/').pop() || ''
  if (lastSegment.includes('.')) return true

  // Assets / arquivos públicos comuns
  if (pathname === '/favicon.ico') return true
  if (pathname === '/robots.txt') return true
  if (pathname === '/sitemap.xml') return true

  // Endpoints públicos (webhooks, cron, auth)
  if (pathname.startsWith('/api/health')) return true
  if (pathname.startsWith('/api/whatsapp/webhook')) return true
  if (pathname.startsWith('/api/cron/')) return true
  if (
    pathname === '/api/auth/login' ||
    pathname === '/api/auth/register' ||
    pathname === '/api/auth/me' ||
    pathname === '/api/auth/logout'
  ) {
    return true
  }

  return false
}

function assertSupabaseEnv() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Supabase não configurado. Verifique NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.'
    )
  }
}

export default async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl

  // Permite preflight/CORS sem autenticação (ex: webhooks)
  if (req.method === 'OPTIONS') return NextResponse.next()

  // Cria response "mutável" para permitir set-cookie.
  const res = NextResponse.next()

  let authenticated = false
  try {
    assertSupabaseEnv()
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return req.cookies.getAll().map((c) => ({ name: c.name, value: c.value }))
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, {
              ...options,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              path: '/',
            })
          })
        },
      },
    })

    // Importante: getUser() força refresh quando necessário e escreve cookies via setAll.
    const { data, error } = await supabase.auth.getUser()
    authenticated = !error && !!data.user
  } catch {
    authenticated = false
  }

  // Se já está logado, evita ficar preso em login/register
  if (authenticated && (pathname === '/login' || pathname === '/register')) {
    const redirectRes = NextResponse.redirect(new URL('/dashboard', req.url))
    // mantém cookies atualizados
    res.cookies.getAll().forEach((c) => redirectRes.cookies.set(c))
    return redirectRes
  }

  // Nunca bloqueia rotas públicas
  if (isPublicPath(pathname)) return res

  if (authenticated) return res

  // APIs: responde 401 (não redireciona)
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  // Páginas: redireciona para login, preservando o destino
  const loginUrl = new URL('/login', req.url)
  loginUrl.searchParams.set('redirect', `${pathname}${search}`)
  const redirectRes = NextResponse.redirect(loginUrl)
  res.cookies.getAll().forEach((c) => redirectRes.cookies.set(c))
  return redirectRes
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
