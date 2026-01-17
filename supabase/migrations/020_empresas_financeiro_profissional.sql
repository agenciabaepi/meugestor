-- Migration: Financeiro empresarial profissional (categorias/subcategorias/fornecedores/gastos)
-- Baseado em supabase/migrations/empresas.md
-- Aditiva: não altera modo pessoal.

-- Reusa normalize_list_name (migrations 015/017). Se não existir, cria versão mínima.
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
-- CATEGORIAS EMPRESA
-- ============================================

CREATE TABLE IF NOT EXISTS categorias_empresa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  nome_normalizado TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN ('fixo', 'variavel')),
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categorias_empresa_tenant_id ON categorias_empresa(tenant_id);
CREATE INDEX IF NOT EXISTS idx_categorias_empresa_empresa_id ON categorias_empresa(empresa_id);
CREATE INDEX IF NOT EXISTS idx_categorias_empresa_tipo ON categorias_empresa(tenant_id, empresa_id, tipo);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_categorias_empresa_tenant_empresa_nome_normalizado
  ON categorias_empresa (tenant_id, empresa_id, nome_normalizado);

-- Backfill de nome_normalizado
UPDATE categorias_empresa
SET nome_normalizado = COALESCE(nome_normalizado, normalize_list_name(nome))
WHERE nome_normalizado IS NULL;

-- ============================================
-- SUBCATEGORIAS EMPRESA
-- ============================================

