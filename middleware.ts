import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function isPublicPath(pathname: string) {
  // Páginas públicas
  if (pathname === '/login' || pathname === '/register') return true

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

type CookieLike = { name: string; value: string }

function tryParseSessionCookieValue(raw: string): { expires_at?: number } | null {
  const candidates: string[] = []

  // 1) raw
  candidates.push(raw)

  // 2) URL-decoded
  try {
    candidates.push(decodeURIComponent(raw))
  } catch {
    // ignore
  }

  // 3) base64 decoded (best-effort)
  try {
    if (typeof atob === 'function' && /^[A-Za-z0-9+/=]+$/.test(raw) && raw.length % 4 === 0) {
      candidates.push(atob(raw))
    }
  } catch {
    // ignore
  }

  for (const value of candidates) {
    try {
      const parsed = JSON.parse(value)
      if (parsed && typeof parsed === 'object') return parsed
    } catch {
      // ignore
    }
  }

  return null
}

function getSupabaseAuthCookieValue(req: NextRequest): string | null {
  const all = req.cookies.getAll()

  // Supabase costuma usar: sb-<project-ref>-auth-token (às vezes chunked: .0, .1, ...)
  const authCookies = all.filter((c) => c.name.includes('auth-token'))
  if (authCookies.length === 0) return null

  // Se estiver "chunked", junta na ordem (.0, .1, ...)
  const byBase = new Map<string, CookieLike[]>()
  for (const c of authCookies) {
    const base = c.name.replace(/\.\d+$/, '')
    const arr = byBase.get(base) ?? []
    arr.push({ name: c.name, value: c.value })
    byBase.set(base, arr)
  }

  // Pega o maior conjunto (mais provável ser o correto)
  const best = Array.from(byBase.values()).sort((a, b) => b.length - a.length)[0]
  if (!best) return null

  if (best.length === 1) return best[0].value

  return best
    .slice()
    .sort((a, b) => {
      const ai = Number(a.name.match(/\.(\d+)$/)?.[1] ?? 0)
      const bi = Number(b.name.match(/\.(\d+)$/)?.[1] ?? 0)
      return ai - bi
    })
    .map((c) => c.value)
    .join('')
}

function hasActiveSession(req: NextRequest) {
  const raw = getSupabaseAuthCookieValue(req)
  if (!raw) return false

  const parsed = tryParseSessionCookieValue(raw)
  if (!parsed) return true // fallback: existe cookie, consideramos sessão presente

  const expiresAt = typeof parsed.expires_at === 'number' ? parsed.expires_at : null
  if (!expiresAt) return true

  const nowSeconds = Math.floor(Date.now() / 1000)
  return expiresAt > nowSeconds
}

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl

  // Permite preflight/CORS sem autenticação (ex: webhooks)
  if (req.method === 'OPTIONS') return NextResponse.next()

  const authenticated = hasActiveSession(req)

  // Se já está logado, evita ficar preso em login/register
  if (authenticated && (pathname === '/login' || pathname === '/register')) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // Nunca bloqueia rotas públicas
  if (isPublicPath(pathname)) return NextResponse.next()

  if (authenticated) return NextResponse.next()

  // APIs: responde 401 (não redireciona)
  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  // Páginas: redireciona para login, preservando o destino
  const loginUrl = new URL('/login', req.url)
  loginUrl.searchParams.set('redirect', `${pathname}${search}`)
  return NextResponse.redirect(loginUrl)
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
