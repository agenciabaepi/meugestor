-- Migration: Multiple Reminders System
-- Description: Adiciona campos para rastrear múltiplos lembretes (1h, 30min, 10min antes)

-- Remove o campo antigo reminder_sent se existir (vamos usar campos específicos)
ALTER TABLE compromissos 
DROP COLUMN IF EXISTS reminder_sent;

-- Adiciona campos para rastrear cada tipo de lembrete
ALTER TABLE compromissos 
ADD COLUMN IF NOT EXISTS reminder_1h_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reminder_30min_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reminder_10min_sent BOOLEAN DEFAULT FALSE;

-- Cria índices para melhorar performance das consultas
CREATE INDEX IF NOT EXISTS idx_compromissos_reminder_1h ON compromissos(tenant_id, scheduled_at) 
WHERE reminder_1h_sent = FALSE;

CREATE INDEX IF NOT EXISTS idx_compromissos_reminder_30min ON compromissos(tenant_id, scheduled_at) 
WHERE reminder_30min_sent = FALSE;

CREATE INDEX IF NOT EXISTS idx_compromissos_reminder_10min ON compromissos(tenant_id, scheduled_at) 
WHERE reminder_10min_sent = FALSE;
