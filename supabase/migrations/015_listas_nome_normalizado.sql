-- Migration: Listas com nome_original + nome_normalizado (anti-duplicação semântica)
-- Objetivo:
-- - Evitar listas duplicadas por variações (de/da/do, plural simples, acentos)
-- - Manter nome_original para exibição e nome_normalizado para comparação
-- - Deduplicar listas existentes (merge de itens) antes de criar índice único

-- Extensão para remover acentos
CREATE EXTENSION IF NOT EXISTS unaccent;

-- ============================================
-- Função de normalização (SQL) - deve refletir regra do backend
-- lowercase, remove acentos, remove stopwords, trim, plural simples, colapsa espaços
-- ============================================
CREATE OR REPLACE FUNCTION normalize_list_name(input TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  s TEXT;
BEGIN
  s := COALESCE(input, '');
  s := lower(unaccent(s));

  -- remove stopwords como palavras inteiras
  s := regexp_replace(s, '\m(de|da|do|das|dos|para)\M', ' ', 'g');

  -- troca caracteres não-letra/número por espaço (mantém iPhone, números etc)
  s := regexp_replace(s, '[^a-z0-9]+', ' ', 'g');

  -- plural simples: protege palavras terminando em "ss", remove "s" final de palavras >=4
  s := regexp_replace(s, '([a-z]{2,})ss\b', '\1ss__', 'g');
  s := regexp_replace(s, '([a-z]{4,})s\b', '\1', 'g');
  s := regexp_replace(s, 'ss__\b', 'ss', 'g');

  -- trim + colapsa espaços
  s := trim(regexp_replace(s, '\s+', ' ', 'g'));

  RETURN s;
END;
$$;

-- ============================================
-- Colunas novas
-- ============================================
ALTER TABLE listas
  ADD COLUMN IF NOT EXISTS nome_original TEXT,
  ADD COLUMN IF NOT EXISTS nome_normalizado TEXT;

-- Backfill básico (mantém nome existente como original)
UPDATE listas
SET
  nome_original = COALESCE(nome_original, nome),
  nome_normalizado = COALESCE(nome_normalizado, normalize_list_name(COALESCE(nome_original, nome)))
WHERE nome_original IS NULL OR nome_normalizado IS NULL;

-- ============================================
-- Deduplicação: merge de listas com mesmo nome_normalizado por tenant
-- - Move itens sem conflito (case-insensitive)
-- - Para conflitos, mantém 1 item e "promove" status para pendente quando necessário
-- - Depois remove listas duplicadas
-- ============================================
DO $$
DECLARE
  grp RECORD;
  canonical_id UUID;
  dup_id UUID;
BEGIN
  FOR grp IN
    SELECT tenant_id, nome_normalizado
    FROM listas
    WHERE nome_normalizado IS NOT NULL AND nome_normalizado <> ''
    GROUP BY tenant_id, nome_normalizado
    HAVING COUNT(*) > 1
  LOOP
    -- Escolhe canônica: mais antiga (created_at)
    SELECT id INTO canonical_id
    FROM listas
    WHERE tenant_id = grp.tenant_id AND nome_normalizado = grp.nome_normalizado
    ORDER BY created_at ASC
    LIMIT 1;

    FOR dup_id IN
      SELECT id
      FROM listas
      WHERE tenant_id = grp.tenant_id AND nome_normalizado = grp.nome_normalizado AND id <> canonical_id
    LOOP
      -- Move itens que não conflitam (lower(nome)) para lista canônica
      UPDATE lista_itens li
      SET lista_id = canonical_id
      WHERE li.lista_id = dup_id
        AND NOT EXISTS (
          SELECT 1
          FROM lista_itens ci
          WHERE ci.lista_id = canonical_id
            AND lower(ci.nome) = lower(li.nome)
        );

      -- Para itens que conflitam: atualiza o item canônico quando duplicado tem info melhor
      UPDATE lista_itens ci
      SET
        status = CASE
          WHEN ci.status = 'comprado' AND di.status = 'pendente' THEN 'pendente'
          ELSE ci.status
        END,
        quantidade = COALESCE(ci.quantidade, di.quantidade),
        unidade = COALESCE(ci.unidade, di.unidade),
        updated_at = NOW()
      FROM lista_itens di
      WHERE ci.lista_id = canonical_id
        AND di.lista_id = dup_id
        AND lower(ci.nome) = lower(di.nome);

      -- Remove itens restantes da lista duplicada (já mesclados)
      DELETE FROM lista_itens WHERE lista_id = dup_id;

      -- Remove lista duplicada
      DELETE FROM listas WHERE id = dup_id;
    END LOOP;
  END LOOP;
END;
$$;

-- ============================================
-- Índices: nome_normalizado único por tenant
-- ============================================
CREATE UNIQUE INDEX IF NOT EXISTS uniq_listas_tenant_nome_normalizado
  ON listas (tenant_id, nome_normalizado);

CREATE INDEX IF NOT EXISTS idx_listas_nome_normalizado
  ON listas (nome_normalizado);

