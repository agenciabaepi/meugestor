/**
 * Sistema de Controle de Custos
 */

import { supabaseAdmin } from '../db/client'

export interface CostEntry {
  tenantId: string
  service: 'openai' | 'whisper' | 'vision' | 'whatsapp'
  tokensUsed?: number
  cost: number
  metadata?: Record<string, any>
}

// Preços por serviço (em USD)
const PRICING = {
  openai: {
    'gpt-4o': {
      input: 0.0025 / 1000, // $0.0025 por 1K tokens de input
      output: 0.01 / 1000, // $0.01 por 1K tokens de output
    },
    'gpt-4-turbo': {
      input: 0.01 / 1000,
      output: 0.03 / 1000,
    },
    'gpt-3.5-turbo': {
      input: 0.0005 / 1000,
      output: 0.0015 / 1000,
    },
  },
  whisper: {
    perMinute: 0.006, // $0.006 por minuto
  },
  vision: {
    perImage: 0.01, // $0.01 por imagem
  },
  whatsapp: {
    perMessage: 0.005, // $0.005 por mensagem (estimado)
  },
}

/**
 * Calcula custo de uma chamada OpenAI
 */
export function calculateOpenAICost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const modelPricing = PRICING.openai[model as keyof typeof PRICING.openai]
  
  if (!modelPricing) {
    // Fallback para gpt-4o
    return (
      inputTokens * PRICING.openai['gpt-4o'].input +
      outputTokens * PRICING.openai['gpt-4o'].output
    )
  }

  return inputTokens * modelPricing.input + outputTokens * modelPricing.output
}

/**
 * Calcula custo de transcrição Whisper
 */
export function calculateWhisperCost(audioMinutes: number): number {
  return audioMinutes * PRICING.whisper.perMinute
}

/**
 * Calcula custo de processamento Vision
 */
export function calculateVisionCost(imageCount: number = 1): number {
  return imageCount * PRICING.vision.perImage
}

/**
 * Registra uso e custo no banco de dados
 */
export async function logUsage(entry: CostEntry): Promise<boolean> {
  try {
    if (!supabaseAdmin) {
      console.error('Supabase admin client não configurado')
      return false
    }

    const { error } = await supabaseAdmin.from('usage_logs').insert({
      tenant_id: entry.tenantId,
      service: entry.service,
      tokens_used: entry.tokensUsed || 0,
      cost: entry.cost,
      metadata: entry.metadata || {},
    })

    if (error) {
      console.error('Erro ao registrar uso:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Erro ao registrar uso:', error)
    return false
  }
}

/**
 * Obtém custo total de um tenant em um período
 */
export async function getTenantCost(
  tenantId: string,
  startDate?: string,
  endDate?: string
): Promise<number> {
  try {
    if (!supabaseAdmin) {
      return 0
    }

    let query = supabaseAdmin
      .from('usage_logs')
      .select('cost')
      .eq('tenant_id', tenantId)

    if (startDate) {
      query = query.gte('created_at', startDate)
    }

    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    const { data, error } = await query

    if (error) {
      console.error('Erro ao buscar custos:', error)
      return 0
    }

    return data?.reduce((sum, log) => sum + Number(log.cost), 0) || 0
  } catch (error) {
    console.error('Erro ao buscar custos:', error)
    return 0
  }
}

/**
 * Obtém uso de tokens de um tenant em um período
 */
export async function getTenantTokenUsage(
  tenantId: string,
  startDate?: string,
  endDate?: string
): Promise<number> {
  try {
    if (!supabaseAdmin) {
      return 0
    }

    let query = supabaseAdmin
      .from('usage_logs')
      .select('tokens_used')
      .eq('tenant_id', tenantId)
      .eq('service', 'openai')

    if (startDate) {
      query = query.gte('created_at', startDate)
    }

    if (endDate) {
      query = query.lte('created_at', endDate)
    }

    const { data, error } = await query

    if (error) {
      console.error('Erro ao buscar uso de tokens:', error)
      return 0
    }

    return data?.reduce((sum, log) => sum + (log.tokens_used || 0), 0) || 0
  } catch (error) {
    console.error('Erro ao buscar uso de tokens:', error)
    return 0
  }
}
