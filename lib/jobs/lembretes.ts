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
  console.log(`buscarCompromissosParaLembrete - Buscando compromissos para tenant ${tenantId}`, {
    agora: agora.toISOString(),
    limiteSuperior: limiteSuperior.toISOString(),
    tipoLembrete: config.tipo,
    antecedenciaMinutos: config.antecedenciaMinutos,
  })

  const compromissos = await getCompromissosRecords(
    tenantId,
    agora.toISOString(),
    limiteSuperior.toISOString()
  )

  console.log(`buscarCompromissosParaLembrete - Encontrados ${compromissos.length} compromissos no intervalo de 2 horas`)
  
  // Log detalhado de cada compromisso encontrado
  if (compromissos.length > 0) {
    console.log(`buscarCompromissosParaLembrete - Detalhes dos compromissos encontrados:`)
    compromissos.forEach((comp) => {
      const compDate = new Date(comp.scheduled_at)
      const diffMin = Math.round((compDate.getTime() - agora.getTime()) / (1000 * 60))
      console.log(`  - ${comp.title} (ID: ${comp.id}): ${compDate.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} (${diffMin}min no futuro)`)
      console.log(`    reminder_1h_sent: ${comp.reminder_1h_sent}, reminder_30min_sent: ${comp.reminder_30min_sent}, reminder_10min_sent: ${comp.reminder_10min_sent}`)
    })
  } else {
    console.log(`buscarCompromissosParaLembrete - ⚠️ Nenhum compromisso encontrado nas próximas 2 horas para o tenant ${tenantId}`)
    console.log(`buscarCompromissosParaLembrete - Verifique se há compromissos futuros no banco de dados`)
  }

  if (!supabaseAdmin) {
    console.error('Supabase admin client não configurado')
    return []
  }

  // Determina qual campo verificar baseado no tipo de lembrete
  const campoLembrete = `reminder_${config.tipo}_sent` as keyof typeof compromissos[0]
  
  console.log(`buscarCompromissosParaLembrete - Verificando campo: ${String(campoLembrete)}`)

  // Filtra apenas os que ainda não foram lembrados para este tipo específico
  const compromissosParaLembrar = []

  for (const compromisso of compromissos) {
    // Verifica se já foi enviado este tipo de lembrete
    const jaLembrado = compromisso[campoLembrete] === true

    if (!jaLembrado) {
      const dataCompromisso = new Date(compromisso.scheduled_at)
      const diferencaMinutos = (dataCompromisso.getTime() - agora.getTime()) / (1000 * 60)

      // Log detalhado para debug
      const dataCompromissoBrazil = dataCompromisso.toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
      const agoraBrazil = agora.toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })

      console.log(`buscarCompromissosParaLembrete - Verificando compromisso:`, {
        id: compromisso.id,
        title: compromisso.title,
        tipoLembrete: config.tipo,
        antecedenciaMinutos: config.antecedenciaMinutos,
        dataCompromisso: dataCompromissoBrazil,
        agora: agoraBrazil,
        diferencaMinutos: Math.round(diferencaMinutos * 100) / 100,
        jaLembrado,
        janelaMin: config.antecedenciaMinutos - 5,
        janelaMax: config.antecedenciaMinutos + 5,
        dentroJanela: diferencaMinutos >= config.antecedenciaMinutos - 5 && diferencaMinutos <= config.antecedenciaMinutos + 5
      })

      // Verifica se está dentro da janela de antecedência
      // Envia lembrete se o compromisso está entre (antecedência - 5min) e (antecedência + 5min)
      // Isso permite que o cron rode a cada 5 minutos e ainda capture os lembretes
      // Para lembretes de 10min, ajustamos a janela para ser mais permissiva
      const margem = config.antecedenciaMinutos <= 10 ? 3 : 5 // Margem menor para lembretes próximos
      if (
        diferencaMinutos >= config.antecedenciaMinutos - margem &&
        diferencaMinutos <= config.antecedenciaMinutos + margem
      ) {
        console.log(`buscarCompromissosParaLembrete - ✅ Compromisso ${compromisso.id} dentro da janela para lembrete ${config.tipo}`)
        compromissosParaLembrar.push(compromisso)
      } else {
        console.log(`buscarCompromissosParaLembrete - ❌ Compromisso ${compromisso.id} FORA da janela para lembrete ${config.tipo}`)
      }
    } else {
      console.log(`buscarCompromissosParaLembrete - ⏭️ Compromisso ${compromisso.id} já foi lembrado (${config.tipo})`)
    }
  }

  console.log(`buscarCompromissosParaLembrete - Total de compromissos para lembrete ${config.tipo}: ${compromissosParaLembrar.length}`)

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
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
  })
  const data = dataCompromisso.toLocaleDateString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
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
    console.log('\n=== PROCESSAR LEMBRETES INICIADO ===')
    console.log('Validando configuração do Supabase...')
    validateSupabaseConfig()
    
    if (!supabaseAdmin) {
      console.error('❌ Supabase admin client não configurado')
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

    console.log('✅ Supabase configurado. Buscando tenants...')
    // Busca todos os tenants
    const { data: tenants, error } = await supabaseAdmin
      .from('tenants')
      .select('id, whatsapp_number')

    if (error || !tenants) {
      console.error('❌ Erro ao buscar tenants:', error)
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

    console.log(`✅ Encontrados ${tenants.length} tenant(s)`)

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
      console.log(`\n=== Processando lembretes ${tipoLembrete} (${config.antecedenciaMinutos}min antes) ===`)
      console.log(`Horário atual: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}`)

      // Processa lembretes para cada tenant
      for (const tenant of tenants) {
        console.log(`\nProcessando tenant: ${tenant.id} (WhatsApp: ${tenant.whatsapp_number})`)
        
        // Verifica se o tenant tem WhatsApp configurado
        if (!tenant.whatsapp_number) {
          console.log(`⚠️ Tenant ${tenant.id} não tem WhatsApp configurado, pulando...`)
          continue
        }
        
        const compromissos = await buscarCompromissosParaLembrete(tenant.id, config)
        console.log(`Encontrados ${compromissos.length} compromissos para lembrete ${tipoLembrete} no tenant ${tenant.id}`)
        
        if (compromissos.length === 0) {
          console.log(`ℹ️ Nenhum compromisso encontrado para lembrete ${tipoLembrete} no tenant ${tenant.id}`)
        }

        for (const compromisso of compromissos) {
          totalGeral++
          console.log(`\nEnviando lembrete ${tipoLembrete} para compromisso: ${compromisso.title} (ID: ${compromisso.id})`)
          
          const enviado = await enviarLembrete(
            compromisso.id,
            tenant.id,
            tenant.whatsapp_number,
            config.tipo
          )

          if (enviado) {
            sucessoTotal++
            detalhes[tipoLembrete].sucesso++
            console.log(`✅ Lembrete ${tipoLembrete} enviado com sucesso`)
          } else {
            errosTotal++
            detalhes[tipoLembrete].erros++
            console.error(`❌ Erro ao enviar lembrete ${tipoLembrete}`)
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
