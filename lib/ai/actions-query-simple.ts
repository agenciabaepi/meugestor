/**
 * Versão simplificada do handleQuery
 * Usa apenas estado semântico, sem heurísticas
 */

import { SemanticState } from './semantic-state'
import { ActionResult } from './actions'
import type { SessionContext } from '../db/types'
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
import { normalizeText } from '../utils/normalize-text'
import { getListView, formatListRawResponse } from '../services/listas'
import { 
  getEmployeePaymentsByEmpresa,
  getPagamentosFuncionariosByEmpresa,
  getFuncionariosByEmpresa,
} from '../db/queries-empresa'
import { findFuncionarioByName } from '../services/funcionarios'

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
  
  // REGRA CRÍTICA (conforme bot.md): Se período não informado, assume "mês" (mês atual)
  // Isso é especialmente importante para consultas de funcionários
  if (!periodo) {
    console.log('getDateRangeFromPeriodo - Período não especificado, usando default (este mês) conforme bot.md')
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
    return {
      startDate: startOfMonth.toISOString().split('T')[0],
      endDate: endOfMonth.toISOString(),
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
  // Regra: contar DISTINCT(nome_normalizado) por tenant
  const byNorm = new Map<string, any>()
  for (const l of listas) {
    const norm = String((l as any).nome_normalizado || '').trim() || normalizeText(String((l as any).nome_original || l.nome || ''))
    if (!norm) continue
    if (!byNorm.has(norm)) byNorm.set(norm, l)
  }
  const unique = Array.from(byNorm.values())
  const total = unique.length

  if (total === 0) {
    return {
      success: true,
      message: tipo ? `📋 Você não tem nenhuma lista de ${tipo}.` : '📋 Você não tem nenhuma lista.',
      data: { total, listas: [] },
    }
  }

  const title = tipo ? `📋 Você tem ${total} lista${total === 1 ? '' : 's'} de ${tipo}:` : `📋 Você tem ${total} lista${total === 1 ? '' : 's'}:`
  const names = unique.map((l) => `• ${String((l as any).nome_original || l.nome).trim()}`).join('\n')

  return {
    success: true,
    message: `${title}\n\n${names}`,
    data: { total, listas: unique },
  }
}

async function queryListaItens(
  state: SemanticState,
  tenantId: string
): Promise<ActionResult> {
  const listName = state.list_name ? String(state.list_name).trim() : ''
  if (!listName) {
    return { success: false, message: 'Qual lista?' }
  }

  const view = await getListView({ tenantId, listName })
  const total = (view.pendentes?.length || 0) + (view.comprados?.length || 0)

  const message = formatListRawResponse({
    listName: (view.lista as any).nome_original || view.lista.nome,
    pendentes: view.pendentes,
    comprados: view.comprados,
  })

  return {
    success: true,
    message,
    data: { total, view },
  }
}

/**
 * Consulta pagamentos de funcionários (modo empresa)
 */
async function queryEmployeePayments(
  state: SemanticState,
  tenantId: string,
  sessionContext: SessionContext | null
): Promise<ActionResult> {
  if (!sessionContext || sessionContext.mode !== 'empresa' || !sessionContext.empresa_id) {
    return {
      success: true,
      message: 'Consultas de funcionários só estão disponíveis no modo empresa.',
    }
  }

  // Período: se não mencionado, assume "este mês"
  const periodo = state.periodo || 'mês'
  const { startDate, endDate, periodoTexto } = getDateRangeFromPeriodo(periodo)

  // Busca funcionário específico se mencionado
  let funcionarioId: string | null = null
  if (state.employee_name) {
    const funcionario = await findFuncionarioByName(sessionContext, state.employee_name)
    if (funcionario) {
      funcionarioId = funcionario.id
    }
  }

  // Busca pagamentos de funcionários da tabela pagamentos_funcionarios
  const pagamentos = await getPagamentosFuncionariosByEmpresa(
    sessionContext.tenant_id,
    sessionContext.empresa_id,
    funcionarioId || undefined,
    'pago', // apenas pagos
    startDate,
    endDate
  )

  if (pagamentos.length === 0) {
    if (state.employee_name) {
      return {
        success: true,
        message: `⚠️ Você ainda não registrou pagamentos para *${state.employee_name}* neste período.`,
      }
    }
    return {
      success: true,
      message: `📊 Não há pagamentos de funcionários registrados ${periodoTexto === 'este mês' ? 'neste mês' : periodoTexto}.`,
    }
  }

  // Busca nomes dos funcionários para exibição
  const { getFuncionarioByNormalizedName } = await import('../db/queries-empresa')
  const funcionariosMap = new Map<string, string>()
  
  // Agrupa por funcionário
  const porFuncionario: Record<string, { nome: string; total: number; pagamentos: any[]; ultimaData: string }> = {}
  
  for (const pagamento of pagamentos) {
    const funcionarioIdPag = pagamento.funcionario_id
    
    // Busca nome do funcionário se ainda não tiver
    if (!funcionariosMap.has(funcionarioIdPag)) {
      // Tenta buscar do banco (precisa de uma query que busque por ID)
      const { getFuncionariosByEmpresa } = await import('../db/queries-empresa')
      const funcionarios = await getFuncionariosByEmpresa(
        sessionContext.tenant_id,
        sessionContext.empresa_id
      )
      const funcionario = funcionarios.find(f => f.id === funcionarioIdPag)
      funcionariosMap.set(funcionarioIdPag, funcionario?.nome_original || 'Funcionário')
    }
    
    const funcionarioNome = funcionariosMap.get(funcionarioIdPag) || 'Funcionário'
    
    if (!porFuncionario[funcionarioIdPag]) {
      porFuncionario[funcionarioIdPag] = {
        nome: funcionarioNome,
        total: 0,
        pagamentos: [],
        ultimaData: pagamento.data_pagamento,
      }
    }
    
    const grupo = porFuncionario[funcionarioIdPag]
    grupo.total += Number(pagamento.valor)
    grupo.pagamentos.push(pagamento)
    // Atualiza última data (mais recente)
    if (new Date(pagamento.data_pagamento) > new Date(grupo.ultimaData)) {
      grupo.ultimaData = pagamento.data_pagamento
    }
  }

  const funcionarios = Object.values(porFuncionario)
  const totalGeral = funcionarios.reduce((sum, f) => sum + f.total, 0)

  // Se foi pergunta específica sobre um funcionário
  if (state.employee_name && funcionarios.length === 1) {
    const func = funcionarios[0]
    const ultimaData = new Date(func.ultimaData).toLocaleDateString('pt-BR')
    const quantidadePagamentos = func.pagamentos.length
    return {
      success: true,
      message: `✅ Sim. Você já pagou *${func.nome}* ${periodoTexto === 'este mês' ? 'neste mês' : periodoTexto}:\n• Total: R$ ${func.total.toFixed(2).replace('.', ',')}\n• Pagamentos: ${quantidadePagamentos}\n• Último pagamento: ${ultimaData}`,
      data: { funcionario: func, pagamentos: func.pagamentos },
    }
  }

  // Relatório agregado (todos os funcionários)
  let response = `📊 *Pagamentos de Funcionários (${periodoTexto})*\n\n`
  
  // Ordena por total (maior primeiro)
  funcionarios.sort((a, b) => b.total - a.total)
  
  for (const func of funcionarios) {
    response += `👤 ${func.nome}\n`
    response += `• Total pago: R$ ${func.total.toFixed(2).replace('.', ',')}\n`
    response += `• Pagamentos: ${func.pagamentos.length}\n\n`
  }
  
  response += `💰 *Total geral:* R$ ${totalGeral.toFixed(2).replace('.', ',')}`

  return {
    success: true,
    message: response,
    data: { funcionarios, totalGeral, periodo: periodoTexto },
  }
}

/**
 * Consulta: Quantos funcionários eu tenho? (conforme bot.md)
 */
async function queryFuncionariosCount(
  state: SemanticState,
  tenantId: string,
  sessionContext: SessionContext | null
): Promise<ActionResult> {
  if (!sessionContext || sessionContext.mode !== 'empresa' || !sessionContext.empresa_id) {
    return {
      success: true,
      message: 'Consultas de funcionários só estão disponíveis no modo empresa.',
    }
  }

  const funcionarios = await getFuncionariosByEmpresa(
    sessionContext.tenant_id,
    sessionContext.empresa_id,
    true, // apenas ativos
    1000 // limite alto
  )

  const total = funcionarios.length
  const nomes = funcionarios.map(f => f.nome_original).sort()

  let response = `👥 *Total de Funcionários: ${total}*\n\n`
  
  if (nomes.length > 0) {
    response += `*Funcionários:*\n`
    nomes.forEach((nome, idx) => {
      response += `${idx + 1}. ${nome}\n`
    })
  } else {
    response += `Nenhum funcionário cadastrado.`
  }

  return {
    success: true,
    message: response,
    data: { total, funcionarios, nomes },
  }
}

/**
 * Consulta: Quais funcionários eu já paguei? (conforme bot.md)
 */
async function queryFuncionariosPagos(
  state: SemanticState,
  tenantId: string,
  sessionContext: SessionContext | null
): Promise<ActionResult> {
  if (!sessionContext || sessionContext.mode !== 'empresa' || !sessionContext.empresa_id) {
    return {
      success: true,
      message: 'Consultas de funcionários só estão disponíveis no modo empresa.',
    }
  }

  // REGRA CRÍTICA: Se período não informado, assume "mês" (mês atual)
  const periodo = state.periodo || 'mês'
  const { startDate, endDate, periodoTexto } = getDateRangeFromPeriodo(periodo)

  // Busca funcionário específico se mencionado
  let funcionarioId: string | null = null
  if (state.employee_name) {
    const funcionario = await findFuncionarioByName(sessionContext, state.employee_name)
    if (funcionario) {
      funcionarioId = funcionario.id
    }
  }

  // Busca pagamentos do período
  const pagamentos = await getPagamentosFuncionariosByEmpresa(
    sessionContext.tenant_id,
    sessionContext.empresa_id,
    funcionarioId || undefined,
    'pago',
    startDate,
    endDate
  )

  if (pagamentos.length === 0) {
    if (state.employee_name) {
      return {
        success: true,
        message: `⚠️ Você ainda não registrou pagamentos para *${state.employee_name}* ${periodoTexto === 'este mês' ? 'neste mês' : periodoTexto}.`,
      }
    }
    return {
      success: true,
      message: `📊 Não há funcionários pagos ${periodoTexto === 'este mês' ? 'neste mês' : periodoTexto}.`,
    }
  }

  // Busca todos os funcionários para mapear IDs
  const todosFuncionarios = await getFuncionariosByEmpresa(
    sessionContext.tenant_id,
    sessionContext.empresa_id
  )
  const funcionariosMap = new Map(todosFuncionarios.map(f => [f.id, f.nome_original]))

  console.log('queryFuncionariosPagos - Debug:', {
    totalFuncionarios: todosFuncionarios.length,
    totalPagamentos: pagamentos.length,
    periodo: { startDate, endDate, periodoTexto }
  })

  // Agrupa por funcionário
  const porFuncionario: Record<string, { nome: string; total: number; pagamentos: number }> = {}
  
  for (const pagamento of pagamentos) {
    const funcionarioIdPag = pagamento.funcionario_id
    const nome = funcionariosMap.get(funcionarioIdPag) || 'Funcionário'
    
    if (!porFuncionario[funcionarioIdPag]) {
      porFuncionario[funcionarioIdPag] = {
        nome,
        total: 0,
        pagamentos: 0,
      }
    }
    
    porFuncionario[funcionarioIdPag].total += Number(pagamento.valor)
    porFuncionario[funcionarioIdPag].pagamentos += 1
  }

  const funcionarios = Object.values(porFuncionario)
  funcionarios.sort((a, b) => a.nome.localeCompare(b.nome))

  let response = `✅ *Funcionários Pagos (${periodoTexto})*\n\n`
  
  for (const func of funcionarios) {
    response += `👤 ${func.nome}\n`
    response += `• Total: R$ ${func.total.toFixed(2).replace('.', ',')}\n`
    response += `• Pagamentos: ${func.pagamentos}\n\n`
  }

  return {
    success: true,
    message: response,
    data: { funcionarios, periodo: periodoTexto },
  }
}

/**
 * Consulta: Falta quantos funcionários para pagar? / Quem eu ainda não paguei? (conforme bot.md)
 */
async function queryFuncionariosPendentes(
  state: SemanticState,
  tenantId: string,
  sessionContext: SessionContext | null
): Promise<ActionResult> {
  if (!sessionContext || sessionContext.mode !== 'empresa' || !sessionContext.empresa_id) {
    return {
      success: true,
      message: 'Consultas de funcionários só estão disponíveis no modo empresa.',
    }
  }

  // REGRA CRÍTICA: Se período não informado, assume "mês" (mês atual)
  const periodo = state.periodo || 'mês'
  const { startDate, endDate, periodoTexto } = getDateRangeFromPeriodo(periodo)

  // Busca TODOS os funcionários ativos
  const todosFuncionarios = await getFuncionariosByEmpresa(
    sessionContext.tenant_id,
    sessionContext.empresa_id,
    true, // apenas ativos
    1000
  )

  // Para consultas de mês, também podemos usar referencia (formato "01/2026")
  // Isso é mais confiável que data_pagamento para filtrar por mês
  const now = getNowInBrazil()
  const referenciaMes = periodo === 'mês' || !periodo 
    ? `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`
    : null

  // Busca funcionários que JÁ FORAM PAGOS no período
  // Primeiro tenta por referencia (mais confiável para mês), depois por data
  let pagamentos = await getPagamentosFuncionariosByEmpresa(
    sessionContext.tenant_id,
    sessionContext.empresa_id,
    undefined, // todos
    'pago',
    startDate,
    endDate
  )

  // Se temos referencia e período é mês, filtra também por referencia para garantir
  if (referenciaMes && (periodo === 'mês' || !periodo)) {
    const pagamentosPorReferencia = pagamentos.filter(p => p.referencia === referenciaMes)
    if (pagamentosPorReferencia.length > 0) {
      console.log(`queryFuncionariosPendentes - Usando filtro por referencia: ${referenciaMes}`)
      pagamentos = pagamentosPorReferencia
    }
  }

  // DEBUG: Log para verificar pagamentos encontrados
  console.log('queryFuncionariosPendentes - Pagamentos encontrados:', {
    total: pagamentos.length,
    pagamentos: pagamentos.map(p => ({
      funcionario_id: p.funcionario_id,
      data_pagamento: p.data_pagamento,
      referencia: p.referencia,
      valor: p.valor
    })),
    startDate,
    endDate
  })

  // CRÍTICO: Filtra apenas pagamentos com funcionario_id válido (não null)
  // E remove duplicatas (um funcionário pode ter múltiplos pagamentos no período)
  const funcionariosPagosIds = new Set(
    pagamentos
      .filter(p => p.funcionario_id && p.funcionario_id.trim() !== '') // Remove null/undefined/vazio
      .map(p => p.funcionario_id)
  )

  console.log('queryFuncionariosPendentes - Funcionários pagos (IDs):', Array.from(funcionariosPagosIds))
  console.log('queryFuncionariosPendentes - Total funcionários ativos:', todosFuncionarios.length)

  // Calcula quem NÃO foi pago
  const funcionariosPendentes = todosFuncionarios.filter(
    f => !funcionariosPagosIds.has(f.id)
  )

  const totalPendentes = funcionariosPendentes.length
  const totalFuncionarios = todosFuncionarios.length
  const totalPagos = totalFuncionarios - totalPendentes

  let response = `📋 *Funcionários Pendentes (${periodoTexto})*\n\n`
  response += `⏳ Faltam pagar: *${totalPendentes}* de ${totalFuncionarios} funcionários\n\n`

  if (totalPendentes > 0) {
    response += `*Funcionários que ainda não foram pagos:*\n`
    funcionariosPendentes
      .map(f => f.nome_original)
      .sort()
      .forEach((nome, idx) => {
        response += `${idx + 1}. ${nome}\n`
      })
  } else {
    response += `✅ Todos os funcionários já foram pagos!`
  }

  return {
    success: true,
    message: response,
    data: { 
      totalPendentes, 
      totalFuncionarios, 
      totalPagos,
      funcionariosPendentes: funcionariosPendentes.map(f => f.nome_original),
      periodo: periodoTexto 
    },
  }
}

/**
 * Consulta: Quanto eu já paguei de salário esse mês? (conforme bot.md)
 */
async function querySalariosTotal(
  state: SemanticState,
  tenantId: string,
  sessionContext: SessionContext | null
): Promise<ActionResult> {
  if (!sessionContext || sessionContext.mode !== 'empresa' || !sessionContext.empresa_id) {
    return {
      success: true,
      message: 'Consultas de funcionários só estão disponíveis no modo empresa.',
    }
  }

  // REGRA CRÍTICA: Se período não informado, assume "mês" (mês atual)
  const periodo = state.periodo || 'mês'
  const { startDate, endDate, periodoTexto } = getDateRangeFromPeriodo(periodo)

  // Busca TODOS os pagamentos do período
  const pagamentos = await getPagamentosFuncionariosByEmpresa(
    sessionContext.tenant_id,
    sessionContext.empresa_id,
    undefined, // todos
    'pago',
    startDate,
    endDate
  )

  // Soma total de salários pagos
  const total = pagamentos.reduce((sum, p) => sum + Number(p.valor), 0)
  const quantidadePagamentos = pagamentos.length

  let response = `💰 *Total de Salários Pagos (${periodoTexto})*\n\n`
  response += `💵 Total: R$ ${total.toFixed(2).replace('.', ',')}\n`
  response += `📊 Pagamentos: ${quantidadePagamentos}`

  return {
    success: true,
    message: response,
    data: { total, quantidadePagamentos, periodo: periodoTexto },
  }
}

/**
 * Função principal simplificada
 */
export async function handleQuerySimple(
  state: SemanticState,
  tenantId: string,
  userId: string,
  sessionContext?: SessionContext | null
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

  if (state.queryType === 'lista_itens' && state.domain === 'listas') {
    return await queryListaItens(state, tenantId)
  }

  if (state.queryType === 'employee_payments' && state.domain === 'empresa') {
    return await queryEmployeePayments(state, tenantId, sessionContext || null)
  }

  // NOVAS CONSULTAS DE FUNCIONÁRIOS (conforme bot.md)
  if (state.queryType === 'funcionarios_count' && state.domain === 'empresa') {
    return await queryFuncionariosCount(state, tenantId, sessionContext || null)
  }

  if (state.queryType === 'funcionarios_pagos' && state.domain === 'empresa') {
    return await queryFuncionariosPagos(state, tenantId, sessionContext || null)
  }

  if (state.queryType === 'funcionarios_pendentes' && state.domain === 'empresa') {
    return await queryFuncionariosPendentes(state, tenantId, sessionContext || null)
  }

  if (state.queryType === 'salarios_total' && state.domain === 'empresa') {
    return await querySalariosTotal(state, tenantId, sessionContext || null)
  }
  
  return {
    success: false,
    message: 'Tipo de consulta não suportado. Tente novamente.',
  }
}
