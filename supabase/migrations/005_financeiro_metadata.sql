-- Migration: Adiciona metadados e categorização inteligente ao financeiro
-- Description: Adiciona campos para armazenar informações detalhadas dos gastos

-- Adiciona coluna de metadados (JSONB) para armazenar informações extras
ALTER TABLE financeiro 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Adiciona coluna de subcategoria para categorização mais específica
ALTER TABLE financeiro 
ADD COLUMN IF NOT EXISTS subcategory TEXT;

-- Adiciona coluna de tags para busca e agrupamento
ALTER TABLE financeiro 
ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Adiciona índice GIN para busca eficiente em JSONB
CREATE INDEX IF NOT EXISTS idx_financeiro_metadata ON financeiro USING GIN (metadata);

-- Adiciona índice para subcategoria
CREATE INDEX IF NOT EXISTS idx_financeiro_subcategory ON financeiro(subcategory);

-- Adiciona índice para tags
CREATE INDEX IF NOT EXISTS idx_financeiro_tags ON financeiro USING GIN (tags);

-- Adiciona índice composto para consultas por categoria e subcategoria
CREATE INDEX IF NOT EXISTS idx_financeiro_category_subcategory ON financeiro(tenant_id, category, subcategory);

-- Comentários para documentação
COMMENT ON COLUMN financeiro.metadata IS 'Metadados adicionais do gasto (tipo, estabelecimento, método de pagamento, etc)';
COMMENT ON COLUMN financeiro.subcategory IS 'Subcategoria específica do gasto (ex: Combustível, Estacionamento, etc)';
COMMENT ON COLUMN financeiro.tags IS 'Tags para busca e agrupamento (ex: ["gasolina", "posto", "veiculo"])';
