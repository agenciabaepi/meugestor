-- Migration: Categorias e Subcategorias Fixas do Financeiro
-- Description: Cria tabela de referência com categorias e subcategorias padronizadas

-- Tabela de categorias principais
CREATE TABLE IF NOT EXISTS financeiro_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de subcategorias
CREATE TABLE IF NOT EXISTS financeiro_subcategories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES financeiro_categories(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(category_id, name)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_subcategories_category_id ON financeiro_subcategories(category_id);

-- Inserir categorias principais
INSERT INTO financeiro_categories (name, description) VALUES
  ('Alimentação', 'Gastos com alimentação e bebidas'),
  ('Moradia', 'Gastos relacionados à moradia e manutenção do lar'),
  ('Saúde', 'Gastos com saúde e bem-estar'),
  ('Transporte', 'Gastos com transporte e locomoção'),
  ('Educação', 'Gastos com educação e aprendizado'),
  ('Lazer e Entretenimento', 'Gastos com lazer, entretenimento e diversão'),
  ('Compras Pessoais', 'Gastos com itens pessoais e vestuário'),
  ('Assinaturas e Serviços', 'Gastos com assinaturas e serviços recorrentes'),
  ('Financeiro e Obrigações', 'Gastos financeiros e obrigações'),
  ('Impostos e Taxas', 'Impostos e taxas governamentais'),
  ('Pets', 'Gastos com animais de estimação'),
  ('Doações e Presentes', 'Doações e presentes'),
  ('Trabalho e Negócios', 'Gastos relacionados ao trabalho e negócios'),
  ('Outros', 'Outros gastos não categorizados')
ON CONFLICT (name) DO NOTHING;

-- Inserir subcategorias de Alimentação
INSERT INTO financeiro_subcategories (category_id, name) 
SELECT id, unnest(ARRAY[
  'supermercado', 'feira', 'hortifruti', 'padaria', 'restaurante', 
  'lanchonete', 'delivery', 'café'
])
FROM financeiro_categories WHERE name = 'Alimentação';

-- Inserir subcategorias de Moradia
INSERT INTO financeiro_subcategories (category_id, name) 
SELECT id, unnest(ARRAY[
  'aluguel', 'condomínio', 'IPTU', 'água', 'energia elétrica', 
  'gás', 'internet', 'manutenção e reparos'
])
FROM financeiro_categories WHERE name = 'Moradia';

-- Inserir subcategorias de Saúde
INSERT INTO financeiro_subcategories (category_id, name) 
SELECT id, unnest(ARRAY[
  'consulta médica', 'exames', 'medicamentos', 'farmácia', 
  'plano de saúde', 'dentista', 'psicólogo/terapia'
])
FROM financeiro_categories WHERE name = 'Saúde';

-- Inserir subcategorias de Transporte
INSERT INTO financeiro_subcategories (category_id, name) 
SELECT id, unnest(ARRAY[
  'combustível', 'transporte público', 'aplicativos (Uber/99)', 
  'estacionamento', 'manutenção veicular', 'seguro do veículo', 
  'IPVA', 'pedágio'
])
FROM financeiro_categories WHERE name = 'Transporte';

-- Inserir subcategorias de Educação
INSERT INTO financeiro_subcategories (category_id, name) 
SELECT id, unnest(ARRAY[
  'mensalidade escolar', 'faculdade', 'cursos', 'livros', 
  'material escolar', 'plataformas online'
])
FROM financeiro_categories WHERE name = 'Educação';

-- Inserir subcategorias de Lazer e Entretenimento
INSERT INTO financeiro_subcategories (category_id, name) 
SELECT id, unnest(ARRAY[
  'cinema', 'streaming', 'viagens', 'passeios', 'bares', 
  'eventos', 'shows'
])
FROM financeiro_categories WHERE name = 'Lazer e Entretenimento';

-- Inserir subcategorias de Compras Pessoais
INSERT INTO financeiro_subcategories (category_id, name) 
SELECT id, unnest(ARRAY[
  'roupas', 'calçados', 'acessórios', 'cosméticos', 'higiene pessoal'
])
FROM financeiro_categories WHERE name = 'Compras Pessoais';

-- Inserir subcategorias de Assinaturas e Serviços
INSERT INTO financeiro_subcategories (category_id, name) 
SELECT id, unnest(ARRAY[
  'streaming', 'softwares', 'aplicativos', 'clubes', 'associações'
])
FROM financeiro_categories WHERE name = 'Assinaturas e Serviços';

-- Inserir subcategorias de Financeiro e Obrigações
INSERT INTO financeiro_subcategories (category_id, name) 
SELECT id, unnest(ARRAY[
  'cartão de crédito', 'empréstimos', 'financiamentos', 
  'tarifas bancárias', 'juros', 'multas'
])
FROM financeiro_categories WHERE name = 'Financeiro e Obrigações';

-- Inserir subcategorias de Impostos e Taxas
INSERT INTO financeiro_subcategories (category_id, name) 
SELECT id, unnest(ARRAY[
  'imposto de renda', 'taxas municipais', 'taxas estaduais', 'licenças'
])
FROM financeiro_categories WHERE name = 'Impostos e Taxas';

-- Inserir subcategorias de Pets
INSERT INTO financeiro_subcategories (category_id, name) 
SELECT id, unnest(ARRAY[
  'ração', 'veterinário', 'medicamentos', 'banho e tosa'
])
FROM financeiro_categories WHERE name = 'Pets';

-- Inserir subcategorias de Doações e Presentes
INSERT INTO financeiro_subcategories (category_id, name) 
SELECT id, unnest(ARRAY[
  'doações', 'presentes', 'contribuições'
])
FROM financeiro_categories WHERE name = 'Doações e Presentes';

-- Inserir subcategorias de Trabalho e Negócios
INSERT INTO financeiro_subcategories (category_id, name) 
SELECT id, unnest(ARRAY[
  'ferramentas de trabalho', 'serviços profissionais', 'marketing', 
  'contabilidade', 'hospedagem', 'sistemas'
])
FROM financeiro_categories WHERE name = 'Trabalho e Negócios';

-- Inserir subcategorias de Outros
INSERT INTO financeiro_subcategories (category_id, name) 
SELECT id, unnest(ARRAY[
  'emergências', 'imprevistos', 'ajustes', 'correções'
])
FROM financeiro_categories WHERE name = 'Outros';

-- Função para atualizar updated_at
CREATE OR REPLACE FUNCTION update_financeiro_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_financeiro_categories_updated_at
  BEFORE UPDATE ON financeiro_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_financeiro_categories_updated_at();

CREATE TRIGGER update_financeiro_subcategories_updated_at
  BEFORE UPDATE ON financeiro_subcategories
  FOR EACH ROW
  EXECUTE FUNCTION update_financeiro_categories_updated_at();

-- Comentários para documentação
COMMENT ON TABLE financeiro_categories IS 'Categorias principais de gastos financeiros';
COMMENT ON TABLE financeiro_subcategories IS 'Subcategorias específicas de cada categoria principal';
COMMENT ON COLUMN financeiro_categories.name IS 'Nome da categoria (ex: Alimentação, Transporte)';
COMMENT ON COLUMN financeiro_subcategories.name IS 'Nome da subcategoria (ex: supermercado, combustível)';
