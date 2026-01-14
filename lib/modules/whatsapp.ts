/**
 * Módulo de integração com WhatsApp Business API
 */

const WHATSAPP_API_URL = 'https://graph.facebook.com/v21.0'
const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID!
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN!
const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN!
const WEBHOOK_SECRET = process.env.WHATSAPP_WEBHOOK_SECRET!

export interface WhatsAppMessage {
  from: string
  message_id: string
  timestamp: string
  type: 'text' | 'audio' | 'image' | 'video' | 'document'
  text?: {
    body: string
  }
  audio?: {
    id: string
    mime_type: string
  }
  image?: {
    id: string
    mime_type: string
    caption?: string
  }
}

export interface WhatsAppWebhookPayload {
  object: string
  entry: Array<{
    id: string
    changes: Array<{
      value: {
        messaging_product: string
        metadata: {
          display_phone_number: string
          phone_number_id: string
        }
        contacts?: Array<{
          profile: {
            name: string
          }
          wa_id: string
        }>
        messages?: WhatsAppMessage[]
        statuses?: Array<{
          id: string
          status: string
          timestamp: string
          recipient_id: string
        }>
      }
      field: string
    }>
  }>
}

/**
 * Valida o token de verificação do webhook
 */
export function verifyWebhookToken(token: string | null): boolean {
  return token === VERIFY_TOKEN
}

/**
 * Valida a assinatura do webhook usando HMAC
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string
): boolean {
  if (!WEBHOOK_SECRET) {
    console.warn('WEBHOOK_SECRET não configurado, pulando validação')
    return true
  }

  const crypto = require('crypto')
  const expectedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payload)
    .digest('hex')

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )
}

/**
 * Envia uma mensagem de texto via WhatsApp
 */
export async function sendTextMessage(
  to: string,
  message: string
): Promise<boolean> {
  try {
    const response = await fetch(
      `${WHATSAPP_API_URL}/${PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: to.replace(/\D/g, ''), // Remove caracteres não numéricos
          type: 'text',
          text: {
            body: message,
          },
        }),
      }
    )

    if (!response.ok) {
      const error = await response.json()
      console.error('Erro ao enviar mensagem WhatsApp:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Erro ao enviar mensagem WhatsApp:', error)
    return false
  }
}

/**
 * Baixa uma mídia do WhatsApp
 */
export async function downloadMedia(mediaId: string): Promise<Buffer | null> {
  try {
    if (!ACCESS_TOKEN || !WHATSAPP_API_URL) {
      console.error('Credenciais do WhatsApp não configuradas')
      return null
    }

    // Primeiro, obtém a URL da mídia
    const urlResponse = await fetch(
      `${WHATSAPP_API_URL}/${mediaId}?access_token=${ACCESS_TOKEN}`
    )

    if (!urlResponse.ok) {
      const errorText = await urlResponse.text()
      console.error('Erro ao obter URL da mídia:', errorText)
      return null
    }

    const mediaData = await urlResponse.json()
    const url = mediaData.url

    if (!url) {
      console.error('URL da mídia não encontrada na resposta')
      return null
    }

    // Baixa a mídia
    const mediaResponse = await fetch(url, {
      headers: {
        Authorization: `Bearer ${ACCESS_TOKEN}`,
      },
    })

    if (!mediaResponse.ok) {
      const errorText = await mediaResponse.text()
      console.error('Erro ao baixar mídia:', errorText)
      return null
    }

    const arrayBuffer = await mediaResponse.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch (error) {
    console.error('Erro ao baixar mídia:', error)
    return null
  }
}

/**
 * Extrai mensagens do payload do webhook
 */
export function extractMessages(
  payload: WhatsAppWebhookPayload
): WhatsAppMessage[] {
  const messages: WhatsAppMessage[] = []

  for (const entry of payload.entry) {
    for (const change of entry.changes) {
      if (change.value.messages) {
        messages.push(...change.value.messages)
      }
    }
  }

  return messages
}

/**
 * Normaliza número de telefone (remove caracteres não numéricos)
 */
export function normalizePhoneNumber(phone: string): string {
  return phone.replace(/\D/g, '')
}
