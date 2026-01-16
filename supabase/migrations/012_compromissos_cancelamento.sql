-- Migration: Compromissos - Cancelamento (soft delete)
-- Description: Adiciona campos para marcar compromisso como cancelado sem apagar do banco

ALTER TABLE compromissos
ADD COLUMN IF NOT EXISTS is_cancelled BOOLEAN DEFAULT FALSE;

ALTER TABLE compromissos
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

-- Opcional: quem cancelou (quando existir user_id)
ALTER TABLE compromissos
ADD COLUMN IF NOT EXISTS cancelled_by UUID;

-- Índice para consultas de compromissos ativos
CREATE INDEX IF NOT EXISTS idx_compromissos_active
ON compromissos(tenant_id, scheduled_at)
WHERE is_cancelled = FALSE;

