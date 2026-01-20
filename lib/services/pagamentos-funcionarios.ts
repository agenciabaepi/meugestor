import type { Funcionario, PagamentoFuncionario, SessionContext } from '@/lib/db/types'
import { ValidationError } from '@/lib/utils/errors'
import {
  createFinanceiroEmpresa,
  createPagamentoFuncionario,
  getFuncionariosByEmpresa,
  getPagamentosFuncionariosByCompetencia,
} from '@/lib/db/queries-empresa'

export type RemuneracaoTipo = 'mensal' | 'quinzenal' | 'diaria'

export interface Competencia {
  ano: number
  mes: number
  quinzena: 1 | 2 | null
}

function getBrazilYMD(date: Date): { ano: number; mes: number; dia: number } {
  const parts = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const ano = Number(parts.find((p) => p.type === 'year')?.value || '0')
  const mes = Number(parts.find((p) => p.type === 'month')?.value || '0')
  const dia = Number(parts.find((p) => p.type === 'day')?.value || '0')
  return { ano, mes, dia }
}

function formatReferencia(ano: number, mes: number): string {
  return `${String(mes).padStart(2, '0')}/${ano}`
}

function getFuncionarioRemuneracaoTipo(funcionario: Funcionario): RemuneracaoTipo {
  const t = (funcionario as any).remuneracao_tipo as RemuneracaoTipo | undefined
  if (t === 'mensal' || t === 'quinzenal' || t === 'diaria') return t
  return 'mensal'
}

function getValorBaseFuncionario(funcionario: Funcionario): number | null {
  const v = (funcionario as any).remuneracao_valor
  if (typeof v === 'number' && v > 0) return v
  if (funcionario.salario_base && funcionario.salario_base > 0) return Number(funcionario.salario_base)
  return null
}

function dueQuinzenasForCompetencia(
  competenciaAno: number,
  competenciaMes: number,
  now: Date
): Array<1 | 2> {
  const br = getBrazilYMD(now)
  // mês futuro: nada "em aberto" ainda
  const isFuture = competenciaAno > br.ano || (competenciaAno === br.ano && competenciaMes > br.mes)
  if (isFuture) return []

  // mês passado: mês fechou, então ambas as quinzenas são devidas
  const isPast = competenciaAno < br.ano || (competenciaAno === br.ano && competenciaMes < br.mes)
  if (isPast) return [1, 2]

  // mês atual: depende do dia atual no Brasil
  return br.dia <= 15 ? [1] : [1, 2]
}

function computeQuinzenaFromBrazilDay(dia: number): 1 | 2 {
  return dia <= 15 ? 1 : 2
}

export interface RegistrarPagamentoResult {
  ok: boolean
  alreadyPaid?: boolean
  message: string
  data?: {
    financeiro: any
    pagamento: PagamentoFuncionario | null
    competencia: Competencia
    valor: number
  }
}

/**
 * Registra pagamento SEM "pagamento genérico":
 * sempre deriva do funcionário (tipo + valor) e aplica regras de duplicidade por competência.
 *
 * - mensal: 1 pagamento por mês (competência)
 * - quinzenal: 1 pagamento por quinzena (competência)
 * - diária: evento livre; não entra em "pendentes"
 */
