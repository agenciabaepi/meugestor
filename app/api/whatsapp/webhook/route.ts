import { NextRequest, NextResponse } from 'next/server'
import {
  verifyWebhookToken,
  verifyWebhookSignature,
  extractMessages,
  normalizePhoneNumber,
  sendTextMessage,
  type WhatsAppWebhookPayload,
} from '@/lib/modules/whatsapp'
import { getOrCreateTenantByWhatsApp as getTenantByWhatsApp } from '@/lib/modules/auth'
import { createConversation, getRecentConversations } from '@/lib/db/queries'
import { processAction } from '@/lib/ai/actions'
import { processMessage } from '@/lib/ai/conversation'
import { analyzeIntention } from '@/lib/ai/context-analyzer'
import { processWhatsAppAudio } from '@/lib/ai/whisper'
import { processWhatsAppImage } from '@/lib/ai/vision'
import { createFinanceiroRecordForContext } from '@/lib/services/financeiro'
import { checkRateLimit } from '@/lib/utils/whatsapp-rate-limit'
import { supabaseAdmin } from '@/lib/db/client'
import { getSessionContextFromUserId } from '@/lib/db/user-profile'

/**
 * GET - Verificação do webhook (chamado pelo WhatsApp na configuração inicial)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  // Verifica se é uma requisição de verificação do webhook
  if (mode === 'subscribe' && verifyWebhookToken(token)) {
    console.log('Webhook verificado com sucesso')
    return new NextResponse(challenge, { status: 200 })
  }

  // Se não for válido, retorna 403
  return new NextResponse('Forbidden', { status: 403 })
}

/**
 * POST - Recebe mensagens do WhatsApp
 */
export async function POST(request: NextRequest) {
  try {
    // Valida assinatura do webhook (se configurada)
    const signature = request.headers.get('x-hub-signature-256')
    const body = await request.text()

    if (signature && !verifyWebhookSignature(body, signature)) {
      console.error('Assinatura do webhook inválida')
      return new NextResponse('Unauthorized', { status: 401 })
    }

    const payload: WhatsAppWebhookPayload = JSON.parse(body)

    // Verifica se é um evento do WhatsApp
    if (payload.object !== 'whatsapp_business_account') {
      return new NextResponse('OK', { status: 200 })
    }

    // Extrai mensagens do payload
    const messages = extractMessages(payload)

    // Processa cada mensagem
    for (const message of messages) {
      await processWhatsAppMessage(message, payload)
    }

    // Responde 200 OK imediatamente (webhook deve responder rápido)
    return new NextResponse('OK', { status: 200 })
  } catch (error) {
    console.error('Erro ao processar webhook do WhatsApp:', error)
    // Ainda retorna 200 para evitar retentativas do WhatsApp
    return new NextResponse('OK', { status: 200 })
  }
}

/**
 * Processa uma mensagem recebida do WhatsApp
 */
