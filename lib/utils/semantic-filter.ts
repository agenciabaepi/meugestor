/**
 * Filtro semântico para categorias e subcategorias
 * Resolve o problema de filtro rígido por string exata
 * 
 * Exemplo: "mercado" deve encontrar:
 * - categoria: "Alimentação" com subcategoria: "supermercado"
 * - categoria: "Alimentação" com descrição contendo "mercado"
 * - tags contendo "mercado" ou "supermercado"
 */

export interface FinanceiroRecord {
  category: string
  subcategory?: string | null
  description: string
  tags?: string[] | null
}

/**
 * Mapeamento semântico de termos comuns para categorias/subcategorias
 */
const SEMANTIC_MAPPINGS: Record<string, {
  categories: string[]
  subcategories: string[]
  keywords: string[]
}> = {
  'mercado': {
    categories: ['Alimentação'],
    subcategories: ['supermercado', 'feira', 'hortifruti'],
    keywords: ['mercado', 'supermercado', 'atacadão', 'atacado', 'hipermercado', 'extra', 'carrefour', 'walmart', 'assai']
  },
  'supermercado': {
    categories: ['Alimentação'],
    subcategories: ['supermercado'],
    keywords: ['supermercado', 'mercado', 'atacadão', 'atacado', 'hipermercado']
  },
  'alimentação': {
    categories: ['Alimentação'],
    subcategories: ['supermercado', 'feira', 'hortifruti', 'padaria', 'restaurante', 'lanchonete', 'delivery'],
    keywords: ['alimentação', 'alimentacao', 'comida', 'mercado', 'supermercado']
  },
  'alimentacao': {
    categories: ['Alimentação'],
    subcategories: ['supermercado', 'feira', 'hortifruti', 'padaria', 'restaurante', 'lanchonete', 'delivery'],
    keywords: ['alimentação', 'alimentacao', 'comida', 'mercado', 'supermercado']
  },
  'combustível': {
    categories: ['Transporte'],
    subcategories: ['combustível'],
    keywords: ['combustível', 'combustivel', 'gasolina', 'etanol', 'diesel', 'posto', 'abastecimento', 'abastecer']
  },
  'combustivel': {
    categories: ['Transporte'],
    subcategories: ['combustível'],
    keywords: ['combustível', 'combustivel', 'gasolina', 'etanol', 'diesel', 'posto', 'abastecimento', 'abastecer']
  },
  'gasolina': {
    categories: ['Transporte'],
    subcategories: ['combustível'],
    keywords: ['gasolina', 'combustível', 'combustivel', 'posto', 'abastecimento']
  },
  'transporte': {
    categories: ['Transporte'],
    subcategories: ['combustível', 'transporte público', 'aplicativos (Uber/99)', 'estacionamento'],
    keywords: ['transporte', 'uber', '99', 'taxi', 'onibus', 'ônibus', 'metro', 'metrô', 'combustível', 'gasolina']
  },
  'cartão': {
    categories: ['Financeiro e Obrigações'],
    subcategories: ['cartão de crédito'],
    keywords: ['cartão', 'cartao', 'credito', 'crédito', 'fatura', 'cartão de crédito']
  },
  'cartao': {
    categories: ['Financeiro e Obrigações'],
    subcategories: ['cartão de crédito'],
    keywords: ['cartão', 'cartao', 'credito', 'crédito', 'fatura', 'cartão de crédito']
  },
  'restaurante': {
    categories: ['Alimentação'],
    subcategories: ['restaurante', 'lanchonete', 'delivery'],
    keywords: ['restaurante', 'lanchonete', 'delivery', 'ifood', 'uber eats', 'rappi']
  }
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
 * Verifica se um registro corresponde semanticamente a uma categoria/subcategoria
 */
export function matchesSemanticFilter(
  record: FinanceiroRecord,
  searchTerm: string
): boolean {
  const normalizedSearch = normalizeString(searchTerm)
  const normalizedDescription = normalizeString(record.description)
  
  // Busca mapeamento semântico
  const mapping = SEMANTIC_MAPPINGS[normalizedSearch]
  
  if (mapping) {
    // Verifica categoria
    const categoryMatch = mapping.categories.some(cat => 
      normalizeString(record.category) === normalizeString(cat)
    )
    
    // Verifica subcategoria
    const subcategoryMatch = !!record.subcategory && mapping.subcategories.some(sub => 
      normalizeString(record.subcategory!) === normalizeString(sub)
    )
    
    // Verifica keywords na descrição
    const keywordMatch = mapping.keywords.some(keyword => 
      normalizedDescription.includes(normalizeString(keyword))
    )
    
    // Verifica tags
    const tagMatch = !!record.tags?.some(tag => 
      mapping.keywords.some(keyword => 
        normalizeString(tag).includes(normalizeString(keyword))
      )
    )
    
    return categoryMatch && (subcategoryMatch || keywordMatch || tagMatch)
  }
  
  // Fallback: busca direta na descrição, categoria ou subcategoria
  // Também verifica se o termo de busca está relacionado semanticamente
  const directMatch = 
    normalizedDescription.includes(normalizedSearch) ||
    normalizeString(record.category).includes(normalizedSearch) ||
    (!!record.subcategory && normalizeString(record.subcategory).includes(normalizedSearch)) ||
    !!record.tags?.some(tag => normalizeString(tag).includes(normalizedSearch))
  
  // Verifica também se o termo de busca é sinônimo de categoria/subcategoria
  // Ex: "mercado" pode estar em descrição mesmo que categoria seja "Alimentação"
  const synonymMatch = checkSynonymMatch(normalizedSearch, record)
  
  return directMatch || synonymMatch
}

/**
 * Verifica se o termo de busca é sinônimo da categoria/subcategoria do registro
 */
function checkSynonymMatch(searchTerm: string, record: FinanceiroRecord): boolean {
  // Mapeamento inverso: verifica se o termo de busca corresponde à categoria/subcategoria
  for (const [term, mapping] of Object.entries(SEMANTIC_MAPPINGS)) {
    if (normalizeString(term) === searchTerm) {
      // Verifica se o registro pertence a uma das categorias/subcategorias mapeadas
      const categoryMatch = mapping.categories.some(cat => 
        normalizeString(record.category) === normalizeString(cat)
      )
      
      const subcategoryMatch = record.subcategory && mapping.subcategories.some(sub => 
        normalizeString(record.subcategory!) === normalizeString(sub)
      )
      
      if (categoryMatch || subcategoryMatch) {
        return true
      }
    }
  }
  
  return false
}

/**
 * Filtra registros usando busca semântica
 */
export function filterBySemanticCategory<T extends FinanceiroRecord>(
  records: T[],
  searchTerm: string
): T[] {
  if (!searchTerm) {
    return records
  }
  
  return records.filter(record => matchesSemanticFilter(record, searchTerm))
}
