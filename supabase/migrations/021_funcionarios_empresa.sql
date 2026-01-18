-- Migration: Funcionários (modo empresa)
-- Baseado em supabase/migrations/funcionarios.md
-- Aditiva: não altera modo pessoal.

-- Reusa normalize_list_name (migrations 015/017/020). Se não existir, cria versão mínima.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'normalize_list_name') THEN
    CREATE EXTENSION IF NOT EXISTS unaccent;
    CREATE OR REPLACE FUNCTION normalize_list_name(input TEXT)
    RETURNS TEXT
    LANGUAGE plpgsql
    IMMUTABLE
    AS $fn$
    DECLARE s TEXT;
    BEGIN
      s := COALESCE(input, '');
      s := lower(unaccent(s));
      s := regexp_replace(s, '\m(de|da|do|das|dos|para|pra|por|com)\M', ' ', 'g');
      s := regexp_replace(s, '[^a-z0-9]+', ' ', 'g');
      s := trim(regexp_replace(s, '\s+', ' ', 'g'));
      RETURN s;
    END;
    $fn$;
  END IF;
END;
$$;

-- ============================================
-- FUNCIONÁRIOS
-- ============================================

CREATE TABLE IF NOT EXISTS funcionarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome_original TEXT NOT NULL,
  nome_normalizado TEXT,
  cargo TEXT,
  salario_base NUMERIC,
  tipo TEXT CHECK (tipo IN ('fixo', 'freelancer', 'temporario')),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_funcionarios_tenant_id ON funcionarios(tenant_id);
CREATE INDEX IF NOT EXISTS idx_funcionarios_empresa_id ON funcionarios(empresa_id);
CREATE INDEX IF NOT EXISTS idx_funcionarios_ativo ON funcionarios(empresa_id, ativo);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_funcionarios_tenant_empresa_nome_normalizado
  ON funcionarios (tenant_id, empresa_id, nome_normalizado);

-- Backfill de nome_normalizado (se houver dados existentes)
UPDATE funcionarios
SET nome_normalizado = COALESCE(nome_normalizado, normalize_list_name(nome_original))
WHERE nome_normalizado IS NULL;

-- ============================================
-- RLS (Row Level Security) para funcionários
-- ============================================

ALTER TABLE funcionarios ENABLE ROW LEVEL SECURITY;

-- Policy: usuários só veem funcionários da sua empresa (modo empresa)
CREATE POLICY funcionarios_tenant_empresa_isolation
  ON funcionarios
  FOR ALL
  USING (
    tenant_id = current_setting('app.tenant_id', TRUE)::UUID
    AND empresa_id = current_setting('app.empresa_id', TRUE)::UUID
  );

-- ============================================
-- ATUALIZAÇÃO: adicionar funcionario_id em financeiro_empresa (se não existir)
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'financeiro_empresa' AND column_name = 'funcionario_id'
  ) THEN
    ALTER TABLE financeiro_empresa
    ADD COLUMN funcionario_id UUID REFERENCES funcionarios(id) ON DELETE SET NULL;

    CREATE INDEX IF NOT EXISTS idx_financeiro_empresa_funcionario
      ON financeiro_empresa(empresa_id, funcionario_id);
  END IF;
END;
$$;

-- ============================================
-- COMENTÁRIOS (DOCUMENTAÇÃO)
-- ============================================

COMMENT ON TABLE funcionarios IS 'Funcionários cadastrados no modo empresa. Normalização de nome para evitar duplicatas.';
COMMENT ON COLUMN funcionarios.nome_original IS 'Nome original (exibido ao usuário)';
COMMENT ON COLUMN funcionarios.nome_normalizado IS 'Nome normalizado (usado para comparação e busca)';
COMMENT ON COLUMN funcionarios.tipo IS 'Tipo: fixo (CLT), freelancer, temporario';
COMMENT ON COLUMN funcionarios.ativo IS 'Funcionário ativo (true) ou inativo (false)';