export async function registrarPagamentoFuncionarioPorRegra(
  ctx: SessionContext,
  funcionario: Funcionario,
  opts?: {
    competenciaAno?: number
    competenciaMes?: number
    // se tipo=quinzenal e quiser forçar, pode passar 1|2; por padrão o sistema escolhe a quinzena em aberto
    competenciaQuinzena?: 1 | 2 | null
    // para diária
    quantidadeDias?: number | null
    // override de valor (ex: caso excepcional). Preferência sempre é cadastro do funcionário.
    valorOverride?: number | null
    // data do evento (default: hoje)
    dataPagamento?: string | null // YYYY-MM-DD
    userId?: string | null
  }
): Promise<RegistrarPagamentoResult> {
  if (ctx.mode !== 'empresa' || !ctx.empresa_id) {
    throw new ValidationError('Pagamento de funcionários só está disponível no modo empresa.')
  }

  const now = new Date()
  const br = getBrazilYMD(now)
  const tipo = getFuncionarioRemuneracaoTipo(funcionario)

  const competenciaAno = opts?.competenciaAno ?? br.ano
  const competenciaMes = opts?.competenciaMes ?? br.mes

  const valorBase =
    (opts?.valorOverride && opts.valorOverride > 0 ? opts.valorOverride : null) ??
    getValorBaseFuncionario(funcionario)

  if (!valorBase || valorBase <= 0) {
    return {
      ok: false,
      message:
        `O funcionário *${funcionario.nome_original}* não tem valor de remuneração cadastrado. ` +
        `Cadastre o valor no funcionário para eu conseguir executar o pagamento automaticamente.`,
    }
  }

  const referencia = formatReferencia(competenciaAno, competenciaMes)

  let competenciaQuinzena: 1 | 2 | null = null
  let quantidadeDias: number | null = null
  let valorFinal = valorBase

  // Busca pagamentos já registrados na competência (para regras e idempotência)
  const pagamentosCompetencia = await getPagamentosFuncionariosByCompetencia(
    ctx.tenant_id,
    ctx.empresa_id,
    competenciaAno,
    competenciaMes,
    funcionario.id
  )

  if (tipo === 'mensal') {
    const jaPago = pagamentosCompetencia.some((p) => (p as any).remuneracao_tipo === 'mensal')
    if (jaPago) {
      return {
        ok: true,
        alreadyPaid: true,
        message: `ℹ️ *${funcionario.nome_original}* já tem pagamento mensal registrado em ${referencia}.`,
      }
    }
  }

  if (tipo === 'quinzenal') {
    const due = dueQuinzenasForCompetencia(competenciaAno, competenciaMes, now)
    const pagos = new Set<number>(
      pagamentosCompetencia
        .filter((p) => (p as any).remuneracao_tipo === 'quinzenal')
        .map((p) => Number((p as any).competencia_quinzena))
        .filter((n) => n === 1 || n === 2)
    )

    const forced = opts?.competenciaQuinzena ?? null
    if (forced === 1 || forced === 2) {
      competenciaQuinzena = forced
    } else {
      // regra inteligente: paga a primeira quinzena "em aberto" (devida e ainda não paga)
      const target = due.find((q) => !pagos.has(q)) ?? null
      if (!target) {
        // Se nada estiver "devido" (mês futuro) ou ambas já pagas, informa.
        const currentQ = computeQuinzenaFromBrazilDay(br.dia)
        const monthHasAny = pagos.has(1) || pagos.has(2)
        if (monthHasAny && pagos.has(1) && pagos.has(2)) {
          return {
            ok: true,
            alreadyPaid: true,
            message: `ℹ️ *${funcionario.nome_original}* já tem as duas quinzenas pagas em ${referencia}.`,
          }
        }
        // fallback: paga a quinzena atual (caso o usuário esteja pagando adiantado)
        competenciaQuinzena = currentQ
      } else {
        competenciaQuinzena = target
      }
    }

    if (!competenciaQuinzena) {
      return {
        ok: false,
        message: `Não consegui determinar a quinzena para pagar *${funcionario.nome_original}* em ${referencia}.`,
      }
    }

    const jaPagoEssaQuinzena = pagos.has(competenciaQuinzena)
    if (jaPagoEssaQuinzena) {
      return {
        ok: true,
        alreadyPaid: true,
        message: `ℹ️ *${funcionario.nome_original}* já tem pagamento registrado para a ${competenciaQuinzena}ª quinzena de ${referencia}.`,
      }
    }
  }

  if (tipo === 'diaria') {
    quantidadeDias = opts?.quantidadeDias && opts.quantidadeDias > 0 ? opts.quantidadeDias : 1
    valorFinal = Number((valorBase * quantidadeDias).toFixed(2))
  }

  const dataPagamento = (opts?.dataPagamento || '').trim() || new Date().toISOString().split('T')[0]
  const competencia: Competencia = { ano: competenciaAno, mes: competenciaMes, quinzena: competenciaQuinzena }

  // Descrição e metadados orientados a regras (sempre despesa e sempre vinculado ao funcionário)
  const descricaoBase =
    tipo === 'mensal'
      ? `Salário (mensal) — ${funcionario.nome_original} — ${referencia}`
      : tipo === 'quinzenal'
        ? `Salário (quinzenal ${competenciaQuinzena}ª) — ${funcionario.nome_original} — ${referencia}`
        : `Diária (${quantidadeDias} dia${quantidadeDias === 1 ? '' : 's'}) — ${funcionario.nome_original} — ${referencia}`

  const financeiro = await createFinanceiroEmpresa(
    ctx.tenant_id,
    ctx.empresa_id,
    valorFinal,
    descricaoBase,
    'Funcionários',
    dataPagamento,
    null,
    'salário',
    {
      funcionario: { id: funcionario.id, nome: funcionario.nome_original },
      remuneracao_tipo: tipo,
      competencia: {
        ano: competenciaAno,
        mes: competenciaMes,
        quinzena: competenciaQuinzena,
      },
      quantidade_dias: quantidadeDias,
    },
    ['funcionário', 'pagamento', tipo],
    'expense',
    opts?.userId || null,
    funcionario.id,
    true
  )

  if (!financeiro) {
    return { ok: false, message: 'Não consegui registrar o gasto do pagamento. Tente novamente.' }
  }

  const pagamento = await createPagamentoFuncionario(
    ctx.tenant_id,
    ctx.empresa_id,
    funcionario.id,
    valorFinal,
    dataPagamento,
    referencia,
    financeiro.id,
    tipo,
    competenciaAno,
    competenciaMes,
    competenciaQuinzena,
    quantidadeDias,
    'pago'
  )

  return {
    ok: true,
    message: `Pronto! Registrei o pagamento de *${funcionario.nome_original}* (${tipo}) em ${referencia}.`,
    data: { financeiro, pagamento, competencia, valor: valorFinal },
  }
}

