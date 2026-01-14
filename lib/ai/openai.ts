import OpenAI from 'openai'

/**
 * Cliente OpenAI configurado
 * Usa o modelo mais avançado disponível: gpt-4o
 * 
 * gpt-4o é multimodal (texto, visão, áudio), mais rápido e mais barato que gpt-4
 */
export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o'

/**
 * Modelos disponíveis:
 * - gpt-4o: Mais avançado, multimodal, rápido (recomendado)
 * - gpt-4-turbo: Versão turbo do GPT-4
 * - gpt-4: GPT-4 padrão
 * - gpt-3.5-turbo: Mais rápido e barato, mas menos capaz
 */
