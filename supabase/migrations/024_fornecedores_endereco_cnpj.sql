-- Migration: Adicionar campos endereco e cnpj na tabela fornecedores
-- Description: Adiciona campos de endereço e CNPJ para complementar os dados dos fornecedores

-- Adiciona campo endereco
ALTER TABLE fornecedores 
ADD COLUMN IF NOT EXISTS endereco TEXT;

-- Adiciona campo cnpj
ALTER TABLE fornecedores 
ADD COLUMN IF NOT EXISTS cnpj TEXT;

-- Cria índice para CNPJ para facilitar buscas
CREATE INDEX IF NOT EXISTS idx_fornecedores_cnpj ON fornecedores(tenant_id, empresa_id, cnpj) WHERE cnpj IS NOT NULL;
