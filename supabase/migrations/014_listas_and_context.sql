-- Migration: Listas (compras) + Contexto Persistente
-- Description: Cria tabelas listas/lista_itens e salva lastActiveList por tenant

-- ============================================
-- LISTAS
-- ============================================

CREATE TABLE IF NOT EXISTS listas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'compras',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Regra obrigatória: (tenant_id + nome) único
-- Usamos lower(nome) para evitar duplicatas por caixa (Mercado vs mercado)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_listas_tenant_nome
  ON listas (tenant_id, lower(nome));

CREATE INDEX IF NOT EXISTS idx_listas_tenant_id ON listas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_listas_tipo ON listas(tipo);

DROP TRIGGER IF EXISTS update_listas_updated_at ON listas;
CREATE TRIGGER update_listas_updated_at
  BEFORE UPDATE ON listas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- LISTA_ITENS
-- ============================================

CREATE TABLE IF NOT EXISTS lista_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lista_id UUID NOT NULL REFERENCES listas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  quantidade TEXT,
  unidade TEXT,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'comprado')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lista_itens_lista_id ON lista_itens(lista_id);
CREATE INDEX IF NOT EXISTS idx_lista_itens_status ON lista_itens(status);

-- Não duplicar o mesmo item pendente (case-insensitive)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_lista_itens_lista_nome
  ON lista_itens (lista_id, lower(nome));

DROP TRIGGER IF EXISTS update_lista_itens_updated_at ON lista_itens;
CREATE TRIGGER update_lista_itens_updated_at
  BEFORE UPDATE ON lista_itens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- CONTEXTO PERSISTENTE (lastActiveList) POR TENANT
-- ============================================

CREATE TABLE IF NOT EXISTS tenant_context (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  last_active_list_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tenant_context_updated_at ON tenant_context(updated_at);

DROP TRIGGER IF EXISTS update_tenant_context_updated_at ON tenant_context;
CREATE TRIGGER update_tenant_context_updated_at
  BEFORE UPDATE ON tenant_context
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

