-- Migration: Add campo pago to financeiro tables
-- Description: Adiciona campo pago (boolean) para marcar despesas como pagas ou não pagas
-- Isso permite diferenciar entre contas a pagar (vencidas ou futuras) e despesas já quitadas

-- ============================================
-- TABELA FINANCEIRO (Pessoal)
-- ============================================

-- Adiciona coluna pago na tabela financeiro (pessoal)
-- Para despesas: false = não pago, true = pago
-- Para receitas: sempre true (receitas já são consideradas "recebidas" ao serem registradas)
ALTER TABLE financeiro
  ADD COLUMN IF NOT EXISTS pago BOOLEAN DEFAULT true;

-- Atualiza registros existentes: despesas antigas são consideradas pagas por padrão
UPDATE financeiro
SET pago = true
WHERE pago IS NULL;

-- Torna a coluna NOT NULL após popular
ALTER TABLE financeiro
  ALTER COLUMN pago SET NOT NULL,
  ALTER COLUMN pago SET DEFAULT true;

-- Adiciona índice para filtrar por status de pagamento
CREATE INDEX IF NOT EXISTS idx_financeiro_pago 
  ON financeiro(tenant_id, transaction_type, pago, date)
  WHERE transaction_type = 'expense';

-- ============================================
-- TABELA FINANCEIRO_EMPRESA
-- ============================================

-- Adiciona coluna pago na tabela financeiro_empresa
ALTER TABLE financeiro_empresa
  ADD COLUMN IF NOT EXISTS pago BOOLEAN DEFAULT true;

-- Atualiza registros existentes: despesas antigas são consideradas pagas por padrão
UPDATE financeiro_empresa
SET pago = true
WHERE pago IS NULL;

-- Torna a coluna NOT NULL após popular
ALTER TABLE financeiro_empresa
  ALTER COLUMN pago SET NOT NULL,
  ALTER COLUMN pago SET DEFAULT true;

-- Adiciona índice para filtrar por status de pagamento
CREATE INDEX IF NOT EXISTS idx_financeiro_empresa_pago 
  ON financeiro_empresa(tenant_id, empresa_id, transaction_type, pago, date)
  WHERE transaction_type = 'expense';

-- Comentário explicativo
COMMENT ON COLUMN financeiro.pago IS 'Indica se a despesa foi paga (true) ou está pendente (false). Para receitas, sempre true.';
COMMENT ON COLUMN financeiro_empresa.pago IS 'Indica se a despesa foi paga (true) ou está pendente (false). Para receitas, sempre true.';
