/**
 * Versão simplificada do handleQuery
 * Usa apenas estado semântico, sem heurísticas
 */

import { SemanticState } from './semantic-state'
import { ActionResult } from './actions'
import { 
  getDespesasRecords, 
  getReceitasRecords 
} from '../services/financeiro'
import { 
  getCompromissosRecords, 
  getTodayCompromissos 
} from '../services/compromissos'
import {
  getTodayStartInBrazil,
  getTodayEndInBrazil,
  getYesterdayStartInBrazil,
  getYesterdayEndInBrazil,
  getNowInBrazil,
  getBrazilDayStartISO,
  getBrazilDayEndISO,
  getTomorrowStartISOInBrazil,
  getTomorrowEndISOInBrazil
} from '../utils/date-parser'
import { filterBySemanticCategory } from '../utils/semantic-filter'
import { getListasByTenant } from '../db/queries'

function formatTimeBR(iso: string): string {
  const parts = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(iso))
  const hour = parts.find(p => p.type === 'hour')?.value || '00'
  const minute = parts.find(p => p.type === 'minute')?.value || '00'
  return `${hour}:${minute}`
}

function isCancelled(compromisso: any): boolean {
  return compromisso?.is_cancelled === true || !!compromisso?.cancelled_at
}

function formatCompromissoLine(compromisso: any, now: Date): string {
  const hora = formatTimeBR(compromisso.scheduled_at)
  const title = (compromisso.title || 'Compromisso').toString()
  const desc = compromisso.description ? ` — ${compromisso.description}` : ''
  const base = `${hora} — ${title}${desc}`

  if (isCancelled(compromisso)) {
    // WhatsApp: ~texto~ = riscado
    return `❌ ~${base}~`
  }

  const scheduled = new Date(compromisso.scheduled_at)
  if (!isNaN(scheduled.getTime()) && scheduled.getTime() < now.getTime()) {
    return `✅ ${base}`
  }

  return `⏳ ${base}`
}

/**
 * Converte período semântico em range de datas
 */
function getDateRangeFromPeriodo(periodo: string | null | undefined): { startDate: string; endDate?: string; periodoTexto: string } {
  const now = getNowInBrazil()
  
  // REGRA CRÍTICA: Se período é null/undefined aqui, significa que:
  // 1. GPT não retornou período
  // 2. inheritContext não conseguiu herdar (sem contexto anterior)
  // 3. Nesse caso, NÃO usar default agressivo - retornar erro ou pedir esclarecimento
  // Mas para não quebrar, usamos default apenas como último recurso
  if (!periodo) {
    console.warn('getDateRangeFromPeriodo - Período não especificado e sem contexto para herdar, usando default (este mês)')
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    return {
      startDate: startOfMonth.toISOString().split('T')[0],
      periodoTexto: 'este mês'
    }
  }
  
  switch (periodo) {
    case 'hoje':
      return {
        startDate: getTodayStartInBrazil(),
        endDate: getTodayEndInBrazil(),
        periodoTexto: 'hoje'
      }
    case 'amanhã': {
      return {
        // Range do dia de amanhã no Brasil (instantes ISO UTC)
        startDate: getTomorrowStartISOInBrazil(),
        endDate: getTomorrowEndISOInBrazil(),
        periodoTexto: 'amanhã'
      }
    }
    case 'ontem':
      return {
        startDate: getYesterdayStartInBrazil(),
        endDate: getYesterdayEndInBrazil(),
        periodoTexto: 'ontem'
      }
    case 'semana': {
      const semanaInicio = new Date(now)
      semanaInicio.setDate(semanaInicio.getDate() - 7)
      semanaInicio.setHours(0, 0, 0, 0)
      return {
        startDate: semanaInicio.toISOString().split('T')[0],
        endDate: now.toISOString().split('T')[0],
        periodoTexto: 'esta semana'
      }
    }
    case 'mês': {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      return {
        startDate: startOfMonth.toISOString().split('T')[0],
        periodoTexto: 'este mês'
      }
    }
    default:
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      return {
        startDate: startOfMonth.toISOString().split('T')[0],
        periodoTexto: 'este mês'
      }
  }
}

