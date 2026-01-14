/**
 * Módulo de processamento de áudio com Whisper API
 */

import { openai } from './openai'
import { downloadMedia } from '../modules/whatsapp'
import { logUsage, calculateWhisperCost } from '../utils/cost-tracker'

/**
 * Processa um áudio do WhatsApp e retorna o texto transcrito
 */
export async function transcribeAudio(
  audioId: string,
  mimeType?: string
): Promise<string | null> {
  try {
    // Baixa o áudio do WhatsApp
    const audioBuffer = await downloadMedia(audioId)
    
    if (!audioBuffer) {
      console.error('Erro ao baixar áudio do WhatsApp')
      return null
    }

    // Valida tamanho do áudio (limite de 25MB para Whisper)
    const maxSize = 25 * 1024 * 1024 // 25MB
    if (audioBuffer.length > maxSize) {
      console.error('Áudio muito grande para processar')
      return null
    }

    // A OpenAI SDK para Node.js aceita File, Blob, Buffer ou Stream
    // Vamos criar um File object usando a API disponível
    const filename = `audio_${audioId}.${getAudioExtension(mimeType)}`
    
    // Tenta criar um File (disponível no Node.js 18+ ou via polyfill)
    // Se não disponível, cria um objeto compatível
    let audioFile: any
    
    try {
      // Tenta usar File API (Node.js 18+ tem suporte experimental)
      if (typeof File !== 'undefined') {
        // Converter Buffer para um novo ArrayBuffer (cópia) para garantir compatibilidade
        const newArrayBuffer = audioBuffer.buffer instanceof ArrayBuffer
          ? audioBuffer.buffer.slice(
              audioBuffer.byteOffset,
              audioBuffer.byteOffset + audioBuffer.byteLength
            )
          : new Uint8Array(audioBuffer).buffer
        audioFile = new File([newArrayBuffer as ArrayBuffer], filename, {
          type: mimeType || 'audio/mpeg',
        })
      } else {
        // Fallback: cria um objeto File-like
        audioFile = {
          name: filename,
          type: mimeType || 'audio/mpeg',
          stream: () => {
            const { Readable } = require('stream')
            return Readable.from([audioBuffer])
          },
          arrayBuffer: async () => audioBuffer.buffer.slice(
            audioBuffer.byteOffset,
            audioBuffer.byteOffset + audioBuffer.byteLength
          ),
        }
      }
    } catch (error) {
      // Último fallback: usa o buffer diretamente
      audioFile = audioBuffer
    }

    // Transcreve usando Whisper API
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'pt', // Português brasileiro
      response_format: 'text',
    })

    return transcription as unknown as string
  } catch (error) {
    console.error('Erro ao transcrever áudio:', error)
    return null
  }
}

/**
 * Processa um áudio recebido via WhatsApp e retorna o texto
 */
export async function processWhatsAppAudio(
  audioId: string,
  tenantId: string,
  mimeType?: string
): Promise<{
  success: boolean
  text: string | null
  error?: string
}> {
  try {
    const audioBuffer = await downloadMedia(audioId)
    if (!audioBuffer) {
      return {
        success: false,
        text: null,
        error: 'Erro ao baixar áudio',
      }
    }

    // Estima minutos de áudio (aproximado: 1MB ≈ 1 minuto)
    const estimatedMinutes = audioBuffer.length / (1024 * 1024)
    const cost = calculateWhisperCost(estimatedMinutes)

    const text = await transcribeAudio(audioId, mimeType)

    if (!text) {
      return {
        success: false,
        text: null,
        error: 'Não foi possível transcrever o áudio',
      }
    }

    // Registra uso e custo
    await logUsage({
      tenantId,
      service: 'whisper',
      cost,
      metadata: {
        audioId,
        estimatedMinutes,
        textLength: text.length,
      },
    })

    return {
      success: true,
      text: text.trim(),
    }
  } catch (error) {
    console.error('Erro ao processar áudio do WhatsApp:', error)
    return {
      success: false,
      text: null,
      error: error instanceof Error ? error.message : 'Erro desconhecido',
    }
  }
}

/**
 * Obtém a extensão do arquivo baseado no MIME type
 */
function getAudioExtension(mimeType?: string): string {
  if (!mimeType) return 'mpeg'

  const mimeToExt: Record<string, string> = {
    'audio/mpeg': 'mp3',
    'audio/mp4': 'm4a',
    'audio/ogg': 'ogg',
    'audio/wav': 'wav',
    'audio/webm': 'webm',
    'audio/aac': 'aac',
    'audio/amr': 'amr',
  }

  return mimeToExt[mimeType] || 'mpeg'
}

/**
 * Valida se o áudio pode ser processado
 */
export function validateAudio(audioBuffer: Buffer, mimeType?: string): {
  valid: boolean
  error?: string
} {
  // Valida tamanho (25MB é o limite do Whisper)
  const maxSize = 25 * 1024 * 1024
  if (audioBuffer.length > maxSize) {
    return {
      valid: false,
      error: 'Áudio muito grande. Tamanho máximo: 25MB',
    }
  }

  // Valida formato
  const supportedFormats = [
    'audio/mpeg',
    'audio/mp4',
    'audio/ogg',
    'audio/wav',
    'audio/webm',
    'audio/aac',
    'audio/amr',
  ]

  if (mimeType && !supportedFormats.includes(mimeType)) {
    return {
      valid: false,
      error: `Formato não suportado: ${mimeType}`,
    }
  }

  return { valid: true }
}

/**
 * Estima o custo de transcrição (aproximado)
 */
export function estimateTranscriptionCost(audioBuffer: Buffer): number {
  // Whisper custa $0.006 por minuto
  // Estimativa: 1MB ≈ 1 minuto de áudio (depende da qualidade)
  const estimatedMinutes = audioBuffer.length / (1024 * 1024) // MB
  return estimatedMinutes * 0.006
}
