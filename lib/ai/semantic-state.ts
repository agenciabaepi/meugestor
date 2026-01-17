/**
 * Gerenciador de Estado Semântico
 * Implementa herança de contexto baseada em estado, não em regras
 * 
 * Princípio: GPT conversa. Sistema valida. Sistema executa.
 */

export interface SemanticState {
  intent:
    | 'register_expense'
    | 'register_revenue'
    | 'create_appointment'
    | 'update_expense'
    | 'update_revenue'
    | 'update_appointment'
    | 'cancel_appointment'
    | 'create_list'
    | 'add_list_item'
    | 'remove_list_item'
    | 'mark_item_done'
    | 'show_list'
    | 'query'
    | 'report'
    | 'chat'
    | 'confirm'
    | 'cancel'
  // Campos opcionais podem ser null quando o GPT não conseguiu extrair
  // (isso permite distinguir "não mencionado" vs "ausente")
  domain?: 'financeiro' | 'agenda' | 'listas' | 'geral' | null
  periodo?: 'hoje' | 'ontem' | 'amanhã' | 'semana' | 'mês' | 'ano' | null
  categoria?: string | null
  subcategoria?: string | null
  queryType?: 'gasto' | 'compromissos' | 'categoria' | 'agenda' | 'listas' | null
  amount?: number | null
  title?: string | null
  scheduled_at?: string | null
  description?: string | null
  // LISTAS
  list_name?: string | null
  list_type?: string | null
  item_name?: string | null
  quantidade?: string | number | null
  unidade?: string | null
  confidence: number
  needsClarification?: boolean
  clarificationMessage?: string | null
  needsConfirmation?: boolean
  confirmationMessage?: string | null
  targetId?: string | null // ID do registro a ser atualizado (para updates)
  readyToSave?: boolean // Indica se todos os dados essenciais estão completos
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
 * Herda contexto do último estado válido APENAS para campos null/undefined
 * 
 * REGRAS OBRIGATÓRIAS:
 * - APENAS preenche campos null/undefined
 * - NUNCA sobrescreve valores existentes
 * - NUNCA aplica default global
 * - Se campo não existe no newState → herda do lastState
 */
export function inheritContext(newState: SemanticState): SemanticState {
  if (!lastValidState) {
    console.log('semantic-state - Nenhum contexto anterior disponível')
    return newState
  }

  // Se a intenção mudou completamente (exceto query), não herda
  if (newState.intent !== lastValidState.intent && 
      newState.intent !== 'query' && 
      lastValidState.intent !== 'query') {
    console.log('semantic-state - Intenção mudou completamente, não herdando contexto')
    return newState
  }

  const inherited: SemanticState = { ...newState }

  // REGRA: Apenas preenche se for null/undefined
  // NUNCA sobrescreve valores existentes
  
  if (!inherited.domain && lastValidState.domain) {
    inherited.domain = lastValidState.domain
    console.log('semantic-state - Herdou domínio:', inherited.domain)
  }

  // REGRA CRÍTICA: Período só é herdado se for null/undefined
  // Se GPT retornou null, herda do contexto
  // Se GPT retornou um valor, usa esse valor (não sobrescreve)
  if (inherited.periodo === null || inherited.periodo === undefined) {
    if (lastValidState.periodo && 
        (inherited.intent === 'query' || inherited.intent === 'report' || inherited.intent === 'cancel_appointment')) {
      inherited.periodo = lastValidState.periodo
      console.log('semantic-state - Herdou período (era null):', inherited.periodo)
    }
  } else {
    console.log('semantic-state - Período já definido pelo GPT, não herdando:', inherited.periodo)
  }

  if (!inherited.queryType && lastValidState.queryType && inherited.intent === 'query') {
    inherited.queryType = lastValidState.queryType
    console.log('semantic-state - Herdou queryType:', inherited.queryType)
  }

  // Categoria: apenas herda se for null/undefined
  // Mudança de categoria não reseta período (já garantido acima)
  if (!inherited.categoria && lastValidState.categoria && inherited.intent === 'query') {
    inherited.categoria = lastValidState.categoria
    console.log('semantic-state - Herdou categoria:', inherited.categoria)
    
    // Herda subcategoria apenas se categoria foi herdada
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
