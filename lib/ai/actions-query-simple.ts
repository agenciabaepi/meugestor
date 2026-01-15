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
  getNowInBrazil
} from '../utils/date-parser'

/**
 * Converte período semântico em range de datas
 */
function getDateRangeFromPeriodo(periodo: string | null | undefined): { startDate: string; endDate?: string; periodoTexto: string } {
  const now = getNowInBrazil()
  
  if (!periodo) {
    // Default: este mês
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
  tenantId: string
): Promise<ActionResult> {
  const { periodo } = getDateRangeFromPeriodo(state.periodo || null)
  
  let compromissos: any[] = []
  
  if (state.periodo === 'hoje') {
    compromissos = await getTodayCompromissos(tenantId)
  } else if (state.periodo === 'amanhã') {
    const nowBrazil = getNowInBrazil()
    const amanha = new Date(nowBrazil)
    amanha.setDate(amanha.getDate() + 1)
    amanha.setHours(0, 0, 0, 0)
    const amanhaFim = new Date(amanha)
    amanhaFim.setHours(23, 59, 59, 999)
    
    const todos = await getCompromissosRecords(
      tenantId,
      amanha.toISOString(),
      amanhaFim.toISOString()
    )
    
    // Filtra no cliente para garantir timezone correto
    compromissos = todos.filter(c => {
      const dataComp = new Date(c.scheduled_at)
      const dataCompBR = dataComp.toLocaleDateString('en-CA', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      })
      const amanhaBR = amanha.toLocaleDateString('en-CA', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      })
      return dataCompBR === amanhaBR
    })
  } else {
    const { startDate, endDate } = getDateRangeFromPeriodo(state.periodo || null)
    compromissos = await getCompromissosRecords(
      tenantId,
      new Date(startDate).toISOString(),
      endDate ? new Date(endDate).toISOString() : undefined
    )
  }
  
  compromissos.sort((a, b) => 
    new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()
  )
  
  if (compromissos.length === 0) {
    return {
      success: true,
      message: `📅 Você não tem compromissos ${periodo}.`,
      data: { compromissos: [], periodo }
    }
  }
  
  let response = `📅 Você tem ${compromissos.length} ${compromissos.length === 1 ? 'compromisso' : 'compromissos'} ${periodo}:\n\n`
  
  compromissos.forEach((c, index) => {
    const dataHora = new Date(c.scheduled_at)
    const data = dataHora.toLocaleDateString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
    const hora = dataHora.toLocaleTimeString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit'
    })
    
    response += `${index + 1}. ${c.title}\n`
    response += `   🕐 ${hora} - ${data}\n`
    if (c.description) {
      response += `   📝 ${c.description}\n`
    }
    response += `\n`
  })
  
  return {
    success: true,
    message: response,
    data: { compromissos, periodo }
  }
}

/**
 * Consulta gastos baseado no estado semântico
 */
async function queryGastos(
  state: SemanticState,
  tenantId: string
): Promise<ActionResult> {
  const { startDate, endDate, periodoTexto } = getDateRangeFromPeriodo(state.periodo || null)
  
  // Busca apenas despesas
  const registros = await getDespesasRecords(tenantId, startDate, endDate)
  
  // Se tem categoria, filtra por categoria
  let registrosFiltrados = registros
  if (state.categoria) {
    registrosFiltrados = registros.filter(r => r.category === state.categoria)
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
 * Função principal simplificada
 */
export async function handleQuerySimple(
  state: SemanticState,
  tenantId: string
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
    return await queryCompromissos(state, tenantId)
  }
  
  if (state.queryType === 'gasto' && state.domain === 'financeiro') {
    return await queryGastos(state, tenantId)
  }
  
  return {
    success: false,
    message: 'Tipo de consulta não suportado. Tente novamente.',
  }
}
