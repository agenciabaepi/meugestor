/**
 * Normalizador de Categorias e Subcategorias
 * Mapeia termos comuns retornados pelo GPT para categorias/subcategorias válidas
 * 
 * Princípio: GPT pode retornar "mercado", sistema normaliza para "Alimentação" / "supermercado"
 */

/**
 * Mapeamento de termos comuns para categorias/subcategorias válidas
 */
const CATEGORY_MAPPINGS: Record<string, {
  category: string
  subcategory: string | null
}> = {
  // Alimentação
  'mercado': { category: 'Alimentação', subcategory: 'supermercado' },
  'supermercado': { category: 'Alimentação', subcategory: 'supermercado' },
  'alimentação': { category: 'Alimentação', subcategory: null },
  'alimentacao': { category: 'Alimentação', subcategory: null },
  'comida': { category: 'Alimentação', subcategory: null },
  'restaurante': { category: 'Alimentação', subcategory: 'restaurante' },
  'lanchonete': { category: 'Alimentação', subcategory: 'lanchonete' },
  'delivery': { category: 'Alimentação', subcategory: 'delivery' },
  'padaria': { category: 'Alimentação', subcategory: 'padaria' },
  'feira': { category: 'Alimentação', subcategory: 'feira' },
  
  // Transporte
  'combustível': { category: 'Transporte', subcategory: 'combustível' },
  'combustivel': { category: 'Transporte', subcategory: 'combustível' },
  'gasolina': { category: 'Transporte', subcategory: 'combustível' },
  'transporte': { category: 'Transporte', subcategory: null },
  'uber': { category: 'Transporte', subcategory: 'aplicativos (Uber/99)' },
  'posto': { category: 'Transporte', subcategory: 'combustível' },
  
  // Financeiro
  'cartão': { category: 'Financeiro e Obrigações', subcategory: 'cartão de crédito' },
  'cartao': { category: 'Financeiro e Obrigações', subcategory: 'cartão de crédito' },
  'credito': { category: 'Financeiro e Obrigações', subcategory: 'cartão de crédito' },
  'crédito': { category: 'Financeiro e Obrigações', subcategory: 'cartão de crédito' },
  'fatura': { category: 'Financeiro e Obrigações', subcategory: 'cartão de crédito' },
  
  // Outras categorias principais (sem subcategoria específica)
  'moradia': { category: 'Moradia', subcategory: null },
  'saúde': { category: 'Saúde', subcategory: null },
  'saude': { category: 'Saúde', subcategory: null },
  'educação': { category: 'Educação', subcategory: null },
  'educacao': { category: 'Educação', subcategory: null },
  'lazer': { category: 'Lazer e Entretenimento', subcategory: null },
  'compras': { category: 'Compras Pessoais', subcategory: null },
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
 * Resolve categoria e subcategoria a partir de um termo
 * Retorna null se não encontrar mapeamento
 */
export function resolveCategoria(term: string | null | undefined): {
  category: string | null
  subcategory: string | null
} {
  if (!term) {
    return { category: null, subcategory: null }
  }
  
  const normalized = normalizeString(term)
  const mapping = CATEGORY_MAPPINGS[normalized]
  
  if (mapping) {
    return {
      category: mapping.category,
      subcategory: mapping.subcategory
    }
  }
  
  // Se não encontrou mapeamento, verifica se o termo já é uma categoria válida
  const validCategories = [
    'Alimentação', 'Moradia', 'Saúde', 'Transporte', 'Educação',
    'Lazer e Entretenimento', 'Compras Pessoais', 'Assinaturas e Serviços',
    'Financeiro e Obrigações', 'Impostos e Taxas', 'Pets',
    'Doações e Presentes', 'Trabalho e Negócios', 'Outros'
  ]
  
  const isAlreadyValidCategory = validCategories.some(cat => 
    normalizeString(cat) === normalized
  )
  
  if (isAlreadyValidCategory) {
    return { category: term, subcategory: null }
  }
  
  // Não encontrou mapeamento e não é categoria válida
  return { category: null, subcategory: null }
}
