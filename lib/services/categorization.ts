/**
 * Serviço de categorização inteligente de gastos
 * Mapeia termos e descrições para categorias e subcategorias padronizadas
 */

export interface CategorizationResult {
  category: string
  subcategory: string | null
  tags: string[]
  confidence: number
}

// Mapeamento completo de termos para categorias e subcategorias
const CATEGORY_MAPPINGS: Record<string, {
  category: string
  subcategory: string
  tags: string[]
}> = {
  // ============================================
  // ALIMENTAÇÃO
  // ============================================
  'supermercado': { category: 'Alimentação', subcategory: 'supermercado', tags: ['supermercado', 'compras', 'alimentação'] },
  'mercado': { category: 'Alimentação', subcategory: 'supermercado', tags: ['supermercado', 'compras', 'alimentação'] },
  'feira': { category: 'Alimentação', subcategory: 'feira', tags: ['feira', 'hortifruti', 'alimentação'] },
  'hortifruti': { category: 'Alimentação', subcategory: 'hortifruti', tags: ['hortifruti', 'frutas', 'verduras', 'alimentação'] },
  'padaria': { category: 'Alimentação', subcategory: 'padaria', tags: ['padaria', 'pão', 'alimentação'] },
  'restaurante': { category: 'Alimentação', subcategory: 'restaurante', tags: ['restaurante', 'comida', 'alimentação'] },
  'lanchonete': { category: 'Alimentação', subcategory: 'lanchonete', tags: ['lanchonete', 'lanche', 'alimentação'] },
  'lanche': { category: 'Alimentação', subcategory: 'lanchonete', tags: ['lanche', 'lanchonete', 'alimentação'] },
  'delivery': { category: 'Alimentação', subcategory: 'delivery', tags: ['delivery', 'entrega', 'alimentação'] },
  'ifood': { category: 'Alimentação', subcategory: 'delivery', tags: ['ifood', 'delivery', 'alimentação'] },
  'rappi': { category: 'Alimentação', subcategory: 'delivery', tags: ['rappi', 'delivery', 'alimentação'] },
  'uber eats': { category: 'Alimentação', subcategory: 'delivery', tags: ['uber eats', 'delivery', 'alimentação'] },
  'café': { category: 'Alimentação', subcategory: 'café', tags: ['café', 'bebida', 'alimentação'] },
  'cafe': { category: 'Alimentação', subcategory: 'café', tags: ['café', 'bebida', 'alimentação'] },
  'pizza': { category: 'Alimentação', subcategory: 'delivery', tags: ['pizza', 'delivery', 'alimentação'] },
  'hambúrguer': { category: 'Alimentação', subcategory: 'lanchonete', tags: ['hambúrguer', 'lanchonete', 'alimentação'] },
  'burger': { category: 'Alimentação', subcategory: 'lanchonete', tags: ['hambúrguer', 'lanchonete', 'alimentação'] },
  'mcdonalds': { category: 'Alimentação', subcategory: 'lanchonete', tags: ['mcdonalds', 'fast food', 'alimentação'] },
  'fast food': { category: 'Alimentação', subcategory: 'lanchonete', tags: ['fast food', 'lanchonete', 'alimentação'] },

  // ============================================
  // MORADIA
  // ============================================
  'aluguel': { category: 'Moradia', subcategory: 'aluguel', tags: ['aluguel', 'moradia', 'imóvel'] },
  'condomínio': { category: 'Moradia', subcategory: 'condomínio', tags: ['condomínio', 'moradia', 'imóvel'] },
  'condominio': { category: 'Moradia', subcategory: 'condomínio', tags: ['condomínio', 'moradia', 'imóvel'] },
  'iptu': { category: 'Moradia', subcategory: 'IPTU', tags: ['iptu', 'imposto', 'moradia'] },
  'água': { category: 'Moradia', subcategory: 'água', tags: ['água', 'conta', 'moradia'] },
  'agua': { category: 'Moradia', subcategory: 'água', tags: ['água', 'conta', 'moradia'] },
  'energia': { category: 'Moradia', subcategory: 'energia elétrica', tags: ['energia', 'luz', 'conta', 'moradia'] },
  'luz': { category: 'Moradia', subcategory: 'energia elétrica', tags: ['luz', 'energia', 'conta', 'moradia'] },
  'energia elétrica': { category: 'Moradia', subcategory: 'energia elétrica', tags: ['energia', 'luz', 'conta', 'moradia'] },
  'gás': { category: 'Moradia', subcategory: 'gás', tags: ['gás', 'gas', 'conta', 'moradia'] },
  'gas': { category: 'Moradia', subcategory: 'gás', tags: ['gás', 'gas', 'conta', 'moradia'] },
  'internet': { category: 'Moradia', subcategory: 'internet', tags: ['internet', 'conexão', 'moradia'] },
  'wi-fi': { category: 'Moradia', subcategory: 'internet', tags: ['wi-fi', 'internet', 'moradia'] },
  'wifi': { category: 'Moradia', subcategory: 'internet', tags: ['wi-fi', 'internet', 'moradia'] },
  'manutenção': { category: 'Moradia', subcategory: 'manutenção e reparos', tags: ['manutenção', 'reparo', 'moradia'] },
  'reparo': { category: 'Moradia', subcategory: 'manutenção e reparos', tags: ['reparo', 'manutenção', 'moradia'] },
  'reparos': { category: 'Moradia', subcategory: 'manutenção e reparos', tags: ['reparos', 'manutenção', 'moradia'] },

  // ============================================
  // SAÚDE
  // ============================================
  'consulta': { category: 'Saúde', subcategory: 'consulta médica', tags: ['consulta', 'médico', 'saúde'] },
  'médico': { category: 'Saúde', subcategory: 'consulta médica', tags: ['médico', 'consulta', 'saúde'] },
  'medico': { category: 'Saúde', subcategory: 'consulta médica', tags: ['médico', 'consulta', 'saúde'] },
  'doutor': { category: 'Saúde', subcategory: 'consulta médica', tags: ['doutor', 'médico', 'consulta', 'saúde'] },
  'exame': { category: 'Saúde', subcategory: 'exames', tags: ['exame', 'laboratório', 'saúde'] },
  'laboratório': { category: 'Saúde', subcategory: 'exames', tags: ['laboratório', 'exame', 'saúde'] },
  'medicamento': { category: 'Saúde', subcategory: 'medicamentos', tags: ['medicamento', 'remédio', 'saúde'] },
  'medicamentos': { category: 'Saúde', subcategory: 'medicamentos', tags: ['medicamentos', 'remédio', 'saúde'] },
  'remédio': { category: 'Saúde', subcategory: 'medicamentos', tags: ['remédio', 'medicamento', 'saúde'] },
  'remedio': { category: 'Saúde', subcategory: 'medicamentos', tags: ['remédio', 'medicamento', 'saúde'] },
  'farmácia': { category: 'Saúde', subcategory: 'farmácia', tags: ['farmácia', 'medicamento', 'saúde'] },
  'farmacia': { category: 'Saúde', subcategory: 'farmácia', tags: ['farmácia', 'medicamento', 'saúde'] },
  'plano de saúde': { category: 'Saúde', subcategory: 'plano de saúde', tags: ['plano', 'saúde', 'seguro'] },
  'plano de saude': { category: 'Saúde', subcategory: 'plano de saúde', tags: ['plano', 'saúde', 'seguro'] },
  'dentista': { category: 'Saúde', subcategory: 'dentista', tags: ['dentista', 'odontologia', 'saúde'] },
  'psicólogo': { category: 'Saúde', subcategory: 'psicólogo/terapia', tags: ['psicólogo', 'terapia', 'saúde'] },
  'psicologo': { category: 'Saúde', subcategory: 'psicólogo/terapia', tags: ['psicólogo', 'terapia', 'saúde'] },
  'terapia': { category: 'Saúde', subcategory: 'psicólogo/terapia', tags: ['terapia', 'psicólogo', 'saúde'] },

  // ============================================
  // TRANSPORTE
  // ============================================
  'gasolina': { category: 'Transporte', subcategory: 'combustível', tags: ['gasolina', 'combustível', 'veículo'] },
  'combustível': { category: 'Transporte', subcategory: 'combustível', tags: ['combustível', 'veículo'] },
  'combustivel': { category: 'Transporte', subcategory: 'combustível', tags: ['combustível', 'veículo'] },
  'álcool': { category: 'Transporte', subcategory: 'combustível', tags: ['álcool', 'combustível', 'veículo'] },
  'alcool': { category: 'Transporte', subcategory: 'combustível', tags: ['álcool', 'combustível', 'veículo'] },
  'diesel': { category: 'Transporte', subcategory: 'combustível', tags: ['diesel', 'combustível', 'veículo'] },
  'posto': { category: 'Transporte', subcategory: 'combustível', tags: ['posto', 'combustível', 'veículo'] },
  'abasteci': { category: 'Transporte', subcategory: 'combustível', tags: ['combustível', 'veículo'] },
  'abastecer': { category: 'Transporte', subcategory: 'combustível', tags: ['combustível', 'veículo'] },
  'ônibus': { category: 'Transporte', subcategory: 'transporte público', tags: ['ônibus', 'transporte público'] },
  'onibus': { category: 'Transporte', subcategory: 'transporte público', tags: ['ônibus', 'transporte público'] },
  'metrô': { category: 'Transporte', subcategory: 'transporte público', tags: ['metrô', 'transporte público'] },
  'metro': { category: 'Transporte', subcategory: 'transporte público', tags: ['metrô', 'transporte público'] },
  'trem': { category: 'Transporte', subcategory: 'transporte público', tags: ['trem', 'transporte público'] },
  'uber': { category: 'Transporte', subcategory: 'aplicativos (Uber/99)', tags: ['uber', 'transporte', 'aplicativo'] },
  '99': { category: 'Transporte', subcategory: 'aplicativos (Uber/99)', tags: ['99', 'transporte', 'aplicativo'] },
  'taxi': { category: 'Transporte', subcategory: 'aplicativos (Uber/99)', tags: ['taxi', 'transporte'] },
  'estacionamento': { category: 'Transporte', subcategory: 'estacionamento', tags: ['estacionamento', 'veículo'] },
  'manutenção veicular': { category: 'Transporte', subcategory: 'manutenção veicular', tags: ['manutenção', 'veículo', 'mecânica'] },
  'manutencao veicular': { category: 'Transporte', subcategory: 'manutenção veicular', tags: ['manutenção', 'veículo', 'mecânica'] },
  'mecânica': { category: 'Transporte', subcategory: 'manutenção veicular', tags: ['mecânica', 'manutenção', 'veículo'] },
  'mecanica': { category: 'Transporte', subcategory: 'manutenção veicular', tags: ['mecânica', 'manutenção', 'veículo'] },
  'seguro': { category: 'Transporte', subcategory: 'seguro do veículo', tags: ['seguro', 'veículo', 'automóvel'] },
  'ipva': { category: 'Transporte', subcategory: 'IPVA', tags: ['ipva', 'imposto', 'veículo'] },
  'pedágio': { category: 'Transporte', subcategory: 'pedágio', tags: ['pedágio', 'estrada'] },
  'pedagio': { category: 'Transporte', subcategory: 'pedágio', tags: ['pedágio', 'estrada'] },

  // ============================================
  // EDUCAÇÃO
  // ============================================
  'escola': { category: 'Educação', subcategory: 'mensalidade escolar', tags: ['escola', 'educação', 'mensalidade'] },
  'mensalidade': { category: 'Educação', subcategory: 'mensalidade escolar', tags: ['mensalidade', 'educação'] },
  'faculdade': { category: 'Educação', subcategory: 'faculdade', tags: ['faculdade', 'universidade', 'educação'] },
  'universidade': { category: 'Educação', subcategory: 'faculdade', tags: ['universidade', 'faculdade', 'educação'] },
  'curso': { category: 'Educação', subcategory: 'cursos', tags: ['curso', 'educação'] },
  'livro': { category: 'Educação', subcategory: 'livros', tags: ['livro', 'material', 'educação'] },
  'livros': { category: 'Educação', subcategory: 'livros', tags: ['livros', 'material', 'educação'] },
  'material escolar': { category: 'Educação', subcategory: 'material escolar', tags: ['material', 'escolar', 'educação'] },
  'material': { category: 'Educação', subcategory: 'material escolar', tags: ['material', 'escolar', 'educação'] },
  'plataforma': { category: 'Educação', subcategory: 'plataformas online', tags: ['plataforma', 'online', 'educação'] },
  'online': { category: 'Educação', subcategory: 'plataformas online', tags: ['online', 'plataforma', 'educação'] },

  // ============================================
  // LAZER E ENTRETENIMENTO
  // ============================================
  'cinema': { category: 'Lazer e Entretenimento', subcategory: 'cinema', tags: ['cinema', 'lazer', 'entretenimento'] },
  'streaming': { category: 'Lazer e Entretenimento', subcategory: 'streaming', tags: ['streaming', 'lazer', 'entretenimento'] },
  'netflix': { category: 'Lazer e Entretenimento', subcategory: 'streaming', tags: ['netflix', 'streaming', 'lazer'] },
  'spotify': { category: 'Lazer e Entretenimento', subcategory: 'streaming', tags: ['spotify', 'streaming', 'lazer'] },
  'viagem': { category: 'Lazer e Entretenimento', subcategory: 'viagens', tags: ['viagem', 'lazer', 'turismo'] },
  'viagens': { category: 'Lazer e Entretenimento', subcategory: 'viagens', tags: ['viagens', 'lazer', 'turismo'] },
  'hotel': { category: 'Lazer e Entretenimento', subcategory: 'viagens', tags: ['hotel', 'viagem', 'lazer'] },
  'passeio': { category: 'Lazer e Entretenimento', subcategory: 'passeios', tags: ['passeio', 'lazer', 'entretenimento'] },
  'passeios': { category: 'Lazer e Entretenimento', subcategory: 'passeios', tags: ['passeios', 'lazer', 'entretenimento'] },
  'bar': { category: 'Lazer e Entretenimento', subcategory: 'bares', tags: ['bar', 'lazer', 'entretenimento'] },
  'bares': { category: 'Lazer e Entretenimento', subcategory: 'bares', tags: ['bares', 'lazer', 'entretenimento'] },
  'evento': { category: 'Lazer e Entretenimento', subcategory: 'eventos', tags: ['evento', 'lazer', 'entretenimento'] },
  'eventos': { category: 'Lazer e Entretenimento', subcategory: 'eventos', tags: ['eventos', 'lazer', 'entretenimento'] },
  'show': { category: 'Lazer e Entretenimento', subcategory: 'shows', tags: ['show', 'lazer', 'entretenimento'] },
  'shows': { category: 'Lazer e Entretenimento', subcategory: 'shows', tags: ['shows', 'lazer', 'entretenimento'] },
  'festival': { category: 'Lazer e Entretenimento', subcategory: 'eventos', tags: ['festival', 'lazer', 'entretenimento'] },

  // ============================================
  // COMPRAS PESSOAIS
  // ============================================
  'roupa': { category: 'Compras Pessoais', subcategory: 'roupas', tags: ['roupa', 'vestuário', 'pessoal'] },
  'roupas': { category: 'Compras Pessoais', subcategory: 'roupas', tags: ['roupas', 'vestuário', 'pessoal'] },
  'calçado': { category: 'Compras Pessoais', subcategory: 'calçados', tags: ['calçado', 'sapato', 'pessoal'] },
  'calçados': { category: 'Compras Pessoais', subcategory: 'calçados', tags: ['calçados', 'sapato', 'pessoal'] },
  'sapato': { category: 'Compras Pessoais', subcategory: 'calçados', tags: ['sapato', 'calçado', 'pessoal'] },
  'acessório': { category: 'Compras Pessoais', subcategory: 'acessórios', tags: ['acessório', 'pessoal'] },
  'acessórios': { category: 'Compras Pessoais', subcategory: 'acessórios', tags: ['acessórios', 'pessoal'] },
  'cosmético': { category: 'Compras Pessoais', subcategory: 'cosméticos', tags: ['cosmético', 'beleza', 'pessoal'] },
  'cosméticos': { category: 'Compras Pessoais', subcategory: 'cosméticos', tags: ['cosméticos', 'beleza', 'pessoal'] },
  'higiene': { category: 'Compras Pessoais', subcategory: 'higiene pessoal', tags: ['higiene', 'pessoal'] },
  'higiene pessoal': { category: 'Compras Pessoais', subcategory: 'higiene pessoal', tags: ['higiene', 'pessoal'] },

  // ============================================
  // ASSINATURAS E SERVIÇOS
  // ============================================
  'software': { category: 'Assinaturas e Serviços', subcategory: 'softwares', tags: ['software', 'assinatura', 'serviço'] },
  'softwares': { category: 'Assinaturas e Serviços', subcategory: 'softwares', tags: ['softwares', 'assinatura', 'serviço'] },
  'aplicativo': { category: 'Assinaturas e Serviços', subcategory: 'aplicativos', tags: ['aplicativo', 'app', 'serviço'] },
  'aplicativos': { category: 'Assinaturas e Serviços', subcategory: 'aplicativos', tags: ['aplicativos', 'app', 'serviço'] },
  'app': { category: 'Assinaturas e Serviços', subcategory: 'aplicativos', tags: ['app', 'aplicativo', 'serviço'] },
  'clube': { category: 'Assinaturas e Serviços', subcategory: 'clubes', tags: ['clube', 'assinatura', 'serviço'] },
  'clubes': { category: 'Assinaturas e Serviços', subcategory: 'clubes', tags: ['clubes', 'assinatura', 'serviço'] },
  'associação': { category: 'Assinaturas e Serviços', subcategory: 'associações', tags: ['associação', 'assinatura', 'serviço'] },
  'associações': { category: 'Assinaturas e Serviços', subcategory: 'associações', tags: ['associações', 'assinatura', 'serviço'] },

  // ============================================
  // FINANCEIRO E OBRIGAÇÕES
  // ============================================
  'cartão': { category: 'Financeiro e Obrigações', subcategory: 'cartão de crédito', tags: ['cartão', 'crédito', 'financeiro'] },
  'cartao': { category: 'Financeiro e Obrigações', subcategory: 'cartão de crédito', tags: ['cartão', 'crédito', 'financeiro'] },
  'cartão de crédito': { category: 'Financeiro e Obrigações', subcategory: 'cartão de crédito', tags: ['cartão', 'crédito', 'financeiro'] },
  'empréstimo': { category: 'Financeiro e Obrigações', subcategory: 'empréstimos', tags: ['empréstimo', 'financeiro'] },
  'emprestimo': { category: 'Financeiro e Obrigações', subcategory: 'empréstimos', tags: ['empréstimo', 'financeiro'] },
  'financiamento': { category: 'Financeiro e Obrigações', subcategory: 'financiamentos', tags: ['financiamento', 'financeiro'] },
  'tarifa': { category: 'Financeiro e Obrigações', subcategory: 'tarifas bancárias', tags: ['tarifa', 'banco', 'financeiro'] },
  'tarifas bancárias': { category: 'Financeiro e Obrigações', subcategory: 'tarifas bancárias', tags: ['tarifa', 'banco', 'financeiro'] },
  'juros': { category: 'Financeiro e Obrigações', subcategory: 'juros', tags: ['juros', 'financeiro'] },
  'multa': { category: 'Financeiro e Obrigações', subcategory: 'multas', tags: ['multa', 'financeiro'] },
  'multas': { category: 'Financeiro e Obrigações', subcategory: 'multas', tags: ['multas', 'financeiro'] },

  // ============================================
  // IMPOSTOS E TAXAS
  // ============================================
  'imposto de renda': { category: 'Impostos e Taxas', subcategory: 'imposto de renda', tags: ['imposto', 'renda', 'ir'] },
  'ir': { category: 'Impostos e Taxas', subcategory: 'imposto de renda', tags: ['ir', 'imposto', 'renda'] },
  'taxa municipal': { category: 'Impostos e Taxas', subcategory: 'taxas municipais', tags: ['taxa', 'municipal', 'imposto'] },
  'taxa estadual': { category: 'Impostos e Taxas', subcategory: 'taxas estaduais', tags: ['taxa', 'estadual', 'imposto'] },
  'licença': { category: 'Impostos e Taxas', subcategory: 'licenças', tags: ['licença', 'imposto'] },
  'licenças': { category: 'Impostos e Taxas', subcategory: 'licenças', tags: ['licenças', 'imposto'] },

  // ============================================
  // PETS
  // ============================================
  'ração': { category: 'Pets', subcategory: 'ração', tags: ['ração', 'pet', 'animal'] },
  'racao': { category: 'Pets', subcategory: 'ração', tags: ['ração', 'pet', 'animal'] },
  'veterinário': { category: 'Pets', subcategory: 'veterinário', tags: ['veterinário', 'pet', 'animal'] },
  'veterinario': { category: 'Pets', subcategory: 'veterinário', tags: ['veterinário', 'pet', 'animal'] },
  'vet': { category: 'Pets', subcategory: 'veterinário', tags: ['vet', 'veterinário', 'pet'] },
  'banho': { category: 'Pets', subcategory: 'banho e tosa', tags: ['banho', 'tosa', 'pet'] },
  'tosa': { category: 'Pets', subcategory: 'banho e tosa', tags: ['tosa', 'banho', 'pet'] },
  'banho e tosa': { category: 'Pets', subcategory: 'banho e tosa', tags: ['banho', 'tosa', 'pet'] },

  // ============================================
  // DOAÇÕES E PRESENTES
  // ============================================
  'doação': { category: 'Doações e Presentes', subcategory: 'doações', tags: ['doação', 'caridade'] },
  'doacao': { category: 'Doações e Presentes', subcategory: 'doações', tags: ['doação', 'caridade'] },
  'presente': { category: 'Doações e Presentes', subcategory: 'presentes', tags: ['presente', 'presentear'] },
  'presentes': { category: 'Doações e Presentes', subcategory: 'presentes', tags: ['presentes', 'presentear'] },
  'contribuição': { category: 'Doações e Presentes', subcategory: 'contribuições', tags: ['contribuição', 'doação'] },
  'contribuições': { category: 'Doações e Presentes', subcategory: 'contribuições', tags: ['contribuições', 'doação'] },

  // ============================================
  // TRABALHO E NEGÓCIOS
  // ============================================
  'ferramenta': { category: 'Trabalho e Negócios', subcategory: 'ferramentas de trabalho', tags: ['ferramenta', 'trabalho', 'negócio'] },
  'ferramentas': { category: 'Trabalho e Negócios', subcategory: 'ferramentas de trabalho', tags: ['ferramentas', 'trabalho', 'negócio'] },
  'serviço profissional': { category: 'Trabalho e Negócios', subcategory: 'serviços profissionais', tags: ['serviço', 'profissional', 'trabalho'] },
  'marketing': { category: 'Trabalho e Negócios', subcategory: 'marketing', tags: ['marketing', 'trabalho', 'negócio'] },
  'contabilidade': { category: 'Trabalho e Negócios', subcategory: 'contabilidade', tags: ['contabilidade', 'trabalho', 'negócio'] },
  'hospedagem': { category: 'Trabalho e Negócios', subcategory: 'hospedagem', tags: ['hospedagem', 'servidor', 'trabalho'] },
  'hosting': { category: 'Trabalho e Negócios', subcategory: 'hospedagem', tags: ['hosting', 'hospedagem', 'trabalho'] },
  'sistema': { category: 'Trabalho e Negócios', subcategory: 'sistemas', tags: ['sistema', 'software', 'trabalho'] },
  'sistemas': { category: 'Trabalho e Negócios', subcategory: 'sistemas', tags: ['sistemas', 'software', 'trabalho'] },
}

