/**
 * Teste obrigatório: período "amanhã" não pode retornar hoje.
 *
 * Cenário:
 * - Hoje (Brasil): 15/01/2026
 * - Pergunta: "quantos compromissos amanhã?"
 * - Esperado: amanhã = 16/01/2026
 *
 * Executar:
 *   node scripts/test-periodo-amanha.js
 */

const TZ = 'America/Sao_Paulo'

function formatDateBR(date) {
  return date.toLocaleDateString('en-CA', { timeZone: TZ })
}

function getTomorrowDateStringFromBase(baseDate) {
  const todayBR = formatDateBR(baseDate) // YYYY-MM-DD no Brasil
  const [y, m, d] = todayBR.split('-').map(Number)
  const anchor = new Date(Date.UTC(y, m - 1, d, 12, 0, 0)) // meio-dia UTC
  const tomorrow = new Date(anchor.getTime() + 24 * 60 * 60 * 1000)
  return formatDateBR(tomorrow)
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    console.error(`[FAIL] ${label}: esperado ${expected}, obtido ${actual}`)
    process.exitCode = 1
  } else {
    console.log(`[OK] ${label}: ${actual}`)
  }
}

// Base: 15/01/2026 12:00 no Brasil (equivalente a 15/01/2026 15:00 UTC)
const base = new Date(Date.UTC(2026, 0, 15, 15, 0, 0))

const todayBR = formatDateBR(base)
const tomorrowBR = getTomorrowDateStringFromBase(base)

assertEqual(todayBR, '2026-01-15', 'Hoje (Brasil)')
assertEqual(tomorrowBR, '2026-01-16', 'Amanhã (Brasil)')

if (!process.exitCode) {
  console.log('\nTeste concluído com sucesso.')
}