/**
 * Consulta compromissos baseado no estado semântico
 */
async function queryCompromissos(
  state: SemanticState,
  tenantId: string,
  userId: string
): Promise<ActionResult> {
  const { periodoTexto } = getDateRangeFromPeriodo(state.periodo || null)
  
  let compromissos: any[] = []
  const now = getNowInBrazil()
  
  if (state.periodo === 'hoje') {
    // Para relatório: inclui cancelados para marcar com ❌ riscado
    const start = getBrazilDayStartISO(0, now)
    const end = getBrazilDayEndISO(0, now)
    compromissos = await getCompromissosRecords(tenantId, start, end, userId, true)
  } else if (state.periodo === 'amanhã') {
    // Range correto: amanhã no Brasil (00:00 -> 23:59:59.999)
    const start = getTomorrowStartISOInBrazil()
    const end = getTomorrowEndISOInBrazil()
    compromissos = await getCompromissosRecords(tenantId, start, end, userId, true)
  } else {
    const { startDate, endDate } = getDateRangeFromPeriodo(state.periodo || null)
    compromissos = await getCompromissosRecords(
      tenantId,
      startDate,
      endDate || undefined,
      userId,
      true
    )
  }
  
  compromissos.sort((a, b) => 
    new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
  )
  
  if (compromissos.length === 0) {
    return {
      success: true,
      message: `📅 Você não tem compromissos ${periodoTexto}.`,
      data: { compromissos: [], periodo: periodoTexto }
    }
  }
  
  const totalCancelados = compromissos.filter(isCancelled).length
  const responseLines = compromissos.map(c => formatCompromissoLine(c, now))

  let response = `📅 Compromissos ${periodoTexto}:\n`
  response += `Total: ${compromissos.length}${totalCancelados ? ` (❌ ${totalCancelados} cancelado${totalCancelados === 1 ? '' : 's'})` : ''}\n\n`
  response += responseLines.join('\n')
  
  return {
    success: true,
    message: response,
    data: { compromissos, periodo: periodoTexto }
  }
}

/**
 * Consulta gastos baseado no estado semântico
 */
