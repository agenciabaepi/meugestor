-- Migration: Reestrutura remuneração de funcionários e pagamentos (orientado a regras)
-- Data: 2026-01-20
-- Aditiva: mantém colunas legadas (tipo, salario_base, referencia, status) para compatibilidade,
--          mas a lógica nova deve usar remuneracao_tipo + competência (ano/mes/quinzena).

-- ============================================
-- FUNCIONÁRIOS: regra/contrato (não pagamento)
-- ============================================

DO $$
BEGIN
  IF to_regclass('public.funcionarios') IS NULL THEN
    RAISE NOTICE 'Tabela public.funcionarios não existe. Pulei alterações de remuneração nesta migration (aplique as migrations base primeiro).';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'funcionarios' AND column_name = 'remuneracao_tipo'
  ) THEN
    ALTER TABLE funcionarios
      ADD COLUMN remuneracao_tipo TEXT NOT NULL DEFAULT 'mensal'
        CHECK (remuneracao_tipo IN ('mensal', 'quinzenal', 'diaria')),
      ADD COLUMN remuneracao_valor NUMERIC(10,2) NULL CHECK (remuneracao_valor IS NULL OR remuneracao_valor > 0),
      ADD COLUMN remuneracao_regra JSONB NULL;
  END IF;
END $$;

-- Backfill: se já existe salario_base, usa como valor padrão da remuneração (prioridade para dados existentes)
DO $$
BEGIN
  IF to_regclass('public.funcionarios') IS NULL THEN
    RETURN;
  END IF;
  UPDATE funcionarios
  SET remuneracao_valor = COALESCE(remuneracao_valor, salario_base)
  WHERE remuneracao_valor IS NULL AND salario_base IS NOT NULL;
END $$;

DO $$
BEGIN
  IF to_regclass('public.funcionarios') IS NULL THEN
    RETURN;
  END IF;
  COMMENT ON COLUMN funcionarios.remuneracao_tipo IS 'Regra de remuneração do funcionário: mensal | quinzenal | diaria';
  COMMENT ON COLUMN funcionarios.remuneracao_valor IS 'Valor base da remuneração conforme o tipo (mensal=por mês, quinzenal=por quinzena, diaria=por dia)';
  COMMENT ON COLUMN funcionarios.remuneracao_regra IS 'JSON opcional para extensões futuras (regras avançadas)';
END $$;

-- ============================================
-- PAGAMENTOS: evento (derivado do funcionário)
-- ============================================

DO $$
BEGIN
  IF to_regclass('public.pagamentos_funcionarios') IS NULL THEN
    RAISE NOTICE 'Tabela public.pagamentos_funcionarios não existe. Pulei alterações/índices de pagamentos nesta migration (aplique a migration 022_pagamentos_funcionarios.sql primeiro).';
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pagamentos_funcionarios' AND column_name = 'remuneracao_tipo'
  ) THEN
    ALTER TABLE pagamentos_funcionarios
      ADD COLUMN remuneracao_tipo TEXT NULL CHECK (remuneracao_tipo IN ('mensal', 'quinzenal', 'diaria')),
      ADD COLUMN competencia_ano INT NULL CHECK (competencia_ano IS NULL OR competencia_ano >= 2000),
      ADD COLUMN competencia_mes INT NULL CHECK (competencia_mes IS NULL OR (competencia_mes >= 1 AND competencia_mes <= 12)),
      ADD COLUMN competencia_quinzena INT NULL CHECK (competencia_quinzena IS NULL OR competencia_quinzena IN (1, 2)),
      ADD COLUMN quantidade_dias INT NULL CHECK (quantidade_dias IS NULL OR quantidade_dias > 0);
  END IF;
END $$;

-- Backfill de competência:
-- 1) Se referencia for MM/YYYY, usa ela; senão usa data_pagamento.
DO $$
BEGIN
  IF to_regclass('public.pagamentos_funcionarios') IS NULL THEN
    RETURN;
  END IF;
  UPDATE pagamentos_funcionarios
  SET
    remuneracao_tipo = COALESCE(remuneracao_tipo, 'mensal'),
    competencia_mes = COALESCE(
      competencia_mes,
      CASE
        WHEN referencia ~ '^[0-1][0-9]/[0-9]{4}$' THEN NULLIF(split_part(referencia, '/', 1), '')::INT
        ELSE EXTRACT(MONTH FROM data_pagamento)::INT
      END
    ),
    competencia_ano = COALESCE(
      competencia_ano,
      CASE
        WHEN referencia ~ '^[0-1][0-9]/[0-9]{4}$' THEN NULLIF(split_part(referencia, '/', 2), '')::INT
        ELSE EXTRACT(YEAR FROM data_pagamento)::INT
      END
    )
  WHERE remuneracao_tipo IS NULL OR competencia_mes IS NULL OR competencia_ano IS NULL;