export interface PendenciaFuncionario {
  funcionario_id: string
  nome: string
  tipo: RemuneracaoTipo
  pendencias: Array<{ competencia: Competencia; valor: number | null; label: string }>
}

export async function calcularPendenciasFuncionariosPorCompetencia(
  ctx: SessionContext,
  competenciaAno: number,
  competenciaMes: number,
  now: Date = new Date()
): Promise<{
  pendentes: PendenciaFuncionario[]
  totalPendente: number
  totalPendenteSemValor: number
}> {
  if (ctx.mode !== 'empresa' || !ctx.empresa_id) {
    return { pendentes: [], totalPendente: 0, totalPendenteSemValor: 0 }
  }

  const funcionarios = await getFuncionariosByEmpresa(ctx.tenant_id, ctx.empresa_id, true, 1000)
  const pagamentos = await getPagamentosFuncionariosByCompetencia(ctx.tenant_id, ctx.empresa_id, competenciaAno, competenciaMes)
  const pagosByFuncionario = new Map<string, PagamentoFuncionario[]>()
  for (const p of pagamentos) {
    const list = pagosByFuncionario.get(p.funcionario_id) || []
    list.push(p)
    pagosByFuncionario.set(p.funcionario_id, list)
  }

  let totalPendente = 0
  let totalPendenteSemValor = 0
  const pendentes: PendenciaFuncionario[] = []
  const referencia = formatReferencia(competenciaAno, competenciaMes)

  for (const f of funcionarios) {
    const tipo = getFuncionarioRemuneracaoTipo(f)
    if (tipo === 'diaria') continue // regra: diária nunca entra em pendentes

    const valorBase = getValorBaseFuncionario(f)
    const pagamentosF = pagosByFuncionario.get(f.id) || []

    if (tipo === 'mensal') {
      const jaPago = pagamentosF.some((p) => (p as any).remuneracao_tipo === 'mensal')
      if (!jaPago) {
        const valor = valorBase
        if (valor && valor > 0) totalPendente += valor
        else totalPendenteSemValor += 1
        pendentes.push({
          funcionario_id: f.id,
          nome: f.nome_original,
          tipo,
          pendencias: [
            {
              competencia: { ano: competenciaAno, mes: competenciaMes, quinzena: null },
              valor: valor && valor > 0 ? valor : null,
              label: `Mensal (${referencia})`,
            },
          ],
        })
      }
    }

    if (tipo === 'quinzenal') {
      const due = dueQuinzenasForCompetencia(competenciaAno, competenciaMes, now)
      if (due.length === 0) continue

      const pagos = new Set<number>(
        pagamentosF
          .filter((p) => (p as any).remuneracao_tipo === 'quinzenal')
          .map((p) => Number((p as any).competencia_quinzena))
          .filter((n) => n === 1 || n === 2)
      )

      const faltando = due.filter((q) => !pagos.has(q))
      if (faltando.length > 0) {
        const pendencias = faltando.map((q) => {
          const valor = valorBase
          if (valor && valor > 0) totalPendente += valor
          else totalPendenteSemValor += 1
          return {
            competencia: { ano: competenciaAno, mes: competenciaMes, quinzena: q },
            valor: valor && valor > 0 ? valor : null,
            label: `${q}ª quinzena (${referencia})`,
          }
        })
        pendentes.push({
          funcionario_id: f.id,
          nome: f.nome_original,
          tipo,
          pendencias,
        })
      }
    }
  }

  return { pendentes, totalPendente, totalPendenteSemValor }
}

