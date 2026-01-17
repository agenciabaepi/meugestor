-- Migration: lista_itens com nome_original/nome_normalizado + checked + quantidade numérica
-- Objetivo: UX estilo Alexa (sem duplicação por variação de nome) e modelo "checked"

-- Garante normalize_list_name existente (migration 015). Se não existir, cria uma versão mínima.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'normalize_list_name'
  ) THEN
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
      s := regexp_replace(s, '\m(de|da|do|das|dos|para|pra)\M', ' ', 'g');
      s := regexp_replace(s, '[^a-z0-9]+', ' ', 'g');
      s := trim(regexp_replace(s, '\s+', ' ', 'g'));
      RETURN s;
    END;
    $fn$;
  END IF;
END;
$$;

ALTER TABLE lista_itens
  ADD COLUMN IF NOT EXISTS nome_original TEXT,
  ADD COLUMN IF NOT EXISTS nome_normalizado TEXT,
  ADD COLUMN IF NOT EXISTS checked BOOLEAN,
  ADD COLUMN IF NOT EXISTS quantidade_num NUMERIC;

-- Backfill
UPDATE lista_itens
SET
  nome_original = COALESCE(nome_original, nome),
  nome_normalizado = COALESCE(nome_normalizado, normalize_list_name(COALESCE(nome_original, nome))),
  checked = COALESCE(checked, CASE WHEN status = 'comprado' THEN TRUE ELSE FALSE END),
  quantidade_num = COALESCE(
    quantidade_num,
    CASE
      WHEN quantidade ~ '^\s*\d+(\.\d+)?\s*$' THEN quantidade::numeric
      ELSE NULL
    END
  )
WHERE nome_original IS NULL OR nome_normalizado IS NULL OR checked IS NULL OR quantidade_num IS NULL;

-- Deduplicação por (lista_id, nome_normalizado) antes do índice único
DO $$
DECLARE
  grp RECORD;
  canonical_id UUID;
  dup_id UUID;
BEGIN
  FOR grp IN
    SELECT lista_id, nome_normalizado
    FROM lista_itens
    WHERE nome_normalizado IS NOT NULL AND nome_normalizado <> ''
    GROUP BY lista_id, nome_normalizado
    HAVING COUNT(*) > 1
  LOOP
    SELECT id INTO canonical_id
    FROM lista_itens
    WHERE lista_id = grp.lista_id AND nome_normalizado = grp.nome_normalizado
    ORDER BY created_at ASC
    LIMIT 1;

    FOR dup_id IN
      SELECT id
      FROM lista_itens
      WHERE lista_id = grp.lista_id AND nome_normalizado = grp.nome_normalizado AND id <> canonical_id
    LOOP
      -- Mescla campos úteis: se algum duplicado está checked, mantém checked=true;
      -- quantidade_num / quantidade / unidade: mantém o primeiro não-null.
      UPDATE lista_itens c
      SET
        checked = (COALESCE(c.checked, FALSE) OR COALESCE(d.checked, FALSE)),
        status = CASE
          WHEN (COALESCE(c.checked, FALSE) OR COALESCE(d.checked, FALSE)) THEN 'comprado'
          ELSE 'pendente'
        END,
        quantidade_num = COALESCE(c.quantidade_num, d.quantidade_num),
        quantidade = COALESCE(c.quantidade, d.quantidade),
        unidade = COALESCE(c.unidade, d.unidade),
        updated_at = NOW()
      FROM lista_itens d
      WHERE c.id = canonical_id AND d.id = dup_id;

      DELETE FROM lista_itens WHERE id = dup_id;
    END LOOP;
  END LOOP;
END;
$$;

-- Evita duplicação de itens por nome_normalizado (por lista)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_lista_itens_lista_nome_normalizado
  ON lista_itens (lista_id, nome_normalizado);

CREATE INDEX IF NOT EXISTS idx_lista_itens_nome_normalizado
  ON lista_itens (nome_normalizado);

