-- Migration: Adicionar funcionario_id em financeiro_empresa
-- Descrição: Garante que a coluna funcionario_id existe na tabela financeiro_empresa
-- Data: 2026-01-18
-- Aditiva: não altera funcionalidades existentes

-- ============================================
-- ADICIONAR COLUNA funcionario_id
-- ============================================

-- Verifica se a tabela financeiro_empresa existe
DO $$
BEGIN
  -- Verifica se a coluna já existe
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'financeiro_empresa' 
      AND column_name = 'funcionario_id'
  ) THEN
    -- Adiciona a coluna funcionario_id
    ALTER TABLE financeiro_empresa
    ADD COLUMN funcionario_id UUID REFERENCES funcionarios(id) ON DELETE SET NULL;

    -- Cria índice para performance
    CREATE INDEX IF NOT EXISTS idx_financeiro_empresa_funcionario_id 
      ON financeiro_empresa(funcionario_id);

    -- Cria índice composto para consultas frequentes
    CREATE INDEX IF NOT EXISTS idx_financeiro_empresa_empresa_funcionario 
      ON financeiro_empresa(empresa_id, funcionario_id);

    RAISE NOTICE 'Coluna funcionario_id adicionada com sucesso à tabela financeiro_empresa';
  ELSE
    RAISE NOTICE 'Coluna funcionario_id já existe na tabela financeiro_empresa';
  END IF;
END $$;

-- ============================================
-- COMENTÁRIOS (DOCUMENTAÇÃO)
-- ============================================

COMMENT ON COLUMN financeiro_empresa.funcionario_id IS 'ID do funcionário vinculado a este registro financeiro (para pagamentos de salário)';
