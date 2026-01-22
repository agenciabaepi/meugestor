/**
 * Categorização empresarial (modo empresa).
 * Objetivo: mapear itens/serviços comuns para categorias padrão do módulo empresa.
 */

export interface EmpresaCategorizationResult {
  category: string
  subcategory: string | null
  tags: string[]
  confidence: number
}

type MapEntry = { category: string; subcategory: string | null; tags: string[] }

const MAPPINGS: Record<string, MapEntry> = {
  // Materiais (pintura/construção)
  tinta: { category: 'Materiais', subcategory: 'tinta', tags: ['materiais', 'tinta'] },
  epox: { category: 'Materiais', subcategory: 'tinta', tags: ['materiais', 'tinta', 'epox'] },
  epóxi: { category: 'Materiais', subcategory: 'tinta', tags: ['materiais', 'tinta', 'epox'] },
  epoxi: { category: 'Materiais', subcategory: 'tinta', tags: ['materiais', 'tinta', 'epox'] },
  verniz: { category: 'Materiais', subcategory: 'verniz', tags: ['materiais', 'verniz'] },
  spray: { category: 'Materiais', subcategory: 'spray', tags: ['materiais', 'spray'] },
  rolo: { category: 'Materiais', subcategory: 'rolo', tags: ['materiais', 'rolo'] },
  pincel: { category: 'Materiais', subcategory: 'pincel', tags: ['materiais', 'pincel'] },
  pinceis: { category: 'Materiais', subcategory: 'pincel', tags: ['materiais', 'pincel'] },
  pincéis: { category: 'Materiais', subcategory: 'pincel', tags: ['materiais', 'pincel'] },
  lata: { category: 'Materiais', subcategory: null, tags: ['materiais'] },
  litros: { category: 'Materiais', subcategory: null, tags: ['materiais'] },
  massa: { category: 'Materiais', subcategory: 'massa', tags: ['materiais'] },
  cimento: { category: 'Materiais', subcategory: 'cimento', tags: ['materiais'] },
  areia: { category: 'Materiais', subcategory: 'areia', tags: ['materiais'] },
  material: { category: 'Materiais', subcategory: null, tags: ['materiais'] },
  materiais: { category: 'Materiais', subcategory: null, tags: ['materiais'] },

  // Serviços terceirizados
  eletricista: { category: 'Serviços terceirizados', subcategory: 'eletricista', tags: ['serviço', 'terceirizado'] },
  encanador: { category: 'Serviços terceirizados', subcategory: 'encanador', tags: ['serviço', 'terceirizado'] },
  frete: { category: 'Serviços terceirizados', subcategory: 'frete', tags: ['serviço', 'logística'] },
  transporte: { category: 'Serviços terceirizados', subcategory: 'frete', tags: ['serviço', 'logística'] },

  // Ferramentas / Equipamentos
  ferramenta: { category: 'Ferramentas', subcategory: null, tags: ['ferramentas'] },
  ferramentas: { category: 'Ferramentas', subcategory: null, tags: ['ferramentas'] },
  equipamento: { category: 'Equipamentos', subcategory: null, tags: ['equipamentos'] },
  equipamentos: { category: 'Equipamentos', subcategory: null, tags: ['equipamentos'] },

  // Estoque / Produtos
  estoque: { category: 'Estoque', subcategory: null, tags: ['estoque'] },
  produto: { category: 'Produtos', subcategory: null, tags: ['produtos'] },
  produtos: { category: 'Produtos', subcategory: null, tags: ['produtos'] },

  // Funcionários (pagamentos)
  funcionario: { category: 'funcionario', subcategory: 'salario', tags: ['funcionario', 'salario'] },
  funcionários: { category: 'funcionario', subcategory: 'salario', tags: ['funcionario', 'salario'] },
  salario: { category: 'funcionario', subcategory: 'salario', tags: ['funcionario', 'salario'] },
  salário: { category: 'funcionario', subcategory: 'salario', tags: ['funcionario', 'salario'] },
  pagamento: { category: 'funcionario', subcategory: 'pagamento', tags: ['funcionario', 'pagamento'] },
  paguei: { category: 'funcionario', subcategory: 'pagamento', tags: ['funcionario', 'pagamento'] },
}

export function categorizeEmpresaExpense(description: string): EmpresaCategorizationResult {
  const text = String(description || '').toLowerCase()

  // termos mais específicos primeiro
  const terms = Object.keys(MAPPINGS).sort((a, b) => b.length - a.length)
  for (const term of terms) {
    if (text.includes(term)) {
      const m = MAPPINGS[term]
      return { category: m.category, subcategory: m.subcategory, tags: [...m.tags], confidence: 0.85 }
    }
  }

  return { category: 'Outros', subcategory: null, tags: [], confidence: 0.2 }
}

