/**
 * Sistema de Lembretes Automáticos
 * Envia lembretes de compromissos via WhatsApp
 * Suporta múltiplos lembretes: 1h, 30min e 10min antes
 */

import { getCompromissosRecords } from '../services/compromissos'
import { sendTextMessage } from '../modules/whatsapp'
import { supabaseAdmin, validateSupabaseConfig } from '../db/client'
import { getTenantByWhatsAppNumber } from '../db/queries'

export type LembreteType = '1h' | '30min' | '10min'

export interface LembreteConfig {
  antecedenciaMinutos: number // Antecedência em minutos
  tipo: LembreteType // Tipo do lembrete
}

// Configurações de lembretes
const LEMBRETES_CONFIG: Record<LembreteType, LembreteConfig> = {
  '1h': { antecedenciaMinutos: 60, tipo: '1h' },
  '30min': { antecedenciaMinutos: 30, tipo: '30min' },
  '10min': { antecedenciaMinutos: 10, tipo: '10min' },
}

/**
 * Busca compromissos que precisam de lembrete específico
 */
export async function buscarCompromissosParaLembrete(
  tenantId: string,
  config: LembreteConfig
) {
  const agora = new Date()
  // Busca compromissos nas próximas 2 horas para ter margem
  const limiteSuperior = new Date(agora.getTime() + 2 * 60 * 60 * 1000)

  // Busca compromissos no intervalo
  const compromissos = await getCompromissosRecords(
    tenantId,
    agora.toISOString(),
    limiteSuperior.toISOString()
  )

  if (!supabaseAdmin) {
    console.error('Supabase admin client não configurado')
    return []
  }

  // Determina qual campo verificar baseado no tipo de lembrete
  const campoLembrete = `reminder_${config.tipo}_sent` as keyof typeof compromissos[0]

  // Filtra apenas os que ainda não foram lembrados para este tipo específico
  const compromissosParaLembrar = []

  for (const compromisso of compromissos) {
    // Verifica se já foi enviado este tipo de lembrete
    const jaLembrado = compromisso[campoLembrete] === true

    if (!jaLembrado) {
      const dataCompromisso = new Date(compromisso.scheduled_at)
      const diferencaMinutos = (dataCompromisso.getTime() - agora.getTime()) / (1000 * 60)

      // Verifica se está dentro da janela de antecedência
      // Envia lembrete se o compromisso está entre (antecedência - 5min) e (antecedência + 5min)
      // Isso permite que o cron rode a cada 5 minutos e ainda capture os lembretes
      if (
        diferencaMinutos >= config.antecedenciaMinutos - 5 && // Margem de 5 minutos
        diferencaMinutos <= config.antecedenciaMinutos + 5
      ) {
        compromissosParaLembrar.push(compromisso)
      }
    }
  }

  return compromissosParaLembrar
}

/**
 * Envia lembrete de um compromisso
 */
export async function enviarLembrete(
  compromissoId: string,
  tenantId: string,
  whatsappNumber: string,
  tipoLembrete: LembreteType
): Promise<boolean> {
  try {
    if (!supabaseAdmin) {
      console.error('Supabase admin client não configurado')
      return false
    }

    // Busca dados do compromisso
    const { data: compromisso, error } = await supabaseAdmin
      .from('compromissos')
      .select('*')
      .eq('id', compromissoId)
      .single()

    if (error || !compromisso) {
      console.error('Erro ao buscar compromisso:', error)
      return false
    }

    // Formata mensagem de lembrete com o tempo restante
    const dataCompromisso = new Date(compromisso.scheduled_at)
    const mensagem = formatarMensagemLembrete(compromisso, dataCompromisso, tipoLembrete)

    // Envia via WhatsApp
    const sucesso = await sendTextMessage(whatsappNumber, mensagem)

    if (sucesso) {
      // Marca como lembrado para o tipo específico
      const campoLembrete = `reminder_${tipoLembrete}_sent`
      const updateData: Record<string, boolean> = {}
      updateData[campoLembrete] = true

      await supabaseAdmin
        .from('compromissos')
        .update(updateData)
        .eq('id', compromissoId)

      console.log(`Lembrete ${tipoLembrete} enviado para compromisso ${compromissoId}`)
      return true
    }

    return false
  } catch (error) {
    console.error('Erro ao enviar lembrete:', error)
    return false
  }
}

/**
 * Formata mensagem de lembrete
 */
