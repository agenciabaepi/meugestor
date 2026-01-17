/**
 * Mensagens de onboarding/boas-vindas no WhatsApp
 * Mantém idempotência via colunas whatsapp_welcome_sent_*
 */

import { supabaseAdmin } from '@/lib/db/client'
import { sendTextMessage } from '@/lib/modules/whatsapp'

type WelcomeResult = { sent: boolean; reason?: 'already_sent' | 'user_not_found' | 'send_failed' | 'not_configured' }

function normalizeWhatsAppNumber(value: string): string {
  return value.replace(/\D/g, '')
}

export async function sendWelcomeMessageIfNeeded(
  userId: string,
  whatsappNumber: string
): Promise<WelcomeResult> {
  if (!supabaseAdmin) return { sent: false, reason: 'not_configured' }

  const normalized = normalizeWhatsAppNumber(whatsappNumber)

  // Tenta localizar o usuário (por id ou, como fallback, por whatsapp_number)
  let user:
    | {
        id: string
        name: string | null
        whatsapp_number: string
        whatsapp_welcome_sent_at: string | null
        whatsapp_welcome_sent_number: string | null
      }
    | null = null

  {
    const byId = await supabaseAdmin
      .from('users')
      .select('id, name, whatsapp_number, whatsapp_welcome_sent_at, whatsapp_welcome_sent_number')
      .eq('id', userId)
      .single()
    if (byId.data && !byId.error) user = byId.data as any
  }

  if (!user) {
    const byNumber = await supabaseAdmin
      .from('users')
      .select('id, name, whatsapp_number, whatsapp_welcome_sent_at, whatsapp_welcome_sent_number')
      .eq('whatsapp_number', normalized)
      .single()
    if (byNumber.data && !byNumber.error) user = byNumber.data as any
  }

  if (!user) return { sent: false, reason: 'user_not_found' }

  const alreadySentForThisNumber =
    !!user.whatsapp_welcome_sent_at && user.whatsapp_welcome_sent_number === normalized

  if (alreadySentForThisNumber) return { sent: false, reason: 'already_sent' }

  const firstName = (user.name || '').trim().split(/\s+/)[0]
  const greeting = firstName ? `Olá, ${firstName}!` : 'Olá!'

  const message =
    `👋 *${greeting}*\n\n` +
    `✅ Seu número foi cadastrado no *ORGANIZAPAY*.\n` +
    `A partir de agora você pode falar comigo por aqui.\n\n` +
    `Exemplos:\n` +
    `- "Gastei 32,90 no mercado"\n` +
    `- "Tenho dentista amanhã às 15h"\n` +
    `- "Relatório deste mês"\n\n` +
    `Se quiser, envie *ajuda* para ver os comandos.`

  const ok = await sendTextMessage(normalized, message)
  if (!ok) return { sent: false, reason: 'send_failed' }

  await supabaseAdmin
    .from('users')
    .update({
      whatsapp_welcome_sent_at: new Date().toISOString(),
      whatsapp_welcome_sent_number: normalized,
    })
    .eq('id', user.id)

  return { sent: true }
}

