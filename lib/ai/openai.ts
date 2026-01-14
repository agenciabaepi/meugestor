import OpenAI from 'openai'

/**
 * Cliente OpenAI configurado
 * Usa o modelo mais avançado disponível: gpt-5.2
 * 
 * GPT-5.2 é o modelo de última geração, otimizado para tarefas agênticas e programação
 * Lançado em dezembro de 2025
 */
export const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : new OpenAI({
      apiKey: 'placeholder-key-for-build',
    })

export const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5.2'

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
 * - gpt-5.2: Modelo de última geração, otimizado para tarefas agênticas e programação (recomendado)
 * - gpt-5.2-pro: Versão Pro para tarefas que exigem maior precisão e raciocínio complexo
 * - gpt-5.2-chat-latest: Versão Instant, mais rápida para tarefas do dia a dia
 * - gpt-4o: Modelo anterior, multimodal (texto, visão, áudio)
 * - gpt-4-turbo: Versão turbo do GPT-4
 * - gpt-3.5-turbo: Mais rápido e barato, mas menos capaz
 */
