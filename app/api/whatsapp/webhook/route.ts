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
import { createFinanceiroRecord } from '@/lib/services/financeiro'

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

    // Busca tenant e usuário vinculado ao número do WhatsApp
    // O número "from" é o número que enviou a mensagem
    const tenantInfo = await getTenantByWhatsApp(from)

    if (!tenantInfo) {
      console.error('Erro ao obter tenant/usuário')
      return
    }

    const tenantId = tenantInfo.tenant_id
    const userId = tenantInfo.user_id

      // Salva a mensagem do usuário na conversa
      if (message.type === 'text' && message.text?.body) {
        const userMessage = message.text.body.toLowerCase().trim()
        
        // Verifica se é uma saudação inicial (oi, olá, etc)
        const greetings = ['oi', 'olá', 'ola', 'eae', 'e aí', 'opa', 'hey', 'hi', 'hello']
        if (greetings.includes(userMessage)) {
          let presentation = `👋 Olá! Tudo bem?\n\n` +
            `Eu sou o assistente do *Meu Gestor* e estou aqui para te ajudar! 😊\n\n`
          
          // Se não está vinculado a um usuário, sugere vinculação
          if (!userId) {
            presentation += `⚠️ *Você ainda não vinculou seu WhatsApp à sua conta.*\n` +
              `Para ter acesso completo, faça login em: https://seu-dominio.com/login\n` +
              `E vincule seu número de WhatsApp no seu perfil.\n\n`
          }
          
          presentation += `📋 *O que eu posso fazer por você:*\n` +
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
          await createConversation(tenantId, message.text.body, 'user')
          await createConversation(tenantId, presentation, 'assistant')
          
          console.log(`Apresentação enviada para ${from}`)
          return
        }
      
      // Verifica se é confirmação de registro de comprovante
      if (userMessage === 'sim' || userMessage === 's' || userMessage === 'confirmar') {
        // Busca última conversa com dados extraídos
        const recentMessages = await getRecentConversations(tenantId, 10)
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
              const record = await createFinanceiroRecord({
                tenantId: tenantId,
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
              
              await createConversation(tenantId, userMessage, 'user')
              await createConversation(tenantId, 'Gasto registrado com sucesso', 'assistant')
              
              console.log(`Gasto registrado via confirmação de imagem de ${from}`)
              return
            }
          } catch (error) {
            console.error('Erro ao processar confirmação:', error)
          }
        }
      }
      
        // Salva mensagem do usuário
        await createConversation(tenantId, message.text.body, 'user')
        
        // Processa ação (registro de gastos, compromissos, etc)
        const actionResult = await processAction(message.text.body, tenantId)
        
        // Se a ação foi executada com sucesso e tem mensagem, responde diretamente
        if (actionResult.success && actionResult.message && actionResult.message !== 'Mensagem recebida. Processando...') {
          await sendTextMessage(from, actionResult.message)
          await createConversation(tenantId, actionResult.message, 'assistant')
        } else {
          // Processa com IA para gerar resposta conversacional
          const recentMessages = await getRecentConversations(tenantId, 5)
          const aiResponse = await processMessage(message.text.body, {
            tenantId: tenantId,
            recentMessages,
          })
          
          // Envia resposta
          await sendTextMessage(from, aiResponse)
          await createConversation(tenantId, aiResponse, 'assistant')
        }
        
        console.log(`Mensagem processada de ${from} para tenant ${tenantId}${userId ? ` (usuário: ${userId})` : ''}`)
    } else if (message.type === 'audio' && message.audio) {
      // Processa áudio com Whisper
      await sendTextMessage(from, '🎤 Processando seu áudio...')
      
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
          'user'
        )

        // Processa a mensagem transcrita normalmente
        const actionResult = await processAction(audioResult.text, tenantId)

        if (actionResult.success && actionResult.message && actionResult.message !== 'Mensagem recebida. Processando...') {
          await sendTextMessage(from, actionResult.message)
          await createConversation(tenantId, actionResult.message, 'assistant')
        } else {
          const recentMessages = await getRecentConversations(tenantId, 5)
          const aiResponse = await processMessage(audioResult.text, {
            tenantId: tenantId,
            recentMessages,
          })
          await sendTextMessage(from, aiResponse)
          await createConversation(tenantId, aiResponse, 'assistant')
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
            'assistant'
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
