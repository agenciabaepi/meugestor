-- Migration: atualizar normalize_list_name (stopwords + caracteres especiais) e re-deduplicar listas
-- Inclui stopwords adicionais: por, com

CREATE EXTENSION IF NOT EXISTS unaccent;

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
  s := regexp_replace(s, '\m(de|da|do|das|dos|para|pra|por|com)\M', ' ', 'g');

  -- troca caracteres não-letra/número por espaço
  s := regexp_replace(s, '[^a-z0-9]+', ' ', 'g');

  -- plural simples: protege "ss", remove "s" final de palavras >=4
  s := regexp_replace(s, '([a-z]{2,})ss\b', '\1ss__', 'g');
  s := regexp_replace(s, '([a-z]{4,})s\b', '\1', 'g');
  s := regexp_replace(s, 'ss__\b', 'ss', 'g');

  -- trim + colapsa espaços
  s := trim(regexp_replace(s, '\s+', ' ', 'g'));

  RETURN s;
END;
$$;

-- Recalcula nome_normalizado com a função atualizada
UPDATE listas
SET
  nome_original = COALESCE(nome_original, nome),
  nome_normalizado = normalize_list_name(COALESCE(nome_original, nome)),
  updated_at = NOW()
WHERE TRUE;

-- Re-deduplicação (mesma lógica da migration 015, mas após atualização da função)
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
      -- Move itens sem conflito para canônica
      UPDATE lista_itens li
      SET lista_id = canonical_id
      WHERE li.lista_id = dup_id
        AND NOT EXISTS (
          SELECT 1
          FROM lista_itens ci
          WHERE ci.lista_id = canonical_id
            AND COALESCE(ci.nome_normalizado, lower(ci.nome)) = COALESCE(li.nome_normalizado, lower(li.nome))
        );

      -- Mescla conflitos (promove pendente quando necessário; preserva quantidade/unidade quando faltam)
      UPDATE lista_itens ci
      SET
        checked = (COALESCE(ci.checked, FALSE) OR COALESCE(di.checked, FALSE)),
        status = CASE
          WHEN (COALESCE(ci.checked, FALSE) OR COALESCE(di.checked, FALSE)) THEN 'comprado'
          ELSE 'pendente'
        END,
        quantidade_num = COALESCE(ci.quantidade_num, di.quantidade_num),
        quantidade = COALESCE(ci.quantidade, di.quantidade),
        unidade = COALESCE(ci.unidade, di.unidade),
        updated_at = NOW()
      FROM lista_itens di
      WHERE ci.lista_id = canonical_id
        AND di.lista_id = dup_id
        AND COALESCE(ci.nome_normalizado, lower(ci.nome)) = COALESCE(di.nome_normalizado, lower(di.nome));

      -- Remove itens restantes da duplicada e a lista
      DELETE FROM lista_itens WHERE lista_id = dup_id;
      DELETE FROM listas WHERE id = dup_id;
    END LOOP;
  END LOOP;
END;
$$;

-- Garante índice único
CREATE UNIQUE INDEX IF NOT EXISTS uniq_listas_tenant_nome_normalizado
  ON listas (tenant_id, nome_normalizado);

