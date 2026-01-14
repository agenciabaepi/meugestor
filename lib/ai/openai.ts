import OpenAI from 'openai'

/**
 * Cliente OpenAI configurado
 * Usa o modelo mais avançado disponível: gpt-4o
 * 
 * gpt-4o é multimodal (texto, visão, áudio), mais rápido e mais barato que gpt-4
 */
export const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : new OpenAI({
      apiKey: 'placeholder-key-for-build',
    })

export const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o'

/**
 * Valida se a API key do OpenAI está configurada
 */
export function validateOpenAIConfig() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      'Missing OpenAI API key. Please set OPENAI_API_KEY environment variable.'
    )
  }
}

/**
 * Modelos disponíveis:
 * - gpt-4o: Mais avançado, multimodal, rápido (recomendado)
 * - gpt-4-turbo: Versão turbo do GPT-4
 * - gpt-4: GPT-4 padrão
 * - gpt-3.5-turbo: Mais rápido e barato, mas menos capaz
 */
