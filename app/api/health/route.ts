import { NextResponse } from 'next/server'

/**
 * Endpoint de health check
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  })
}
