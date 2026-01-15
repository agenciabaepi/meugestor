/**
 * Sistema de Focus Lock (Trava de Foco)
 * 
 * Evita perguntas repetitivas quando o usuário menciona o mesmo compromisso
 * várias vezes seguidas. Após 2-3 repetições, trava o foco e executa.
 */

export interface FocusTarget {
  tenantId: string
  userId: string
  type: 'appointment' | 'expense' | 'revenue'
  targetId?: string
  title?: string
  location?: string
  date?: string
  mentions: number // Quantas vezes foi mencionado
  lastMention: Date
  confidence: number // 0.0-1.0
}

// Armazena foco atual por tenant
const focusLocks: Map<string, FocusTarget> = new Map()

function key(tenantId: string, userId: string, type: string): string {
  return `${tenantId}:${userId}:${type}`
}

/**
 * Registra uma menção de compromisso/gasto
 */
export function registerMention(
  tenantId: string,
  userId: string,
  type: 'appointment' | 'expense' | 'revenue',
  data: {
    targetId?: string
    title?: string
    location?: string
    date?: string
  }
): void {
  const k = key(tenantId, userId, type)
  const existing = focusLocks.get(k)
  
  if (existing) {
    // Verifica se é o mesmo compromisso (mesmo título/local/data)
    const isSameTarget = 
      (!data.title || existing.title?.toLowerCase() === data.title.toLowerCase()) &&
      (!data.location || existing.location?.toLowerCase() === data.location.toLowerCase()) &&
      (!data.date || existing.date === data.date) &&
      (!data.targetId || existing.targetId === data.targetId)
    
    if (isSameTarget) {
      // Incrementa menções e atualiza timestamp
      existing.mentions += 1
      existing.lastMention = new Date()
      existing.confidence = Math.min(0.95, existing.confidence + 0.2)
      
      // Atualiza dados se fornecidos
      if (data.targetId) existing.targetId = data.targetId
      if (data.title) existing.title = data.title
      if (data.location) existing.location = data.location
      if (data.date) existing.date = data.date
      
      console.log('focus-lock - Menção repetida do mesmo alvo:', {
        tenantId,
        type,
        mentions: existing.mentions,
        confidence: existing.confidence
      })
    } else {
      // Novo alvo, reseta
      focusLocks.set(k, {
        tenantId,
        userId,
        type,
        ...data,
        mentions: 1,
        lastMention: new Date(),
        confidence: 0.5
      })
      console.log('focus-lock - Novo alvo detectado, resetando foco')
    }
  } else {
    // Primeira menção
    focusLocks.set(k, {
      tenantId,
      userId,
      type,
      ...data,
      mentions: 1,
      lastMention: new Date(),
      confidence: 0.5
    })
    console.log('focus-lock - Primeira menção registrada')
  }
}

/**
 * Verifica se há foco travado (confiança alta após múltiplas menções)
 */
export function hasFocusLock(
  tenantId: string,
  userId: string,
  type: 'appointment' | 'expense' | 'revenue'
): FocusTarget | null {
  const k = key(tenantId, userId, type)
  const focus = focusLocks.get(k)
  
  if (!focus) return null
  
  // Verifica se o foco ainda é válido (última menção há menos de 5 minutos)
  const age = Date.now() - focus.lastMention.getTime()
  if (age > 5 * 60 * 1000) {
    // Foco expirado
    focusLocks.delete(k)
    return null
  }
  
  // Foco travado se: 2+ menções E confiança >= 0.7
  if (focus.mentions >= 2 && focus.confidence >= 0.7) {
    console.log('focus-lock - Foco travado detectado:', {
      tenantId,
      type,
      mentions: focus.mentions,
      confidence: focus.confidence,
      targetId: focus.targetId
    })
    return focus
  }
  
  return null
}

/**
 * Limpa o foco (após execução bem-sucedida ou cancelamento)
 */
export function clearFocus(tenantId: string, type: 'appointment' | 'expense' | 'revenue'): void {
  // Back-compat: mantém assinatura antiga, mas limpa todos os focos do tenant para segurança
  for (const k of focusLocks.keys()) {
    if (k.startsWith(`${tenantId}:`) && k.endsWith(`:${type}`)) {
      focusLocks.delete(k)
    }
  }
  console.log('focus-lock - Foco limpo (tenant):', { tenantId, type })
}

/**
 * Normaliza string para comparação (remove acentos, lowercase)
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

/**
 * Busca compromissos que correspondem aos critérios de foco
 */
export async function findMatchingAppointments(
  tenantId: string,
  userId: string,
  criteria: {
    title?: string
    location?: string
    date?: string
  }
): Promise<Array<{ id: string; title: string; scheduled_at: string; description?: string | null; score: number }>> {
  const { getCompromissosRecords } = await import('../services/compromissos')
  
  // Busca compromissos futuros
  const now = new Date().toISOString()
  const compromissos = await getCompromissosRecords(tenantId, now, undefined, userId)
  
  const matches: Array<{ id: string; title: string; scheduled_at: string; description?: string | null; score: number }> = []
  
  for (const comp of compromissos) {
    let score = 0
    
    // Verifica título (match exato vale mais)
    if (criteria.title) {
      const titleLower = normalizeString(comp.title)
      const criteriaTitleLower = normalizeString(criteria.title)
      
      if (titleLower === criteriaTitleLower) {
        score += 5 // Match exato
      } else if (titleLower.includes(criteriaTitleLower) || criteriaTitleLower.includes(titleLower)) {
        score += 2 // Match parcial
      }
    }
    
    // Verifica local (na descrição ou título)
    if (criteria.location) {
      const locationLower = normalizeString(criteria.location)
      const descLower = comp.description ? normalizeString(comp.description) : ''
      const titleLower = normalizeString(comp.title)
      
      if (descLower.includes(locationLower) || locationLower.includes(descLower)) {
        score += 3 // Match na descrição
      } else if (titleLower.includes(locationLower) || locationLower.includes(titleLower)) {
        score += 2 // Match no título
      }
    }
    
    // Verifica data (match exato vale muito)
    if (criteria.date) {
      const compDate = new Date(comp.scheduled_at).toISOString().split('T')[0]
      const criteriaDate = new Date(criteria.date).toISOString().split('T')[0]
      if (compDate === criteriaDate) {
        score += 5 // Match exato de data
      } else {
        // Verifica se está no mesmo dia (considerando timezone)
        const compDateObj = new Date(comp.scheduled_at)
        const criteriaDateObj = new Date(criteria.date)
        const diffDays = Math.abs((compDateObj.getTime() - criteriaDateObj.getTime()) / (1000 * 60 * 60 * 24))
        if (diffDays <= 1) {
          score += 2 // Mesmo dia ou próximo
        }
      }
    }
    
    // Se score >= 2, é um match
    if (score >= 2) {
      matches.push({
        id: comp.id,
        title: comp.title,
        scheduled_at: comp.scheduled_at,
        description: comp.description,
        score
      })
    }
  }
  
  // Ordena por score (maior primeiro) e depois por recência
  matches.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score
    }
    return new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime()
  })
  
  return matches
}
