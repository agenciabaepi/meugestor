/**
 * Serviço de categorização inteligente de gastos
 * Mapeia termos e descrições para categorias e subcategorias
 */

export interface CategorizationResult {
  category: string
  subcategory: string | null
  tags: string[]
  confidence: number
}

// Mapeamento de termos para categorias e subcategorias
const CATEGORY_MAPPINGS: Record<string, {
  category: string
  subcategory: string
  tags: string[]
}> = {
  // Transporte - Combustível
  'gasolina': { category: 'Transporte', subcategory: 'Combustível', tags: ['gasolina', 'combustível', 'veículo'] },
  'combustível': { category: 'Transporte', subcategory: 'Combustível', tags: ['combustível', 'veículo'] },
  'combustivel': { category: 'Transporte', subcategory: 'Combustível', tags: ['combustível', 'veículo'] },
  'álcool': { category: 'Transporte', subcategory: 'Combustível', tags: ['álcool', 'combustível', 'veículo'] },
  'alcool': { category: 'Transporte', subcategory: 'Combustível', tags: ['álcool', 'combustível', 'veículo'] },
  'diesel': { category: 'Transporte', subcategory: 'Combustível', tags: ['diesel', 'combustível', 'veículo'] },
  'posto': { category: 'Transporte', subcategory: 'Combustível', tags: ['posto', 'combustível', 'veículo'] },
  'abasteci': { category: 'Transporte', subcategory: 'Combustível', tags: ['combustível', 'veículo'] },
  'abastecer': { category: 'Transporte', subcategory: 'Combustível', tags: ['combustível', 'veículo'] },
  
  // Transporte - Outros
  'uber': { category: 'Transporte', subcategory: 'Transporte por aplicativo', tags: ['uber', 'transporte', 'aplicativo'] },
  '99': { category: 'Transporte', subcategory: 'Transporte por aplicativo', tags: ['99', 'transporte', 'aplicativo'] },
  'taxi': { category: 'Transporte', subcategory: 'Transporte por aplicativo', tags: ['taxi', 'transporte'] },
  'estacionamento': { category: 'Transporte', subcategory: 'Estacionamento', tags: ['estacionamento', 'veículo'] },
  'pedágio': { category: 'Transporte', subcategory: 'Pedágio', tags: ['pedágio', 'estrada'] },
  'pedagio': { category: 'Transporte', subcategory: 'Pedágio', tags: ['pedágio', 'estrada'] },
  'ônibus': { category: 'Transporte', subcategory: 'Transporte público', tags: ['ônibus', 'transporte público'] },
  'onibus': { category: 'Transporte', subcategory: 'Transporte público', tags: ['ônibus', 'transporte público'] },
  'metrô': { category: 'Transporte', subcategory: 'Transporte público', tags: ['metrô', 'transporte público'] },
  'metro': { category: 'Transporte', subcategory: 'Transporte público', tags: ['metrô', 'transporte público'] },
  
  // Alimentação
  'restaurante': { category: 'Alimentação', subcategory: 'Restaurante', tags: ['restaurante', 'comida'] },
  'lanche': { category: 'Alimentação', subcategory: 'Lanche', tags: ['lanche', 'comida rápida'] },
  'mcdonalds': { category: 'Alimentação', subcategory: 'Lanche', tags: ['mcdonalds', 'fast food'] },
  'burger': { category: 'Alimentação', subcategory: 'Lanche', tags: ['hambúrguer', 'fast food'] },
  'pizza': { category: 'Alimentação', subcategory: 'Delivery', tags: ['pizza', 'delivery'] },
  'delivery': { category: 'Alimentação', subcategory: 'Delivery', tags: ['delivery', 'comida'] },
  'ifood': { category: 'Alimentação', subcategory: 'Delivery', tags: ['ifood', 'delivery'] },
  'supermercado': { category: 'Alimentação', subcategory: 'Supermercado', tags: ['supermercado', 'compras'] },
  'mercado': { category: 'Alimentação', subcategory: 'Supermercado', tags: ['mercado', 'compras'] },
  'padaria': { category: 'Alimentação', subcategory: 'Padaria', tags: ['padaria', 'comida'] },
  'café': { category: 'Alimentação', subcategory: 'Bebidas', tags: ['café', 'bebida'] },
  'cafe': { category: 'Alimentação', subcategory: 'Bebidas', tags: ['café', 'bebida'] },
  
  // Saúde
  'farmácia': { category: 'Saúde', subcategory: 'Farmácia', tags: ['farmácia', 'medicamento'] },
  'farmacia': { category: 'Saúde', subcategory: 'Farmácia', tags: ['farmácia', 'medicamento'] },
  'médico': { category: 'Saúde', subcategory: 'Consulta médica', tags: ['médico', 'consulta'] },
  'medico': { category: 'Saúde', subcategory: 'Consulta médica', tags: ['médico', 'consulta'] },
  'dentista': { category: 'Saúde', subcategory: 'Consulta médica', tags: ['dentista', 'consulta'] },
  'exame': { category: 'Saúde', subcategory: 'Exames', tags: ['exame', 'saúde'] },
  'plano de saúde': { category: 'Saúde', subcategory: 'Plano de saúde', tags: ['plano', 'saúde'] },
  
  // Moradia
  'aluguel': { category: 'Moradia', subcategory: 'Aluguel', tags: ['aluguel', 'moradia'] },
  'condomínio': { category: 'Moradia', subcategory: 'Condomínio', tags: ['condomínio', 'moradia'] },
  'condominio': { category: 'Moradia', subcategory: 'Condomínio', tags: ['condomínio', 'moradia'] },
  'luz': { category: 'Moradia', subcategory: 'Energia elétrica', tags: ['luz', 'energia', 'conta'] },
  'energia': { category: 'Moradia', subcategory: 'Energia elétrica', tags: ['energia', 'conta'] },
  'água': { category: 'Moradia', subcategory: 'Água', tags: ['água', 'conta'] },
  'agua': { category: 'Moradia', subcategory: 'Água', tags: ['água', 'conta'] },
  'internet': { category: 'Moradia', subcategory: 'Internet', tags: ['internet', 'conta'] },
  'telefone': { category: 'Moradia', subcategory: 'Telefone', tags: ['telefone', 'conta'] },
  
  // Educação
  'curso': { category: 'Educação', subcategory: 'Curso', tags: ['curso', 'educação'] },
  'faculdade': { category: 'Educação', subcategory: 'Faculdade', tags: ['faculdade', 'educação'] },
  'livro': { category: 'Educação', subcategory: 'Material', tags: ['livro', 'material'] },
  'material': { category: 'Educação', subcategory: 'Material', tags: ['material', 'educação'] },
  
  // Lazer
  'cinema': { category: 'Lazer', subcategory: 'Entretenimento', tags: ['cinema', 'lazer'] },
  'show': { category: 'Lazer', subcategory: 'Entretenimento', tags: ['show', 'lazer'] },
  'festival': { category: 'Lazer', subcategory: 'Entretenimento', tags: ['festival', 'lazer'] },
  'viagem': { category: 'Lazer', subcategory: 'Viagem', tags: ['viagem', 'lazer'] },
  'hotel': { category: 'Lazer', subcategory: 'Viagem', tags: ['hotel', 'viagem'] },
}