async function processWhatsAppMessage(
  message: any,
  payload: WhatsAppWebhookPayload
) {
  try {
    const from = normalizePhoneNumber(message.from)
    const phoneNumberId = payload.entry[0]?.changes[0]?.value?.metadata?.phone_number_id

    if (!phoneNumberId) {
      console.error('Phone number ID não encontrado no payload')
      return
    }

    // SEGURANÇA: Verifica rate limiting
    const rateLimit = checkRateLimit(from)
    if (!rateLimit.allowed) {
      console.warn(`Rate limit excedido para ${from}: ${rateLimit.error}`)
      await sendTextMessage(
        from,
        `⚠️ *Limite de Mensagens Excedido*\n\n` +
        `${rateLimit.error}\n\n` +
        `Por favor, aguarde antes de enviar mais mensagens.`
      )
      return
    }

    // Busca tenant e usuário vinculado ao número do WhatsApp
    // O número "from" é o número que enviou a mensagem
    console.log('=== WHATSAPP WEBHOOK ===')
    console.log('Número recebido (from):', message.from)
    console.log('Número normalizado:', from)
    const tenantInfo = await getTenantByWhatsApp(from)
    console.log('Resultado da busca:', tenantInfo ? { tenant_id: tenantInfo.tenant_id, user_id: tenantInfo.user_id } : 'null')

    // SEGURANÇA: Bloqueia uso do bot se o número não estiver vinculado a um usuário autenticado
    if (!tenantInfo || !tenantInfo.user_id) {
      console.warn(`Tentativa de uso não autorizado do bot pelo número: ${from}`)
      
      const appUrl =
        process.env.NEXT_PUBLIC_APP_URL ||
        process.env.APP_URL ||
        process.env.NEXT_PUBLIC_SITE_URL ||
        'https://seu-dominio.com'

      // Envia mensagem informando que é necessário cadastro
      await sendTextMessage(
        from,
        `🔒 *Acesso Restrito*\n\n` +
        `Para usar o *ORGANIZAPAY*, você precisa:\n\n` +
        `1️⃣ Criar uma conta em: ${appUrl}/register\n` +
        `2️⃣ Fazer login em: ${appUrl}/login\n` +
        `3️⃣ Vincular seu número de WhatsApp no seu perfil\n\n` +
        `*Este número (${from}) não está vinculado a nenhuma conta.*\n` +
        `Por segurança, apenas usuários cadastrados podem usar o bot.`
      )
      return
    }

    const tenantId = tenantInfo.tenant_id
    const userId = tenantInfo.user_id

    console.log('=== WEBHOOK CONTEXTO ===')
    console.log('TenantId:', tenantId)
    console.log('UserId:', userId)
    
    const sessionCtx = supabaseAdmin ? await getSessionContextFromUserId(supabaseAdmin as any, userId) : null
    console.log('SessionContext:', sessionCtx ? { mode: sessionCtx.mode, empresa_id: sessionCtx.empresa_id, empresa_nome_fantasia: sessionCtx.empresa_nome_fantasia } : 'null')
    
    const isEmpresaMode = sessionCtx?.mode === 'empresa'
    console.log('IsEmpresaMode:', isEmpresaMode)

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      'https://seu-dominio.com'

      // NOVO FLUXO: CONVERSA ≠ DECISÃO ≠ EXECUÇÃO
      // 1. Analisa se é conversa casual ou ação operacional
      if (message.type === 'text' && message.text?.body) {
        const userMessage = message.text.body
        await createConversation(tenantId, userMessage, 'user', userId)
        
        // Analisa intenção (conversa vs ação)
        const intentionAnalysis = analyzeIntention(userMessage)
        
        console.log('Webhook - Análise de intenção:', intentionAnalysis)
        
        // Verifica se é confirmação de registro de comprovante (caso especial)
        const lowerMessage = userMessage.toLowerCase().trim()
        if (lowerMessage === 'sim' || lowerMessage === 's' || lowerMessage === 'confirmar') {
          const recentMessages = await getRecentConversations(tenantId, 10, userId)
          const lastImageData = recentMessages.find(m => 
            m.role === 'assistant' && m.message.includes('[Imagem processada]')
          )
          
          if (lastImageData) {
            try {
              const dataMatch = lastImageData.message.match(/\{.*\}/)
              if (dataMatch) {
                const extractedData = JSON.parse(dataMatch[0])
                let imageUrl: string | null = null
                if (extractedData.imageUrl) {
                  imageUrl = extractedData.imageUrl
                }
                
                const record = await createFinanceiroRecordForContext(sessionCtx || { tenant_id: tenantId, user_id: userId, mode: 'pessoal', empresa_id: null }, {
                  userId: userId,
                  amount: extractedData.amount || 0,
                  description: extractedData.description || extractedData.establishment || 'Gasto do comprovante',
                  category: extractedData.category || 'Outros',
                  date: extractedData.date || new Date().toISOString().split('T')[0],
                  receiptImageUrl: imageUrl,
                })
                
                await sendTextMessage(
                  from,
                  `✅ Gasto registrado com sucesso!\n\n💰 Valor: R$ ${extractedData.amount?.toFixed(2) || '0.00'}\n📝 Descrição: ${extractedData.description || extractedData.establishment || 'Gasto do comprovante'}\n🏷️ Categoria: ${extractedData.category || 'Outros'}`
                )
                await createConversation(tenantId, 'Gasto registrado com sucesso', 'assistant', userId)
                return
              }
            } catch (error) {
              console.error('Erro ao processar confirmação:', error)
            }
          }
        }
        
        // DECISÃO: Conversa casual → conversation.ts | Ação operacional → processAction
        if (!intentionAnalysis.hasOperationalIntent) {
          // CONVERSA: Usa camada humana (conversation.ts)
          console.log('Webhook - Tratando como conversa casual')
          try {
            const conversationResponse = await processMessage(userMessage, {
              tenantId,
              userId: userId || null,
              recentMessages: await getRecentConversations(tenantId, 5, userId),
            })
            
            await sendTextMessage(from, conversationResponse)
            await createConversation(tenantId, conversationResponse, 'assistant', userId)
            return
          } catch (error) {
            console.error('Erro ao processar conversa:', error)
            // Fallback para processAction se conversation falhar
          }
        }
        
        // AÇÃO: Usa orquestrador (processAction → conversational-assistant → actions)
        console.log('Webhook - Tratando como ação operacional')
        let actionResult
        try {
          console.log('=== WEBHOOK PROCESSAMENTO ===')
          console.log('Webhook - Mensagem recebida:', userMessage)
          console.log('Webhook - TenantId:', tenantId)
          console.log('Webhook - From:', from)
          
          actionResult = await processAction(userMessage, tenantId, userId, sessionCtx)
          
          console.log('Webhook - Resultado da ação:', {
            success: actionResult.success,
            message: actionResult.message?.substring(0, 100),
            hasData: !!actionResult.data
          })
        } catch (error) {
          console.error('=== ERRO NO WEBHOOK ===')
          console.error('Webhook - Erro ao executar processAction:', error)
          
          const errorMessage = error instanceof Error 
            ? `Erro: ${error.message}` 
            : 'Erro desconhecido ao processar'
          
          await sendTextMessage(
            from, 
            `Desculpe, ocorreu um erro ao processar sua mensagem.\n\n${errorMessage}\n\nTente novamente em alguns instantes.`
          )
          await createConversation(tenantId, `Erro: ${errorMessage}`, 'assistant', userId)
          return
        }
        
        // Responde resultado da ação
        if (actionResult.success && actionResult.message && actionResult.message !== 'Mensagem recebida. Processando...') {
          await sendTextMessage(from, actionResult.message)
          await createConversation(tenantId, actionResult.message, 'assistant', userId)
        } else if (!actionResult.success) {
          await sendTextMessage(from, actionResult.message || 'Desculpe, não consegui entender. Pode reformular sua pergunta?')
          await createConversation(tenantId, actionResult.message || 'Erro ao processar', 'assistant', userId)
        } else {
          await sendTextMessage(from, actionResult.message || 'Mensagem recebida. Como posso ajudar?')
          await createConversation(tenantId, actionResult.message || 'Mensagem recebida', 'assistant', userId)
        }
        
        console.log(`Mensagem processada de ${from} para tenant ${tenantId}${userId ? ` (usuário: ${userId})` : ''}`)
    } else if (message.type === 'audio' && message.audio) {
      // Processa áudio com Whisper
      const audioResult = await processWhatsAppAudio(
        message.audio.id,
        tenantId,
        message.audio.mime_type
      )

      if (audioResult.success && audioResult.text) {
        // Salva a transcrição como mensagem do usuário
        await createConversation(
          tenantId,
          `[Áudio transcrito]: ${audioResult.text}`,
          'user',
          userId
        )

        // Processa a mensagem transcrita normalmente
        const actionResult = await processAction(audioResult.text, tenantId, userId, sessionCtx)

        if (actionResult.success && actionResult.message && actionResult.message !== 'Mensagem recebida. Processando...') {
          await sendTextMessage(from, actionResult.message)
          await createConversation(tenantId, actionResult.message, 'assistant', userId)
        } else if (!actionResult.success) {
          // Se a ação falhou, retorna mensagem determinística do backend
          await sendTextMessage(from, actionResult.message || 'Desculpe, não consegui entender o áudio. Pode repetir?')
          await createConversation(tenantId, actionResult.message || 'Erro ao processar áudio', 'assistant', userId)
        } else {
          // Se não há mensagem (caso raro), envia resposta padrão determinística
          await sendTextMessage(from, actionResult.message || 'Mensagem recebida. Como posso ajudar?')
          await createConversation(tenantId, actionResult.message || 'Mensagem recebida', 'assistant', userId)
        }
      } else {
        await sendTextMessage(
          from,
          '❌ Não consegui processar seu áudio. Pode tentar enviar uma mensagem de texto?'
        )
      }
      
      console.log(`Áudio processado de ${from}`)
    } else if (message.type === 'image' && message.image) {
      // Processa imagem com Vision
      await sendTextMessage(from, '🖼️ Processando sua imagem...')
      
      const imageResult = await processWhatsAppImage(
        message.image.id,
        tenantId,
        message.image.mime_type
      )

      if (imageResult.success && imageResult.extractedData) {
        const data = imageResult.extractedData
        
        // Se extraiu dados com boa confiança, oferece registrar
        if (data.confidence > 0.5 && data.amount) {
          let confirmationMessage = '📄 Comprovante processado!\n\n'
          
          if (data.amount) {
            confirmationMessage += `💰 Valor: R$ ${data.amount.toFixed(2)}\n`
          }
          if (data.establishment) {
            confirmationMessage += `🏪 Estabelecimento: ${data.establishment}\n`
          }
          if (data.date) {
            confirmationMessage += `📅 Data: ${new Date(data.date).toLocaleDateString('pt-BR')}\n`
          }
          if (data.category) {
            confirmationMessage += `🏷️ Categoria: ${data.category}\n`
          }
          
          confirmationMessage += `\n✅ Deseja registrar este gasto? Responda "sim" para confirmar.`
          
          await sendTextMessage(from, confirmationMessage)
          
          // Salva a imagem e dados extraídos na conversa para referência
          const dataToSave = {
            ...data,
            imageUrl: imageResult.imageUrl,
          }
          await createConversation(
            tenantId,
            `[Imagem processada]: ${JSON.stringify(dataToSave)}`,
            'assistant',
            userId
          )
        } else {
          // Dados não confiáveis ou incompletos
          await sendTextMessage(
            from,
            '📄 Não consegui extrair dados suficientes do comprovante. Pode me informar o valor e descrição?'
          )
        }
      } else {
        await sendTextMessage(
          from,
          '❌ Não consegui processar sua imagem. Pode tentar enviar novamente ou descrever o comprovante?'
        )
      }
      
      console.log(`Imagem processada de ${from}`)
    }
  } catch (error) {
    console.error('Erro ao processar mensagem do WhatsApp:', error)
  }
}