async function queryGastos(
  state: SemanticState,
  tenantId: string,
  userId: string
): Promise<ActionResult> {
  const { startDate, endDate, periodoTexto } = getDateRangeFromPeriodo(state.periodo || null)
  
  // Busca apenas despesas
  const registros = await getDespesasRecords(tenantId, startDate, endDate, userId)
  
  // FILTRO SEMÂNTICO: Se tem categoria/subcategoria, usa filtro semântico
  // Isso resolve o problema de "mercado" não encontrar "supermercado"
  // O GPT pode retornar "mercado" como categoria, mas no banco está "Alimentação" com subcategoria "supermercado"
  let registrosFiltrados = registros
  if (state.categoria || state.subcategoria) {
    // Usa subcategoria se disponível, senão usa categoria
    // O filtro semântico resolve termos comuns como "mercado" → "Alimentação" + "supermercado"
    const searchTerm = state.subcategoria || state.categoria || ''
    registrosFiltrados = filterBySemanticCategory(registros, searchTerm)
    
    console.log('queryGastos - Filtro semântico aplicado:', {
      categoria: state.categoria,
      subcategoria: state.subcategoria,
      searchTerm,
      totalRegistros: registros.length,
      registrosFiltrados: registrosFiltrados.length,
      periodo: state.periodo
    })
    
    // Se não encontrou nada com filtro semântico, tenta busca direta por categoria
    if (registrosFiltrados.length === 0 && state.categoria) {
      console.log('queryGastos - Filtro semântico não encontrou resultados, tentando busca direta por categoria')
      registrosFiltrados = registros.filter(r => 
        r.category.toLowerCase() === state.categoria!.toLowerCase() ||
        (r.subcategory && r.subcategory.toLowerCase() === state.categoria!.toLowerCase())
      )
    }
  }
  
  const total = registrosFiltrados.reduce((sum, r) => sum + Number(r.amount), 0)
  
  if (registrosFiltrados.length === 0) {
    return {
      success: true,
      message: `💰 Você não teve despesas ${state.categoria ? `em ${state.categoria} ` : ''}${periodoTexto}.`,
      data: { registros: [], total: 0 }
    }
  }
  
  // Para períodos curtos (hoje, ontem), mostra detalhes
  if (state.periodo === 'hoje' || state.periodo === 'ontem') {
    let response = `💰 Seus gastos ${periodoTexto}:\n\n`
    response += `Total: R$ ${total.toFixed(2)}\n`
    response += `Registros: ${registrosFiltrados.length}\n\n`
    response += `Detalhes:\n${registrosFiltrados.map(r => 
      `• ${r.description} - R$ ${Number(r.amount).toFixed(2)} (${r.category}${r.subcategory ? ` - ${r.subcategory}` : ''})`
    ).join('\n')}`
    
    return {
      success: true,
      message: response,
      data: { registros: registrosFiltrados, total }
    }
  }
  
  // Para períodos maiores, mostra resumo por categoria
  const porCategoria: Record<string, number> = {}
  registrosFiltrados.forEach(r => {
    porCategoria[r.category] = (porCategoria[r.category] || 0) + Number(r.amount)
  })
  
  let response = `📊 Seus gastos ${state.categoria ? `em ${state.categoria} ` : ''}(${periodoTexto}):\n\n`
  response += `💰 Total: R$ ${total.toFixed(2)}\n`
  response += `📝 Registros: ${registrosFiltrados.length}\n\n`
  
  if (Object.keys(porCategoria).length > 0) {
    response += `Por categoria:\n`
    Object.entries(porCategoria)
      .sort(([, a], [, b]) => b - a)
      .forEach(([cat, valor]) => {
        response += `• ${cat}: R$ ${valor.toFixed(2)}\n`
      })
    response += `\n`
  }
  
  response += `Últimos gastos:\n${registrosFiltrados.slice(0, 5).map(r => 
    `• ${r.description} - R$ ${Number(r.amount).toFixed(2)} (${r.category}${r.subcategory ? ` - ${r.subcategory}` : ''})`
  ).join('\n')}`
  
  return {
    success: true,
    message: response,
    data: { registros: registrosFiltrados, total }
  }
}

/**
 * Consulta listas (contagem + nomes) baseado no estado semântico
 */
async function queryListas(
  state: SemanticState,
  tenantId: string
): Promise<ActionResult> {
  const tipoRaw = state.list_type ? String(state.list_type).trim() : ''
  const tipo = tipoRaw ? tipoRaw : null

  const listas = await getListasByTenant(tenantId, tipo, 200)
  const total = listas.length

  if (total === 0) {
    return {
      success: true,
      message: tipo ? `📋 Você não tem nenhuma lista de ${tipo}.` : '📋 Você não tem nenhuma lista.',
      data: { total, listas: [] },
    }
  }

  const title = tipo ? `📋 Você tem ${total} lista${total === 1 ? '' : 's'} de ${tipo}:` : `📋 Você tem ${total} lista${total === 1 ? '' : 's'}:`
  const names = listas.map((l) => `- ${String(l.nome).trim()}`).join('\n')

  return {
    success: true,
    message: `${title}\n\n${names}`,
    data: { total, listas },
  }
}

/**
 * Função principal simplificada
 */
export async function handleQuerySimple(
  state: SemanticState,
  tenantId: string,
  userId: string
): Promise<ActionResult> {
  // Validação rígida
  if (!state.queryType) {
    return {
      success: false,
      message: 'Não entendi o que você quer consultar. Pode especificar?',
    }
  }
  
  if (!state.domain) {
    return {
      success: false,
      message: 'Erro ao identificar o tipo de consulta. Tente novamente.',
    }
  }
  
  // Executa baseado no tipo de query
  if (state.queryType === 'compromissos' && state.domain === 'agenda') {
    return await queryCompromissos(state, tenantId, userId)
  }
  
  if (state.queryType === 'gasto' && state.domain === 'financeiro') {
    return await queryGastos(state, tenantId, userId)
  }

  if (state.queryType === 'listas' && state.domain === 'listas') {
    return await queryListas(state, tenantId)
  }
  
  return {
    success: false,
    message: 'Tipo de consulta não suportado. Tente novamente.',
  }
}
