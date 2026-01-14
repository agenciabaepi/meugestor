/**
 * Módulo de processamento de imagens com GPT-4o Vision
 */

import { openai } from './openai'
import { downloadMedia } from '../modules/whatsapp'
import { supabaseAdmin } from '../db/client'
import { logUsage, calculateVisionCost } from '../utils/cost-tracker'

export interface ExtractedReceiptData {
  amount?: number
  date?: string
  establishment?: string
  category?: string
  description?: string
  confidence: number
}

/**
 * Processa uma imagem do WhatsApp e extrai dados de comprovante
 */
export async function extractReceiptData(
  imageId: string,
  tenantId: string
): Promise<{
  success: boolean
  data?: ExtractedReceiptData
  error?: string
}> {
  try {
    // Baixa a imagem do WhatsApp
    const imageBuffer = await downloadMedia(imageId)
    
    if (!imageBuffer) {
      return {
        success: false,
        error: 'Erro ao baixar imagem do WhatsApp',
      }
    }

    // Valida tamanho da imagem (limite de 20MB para Vision)
    const maxSize = 20 * 1024 * 1024 // 20MB
    if (imageBuffer.length > maxSize) {
      return {
        success: false,
        error: 'Imagem muito grande. Tamanho máximo: 20MB',
      }
    }

    // Converte buffer para base64
    const base64Image = imageBuffer.toString('base64')

    // Usa GPT-4o Vision para extrair dados
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o', // GPT-4o tem suporte a visão
      messages: [
        {
          role: 'system',
          content: `Você é um assistente especializado em extrair dados de comprovantes e notas fiscais.

Analise a imagem e extraia as seguintes informações:
- Valor total (amount): número decimal
- Data da transação (date): formato YYYY-MM-DD
- Estabelecimento (establishment): nome do local
- Categoria sugerida (category): uma das categorias válidas (Alimentação, Transporte, Moradia, Saúde, Educação, Lazer, Outros)
- Descrição (description): breve descrição do que foi comprado

Responda APENAS com JSON no formato:
{
  "amount": número ou null,
  "date": "YYYY-MM-DD" ou null,
  "establishment": "string" ou null,
  "category": "categoria" ou null,
  "description": "string" ou null,
  "confidence": 0.0-1.0
}

Se não conseguir identificar alguma informação, use null. Seja conservador com a confiança.`,
        },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
            {
              type: 'text',
              text: 'Extraia os dados deste comprovante.',
            },
          ],
        },
      ],
      max_tokens: 300,
      response_format: { type: 'json_object' },
    })

    const response = completion.choices[0]?.message?.content
    if (!response) {
      return {
        success: false,
        error: 'Não foi possível processar a imagem',
      }
    }

    const extractedData: ExtractedReceiptData = JSON.parse(response)

    return {
      success: true,
      data: extractedData,
    }
  } catch (error) {
    console.error('Erro ao processar imagem:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }
  }
}

/**
 * Salva imagem no Supabase Storage
 */
export async function saveImageToStorage(
  imageBuffer: Buffer,
  tenantId: string,
  filename: string
): Promise<string | null> {
  try {
    if (!supabaseAdmin) {
      console.error('Supabase admin client não configurado')
      return null
    }

    // Cria estrutura de pastas: {tenant_id}/{year}/{month}/{filename}
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const path = `${tenantId}/${year}/${month}/${filename}`

    // Faz upload para o bucket 'receipts'
    const { data, error } = await supabaseAdmin.storage
      .from('receipts')
      .upload(path, imageBuffer, {
        contentType: 'image/jpeg',
        upsert: false,
      })

    if (error) {
      console.error('Erro ao fazer upload da imagem:', error)
      return null
    }

    // Obtém URL pública
    const { data: urlData } = supabaseAdmin.storage
      .from('receipts')
      .getPublicUrl(path)

    return urlData.publicUrl
  } catch (error) {
    console.error('Erro ao salvar imagem no storage:', error)
    return null
  }
}

/**
 * Processa uma imagem recebida via WhatsApp
 */
export async function processWhatsAppImage(
  imageId: string,
  tenantId: string,
  mimeType?: string
): Promise<{
  success: boolean
  extractedData?: ExtractedReceiptData
  imageUrl?: string
  error?: string
}> {
  try {
    // Baixa a imagem
    const imageBuffer = await downloadMedia(imageId)
    
    if (!imageBuffer) {
      return {
        success: false,
        error: 'Erro ao baixar imagem',
      }
    }

    // Salva no storage
    const filename = `receipt_${Date.now()}.jpg`
    const imageUrl = await saveImageToStorage(imageBuffer, tenantId, filename)

    // Extrai dados da imagem
    const extractionResult = await extractReceiptData(imageId, tenantId)

    if (!extractionResult.success) {
      return {
        success: false,
        error: extractionResult.error,
        imageUrl: imageUrl || undefined,
      }
    }

    // Registra uso e custo
    const cost = calculateVisionCost(1)
    await logUsage({
      tenantId,
      service: 'vision',
      cost,
      metadata: {
        imageId,
        confidence: extractionResult.data?.confidence || 0,
      },
    })

    return {
      success: true,
      extractedData: extractionResult.data,
      imageUrl: imageUrl || undefined,
    }
  } catch (error) {
    console.error('Erro ao processar imagem do WhatsApp:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }
  }
}

/**
 * Valida se a imagem pode ser processada
 */
export function validateImage(imageBuffer: Buffer, mimeType?: string): {
  valid: boolean
  error?: string
} {
  // Valida tamanho (20MB é o limite do Vision)
  const maxSize = 20 * 1024 * 1024
  if (imageBuffer.length > maxSize) {
    return {
      valid: false,
      error: 'Imagem muito grande. Tamanho máximo: 20MB',
    }
  }

  // Valida formato
  const supportedFormats = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'image/gif',
  ]

  if (mimeType && !supportedFormats.includes(mimeType.toLowerCase())) {
    return {
      valid: false,
      error: `Formato não suportado: ${mimeType}`,
    }
  }

  return { valid: true }
}

/**
 * Estima o custo de processamento de imagem
 */
export function estimateVisionCost(): number {
  // GPT-4o Vision custa $0.01 por imagem (aproximado)
  return 0.01
}