/**
 * Categoriza um gasto baseado na descrição
 * Usa mapeamento de termos para identificar categoria e subcategoria
 */
export function categorizeExpense(description: string, amount?: number): CategorizationResult {
  const lowerDescription = description.toLowerCase().trim()
  
  // Procura por termos conhecidos (ordem de prioridade: termos mais específicos primeiro)
  const sortedTerms = Object.keys(CATEGORY_MAPPINGS).sort((a, b) => b.length - a.length)
  
  for (const term of sortedTerms) {
    if (lowerDescription.includes(term)) {
      const mapping = CATEGORY_MAPPINGS[term]
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
  
  // Adiciona tags baseadas em padrões de pagamento
  if (lowerDescription.includes('cartão') || lowerDescription.includes('cartao')) {
    tags.push('cartão')
  }
  
  if (lowerDescription.includes('dinheiro')) {
    tags.push('dinheiro')
  }
  
  if (lowerDescription.includes('pix')) {
    tags.push('pix')
  }
  
  if (lowerDescription.includes('débito') || lowerDescription.includes('debito')) {
    tags.push('débito')
  }
  
  if (lowerDescription.includes('crédito') || lowerDescription.includes('credito')) {
    tags.push('crédito')
  }
  
  // Adiciona tags da subcategoria
  if (subcategory) {
    tags.push(subcategory.toLowerCase())
  }
  
  // Adiciona tag da categoria
  tags.push(category.toLowerCase())
  
  return [...new Set(tags)] // Remove duplicatas
}

/**
 * Lista todas as categorias disponíveis
 */
export function getAvailableCategories(): string[] {
  return [
    'Alimentação',
    'Moradia',
    'Saúde',
    'Transporte',
    'Educação',
    'Lazer e Entretenimento',
    'Compras Pessoais',
    'Assinaturas e Serviços',
    'Financeiro e Obrigações',
    'Impostos e Taxas',
    'Pets',
    'Doações e Presentes',
    'Trabalho e Negócios',
    'Outros',
  ]
}

/**
 * Mapeamento de termos para receitas
 */
const REVENUE_MAPPINGS: Record<string, {
  category: string
  subcategory: string
  tags: string[]
}> = {
  // Salário e Trabalho
  'salário': { category: 'Trabalho e Negócios', subcategory: 'salário', tags: ['salário', 'trabalho', 'receita'] },
  'salario': { category: 'Trabalho e Negócios', subcategory: 'salário', tags: ['salário', 'trabalho', 'receita'] },
  'pagamento': { category: 'Trabalho e Negócios', subcategory: 'salário', tags: ['pagamento', 'trabalho', 'receita'] },
  'prolabore': { category: 'Trabalho e Negócios', subcategory: 'salário', tags: ['prolabore', 'trabalho', 'receita'] },
  'freelance': { category: 'Trabalho e Negócios', subcategory: 'serviços profissionais', tags: ['freelance', 'serviço', 'receita'] },
  'freela': { category: 'Trabalho e Negócios', subcategory: 'serviços profissionais', tags: ['freelance', 'serviço', 'receita'] },
  'projeto': { category: 'Trabalho e Negócios', subcategory: 'serviços profissionais', tags: ['projeto', 'serviço', 'receita'] },
  'venda': { category: 'Trabalho e Negócios', subcategory: 'vendas', tags: ['venda', 'receita'] },
  'vendas': { category: 'Trabalho e Negócios', subcategory: 'vendas', tags: ['vendas', 'receita'] },
  
  // Investimentos
  'dividendos': { category: 'Financeiro e Obrigações', subcategory: 'investimentos', tags: ['dividendos', 'investimento', 'receita'] },
  'dividendo': { category: 'Financeiro e Obrigações', subcategory: 'investimentos', tags: ['dividendos', 'investimento', 'receita'] },
  'rendimento': { category: 'Financeiro e Obrigações', subcategory: 'investimentos', tags: ['rendimento', 'investimento', 'receita'] },
  'juros recebidos': { category: 'Financeiro e Obrigações', subcategory: 'investimentos', tags: ['juros', 'investimento', 'receita'] },
  'renda fixa': { category: 'Financeiro e Obrigações', subcategory: 'investimentos', tags: ['renda fixa', 'investimento', 'receita'] },
  'ações': { category: 'Financeiro e Obrigações', subcategory: 'investimentos', tags: ['ações', 'investimento', 'receita'] },
  'acoes': { category: 'Financeiro e Obrigações', subcategory: 'investimentos', tags: ['ações', 'investimento', 'receita'] },
  
  // Aluguel e Propriedades
  'aluguel recebido': { category: 'Moradia', subcategory: 'aluguel', tags: ['aluguel', 'propriedade', 'receita'] },
  'aluguel': { category: 'Moradia', subcategory: 'aluguel', tags: ['aluguel', 'propriedade', 'receita'] },
  'rent': { category: 'Moradia', subcategory: 'aluguel', tags: ['aluguel', 'propriedade', 'receita'] },
  
  // Reembolsos e Devoluções
  'reembolso': { category: 'Outros', subcategory: 'reembolsos', tags: ['reembolso', 'receita'] },
  'devolução': { category: 'Outros', subcategory: 'reembolsos', tags: ['devolução', 'receita'] },
  'devolucao': { category: 'Outros', subcategory: 'reembolsos', tags: ['devolução', 'receita'] },
  'estorno': { category: 'Outros', subcategory: 'reembolsos', tags: ['estorno', 'receita'] },
  
  // Presentes e Doações Recebidas
  'presente recebido': { category: 'Doações e Presentes', subcategory: 'presentes', tags: ['presente', 'receita'] },
  'presente': { category: 'Doações e Presentes', subcategory: 'presentes', tags: ['presente', 'receita'] },
  'presentes': { category: 'Doações e Presentes', subcategory: 'presentes', tags: ['presentes', 'receita'] },
  'ganhei': { category: 'Doações e Presentes', subcategory: 'presentes', tags: ['ganho', 'presente', 'receita'] },
  'ganho': { category: 'Doações e Presentes', subcategory: 'presentes', tags: ['ganho', 'presente', 'receita'] },
  'doação recebida': { category: 'Doações e Presentes', subcategory: 'doações', tags: ['doação', 'receita'] },
  'doacao recebida': { category: 'Doações e Presentes', subcategory: 'doações', tags: ['doação', 'receita'] },
  
  // Outros
  'bonus': { category: 'Trabalho e Negócios', subcategory: 'bonus', tags: ['bonus', 'trabalho', 'receita'] },
  'bônus': { category: 'Trabalho e Negócios', subcategory: 'bonus', tags: ['bonus', 'trabalho', 'receita'] },
  'comissão': { category: 'Trabalho e Negócios', subcategory: 'comissões', tags: ['comissão', 'trabalho', 'receita'] },
  'comissao': { category: 'Trabalho e Negócios', subcategory: 'comissões', tags: ['comissão', 'trabalho', 'receita'] },
  'comissões': { category: 'Trabalho e Negócios', subcategory: 'comissões', tags: ['comissões', 'trabalho', 'receita'] },
  'comissoes': { category: 'Trabalho e Negócios', subcategory: 'comissões', tags: ['comissões', 'trabalho', 'receita'] },
  'recebi comissão': { category: 'Trabalho e Negócios', subcategory: 'comissões', tags: ['comissão', 'trabalho', 'receita'] },
  'recebi comissao': { category: 'Trabalho e Negócios', subcategory: 'comissões', tags: ['comissão', 'trabalho', 'receita'] },
}

/**
 * Categoriza uma receita baseado na descrição
 */
export function categorizeRevenue(description: string, amount?: number): CategorizationResult {
  const lowerDescription = description.toLowerCase().trim()
  
  // Procura por termos conhecidos (ordem de prioridade: termos mais específicos primeiro)
  const sortedTerms = Object.keys(REVENUE_MAPPINGS).sort((a, b) => b.length - a.length)
  
  for (const term of sortedTerms) {
    if (lowerDescription.includes(term)) {
      const mapping = REVENUE_MAPPINGS[term]
      return {
        category: mapping.category,
        subcategory: mapping.subcategory,
        tags: [...mapping.tags],
        confidence: 0.9,
      }
    }
  }
  
  // Se não encontrou, retorna categoria padrão para receitas
  // Usa uma subcategoria válida que existe no mapeamento
  return {
    category: 'Trabalho e Negócios',
    subcategory: 'serviços profissionais', // Subcategoria válida que existe
    tags: ['receita'],
    confidence: 0.5,
  }
}

/**
 * Lista subcategorias de uma categoria específica
 */
export function getSubcategoriesForCategory(category: string): string[] {
  const subcategories = new Set<string>()
  
  for (const mapping of Object.values(CATEGORY_MAPPINGS)) {
    if (mapping.category === category) {
      subcategories.add(mapping.subcategory)
    }
  }
  
  return Array.from(subcategories)
}
