-- Migration: Adiciona campo type para distinguir receitas de despesas
-- Description: Adiciona campo transaction_type para identificar se é receita ou despesa

-- Adiciona coluna transaction_type
ALTER TABLE financeiro 
ADD COLUMN IF NOT EXISTS transaction_type TEXT NOT NULL DEFAULT 'expense' CHECK (transaction_type IN ('expense', 'revenue'));

-- Atualiza registros existentes para serem despesas (padrão)
UPDATE financeiro 
SET transaction_type = 'expense' 
WHERE transaction_type IS NULL OR transaction_type = '';

-- Adiciona índice para consultas por tipo
CREATE INDEX IF NOT EXISTS idx_financeiro_transaction_type ON financeiro(tenant_id, transaction_type);

-- Comentário para documentação
COMMENT ON COLUMN financeiro.transaction_type IS 'Tipo de transação: expense (despesa) ou revenue (receita)';