function formatarMensagemLembrete(
  compromisso: any,
  dataCompromisso: Date,
  tipoLembrete: LembreteType
): string {
  const hora = dataCompromisso.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
  const data = dataCompromisso.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  // Calcula tempo restante
  const agora = new Date()
  const diferencaMinutos = Math.round(
    (dataCompromisso.getTime() - agora.getTime()) / (1000 * 60)
  )

  let tempoRestante = ''
  if (diferencaMinutos >= 60) {
    const horas = Math.floor(diferencaMinutos / 60)
    const minutos = diferencaMinutos % 60
    tempoRestante = minutos > 0 ? `${horas}h ${minutos}min` : `${horas}h`
  } else {
    tempoRestante = `${diferencaMinutos}min`
  }

  // Emoji e texto baseado no tipo de lembrete
  const emojisPorTipo: Record<LembreteType, string> = {
    '1h': '⏰',
    '30min': '🔔',
    '10min': '🚨',
  }

  const textosPorTipo: Record<LembreteType, string> = {
    '1h': 'Lembrete de Compromisso',
    '30min': 'Lembrete Urgente',
    '10min': 'Lembrete Imediato',
  }

  let mensagem = `${emojisPorTipo[tipoLembrete]} *${textosPorTipo[tipoLembrete]}*\n\n`
  mensagem += `📅 ${compromisso.title}\n`
  mensagem += `🕐 ${hora}\n`
  mensagem += `📆 ${data}\n`
  mensagem += `⏳ Faltam ${tempoRestante}\n`

  if (compromisso.description) {
    mensagem += `\n📝 ${compromisso.description}\n`
  }

  if (tipoLembrete === '10min') {
    mensagem += `\n_Seu compromisso está quase começando! 🎯_`
  } else if (tipoLembrete === '30min') {
    mensagem += `\n_Seu compromisso está chegando! Prepare-se! 🎯_`
  } else {
    mensagem += `\n_Seu compromisso está chegando! 🎯_`
  }

  return mensagem
}

/**
 * Processa lembretes para todos os tenants
 * Processa os 3 tipos de lembrete: 1h, 30min e 10min antes
 */
export async function processarLembretes(): Promise<{
  sucesso: number
  erros: number
  total: number
  detalhes: {
    '1h': { sucesso: number; erros: number }
    '30min': { sucesso: number; erros: number }
    '10min': { sucesso: number; erros: number }
  }
}> {
  try {
    validateSupabaseConfig()
    
    if (!supabaseAdmin) {
      console.error('Supabase admin client não configurado')
      return {
        sucesso: 0,
        erros: 0,
        total: 0,
        detalhes: {
          '1h': { sucesso: 0, erros: 0 },
          '30min': { sucesso: 0, erros: 0 },
          '10min': { sucesso: 0, erros: 0 },
        },
      }
    }

    // Busca todos os tenants
    const { data: tenants, error } = await supabaseAdmin
      .from('tenants')
      .select('id, whatsapp_number')

    if (error || !tenants) {
      console.error('Erro ao buscar tenants:', error)
      return {
        sucesso: 0,
        erros: 0,
        total: 0,
        detalhes: {
          '1h': { sucesso: 0, erros: 0 },
          '30min': { sucesso: 0, erros: 0 },
          '10min': { sucesso: 0, erros: 0 },
        },
      }
    }

    let sucessoTotal = 0
    let errosTotal = 0
    let totalGeral = 0
    const detalhes = {
      '1h': { sucesso: 0, erros: 0 },
      '30min': { sucesso: 0, erros: 0 },
      '10min': { sucesso: 0, erros: 0 },
    }

    // Processa cada tipo de lembrete
    for (const tipoLembrete of ['1h', '30min', '10min'] as LembreteType[]) {
      const config = LEMBRETES_CONFIG[tipoLembrete]
      console.log(`Processando lembretes ${tipoLembrete}...`)

      // Processa lembretes para cada tenant
      for (const tenant of tenants) {
        const compromissos = await buscarCompromissosParaLembrete(tenant.id, config)

        for (const compromisso of compromissos) {
          totalGeral++
          
          const enviado = await enviarLembrete(
            compromisso.id,
            tenant.id,
            tenant.whatsapp_number,
            config.tipo
          )

          if (enviado) {
            sucessoTotal++
            detalhes[tipoLembrete].sucesso++
          } else {
            errosTotal++
            detalhes[tipoLembrete].erros++
          }
        }
      }
    }

    console.log(
      `Lembretes processados: ${sucessoTotal} sucesso, ${errosTotal} erros, ${totalGeral} total`
    )
    console.log('Detalhes:', detalhes)

    return {
      sucesso: sucessoTotal,
      erros: errosTotal,
      total: totalGeral,
      detalhes,
    }
  } catch (error) {
    console.error('Erro ao processar lembretes:', error)
    return {
      sucesso: 0,
      erros: 0,
      total: 0,
      detalhes: {
        '1h': { sucesso: 0, erros: 0 },
        '30min': { sucesso: 0, erros: 0 },
        '10min': { sucesso: 0, erros: 0 },
      },
    }
  }
}