CREATE TABLE IF NOT EXISTS subcategorias_empresa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  categoria_id UUID NOT NULL REFERENCES categorias_empresa(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  nome_normalizado TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subcategorias_empresa_tenant_id ON subcategorias_empresa(tenant_id);
CREATE INDEX IF NOT EXISTS idx_subcategorias_empresa_empresa_id ON subcategorias_empresa(empresa_id);
CREATE INDEX IF NOT EXISTS idx_subcategorias_empresa_categoria_id ON subcategorias_empresa(categoria_id);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_subcategorias_empresa_categoria_nome_normalizado
  ON subcategorias_empresa (categoria_id, nome_normalizado);

UPDATE subcategorias_empresa
SET nome_normalizado = COALESCE(nome_normalizado, normalize_list_name(nome))
WHERE nome_normalizado IS NULL;

-- ============================================
-- FORNECEDORES
-- ============================================

CREATE TABLE IF NOT EXISTS fornecedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  nome_normalizado TEXT,
  telefone TEXT,
  email TEXT,
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fornecedores_tenant_id ON fornecedores(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fornecedores_empresa_id ON fornecedores(empresa_id);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_fornecedores_tenant_empresa_nome_normalizado
  ON fornecedores (tenant_id, empresa_id, nome_normalizado);

UPDATE fornecedores
SET nome_normalizado = COALESCE(nome_normalizado, normalize_list_name(nome))
WHERE nome_normalizado IS NULL;

-- ============================================
-- GASTOS EMPRESA
-- ============================================

CREATE TABLE IF NOT EXISTS gastos_empresa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  categoria_id UUID NOT NULL REFERENCES categorias_empresa(id) ON DELETE RESTRICT,
  subcategoria_id UUID REFERENCES subcategorias_empresa(id) ON DELETE SET NULL,
  fornecedor_id UUID REFERENCES fornecedores(id) ON DELETE SET NULL,
  descricao TEXT NOT NULL,
  quantidade NUMERIC,
  valor_unitario NUMERIC,
  valor_total NUMERIC NOT NULL CHECK (valor_total > 0),
  data DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gastos_empresa_tenant_id ON gastos_empresa(tenant_id);
CREATE INDEX IF NOT EXISTS idx_gastos_empresa_empresa_id ON gastos_empresa(empresa_id);
CREATE INDEX IF NOT EXISTS idx_gastos_empresa_date ON gastos_empresa(empresa_id, data);
CREATE INDEX IF NOT EXISTS idx_gastos_empresa_categoria ON gastos_empresa(empresa_id, categoria_id);
CREATE INDEX IF NOT EXISTS idx_gastos_empresa_fornecedor ON gastos_empresa(empresa_id, fornecedor_id);

-- ============================================
-- SEED: categorias default por empresa
-- ============================================

CREATE OR REPLACE FUNCTION public.seed_categorias_empresa_defaults(p_tenant UUID, p_empresa UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n TEXT;
BEGIN
  -- Fixas
  FOREACH n IN ARRAY ARRAY[
    'Aluguel',
    'Água',
    'Energia elétrica',
    'Internet / Telefonia',
    'Funcionários',
    'Pró-labore',
    'Contabilidade',
    'Impostos e taxas',
    'Sistemas / Software',
    'Marketing',
    'Manutenção',
    'Limpeza',
    'Seguro',
    'Transporte / Logística'
  ]
  LOOP
    INSERT INTO categorias_empresa (tenant_id, empresa_id, nome, nome_normalizado, tipo, is_default)
    VALUES (p_tenant, p_empresa, n, normalize_list_name(n), 'fixo', TRUE)
    ON CONFLICT (tenant_id, empresa_id, nome_normalizado) DO NOTHING;
  END LOOP;

  -- Variáveis
  FOREACH n IN ARRAY ARRAY[
    'Materiais',
    'Produtos',
    'Fornecedores',
    'Compras operacionais',
    'Serviços terceirizados',
    'Equipamentos',
    'Ferramentas',
    'Estoque'
  ]
  LOOP
    INSERT INTO categorias_empresa (tenant_id, empresa_id, nome, nome_normalizado, tipo, is_default)
    VALUES (p_tenant, p_empresa, n, normalize_list_name(n), 'variavel', TRUE)
    ON CONFLICT (tenant_id, empresa_id, nome_normalizado) DO NOTHING;
  END LOOP;
END;
$$;

-- Função wrapper para trigger (mantém assinatura padrão)
CREATE OR REPLACE FUNCTION public._trg_seed_categorias_empresa_defaults()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.seed_categorias_empresa_defaults(NEW.tenant_id, NEW.id);
  RETURN NEW;
END;
$$;

-- Trigger: ao criar empresa, semear defaults
DROP TRIGGER IF EXISTS trg_seed_categorias_empresa_defaults ON empresas;
CREATE TRIGGER trg_seed_categorias_empresa_defaults
  AFTER INSERT ON empresas
  FOR EACH ROW
  EXECUTE FUNCTION public._trg_seed_categorias_empresa_defaults();

-- Backfill: semear defaults para empresas existentes
DO $$
DECLARE
  e RECORD;
BEGIN
  FOR e IN SELECT id, tenant_id FROM empresas LOOP
    PERFORM public.seed_categorias_empresa_defaults(e.tenant_id, e.id);
  END LOOP;
END;
$$;

-- ============================================
-- RLS
-- ============================================

ALTER TABLE categorias_empresa ENABLE ROW LEVEL SECURITY;
ALTER TABLE subcategorias_empresa ENABLE ROW LEVEL SECURITY;
ALTER TABLE fornecedores ENABLE ROW LEVEL SECURITY;
ALTER TABLE gastos_empresa ENABLE ROW LEVEL SECURITY;

-- Categorias Empresa
DROP POLICY IF EXISTS "Users can access categorias_empresa (empresa mode)" ON categorias_empresa;
CREATE POLICY "Users can access categorias_empresa (empresa mode)"
  ON categorias_empresa FOR ALL
  USING (
    tenant_id = public.current_tenant_id()
    AND empresa_id = public.current_empresa_id()
    AND public.current_mode() = 'empresa'
  )
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND empresa_id = public.current_empresa_id()
    AND public.current_mode() = 'empresa'
  );

-- Proíbe deletar categorias default
DROP POLICY IF EXISTS "Users can delete non-default categorias_empresa (empresa mode)" ON categorias_empresa;
CREATE POLICY "Users can delete non-default categorias_empresa (empresa mode)"
  ON categorias_empresa FOR DELETE
  USING (
    tenant_id = public.current_tenant_id()
    AND empresa_id = public.current_empresa_id()
    AND public.current_mode() = 'empresa'
    AND is_default = FALSE
  );

-- Subcategorias Empresa
DROP POLICY IF EXISTS "Users can access subcategorias_empresa (empresa mode)" ON subcategorias_empresa;
CREATE POLICY "Users can access subcategorias_empresa (empresa mode)"
  ON subcategorias_empresa FOR ALL
  USING (
    tenant_id = public.current_tenant_id()
    AND empresa_id = public.current_empresa_id()
    AND public.current_mode() = 'empresa'
  )
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND empresa_id = public.current_empresa_id()
    AND public.current_mode() = 'empresa'
  );

-- Fornecedores
DROP POLICY IF EXISTS "Users can access fornecedores (empresa mode)" ON fornecedores;
CREATE POLICY "Users can access fornecedores (empresa mode)"
  ON fornecedores FOR ALL
  USING (
    tenant_id = public.current_tenant_id()
    AND empresa_id = public.current_empresa_id()
    AND public.current_mode() = 'empresa'
  )
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND empresa_id = public.current_empresa_id()
    AND public.current_mode() = 'empresa'
  );

-- Gastos Empresa
DROP POLICY IF EXISTS "Users can access gastos_empresa (empresa mode)" ON gastos_empresa;
CREATE POLICY "Users can access gastos_empresa (empresa mode)"
  ON gastos_empresa FOR ALL
  USING (
    tenant_id = public.current_tenant_id()
    AND empresa_id = public.current_empresa_id()
    AND public.current_mode() = 'empresa'
  )
  WITH CHECK (
    tenant_id = public.current_tenant_id()
    AND empresa_id = public.current_empresa_id()
    AND public.current_mode() = 'empresa'
  );

