-- Migration: Segurança, Custos e Planos
-- Description: Cria tabelas para controle de custos, planos e assinaturas

-- Tabela de logs de uso
CREATE TABLE IF NOT EXISTS usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  service TEXT NOT NULL CHECK (service IN ('openai', 'whisper', 'vision', 'whatsapp')),
  tokens_used INTEGER DEFAULT 0,
  cost NUMERIC(10, 6) DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_usage_logs_tenant_id ON usage_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_service ON usage_logs(service);
CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON usage_logs(created_at);

-- Tabela de planos
CREATE TABLE IF NOT EXISTS plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  price_monthly NUMERIC(10, 2) DEFAULT 0,
  max_messages_per_month INTEGER,
  max_tokens_per_month INTEGER,
  features JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de assinaturas (renomeada para evitar conflito)
CREATE TABLE IF NOT EXISTS tenant_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES plans(id),
  status TEXT NOT NULL CHECK (status IN ('active', 'canceled', 'expired', 'trial')),
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_tenant_id ON tenant_subscriptions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_subscriptions_status ON tenant_subscriptions(status);

-- Adicionar campos na tabela tenants
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES plans(id);

ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES tenant_subscriptions(id);

-- Adicionar campo reminder_sent na tabela compromissos (se ainda não existir)
ALTER TABLE compromissos 
ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE;
