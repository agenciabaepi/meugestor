import { NextRequest, NextResponse } from 'next/server'
import { processarLembretes } from '@/lib/jobs/lembretes'

/**
 * POST - Executa job de lembretes
 * 
 * Este endpoint deve ser chamado por um cron job externo (ex: Vercel Cron, GitHub Actions, etc)
 * 
 * Para segurança, você pode adicionar um token de autenticação:
 * 
 * const authToken = request.headers.get('authorization')
 * if (authToken !== `Bearer ${process.env.CRON_SECRET}`) {
 *   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Validação de segurança (opcional)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Processa lembretes
    const resultado = await processarLembretes()

    return NextResponse.json({
      success: true,
      ...resultado,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Erro ao executar job de lembretes:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      },
      { status: 500 }
    )
  }
}

/**
 * GET - Health check do job
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'lembretes-cron',
    timestamp: new Date().toISOString(),
  })
}
