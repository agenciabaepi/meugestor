/**
 * Tipos relacionados à integração com OpenAI
 */

export interface Message {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ChatCompletionResponse {
  message: string
  tokensUsed?: number
  model?: string
}

export interface OpenAIError {
  message: string
  type: string
  code?: string
}
