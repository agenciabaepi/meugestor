/**
 * Sistema de Lembretes Automáticos
 * Envia lembretes de compromissos via WhatsApp
 */

import { getCompromissosRecords } from '../services/compromissos'
import { sendTextMessage } from '../modules/whatsapp'
import { supabaseAdmin } from '../db/client'
import { getTenantByWhatsAppNumber } from '../db/queries'

export interface LembreteConfig {
  antecedenciaMinutos: number // Antecedência em minutos (padrão: 60)
}

const DEFAULT_CONFIG: LembreteConfig = {
  antecedenciaMinutos: 60, // 1 hora antes
}

/**
 * Busca compromissos que precisam de lembrete
 */
export async function buscarCompromissosParaLembrete(
  tenantId: string,
  config: LembreteConfig = DEFAULT_CONFIG
) {
  const agora = new Date()
  const limiteInferior = new Date(agora.getTime() + config.antecedenciaMinutos * 60 * 1000)
  const limiteSuperior = new Date(limiteInferior.getTime() + 60 * 60 * 1000) // Próxima hora

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

  // Filtra apenas os que ainda não foram lembrados
  const compromissosParaLembrar = []

  for (const compromisso of compromissos) {
    // Verifica se já foi enviado lembrete (usando o campo reminder_sent se disponível)
    const jaLembrado = compromisso.reminder_sent === true

    if (!jaLembrado) {
      const dataCompromisso = new Date(compromisso.scheduled_at)
      const diferencaMinutos = (dataCompromisso.getTime() - agora.getTime()) / (1000 * 60)

      // Verifica se está dentro da janela de antecedência
      // Envia lembrete se o compromisso está entre (antecedência - 5min) e (antecedência + 5min)
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
  whatsappNumber: string
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

    // Formata mensagem de lembrete
    const dataCompromisso = new Date(compromisso.scheduled_at)
    const mensagem = formatarMensagemLembrete(compromisso, dataCompromisso)

    // Envia via WhatsApp
    // Nota: O número do WhatsApp deve ser o número do tenant (não o número do usuário)
    // Por enquanto, vamos usar o número do tenant como destinatário
    // Na implementação completa, isso pode ser configurado por tenant
    const sucesso = await sendTextMessage(whatsappNumber, mensagem)

    if (sucesso) {
      // Marca como lembrado
      await supabaseAdmin
        .from('compromissos')
        .update({ reminder_sent: true })
        .eq('id', compromissoId)

      console.log(`Lembrete enviado para compromisso ${compromissoId}`)
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
function formatarMensagemLembrete(compromisso: any, dataCompromisso: Date): string {
  const hora = dataCompromisso.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
  const data = dataCompromisso.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  let mensagem = `⏰ *Lembrete de Compromisso*\n\n`
  mensagem += `📅 ${compromisso.title}\n`
  mensagem += `🕐 ${hora}\n`
  mensagem += `📆 ${data}\n`

  if (compromisso.description) {
    mensagem += `\n📝 ${compromisso.description}\n`
  }

  mensagem += `\n_Seu compromisso está chegando! 🎯_`

  return mensagem
}

/**
 * Processa lembretes para todos os tenants
 */
export async function processarLembretes(): Promise<{
  sucesso: number
  erros: number
  total: number
}> {
  try {
    if (!supabaseAdmin) {
      console.error('Supabase admin client não configurado')
      return { sucesso: 0, erros: 0, total: 0 }
    }

    // Busca todos os tenants
    const { data: tenants, error } = await supabaseAdmin
      .from('tenants')
      .select('id, whatsapp_number')

    if (error || !tenants) {
      console.error('Erro ao buscar tenants:', error)
      return { sucesso: 0, erros: 0, total: 0 }
    }

    let sucesso = 0
    let erros = 0
    let total = 0

    // Processa lembretes para cada tenant
    for (const tenant of tenants) {
      const compromissos = await buscarCompromissosParaLembrete(tenant.id)

      for (const compromisso of compromissos) {
        total++
        const enviado = await enviarLembrete(
          compromisso.id,
          tenant.id,
          tenant.whatsapp_number
        )

        if (enviado) {
          sucesso++
        } else {
          erros++
        }
      }
    }

    console.log(
      `Lembretes processados: ${sucesso} sucesso, ${erros} erros, ${total} total`
    )

    return { sucesso, erros, total }
  } catch (error) {
    console.error('Erro ao processar lembretes:', error)
    return { sucesso: 0, erros: 0, total: 0 }
  }
}
