-- Migration: Row Level Security (RLS) Policies
-- Description: Configura RLS para isolamento total por tenant

-- Habilitar RLS em todas as tabelas
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE financeiro ENABLE ROW LEVEL SECURITY;
ALTER TABLE compromissos ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLICIES PARA TENANTS
-- ============================================

-- Usuários podem ver apenas seu próprio tenant
CREATE POLICY "Users can view their own tenant"
  ON tenants FOR SELECT
  USING (
    id IN (
      SELECT tenant_id FROM users
      WHERE id = auth.uid()
    )
  );

-- ============================================
-- POLICIES PARA USERS
-- ============================================

-- Usuários podem ver apenas usuários do mesmo tenant
CREATE POLICY "Users can view users in their tenant"
  ON users FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users
      WHERE id = auth.uid()
    )
  );

-- Usuários podem inserir apenas no seu tenant
CREATE POLICY "Users can insert in their tenant"
  ON users FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM users
      WHERE id = auth.uid()
    )
  );

-- Admins podem atualizar usuários do seu tenant
CREATE POLICY "Admins can update users in their tenant"
  ON users FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================
-- POLICIES PARA FINANCEIRO
-- ============================================

-- Usuários podem ver apenas registros do seu tenant
CREATE POLICY "Users can view financeiro in their tenant"
  ON financeiro FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users
      WHERE id = auth.uid()
    )
  );

-- Usuários podem inserir apenas no seu tenant
CREATE POLICY "Users can insert financeiro in their tenant"
  ON financeiro FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM users
      WHERE id = auth.uid()
    )
  );

-- Usuários podem atualizar apenas registros do seu tenant
CREATE POLICY "Users can update financeiro in their tenant"
  ON financeiro FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users
      WHERE id = auth.uid()
    )
  );

-- Usuários podem deletar apenas registros do seu tenant
CREATE POLICY "Users can delete financeiro in their tenant"
  ON financeiro FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users
      WHERE id = auth.uid()
    )
  );

-- ============================================
-- POLICIES PARA COMPROMISSOS
-- ============================================

-- Usuários podem ver apenas compromissos do seu tenant
CREATE POLICY "Users can view compromissos in their tenant"
  ON compromissos FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users
      WHERE id = auth.uid()
    )
  );

-- Usuários podem inserir apenas no seu tenant
CREATE POLICY "Users can insert compromissos in their tenant"
  ON compromissos FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM users
      WHERE id = auth.uid()
    )
  );

-- Usuários podem atualizar apenas compromissos do seu tenant
CREATE POLICY "Users can update compromissos in their tenant"
  ON compromissos FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users
      WHERE id = auth.uid()
    )
  );

-- Usuários podem deletar apenas compromissos do seu tenant
CREATE POLICY "Users can delete compromissos in their tenant"
  ON compromissos FOR DELETE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users
      WHERE id = auth.uid()
    )
  );

-- ============================================
-- POLICIES PARA CONVERSATIONS
-- ============================================

-- Usuários podem ver apenas conversas do seu tenant
CREATE POLICY "Users can view conversations in their tenant"
  ON conversations FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users
      WHERE id = auth.uid()
    )
  );

-- Usuários podem inserir apenas no seu tenant
CREATE POLICY "Users can insert conversations in their tenant"
  ON conversations FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT tenant_id FROM users
      WHERE id = auth.uid()
    )
  );