END $$;

-- Garante NOT NULL (após backfill)
DO $$
BEGIN
  IF to_regclass('public.pagamentos_funcionarios') IS NULL THEN
    RETURN;
  END IF;
  -- remuneracao_tipo
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'pagamentos_funcionarios' AND column_name = 'remuneracao_tipo'
  ) THEN
    UPDATE pagamentos_funcionarios SET remuneracao_tipo = 'mensal' WHERE remuneracao_tipo IS NULL;
    ALTER TABLE pagamentos_funcionarios ALTER COLUMN remuneracao_tipo SET NOT NULL;
  END IF;

  -- competencia_mes / competencia_ano
  UPDATE pagamentos_funcionarios SET competencia_mes = EXTRACT(MONTH FROM data_pagamento)::INT WHERE competencia_mes IS NULL;
  UPDATE pagamentos_funcionarios SET competencia_ano = EXTRACT(YEAR FROM data_pagamento)::INT WHERE competencia_ano IS NULL;
  ALTER TABLE pagamentos_funcionarios ALTER COLUMN competencia_mes SET NOT NULL;
  ALTER TABLE pagamentos_funcionarios ALTER COLUMN competencia_ano SET NOT NULL;
END $$;

-- Constraint lógica por tipo:
-- - mensal: sem quinzena
-- - quinzenal: quinzena obrigatória (1|2)
-- - diaria: sem quinzena, pode ter quantidade_dias
DO $$
BEGIN
  IF to_regclass('public.pagamentos_funcionarios') IS NULL THEN
    RETURN;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_pagamentos_funcionarios_competencia_por_tipo'
  ) THEN
    ALTER TABLE pagamentos_funcionarios
      ADD CONSTRAINT chk_pagamentos_funcionarios_competencia_por_tipo
      CHECK (
        (remuneracao_tipo = 'mensal' AND competencia_quinzena IS NULL)
        OR (remuneracao_tipo = 'quinzenal' AND competencia_quinzena IN (1,2))
        OR (remuneracao_tipo = 'diaria' AND competencia_quinzena IS NULL)
      );
  END IF;
END $$;

-- Índices e travas de duplicidade (por competência)
DO $$
BEGIN
  IF to_regclass('public.pagamentos_funcionarios') IS NULL THEN
    RETURN;
  END IF;

  CREATE INDEX IF NOT EXISTS idx_pag_func_competencia
    ON pagamentos_funcionarios (empresa_id, competencia_ano, competencia_mes, remuneracao_tipo);

  CREATE INDEX IF NOT EXISTS idx_pag_func_funcionario_competencia
    ON pagamentos_funcionarios (empresa_id, funcionario_id, competencia_ano, competencia_mes, competencia_quinzena);

  -- 1 pagamento/mês para mensal (por funcionário)
  CREATE UNIQUE INDEX IF NOT EXISTS uniq_pag_func_mensal_por_mes
    ON pagamentos_funcionarios (tenant_id, empresa_id, funcionario_id, competencia_ano, competencia_mes)
    WHERE remuneracao_tipo = 'mensal';

  -- 1 pagamento por quinzena para quinzenal
  CREATE UNIQUE INDEX IF NOT EXISTS uniq_pag_func_quinzenal_por_quinzena
    ON pagamentos_funcionarios (tenant_id, empresa_id, funcionario_id, competencia_ano, competencia_mes, competencia_quinzena)
    WHERE remuneracao_tipo = 'quinzenal';

  COMMENT ON COLUMN pagamentos_funcionarios.remuneracao_tipo IS 'Snapshot do tipo de remuneração usado no evento de pagamento';
  COMMENT ON COLUMN pagamentos_funcionarios.competencia_mes IS 'Mês de competência do pagamento (regra), não necessariamente data do evento';
  COMMENT ON COLUMN pagamentos_funcionarios.competencia_ano IS 'Ano de competência do pagamento (regra)';
  COMMENT ON COLUMN pagamentos_funcionarios.competencia_quinzena IS 'Quinzena (1 ou 2) quando tipo=quinzenal';
  COMMENT ON COLUMN pagamentos_funcionarios.quantidade_dias IS 'Quantidade de dias quando tipo=diaria (opcional)';
END $$;

