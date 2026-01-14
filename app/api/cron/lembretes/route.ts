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
    console.log('\n=== CRON LEMBRETES INICIADO ===')
    console.log('Timestamp:', new Date().toISOString())
    console.log('Horário Brasil:', new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }))
    
    // Validação de segurança (opcional)
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.error('❌ Autenticação falhou')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Processa lembretes
    console.log('Iniciando processamento de lembretes...')
    const resultado = await processarLembretes()
    
    console.log('\n=== CRON LEMBRETES FINALIZADO ===')
    console.log('Resultado:', JSON.stringify(resultado, null, 2))

    return NextResponse.json({
      success: true,
      ...resultado,
      timestamp: new Date().toISOString(),
      timestampBrazil: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
    })
  } catch (error) {
    console.error('\n=== ERRO NO CRON LEMBRETES ===')
    console.error('Erro ao executar job de lembretes:', error)
    console.error('Stack:', error instanceof Error ? error.stack : 'N/A')
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
 * GET - Health check e teste manual do job
 * Permite testar o cron manualmente via browser ou curl
 */
export async function GET() {
  try {
    console.log('\n=== TESTE MANUAL DO CRON LEMBRETES ===')
    console.log('Timestamp:', new Date().toISOString())
    console.log('Horário Brasil:', new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }))
    
    // Processa lembretes (mesma lógica do POST)
    console.log('Iniciando processamento de lembretes...')
    const resultado = await processarLembretes()
    
    console.log('\n=== TESTE MANUAL FINALIZADO ===')
    console.log('Resultado:', JSON.stringify(resultado, null, 2))

    return NextResponse.json({
      status: 'ok',
      service: 'lembretes-cron',
      timestamp: new Date().toISOString(),
      timestampBrazil: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
      resultado,
    })
  } catch (error) {
    console.error('\n=== ERRO NO TESTE MANUAL ===')
    console.error('Erro:', error)
    return NextResponse.json({
      status: 'error',
      service: 'lembretes-cron',
      error: error instanceof Error ? error.message : 'Erro desconhecido',
      timestamp: new Date().toISOString(),
    }, { status: 500 })
  }
}
