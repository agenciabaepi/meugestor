/**
 * Gerenciador de Estado Semântico
 * Implementa herança de contexto baseada em estado, não em regras
 * 
 * Princípio: GPT conversa. Sistema valida. Sistema executa.
 */

export interface SemanticState {
  intent: 'register_expense' | 'register_revenue' | 'create_appointment' | 'query' | 'report' | 'chat'
  domain?: 'financeiro' | 'agenda' | 'geral'
  periodo?: 'hoje' | 'ontem' | 'amanhã' | 'semana' | 'mês' | 'ano'
  categoria?: string
  subcategoria?: string
  queryType?: 'gasto' | 'compromissos' | 'categoria' | 'agenda'
  amount?: number
  title?: string
  scheduled_at?: string
  description?: string
  confidence: number
  needsClarification?: boolean
  clarificationMessage?: string
}

/**
 * Armazena o último estado válido para herança de contexto
 */
let lastValidState: SemanticState | null = null

/**
 * Salva o último estado válido (apenas se confidence >= 0.7)
 */
export function saveLastValidState(state: SemanticState): void {
  if (state.confidence >= 0.7 && state.intent !== 'chat') {
    lastValidState = { ...state }
    console.log('semantic-state - Estado válido salvo:', {
      intent: state.intent,
      domain: state.domain,
      periodo: state.periodo,
      categoria: state.categoria
    })
  }
}

/**
 * Herda contexto do último estado válido para campos ausentes
 * Aplica regras de herança:
 * - Se usuário mencionar nova categoria → descartar a anterior
 * - Se não mencionar período → herdar o último
 * - Se não houver contexto → manter campos vazios
 */
export function inheritContext(newState: SemanticState): SemanticState {
  if (!lastValidState) {
    console.log('semantic-state - Nenhum contexto anterior disponível')
    return newState
  }

  // Se a intenção mudou completamente, não herda
  if (newState.intent !== lastValidState.intent && 
      newState.intent !== 'query' && 
      lastValidState.intent !== 'query') {
    console.log('semantic-state - Intenção mudou, não herdando contexto')
    return newState
  }

  const inherited: SemanticState = { ...newState }

  // Herda domínio se não foi especificado
  if (!inherited.domain && lastValidState.domain) {
    inherited.domain = lastValidState.domain
    console.log('semantic-state - Herdou domínio:', inherited.domain)
  }

  // REGRA CRÍTICA: Herda período se não foi especificado (exceto para registros)
  // Default só é usado se NÃO existir contexto anterior
  // Mudança de categoria NÃO pode resetar período
  if (!inherited.periodo && 
      lastValidState.periodo && 
      (inherited.intent === 'query' || inherited.intent === 'report')) {
    inherited.periodo = lastValidState.periodo
    console.log('semantic-state - Herdou período do contexto:', inherited.periodo)
  }

  // Herda queryType se não foi especificado
  if (!inherited.queryType && lastValidState.queryType && inherited.intent === 'query') {
    inherited.queryType = lastValidState.queryType
    console.log('semantic-state - Herdou queryType:', inherited.queryType)
  }

  // REGRA CRÍTICA: Mudança de categoria NÃO pode resetar período
  // Se usuário mencionou nova categoria, mantém o período do contexto anterior
  if (inherited.categoria && inherited.categoria !== lastValidState.categoria) {
    // Nova categoria mencionada - descarta categoria anterior
    // MAS mantém período se não foi mencionado novo período
    if (!inherited.periodo && lastValidState.periodo) {
      inherited.periodo = lastValidState.periodo
      console.log('semantic-state - Nova categoria detectada, mantendo período do contexto:', inherited.periodo)
    }
  } else if (!inherited.categoria && lastValidState.categoria && inherited.intent === 'query') {
    // Não mencionou categoria - herda do contexto
    inherited.categoria = lastValidState.categoria
    console.log('semantic-state - Herdou categoria:', inherited.categoria)
    
    // Herda subcategoria se categoria foi herdada
    if (!inherited.subcategoria && lastValidState.subcategoria) {
      inherited.subcategoria = lastValidState.subcategoria
      console.log('semantic-state - Herdou subcategoria:', inherited.subcategoria)
    }
  }
  
  return inherited
}

/**
 * Limpa o estado salvo (útil para resetar contexto)
 */
export function clearState(): void {
  lastValidState = null
  console.log('semantic-state - Estado limpo')
}

/**
 * Retorna o último estado válido (para debug)
 */
export function getLastValidState(): SemanticState | null {
  return lastValidState ? { ...lastValidState } : null
}