/**
 * Categoriza um gasto baseado na descrição
 */
export function categorizeExpense(description: string, amount?: number): CategorizationResult {
  const lowerDescription = description.toLowerCase().trim()
  
  // Procura por termos conhecidos
  for (const [term, mapping] of Object.entries(CATEGORY_MAPPINGS)) {
    if (lowerDescription.includes(term)) {
      return {
        category: mapping.category,
        subcategory: mapping.subcategory,
        tags: [...mapping.tags],
        confidence: 0.9,
      }
    }
  }
  
  // Se não encontrou, retorna categoria padrão
  return {
    category: 'Outros',
    subcategory: null,
    tags: [],
    confidence: 0.3,
  }
}

/**
 * Extrai tags adicionais da descrição
 */
export function extractTags(description: string, category: string, subcategory: string | null): string[] {
  const tags: string[] = []
  const lowerDescription = description.toLowerCase()
  
  // Adiciona tags baseadas em padrões
  if (lowerDescription.includes('posto') || lowerDescription.includes('shell') || lowerDescription.includes('ipiranga')) {
    tags.push('posto')
  }
  
  if (lowerDescription.includes('cartão') || lowerDescription.includes('cartao')) {
    tags.push('cartão')
  }
  
  if (lowerDescription.includes('dinheiro')) {
    tags.push('dinheiro')
  }
  
  if (lowerDescription.includes('pix')) {
    tags.push('pix')
  }
  
  // Adiciona tags da categorização
  if (subcategory) {
    tags.push(subcategory.toLowerCase())
  }
  
  return [...new Set(tags)] // Remove duplicatas
}
