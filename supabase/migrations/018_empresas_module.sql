-- Migration: Modo Empresa (empresas + tabelas paralelas) - ADITIVA
-- Objetivo:
-- - Adicionar suporte a "modo empresa" sem mexer em tabelas pessoais existentes
-- - Criar tabelas *_empresa e tabela empresas
-- - Adicionar colunas de contexto ao perfil do usuário (mode, empresa_id) quando possível
-- - Criar funções auxiliares para RLS (current_tenant_id/current_empresa_id/current_mode)

-- ============================================
-- FUNÇÕES AUXILIARES (RLS) - tolera users vs users_meugestor
-- ============================================

CREATE OR REPLACE FUNCTION public.current_tenant_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF to_regclass('public.users_meugestor') IS NOT NULL THEN
    RETURN (SELECT u.tenant_id FROM public.users_meugestor u WHERE u.id = auth.uid());
  ELSIF to_regclass('public.users') IS NOT NULL THEN
    RETURN (SELECT u.tenant_id FROM public.users u WHERE u.id = auth.uid());
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.current_empresa_id()
RETURNS UUID
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF to_regclass('public.users_meugestor') IS NOT NULL THEN
    RETURN (SELECT u.empresa_id FROM public.users_meugestor u WHERE u.id = auth.uid());
  ELSIF to_regclass('public.users') IS NOT NULL THEN
    RETURN (SELECT u.empresa_id FROM public.users u WHERE u.id = auth.uid());
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.current_mode()
RETURNS TEXT
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m TEXT;
BEGIN
  IF to_regclass('public.users_meugestor') IS NOT NULL THEN
    SELECT COALESCE(u.mode, 'pessoal') INTO m FROM public.users_meugestor u WHERE u.id = auth.uid();
    RETURN COALESCE(m, 'pessoal');
  ELSIF to_regclass('public.users') IS NOT NULL THEN
    SELECT COALESCE(u.mode, 'pessoal') INTO m FROM public.users u WHERE u.id = auth.uid();
    RETURN COALESCE(m, 'pessoal');
  END IF;
  RETURN 'pessoal';
END;
$$;

-- ============================================
-- TABELA EMPRESAS
-- ============================================

CREATE TABLE IF NOT EXISTS empresas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome_fantasia TEXT NOT NULL,
  razao_social TEXT,
  cnpj TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_empresas_tenant_id ON empresas(tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_empresas_tenant_nome_fantasia
  ON empresas (tenant_id, lower(nome_fantasia));

-- ============================================
-- PERFIL DO USUÁRIO: mode + empresa_id (ADITIVO)
-- ============================================

DO $$
BEGIN
  IF to_regclass('public.users_meugestor') IS NOT NULL THEN
    ALTER TABLE public.users_meugestor
      ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'pessoal' CHECK (mode IN ('pessoal', 'empresa')),
      ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id) ON DELETE SET NULL;
    ALTER TABLE public.users_meugestor
      ADD CONSTRAINT users_meugestor_mode_empresa_requires_empresa_id
      CHECK (mode <> 'empresa' OR empresa_id IS NOT NULL) NOT VALID;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    -- constraint já existe
    NULL;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.users') IS NOT NULL THEN
    ALTER TABLE public.users
      ADD COLUMN IF NOT EXISTS mode TEXT NOT NULL DEFAULT 'pessoal' CHECK (mode IN ('pessoal', 'empresa')),
      ADD COLUMN IF NOT EXISTS empresa_id UUID REFERENCES public.empresas(id) ON DELETE SET NULL;
    ALTER TABLE public.users
      ADD CONSTRAINT users_mode_empresa_requires_empresa_id
      CHECK (mode <> 'empresa' OR empresa_id IS NOT NULL) NOT VALID;
  END IF;
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END;
$$;

-- ============================================
-- FINANCEIRO_EMPRESA (espelho de financeiro)
-- ============================================

