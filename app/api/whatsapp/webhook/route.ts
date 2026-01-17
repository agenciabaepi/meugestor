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
import { processMessage } from '@/lib/ai/conversation'
import { processAction } from '@/lib/ai/actions'
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

    const sessionCtx = supabaseAdmin ? await getSessionContextFromUserId(supabaseAdmin as any, userId) : null
    const isEmpresaMode = sessionCtx?.mode === 'empresa'

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      'https://seu-dominio.com'

      // Salva a mensagem do usuário na conversa
      if (message.type === 'text' && message.text?.body) {
        const userMessage = message.text.body.toLowerCase().trim()
        
        // Verifica se é uma saudação inicial (oi, olá, etc)
        const greetings = ['oi', 'olá', 'ola', 'eae', 'e aí', 'opa', 'hey', 'hi', 'hello']
        if (greetings.includes(userMessage)) {
          const presentation = isEmpresaMode
            ? `👋 Olá!\n\n` +
              `Você está no *modo empresa* do *ORGANIZAPAY*.\n\n` +
              `📌 No modo empresa, o WhatsApp ainda está em fase de liberação para garantir isolamento total dos dados.\n\n` +
              `✅ Por enquanto, use o painel web em ${appUrl}/dashboard para operar no contexto da empresa.\n\n` +
              `Se quiser, me diga qual lista/ação você precisa que eu já te direciono.`
            : `👋 Olá! Tudo bem?\n\n` +
              `Eu sou o assistente do *ORGANIZAPAY* e estou aqui para te ajudar! 😊\n\n` +
              `📋 *O que eu posso fazer por você:*\n` +
              `• 💰 Registrar seus gastos e despesas\n` +
              `• 📅 Criar e gerenciar seus compromissos\n` +
              `• 📊 Consultar informações financeiras\n` +
              `• 📈 Gerar relatórios e estatísticas\n` +
              `• 🖼️ Processar comprovantes de imagem\n` +
              `• 🎤 Entender seus áudios\n\n` +
              `*Exemplos de como usar:*\n` +
              `• "Gastei 50 reais de gasolina"\n` +
              `• "Tenho reunião amanhã às 10h"\n` +
              `• "Quanto gastei este mês?"\n\n` +
              `Pode me enviar uma mensagem e eu te ajudo! 😉`
          
          await sendTextMessage(from, presentation)
          await createConversation(tenantId, message.text.body, 'user', userId)
          await createConversation(tenantId, presentation, 'assistant', userId)
          
          console.log(`Apresentação enviada para ${from}`)
          return
        }
      
      // Verifica se é confirmação de registro de comprovante
      if (userMessage === 'sim' || userMessage === 's' || userMessage === 'confirmar') {
        // Busca última conversa com dados extraídos
        const recentMessages = await getRecentConversations(tenantId, 10, userId)
        const lastImageData = recentMessages.find(m => 
          m.role === 'assistant' && m.message.includes('[Imagem processada]')
        )
        
        if (lastImageData) {
          try {
            const dataMatch = lastImageData.message.match(/\{.*\}/)
            if (dataMatch) {
              const extractedData = JSON.parse(dataMatch[0])
              
              // Busca a URL da imagem se foi salva
              // A URL pode estar na mensagem ou precisamos buscar do storage
              let imageUrl: string | null = null
              if (extractedData.imageUrl) {
                imageUrl = extractedData.imageUrl
              }
              
              // Registra o gasto
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
              
              await createConversation(tenantId, userMessage, 'user', userId)
              await createConversation(tenantId, 'Gasto registrado com sucesso', 'assistant', userId)
              
              console.log(`Gasto registrado via confirmação de imagem de ${from}`)
              return
            }
          } catch (error) {
            console.error('Erro ao processar confirmação:', error)
          }
        }
      }
      
        if (isEmpresaMode) {
          // Segurança: enquanto o bot não estiver 100% context-aware para listas/ações,
          // bloqueia uso geral em modo empresa para não misturar dados pessoais e empresariais.
          await sendTextMessage(
            from,
            `🏢 *Modo Empresa*\n\n` +
              `Seu usuário está em *modo empresa*. Para garantir isolamento total de dados, o bot do WhatsApp ainda não executa ações nesse modo.\n\n` +
              `Use o painel web em /dashboard para operar no contexto da empresa.`
          )
          return
        }

        // Salva mensagem do usuário
        await createConversation(tenantId, message.text.body, 'user', userId)
        
        // Processa ação (registro de gastos, compromissos, etc)
        let actionResult
        try {
          console.log('=== WEBHOOK PROCESSAMENTO ===')
          console.log('Webhook - Mensagem recebida:', message.text.body)
          console.log('Webhook - TenantId:', tenantId)
          console.log('Webhook - From:', from)
          
          actionResult = await processAction(message.text.body, tenantId, userId)
          
          console.log('Webhook - Resultado da ação:', {
            success: actionResult.success,
            message: actionResult.message?.substring(0, 100),
            hasData: !!actionResult.data
          })
          console.log('Webhook - Resultado completo:', JSON.stringify(actionResult, null, 2))
        } catch (error) {
          console.error('=== ERRO NO WEBHOOK ===')
          console.error('Webhook - Erro ao executar processAction:', error)
          console.error('Webhook - Tipo do erro:', error?.constructor?.name)
          console.error('Webhook - Mensagem do erro:', error instanceof Error ? error.message : String(error))
          console.error('Webhook - Stack trace:', error instanceof Error ? error.stack : 'N/A')
          console.error('Webhook - Erro completo:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2))
          
          // Tenta usar fallback conversacional antes de enviar erro genérico
          try {
            console.log('Webhook - Tentando fallback conversacional após erro...')
            const recentMessages = await getRecentConversations(tenantId, 5, userId)
            const aiResponse = await processMessage(message.text.body, {
              tenantId: tenantId,
              userId: userId,
              recentMessages,
            })
            
            await sendTextMessage(from, aiResponse)
            await createConversation(tenantId, aiResponse, 'assistant', userId)
            return
          } catch (aiError) {
            console.error('Webhook - Erro também no fallback conversacional:', aiError)
            // Se o fallback também falhar, envia mensagem de erro
            const errorMessage = error instanceof Error 
              ? `Erro: ${error.message}` 
              : 'Erro desconhecido ao processar'
            
            await sendTextMessage(
              from, 
              `Desculpe, ocorreu um erro ao processar sua mensagem.\n\n${errorMessage}\n\nTente novamente em alguns instantes.`
            )
            return
          }
        }
        
        // Se a ação foi executada com sucesso e tem mensagem, responde diretamente
        if (actionResult.success && actionResult.message && actionResult.message !== 'Mensagem recebida. Processando...') {
          await sendTextMessage(from, actionResult.message)
          await createConversation(tenantId, actionResult.message, 'assistant', userId)
        } else if (!actionResult.success) {
          // Se a ação falhou, tenta processar com IA para dar uma resposta mais útil
          // Isso ajuda com perguntas simples que não foram identificadas como ações
          try {
            const recentMessages = await getRecentConversations(tenantId, 5, userId)
            const aiResponse = await processMessage(message.text.body, {
              tenantId: tenantId,
              userId: userId,
              recentMessages,
            })
            
            await sendTextMessage(from, aiResponse)
            await createConversation(tenantId, aiResponse, 'assistant', userId)
          } catch (aiError) {
            // Se a IA também falhar, envia mensagem de erro
            console.error('Erro ao processar com IA:', aiError)
            await sendTextMessage(from, actionResult.message || 'Desculpe, não consegui entender. Pode reformular sua pergunta?')
            await createConversation(tenantId, actionResult.message || 'Erro ao processar', 'assistant', userId)
          }
        } else {
          // Processa com IA para gerar resposta conversacional
          const recentMessages = await getRecentConversations(tenantId, 5, userId)
          const aiResponse = await processMessage(message.text.body, {
            tenantId: tenantId,
            userId: userId,
            recentMessages,
          })
          
          // Envia resposta
          await sendTextMessage(from, aiResponse)
          await createConversation(tenantId, aiResponse, 'assistant', userId)
        }
        
        console.log(`Mensagem processada de ${from} para tenant ${tenantId}${userId ? ` (usuário: ${userId})` : ''}`)
    } else if (message.type === 'audio' && message.audio) {
      if (isEmpresaMode) {
        await sendTextMessage(
          from,
          `🏢 *Modo Empresa*\n\n` +
            `Áudios ainda não estão habilitados no bot para o modo empresa. Use o painel web em /dashboard.`
        )
        return
      }
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
        const actionResult = await processAction(audioResult.text, tenantId, userId)

        if (actionResult.success && actionResult.message && actionResult.message !== 'Mensagem recebida. Processando...') {
          await sendTextMessage(from, actionResult.message)
          await createConversation(tenantId, actionResult.message, 'assistant', userId)
        } else if (!actionResult.success) {
          // Se a ação falhou, tenta processar com IA
          try {
            const recentMessages = await getRecentConversations(tenantId, 5, userId)
            const aiResponse = await processMessage(audioResult.text, {
              tenantId: tenantId,
              userId: userId,
              recentMessages,
            })
            
            await sendTextMessage(from, aiResponse)
            await createConversation(tenantId, aiResponse, 'assistant', userId)
          } catch (aiError) {
            console.error('Erro ao processar áudio com IA:', aiError)
            await sendTextMessage(from, actionResult.message || 'Desculpe, não consegui entender o áudio. Pode repetir?')
            await createConversation(tenantId, actionResult.message || 'Erro ao processar áudio', 'assistant', userId)
          }
        } else {
          const recentMessages = await getRecentConversations(tenantId, 5, userId)
          const aiResponse = await processMessage(audioResult.text, {
            tenantId: tenantId,
            userId: userId,
            recentMessages,
          })
          await sendTextMessage(from, aiResponse)
          await createConversation(tenantId, aiResponse, 'assistant', userId)
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
