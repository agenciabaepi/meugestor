import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Middleware simplificado
 * A verificação de autenticação real é feita nos layouts/páginas do servidor
 */
export async function middleware(req: NextRequest) {
  // Por enquanto, apenas deixa passar
  // A autenticação é verificada no layout do dashboard
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api routes (API routes são tratadas individualmente)
     */
    '/((?!_next/static|_next/image|favicon.ico|api).*)',
  ],
}