CREATE TABLE IF NOT EXISTS financeiro_empresa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  amount NUMERIC(10, 2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  date DATE NOT NULL,
  receipt_image_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  tags TEXT[],
  transaction_type TEXT NOT NULL DEFAULT 'expense' CHECK (transaction_type IN ('expense', 'revenue')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financeiro_empresa_tenant_id ON financeiro_empresa(tenant_id);
CREATE INDEX IF NOT EXISTS idx_financeiro_empresa_empresa_id ON financeiro_empresa(empresa_id);
CREATE INDEX IF NOT EXISTS idx_financeiro_empresa_date ON financeiro_empresa(date);
CREATE INDEX IF NOT EXISTS idx_financeiro_empresa_transaction_type ON financeiro_empresa(tenant_id, empresa_id, transaction_type);
CREATE INDEX IF NOT EXISTS idx_financeiro_empresa_user_id ON financeiro_empresa(user_id);
CREATE INDEX IF NOT EXISTS idx_financeiro_empresa_metadata ON financeiro_empresa USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_financeiro_empresa_tags ON financeiro_empresa USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_financeiro_empresa_category_subcategory ON financeiro_empresa(tenant_id, empresa_id, category, subcategory);

-- ============================================
-- COMPROMISSOS_EMPRESA (espelho de compromissos)
-- ============================================

CREATE TABLE IF NOT EXISTS compromissos_empresa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_at TIMESTAMPTZ NOT NULL,
  is_cancelled BOOLEAN DEFAULT FALSE,
  cancelled_at TIMESTAMPTZ,
  cancelled_by UUID,
  reminder_1h_sent BOOLEAN DEFAULT FALSE,
  reminder_30min_sent BOOLEAN DEFAULT FALSE,
  reminder_10min_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compromissos_empresa_tenant_id ON compromissos_empresa(tenant_id);
CREATE INDEX IF NOT EXISTS idx_compromissos_empresa_empresa_id ON compromissos_empresa(empresa_id);
CREATE INDEX IF NOT EXISTS idx_compromissos_empresa_scheduled_at ON compromissos_empresa(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_compromissos_empresa_user_id ON compromissos_empresa(user_id);
CREATE INDEX IF NOT EXISTS idx_compromissos_empresa_active
  ON compromissos_empresa(tenant_id, empresa_id, scheduled_at)
  WHERE is_cancelled = FALSE;

-- ============================================
-- LISTAS_EMPRESA + LISTA_ITENS_EMPRESA (espelho de listas/lista_itens)
-- ============================================

CREATE TABLE IF NOT EXISTS listas_empresa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  nome_original TEXT,
  nome_normalizado TEXT,
  tipo TEXT NOT NULL DEFAULT 'compras',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listas_empresa_tenant_id ON listas_empresa(tenant_id);
CREATE INDEX IF NOT EXISTS idx_listas_empresa_empresa_id ON listas_empresa(empresa_id);
CREATE INDEX IF NOT EXISTS idx_listas_empresa_tipo ON listas_empresa(tipo);
CREATE INDEX IF NOT EXISTS idx_listas_empresa_nome_normalizado ON listas_empresa(nome_normalizado);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_listas_empresa_tenant_empresa_nome_normalizado
  ON listas_empresa (tenant_id, empresa_id, nome_normalizado);

DROP TRIGGER IF EXISTS update_listas_empresa_updated_at ON listas_empresa;
CREATE TRIGGER update_listas_empresa_updated_at
  BEFORE UPDATE ON listas_empresa
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE IF NOT EXISTS lista_itens_empresa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lista_id UUID NOT NULL REFERENCES listas_empresa(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  nome_original TEXT,
  nome_normalizado TEXT,
  quantidade TEXT,
  quantidade_num NUMERIC,
  unidade TEXT,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'comprado')),
  checked BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lista_itens_empresa_lista_id ON lista_itens_empresa(lista_id);
CREATE INDEX IF NOT EXISTS idx_lista_itens_empresa_status ON lista_itens_empresa(status);
CREATE INDEX IF NOT EXISTS idx_lista_itens_empresa_nome_normalizado ON lista_itens_empresa(nome_normalizado);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_lista_itens_empresa_lista_nome_normalizado
  ON lista_itens_empresa (lista_id, nome_normalizado);

DROP TRIGGER IF EXISTS update_lista_itens_empresa_updated_at ON lista_itens_empresa;
CREATE TRIGGER update_lista_itens_empresa_updated_at
  BEFORE UPDATE ON lista_itens_empresa
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Backfill básico de normalização (mantém idempotência)
DO $$
BEGIN
  -- normalize_list_name existe nas migrations 015/016; se não existir, cria versão mínima
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
      s := regexp_replace(s, '\m(de|da|do|das|dos|para|pra)\M', ' ', 'g');
      s := regexp_replace(s, '[^a-z0-9]+', ' ', 'g');
      s := trim(regexp_replace(s, '\s+', ' ', 'g'));
      RETURN s;
    END;
    $fn$;
  END IF;
END;
$$;

UPDATE listas_empresa
SET
  nome_original = COALESCE(nome_original, nome),
  nome_normalizado = COALESCE(nome_normalizado, normalize_list_name(COALESCE(nome_original, nome)))
WHERE nome_original IS NULL OR nome_normalizado IS NULL;

UPDATE lista_itens_empresa
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

-- ============================================
-- CONTEXTO PERSISTENTE POR EMPRESA (lastActiveList)
-- ============================================

CREATE TABLE IF NOT EXISTS empresa_context (
  empresa_id UUID PRIMARY KEY REFERENCES empresas(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  last_active_list_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_empresa_context_tenant_id ON empresa_context(tenant_id);
CREATE INDEX IF NOT EXISTS idx_empresa_context_updated_at ON empresa_context(updated_at);

DROP TRIGGER IF EXISTS update_empresa_context_updated_at ON empresa_context;
CREATE TRIGGER update_empresa_context_updated_at
  BEFORE UPDATE ON empresa_context
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- RLS (tabelas novas)
-- ============================================

ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE financeiro_empresa ENABLE ROW LEVEL SECURITY;
ALTER TABLE compromissos_empresa ENABLE ROW LEVEL SECURITY;
ALTER TABLE listas_empresa ENABLE ROW LEVEL SECURITY;
ALTER TABLE lista_itens_empresa ENABLE ROW LEVEL SECURITY;
ALTER TABLE empresa_context ENABLE ROW LEVEL SECURITY;

-- Empresas: somente no tenant do usuário e somente quando modo=empresa
DROP POLICY IF EXISTS "Users can view empresas in their tenant (empresa mode)" ON empresas;
CREATE POLICY "Users can view empresas in their tenant (empresa mode)"
  ON empresas FOR SELECT
  USING (
    tenant_id = public.current_tenant_id()
    AND public.current_mode() = 'empresa'
  );

-- Empresas: permitir update/insert apenas no próprio tenant (admin ou uso interno)
DROP POLICY IF EXISTS "Users can manage empresas in their tenant (empresa mode)" ON empresas;
CREATE POLICY "Users can manage empresas in their tenant (empresa mode)"
  ON empresas FOR ALL
  USING (tenant_id = public.current_tenant_id() AND public.current_mode() = 'empresa')
  WITH CHECK (tenant_id = public.current_tenant_id() AND public.current_mode() = 'empresa');

-- Financeiro Empresa
DROP POLICY IF EXISTS "Users can access financeiro_empresa (empresa mode)" ON financeiro_empresa;
CREATE POLICY "Users can access financeiro_empresa (empresa mode)"
  ON financeiro_empresa FOR ALL
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

-- Compromissos Empresa
DROP POLICY IF EXISTS "Users can access compromissos_empresa (empresa mode)" ON compromissos_empresa;
CREATE POLICY "Users can access compromissos_empresa (empresa mode)"
  ON compromissos_empresa FOR ALL
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

-- Listas Empresa
DROP POLICY IF EXISTS "Users can access listas_empresa (empresa mode)" ON listas_empresa;
CREATE POLICY "Users can access listas_empresa (empresa mode)"
  ON listas_empresa FOR ALL
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

-- Lista Itens Empresa (join via listas_empresa)
DROP POLICY IF EXISTS "Users can access lista_itens_empresa (empresa mode)" ON lista_itens_empresa;
CREATE POLICY "Users can access lista_itens_empresa (empresa mode)"
  ON lista_itens_empresa FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM listas_empresa l
      WHERE l.id = lista_itens_empresa.lista_id
        AND l.tenant_id = public.current_tenant_id()
        AND l.empresa_id = public.current_empresa_id()
    )
    AND public.current_mode() = 'empresa'
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM listas_empresa l
      WHERE l.id = lista_itens_empresa.lista_id
        AND l.tenant_id = public.current_tenant_id()
        AND l.empresa_id = public.current_empresa_id()
    )
    AND public.current_mode() = 'empresa'
  );

-- Empresa context
DROP POLICY IF EXISTS "Users can access empresa_context (empresa mode)" ON empresa_context;
CREATE POLICY "Users can access empresa_context (empresa mode)"
  ON empresa_context FOR ALL
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

