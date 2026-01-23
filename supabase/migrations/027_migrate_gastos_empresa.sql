-- Migration: Migra gastos existentes de financeiro_empresa para gastos_empresa
-- Data: 2026-01-20
-- Descrição: Migra todos os gastos (expenses) já cadastrados em financeiro_empresa para a tabela gastos_empresa

-- ============================================
-- FUNÇÃO AUXILIAR: Busca ou cria categoria
-- ============================================

CREATE OR REPLACE FUNCTION get_or_create_categoria_empresa(
  p_tenant_id UUID,
  p_empresa_id UUID,
  p_nome TEXT
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_nome_normalizado TEXT;
  v_categoria_id UUID;
BEGIN
  -- Normaliza o nome
  v_nome_normalizado := normalize_list_name(p_nome);
  
  IF v_nome_normalizado IS NULL OR v_nome_normalizado = '' THEN
    RETURN NULL;
  END IF;
  
  -- Tenta buscar categoria existente
  SELECT id INTO v_categoria_id
  FROM categorias_empresa
  WHERE tenant_id = p_tenant_id
    AND empresa_id = p_empresa_id
    AND nome_normalizado = v_nome_normalizado
  LIMIT 1;
  
  -- Se encontrou, retorna
  IF v_categoria_id IS NOT NULL THEN
    RETURN v_categoria_id;
  END IF;
  
  -- Cria nova categoria (tipo variável por padrão)
  INSERT INTO categorias_empresa (tenant_id, empresa_id, nome, nome_normalizado, tipo, is_default)
  VALUES (p_tenant_id, p_empresa_id, p_nome, v_nome_normalizado, 'variavel', FALSE)
  ON CONFLICT (tenant_id, empresa_id, nome_normalizado) DO NOTHING
  RETURNING id INTO v_categoria_id;
  
  -- Se ainda não tem ID (conflito), busca novamente
  IF v_categoria_id IS NULL THEN
    SELECT id INTO v_categoria_id
    FROM categorias_empresa
    WHERE tenant_id = p_tenant_id
      AND empresa_id = p_empresa_id
      AND nome_normalizado = v_nome_normalizado
    LIMIT 1;
  END IF;
  
  RETURN v_categoria_id;
END;
$$;

-- ============================================
-- FUNÇÃO AUXILIAR: Busca ou cria subcategoria
-- ============================================

CREATE OR REPLACE FUNCTION get_or_create_subcategoria_empresa(
  p_tenant_id UUID,
  p_empresa_id UUID,
  p_categoria_id UUID,
  p_nome TEXT
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_nome_normalizado TEXT;
  v_subcategoria_id UUID;
BEGIN
  -- Se nome vazio, retorna NULL
  IF p_nome IS NULL OR TRIM(p_nome) = '' THEN
    RETURN NULL;
  END IF;
  
  -- Normaliza o nome
  v_nome_normalizado := normalize_list_name(p_nome);
  
  IF v_nome_normalizado IS NULL OR v_nome_normalizado = '' THEN
    RETURN NULL;
  END IF;
  
  -- Tenta buscar subcategoria existente
  SELECT id INTO v_subcategoria_id
  FROM subcategorias_empresa
  WHERE categoria_id = p_categoria_id
    AND nome_normalizado = v_nome_normalizado
  LIMIT 1;
  
  -- Se encontrou, retorna
  IF v_subcategoria_id IS NOT NULL THEN
    RETURN v_subcategoria_id;
  END IF;
  
  -- Cria nova subcategoria
  INSERT INTO subcategorias_empresa (tenant_id, empresa_id, categoria_id, nome, nome_normalizado)
  VALUES (p_tenant_id, p_empresa_id, p_categoria_id, p_nome, v_nome_normalizado)
  ON CONFLICT (categoria_id, nome_normalizado) DO NOTHING
  RETURNING id INTO v_subcategoria_id;
  
  -- Se ainda não tem ID (conflito), busca novamente
  IF v_subcategoria_id IS NULL THEN
    SELECT id INTO v_subcategoria_id
    FROM subcategorias_empresa
    WHERE categoria_id = p_categoria_id
      AND nome_normalizado = v_nome_normalizado
    LIMIT 1;
  END IF;
  
  RETURN v_subcategoria_id;
END;
$$;

-- ============================================
-- FUNÇÃO AUXILIAR: Busca fornecedor pela descrição
-- ============================================

CREATE OR REPLACE FUNCTION find_fornecedor_by_description(
  p_tenant_id UUID,
  p_empresa_id UUID,
  p_description TEXT
)
RETURNS UUID
LANGUAGE plpgsql
AS $$
DECLARE
  v_fornecedor_id UUID;
  v_supplier_name TEXT;
  v_nome_normalizado TEXT;
BEGIN
  -- Tenta extrair nome do fornecedor da descrição
  -- Padrões: "no fornecedor X", "fornecedor X", "com X"
  v_supplier_name := NULL;
  
  -- Padrão: "no fornecedor X"
  SELECT regexp_replace(
    (regexp_match(p_description, '\bno\s+fornecedor\s+([^.,;!\n]+)', 'i'))[1],
    '^["'']+|["'']+$', '', 'g'
  ) INTO v_supplier_name;
  
  -- Se não encontrou, tenta: "fornecedor X"
  IF v_supplier_name IS NULL OR TRIM(v_supplier_name) = '' THEN
    SELECT regexp_replace(
      (regexp_match(p_description, '\bfornecedor\s+([^.,;!\n]+)', 'i'))[1],
      '^["'']+|["'']+$', '', 'g'
    ) INTO v_supplier_name;
  END IF;
  
  -- Se não encontrou, retorna NULL
  IF v_supplier_name IS NULL OR TRIM(v_supplier_name) = '' THEN
    RETURN NULL;
  END IF;
  
  -- Normaliza e busca
  v_nome_normalizado := normalize_list_name(TRIM(v_supplier_name));
  
  IF v_nome_normalizado IS NULL OR v_nome_normalizado = '' THEN
    RETURN NULL;
  END IF;
  
  SELECT id INTO v_fornecedor_id
  FROM fornecedores
  WHERE tenant_id = p_tenant_id
    AND empresa_id = p_empresa_id
    AND nome_normalizado = v_nome_normalizado
  LIMIT 1;
  
  RETURN v_fornecedor_id;
END;
$$;

-- ============================================
-- MIGRAÇÃO: Migra gastos existentes
-- ============================================

DO $$
DECLARE
  v_record RECORD;
  v_categoria_id UUID;
  v_subcategoria_id UUID;
  v_fornecedor_id UUID;
  v_metadata JSONB;
  v_fornecedor_metadata JSONB;
  v_count INTEGER := 0;
  v_errors INTEGER := 0;
BEGIN
  -- Loop por todos os gastos (expenses) em financeiro_empresa
  FOR v_record IN
    SELECT 
      id,
      tenant_id,
      empresa_id,
      amount,
      description,
      category,
      subcategory,
      date,
      metadata,
      created_at
    FROM financeiro_empresa
    WHERE transaction_type = 'expense'
    ORDER BY created_at ASC
  LOOP
    BEGIN
      -- Busca ou cria categoria
      v_categoria_id := get_or_create_categoria_empresa(
        v_record.tenant_id,
        v_record.empresa_id,
        v_record.category
      );
      
      -- Se não conseguiu criar/buscar categoria, pula
      IF v_categoria_id IS NULL THEN
        RAISE WARNING 'Não foi possível criar/buscar categoria para gasto %: %', v_record.id, v_record.category;
        v_errors := v_errors + 1;
        CONTINUE;
      END IF;
      
      -- Busca ou cria subcategoria (se houver)
      v_subcategoria_id := NULL;
      IF v_record.subcategory IS NOT NULL AND TRIM(v_record.subcategory) != '' THEN
        v_subcategoria_id := get_or_create_subcategoria_empresa(
          v_record.tenant_id,
          v_record.empresa_id,
          v_categoria_id,
          v_record.subcategory
        );
      END IF;
      
      -- Busca fornecedor
      v_fornecedor_id := NULL;
      
      -- Primeiro tenta do metadata
      IF v_record.metadata IS NOT NULL AND jsonb_typeof(v_record.metadata) = 'object' THEN
        IF v_record.metadata ? 'fornecedor' THEN
          v_fornecedor_metadata := v_record.metadata->'fornecedor';
          IF v_fornecedor_metadata IS NOT NULL AND jsonb_typeof(v_fornecedor_metadata) = 'object' THEN
            IF v_fornecedor_metadata ? 'id' THEN
              v_fornecedor_id := (v_fornecedor_metadata->>'id')::UUID;
            END IF;
          END IF;
        END IF;
      END IF;
      
      -- Se não encontrou no metadata, tenta pela descrição
      IF v_fornecedor_id IS NULL THEN
        v_fornecedor_id := find_fornecedor_by_description(
          v_record.tenant_id,
          v_record.empresa_id,
          v_record.description
        );
      END IF;
      
      -- Verifica se já existe um gasto_empresa para este financeiro_empresa (evita duplicação)
      IF EXISTS (
        SELECT 1 FROM gastos_empresa
        WHERE tenant_id = v_record.tenant_id
          AND empresa_id = v_record.empresa_id
          AND descricao = v_record.description
          AND valor_total = v_record.amount
          AND data = v_record.date
          AND categoria_id = v_categoria_id
      ) THEN
        -- Já existe, pula
        CONTINUE;
      END IF;
      
      -- Insere em gastos_empresa
      INSERT INTO gastos_empresa (
        tenant_id,
        empresa_id,
        categoria_id,
        subcategoria_id,
        fornecedor_id,
        descricao,
        quantidade,
        valor_unitario,
        valor_total,
        data,
        created_at
      )
      VALUES (
        v_record.tenant_id,
        v_record.empresa_id,
        v_categoria_id,
        v_subcategoria_id,
        v_fornecedor_id,
        v_record.description,
        NULL, -- quantidade (não temos essa info nos dados antigos)
        NULL, -- valor_unitario (não temos essa info nos dados antigos)
        v_record.amount,
        v_record.date,
        v_record.created_at
      );
      
      v_count := v_count + 1;
      
    EXCEPTION
      WHEN OTHERS THEN
        -- Loga erro mas continua
        RAISE WARNING 'Erro ao migrar gasto %: %', v_record.id, SQLERRM;
        v_errors := v_errors + 1;
    END;
  END LOOP;
  
  -- Log final
  RAISE NOTICE 'Migração concluída: % gastos migrados, % erros', v_count, v_errors;
END;
$$;

-- ============================================
-- LIMPEZA: Remove funções auxiliares temporárias
-- ============================================

DROP FUNCTION IF EXISTS get_or_create_categoria_empresa(UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS get_or_create_subcategoria_empresa(UUID, UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS find_fornecedor_by_description(UUID, UUID, TEXT);

-- ============================================
-- COMENTÁRIOS
-- ============================================

COMMENT ON TABLE gastos_empresa IS 'Tabela de gastos empresariais. Todos os gastos (expenses) de financeiro_empresa devem ser registrados aqui também.';
