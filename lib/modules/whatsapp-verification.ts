/**
 * Módulo de verificação de WhatsApp via OTP
 * Valida que o usuário realmente possui o número de WhatsApp informado
 */

import { supabaseAdmin } from '../db/client'
import { sendTextMessage } from './whatsapp'
import { sendWelcomeMessageIfNeeded } from './whatsapp-onboarding'

// Armazena códigos OTP temporários (em produção, use Redis ou banco de dados)
const otpStore = new Map<string, { code: string; expiresAt: number; userId: string }>()

/**
 * Gera um código OTP de 6 dígitos
 */
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

/**
 * Envia código OTP para o número de WhatsApp
 */
export async function sendOTPVerification(
  userId: string,
  whatsappNumber: string
): Promise<{ success: boolean; code?: string; error?: string }> {
  try {
    if (!supabaseAdmin) {
      return { success: false, error: 'Sistema não configurado' }
    }

    // Normaliza o número
    const normalized = whatsappNumber.replace(/\D/g, '')
    
    // Verifica se o número já está vinculado a outro usuário
    const { data: existing } = await supabaseAdmin
      .from('users')
      .select('id, whatsapp_number')
      .eq('whatsapp_number', normalized)
      .single()

    if (existing && existing.id !== userId) {
      return {
        success: false,
        error: 'Este número do WhatsApp já está vinculado a outra conta',
      }
    }

    // Gera código OTP
    const code = generateOTP()
    const expiresAt = Date.now() + 10 * 60 * 1000 // 10 minutos

    // Armazena código (em produção, use Redis)
    otpStore.set(`${userId}:${normalized}`, {
      code,
      expiresAt,
      userId,
    })

    // Envia código via WhatsApp
    const message = `🔐 *Código de Verificação - Meu Gestor*\n\n` +
      `Seu código de verificação é: *${code}*\n\n` +
      `Este código expira em 10 minutos.\n` +
      `Se você não solicitou este código, ignore esta mensagem.`

    await sendTextMessage(normalized, message)

    return { success: true, code }
  } catch (error) {
    console.error('Erro ao enviar OTP:', error)
    return { success: false, error: 'Erro ao enviar código de verificação' }
  }
}

/**
 * Verifica código OTP e vincula WhatsApp ao usuário
 */
export async function verifyOTPAndLink(
  userId: string,
  whatsappNumber: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!supabaseAdmin) {
      return { success: false, error: 'Sistema não configurado' }
    }

    const normalized = whatsappNumber.replace(/\D/g, '')
    const key = `${userId}:${normalized}`
    const stored = otpStore.get(key)

    // Verifica se o código existe e não expirou
    if (!stored) {
      return { success: false, error: 'Código não encontrado ou expirado' }
    }

    if (stored.expiresAt < Date.now()) {
      otpStore.delete(key)
      return { success: false, error: 'Código expirado. Solicite um novo código.' }
    }

    if (stored.code !== code) {
      return { success: false, error: 'Código inválido' }
    }

    if (stored.userId !== userId) {
      return { success: false, error: 'Código não corresponde ao usuário' }
    }

    // Verifica novamente se o número não está vinculado a outro usuário
    const { data: existing } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('whatsapp_number', normalized)
      .single()

    if (existing && existing.id !== userId) {
      otpStore.delete(key)
      return {
        success: false,
        error: 'Este número já está vinculado a outra conta',
      }
    }

    // Vincula o número ao usuário
    const { error } = await supabaseAdmin
      .from('users')
      .update({ whatsapp_number: normalized })
      .eq('id', userId)

    if (error) {
      console.error('Erro ao vincular WhatsApp:', error)
      return { success: false, error: 'Erro ao vincular número' }
    }

    // Remove código usado
    otpStore.delete(key)

    // Envia boas-vindas (idempotente) para o número recém-vinculado
    try {
      await sendWelcomeMessageIfNeeded(userId, normalized)
    } catch (err) {
      console.warn('Falha ao enviar boas-vindas após vinculação (não bloqueante):', err)
      // fallback mínimo: confirmação simples
      await sendTextMessage(
        normalized,
        `✅ *WhatsApp Vinculado com Sucesso!*\n\n` +
          `Seu número foi vinculado à sua conta do Meu Gestor.`
      )
    }

    return { success: true }
  } catch (error) {
    console.error('Erro ao verificar OTP:', error)
    return { success: false, error: 'Erro ao verificar código' }
  }
}

/**
 * Limpa códigos OTP expirados (chamar periodicamente)
 */
export function cleanupExpiredOTPs(): void {
  const now = Date.now()
  for (const [key, value] of otpStore.entries()) {
    if (value.expiresAt < now) {
      otpStore.delete(key)
    }
  }
}
