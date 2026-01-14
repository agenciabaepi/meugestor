-- Migration: Integração com Supabase Auth e WhatsApp
-- Description: Integra autenticação e vincula usuários ao WhatsApp

-- Remove a tabela users antiga se existir (vamos recriar)
DROP TABLE IF EXISTS users CASCADE;

-- Cria nova tabela users vinculada ao auth.users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  whatsapp_number TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'user')),
  name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, email),
  UNIQUE(whatsapp_number)
);

-- Adiciona índice para busca por WhatsApp
CREATE INDEX IF NOT EXISTS idx_users_whatsapp ON users(whatsapp_number);
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Função para criar usuário automaticamente quando se registra no auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_tenant_id UUID;
BEGIN
  -- Cria um tenant automaticamente para o novo usuário
  INSERT INTO public.tenants (name, whatsapp_number)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'whatsapp_number', '')
  )
  RETURNING id INTO new_tenant_id;
  
  -- Valida se whatsapp_number foi fornecido
  IF COALESCE(NEW.raw_user_meta_data->>'whatsapp_number', '') = '' THEN
    RAISE EXCEPTION 'whatsapp_number é obrigatório';
  END IF;
  
  -- Cria registro na tabela users
  INSERT INTO public.users (id, tenant_id, email, whatsapp_number, role, name)
  VALUES (
    NEW.id,
    new_tenant_id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'whatsapp_number', ''),
    'admin',
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para criar usuário automaticamente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Atualiza políticas RLS para usar auth.uid() diretamente
DROP POLICY IF EXISTS "Users can view users in their tenant" ON users;
DROP POLICY IF EXISTS "Users can insert in their tenant" ON users;
DROP POLICY IF EXISTS "Admins can update users in their tenant" ON users;

-- Usuários podem ver apenas usuários do mesmo tenant
CREATE POLICY "Users can view users in their tenant"
  ON users FOR SELECT
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users
      WHERE id = auth.uid()
    )
  );

-- Usuários podem atualizar apenas seu próprio registro
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admins podem atualizar usuários do seu tenant
CREATE POLICY "Admins can update users in their tenant"
  ON users FOR UPDATE
  USING (
    tenant_id IN (
      SELECT tenant_id FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Função para atualizar updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comentários
COMMENT ON COLUMN users.id IS 'ID do usuário do Supabase Auth (auth.users.id)';
COMMENT ON COLUMN users.whatsapp_number IS 'Número do WhatsApp vinculado ao usuário';
COMMENT ON COLUMN users.tenant_id IS 'Tenant ao qual o usuário pertence';