export async function calcularTotalPagoFuncionariosPorCompetencia(
  ctx: SessionContext,
  competenciaAno: number,
  competenciaMes: number
): Promise<{ totalPago: number; pagamentos: PagamentoFuncionario[] }> {
  if (ctx.mode !== 'empresa' || !ctx.empresa_id) {
    return { totalPago: 0, pagamentos: [] }
  }
  const pagamentos = await getPagamentosFuncionariosByCompetencia(ctx.tenant_id, ctx.empresa_id, competenciaAno, competenciaMes)
  const totalPago = pagamentos.reduce((sum, p) => sum + Number(p.valor || 0), 0)
  return { totalPago, pagamentos }
}

export async function listarFuncionariosPagosPorCompetencia(
  ctx: SessionContext,
  competenciaAno: number,
  competenciaMes: number
): Promise<{ pagos: Array<{ funcionario_id: string; nome: string; total: number; pagamentos: PagamentoFuncionario[] }>; totalPago: number }> {
  if (ctx.mode !== 'empresa' || !ctx.empresa_id) {
    return { pagos: [], totalPago: 0 }
  }
  const funcionarios = await getFuncionariosByEmpresa(ctx.tenant_id, ctx.empresa_id, true, 1000)
  const byId = new Map(funcionarios.map((f) => [f.id, f.nome_original]))
  const pagamentos = await getPagamentosFuncionariosByCompetencia(ctx.tenant_id, ctx.empresa_id, competenciaAno, competenciaMes)

  const grouped = new Map<string, PagamentoFuncionario[]>()
  for (const p of pagamentos) {
    const list = grouped.get(p.funcionario_id) || []
    list.push(p)
    grouped.set(p.funcionario_id, list)
  }

  const pagos = Array.from(grouped.entries())
    .map(([funcionario_id, list]) => ({
      funcionario_id,
      nome: byId.get(funcionario_id) || 'Funcionário',
      total: list.reduce((sum, p) => sum + Number(p.valor || 0), 0),
      pagamentos: list,
    }))
    .sort((a, b) => b.total - a.total)

  const totalPago = pagos.reduce((sum, f) => sum + f.total, 0)
  return { pagos, totalPago }
}

