/**
 * Sistema de Focus Lock (Trava de Foco)
 * 
 * Evita perguntas repetitivas quando o usuário menciona o mesmo compromisso
 * várias vezes seguidas. Após 2-3 repetições, trava o foco e executa.
 */

export interface FocusTarget {
  tenantId: string
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

/**
 * Registra uma menção de compromisso/gasto
 */
export function registerMention(
  tenantId: string,
  type: 'appointment' | 'expense' | 'revenue',
  data: {
    targetId?: string
    title?: string
    location?: string
    date?: string
  }
): void {
  const key = `${tenantId}:${type}`
  const existing = focusLocks.get(key)
  
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
      focusLocks.set(key, {
        tenantId,
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
    focusLocks.set(key, {
      tenantId,
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
  type: 'appointment' | 'expense' | 'revenue'
): FocusTarget | null {
  const key = `${tenantId}:${type}`
  const focus = focusLocks.get(key)
  
  if (!focus) return null
  
  // Verifica se o foco ainda é válido (última menção há menos de 5 minutos)
  const age = Date.now() - focus.lastMention.getTime()
  if (age > 5 * 60 * 1000) {
    // Foco expirado
    focusLocks.delete(key)
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
  const key = `${tenantId}:${type}`
  focusLocks.delete(key)
  console.log('focus-lock - Foco limpo:', { tenantId, type })
}

/**
 * Busca compromissos que correspondem aos critérios de foco
 */
export async function findMatchingAppointments(
  tenantId: string,
  criteria: {
    title?: string
    location?: string
    date?: string
  }
): Promise<Array<{ id: string; title: string; scheduled_at: string; description?: string | null }>> {
  const { getCompromissosRecords } = await import('../services/compromissos')
  
  // Busca compromissos futuros
  const now = new Date().toISOString()
  const compromissos = await getCompromissosRecords(tenantId, now)
  
  const matches: Array<{ id: string; title: string; scheduled_at: string; description?: string | null }> = []
  
  for (const comp of compromissos) {
    let score = 0
    
    // Verifica título
    if (criteria.title) {
      const titleLower = comp.title.toLowerCase()
      const criteriaTitleLower = criteria.title.toLowerCase()
      if (titleLower.includes(criteriaTitleLower) || criteriaTitleLower.includes(titleLower)) {
        score += 2
      }
    }
    
    // Verifica local (na descrição)
    if (criteria.location && comp.description) {
      const descLower = comp.description.toLowerCase()
      const locationLower = criteria.location.toLowerCase()
      if (descLower.includes(locationLower) || locationLower.includes(descLower)) {
        score += 2
      }
    }
    
    // Verifica data
    if (criteria.date) {
      const compDate = new Date(comp.scheduled_at).toISOString().split('T')[0]
      const criteriaDate = new Date(criteria.date).toISOString().split('T')[0]
      if (compDate === criteriaDate) {
        score += 3
      }
    }
    
    // Se score >= 2, é um match
    if (score >= 2) {
      matches.push({
        id: comp.id,
        title: comp.title,
        scheduled_at: comp.scheduled_at,
        description: comp.description
      })
    }
  }
  
  // Ordena por recência (mais recente primeiro)
  matches.sort((a, b) => 
    new Date(b.scheduled_at).getTime() - new Date(a.scheduled_at).getTime()
  )
  
  return matches
}
